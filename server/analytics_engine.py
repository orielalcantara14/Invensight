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
    start = date.today() - timedelta(days=days - 1)
    actuals = [float(by_day.get(start + timedelta(days=i), 0.0)) for i in range(days)]
    return start, actuals


def _rolling_mean_series(
    start: date, days: int, actuals: List[float]
) -> Tuple[List[ForecastSeriesPoint], Optional[float], Optional[float], str]:
    window = min(7, len(actuals)) or 1
    series: List[ForecastSeriesPoint] = []
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
                upper_bound=fc + margin,
                trend_component=None,
                weekly_component=None,
                smoothed_sales=fc,
                event_icon=None,
            )
        )
    next_fc = series[-1].forecast_sales if series else None
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
        yhat, yhat_lo, yhat_hi, tr, wk, next_30d, acc, trend_dir = prophet
        fa: Optional[float] = None
        try:
            acc_f = float(acc)
            fa = None if math.isnan(acc_f) else acc_f
        except (TypeError, ValueError):
            pass
        # Compute simple centered moving average for smoothed_sales
        smoothed = []
        for i in range(days):
            lo = max(0, i - 3)
            hi = min(days, i + 4)
            chunk = actuals[lo:hi]
            smoothed.append(sum(chunk) / len(chunk) if chunk else actuals[i])

        series: List[ForecastSeriesPoint] = []
        for i in range(days):
            d = start + timedelta(days=i)
            icon = None
            if actuals[i] > smoothed[i] * 1.3 and actuals[i] > 0:
                if d.weekday() >= 5:
                    icon = "weekend"
                elif d.day in (15, 16, 28, 29, 30, 31):
                    icon = "payday"

            series.append(
                ForecastSeriesPoint(
                    date=d.isoformat(),
                    actual_sales=float(actuals[i]),
                    forecast_sales=float(max(0.0, yhat[i])),
                    lower_bound=float(max(0.0, yhat_lo[i])),
                    upper_bound=float(max(0.0, yhat_hi[i])),
                    trend_component=float(tr[i]),
                    weekly_component=float(wk[i]),
                    smoothed_sales=float(smoothed[i]),
                    event_icon=icon,
                )
            )
        return series, "prophet", next_30d, fa, trend_dir

    series, next_fc, fa, trend = _rolling_mean_series(start, days, actuals)
    return series, "rolling_mean", next_fc, fa, trend


def slice_series(points: List[ForecastSeriesPoint], take_last: int) -> List[ForecastSeriesPoint]:
    if take_last >= len(points):
        return points
    return points[-take_last:]


def load_sold_30d(cur) -> dict:
    cur.execute(
        """
        SELECT si.product_id, COALESCE(SUM(si.quantity), 0)::float AS qty
        FROM sold_items si
        JOIN sales s ON si.invoice_id = s.invoice_id
        WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY si.product_id
        """
    )
    return {r["product_id"]: float(r["qty"] or 0) for r in cur.fetchall()}


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
    sold = load_sold_30d(cur)
    rows = load_inventory_products(cur)
    out: List[ProductForecastItem] = []
    for r in rows:
        pid = r["product_id"]
        q30 = sold.get(pid, 0.0)
        daily = q30 / 30.0 if q30 > 0 else 0.0
        stock = int(r["current_stock"])
        rl = int(r["reorder_level"])
        days_out = None if daily <= 0 else stock / daily
        if q30 <= 0:
            conf = 0.2
        elif q30 < 5:
            conf = 0.70
        else:
            conf = min(0.95, 0.90 + 0.05 * (min(q30, 50.0) / 50.0))
        reorder_by = None
        if q30 > stock and q30 > 0:
            reorder_by = (date.today() + timedelta(days=max(1, int(7 - conf * 5)))).isoformat()
        out.append(
            ProductForecastItem(
                product_id=pid,
                product_name=r["product_name"] or "",
                current_stock=stock,
                predicted_demand_30d=q30,
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
    sold = load_sold_30d(cur)
    cur.execute(
        """
        SELECT i.product_id, p.product_name, COALESCE(i.actual, 0)::int AS current_stock,
               COALESCE(i.reorder_level, 10)::int AS reorder_level
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
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
        q30 = sold.get(pid, 0.0)
        daily = q30 / 30.0
        days_out: Optional[float] = None if daily <= 0 else stock / daily
        if days_out is not None:
            days_list.append(days_out)
            
        if q30 <= 0:
            conf = 0.15
        elif q30 < 5:
            conf = 0.70
        else:
            conf = min(0.95, 0.90 + 0.05 * (min(q30, 50.0) / 50.0))

        risk_analysis.append(
            StockRiskAnalysisPoint(
                product_name=name,
                days_to_stockout=days_out,
                predicted_demand_30d=q30,
                current_stock=stock,
                confidence=round(conf, 2),
            )
        )

        u: Literal["High", "Medium", "Low"] = cast(
            Literal["High", "Medium", "Low"], _urgency(days_out, stock, q30)
        )
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
        rec = max(0, int(round(q30 - stock + rl))) if q30 > stock else 0

        horizon.append(
            StockHorizonPrediction(
                product_id=pid,
                product_name=name,
                current_stock=stock,
                stock_30d=s30,
                stock_60d=s60,
                stock_90d=s90,
                recommended_order=rec,
                urgency=u,
            )
        )

        if u == "High" or (days_out is not None and days_out < 21 and q30 > 0):
            critical.append(
                CriticalStockItem(
                    product_name=name,
                    days_to_stockout=days_out,
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
