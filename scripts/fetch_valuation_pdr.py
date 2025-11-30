from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from pandas_datareader import data as pdr

DATA_DIR = Path("public/data")
PROCESSED_DIR = Path("data/processed")
ROLLING_WINDOW = 20
PE_CLIP = (2.0, 60.0)
EY_CLIP = (0.005, 0.12)
ERP_BASE = 0.01
ERP_MOMENTUM_WEIGHT = 0.2
ANCHOR_WEIGHT = 0.15
ANCHOR_WINDOW = 30
REF_PE = 32.5
CALIB_WINDOW = 20
EPS_PATH = DATA_DIR / "ndx_eps_quarterly.csv"
NDX_PRICE_PATH = DATA_DIR / "price_NDX.csv"
PRICE_START = "2005-01-01"


def load_eps_actual() -> pd.DataFrame:
    df = pd.read_csv(EPS_PATH)
    df.columns = [c.lower() for c in df.columns]
    if "date" not in df or "value" not in df:
        raise ValueError("EPS CSV must have date,value columns")
    df["date"] = pd.to_datetime(df["date"])
    df = df.dropna(subset=["date", "value"])
    return df.sort_values("date").reset_index(drop=True)


def fetch_risk_free() -> pd.DataFrame:
    df = pdr.DataReader("DGS3MO", "fred")
    df = df.rename(columns={"DGS3MO": "rf_annual"})
    df["rf_annual"] = df["rf_annual"].interpolate(limit_direction="both") / 100.0
    df.index.name = "date"
    return df[["rf_annual"]]


def fetch_growth() -> pd.DataFrame:
    gdp = pdr.DataReader("GDPC1", "fred")
    gdp = gdp.rename(columns={"GDPC1": "gdp_real"})
    gdp["gdp_growth_yoy"] = gdp["gdp_real"].pct_change(4)
    growth = gdp[["gdp_growth_yoy"]].dropna()

    # Create a daily date range and linearly interpolate quarterly values
    full_daily_range = pd.date_range(start=growth.index.min(), end=growth.index.max(), freq='D')
    growth_daily = growth.reindex(full_daily_range).interpolate(method='linear')
    growth_daily.index.name = "date"
    return growth_daily


def fetch_index_price() -> pd.DataFrame:
    ndx = pdr.DataReader("^NDX", "stooq", start=PRICE_START)
    ndx = ndx.rename(columns={"Close": "price_index"})[["price_index"]]
    ndx.index.name = "date"
    ndx = ndx.sort_index()

    qqq = pdr.DataReader("QQQ", "stooq", start=PRICE_START)
    qqq = qqq.rename(columns={"Close": "price_close"})[["price_close"]]
    qqq.index.name = "date"
    qqq = qqq.sort_index()

    common = ndx.index.intersection(qqq.index)
    scale = (ndx.loc[common[-1], "price_index"] / qqq.loc[common[-1], "price_close"]) if len(common) else 1.0
    proxy = qqq.copy()
    proxy["price_index"] = proxy["price_close"] * scale

    combined = ndx.combine_first(proxy[["price_index"]])
    combined = combined.dropna().sort_index()
    return combined


def persist_price_ndx(ndx: pd.DataFrame) -> None:
    ndx_reset = ndx.reset_index().rename(columns={"price_index": "close"})
    NDX_PRICE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ndx_reset.to_csv(NDX_PRICE_PATH, index=False, date_format="%Y-%m-%d")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def build_series() -> pd.DataFrame:
    ndx = fetch_index_price()
    persist_price_ndx(ndx)
    rf = fetch_risk_free()
    growth = fetch_growth()
    eps_actual = load_eps_actual()

    df = ndx.join(rf, how="left")
    df["rf_annual"] = df["rf_annual"].ffill().bfill()
    df["g_long"] = df.join(growth, how="left")["gdp_growth_yoy"].interpolate(method='linear').bfill().ffill()

    log_ret = np.log(df["price_index"] / df["price_index"].shift(1))
    df["mu"] = log_ret.rolling(ROLLING_WINDOW).mean() * 252.0
    df["sigma"] = log_ret.rolling(ROLLING_WINDOW).std() * np.sqrt(252.0)
    df["mu_excess"] = df["mu"] - df["rf_annual"]

    erp_momentum = df["mu_excess"].clip(lower=0, upper=0.10) * ERP_MOMENTUM_WEIGHT
    expected_return = df["rf_annual"] + ERP_BASE + erp_momentum
    growth_term = df["g_long"].clip(lower=-0.02, upper=0.05)
    model_yield = (expected_return - growth_term).clip(EY_CLIP[0], EY_CLIP[1])

    # Use the same minimum periods as the rolling window to avoid pandas validation errors
    median_window = model_yield.rolling(CALIB_WINDOW, min_periods=CALIB_WINDOW).median()
    median_window_last = median_window.iloc[-1]
    if pd.isna(median_window_last) or median_window_last == 0:
        bias = 1.0
    else:
        bias = (1.0 / REF_PE) / median_window_last
    model_yield = (model_yield * bias).clip(EY_CLIP[0], EY_CLIP[1])
    rolling_anchor = model_yield.rolling(ANCHOR_WINDOW, min_periods=30).median()
    expanding_anchor = model_yield.expanding(min_periods=30).median()
    anchor_series = rolling_anchor.combine_first(expanding_anchor).combine_first(model_yield)
    df["earnings_yield_proxy"] = (
        ANCHOR_WEIGHT * anchor_series + (1 - ANCHOR_WEIGHT) * model_yield
    ).clip(EY_CLIP[0], EY_CLIP[1])

    # Create daily forward_eps by interpolating actual EPS
    eps_actual_daily = eps_actual.set_index('date')['value'].reindex(df.index).interpolate(method='linear').bfill().ffill()
    df["forward_eps"] = eps_actual_daily

    # Calculate forward_pe from price and the newly interpolated forward_eps
    df["forward_pe"] = (df["price_index"] / df["forward_eps"]).clip(PE_CLIP[0], PE_CLIP[1])
    
    # earnings_yield_proxy is still used for earnings_yield_spread
    # The following code block is no longer needed for forward_pe/forward_eps calculation,
    # but model_yield and earnings_yield_proxy are still needed for earnings_yield_spread.
    # Therefore, we keep model_yield and earnings_yield_proxy and remove the rest.

    df["earnings_yield_spread"] = df["earnings_yield_proxy"] - df["rf_annual"]
    df["implied_forward_pe_from_price"] = df["forward_pe"]

    eps_growth = eps_actual.copy()
    eps_growth["yoy_eps_growth"] = eps_growth["value"].pct_change(4)
    # Reindex eps_growth to daily frequency and linearly interpolate
    eps_growth_daily_raw = eps_growth.set_index('date')['yoy_eps_growth'].reindex(df.index)
    df["yoy_eps_growth"] = eps_growth_daily_raw.interpolate(method='linear').bfill().ffill()

    df = df.dropna(subset=["forward_pe", "forward_eps"])
    df = df.reset_index()
    return df


def build_payload(df: pd.DataFrame) -> Dict:
    df_sorted = df.sort_values("date")
    latest = df_sorted.iloc[-1]

    series: List[Dict] = []
    for _, row in df_sorted.iterrows():
        series.append(
            {
                "date": row["date"].date().isoformat(),
                "forward_pe": float(round(row["forward_pe"], 4)),
                "forward_eps": float(round(row["forward_eps"], 4)),
                "earnings_yield": float(round(row["earnings_yield_proxy"], 6)),
                "earnings_yield_spread": float(round(row["earnings_yield_spread"], 6)),
                "implied_forward_pe_from_price": float(round(row["forward_pe"], 4)),
                "price_index": float(round(row["price_index"], 4)),
            }
        )

    payload = {
        "as_of": latest["date"].date().isoformat(),
        "source": "pandas_datareader_model",
        "latest": {
            "forward_pe": float(round(latest["forward_pe"], 4)),
            "forward_eps": float(round(latest["forward_eps"], 4)),
            "earnings_yield": float(round(latest["earnings_yield_proxy"], 6)),
            "earnings_yield_spread": float(round(latest["earnings_yield_spread"], 6)),
            "yoy_eps_growth": float(round(latest["yoy_eps_growth"], 6)),
            "implied_forward_pe_from_price": float(round(latest["forward_pe"], 4)),
        },
        "series": series,
        "metadata": {
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "notes": "Forward P/E/EPS proxy (NDX price from Yahoo, FRED rates/GDP) calibrated to quarterly NDX EPS.",
            "rolling_window_days": ROLLING_WINDOW,
            "pe_clip": PE_CLIP,
            "ref_pe": REF_PE,
        },
    }
    return payload


def persist(df: pd.DataFrame, payload: Dict) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    PROCESSED_DIR.joinpath("valuation_pdr.csv").write_text(df.to_csv(index=False))
    DATA_DIR.joinpath("valuation.json").write_text(json.dumps(payload, indent=2))


def main() -> None:
    df = build_series()
    payload = build_payload(df)
    persist(df, payload)
    print(f"Saved valuation.json (source=pandas_datareader_model, as_of={payload['as_of']}, rows={len(df)})")


if __name__ == "__main__":
    main()
