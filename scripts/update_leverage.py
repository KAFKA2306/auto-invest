import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from backend.services.leverage import compute_leverage


DATA_DIR = Path("public/data")


def fetch_price_series(symbol: str) -> pd.Series:
    url = f"https://stooq.pl/q/d/l/?s={symbol.lower()}.us&i=d"
    df = pd.read_csv(url)
    if "Data" not in df or "Zamkniecie" not in df:
        raise ValueError(f"Price data missing for {symbol}")
    df = df.rename(columns={"Data": "date", "Zamkniecie": "close"})
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    return df.set_index("date")["close"]


def fetch_risk_free_annual() -> pd.Series:
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO"
    df = pd.read_csv(url)
    if "observation_date" not in df or "DGS3MO" not in df:
        raise ValueError("Risk-free series missing")
    df = df.rename(columns={"observation_date": "date", "DGS3MO": "rate"})
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    df["rate"] = df["rate"].interpolate().ffill() / 100
    return df.set_index("date")["rate"]


def persist_series(series: pd.Series, path: Path, value_name: str) -> None:
    df = series.rename(value_name).to_frame()
    df.index.name = "date"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.reset_index().to_csv(path, index=False, date_format="%Y-%m-%d")


def summarize(prices: pd.Series, rf_daily: pd.Series) -> dict:
    returns = prices.pct_change().dropna()
    rf_aligned = rf_daily.reindex(returns.index).ffill()
    excess = returns - rf_aligned

    sharpe_ratio = excess.mean() / excess.std() * np.sqrt(252) if excess.std() > 0 else 0.0
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


def main() -> None:
    symbol = "QQQ"
    window_trading_days = 756
    summary_window_trading_days = 126  # ~6 months
    borrow_spread_annual = 0.01
    fund_fee_annual = 0.0
    cap = 2.0
    fraction = 0.5

    prices_raw = fetch_price_series(symbol)
    spx_raw = fetch_price_series("SPY")
    rf_annual = fetch_risk_free_annual()

    risk_free_rate_annual = float(rf_annual.dropna().iloc[-1])

    persist_series(prices_raw, DATA_DIR / f"price_{symbol}.csv", "close")
    persist_series(spx_raw, DATA_DIR / "price_SPY.csv", "close")
    persist_series(rf_annual, DATA_DIR / "ffrate.csv", "ffrate_annual")

    rf_daily = rf_annual / 252

    common_index = prices_raw.index.intersection(rf_daily.index).intersection(spx_raw.index)
    if len(common_index) == 0:
        raise ValueError("No overlapping dates between price and rate series")

    prices = prices_raw.reindex(common_index)
    rf_daily = rf_daily.reindex(common_index)
    spx_prices = spx_raw.reindex(common_index)

    # Use a shorter lookback for dashboard summary statistics
    prices_recent = prices.tail(summary_window_trading_days)
    rf_recent = rf_daily.reindex(prices_recent.index)

    leverage = compute_leverage(
        prices=prices,
        ffrate_daily=rf_daily,
        window_trading_days=window_trading_days,
        risk_free_rate_annual=risk_free_rate_annual,
        borrow_spread_annual=borrow_spread_annual,
        fund_fee_annual=fund_fee_annual,
        cap=cap,
        fraction=fraction,
        spx_prices=spx_prices,
    )

    summary = summarize(prices_recent, rf_recent)
    summary["last_updated"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    summary["leverage"] = leverage

    metrics_path = DATA_DIR / "metrics.json"
    metrics_path.write_text(json.dumps(summary, indent=2))
    print(f"Updated leverage metrics for {summary['last_updated']}")


if __name__ == "__main__":
    main()
