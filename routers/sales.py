from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from database import get_connection
from models import CreateSaleRequest
import psycopg2.extras
from datetime import datetime, date, timedelta, timezone
from typing import Optional
import json
import base64
import urllib.request
import os
import csv
import io
import codecs
import threading
import hashlib
from collections import defaultdict
from dotenv import load_dotenv

from utils.audit import add_audit_log
from routers.notifications import dispatch_notification
load_dotenv()
router = APIRouter()

PHT = timezone(timedelta(hours=8))
TAX_RATE = 0.03

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "sk_test_kw8iRka1GRSvzamLKByrcoie")

def get_auth_header():
    auth_str = f"{PAYMONGO_SECRET_KEY}:"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    return f"Basic {encoded_auth}"

def _invalidate_analytics_cache(cur):
    """
    Marks all analytics cache as stale so that the next request
    will re-calculate based on the new data (sales/stock).
    """
    cur.execute(
        "UPDATE analytics_model_cache SET status = 'stale'"
    )

def get_tax_rate():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'tax_rate'")
            result = cur.fetchone()
            if result:
                return float(result[0])
    except Exception as e:
        print(f"Error fetching tax rate from database: {e}")
    finally:
        conn.close()
    return TAX_RATE


@router.get("/settings/tax-rate")
def get_tax_rate_setting():
    try:
        tax_rate = get_tax_rate()
        return {"tax_rate": tax_rate, "tax_percentage": tax_rate * 100}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _normalize_ph_mobile(raw: str | None) -> str | None:
    if raw is None:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return None
    if len(digits) == 11 and digits.startswith("09"):
        return digits
    if len(digits) == 12 and digits.startswith("639"):
        return "0" + digits[2:]
    raise HTTPException(
        status_code=400,
        detail="Contact number must be a valid Philippine mobile number.",
    )

def verify_paymongo_source(source_id: str) -> dict:
    """Verify PayMongo source payment status."""
    url = f"https://api.paymongo.com/v1/sources/{source_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            source_attributes = res_data.get("data", {}).get("attributes", {})
            status = source_attributes.get("status")
            
            # Allow both "chargeable" (real payment) and "pending" (test mode)
            if status not in ("chargeable", "pending"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PayMongo payment not completed. Status: {status}"
                )
            
            return res_data
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"PayMongo verification failed: {error_msg}")

def verify_paymongo_checkout_session(session_id: str) -> dict:
    print(f"Verifying PayMongo Checkout Session: {session_id}")
    url = f"https://api.paymongo.com/v1/checkout_sessions/{session_id}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            attrs = res_data.get("data", {}).get("attributes", {})
            status = attrs.get("status")
            payments = attrs.get("payments") or []
            print(f"PayMongo Session Status: {status}, Payments Count: {len(payments)}")
            if status != "paid" and len(payments) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"PayMongo checkout session not completed. Status: {status}"
                )
            return res_data
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"PayMongo Verification Error: {error_msg}")
        raise HTTPException(status_code=e.code, detail=f"PayMongo checkout session verification failed: {error_msg}")

def verify_paymongo_payment_intent(payment_intent_id: str) -> dict:
    """Verify PayMongo PaymentIntent payment status."""
    url = f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            intent_attributes = res_data.get("data", {}).get("attributes", {})
            status = intent_attributes.get("status")
            
            # PaymentIntent status: "succeeded" means payment is complete
            # "awaiting_payment_method" is acceptable for testing/sandbox
            if status not in ("succeeded", "pending", "awaiting_payment_method"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PayMongo payment not completed. Status: {status}"
                )
            
            return res_data
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"PayMongo verification failed: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayMongo verification error: {str(e)}")


@router.get("/sales")
def get_sales(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            limit_clause = ""
            params = []
            if not start_date and not end_date:
                # Default to returning the most recent 1000 transactions to keep the table populated
                date_filter = "WHERE 1=1"
                limit_clause = "LIMIT 1000"
            else:
                date_filter = "WHERE 1=1"
                if start_date:
                    date_filter += " AND s.invoice_date >= %s"
                    params.append(start_date)
                if end_date:
                    date_filter += " AND s.invoice_date <= %s"
                    params.append(end_date)

            query = f"""
                SELECT
                    s.invoice_id,
                    s.invoice_date,
                    s.user_id,
                    COALESCE(s.cashier_name, u.full_name, s.cashier_username, u.username, 'Staff') as cashier_name,
                    CAST(s.total_amount AS FLOAT) as total_amount,
                    s.customer_info,
                    s.contact_number,
                    s.payment_method,
                    s.payment_status,
                    CAST(s.cash_received AS FLOAT) as cash_received,
                    CAST(s.change_amount AS FLOAT) as change_amount,
                    s.transaction_timestamp,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', p.product_name,
                                'quantity', si.quantity,
                                'unit_price', CAST(si.unit_price AS FLOAT),
                                'subtotal', CAST(si.subtotal AS FLOAT),
                                'is_service', COALESCE(p.is_service, false),
                                'mechanic_name', si.mechanic_name
                            )
                        )
                        FROM sold_items si
                        LEFT JOIN products p ON si.product_id = p.product_id
                        WHERE si.invoice_id = s.invoice_id
                        ), '[]'
                    ) as items
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.user_id
                {date_filter}
                ORDER BY s.invoice_id DESC
                {limit_clause}
            """
            
            cur.execute(query, tuple(params))
            sales = cur.fetchall()
            result = []
            for sale in sales:
                items = sale["items"] if sale["items"] else []
                result.append({
                    "invoice_id": sale["invoice_id"],
                    "invoice_date": str(sale["invoice_date"]),
                    "total_amount": sale["total_amount"],
                    "customer_info": sale["customer_info"],
                    "contact_number": sale.get("contact_number"),
                    "payment_method": sale["payment_method"],
                    "payment_status": sale["payment_status"],
                    "cash_received": sale["cash_received"],
                    "change_amount": sale["change_amount"],
                    "transaction_timestamp": str(sale["transaction_timestamp"]) if sale["transaction_timestamp"] else None,
                    "items": items
                })
            return {"sales": result}
    finally:
        conn.close()


@router.get("/sales/import-template")
def get_sales_import_template():
    """Returns a CSV template for importing sales transactions."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Customer", "Contact", "PaymentMethod", "SKU", "Quantity", "UnitPrice"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_import_template.csv"}
    )


@router.get("/sales/{invoice_id}")
def get_sale(invoice_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    s.invoice_id,
                    s.invoice_date,
                    CAST(s.total_amount AS FLOAT) as total_amount,
                    CAST(s.tax_amount AS FLOAT) as tax_amount,
                    CAST(s.service_charge AS FLOAT) as service_charge,
                    s.customer_info,
                    s.contact_number,
                    s.payment_method,
                    s.payment_status,
                    CAST(s.cash_received AS FLOAT) as cash_received,
                    CAST(s.change_amount AS FLOAT) as change_amount,
                    CAST(s.cash_given AS FLOAT) as cash_given,
                    s.transaction_timestamp,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', p.product_name,
                                'quantity', si.quantity,
                                'unit_price', CAST(si.unit_price AS FLOAT),
                                'subtotal', CAST(si.subtotal AS FLOAT),
                                'is_service', COALESCE(p.is_service, false),
                                'mechanic_name', si.mechanic_name
                            )
                        )
                        FROM sold_items si
                        LEFT JOIN products p ON si.product_id = p.product_id
                        WHERE si.invoice_id = s.invoice_id
                        ), '[]'
                    ) as items
                FROM sales s
                WHERE s.invoice_id = %s
            """, (invoice_id,))
            sale = cur.fetchone()
            if not sale:
                raise HTTPException(status_code=404, detail="Sale not found")
            items = sale["items"] if sale["items"] else []
            return {
                "invoice_id": sale["invoice_id"],
                "invoice_date": str(sale["invoice_date"]),
                "total_amount": sale["total_amount"],
                "tax_amount": sale["tax_amount"],
                "service_charge": sale["service_charge"],
                "customer_info": sale["customer_info"],
                "contact_number": sale.get("contact_number"),
                "payment_method": sale["payment_method"],
                "payment_status": sale["payment_status"],
                "cash_received": sale["cash_received"],
                "change_amount": sale["change_amount"],
                "cash_given": sale["cash_given"],
                "transaction_timestamp": str(sale["transaction_timestamp"]) if sale["transaction_timestamp"] else None,
                "items": items
            }
    finally:
        conn.close()


@router.post("/sales")
def create_sale(
    sale: CreateSaleRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    conn = get_connection()
    try:
        normalized_contact = _normalize_ph_mobile(sale.contact_number)
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_id = int(x_actor_user_id) if x_actor_user_id else sale.user_id
            if actor_id:
                cur.execute("""
                    SELECT u.user_id, u.username, u.role, u.permissions_json, r.permissions_text
                    FROM users u
                    LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                    WHERE u.user_id = %s
                """, (actor_id,))
                actor_row = cur.fetchone()
                if actor_row:
                    root_uname = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()
                    is_root = (actor_row.get("username") or "").strip().lower() in (root_uname, "rootadmin")

                    if not is_root:
                        perms = None
                        if actor_row.get("permissions_json") and isinstance(actor_row["permissions_json"], dict) and len(actor_row["permissions_json"]) > 0:
                            perms = actor_row["permissions_json"]
                        elif actor_row.get("permissions_text"):
                            try:
                                perms = json.loads(actor_row["permissions_text"])
                            except:
                                perms = {}

                        pos_acts = (perms.get("POS Terminal") or perms.get("pos terminal") or perms.get("POS") or []) if perms else []
                        sales_acts = (perms.get("Sales") or perms.get("sales") or []) if perms else []

                        can_add = any(a.lower() in ("add", "edit", "create") for a in pos_acts + sales_acts)
                        if not can_add:
                            raise HTTPException(
                                status_code=403,
                                detail="Permission denied: You do not have 'Add' permission on POS Terminal to process sales transactions."
                            )

            # --- Calculate totals (VAT included in product price) ---
            subtotal = sum(
                round(item.unit_price * item.quantity, 2) for item in sale.items
            )
            tax_rate = get_tax_rate()
            # VAT is already included, so calculate it as part of subtotal
            tax_amount = round(subtotal - (subtotal / (1 + tax_rate)), 2)
            total_amount = round(subtotal + sale.service_charge, 2)
            
            # For GCash/PayMongo, cash_received might be equal to total_amount or provided from UI
            if sale.payment_method == "Split":
                cash_received = sale.cash_amount
                # In split mode, ewallet_amount is usually exact, so change comes from cash_amount
                # Remaining after e-wallet: remaining = total_amount - sale.ewallet_amount
                # change = cash_received - remaining
                change_amount = round(sale.cash_amount - (total_amount - sale.ewallet_amount), 2)
                if change_amount < 0:
                     raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient payment for Split. Cash: ₱{sale.cash_amount:.2f}, E-Wallet: ₱{sale.ewallet_amount:.2f}, Total: ₱{total_amount:.2f}",
                    )
            elif sale.payment_method != "Cash":
                cash_received = total_amount
                change_amount = 0.0
            else:
                cash_received = sale.cash_received
                change_amount = round(cash_received - total_amount, 2)

            if change_amount < 0 and sale.payment_method == "Cash":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cash received (₱{sale.cash_received:.2f}) is less than total (₱{total_amount:.2f})",
                )

            # --- Verify PayMongo payment if source ID provided ---
            if sale.paymongo_source_id:
                # Check if it's a PaymentIntent ID (starts with "pi_") or Source ID (starts with "src_")
                if sale.paymongo_source_id.startswith("pi_"):
                    verify_paymongo_payment_intent(sale.paymongo_source_id)
                elif sale.paymongo_source_id.startswith("cs_"):
                    verify_paymongo_checkout_session(sale.paymongo_source_id)
                else:
                    verify_paymongo_source(sale.paymongo_source_id)

            now_pht = datetime.now(PHT)
            now = now_pht.replace(tzinfo=None)
            today = now_pht.date()

            # --- Insert into sales ---
            # customer_info is used for legacy support, but we also have specific fields now
            customer_display = sale.customer_name or sale.customer_info
            
            cashier_name = None
            cashier_username = None
            if sale.user_id:
                cur.execute("SELECT full_name, username FROM users WHERE user_id = %s", (sale.user_id,))
                urow = cur.fetchone()
                if urow:
                    cashier_name = urow.get("full_name") or urow.get("username")
                    cashier_username = urow.get("username")

            cur.execute(
                """
                INSERT INTO sales (
                    pos_terminal_id, user_id, invoice_date, total_amount,
                    tax_amount, customer_info, payment_method, payment_status,
                    service_charge, transaction_timestamp, cash_received, change_amount, cash_given, contact_number,
                    failure_reason, cashier_name, cashier_username
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING invoice_id
                """,
                (
                    sale.pos_terminal_id,
                    sale.user_id,
                    today,
                    total_amount,
                    tax_amount,
                    customer_display,
                    sale.payment_method,
                    sale.payment_status or "Paid",
                    sale.service_charge,
                    now,
                    cash_received,
                    change_amount,
                    cash_received,
                    normalized_contact,
                    sale.failure_reason,
                    cashier_name,
                    cashier_username
                ),
            )
            invoice_id = cur.fetchone()["invoice_id"]
            invoice_number = f"INV-{str(invoice_id).zfill(5)}"

            # --- Insert sold_items per item ---
            for item in sale.items:
                item_subtotal = round(item.unit_price * item.quantity, 2)

                cur.execute(
                    "SELECT product_name, status, is_service FROM products WHERE product_id = %s",
                    (item.product_id,)
                )
                prod_row = cur.fetchone()
                if not prod_row:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item.product_id} does not exist."
                    )
                if (prod_row.get("status") or "").strip().lower() == "archived":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product '{prod_row['product_name']}' is archived and cannot be sold."
                    )

                is_srv = bool(prod_row.get("is_service", False))

                quantity_before = 0
                expected_before = 0
                actual_before = 0
                inv_id = 0
                inv_row = None

                if not is_srv:
                    cur.execute(
                        "SELECT inventory_id, quantity, expected, actual, reorder_level FROM inventory WHERE product_id = %s FOR UPDATE",
                        (item.product_id,)
                    )
                    inv_row = cur.fetchone()
                    if not inv_row:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Product ID {item.product_id} has no inventory record."
                        )
                    quantity_before = inv_row["quantity"]
                    expected_before = inv_row["expected"]
                    actual_before = inv_row["actual"]
                    inv_id = inv_row["inventory_id"]

                    if actual_before < item.quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Insufficient sellable stock for product ID {item.product_id}. "
                                f"Available (Actual): {actual_before}, Requested: {item.quantity}"
                            ),
                        )
                    if quantity_before < item.quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Insufficient physical stock for product ID {item.product_id}. "
                                f"Available (Quantity): {quantity_before}, Requested: {item.quantity}"
                            ),
                        )

                cur.execute(
                    """
                    INSERT INTO sold_items
                        (invoice_id, product_id, quantity, unit_price, subtotal, total_amount, mechanic_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        invoice_id,
                        item.product_id,
                        item.quantity,
                        item.unit_price,
                        item_subtotal,
                        item_subtotal,
                        item.mechanic_name,
                    ),
                )

                # --- Update stock in inventory (only if paid and not a service) ---
                if not is_srv and (sale.payment_status or "Paid").lower() == "paid":
                    # Calculate new values
                    quantity_after = quantity_before - item.quantity
                    expected_after = expected_before - item.quantity
                    actual_after = actual_before - item.quantity

                    cur.execute(
                        """
                        UPDATE inventory
                        SET quantity = %s,
                            expected = %s,
                            actual = %s,
                            last_updated = %s
                        WHERE product_id = %s
                        RETURNING actual
                        """,
                        (quantity_after, expected_after, actual_after, today, item.product_id)
                    )
                    updated_actual = cur.fetchone()["actual"]

                    # Log Stock Event
                    cur.execute(
                        """
                        INSERT INTO inventory_stock_events (
                            inventory_id, product_id, event_type,
                            quantity_before, quantity_after,
                            expected_before, expected_after,
                            actual_before, actual_after,
                            quantity_delta, expected_delta, actual_delta,
                            difference_before, difference_after,
                            reference_type, reference_id, reason
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            inv_id, item.product_id, "SALE",
                            quantity_before, quantity_after,
                            expected_before, expected_after,
                            actual_before, actual_after,
                            -item.quantity, -item.quantity, -item.quantity,
                            int(actual_before - expected_before), int(actual_after - expected_after),
                            "sales", invoice_id, f"POS Sale (Invoice {invoice_number})"
                        )
                    )

                    if updated_actual <= 0:
                        dispatch_notification(
                            type="out_of_stock",
                            title="Out of Stock Alert",
                            message=f"{prod_row['product_name']} is now out of stock!",
                            link=f"/inventory?id={inv_id}",
                            target_roles=["Administrator", "Manager", "Warehouse Staff"]
                        )
                    elif updated_actual <= inv_row["reorder_level"]:
                        dispatch_notification(
                            type="out_of_stock",
                            title="Low Stock Alert",
                            message=f"{prod_row['product_name']} is running low ({updated_actual} left).",
                            link=f"/inventory?id={inv_id}",
                            target_roles=["Administrator", "Manager", "Warehouse Staff"]
                        )

            # --- Insert payment ---
            if sale.payment_method == "Split":
                # Record Cash payment
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (invoice_id, "Cash", sale.cash_amount - change_amount, now),
                )
                # Record E-Wallet payment
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (invoice_id, "E-Wallet", sale.ewallet_amount, now, sale.paymongo_source_id),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (invoice_id, sale.payment_method, cash_received, now, sale.paymongo_source_id),
                )

            # --- Audit log ---
            actor_id = int(x_actor_user_id) if x_actor_user_id else sale.user_id
            if actor_id:
                add_audit_log(
                    cur,
                    actor_id,
                    "CREATE_SALE",
                    "sales",
                    invoice_id,
                    f"POS sale completed. Invoice: {invoice_number}. Items: {len(sale.items)}. Method: {sale.payment_method}. Total: ₱{total_amount:.2f}"
                )

            dispatch_notification(
                type="order_completed",
                title="New Sale Completed",
                message=f"Sale {invoice_number} for ₱{total_amount:,.2f} has been processed successfully.",
                link=f"/sales",
                target_roles=["Administrator", "Manager"]
            )

            _invalidate_analytics_cache(cur)
            conn.commit()

            return {
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "subtotal": round(subtotal - tax_amount, 2),
                "tax_amount": tax_amount,
                "service_charge": sale.service_charge,
                "total_amount": total_amount,
                "cash_received": cash_received,
                "change": change_amount,
                "payment_method": sale.payment_method,
                "transaction_timestamp": now_pht.isoformat(),
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/sales/import")
def import_sales(
    file: UploadFile = File(...),
    deduct_inventory: bool = True,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Imports sales from a CSV or Excel (.xlsx) file, grouping rows by (Date, Customer, Contact, PaymentMethod)."""
    filename = file.filename.lower()
    original_filename = file.filename
    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx) files are allowed.")

    # Read file content for hashing and processing
    file_content = file.file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
    file_hash = hashlib.sha256(file_content).hexdigest()
    file.file.seek(0)  # Reset for parsing

    # Check for duplicate import
    conn_check = get_connection()
    try:
        with conn_check.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur_check:
            cur_check.execute(
                "SELECT import_id, file_name, imported_at FROM sales_import_logs WHERE file_hash = %s",
                (file_hash,)
            )
            existing = cur_check.fetchone()
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail=f"This file has already been imported on {existing['imported_at'].strftime('%m-%d-%Y %I:%M %p')} as '{existing['file_name']}'. Duplicate imports are not allowed."
                )
    finally:
        conn_check.close()

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
        cust_col = next((f for f in fieldnames if f in ('customer', 'customer_info', 'customer_name', 'customer info', 'customer name', 'name')), None)
        contact_col = next((f for f in fieldnames if f in ('contact', 'contact_number', 'contact number', 'phone', 'phone_number', 'phone number')), None)
        pay_col = next((f for f in fieldnames if f in ('paymentmethod', 'payment_method', 'payment method', 'payment', 'method')), None)
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
        orig_cust_col = next(h for h in headers if h.strip().lower() == cust_col) if cust_col else None
        orig_contact_col = next(h for h in headers if h.strip().lower() == contact_col) if contact_col else None
        orig_pay_col = next(h for h in headers if h.strip().lower() == pay_col) if pay_col else None
        orig_sku_col = next(h for h in headers if h.strip().lower() == sku_col)
        orig_qty_col = next(h for h in headers if h.strip().lower() == qty_col)
        orig_price_col = next(h for h in headers if h.strip().lower() == price_col) if price_col else None
        
        for line_no, row in raw_rows:
            raw_date = row.get(orig_date_col)
            raw_sku = row.get(orig_sku_col)
            raw_qty = row.get(orig_qty_col)
            raw_cust = row.get(orig_cust_col) if orig_cust_col else "Walk In customer"
            raw_contact = row.get(orig_contact_col) if orig_contact_col else None
            raw_pay = row.get(orig_pay_col) if orig_pay_col else "Cash"
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
            
            # Normalize payment method
            pay_method = raw_pay.strip().capitalize() if raw_pay else "Cash"
            if pay_method not in ("Cash", "Gcash", "Paymaya", "Split"):
                pay_method = "Cash"
            if pay_method == "Gcash":
                pay_method = "GCash"
            elif pay_method == "Paymaya":
                pay_method = "PayMaya"
                
            parsed_rows.append({
                "line_no": line_no,
                "date": parsed_date,
                "customer": raw_cust.strip() if raw_cust else "Walk In customer",
                "contact": raw_contact.strip() if raw_contact else None,
                "payment_method": pay_method,
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
            from routers.users import _parse_actor_user_id_or_401, _get_actor_or_403
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            
            if not (actor.get("is_root_admin") or actor.get("role_key") in ("administrator", "manager", "super admin", "system administrator")):
                raise HTTPException(
                    status_code=403,
                    detail="Only Administrators and Managers are permitted to import sales."
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
            
            # Group by (Date, Customer, Contact, PaymentMethod)
            grouped = defaultdict(list)
            for row in parsed_rows:
                group_key = (row["date"], row["customer"], row["contact"], row["payment_method"])
                grouped[group_key].append(row)
                
            # Insert grouped sales
            sales_count = 0
            sold_items_count = 0
            
            for (sale_date, cust_name, contact, pay_method), items in grouped.items():
                subtotal = sum(item["quantity"] * item["price"] for item in items)
                # Let's get it directly:
                cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'tax_rate'")
                tax_rate_row = cur.fetchone()
                db_tax_rate = float(tax_rate_row["setting_value"]) if tax_rate_row else 0.03
                
                tax_amount = round(subtotal - (subtotal / (1 + db_tax_rate)), 2)
                total_amount = round(subtotal, 2)
                
                # Insert sale
                cur.execute(
                    """
                    INSERT INTO sales (
                        invoice_date, total_amount, tax_amount, service_charge,
                        customer_info, customer_name, contact_number, payment_method, payment_status,
                        cash_received, cash_given, change_amount,
                        user_id, transaction_timestamp
                    )
                    VALUES (%s, %s, %s, 0.0, %s, %s, %s, %s, 'Paid', %s, %s, 0.0, %s, %s)
                    RETURNING invoice_id
                    """,
                    (
                        sale_date,
                        total_amount,
                        tax_amount,
                        cust_name,
                        cust_name,
                        contact,
                        pay_method,
                        total_amount,
                        total_amount,
                        actor_user_id,
                        datetime.combine(sale_date, datetime.min.time())
                    )
                )
                invoice_id = cur.fetchone()["invoice_id"]
                sales_count += 1
                
                # Insert sold items and deduct inventory
                today = date.today()
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

                    # --- Deduct inventory stock (only if deduct_inventory is True) ---
                    if deduct_inventory:
                        cur.execute(
                            "SELECT inventory_id, quantity, expected, actual, reorder_level FROM inventory WHERE product_id = %s FOR UPDATE",
                            (prod_id,)
                        )
                        inv_row = cur.fetchone()
                        if inv_row:
                            inv_id = inv_row["inventory_id"]
                            quantity_before = inv_row["quantity"]
                            expected_before = inv_row["expected"]
                            actual_before = inv_row["actual"]

                            quantity_after = max(0, quantity_before - item["quantity"])
                            expected_after = max(0, expected_before - item["quantity"])
                            actual_after = max(0, actual_before - item["quantity"])

                            cur.execute(
                                """
                                UPDATE inventory
                                SET quantity = %s,
                                    expected = %s,
                                    actual = %s,
                                    last_updated = %s
                                WHERE product_id = %s
                                RETURNING actual
                                """,
                                (quantity_after, expected_after, actual_after, today, prod_id)
                            )
                            updated_actual = cur.fetchone()["actual"]

                            # Log stock event
                            invoice_number = f"INV-{str(invoice_id).zfill(5)}"
                            cur.execute(
                                """
                                INSERT INTO inventory_stock_events (
                                    inventory_id, product_id, event_type,
                                    quantity_before, quantity_after,
                                    expected_before, expected_after,
                                    actual_before, actual_after,
                                    quantity_delta, expected_delta, actual_delta,
                                    difference_before, difference_after,
                                    reference_type, reference_id, reason
                                )
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """,
                                (
                                    inv_id, prod_id, "SALE",
                                    quantity_before, quantity_after,
                                    expected_before, expected_after,
                                    actual_before, actual_after,
                                    -item["quantity"], -item["quantity"], -item["quantity"],
                                    int(actual_before - expected_before), int(actual_after - expected_after),
                                    "sales", invoice_id, f"Imported Sale (Invoice {invoice_number})"
                                )
                            )

                            # Dispatch low/out-of-stock notifications
                            cur.execute(
                                "SELECT product_name FROM products WHERE product_id = %s",
                                (prod_id,)
                            )
                            prod_name_row = cur.fetchone()
                            prod_name = prod_name_row["product_name"] if prod_name_row else item["sku"]

                            if updated_actual <= 0:
                                dispatch_notification(
                                    type="out_of_stock",
                                    title="Out of Stock Alert",
                                    message=f"{prod_name} is now out of stock!",
                                    link=f"/inventory?id={inv_id}",
                                    target_roles=["Administrator", "Manager", "Warehouse Staff"]
                                )
                            elif updated_actual <= inv_row["reorder_level"]:
                                dispatch_notification(
                                    type="out_of_stock",
                                    title="Low Stock Alert",
                                    message=f"{prod_name} is running low ({updated_actual} left).",
                                    link=f"/inventory?id={inv_id}",
                                    target_roles=["Administrator", "Manager", "Warehouse Staff"]
                                )
                    
            # Mark cache as stale
            _invalidate_analytics_cache(cur)

            # Log the import to prevent duplicates
            cur.execute(
                """
                INSERT INTO sales_import_logs (file_hash, file_name, row_count, sales_count, items_count, imported_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (file_hash, original_filename, len(parsed_rows), sales_count, sold_items_count, actor_user_id)
            )
            
            # Audit log
            add_audit_log(
                cur,
                actor_user_id,
                "IMPORT_SALES",
                "sales",
                0,
                f"Imported sales: {sales_count} sales transactions, {sold_items_count} items from CSV/XLSX."
            )
            
            conn.commit()
            
            # Trigger retraining in a background thread
            from services.analytics_cache_jobs import run_refresh_job
            threading.Thread(target=run_refresh_job, daemon=True).start()
            
            return {
                "ok": True,
                "message": f"Successfully imported {sales_count} sales transactions containing {sold_items_count} items. Inventory has been updated accordingly.",
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
