import numpy as np
from datetime import datetime


def compute_leverage_metrics(
    prices: np.ndarray,
    spy_prices: np.ndarray,
    rf_daily: np.ndarray,
    dates: list[str],
    cfg: dict,
) -> dict:
    returns = np.diff(np.log(prices))
    spy_returns = np.diff(np.log(spy_prices))

    window = cfg["leverage"]["window_trading_days"]
    summary_window = cfg["leverage"]["summary_window_days"]
    tdays = cfg["constants"]["trading_days_per_year"]

    mu = np.mean(returns) * tdays
    sigma = np.std(returns, ddof=1) * np.sqrt(tdays)
    rf_annual = cfg["leverage"].get("risk_free_rate_annual", 0.045)
    mu_excess = mu - rf_annual - cfg["leverage"]["fund_fee_annual"]

    sharpe = mu_excess / sigma if sigma > 0 else 0

    downside = returns[returns < 0]
    downside_dev = (
        np.sqrt(np.mean(downside**2)) * np.sqrt(tdays) if len(downside) > 0 else 0
    )
    sortino = mu_excess / downside_dev if downside_dev > 0 else 0

    cum_returns = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(cum_returns)
    drawdowns = (cum_returns - peak) / peak
    max_dd = np.min(drawdowns)
    calmar = mu / abs(max_dd) if max_dd != 0 else 0

    var95 = np.percentile(returns, 5)
    es95 = np.mean(returns[returns <= var95])

    cov = np.cov(returns, spy_returns)[0, 1]
    var_spy = np.var(spy_returns, ddof=1)
    beta = cov / var_spy if var_spy > 0 else 0
    corr = np.corrcoef(returns, spy_returns)[0, 1]

    kelly = mu_excess / (sigma**2) if sigma > 0 else 0
    fractional_kelly = min(cfg["leverage"]["cap"], cfg["leverage"]["fraction"] * kelly)

    vol_target = cfg["leverage"]["vol_target_annual"]
    L_vol = vol_target / sigma if sigma > 0 else 0
    L_blend = min(
        cfg["leverage"]["cap"],
        cfg["leverage"]["blend_alpha"] * kelly
        + (1 - cfg["leverage"]["blend_alpha"]) * L_vol,
    )

    recent_returns = returns[-summary_window:]
    wins = recent_returns[recent_returns > 0]
    losses = recent_returns[recent_returns < 0]
    win_rate = len(wins) / len(recent_returns) if len(recent_returns) > 0 else 0
    profit_factor = (
        abs(np.sum(wins)) / abs(np.sum(losses))
        if len(losses) > 0 and np.sum(losses) != 0
        else 0
    )

    recent_mu = np.mean(recent_returns) * tdays
    recent_sigma = np.std(recent_returns, ddof=1) * np.sqrt(tdays)
    recent_sharpe = (recent_mu - rf_annual) / recent_sigma if recent_sigma > 0 else 0

    recent_cum = np.cumprod(1 + recent_returns)
    recent_peak = np.maximum.accumulate(recent_cum)
    recent_dd = np.min((recent_cum - recent_peak) / recent_peak)

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%SZ"),
        "last_updated": datetime.now().isoformat(),
        "sharpe_ratio": recent_sharpe,
        "max_drawdown": recent_dd,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "leverage": {
            "as_of": dates[-1],
            "symbol": cfg["data"]["symbols"]["proxy"],
            "window_trading_days": window,
            "trading_days_per_year": tdays,
            "risk_free_rate_annual": rf_annual,
            "borrow_spread_annual": cfg["leverage"]["borrow_spread_annual"],
            "fund_fee_annual": cfg["leverage"]["fund_fee_annual"],
            "mu_excess_annual": mu_excess,
            "volatility_annual": sigma,
            "sharpe_ratio_annual": sharpe,
            "kelly_leverage": kelly,
            "fractional_kelly": fractional_kelly,
            "cap": cfg["leverage"]["cap"],
            "suggested": {
                "alpha": cfg["leverage"]["blend_alpha"],
                "vol_target_annual": vol_target,
                "cap": cfg["leverage"]["cap"],
                "L_kelly": kelly,
                "L_vol": L_vol,
                "L_blend": L_blend,
            },
            "risk": {
                "downside_deviation_annual": downside_dev,
                "sortino_ratio_annual": sortino,
                "max_drawdown": max_dd,
                "calmar_ratio": calmar,
                "es_95": es95,
                "vol_of_vol": 0.0,
                "beta_spx": beta,
                "corr_spx": corr,
            },
            "series": [],
        },
    }


def compute_valuation_metrics(
    dates: list[str],
    prices: np.ndarray,
    rf_annual: np.ndarray,
    gdp_growth: np.ndarray,
    forward_eps: np.ndarray,
    yoy_growth: np.ndarray,
    cfg: dict,
) -> dict:
    rolling_window = cfg["valuation"]["rolling_window"]

    pe_clip = cfg["valuation"]["pe_clip"]
    ey_clip = cfg["valuation"]["ey_clip"]

    forward_pe = np.clip(prices / forward_eps, pe_clip[0], pe_clip[1])
    earnings_yield = np.clip(1 / forward_pe, ey_clip[0], ey_clip[1])
    earnings_yield_spread = earnings_yield - rf_annual

    return {
        "as_of": dates[-1],
        "source": "python_valuation_model",
        "latest": {
            "forward_pe": float(forward_pe[-1]),
            "forward_eps": float(forward_eps[-1]),
            "earnings_yield": float(earnings_yield[-1]),
            "earnings_yield_spread": float(earnings_yield_spread[-1]),
            "yoy_eps_growth": float(yoy_growth[-1]),
            "implied_forward_pe_from_price": float(forward_pe[-1]),
        },
        "series": [
            {
                "date": dates[i],
                "forward_pe": float(forward_pe[i]),
                "forward_eps": float(forward_eps[i]),
                "earnings_yield": float(earnings_yield[i]),
                "earnings_yield_spread": float(earnings_yield_spread[i]),
                "implied_forward_pe_from_price": float(forward_pe[i]),
                "price_index": float(prices[i]),
            }
            for i in range(len(dates))
        ],
        "metadata": {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%SZ"),
            "rolling_window_days": rolling_window,
            "pe_clip": pe_clip,
            "ref_pe": cfg["valuation"]["ref_pe"],
        },
    }
