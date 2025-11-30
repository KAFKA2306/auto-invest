import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from backend.data_sources import (
    TRADING_DAYS_PER_YEAR,
    fetch_price_series,
    fetch_risk_free_annual,
    persist_series,
)
from backend.services.leverage import compute_leverage

DATA_DIR = Path("public/data")
SYMBOL = "QQQ"
BENCHMARK = "SPY"
WINDOW_TRADING_DAYS = 756
SUMMARY_WINDOW_DAYS = 126
BORROW_SPREAD_ANNUAL = 0.01
FUND_FEE_ANNUAL = 0.0
CAP = 2.0
FRACTION = 0.5


def summarize(prices, rf_daily) -> dict:
    returns = prices.pct_change().dropna()
    if returns.empty:
        return {
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
        }

    rf_aligned = rf_daily.reindex(returns.index).ffill()
    excess = returns - rf_aligned

    sharpe_ratio = (
        excess.mean() / excess.std() * np.sqrt(TRADING_DAYS_PER_YEAR)
        if excess.std() > 0
        else 0.0
    )

    cumulative = (1 + returns).cumprod()
    drawdown = cumulative / cumulative.cummax() - 1
    max_drawdown = drawdown.min() if not drawdown.empty else 0.0

    win_rate = float((returns > 0).mean()) if len(returns) else 0.0
    gains = returns[returns > 0].sum()
    losses = -returns[returns < 0].sum()
    profit_factor = float(gains / losses) if losses > 0 else 0.0

    return {
        "sharpe_ratio": float(sharpe_ratio),
        "max_drawdown": float(max_drawdown),
        "win_rate": float(win_rate),
        "profit_factor": float(profit_factor),
    }


def build_payload() -> dict:
    prices = fetch_price_series(SYMBOL)
    spx_prices = fetch_price_series(BENCHMARK)
    rf_annual = fetch_risk_free_annual()

    persist_series(prices, DATA_DIR / f"price_{SYMBOL}.csv", "close")
    persist_series(spx_prices, DATA_DIR / f"price_{BENCHMARK}.csv", "close")
    persist_series(rf_annual, DATA_DIR / "ffrate.csv", "ffrate_annual")

    rf_daily = rf_annual / TRADING_DAYS_PER_YEAR

    common_index = prices.index.intersection(spx_prices.index).intersection(rf_daily.index)
    if common_index.empty:
        raise ValueError("No overlapping dates between price, benchmark, and rate series")

    prices = prices.reindex(common_index)
    spx_prices = spx_prices.reindex(common_index)
    rf_daily = rf_daily.reindex(common_index)

    risk_free_rate_annual = float(rf_daily.iloc[-1] * TRADING_DAYS_PER_YEAR)

    leverage = compute_leverage(
        prices=prices,
        ffrate_daily=rf_daily,
        window_trading_days=WINDOW_TRADING_DAYS,
        risk_free_rate_annual=risk_free_rate_annual,
        borrow_spread_annual=BORROW_SPREAD_ANNUAL,
        fund_fee_annual=FUND_FEE_ANNUAL,
        cap=CAP,
        fraction=FRACTION,
        spx_prices=spx_prices,
    )

    recent_prices = prices.tail(SUMMARY_WINDOW_DAYS)
    recent_rf = rf_daily.reindex(recent_prices.index)
    summary = summarize(recent_prices, recent_rf)

    generated_at = (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    )

    # Flatten summary fields to keep compatibility with frontend expectations
    return {
        "generated_at": generated_at,
        "last_updated": generated_at,
        **summary,
        "leverage": leverage,
    }


def main() -> None:
    payload = build_payload()
    metrics_path = DATA_DIR / "metrics.json"
    metrics_path.write_text(json.dumps(payload, indent=2))
    print(f"Updated metrics.json (as_of={payload['leverage']['as_of']})")


if __name__ == "__main__":
    main()
