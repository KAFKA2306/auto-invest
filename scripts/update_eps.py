#!/usr/bin/env python3
import datetime
import math
from pathlib import Path
import sys
import yfinance as yf

sys.path.insert(0, str(Path(__file__).parent))
from lib.data import save_json, load_json


def safe_float(val):
    if val is None:
        return 0.0
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except (ValueError, TypeError):
        return 0.0


def main():
    json_path = Path("public/data/bottom_up_eps.json")
    existing = load_json(json_path, default={})
    
    # Preserve existing structure if available, otherwise defaults
    components = existing.get("components", [])
    if not components:
        # Fallback seed if empty (optional, but helpful for first run)
        components = [{"symbol": "AAPL", "name": "Apple Inc.", "weight": 1.0}]

    prior_period_data = existing.get("prior_period", {})
    prior_period = {
        "date": prior_period_data.get("date") or "2025-09-30",
        "label": prior_period_data.get("label") or "2025Q3",
        "eps": safe_float(prior_period_data.get("eps"))
    }
    
    # We will recalculate base_period, but keep label/date if they exist
    base_period_data = existing.get("base_period", {})
    base_period_def = {
        "date": base_period_data.get("date") or datetime.date.today().isoformat(),
        "label": base_period_data.get("label") or "Latest",
        "eps": 0.0 # Will be overwritten
    }

    rows = []
    market_caps = {}

    print(f"Updating {len(components)} components...")

    for comp in components:
        symbol = comp["symbol"]
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Safe extraction
            eps = safe_float(info.get("trailingEps"))
            mcap = safe_float(info.get("marketCap"))
            
            history = []
            try:
                fin = ticker.quarterly_financials
                if not fin.empty and "Basic EPS" in fin.index:
                    # Get last 4 quarters
                    series = fin.loc["Basic EPS"].head(4)
                    for date, val in series.items():
                        history.append({
                            "date": str(date.date()),
                            "eps": safe_float(val)
                        })
            except Exception as e:
                print(f"  [WARN] History fetch failed for {symbol}: {e}")

            rows.append({
                "symbol": symbol,
                "name": info.get("shortName", comp.get("name", symbol)),
                "quarter": "recent",
                "eps": eps,
                "eps_yoy": None, # Placeholder for manual input or future calc
                "weight": comp.get("weight", 0),
                "source": "yfinance",
                "marketCap": mcap,
                "history": history
            })
            market_caps[symbol] = mcap
            
        except Exception as e:
            print(f"  [ERROR] Failed to fetch {symbol}: {e}")
            # Keep existing data if fetch fails, or basic fallback
            rows.append({
                "symbol": symbol,
                "name": comp.get("name", symbol),
                "quarter": "error",
                "eps": comp.get("eps", 0.0),
                "eps_yoy": comp.get("eps_yoy"),
                "weight": comp.get("weight", 0),
                "source": "error",
                "marketCap": comp.get("marketCap", 0),
                "history": comp.get("history", [])
            })
            market_caps[symbol] = safe_float(comp.get("marketCap"))

    # Normalize weights by Market Cap
    total_mcap = sum(market_caps.values())
    if total_mcap > 0:
        for r in rows:
            r["weight"] = market_caps[r["symbol"]] / total_mcap
    else:
        # Fallback to equal weight or existing weights if mcap failed
        pass 

    # Ensure weights sum to 1
    total_weight = sum(r["weight"] for r in rows)
    if total_weight > 0:
        for r in rows:
            r["weight"] /= total_weight

    # Calculate weighted EPS (Index EPS)
    weighted_eps = sum(r["eps"] * r["weight"] for r in rows)

    result = {
        "as_of": datetime.date.today().isoformat(),
        "prior_period": prior_period,
        "base_period": {
            "date": base_period_def.get("date"),
            "label": base_period_def.get("label"),
            "eps": weighted_eps
        },
        "components": rows
    }

    save_json(json_path, result)
    print(f"Success. Updated bottom_up_eps.json (Index EPS={weighted_eps:.2f})")


if __name__ == "__main__":
    main()
