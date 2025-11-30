import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from backend.services.leverage import compute_leverage


def load_price_data(symbol: str) -> pd.Series:
    csv_path = Path(f"public/data/price_{symbol}.csv")
    if csv_path.exists():
        df = pd.read_csv(csv_path, parse_dates=[0], index_col=0)
        return df.iloc[:, 0]

    dates = pd.date_range(end=datetime.now(), periods=1000, freq="D")
    prices = pd.Series(
        np.random.normal(100, 1, len(dates)).cumsum(),
        index=dates,
    )
    return prices


def load_ffrate_data() -> pd.Series:
    csv_path = Path("public/data/ffrate.csv")
    if csv_path.exists():
        df = pd.read_csv(csv_path, parse_dates=[0], index_col=0)
        return df.iloc[:, 0] / 252

    dates = pd.date_range(end=datetime.now(), periods=1000, freq="D")
    ffrate = pd.Series(
        np.full(len(dates), 0.02 / 252),
        index=dates,
    )
    return ffrate


def load_spx_data() -> pd.Series:
    csv_path = Path("public/data/price_SPX.csv")
    if csv_path.exists():
        df = pd.read_csv(csv_path, parse_dates=[0], index_col=0)
        return df.iloc[:, 0]
    return None


def main():
    symbol = "QQQ"
    window_trading_days = 756
    risk_free_rate_annual = 0.02
    borrow_spread_annual = 0.01
    fund_fee_annual = 0.0
    cap = 2.0
    fraction = 0.5

    prices = load_price_data(symbol)
    ffrate = load_ffrate_data()
    spx_prices = load_spx_data()

    # Align data to common index to prevent empty dataframe in service
    common_index = prices.index.intersection(ffrate.index)
    if spx_prices is not None:
        common_index = common_index.intersection(spx_prices.index)
        spx_prices = spx_prices.reindex(common_index)

    prices = prices.reindex(common_index)
    ffrate = ffrate.reindex(common_index)

    if len(common_index) == 0:
        # Fallback to dummy data generation if intersection is empty (e.g. no local files yet)
        dates = pd.date_range(end=datetime.now(), periods=1000, freq="D")
        prices = pd.Series(np.random.normal(100, 1, len(dates)).cumsum(), index=dates)
        ffrate = pd.Series(np.full(len(dates), 0.02 / 252), index=dates)
        spx_prices = None

    result = compute_leverage(
        prices=prices,
        ffrate_daily=ffrate,
        window_trading_days=window_trading_days,
        risk_free_rate_annual=risk_free_rate_annual,
        borrow_spread_annual=borrow_spread_annual,
        fund_fee_annual=fund_fee_annual,
        cap=cap,
        fraction=fraction,
        spx_prices=spx_prices,
    )

    metrics_path = Path("public/data/metrics.json")
    existing = {}
    if metrics_path.exists():
        existing = json.loads(metrics_path.read_text())

    existing["leverage"] = result

    metrics_path.write_text(json.dumps(existing, indent=2))
    print(f"Updated leverage metrics: {result['as_of']}")


if __name__ == "__main__":
    main()
