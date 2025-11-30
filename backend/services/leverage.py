import pandas as pd
import numpy as np
from typing import Dict, List


def compute_leverage(
    prices: pd.Series,
    ffrate_daily: pd.Series,
    window_trading_days: int,
    risk_free_rate_annual: float,
    borrow_spread_annual: float,
    fund_fee_annual: float,
    cap: float,
    fraction: float,
    trading_days_per_year: int = 252,
    vol_ewma_lambda: float = 0.94,
    spx_prices: pd.Series = None,
    vol_target_annual: float = 0.2,
    blend_alpha: float = 0.5,
) -> Dict:
    df = pd.DataFrame({"price": prices, "ffrate": ffrate_daily}).dropna()
    df["log_return"] = np.log(df["price"] / df["price"].shift(1))

    if spx_prices is not None:
        df["spx"] = spx_prices
        df["spx_return"] = np.log(df["spx"] / df["spx"].shift(1))

    df = df.dropna()

    mu_daily = df["log_return"].mean()
    sigma_daily = df["log_return"].std()

    mu_annual = mu_daily * trading_days_per_year
    sigma_annual = sigma_daily * np.sqrt(trading_days_per_year)
    variance_annual = sigma_annual**2

    mu_excess_annual = mu_annual - risk_free_rate_annual - fund_fee_annual
    sharpe_ratio_annual = mu_excess_annual / sigma_annual if sigma_annual > 0 else 0.0

    downside_returns = df["log_return"][df["log_return"] < 0]
    downside_deviation_daily = (
        np.sqrt((downside_returns**2).mean()) if len(downside_returns) > 0 else 0.0
    )
    downside_deviation_annual = downside_deviation_daily * np.sqrt(
        trading_days_per_year
    )
    sortino_ratio_annual = (
        mu_excess_annual / downside_deviation_annual
        if downside_deviation_annual > 0
        else 0.0
    )

    cumulative_returns = (1 + df["log_return"]).cumprod()
    peak = cumulative_returns.cummax()
    drawdown = (cumulative_returns - peak) / peak
    max_drawdown = drawdown.min()
    calmar_ratio = mu_annual / abs(max_drawdown) if max_drawdown != 0 else 0.0

    var_95 = df["log_return"].quantile(0.05)
    es_95_daily = df["log_return"][df["log_return"] <= var_95].mean()

    rolling_vol = df["log_return"].rolling(window=21).std() * np.sqrt(
        trading_days_per_year
    )
    vol_of_vol = rolling_vol.std()

    beta_spx = 0.0
    corr_spx = 0.0
    if "spx_return" in df.columns:
        cov_matrix = np.cov(df["log_return"], df["spx_return"])
        beta_spx = cov_matrix[0, 1] / cov_matrix[1, 1] if cov_matrix[1, 1] > 0 else 0.0
        corr_spx = df["log_return"].corr(df["spx_return"])

    kelly_leverage = mu_excess_annual / variance_annual if variance_annual > 0 else 0.0
    fractional_kelly = min(cap, fraction * kelly_leverage)

    l_vol = vol_target_annual / sigma_annual if sigma_annual > 0 else 0.0
    l_blend = min(cap, blend_alpha * kelly_leverage + (1 - blend_alpha) * l_vol)

    series_data: List[Dict] = []
    ewma_var = 0.0

    for i in range(len(df)):
        row = df.iloc[i]
        ret = row["log_return"]

        ewma_var = (
            vol_ewma_lambda * ewma_var + (1 - vol_ewma_lambda) * ret**2
            if i > 0
            else ret**2
        )
        ewma_vol_annual = np.sqrt(ewma_var * trading_days_per_year)

        window_start = max(0, i - window_trading_days + 1)
        window_slice = df.iloc[window_start : i + 1]

        realized_vol_annual = (
            window_slice["log_return"].std() * np.sqrt(trading_days_per_year)
            if len(window_slice) > 1
            else 0.0
        )
        volatility_score = 0.5 * realized_vol_annual + 0.5 * ewma_vol_annual

        window_mu_daily = window_slice["log_return"].mean()
        window_sigma_daily = window_slice["log_return"].std()
        window_variance_annual = (
            window_sigma_daily * np.sqrt(trading_days_per_year)
        ) ** 2

        window_mu_excess_annual = (
            (window_mu_daily * trading_days_per_year)
            - risk_free_rate_annual
            - fund_fee_annual
        )
        window_kelly = (
            window_mu_excess_annual / window_variance_annual
            if window_variance_annual > 0
            else 0.0
        )

        window_l_vol = (
            vol_target_annual / volatility_score if volatility_score > 0 else 0.0
        )
        window_l_blend = min(
            cap, blend_alpha * window_kelly + (1 - blend_alpha) * window_l_vol
        )

        window_cumulative = (1 + window_slice["log_return"]).cumprod()
        window_peak = window_cumulative.cummax()
        window_dd = ((window_cumulative - window_peak) / window_peak).iloc[-1]

        series_item = {
            "date": row.name.strftime("%Y-%m-%d"),
            "price_close": float(row["price"]),
            "ffrate_daily": float(row["ffrate"]),
            "realized_vol_annual": float(realized_vol_annual),
            "ewma_vol_annual": float(ewma_vol_annual),
            "volatility_score": float(volatility_score),
            "mu_excess_annual": float(window_mu_excess_annual),
            "kelly_leverage": float(window_kelly),
            "fractional_kelly": float(min(cap, fraction * window_kelly)),
            "L_kelly": float(window_kelly),
            "L_vol": float(window_l_vol),
            "L_blend": float(window_l_blend),
            "max_drawdown": float(window_dd),
        }

        if "spx_return" in window_slice.columns and len(window_slice) > 1:
            w_cov = np.cov(window_slice["log_return"], window_slice["spx_return"])
            w_beta = w_cov[0, 1] / w_cov[1, 1] if w_cov[1, 1] > 0 else 0.0
            w_corr = window_slice["log_return"].corr(window_slice["spx_return"])
            series_item["beta_spx"] = float(w_beta)
            series_item["corr_spx"] = float(w_corr)
        else:
            series_item["beta_spx"] = 0.0
            series_item["corr_spx"] = 0.0

        series_data.append(series_item)

    return {
        "as_of": df.index[-1].strftime("%Y-%m-%d"),
        "symbol": "QQQ",
        "window_trading_days": window_trading_days,
        "trading_days_per_year": trading_days_per_year,
        "risk_free_rate_annual": risk_free_rate_annual,
        "borrow_spread_annual": borrow_spread_annual,
        "fund_fee_annual": fund_fee_annual,
        "mu_excess_annual": float(mu_excess_annual),
        "volatility_annual": float(sigma_annual),
        "sharpe_ratio_annual": float(sharpe_ratio_annual),
        "kelly_leverage": float(kelly_leverage),
        "fractional_kelly": float(fractional_kelly),
        "cap": cap,
        "suggested": {
            "alpha": blend_alpha,
            "vol_target_annual": vol_target_annual,
            "cap": cap,
            "L_kelly": float(kelly_leverage),
            "L_vol": float(l_vol),
            "L_blend": float(l_blend),
        },
        "risk": {
            "downside_deviation_annual": float(downside_deviation_annual),
            "sortino_ratio_annual": float(sortino_ratio_annual),
            "max_drawdown": float(max_drawdown),
            "calmar_ratio": float(calmar_ratio),
            "es_95": float(es_95_daily),
            "vol_of_vol": float(vol_of_vol),
            "beta_spx": float(beta_spx),
            "corr_spx": float(corr_spx),
        },
        "series": series_data,
    }
