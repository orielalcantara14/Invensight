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
from prophet_timeseries import run_prophet_daily_forecast


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


def load_sold_data(cur) -> Tuple[dict, dict]:
    """Returns (sold_last_30d, sold_last_90d) dicts."""
    cur.execute(
        """
        SELECT 
            si.product_id, 
            SUM(CASE WHEN s.invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN si.quantity ELSE 0 END)::float AS qty_30d,
            SUM(si.quantity)::float AS qty_90d
        FROM sold_items si
        JOIN sales s ON si.invoice_id = s.invoice_id
        WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY si.product_id
        """
    )
    rows = cur.fetchall()
    qty_30 = {r["product_id"]: float(r["qty_30d"] or 0) for r in rows}
    qty_90 = {r["product_id"]: float(r["qty_90d"] or 0) for r in rows}
    return qty_30, qty_90


def load_inventory_products(cur) -> List[dict]:
    cur.execute(
        """
        SELECT i.product_id, p.product_name,
               COALESCE(i.actual, 0)::int AS current_stock,
               COALESCE(i.reorder_level, 10)::int AS reorder_level
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        """
    )
    return cur.fetchall()


def build_product_forecasts(cur) -> List[ProductForecastItem]:
    sold30, sold90 = load_sold_data(cur)
    rows = load_inventory_products(cur)
    out: List[ProductForecastItem] = []
    for r in rows:
        pid = r["product_id"]
        q30 = sold30.get(pid, 0.0)
        q90 = sold90.get(pid, 0.0)
        
        # Accuracy Refinement: Use weighted daily velocity (70% weight on last 30d, 30% weight on 90d average)
        daily_30 = q30 / 30.0
        daily_90 = q90 / 90.0
        daily = (daily_30 * 0.7) + (daily_90 * 0.3)
        
        stock = int(r["current_stock"])
        rl = int(r["reorder_level"])
        days_out = 0.0 if stock <= 0 else (None if daily <= 0 else stock / daily)
        
        if daily_30 <= 0:
            conf = 0.2
        elif daily_30 < 5:
            conf = 0.70
        else:
            conf = min(0.95, 0.90 + 0.05 * (min(daily_30 * 30, 50.0) / 50.0))
            
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
    return out


def assemble_sales_forecast(cur, days: int) -> SalesForecastResponse:
    days = max(7, min(days, 365))
    start, actuals = load_daily_revenue(cur, days)
    # Update days to the actual length returned (it may be trimmed)
    days = len(actuals)
    series, engine, next_fc, fa, trend = build_sales_series(start, days, actuals)
    products = build_product_forecasts(cur)
    return SalesForecastResponse(
        next_period_forecast=next_fc,
        forecast_accuracy=fa,
        trend_direction=trend,
        series=series,
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
    sold30, sold90 = load_sold_data(cur)
    cur.execute(
        """
        SELECT i.product_id, p.product_name, COALESCE(i.actual, 0)::int AS current_stock,
               COALESCE(i.reorder_level, 10)::int AS reorder_level,
               CASE 
                 WHEN COALESCE(i.actual, 0) <= 0 THEN 'Out of Stock'
                 WHEN COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                 ELSE 'Normal'
               END AS inventory_status,
               p.supplier_id, s.supplier_name
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        LEFT JOIN supplier s ON s.supplier_id = p.supplier_id
        WHERE p.status != 'Archived'
        """
    )
    rows = cur.fetchall()
    risk_analysis: List[StockRiskAnalysisPoint] = []
    horizon: List[StockHorizonPrediction] = []
    critical: List[CriticalStockItem] = []
    high = med = low = 0
    days_list: List[float] = []

    for r in rows:
        pid = r["product_id"]
        name = r["product_name"] or ""
        stock = int(r["current_stock"])
        q30_raw = sold30.get(pid, 0.0)
        q90_raw = sold90.get(pid, 0.0)
        
        # Accuracy Refinement: Use weighted daily velocity (70% weight on last 30d, 30% weight on 90d average)
        daily_30 = q30_raw / 30.0
        daily_90 = q90_raw / 90.0
        daily = (daily_30 * 0.7) + (daily_90 * 0.3)
        
        days_out: Optional[float] = 0.0 if stock <= 0 else (None if daily <= 0 else stock / daily)
        if days_out is not None:
            days_list.append(days_out)
            
        if daily_30 <= 0:
            conf = 0.15
        elif daily_30 < 5:
            conf = 0.70
        else:
            conf = min(0.95, 0.90 + 0.05 * (min(daily_30 * 30, 50.0) / 50.0))

        risk_analysis.append(
            StockRiskAnalysisPoint(
                product_name=name,
                days_to_stockout=days_out,
                predicted_demand_30d=daily * 30,
                current_stock=stock,
                confidence=round(conf, 2),
            )
        )

        # Map urgency based on physical inventory status first, fallback to AI logic
        inv_status = r["inventory_status"]
        if inv_status == "Out of Stock":
            u: Literal["High", "Medium", "Low"] = "High"
        elif inv_status == "Low":
            u = "Medium"
        else:
            # Fallback to AI velocity-based urgency if status is Normal
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
        
        # Accurately recommend order: If Out of Stock, full restock. Else Demand - Stock + Buffer.
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

    avg_days = sum(days_list) / len(days_list) if days_list else None

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
        forecast_engine="rolling_average",
    )
