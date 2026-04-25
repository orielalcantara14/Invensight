"""
Persists analytics payloads to PostgreSQL for low-latency reads and runs a background
refresh on a fixed interval. Manual retrain triggers the same refresh path.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import psycopg2.extras
from psycopg2.extras import Json

from .analytics_engine import assemble_sales_forecast, assemble_stock_prediction
from database import get_connection
from routers.notifications import dispatch_notification
from models import SalesForecastResponse, StockPredictionResponse

log = logging.getLogger("invensight.analytics_cache")

MODEL_KEYS = ("overview", "forecast_30d", "stock_prediction")
CACHED_FORECAST_DAYS = int(os.getenv("ANALYTICS_CACHED_FORECAST_DAYS", "365"))
CACHE_TTL_SECONDS = int(os.getenv("ANALYTICS_CACHE_TTL_SECONDS", "3600"))
REFRESH_INTERVAL_SECONDS = int(os.getenv("ANALYTICS_CACHE_REFRESH_SECONDS", str(CACHE_TTL_SECONDS)))
PH_TIMEZONE_OFFSET = 8  # UTC+8


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_ts(iso: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _cache_fresh(payload: Dict[str, Any]) -> bool:
    gen = payload.get("generated_at")
    if not gen:
        return False
    ts = _parse_ts(str(gen))
    if ts is None:
        return False
    age = (datetime.now(timezone.utc) - ts).total_seconds()
    return age < CACHE_TTL_SECONDS


def ensure_cache_rows(cur) -> None:
    for key in MODEL_KEYS:
        cur.execute(
            """
            INSERT INTO analytics_model_cache (model_key, payload, model_engine, status, message)
            VALUES (%s, '{}'::jsonb, 'pending', 'not_trained', '')
            ON CONFLICT (model_key) DO NOTHING
            """,
            (key,),
        )


def run_refresh_job() -> Tuple[bool, str]:
    """Recomputes sales and stock analytics, updates cache rows, logs a run."""
    started = time.perf_counter()
    conn = get_connection()
    ok = False
    msg = ""
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_cache_rows(cur)
            sf = assemble_sales_forecast(cur, CACHED_FORECAST_DAYS)
            sp = assemble_stock_prediction(cur)
            gen = _utc_now_iso()
            next_run = datetime.now(timezone.utc).timestamp() + REFRESH_INTERVAL_SECONDS
            next_scheduled = datetime.fromtimestamp(next_run, tz=timezone.utc)

            sf_dump = sf.model_dump(mode="json")
            sp_dump = sp.model_dump(mode="json")
            overview_payload = {
                "generated_at": gen,
                "forecast_accuracy": sf_dump.get("forecast_accuracy"),
                "sales_forecast_engine": sf_dump.get("forecast_engine"),
                "stock_forecast_engine": sp_dump.get("forecast_engine"),
            }
            forecast_payload = {
                "generated_at": gen,
                "forecast_days": CACHED_FORECAST_DAYS,
                "response": sf_dump,
            }
            stock_payload = {
                "generated_at": gen,
                "response": sp_dump,
            }

            duration_ms = int((time.perf_counter() - started) * 1000)
            summary = "Cache refreshed (Prophet when available; else rolling mean)."

            for key, pl, engine, status in (
                ("overview", overview_payload, sf_dump.get("forecast_engine", "rolling_mean"), "ready"),
                ("forecast_30d", forecast_payload, sf_dump.get("forecast_engine", "rolling_mean"), "ready"),
                ("stock_prediction", stock_payload, sp_dump.get("forecast_engine", "rolling_average"), "ready"),
            ):
                cur.execute(
                    """
                    UPDATE analytics_model_cache
                    SET payload = %s::jsonb,
                        model_engine = %s,
                        status = %s,
                        message = %s,
                        last_trained_at = NOW(),
                        last_requested_at = NOW(),
                        training_duration_ms = %s,
                        next_scheduled_run = %s
                    WHERE model_key = %s
                    """,
                    (Json(pl), engine[:30], status, summary, duration_ms, next_scheduled, key),
                )
                cur.execute(
                    """
                    INSERT INTO analytics_model_runs
                        (model_key, model_engine, status, message, started_at, finished_at, duration_ms)
                    VALUES (%s, %s, 'completed', %s, NOW(), NOW(), %s)
                    """,
                    (key, engine[:30], summary, duration_ms),
                )
            conn.commit()
            ok = True
            msg = summary
    except Exception as e:
        conn.rollback()
        log.exception("Analytics refresh failed")
        msg = str(e)
    finally:
        conn.close()
    return ok, msg


def load_cached_sales_forecast(
    cur, requested_days: int, *, allow_stale: bool = False
) -> Optional[Tuple[SalesForecastResponse, str]]:
    cur.execute(
        "SELECT payload, status FROM analytics_model_cache WHERE model_key = 'forecast_30d'"
    )
    row = cur.fetchone()
    if not row or not row.get("payload"):
        return None
    status = row.get("status") or "ready"
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    if status == "stale" or not payload or (not allow_stale and not _cache_fresh(payload)):
        return None
    inner = payload.get("response")
    if not inner:
        return None
    stored_days = int(payload.get("forecast_days") or CACHED_FORECAST_DAYS)
    if requested_days > stored_days:
        return None
    inner = dict(inner)
    inner["cache_generated_at"] = payload.get("generated_at")
    inner["served_from_cache"] = True
    series = inner.get("series") or []
    if requested_days < len(series):
        inner["series"] = series[-requested_days:]
    try:
        resp = SalesForecastResponse.model_validate(inner)
    except Exception:
        return None
    return resp, str(payload.get("generated_at") or "")


def load_cached_stock_prediction(
    cur, *, allow_stale: bool = False
) -> Optional[StockPredictionResponse]:
    cur.execute(
        "SELECT payload, status FROM analytics_model_cache WHERE model_key = 'stock_prediction'"
    )
    row = cur.fetchone()
    if not row or not row.get("payload"):
        return None
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    status = row.get("status") or "ready"
    if status == "stale" or not payload or (not allow_stale and not _cache_fresh(payload)):
        return None
    inner = payload.get("response")
    if not inner:
        return None
    inner = dict(inner)
    inner["cache_generated_at"] = payload.get("generated_at")
    inner["served_from_cache"] = True
    try:
        return StockPredictionResponse.model_validate(inner)
    except Exception:
        return None


def load_overview_extras(cur, *, allow_stale: bool = False) -> Dict[str, Any]:
    cur.execute(
        "SELECT payload FROM analytics_model_cache WHERE model_key = 'overview'"
    )
    row = cur.fetchone()
    if not row or not row.get("payload"):
        return {}
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    if (
        not payload.get("generated_at")
        or (not allow_stale and not _cache_fresh(payload))
    ):
        return {}
    return {
        "forecast_accuracy": payload.get("forecast_accuracy"),
        "sales_forecast_engine": payload.get("sales_forecast_engine"),
        "stock_forecast_engine": payload.get("stock_forecast_engine"),
        "cache_generated_at": payload.get("generated_at"),
    }


def calculate_seconds_until_12am_ph() -> float:
    """
    Calculates the number of seconds from 'now' (UTC) until the next 12:00 AM 
    in Philippines Time (UTC+8).
    """
    from datetime import timedelta
    
    # 12 AM PH is 4 PM UTC of the current or previous day
    # Get current UTC time
    now_utc = datetime.now(timezone.utc)
    
    # Target is today at 16:00 UTC
    target_utc = now_utc.replace(hour=16, minute=0, second=0, microsecond=0)
    
    # If it's already past 4 PM UTC, the next 12 AM PH is tomorrow's 4 PM UTC
    if now_utc >= target_utc:
        target_utc += timedelta(days=1)
        
    return (target_utc - now_utc).total_seconds()


def run_daily_forecast_job() -> None:
    """Runs at 12 AM PH to refresh models and notify administrators."""
    log.info("Running daily 12 AM PH forecasting job...")
    ok, msg = run_refresh_job()
    if ok:
        dispatch_notification(
            type="sales_forecast",
            title="Daily Sales Forecast Updated",
            message="The automated daily sales forecast for Jonbrix has been generated. View the analytics dashboard for details.",
            link="/forecasting",
            target_roles=["administrator", "manager"]
        )
        log.info("Daily forecast notification dispatched.")
    else:
        log.error("Daily forecast refresh failed: %s", msg)


def start_scheduler() -> None:
    if os.getenv("ANALYTICS_DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        log.info("Analytics scheduler disabled (ANALYTICS_DISABLE_SCHEDULER)")
        return

    def interval_loop() -> None:
        """Handles the recurring refresh based on CACHE_TTL/REFRESH_INTERVAL."""
        time.sleep(min(10, REFRESH_INTERVAL_SECONDS))
        while True:
            try:
                ok, msg = run_refresh_job()
                if ok:
                    log.info("Scheduled analytics refresh: %s", msg)
                else:
                    log.warning("Scheduled analytics refresh failed: %s", msg)
            except Exception:
                log.exception("Scheduled analytics refresh error")
            time.sleep(REFRESH_INTERVAL_SECONDS)

    def daily_loop() -> None:
        """Handles the daily 12 AM PH notification job."""
        while True:
            try:
                sleep_seconds = calculate_seconds_until_12am_ph()
                log.info("Daily job sleeping for %.2f hours until 12 AM PH", sleep_seconds / 3600)
                time.sleep(sleep_seconds)
                run_daily_forecast_job()
                # Sleep a bit to avoid double trigger in case of clock drift
                time.sleep(60)
            except Exception:
                log.exception("Daily forecast job error")
                time.sleep(300)

    t1 = threading.Thread(target=interval_loop, daemon=True, name="analytics-interval-scheduler")
    t1.start()
    
    t2 = threading.Thread(target=daily_loop, daemon=True, name="analytics-daily-scheduler")
    t2.start()
    
    log.info(
        "Analytics schedulers started (interval=%ss, daily=12:00 AM PH)",
        REFRESH_INTERVAL_SECONDS
    )
