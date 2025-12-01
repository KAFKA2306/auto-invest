#!/usr/bin/env python3
from pathlib import Path
import yfinance as yf
import pandas as pd
import numpy as np
import sys

sys.path.insert(0, str(Path(__file__).parent))
from lib.config import load_config
from lib.math import compute_valuation_metrics
from lib.data import save_json


def main():
    cfg = load_config()
    symbol = cfg["data"]["symbols"]["index"]
    eps_path = Path(cfg["data"]["paths"]["eps"])

    # Load Prices
    ndx = yf.Ticker(symbol).history(period="15y")["Close"]
    ndx.index = pd.to_datetime(ndx.index).tz_localize(None)

    # Load EPS
    eps_df = pd.read_csv(eps_path)
    eps_df["date"] = pd.to_datetime(eps_df["date"])
    eps_df = eps_df.set_index("date").sort_index()

    # Merge and Interpolate
    # Reindex EPS to daily price dates, then interpolate
    combined = pd.DataFrame(index=ndx.index)
    combined["price"] = ndx
    combined["eps"] = (
        eps_df["EPSofNDX"].reindex(combined.index).interpolate(method="linear")
    )

    # Fill edges if necessary (though data covers range)
    combined["eps"] = combined["eps"].ffill().bfill()

    dates = [d.strftime("%Y-%m-%d") for d in combined.index]
    prices = combined["price"].values
    forward_eps = combined["eps"].values

    # Constants
    rf_annual = np.full(len(prices), 0.045)
    gdp_growth = np.full(len(prices), 0.025)
    yoy_growth = np.full(len(prices), 0.10)  # Simplified growth rate

    valuation = compute_valuation_metrics(
        dates, prices, rf_annual, gdp_growth, forward_eps, yoy_growth, cfg
    )

    save_json(Path("public/data/valuation.json"), valuation)
    print(f"Updated valuation.json (as_of={valuation['as_of']})")


if __name__ == "__main__":
    main()
