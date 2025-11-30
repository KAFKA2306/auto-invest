"""
Lightweight, free-data alternative to fetch NASDAQ-100 (QQQ ETF proxy) forward valuation.

- Uses Yahoo Finance quoteSummary (no login/key) to get forwardPE and forwardEps for QQQ.
- Uses already-downloaded risk-free series from scripts/update_leverage.py (public/data/ffrate.csv)
- Outputs public/data/valuation.json in the same shape consumed by the frontend.

Note:
- Historical forward P/E/EPS is not freely available; run this script daily to build your own history.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

DATA_DIR = Path("public/data")


def fetch_yahoo_forward(ticker: str = "QQQ") -> dict:
    url = f"https://query1.finance.yahoo.com/v11/finance/quoteSummary/{ticker}"
    params = {
        "modules": "summaryDetail,defaultKeyStatistics,financialData",
    }
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    payload = r.json()
    result = payload.get("quoteSummary", {}).get("result", [{}])[0]

    def get(path, default=None):
        cur = result
        for p in path:
            if cur is None:
                return default
            cur = cur.get(p)
        return cur if cur is not None else default

    forward_pe = get(["defaultKeyStatistics", "forwardPE", "raw"])
    forward_eps = get(["defaultKeyStatistics", "forwardEps", "raw"])
    price = get(["financialData", "currentPrice", "raw"]) or get(["summaryDetail", "regularMarketPrice", "raw"])
    as_of_ts = get(["financialData", "currentPrice", "fmt"])

    as_of = datetime.now(timezone.utc).date().isoformat()
    return {
        "as_of": as_of,
        "forward_pe": forward_pe,
        "forward_eps": forward_eps,
        "price": price,
    }


def load_risk_free() -> pd.Series:
    rf_path = DATA_DIR / "ffrate.csv"
    if not rf_path.exists():
        raise RuntimeError("public/data/ffrate.csv not found. Run scripts/update_leverage.py first.")
    df = pd.read_csv(rf_path, parse_dates=["date"])
    return df.set_index("date")["ffrate_annual"]


def main() -> None:
    yahoo = fetch_yahoo_forward("QQQ")
    rf = load_risk_free()
    rf_latest = float(rf.dropna().iloc[-1])

    forward_pe = yahoo["forward_pe"]
    forward_eps = yahoo["forward_eps"]
    price_close = yahoo["price"]

    earnings_yield = 1 / forward_pe if forward_pe else None
    earnings_yield_spread = earnings_yield - rf_latest if earnings_yield is not None else None

    series_item = {
        "date": yahoo["as_of"],
        "forward_pe": forward_pe,
        "forward_eps": forward_eps,
        "earnings_yield": earnings_yield,
        "earnings_yield_spread": earnings_yield_spread,
        "implied_forward_pe_from_price": forward_pe,  # same as forward_pe since price already in calc
        "price_close": price_close,
    }

    payload = {
        "as_of": yahoo["as_of"],
        "source": "yahoo_finance_free",
        "latest": {
            "forward_pe": forward_pe,
            "forward_eps": forward_eps,
            "earnings_yield": earnings_yield,
            "earnings_yield_spread": earnings_yield_spread,
            "implied_forward_pe_from_price": forward_pe,
        },
        "series": [series_item],
        "metadata": {
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "notes": "Forward P/E/EPS taken from Yahoo Finance quoteSummary for QQQ; run daily to build history.",
        },
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "valuation.json").write_text(json.dumps(payload, indent=2))
    print(f"Saved public/data/valuation.json (source=yahoo, as_of={yahoo['as_of']})")


if __name__ == "__main__":
    main()
