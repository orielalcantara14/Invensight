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
) -> Optional[Tuple]:
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
    use_yearly = days >= 366
    
    try:
        # Prophet handles automatic changepoint detection by default
        m = Prophet(
            daily_seasonality=False,
            weekly_seasonality=use_weekly,
            yearly_seasonality=use_yearly,
            seasonality_mode="additive",
            interval_width=0.8,
        )
        m.add_country_holidays(country_name="PH")
        m.fit(df)
        fc_in = m.predict(df)
    except Exception as e:
        log.warning("Prophet fit failed: %s", e)
        return None

    # Extraction of components
    yhat = fc_in["yhat"].to_numpy(dtype=float)
    yhat_lower = fc_in["yhat_lower"].to_numpy(dtype=float)
    yhat_upper = fc_in["yhat_upper"].to_numpy(dtype=float)
    trend = fc_in["trend"].to_numpy(dtype=float)
    
    # Seasonality components
    weekly = fc_in["weekly"].to_numpy(dtype=float) if "weekly" in fc_in.columns else np.zeros(days)
    yearly = fc_in["yearly"].to_numpy(dtype=float) if "yearly" in fc_in.columns else np.zeros(days)
    
    # Total Seasonal = s(t)
    seasonal = fc_in["multiplicative_terms" if m.seasonality_mode == 'multiplicative' else "additive_terms"].to_numpy(dtype=float) \
               - (fc_in["holidays"].to_numpy(dtype=float) if "holidays" in fc_in.columns else 0.0)
    
    holidays = fc_in["holidays"].to_numpy(dtype=float) if "holidays" in fc_in.columns else np.zeros(days)

    y = np.array(actuals, dtype=float)
    mask = (y > 1e-6) | (yhat > 0.1)
    if mask.sum() >= 3:
        smape = float(np.mean(2 * np.abs(y[mask] - yhat[mask]) / (np.abs(y[mask]) + np.abs(yhat[mask]))) * 100.0)
        accuracy = max(0.0, min(100.0, 100.0 - (smape * 0.5)))
    else:
        accuracy = float("nan")

    try:
        future = m.make_future_dataframe(periods=30, include_history=False)
        fc_out = m.predict(future)
        next_30d_sum = float(fc_out["yhat"].sum())
        fyhat = fc_out["yhat"].to_numpy(dtype=float)
        flo = fc_out["yhat_lower"].to_numpy(dtype=float)
        fhi = fc_out["yhat_upper"].to_numpy(dtype=float)
        ftrend = fc_out["trend"].to_numpy(dtype=float)
        fweekly = fc_out["weekly"].to_numpy(dtype=float) if "weekly" in fc_out.columns else np.zeros(len(fyhat))
        fyearly = fc_out["yearly"].to_numpy(dtype=float) if "yearly" in fc_out.columns else np.zeros(len(fyhat))
        fholidays = fc_out["holidays"].to_numpy(dtype=float) if "holidays" in fc_out.columns else np.zeros(len(fyhat))
        fseasonal = fc_out["multiplicative_terms" if m.seasonality_mode == 'multiplicative' else "additive_terms"].to_numpy(dtype=float) \
                    - (fc_out["holidays"].to_numpy(dtype=float) if "holidays" in fc_out.columns else 0.0)
        
        f_mid = 15
        f1 = float(np.mean(fc_out["yhat"][:f_mid]))
        f2 = float(np.mean(fc_out["yhat"][f_mid:]))
        direction = "up" if f2 > f1 * 1.03 else ("down" if f2 < f1 * 0.97 else "flat")
    except Exception as e:
        direction = "flat"
        fyhat = flo = fhi = ftrend = fweekly = fyearly = fholidays = fseasonal = np.zeros(0)
        next_30d_sum = 0.0

    return (
        yhat, yhat_lower, yhat_upper, 
        trend, weekly, yearly, seasonal, holidays, 
        next_30d_sum, accuracy, direction, 
        fyhat, flo, fhi, ftrend, fweekly, fyearly, fseasonal, fholidays
    )
