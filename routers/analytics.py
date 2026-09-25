"""Analytics HTTP routes: overview, forecast, stock prediction, model status, retrain."""

from __future__ import annotations

from datetime import datetime, time, date, timedelta
from typing import Any, Dict, Optional

import psycopg2.extras
from fastapi import APIRouter, Query, Header, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io
import codecs
import threading
from routers.users import _parse_actor_user_id_or_401, _get_actor_or_403

from services.analytics_cache_jobs import (
    load_cached_sales_forecast,
    load_cached_stock_prediction,
    load_overview_extras,
    run_refresh_job,
    trigger_background_refresh_if_stale,
)
from utils.audit import add_audit_log
from services.analytics_engine import assemble_sales_forecast, assemble_stock_prediction, build_product_forecasts
from database import get_connection
from models import (
    AnalyticsModelStatus,
    AnalyticsModelStatusGroupResponse,
    AnalyticsOverviewResponse,
    AnalyticsRetrainResponse,
    SalesForecastResponse,
    StockPredictionResponse,
)

router = APIRouter(tags=["Analytics"])

MODEL_KEYS = ("overview", "forecast_30d", "stock_prediction")


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _ensure_cache_rows(cur) -> None:
    for key in MODEL_KEYS:
        cur.execute(
            """
            INSERT INTO analytics_model_cache (model_key, payload, model_engine, status, message)
            VALUES (%s, '{}'::jsonb, 'pending', 'not_trained', '')
            ON CONFLICT (model_key) DO NOTHING
            """,
            (key,),
        )


def _row_to_status(row: Dict[str, Any]) -> AnalyticsModelStatus:
    payload = row.get("payload") or {}
    if isinstance(payload, str):
        payload = {}
    return AnalyticsModelStatus(
        model_key=row["model_key"],
        status=row.get("status") or "unknown",
        engine=row.get("model_engine") or "unknown",
        message=row.get("message") or "",
        last_trained_at=_iso(row.get("last_trained_at")),
        next_scheduled_run=_iso(row.get("next_scheduled_run")),
        training_duration_ms=row.get("training_duration_ms"),
    )


def _get_stock_status_counts(cur) -> tuple[int, int, int]:
    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= 0 AND p.status != 'Archived') AS out_count,
            COUNT(*) FILTER (
                WHERE COALESCE(i.actual, 0) > 0
                AND COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10)
                AND p.status != 'Archived'
            ) AS low_count,
            COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) > COALESCE(i.reorder_level, 10) AND p.status != 'Archived') AS ok_count
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        """
    )
    row = cur.fetchone()
    return (
        int(row["out_count"] or 0),
        int(row["low_count"] or 0),
        int(row["ok_count"] or 0),
    )


def _fetch_status_group(cur) -> AnalyticsModelStatusGroupResponse:
    _ensure_cache_rows(cur)
    out: Dict[str, AnalyticsModelStatus] = {}
    for key in MODEL_KEYS:
        cur.execute(
            """
            SELECT model_key, payload, model_engine, status, message,
                   last_trained_at, next_scheduled_run, training_duration_ms
            FROM analytics_model_cache WHERE model_key = %s
            """,
            (key,),
        )
        r = cur.fetchone()
        if r:
            out[key] = _row_to_status(dict(r))
        else:
            out[key] = AnalyticsModelStatus(
                model_key=key,
                status="unknown",
                engine="unknown",
                message="",
            )
    return AnalyticsModelStatusGroupResponse(
        overview=out["overview"],
        forecast_30d=out["forecast_30d"],
        stock_prediction=out["stock_prediction"],
    )


def _attach_forecast_status(cur, resp: SalesForecastResponse) -> SalesForecastResponse:
    cur.execute(
        """
        SELECT model_key, payload, model_engine, status, message,
               last_trained_at, next_scheduled_run, training_duration_ms
        FROM analytics_model_cache WHERE model_key = 'forecast_30d'
        """
    )
    row = cur.fetchone()
    st = _row_to_status(dict(row)) if row else None
    return resp.model_copy(update={"model_status": st})


def _attach_stock_status(cur, resp: StockPredictionResponse) -> StockPredictionResponse:
    cur.execute(
        """
        SELECT model_key, payload, model_engine, status, message,
               last_trained_at, next_scheduled_run, training_duration_ms
        FROM analytics_model_cache WHERE model_key = 'stock_prediction'
        """
    )
    row = cur.fetchone()
    st = _row_to_status(dict(row)) if row else None
    return resp.model_copy(update={"model_status": st})


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview() -> AnalyticsOverviewResponse:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            out_count, low_count, ok_count = _get_stock_status_counts(cur)
            
            # Fetch today's sales
            cur.execute("""
                SELECT COALESCE(SUM(total_amount), 0)::float as today_sales 
                FROM sales 
                WHERE invoice_date::date = CURRENT_DATE
            """)
            today_sales_row = cur.fetchone()
            today_sales = float(today_sales_row["today_sales"]) if today_sales_row else 0.0

            # Fetch top sellers (last 30 days or all time, Ph Timezone)
            cur.execute("""
                SELECT p.product_name, c.category_name, SUM(si.quantity * si.unit_price) as revenue
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                JOIN products p ON si.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE (s.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date >= (now() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '30 days'
                GROUP BY p.product_id, p.product_name, c.category_name
                ORDER BY revenue DESC
                LIMIT 3
            """)
            top_seller_rows = cur.fetchall()
            top_sellers = [
                {"name": r["product_name"] or "Unknown", "revenue": float(r["revenue"] or 0), "category": r["category_name"] or ""}
                for r in top_seller_rows
            ]

            # Fetch top mechanics (revenue/count based on sold services in last 30 days or all time, PH timezone)
            cur.execute("""
                SELECT INITCAP(TRIM(si.mechanic_name)) as mechanic_name, COUNT(*) as services_count, SUM(si.quantity * si.unit_price) as revenue
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                JOIN products p ON si.product_id = p.product_id
                WHERE p.is_service = TRUE AND si.mechanic_name IS NOT NULL AND TRIM(si.mechanic_name) <> ''
                  AND (s.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date >= (now() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '30 days'
                GROUP BY INITCAP(TRIM(si.mechanic_name))
                ORDER BY revenue DESC
                LIMIT 5
            """)
            top_mechanic_rows = cur.fetchall()
            top_mechanics = [
                {"name": r["mechanic_name"], "services_count": int(r["services_count"] or 0), "revenue": float(r["revenue"] or 0)}
                for r in top_mechanic_rows
            ]

            _ensure_cache_rows(cur)
            extras = load_overview_extras(cur, allow_stale=True)
            trigger_background_refresh_if_stale(cur)
            conn.commit()
            cur.execute(
                """
                SELECT model_key, payload, model_engine, status, message,
                       last_trained_at, next_scheduled_run, training_duration_ms
                FROM analytics_model_cache WHERE model_key = 'overview'
                """
            )
            row = cur.fetchone()
            status = _row_to_status(dict(row)) if row else None
            payload = (row or {}).get("payload") or {}
            if isinstance(payload, str):
                payload = {}
            fa = extras.get("forecast_accuracy")
            if fa is None:
                fa = payload.get("forecast_accuracy")
            last_u = extras.get("cache_generated_at")
            if last_u is None and row and row.get("last_trained_at"):
                last_u = _iso(row["last_trained_at"])
            sales_eng = extras.get("sales_forecast_engine")
            stock_eng = extras.get("stock_forecast_engine")
            cache_gen = extras.get("cache_generated_at")
            return AnalyticsOverviewResponse(
                forecast_accuracy=float(fa) if fa is not None else None,
                today_sales_total=today_sales,
                items_out=out_count,
                items_low=low_count,
                items_ok=ok_count,
                low_stock_alerts=out_count + low_count,
                critical_stock_count=out_count,
                low_stock_count=low_count,
                prediction_models=2,
                top_sellers=top_sellers,
                top_mechanics=top_mechanics,
                last_updated=last_u,
                model_status=status,
                served_from_cache=bool(cache_gen),
                sales_forecast_engine=sales_eng,
                stock_forecast_engine=stock_eng,
                cache_generated_at=cache_gen,
            )
    finally:
        conn.close()


@router.get("/forecast", response_model=SalesForecastResponse)
def get_sales_forecast(
    days: int = Query(90, ge=7, le=365),
    use_cache: bool = Query(True),
) -> SalesForecastResponse:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            _ensure_cache_rows(cur)
            if use_cache:
                cached = load_cached_sales_forecast(cur, days, allow_stale=True)
                if cached is not None:
                    resp, _gen = cached
                    trigger_background_refresh_if_stale(cur)
                    conn.commit()
                    return _attach_forecast_status(cur, resp)
            resp = assemble_sales_forecast(cur, days)
            return _attach_forecast_status(cur, resp)
    finally:
        conn.close()


@router.get("/stock-prediction", response_model=StockPredictionResponse)
def get_stock_prediction(use_cache: bool = Query(True)) -> StockPredictionResponse:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            _ensure_cache_rows(cur)
            if use_cache:
                cached = load_cached_stock_prediction(cur, allow_stale=True)
                if cached is not None:
                    trigger_background_refresh_if_stale(cur)
                    conn.commit()
                    return _attach_stock_status(cur, cached)
            resp = assemble_stock_prediction(cur)
            return _attach_stock_status(cur, resp)
    finally:
        conn.close()


@router.get("/model-status", response_model=AnalyticsModelStatusGroupResponse)
def get_model_status() -> AnalyticsModelStatusGroupResponse:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            return _fetch_status_group(cur)
    finally:
        conn.close()


@router.post("/retrain", response_model=AnalyticsRetrainResponse)
def retrain_analytics_models(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")) -> AnalyticsRetrainResponse:
    from routers.notifications import dispatch_notification
    ok, msg = run_refresh_job()
    if ok:
        dispatch_notification(
            type="sales_forecast",
            title="Analytics Models Retrained",
            message="The forecasting models have been manually retrained and the cache is now up to date.",
            link="/forecasting",
            target_roles=["administrator"]
        )
        # --- Audit log ---
        if x_actor_user_id:
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    add_audit_log(
                        cur,
                        int(x_actor_user_id),
                        "RETRAIN_MODELS",
                        "analytics",
                        0,
                        "Manually triggered analytics model retraining"
                    )
                    conn.commit()
            finally:
                conn.close()
    return AnalyticsRetrainResponse(ok=ok, message=msg)

@router.post("/clear-cache")
def clear_analytics_cache(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    """Manually marks all analytics cache as stale."""
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("UPDATE analytics_model_cache SET status = 'stale'")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CLEAR_ANALYTICS_CACHE",
                    "analytics",
                    0,
                    "Manually cleared analytics cache"
                )
        return {"status": "success", "message": "Cache marked as stale. Data will refresh on next request."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/import-template")
def get_import_template():
    """Returns a CSV template for importing historical sales."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "SKU", "Quantity", "UnitPrice"])
    writer.writerow(["2026-06-18", "SKU-SAMPLE-1", "10", "150.00"])
    writer.writerow(["2026-06-18", "SKU-SAMPLE-2", "5", "99.50"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=historical_sales_template.csv"}
    )

@router.post("/import-historical")
def import_historical_sales(
    file: UploadFile = File(...),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Imports historical sales from a CSV or Excel (.xlsx) file, bypassing inventory updates."""
    filename = file.filename.lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx) files are allowed.")

    file_content = file.file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
    file.file.seek(0)

    raw_rows = []
    headers = []

    try:
        if filename.endswith(".xlsx"):
            import openpyxl
            wb = openpyxl.load_workbook(file.file, read_only=True, data_only=True)
            sheet = wb.active
            excel_rows = list(sheet.iter_rows(values_only=True))
            if not excel_rows or len(excel_rows) < 1:
                raise HTTPException(status_code=400, detail="Excel file is empty.")
            
            # Filter out completely empty rows
            non_empty_rows = [r for r in excel_rows if any(cell is not None for cell in r)]
            if not non_empty_rows:
                raise HTTPException(status_code=400, detail="Excel file is empty.")
                
            headers = [str(h).strip() if h is not None else "" for h in non_empty_rows[0]]
            for line_no, row in enumerate(non_empty_rows[1:], start=2):
                row_dict = {}
                for idx, val in enumerate(row):
                    if idx < len(headers):
                        h = headers[idx]
                        if h:
                            if isinstance(val, (datetime, date)):
                                row_dict[h] = val.strftime("%Y-%m-%d")
                            elif val is not None:
                                row_dict[h] = str(val)
                            else:
                                row_dict[h] = ""
                raw_rows.append((line_no, row_dict))
        else:
            csv_reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
            if not csv_reader.fieldnames:
                raise HTTPException(status_code=400, detail="CSV file is empty or missing headers.")
            headers = [h.strip() for h in csv_reader.fieldnames]
            for line_no, row in enumerate(csv_reader, start=2):
                row_dict = {k.strip(): (v.strip() if v is not None else "") for k, v in row.items() if k is not None}
                raw_rows.append((line_no, row_dict))

        fieldnames = [f.strip().lower() for f in headers]
        
        # Look for matches in headers
        date_col = next((f for f in fieldnames if f in ('date', 'invoice_date', 'invoice date')), None)
        sku_col = next((f for f in fieldnames if f in ('sku', 'product_sku', 'product sku', 'item_sku')), None)
        qty_col = next((f for f in fieldnames if f in ('quantity', 'qty', 'units', 'count')), None)
        price_col = next((f for f in fieldnames if f in ('unitprice', 'unit_price', 'price', 'unit price', 'srp')), None)

        if not date_col or not sku_col or not qty_col:
            raise HTTPException(
                status_code=400, 
                detail="File must contain 'Date', 'SKU', and 'Quantity' columns."
            )
            
        # Parse rows
        parsed_rows = []
        skus_to_fetch = set()
        
        # Find original column key name to get data properly
        orig_date_col = next(h for h in headers if h.strip().lower() == date_col)
        orig_sku_col = next(h for h in headers if h.strip().lower() == sku_col)
        orig_qty_col = next(h for h in headers if h.strip().lower() == qty_col)
        orig_price_col = next(h for h in headers if h.strip().lower() == price_col) if price_col else None
        
        for line_no, row in raw_rows:
            raw_date = row.get(orig_date_col)
            raw_sku = row.get(orig_sku_col)
            raw_qty = row.get(orig_qty_col)
            raw_price = row.get(orig_price_col) if orig_price_col else None
            
            if not raw_date or not raw_sku or not raw_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {line_no}: Missing required field (Date, SKU, or Quantity)."
                )
                
            # Validate date format
            parsed_date = None
            try:
                # Check if it's an Excel serial date number
                val_float = float(raw_date.strip())
                val_int = int(val_float)
                if 1 <= val_float < 100000:
                    parsed_date = date(1899, 12, 30) + timedelta(days=val_int)
                elif 10000000 <= val_int <= 99999999:
                    parsed_date = datetime.strptime(str(val_int), "%Y%m%d").date()
            except ValueError:
                pass

            if not parsed_date:
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
                    try:
                        parsed_date = datetime.strptime(raw_date.strip(), fmt).date()
                        break
                    except ValueError:
                        continue

            if not parsed_date:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {line_no}: Date '{raw_date}' is not in a valid format (expected YYYY-MM-DD or MM-DD-YYYY/MM/DD/YYYY)."
                )
                
            # Validate quantity
            try:
                qty = int(raw_qty.strip())
                if qty <= 0:
                    raise ValueError()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {line_no}: Quantity '{raw_qty}' must be a positive integer."
                )
                
            # Validate price
            price = None
            if raw_price and raw_price.strip():
                try:
                    price = float(raw_price.strip())
                    if price < 0:
                        raise ValueError()
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Line {line_no}: Unit Price '{raw_price}' must be a non-negative number."
                    )
            
            sku = raw_sku.strip()
            skus_to_fetch.add(sku)
            parsed_rows.append({
                "line_no": line_no,
                "date": parsed_date,
                "sku": sku,
                "quantity": qty,
                "price": price
            })
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="CSV file has no data rows.")

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            
            if not (actor.get("is_root_admin") or actor.get("role_key") in ("administrator", "manager", "super admin", "system administrator")):
                raise HTTPException(
                    status_code=403,
                    detail="Only Administrators and Managers are permitted to import historical sales."
                )
                
            # Fetch products to map SKU to product_id and prices
            cur.execute(
                "SELECT product_id, sku, unit_price, pos_price FROM products WHERE sku = ANY(%s)",
                (list(skus_to_fetch),)
            )
            products = {row["sku"]: row for row in cur.fetchall()}
            
            # Verify all SKUs exist
            for row in parsed_rows:
                sku = row["sku"]
                if sku not in products:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Line {row['line_no']}: SKU '{sku}' not found in products catalog."
                    )
                # Fill missing price
                if row["price"] is None:
                    p_info = products[sku]
                    row["price"] = float(p_info["pos_price"] if p_info["pos_price"] is not None else p_info["unit_price"])
            
            # Group by Date
            from collections import defaultdict
            grouped = defaultdict(list)
            for row in parsed_rows:
                grouped[row["date"]].append(row)
                
            # Insert grouped sales
            sales_count = 0
            sold_items_count = 0
            
            for sale_date, items in grouped.items():
                subtotal = sum(item["quantity"] * item["price"] for item in items)
                total_amount = round(subtotal, 2)
                
                # Insert sale
                cur.execute(
                    """
                    INSERT INTO sales (
                        invoice_date, total_amount, tax_amount, service_charge,
                        customer_info, customer_name, payment_method, payment_status,
                        cash_received, cash_given, change_amount,
                        user_id, transaction_timestamp
                    )
                    VALUES (%s, %s, 0.0, 0.0, 'Historical Import', 'Historical Import', 'Imported', 'Paid', %s, %s, 0.0, %s, %s)
                    RETURNING invoice_id
                    """,
                    (
                        sale_date,
                        total_amount,
                        total_amount,
                        total_amount,
                        actor_user_id,
                        datetime.combine(sale_date, time(12, 0))
                    )
                )
                invoice_id = cur.fetchone()["invoice_id"]
                sales_count += 1
                
                for item in items:
                    prod_id = products[item["sku"]]["product_id"]
                    item_subtotal = round(item["quantity"] * item["price"], 2)
                    cur.execute(
                        """
                        INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            invoice_id,
                            prod_id,
                            item["quantity"],
                            item["price"],
                            item_subtotal,
                            item_subtotal
                        )
                    )
                    sold_items_count += 1
                    
            # Mark cache as stale
            cur.execute("UPDATE analytics_model_cache SET status = 'stale'")
            
            # Audit log
            add_audit_log(
                cur,
                actor_user_id,
                "IMPORT_HISTORICAL_SALES",
                "sales",
                0,
                f"Imported historical sales: {sales_count} sales transactions, {sold_items_count} items from CSV."
            )
            
            # Sync sequences after bulk insert
            try:
                cur.execute("SELECT setval(pg_get_serial_sequence('sales', 'invoice_id'), COALESCE(MAX(invoice_id), 1), true) FROM sales")
                cur.execute("SELECT setval(pg_get_serial_sequence('sold_items', 'sold_item_id'), COALESCE(MAX(sold_item_id), 1), true) FROM sold_items")
                cur.execute("SELECT setval(pg_get_serial_sequence('payments', 'payment_id'), COALESCE(MAX(payment_id), 1), true) FROM payments")
            except Exception:
                pass

            conn.commit()
            
            # Trigger retraining in a background thread
            from services.analytics_cache_jobs import run_refresh_job
            threading.Thread(target=run_refresh_job, daemon=True).start()
            
            return {
                "ok": True,
                "message": f"Successfully imported {sales_count} sales transactions containing {sold_items_count} items.",
                "sales_count": sales_count,
                "items_count": sold_items_count
            }
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during import: {str(e)}")
    finally:
        conn.close()
