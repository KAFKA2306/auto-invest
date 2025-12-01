#!/usr/bin/env python3
from pathlib import Path
import yfinance as yf
import numpy as np
import sys

sys.path.insert(0, str(Path(__file__).parent))
from lib.config import load_config
from lib.math import compute_valuation_metrics
from lib.data import save_json, load_json


def main():
    cfg = load_config()
    symbol = cfg["data"]["symbols"]["index"]

    ndx = yf.Ticker(symbol).history(period="15y")["Close"]
    dates = [d.strftime("%Y-%m-%d") for d in ndx.index]
    prices = ndx.values

    rf_annual = np.full(len(prices), 0.045)
    gdp_growth = np.full(len(prices), 0.025)

    eps_data = load_json(Path("public/data/bottom_up_eps.json"))
    base_eps = eps_data.get("base_period", {}).get("eps", 600)
    forward_eps = np.full(len(prices), base_eps)
    yoy_growth = np.full(len(prices), 0.10)

    valuation = compute_valuation_metrics(
        dates, prices, rf_annual, gdp_growth, forward_eps, yoy_growth, cfg
    )

    save_json(Path("public/data/valuation.json"), valuation)
    print(f"Updated valuation.json (as_of={valuation['as_of']})")


if __name__ == "__main__":
    main()
