"""
Assembles sales and stock forecasts. Prophet is used when data and dependencies allow;
otherwise a rolling-mean fallback is applied. Stock demand uses trailing sales velocity
(rolling window), aligned with the same reporting period as sales analytics.
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import List, Literal, Optional, Tuple, cast

from models import (
    CriticalStockItem,
    ForecastSeriesPoint,
    ProductForecastItem,
    SalesForecastResponse,
    StockHorizonPrediction,
    StockPredictionResponse,
    StockRiskAnalysisPoint,
    StockRiskStats,
)
from prophet_timeseries import run_prophet_daily_forecast, MIN_DAYS_FOR_PROPHET


def load_daily_product_sales(cur, product_id: int, days: int) -> Tuple[date, List[float]]:
    """Returns (start_date, daily_quantities) for a specific product."""
    cur.execute(
        """
        SELECT DATE(s.invoice_date) AS d, COALESCE(SUM(si.quantity), 0)::float AS qty
        FROM sales s
        JOIN sold_items si ON s.invoice_id = si.invoice_id
        WHERE si.product_id = %s AND s.invoice_date >= CURRENT_DATE - (%s * INTERVAL '1 day')
        GROUP BY DATE(s.invoice_date)
        ORDER BY d
        """,
        (product_id, days),
    )
    rows = cur.fetchall()
    by_day = {r["d"]: float(r["qty"] or 0) for r in rows}
    
    base_start = date.today() - timedelta(days=days - 1)
    full_actuals = [float(by_day.get(base_start + timedelta(days=i), 0.0)) for i in range(days)]
    
    return base_start, full_actuals


def load_daily_revenue(cur, days: int) -> Tuple[date, List[float]]:
    cur.execute(
        """
        SELECT DATE(invoice_date) AS d, COALESCE(SUM(total_amount), 0)::float AS revenue
        FROM sales
        WHERE invoice_date >= CURRENT_DATE - (%s * INTERVAL '1 day')
        GROUP BY DATE(invoice_date)
        ORDER BY d
        """,
        (days,),
    )
    rows = cur.fetchall()
    by_day = {r["d"]: float(r["revenue"] or 0) for r in rows}
    
    # Calculate initial full range start
    base_start = date.today() - timedelta(days=days - 1)
    full_actuals = [float(by_day.get(base_start + timedelta(days=i), 0.0)) for i in range(days)]
    
    # Find first non-zero sale to avoid fake 'growth trend' from 0 for new businesses
    first_sale_idx = 0
    for i, val in enumerate(full_actuals):
        if val > 1.0: # Using 1.0 as a threshold for real revenue
            first_sale_idx = i
            break
            
    trimmed_actuals = full_actuals[first_sale_idx:]
    actual_start = base_start + timedelta(days=first_sale_idx)
    
    # If we trimmed everything (no sales), return at least 1 day of 0
    if not trimmed_actuals:
        return date.today(), [0.0]
        
    return actual_start, trimmed_actuals


def _rolling_mean_series(
    start: date, days: int, actuals: List[float]
) -> Tuple[List[ForecastSeriesPoint], Optional[float], Optional[float], str]:
    window = min(7, len(actuals)) or 1
    series: List[ForecastSeriesPoint] = []
    
    # 1. Historical part
    for i in range(days):
        d = start + timedelta(days=i)
        a = actuals[i]
        lo = max(0, i - window + 1)
        chunk = actuals[lo : i + 1]
        fc = sum(chunk) / len(chunk)
        margin = max(fc * 0.12, 1.0)
        
        series.append(
            ForecastSeriesPoint(
                date=d.isoformat(),
                actual_sales=a,
                forecast_sales=fc,
                lower_bound=max(0.0, fc - margin),
                upper_bound=(fc + margin),
                trend_component=None,
                weekly_component=None,
                smoothed_sales=fc,
                event_icon=None,
            )
        )
    
    # 2. Future part (30 days)
    last_fc = series[-1].smoothed_sales if series else 0.0
    margin = max(last_fc * 0.15, 2.0)
    for i in range(1, 31):
        d = start + timedelta(days=days + i - 1)
        series.append(
            ForecastSeriesPoint(
                date=d.isoformat(),
                actual_sales=None,
                forecast_sales=last_fc,
                lower_bound=max(0.0, last_fc - margin),
                upper_bound=last_fc + margin,
                trend_component=None,
                weekly_component=None,
                smoothed_sales=last_fc,
                event_icon=None,
            )
        )

    next_fc = last_fc
    half = len(actuals) // 2
    first = actuals[:half] if half else actuals
    second = actuals[half:]
    m1 = sum(first) / len(first) if first else 0.0
    m2 = sum(second) / len(second) if second else 0.0
    if m2 > m1 * 1.05:
        trend = "up"
    elif m2 < m1 * 0.95:
        trend = "down"
    else:
        trend = "flat"
    fa: Optional[float] = None
    return series, next_fc, fa, trend


def build_sales_series(
    start: date, days: int, actuals: List[float]
) -> Tuple[List[ForecastSeriesPoint], str, Optional[float], Optional[float], str]:
    prophet = run_prophet_daily_forecast(start, days, actuals)
    if prophet is not None:
        (
            yhat, yhat_lo, yhat_hi, 
            tr, wk, yr, seas, hols, 
            next_30d, acc, trend_dir, 
            fyhat, flo, fhi, ftrend, fwk, fyr, fseas, fhols,
            denoised_y
        ) = prophet
        fa: Optional[float] = None
        try:
            acc_f = float(acc)
            fa = None if math.isnan(acc_f) else acc_f
        except (TypeError, ValueError):
            pass
        
        series: List[ForecastSeriesPoint] = []
        # 1. Historical loop
        for i in range(days):
            d = start + timedelta(days=i)
            series.append(
                ForecastSeriesPoint(
                    date=d.isoformat(),
                    actual_sales=float(denoised_y[i]),
                    forecast_sales=float(max(0.0, yhat[i])),
                    lower_bound=float(max(0.0, yhat_lo[i])),
                    upper_bound=float(max(0.0, yhat_hi[i])),
                    trend_component=float(tr[i]),
                    weekly_component=float(wk[i]),
                    yearly_component=float(yr[i]),
                    seasonal_component=float(seas[i]),
                    holidays_component=float(hols[i]),
                    smoothed_sales=float(tr[i]), 
                    event_icon=None,
                )
            )
        
        # 2. Future loop
        for i in range(len(fyhat)):
            d = start + timedelta(days=days + i)
            series.append(
                ForecastSeriesPoint(
                    date=d.isoformat(),
                    actual_sales=None,
                    forecast_sales=float(max(0.0, fyhat[i])),
                    lower_bound=float(max(0.0, flo[i])),
                    upper_bound=float(max(0.0, fhi[i])),
                    trend_component=float(ftrend[i]),
                    weekly_component=float(fwk[i]),
                    yearly_component=float(fyr[i]),
                    seasonal_component=float(fseas[i]),
                    holidays_component=float(fhols[i]),
                    smoothed_sales=float(ftrend[i]),
                    event_icon="ai_predicted",
                )
            )
        return series, "prophet", next_30d, fa, trend_dir

    series, next_fc, fa, trend = _rolling_mean_series(start, days, actuals)
    return series, "rolling_mean", next_fc, fa, trend


def slice_series(points: List[ForecastSeriesPoint], take_last: int) -> List[ForecastSeriesPoint]:
    if take_last >= len(points):
        return points
    return points[-take_last:]


def load_sold_data(cur) -> Tuple[dict, dict, dict]:
    """Returns (sold_last_30d, sold_last_365d) dicts."""
    cur.execute(
        """
        SELECT 
            si.product_id, 
            SUM(CASE WHEN s.invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN si.quantity ELSE 0 END)::float AS qty_30d,
            SUM(CASE WHEN s.invoice_date >= CURRENT_DATE - INTERVAL '365 days' THEN si.quantity ELSE 0 END)::float AS qty_365d,
            SUM(si.quantity)::float AS qty_total,
            MIN(s.invoice_date) as first_sale
        FROM sold_items si
        JOIN sales s ON si.invoice_id = s.invoice_id
        WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '3 years'
        GROUP BY si.product_id
        """
    )
    rows = cur.fetchall()
    qty_30 = {r["product_id"]: float(r["qty_30d"] or 0) for r in rows}
    qty_365 = {r["product_id"]: float(r["qty_365d"] or 0) for r in rows}
    qty_total = {r["product_id"]: float(r["qty_total"] or 0) for r in rows}
    first_dates = {r["product_id"]: r["first_sale"] for r in rows}
    return qty_30, qty_365, qty_total, first_dates


def load_inventory_products(cur) -> List[dict]:
    cur.execute(
        """
        SELECT i.product_id, p.product_name,
               SUM(COALESCE(i.actual, 0))::int AS current_stock,
               MAX(COALESCE(i.reorder_level, 10))::int AS reorder_level
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.status = 'Active'
        GROUP BY i.product_id, p.product_name
        """
    )
    return cur.fetchall()


def build_product_forecasts(cur) -> List[ProductForecastItem]:
    sold30, sold365, sold_total, first_dates = load_sold_data(cur)
    rows = load_inventory_products(cur)
    out: List[ProductForecastItem] = []
    # Strategy: Use Prophet for top volume items, velocity for the rest
    rows_sorted = sorted(rows, key=lambda r: sold30.get(r["product_id"], 0.0), reverse=True)
    
    for i, r in enumerate(rows_sorted):
        pid = r["product_id"]
        q30 = sold30.get(pid, 0.0)
        q365 = sold365.get(pid, 0.0)
        stock = int(r["current_stock"])
        rl = int(r["reorder_level"])
        
        use_prophet = False
        if i < 5 and q365 >= MIN_DAYS_FOR_PROPHET:
            p_start, p_actuals = load_daily_product_sales(cur, pid, 730)
            res = run_prophet_daily_forecast(p_start, 730, p_actuals)
            if res:
                next_30d = res[8]
                daily = next_30d / 30.0
                conf = res[9] / 100.0 if not math.isnan(res[9]) else 0.5
                use_prophet = True

        # All-time velocity calculation based on product life span (max 2 years)
        first_sale = first_dates.get(pid)
        if first_sale:
            # First sale might be a string or date depending on driver
            if isinstance(first_sale, str):
                first_sale = date.fromisoformat(first_sale[:10])
            days_active = max(1, (date.today() - first_sale).days)
            daily_all_time = sold_total.get(pid, 0.0) / min(730, days_active)
        else:
            daily_all_time = 0.0

        # Always calculate velocity as a fallback/floor
        daily_30 = q30 / 30.0
        daily_365 = q365 / 365.0
        # Weighted mix: 50% All-Time stability, 25% Annual trend, 25% Recent surge
        daily_velocity = (daily_30 * 0.25) + (daily_365 * 0.25) + (daily_all_time * 0.50)

        if use_prophet:
            # Use Prophet, but floor it at velocity if Prophet is suspiciously low
            # (Prophet can be sensitive to recent 0s in data gaps)
            daily = max(daily, daily_velocity)
        else:
            daily = daily_velocity
            
            if daily <= 0:
                conf = 0.15
            elif daily_30 > 0:
                conf = min(0.95, 0.85 + 0.10 * (min(q30, 20.0) / 20.0))
            else:
                conf = min(0.80, 0.60 + 0.20 * (min(q365, 100.0) / 100.0))
        
        raw_days = 0.0 if stock <= 0 else (None if daily <= 0 else stock / daily)
        days_out = min(raw_days, 365.0) if raw_days is not None else None

        reorder_by = None
        if daily * 30 > stock and daily > 0:
            reorder_by = (date.today() + timedelta(days=max(1, int(7 - conf * 5)))).isoformat()
            
        out.append(
            ProductForecastItem(
                product_id=pid,
                product_name=r["product_name"] or "",
                current_stock=stock,
                predicted_demand_30d=daily * 30,
                reorder_by=reorder_by,
                confidence=round(conf, 2),
                days_to_stockout=days_out,
                reorder_level=rl,
            )
        )
    # Sort by predicted demand DESC to show top performers first
    out.sort(key=lambda x: x.predicted_demand_30d, reverse=True)
    return out


def assemble_sales_forecast(cur, days: int) -> SalesForecastResponse:
    # We always train on 730 days (2 years) for maximum accuracy, 
    # but we only return the slice the user requested.
    view_days = max(7, min(days, 365))
    train_days = 730
    
    start, actuals = load_daily_revenue(cur, train_days)
    actual_len = len(actuals)
    
    series, engine, next_fc, fa, trend = build_sales_series(start, actual_len, actuals)
    
    # Slice the historical part of the series to match the requested view
    # Prophet returns (actual_len historical points) + (30 future points)
    future_points = 30
    historical_points = series[:actual_len]
    future_points_list = series[actual_len:]
    
    # Take the last 'view_days' of history
    view_history = historical_points[-view_days:] if view_days < actual_len else historical_points
    final_series = view_history + future_points_list
    
    products = build_product_forecasts(cur)
    return SalesForecastResponse(
        next_period_forecast=next_fc,
        forecast_accuracy=fa,
        trend_direction=trend,
        series=final_series,
        product_forecasts=products,
        model_status=None,
        served_from_cache=False,
        forecast_engine=engine,
    )


def _urgency(days: Optional[float], stock: int, demand30: float) -> str:
    if stock <= 0:
        return "High"
    if days is not None and days < 14:
        return "High"
    if days is not None and days < 45:
        return "Medium"
    if demand30 > stock * 2:
        return "Medium"
    return "Low"


def assemble_stock_prediction(cur) -> StockPredictionResponse:
    sold30, sold365, sold_total, first_dates = load_sold_data(cur)
    cur.execute(
        """
        SELECT i.product_id, p.product_name, 
               SUM(COALESCE(i.actual, 0))::int AS current_stock,
               MAX(COALESCE(i.reorder_level, 10))::int AS reorder_level,
               CASE 
                 WHEN SUM(COALESCE(i.actual, 0)) <= 0 THEN 'Out of Stock'
                 WHEN SUM(COALESCE(i.actual, 0)) <= MAX(COALESCE(i.reorder_level, 10)) THEN 'Low'
                 ELSE 'Normal'
               END AS inventory_status,
               p.supplier_id, s.supplier_name
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        LEFT JOIN supplier s ON s.supplier_id = p.supplier_id
        WHERE p.status != 'Archived' AND i.status = 'Active'
        GROUP BY i.product_id, p.product_name, p.supplier_id, s.supplier_name
        """
    )
    rows = cur.fetchall()
    risk_analysis: List[StockRiskAnalysisPoint] = []
    horizon: List[StockHorizonPrediction] = []
    critical: List[CriticalStockItem] = []
    high = med = low = 0
    days_list: List[float] = []

    # Strategy: Use Prophet for top volume items, velocity for the rest
    # Sort rows by 30d volume to identify top candidates for AI
    rows_sorted = sorted(rows, key=lambda r: sold30.get(r["product_id"], 0.0), reverse=True)
    
    for i, r in enumerate(rows_sorted):
        pid = r["product_id"]
        name = r["product_name"] or ""
        stock = int(r["current_stock"])
        q30_raw = sold30.get(pid, 0.0)
        q365_raw = sold365.get(pid, 0.0)
        
        # Use Prophet for Top 5 items with enough history
        use_prophet = False
        if i < 5 and q365_raw >= MIN_DAYS_FOR_PROPHET:
            p_start, p_actuals = load_daily_product_sales(cur, pid, 730)
            res = run_prophet_daily_forecast(p_start, 730, p_actuals)
            if res:
                # Prophet result: (..., next_30d_sum, accuracy, direction, ...)
                next_30d = res[8]
                daily = next_30d / 30.0
                conf = res[9] / 100.0 if not math.isnan(res[9]) else 0.5
                use_prophet = True

        # All-time velocity calculation based on product life span (max 2 years)
        first_sale = first_dates.get(pid)
        if first_sale:
            if isinstance(first_sale, str):
                first_sale = date.fromisoformat(first_sale[:10])
            days_active = max(1, (date.today() - first_sale).days)
            daily_all_time = sold_total.get(pid, 0.0) / min(730, days_active)
        else:
            daily_all_time = 0.0

        # Always calculate velocity as a fallback/floor
        daily_30 = q30_raw / 30.0
        daily_365 = q365_raw / 365.0
        # Weighted mix: 50% All-Time stability, 25% Annual trend, 25% Recent surge
        daily_velocity = (daily_30 * 0.25) + (daily_365 * 0.25) + (daily_all_time * 0.50)

        if use_prophet:
            # Use Prophet, but floor it at velocity if Prophet is suspiciously low
            daily = max(daily, daily_velocity)
        else:
            # Fallback to Velocity
            daily = daily_velocity
            
            if daily <= 0:
                conf = 0.15
            elif daily_30 > 0:
                conf = min(0.95, 0.85 + 0.10 * (min(q30_raw, 20.0) / 20.0))
            else:
                conf = min(0.80, 0.60 + 0.20 * (min(q365_raw, 100.0) / 100.0))

        days_out: Optional[float] = 0.0 if stock <= 0 else (None if daily <= 0 else stock / daily)
        if days_out is not None:
            days_list.append(days_out)

        risk_analysis.append(
            StockRiskAnalysisPoint(
                product_name=name,
                days_to_stockout=days_out,
                predicted_demand_30d=daily * 30,
                current_stock=stock,
                confidence=round(conf, 2),
            )
        )

        inv_status = r["inventory_status"]
        if inv_status == "Out of Stock":
            u: Literal["High", "Medium", "Low"] = "High"
        elif inv_status == "Low":
            u = "Medium"
        else:
            u = cast(Literal["High", "Medium", "Low"], _urgency(days_out, stock, daily * 30))
        
        if u == "High":
            high += 1
        elif u == "Medium":
            med += 1
        else:
            low += 1

        d30 = daily * 30
        d60 = daily * 60
        d90 = daily * 90
        rl = int(r["reorder_level"])
        s30 = max(0.0, float(stock) - d30 + float(rl) * 0.1)
        s60 = max(0.0, float(stock) - d60 + float(rl) * 0.1)
        s90 = max(0.0, float(stock) - d90 + float(rl) * 0.1)
        
        is_out = (inv_status == "Out of Stock")
        if is_out:
            rec = max(int(round(rl * 1.5)), int(round(d30 - stock + (rl * 1.2))))
        else:
            rec = max(0, int(round(d30 - stock + (rl * 1.2)))) if (d30 + (rl * 0.5)) > stock else 0

        horizon.append(
            StockHorizonPrediction(
                product_id=pid,
                product_name=name,
                supplier_id=r["supplier_id"],
                supplier_name=r["supplier_name"] or "Unassigned",
                current_stock=stock,
                stock_30d=s30,
                stock_60d=s60,
                stock_90d=s90,
                recommended_order=rec,
                urgency=u,
            )
        )

        if is_out or u == "High" or (days_out is not None and days_out < 21 and daily > 0):
            critical.append(
                CriticalStockItem(
                    product_name=name,
                    days_to_stockout=days_out or 0,
                    recommended_order=max(rec, rl),
                )
            )

    # Filter out extreme outliers (e.g. items with near-zero velocity) to keep the average realistic
    # We only average items that are likely to stock out within a year
    realistic_days = [min(d, 365.0) for d in days_list if d is not None]
    avg_days = sum(realistic_days) / len(realistic_days) if realistic_days else None

    return StockPredictionResponse(
        risk_stats=StockRiskStats(
            high_risk=high,
            medium_risk=med,
            low_risk=low,
            avg_days_to_stockout=round(avg_days, 1) if avg_days is not None else None,
        ),
        risk_analysis=risk_analysis,
        horizon_predictions=horizon,
        critical_items=critical,
        model_status=None,
        served_from_cache=False,
        forecast_engine="hybrid_prophet_velocity",
    )
