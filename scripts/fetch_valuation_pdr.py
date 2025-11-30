import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from pandas_datareader import data as pdr

from backend.data_sources import (
    TRADING_DAYS_PER_YEAR,
    fetch_price_series,
    fetch_risk_free_annual,
    persist_series,
    reindex_business_days,
)

DATA_DIR = Path("public/data")
PROCESSED_DIR = Path("data/processed")
EPS_PATH = DATA_DIR / "ndx_eps_quarterly.csv"
PRICE_OUTPUT_PATH = DATA_DIR / "price_NDX.csv"

ROLLING_WINDOW = 20
PE_CLIP = (2.0, 60.0)
EY_CLIP = (0.005, 0.12)
ERP_BASE = 0.01
ERP_MOMENTUM_WEIGHT = 0.2
ANCHOR_WEIGHT = 0.15
ANCHOR_WINDOW = 30
REF_PE = 32.5
CALIB_WINDOW = 20


def fetch_growth_daily() -> pd.Series:
    gdp = pdr.DataReader("GDPC1", "fred").rename(columns={"GDPC1": "gdp_real"})
    growth = gdp["gdp_real"].pct_change(4).dropna()
    growth.name = "gdp_growth_yoy"
    return reindex_business_days(growth)


def load_eps_quarterly() -> pd.Series:
    df = pd.read_csv(EPS_PATH, parse_dates=["date"])
    series = df.set_index("date")["value"].astype(float).sort_index()
    series = series[series > 0]
    return series


def build_eps_series(index: pd.DatetimeIndex) -> Tuple[pd.Series, pd.Series]:
    eps_quarterly = load_eps_quarterly()
    eps_daily = eps_quarterly.reindex(index).interpolate().bfill().ffill().rename("forward_eps")

    eps_growth_q = eps_quarterly.pct_change(4)
    eps_growth_daily = eps_growth_q.reindex(index).interpolate().bfill().ffill().rename("yoy_eps_growth")
    return eps_daily, eps_growth_daily


def fetch_index_price() -> pd.Series:
    ndx = fetch_price_series("^NDX")
    qqq = fetch_price_series("QQQ")

    common = ndx.index.intersection(qqq.index)
    if common.empty:
        raise ValueError("No overlapping dates between NDX and QQQ")

    ndx_last = ndx.loc[common[-1]]
    qqq_last = qqq.loc[common[-1]]

    if isinstance(ndx_last, pd.Series):
        ndx_last = ndx_last.iloc[-1]
    if isinstance(qqq_last, pd.Series):
        qqq_last = qqq_last.iloc[-1]

    scale = float(ndx_last) / float(qqq_last)
    proxy = (qqq * scale).copy()
    proxy.name = "price_index"

    ndx_idx = ndx.copy()
    ndx_idx.name = "price_index"

    combined = ndx_idx.combine_first(proxy)
    combined = combined.reindex(combined.index.union(proxy.index)).sort_index()
    combined = reindex_business_days(combined)
    persist_series(combined, PRICE_OUTPUT_PATH, "close")
    return combined


def build_series() -> pd.DataFrame:
    price_index = fetch_index_price()
    rf_annual = fetch_risk_free_annual()
    growth = fetch_growth_daily()

    common_index = price_index.index.intersection(rf_annual.index)
    if common_index.empty:
        raise ValueError("No overlapping dates between price and risk-free series")

    price_index = price_index.reindex(common_index)
    rf_annual = rf_annual.reindex(common_index).ffill()
    growth = growth.reindex(common_index).ffill().bfill()

    forward_eps, yoy_eps_growth = build_eps_series(common_index)

    log_ret = np.log(price_index / price_index.shift(1))
    mu = log_ret.rolling(ROLLING_WINDOW, min_periods=ROLLING_WINDOW).mean() * TRADING_DAYS_PER_YEAR
    sigma = log_ret.rolling(ROLLING_WINDOW, min_periods=ROLLING_WINDOW).std() * np.sqrt(TRADING_DAYS_PER_YEAR)
    mu_excess = mu - rf_annual

    erp_momentum = mu_excess.clip(lower=0, upper=0.10) * ERP_MOMENTUM_WEIGHT
    expected_return = rf_annual + ERP_BASE + erp_momentum
    growth_term = growth.clip(lower=-0.02, upper=0.05)
    model_yield = (expected_return - growth_term).clip(EY_CLIP[0], EY_CLIP[1])

    median_window = model_yield.rolling(CALIB_WINDOW, min_periods=CALIB_WINDOW).median()
    bias = (1.0 / REF_PE) / median_window.iloc[-1] if pd.notna(median_window.iloc[-1]) and median_window.iloc[-1] != 0 else 1.0
    model_yield = (model_yield * bias).clip(EY_CLIP[0], EY_CLIP[1])

    rolling_anchor = model_yield.rolling(ANCHOR_WINDOW, min_periods=30).median()
    expanding_anchor = model_yield.expanding(min_periods=30).median()
    anchor_series = rolling_anchor.combine_first(expanding_anchor).combine_first(model_yield)

    earnings_yield = (
        ANCHOR_WEIGHT * anchor_series + (1 - ANCHOR_WEIGHT) * model_yield
    ).clip(EY_CLIP[0], EY_CLIP[1])

    forward_pe = (price_index / forward_eps).clip(PE_CLIP[0], PE_CLIP[1])

    df = pd.DataFrame(
        {
            "price_index": price_index,
            "rf_annual": rf_annual,
            "gdp_growth_yoy": growth,
            "mu": mu,
            "sigma": sigma,
            "mu_excess": mu_excess,
            "earnings_yield": earnings_yield,
            "earnings_yield_spread": earnings_yield - rf_annual,
            "forward_eps": forward_eps,
            "forward_pe": forward_pe,
            "implied_forward_pe_from_price": forward_pe,
            "yoy_eps_growth": yoy_eps_growth,
        }
    ).dropna(subset=["forward_pe", "forward_eps", "earnings_yield"])

    df.index.name = "date"
    return df


def build_payload(df: pd.DataFrame) -> Dict:
    latest = df.iloc[-1]

    series: List[Dict] = []
    for idx, row in df.iterrows():
        series.append(
            {
                "date": idx.date().isoformat(),
                "forward_pe": float(round(row["forward_pe"], 4)),
                "forward_eps": float(round(row["forward_eps"], 4)),
                "earnings_yield": float(round(row["earnings_yield"], 6)),
                "earnings_yield_spread": float(round(row["earnings_yield_spread"], 6)),
                "implied_forward_pe_from_price": float(round(row["implied_forward_pe_from_price"], 4)),
                "price_index": float(round(row["price_index"], 4)),
            }
        )

    payload = {
        "as_of": latest.name.date().isoformat(),
        "source": "yfinance_fred_model",
        "latest": {
            "forward_pe": float(round(latest["forward_pe"], 4)),
            "forward_eps": float(round(latest["forward_eps"], 4)),
            "earnings_yield": float(round(latest["earnings_yield"], 6)),
            "earnings_yield_spread": float(round(latest["earnings_yield_spread"], 6)),
            "yoy_eps_growth": float(round(latest["yoy_eps_growth"], 6)),
            "implied_forward_pe_from_price": float(round(latest["implied_forward_pe_from_price"], 4)),
        },
        "series": series,
        "metadata": {
            "generated_at": datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "rolling_window_days": ROLLING_WINDOW,
            "pe_clip": PE_CLIP,
            "ref_pe": REF_PE,
        },
    }
    return payload


def persist(df: pd.DataFrame, payload: Dict) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    PROCESSED_DIR.joinpath("valuation_pdr.csv").write_text(df.reset_index().to_csv(index=False))
    DATA_DIR.joinpath("valuation.json").write_text(json.dumps(payload, indent=2))


def main() -> None:
    df = build_series()
    payload = build_payload(df)
    persist(df, payload)
    print(f"Saved valuation.json (as_of={payload['as_of']}, rows={len(df)})")


if __name__ == "__main__":
    main()
