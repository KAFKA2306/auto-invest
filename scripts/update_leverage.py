#!/usr/bin/env python3
from pathlib import Path
import yfinance as yf
import numpy as np
import sys

sys.path.insert(0, str(Path(__file__).parent))
from lib.config import load_config
from lib.math import compute_leverage_metrics
from lib.data import save_json


def main():
    cfg = load_config()
    symbol = cfg["data"]["symbols"]["proxy"]
    benchmark = cfg["data"]["symbols"]["benchmark"]

    qqq = yf.Ticker(symbol).history(period="10y")["Close"]
    spy = yf.Ticker(benchmark).history(period="10y")["Close"]

    common_dates = qqq.index.intersection(spy.index)
    prices = qqq.loc[common_dates].values
    spy_prices = spy.loc[common_dates].values
    dates = [d.strftime("%Y-%m-%d") for d in common_dates]

    rf_daily = np.full(len(prices), 0.045 / cfg["constants"]["trading_days_per_year"])

    metrics = compute_leverage_metrics(prices, spy_prices, rf_daily, dates, cfg)

    save_json(Path("public/data/metrics.json"), metrics)
    print(f"Updated metrics.json (as_of={metrics['leverage']['as_of']})")


if __name__ == "__main__":
    main()
