"""Prophet daily revenue fit; returns None if dependencies or history are insufficient."""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import List, Optional, Tuple

import numpy as np

log = logging.getLogger("invensight.prophet_ts")

MIN_DAYS_FOR_PROPHET = 8


def run_prophet_daily_forecast(
    start: date,
    days: int,
    actuals: List[float],
) -> Optional[Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, float, float, str]]:
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError as e:
        log.warning("Prophet not available: %s", e)
        return None

    if days < MIN_DAYS_FOR_PROPHET or len(actuals) != days:
        return None

    ds_list = [start + timedelta(days=i) for i in range(days)]
    df = pd.DataFrame({"ds": pd.to_datetime(ds_list), "y": actuals})

    use_weekly = days >= 14
    try:
        m = Prophet(
            daily_seasonality=False,
            weekly_seasonality=use_weekly,
            yearly_seasonality=False,
            seasonality_mode="additive",
            interval_width=0.8,
        )
        m.fit(df)
        fc_in = m.predict(df)
    except Exception as e:
        log.warning("Prophet fit failed: %s", e)
        return None

    yhat = fc_in["yhat"].to_numpy(dtype=float)
    yhat_lower = fc_in["yhat_lower"].to_numpy(dtype=float)
    yhat_upper = fc_in["yhat_upper"].to_numpy(dtype=float)
    trend = fc_in["trend"].to_numpy(dtype=float)
    weekly = fc_in["weekly"].to_numpy(dtype=float) if "weekly" in fc_in.columns else np.zeros(days)

    y = np.array(actuals, dtype=float)
    mask = y > 1e-6
    if mask.sum() >= 3:
        mape = float(np.mean(np.abs((y[mask] - yhat[mask]) / y[mask])) * 100.0)
        accuracy = max(0.0, min(100.0, 100.0 - mape))
    else:
        accuracy = float("nan")

    mid = days // 2
    m1 = float(np.mean(yhat[:mid])) if mid > 0 else float(np.mean(yhat))
    m2 = float(np.mean(yhat[mid:])) if mid < days else m1
    if m2 > m1 * 1.05:
        direction = "up"
    elif m2 < m1 * 0.95:
        direction = "down"
    else:
        direction = "flat"

    try:
        future = m.make_future_dataframe(periods=30, include_history=False)
        fc_out = m.predict(future)
        next_30d_sum = float(fc_out["yhat"].sum())
    except Exception as e:
        log.warning("Prophet future predict failed: %s", e)
        next_30d_sum = float(np.sum(yhat[-7:])) if len(yhat) >= 7 else float(np.sum(yhat))

    return yhat, yhat_lower, yhat_upper, trend, weekly, next_30d_sum, accuracy, direction
