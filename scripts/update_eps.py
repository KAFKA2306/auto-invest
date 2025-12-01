#!/usr/bin/env python3
from pathlib import Path
import yfinance as yf
import sys

sys.path.insert(0, str(Path(__file__).parent))
from lib.data import save_json, load_json


def main():
    existing = load_json(Path("public/data/bottom_up_eps.json"), default={})
    components = existing.get("components", [])

    rows = []
    market_caps = {}

    for comp in components:
        ticker = yf.Ticker(comp["symbol"])
        info = ticker.info
        eps = info.get("trailingEps", 0)
        mcap = info.get("marketCap", 0)

        rows.append(
            {
                "symbol": comp["symbol"],
                "name": comp["name"],
                "quarter": "recent",
                "eps": eps,
                "eps_yoy": None,
                "weight": comp.get("weight", 0),
                "source": "yfinance",
                "marketCap": mcap,
            }
        )
        market_caps[comp["symbol"]] = mcap

    total_mcap = sum(market_caps.values())
    if total_mcap > 0:
        for r in rows:
            r["weight"] = market_caps[r["symbol"]] / total_mcap

    total_weight = sum(r["weight"] for r in rows) or 1
    for r in rows:
        r["weight"] /= total_weight

    weighted_eps = sum(r["eps"] * r["weight"] for r in rows)

    result = {"components": rows, "base_period": {"eps": weighted_eps}}

    save_json(Path("public/data/bottom_up_eps.json"), result)
    print(f"Updated bottom_up_eps.json (base_eps={weighted_eps:.4f})")


if __name__ == "__main__":
    main()
