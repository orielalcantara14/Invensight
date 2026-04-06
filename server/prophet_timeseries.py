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
    mask = (y > 1e-6) | (yhat > 0.1)
    if mask.sum() >= 3:
        # Use sMAPE for better numerical stability with near-zero data
        smape = float(np.mean(2 * np.abs(y[mask] - yhat[mask]) / (np.abs(y[mask]) + np.abs(yhat[mask]))) * 100.0)
        accuracy = max(0.0, min(100.0, 100.0 - (smape * 0.5))) # Scaled for better interpretability
    else:
        accuracy = float("nan")

    try:
        future = m.make_future_dataframe(periods=30, include_history=False)
        fc_out = m.predict(future)
        next_30d_sum = float(fc_out["yhat"].sum())
        
        # Calculate Trend based on FUTURE forecast slope
        f_mid = 15
        f1 = float(np.mean(fc_out["yhat"][:f_mid]))
        f2 = float(np.mean(fc_out["yhat"][f_mid:]))
        if f2 > f1 * 1.03:
            direction = "up"
        elif f2 < f1 * 0.97:
            direction = "down"
        else:
            direction = "flat"
    except Exception as e:
        log.warning("Prophet future predict failed: %s", e)
        next_30d_sum = float(np.sum(yhat[-7:])) if len(yhat) >= 7 else float(np.sum(yhat))
        direction = "flat"

    return yhat, yhat_lower, yhat_upper, trend, weekly, next_30d_sum, accuracy, direction
