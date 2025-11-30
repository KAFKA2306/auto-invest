from pathlib import Path
import pandas as pd

from backend.config import FFRATE_DATA_PATH, PRICE_DATA_PATH, SPX_DATA_PATH


def _load_series_from_csv(csv_path: Path, value_col: str) -> pd.Series:
    df = pd.read_csv(csv_path, parse_dates=["date"])
    return df.set_index("date")[value_col]


def load_price_data(symbol: str) -> pd.Series:
    csv_path = PRICE_DATA_PATH.format(symbol=symbol)
    return _load_series_from_csv(csv_path, "close")


def load_ffrate_data() -> pd.Series:
    csv_path = FFRATE_DATA_PATH
    return _load_series_from_csv(csv_path, "ffrate_annual") / 252


def load_spx_data() -> pd.Series:
    csv_path = SPX_DATA_PATH
    return _load_series_from_csv(csv_path, "close")
