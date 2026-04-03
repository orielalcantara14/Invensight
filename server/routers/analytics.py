"""Analytics HTTP routes: overview, forecast, stock prediction, model status, retrain."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

import psycopg2.extras
from fastapi import APIRouter, Query

from analytics_cache_jobs import (
    load_cached_sales_forecast,
    load_cached_stock_prediction,
    load_overview_extras,
    run_refresh_job,
)
from analytics_engine import assemble_sales_forecast, assemble_stock_prediction, build_product_forecasts
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


def _get_low_stock_counts(cur) -> tuple[int, int, int]:
    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= 0) AS critical_count,
            COUNT(*) FILTER (
                WHERE COALESCE(i.actual, 0) > 0
                AND COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10)
            ) AS low_count,
            COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10)) AS total_low_stock
        FROM inventory i
        """
    )
    row = cur.fetchone()
    return (
        int(row["critical_count"] or 0),
        int(row["low_count"] or 0),
        int(row["total_low_stock"] or 0),
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
            critical, low, total_low = _get_low_stock_counts(cur)
            _ensure_cache_rows(cur)
            extras = load_overview_extras(cur)
            if not extras:
                extras = load_overview_extras(cur, allow_stale=True)
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
                low_stock_alerts=total_low,
                critical_stock_count=critical,
                low_stock_count=low,
                prediction_models=2,
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
                cached = load_cached_sales_forecast(cur, days, allow_stale=False)
                if cached is None:
                    cached = load_cached_sales_forecast(cur, days, allow_stale=True)
                if cached is not None:
                    resp, _gen = cached
                    fresh = build_product_forecasts(cur)
                    resp = resp.model_copy(update={"product_forecasts": fresh})
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
                cached = load_cached_stock_prediction(cur, allow_stale=False)
                if cached is None:
                    cached = load_cached_stock_prediction(cur, allow_stale=True)
                if cached is not None:
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
def retrain_analytics_models() -> AnalyticsRetrainResponse:
    ok, msg = run_refresh_job()
    return AnalyticsRetrainResponse(ok=ok, message=msg)
