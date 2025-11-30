from pathlib import Path
from typing import Optional

import pandas as pd
import yfinance as yf
from pandas_datareader import data as pdr

TRADING_DAYS_PER_YEAR = 252
PRICE_START = "2005-01-01"
RF_START = "1990-01-01"


def _business_day_range(series: pd.Series) -> pd.DatetimeIndex:
    return pd.date_range(series.index.min(), series.index.max(), freq="B")


def reindex_business_days(series: pd.Series) -> pd.Series:
    series = series.dropna()
    series = series[series > 0]
    if series.empty:
        return series
    full_range = _business_day_range(series)
    return series.reindex(full_range).interpolate().bfill().ffill()


def fetch_price_series(symbol: str, start: str = PRICE_START, auto_adjust: bool = True) -> pd.Series:
    df = yf.download(symbol, start=start, progress=False, actions=False, auto_adjust=auto_adjust)
    if df.empty:
        raise ValueError(f"No price data returned for {symbol}")

    if isinstance(df.columns, pd.MultiIndex):
        level0 = df.columns.get_level_values(0)
        if "Adj Close" in level0:
            close = df.xs("Adj Close", level=0, axis=1).iloc[:, 0]
        else:
            close = df.xs("Close", level=0, axis=1).iloc[:, 0]
    else:
        price_col = "Adj Close" if "Adj Close" in df.columns else "Close"
        close = df[price_col]

    close = close.astype(float)
    close.name = "close"
    return reindex_business_days(close)


def fetch_risk_free_annual(start: str = RF_START) -> pd.Series:
    df = pdr.DataReader("DGS3MO", "fred", start=start)
    rate = df["DGS3MO"].astype(float).interpolate(limit_direction="both") / 100
    rate.name = "ffrate_annual"
    return reindex_business_days(rate)


def persist_series(series: pd.Series, path: Path, value_name: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = series.copy()
    out.name = value_name
    out.index.name = "date"
    out.reset_index().to_csv(path, index=False, date_format="%Y-%m-%d")


def last_value(series: pd.Series) -> Optional[float]:
    return float(series.dropna().iloc[-1]) if not series.dropna().empty else None
