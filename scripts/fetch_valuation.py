"""
Fetch NASDAQ-100 forward valuation series (Forward P/E, Forward 12M EPS) from MacroMicro,
compute derived metrics, and persist processed JSON for the dashboard.

Requirements:
- Set environment variable `MACROMICRO_SESSION` with your `mm_session` cookie value
  (or entire cookie string containing `mm_session=...`). The site blocks unauthenticated
  scraping via Cloudflare; a valid session cookie is mandatory.
- Run `scripts/update_leverage.py` first so that `public/data/price_QQQ.csv` and
  `public/data/ffrate.csv` exist; risk-free rates are needed to compute yield spreads.
"""

from __future__ import annotations

import json
import os
from datetime import timedelta, timezone, datetime
from io import StringIO
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import httpx
import pandas as pd

DATA_DIR = Path("public/data")
RAW_DIR = Path("data/raw/macromicro")
PROCESSED_DIR = Path("data/processed")

SERIES = {
    "forward_pe": 23955,  # NASDAQ-100 Forward P/E (MacroMicro series id)
    "forward_eps": 23954,  # NASDAQ-100 Forward 12M EPS
}

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def parse_cookie(raw: str) -> Dict[str, str]:
    """
    Accept a single cookie value (legacy mm_session) OR a semicolon-separated list
    (e.g. cf_clearance=...; PHPSESSID=...; mmu=...).
    The script no longer requires mm_session explicitly; any cookie set is forwarded.
    """
    raw = raw.strip()
    if ";" not in raw and "=" not in raw:
        # Treat as a single token named mm_session for backward compatibility
        return {"mm_session": raw}
    cookies: Dict[str, str] = {}
    for part in raw.split(";"):
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        cookies[k.strip()] = v.strip()
    if not cookies:
        raise RuntimeError("No valid cookies parsed from MACROMICRO_COOKIE / MACROMICRO_SESSION.")
    return cookies


def candidate_urls(series_id: int) -> Iterable[str]:
    """
    Known download endpoints observed on MacroMicro.
    We try several because Cloudflare protection sometimes rewrites paths.
    """
    return [
        f"https://en.macromicro.me/series/{series_id}/csv",
        f"https://en.macromicro.me/series/{series_id}/download",
        f"https://en.macromicro.me/series/{series_id}/download?format=csv",
        f"https://en.macromicro.me/series-download?series={series_id}&format=csv",
    ]


def download_series(client: httpx.Client, series_id: int, name: str) -> pd.DataFrame:
    last_error = None
    for url in candidate_urls(series_id):
        resp = client.get(url)
        if resp.status_code == 200 and "text/csv" in resp.headers.get("content-type", ""):
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_DIR / f"{name}.csv"
            raw_path.write_bytes(resp.content)
            return parse_series(resp.text, name)
        last_error = f"{resp.status_code} {resp.text[:200]!r}"
    raise RuntimeError(f"Failed to download series {series_id} for {name}: {last_error}")


def parse_series(csv_text: str, name: str) -> pd.DataFrame:
    df = pd.read_csv(StringIO(csv_text))
    if df.empty:
        raise RuntimeError(f"{name} CSV is empty")

    df.columns = [str(c).strip().lower() for c in df.columns]
    date_col = next((c for c in df.columns if "date" in c), df.columns[0])
    value_col = next((c for c in df.columns if c != date_col), df.columns[min(1, len(df.columns) - 1)])

    df = df[[date_col, value_col]].rename(columns={date_col: "date", value_col: name})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df[name] = pd.to_numeric(df[name], errors="coerce")
    df = df.dropna().sort_values("date").reset_index(drop=True)

    if df.empty:
        raise RuntimeError(f"{name} series has no valid rows after parsing.")
    return df


def load_supporting_series() -> Tuple[pd.DataFrame, pd.Series]:
    price_path = DATA_DIR / "price_QQQ.csv"
    rf_path = DATA_DIR / "ffrate.csv"

    if not price_path.exists() or not rf_path.exists():
        raise RuntimeError("Run scripts/update_leverage.py first (price_QQQ.csv and ffrate.csv required).")

    prices = pd.read_csv(price_path, parse_dates=["date"]).rename(columns={"close": "price_close"})
    rf = pd.read_csv(rf_path, parse_dates=["date"]).rename(columns={"ffrate_annual": "rf_annual"})
    rf_series = rf.set_index("date")["rf_annual"]
    return prices, rf_series


def compute_derived(pe: pd.DataFrame, eps: pd.DataFrame, prices: pd.DataFrame, rf_annual: pd.Series) -> pd.DataFrame:
    merged = pe.merge(eps, on="date", how="outer")
    merged = merged.sort_values("date").dropna(subset=["forward_pe", "forward_eps"], how="all")

    # Align price and risk-free
    merged = merged.merge(prices[["date", "price_close"]], on="date", how="left")
    merged["rf_annual"] = merged["date"].map(rf_annual).ffill()

    merged["earnings_yield"] = 1.0 / merged["forward_pe"]
    merged["earnings_yield_spread"] = merged["earnings_yield"] - merged["rf_annual"]
    merged["implied_forward_pe_from_price"] = merged["price_close"] / merged["forward_eps"]

    # YoY EPS growth (using daily ffill to handle sparse series)
    daily_eps = (
        merged.set_index("date")["forward_eps"]
        .sort_index()
        .resample("D")
        .ffill()
    )
    yoy_eps = daily_eps.pct_change(365)
    merged["yoy_eps_growth"] = merged["date"].map(yoy_eps)

    return merged.dropna(subset=["forward_pe", "forward_eps"])


def build_payload(merged: pd.DataFrame) -> Dict:
    merged = merged.dropna(subset=["forward_pe", "forward_eps"]).copy()
    merged["date"] = merged["date"].dt.date

    latest = merged.iloc[-1]
    as_of = latest["date"].isoformat()

    def round_safe(x: float | None, digits: int = 6) -> float | None:
        return None if pd.isna(x) else float(round(x, digits))

    series_records: List[Dict] = []
    for _, row in merged.iterrows():
        series_records.append(
            {
                "date": row["date"].isoformat(),
                "forward_pe": round_safe(row["forward_pe"], 4),
                "forward_eps": round_safe(row["forward_eps"], 4),
                "earnings_yield": round_safe(row.get("earnings_yield"), 6),
                "earnings_yield_spread": round_safe(row.get("earnings_yield_spread"), 6),
                "implied_forward_pe_from_price": round_safe(row.get("implied_forward_pe_from_price"), 4),
                "price_close": round_safe(row.get("price_close"), 4),
            }
        )

    return {
        "as_of": as_of,
        "source": "macromicro",
        "latest": {
            "forward_pe": round_safe(latest["forward_pe"], 4),
            "forward_eps": round_safe(latest["forward_eps"], 4),
            "earnings_yield": round_safe(latest.get("earnings_yield"), 6),
            "earnings_yield_spread": round_safe(latest.get("earnings_yield_spread"), 6),
            "yoy_eps_growth": round_safe(latest.get("yoy_eps_growth"), 6),
            "implied_forward_pe_from_price": round_safe(latest.get("implied_forward_pe_from_price"), 4),
        },
        "series": series_records,
        "metadata": {
            "series_ids": SERIES,
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "notes": "Requires valid mm_session cookie; frequencies follow MacroMicro updates (PE monthly, EPS weekly).",
        },
    }


def main() -> None:
    raw_cookie = os.getenv("MACROMICRO_COOKIE") or os.getenv("MACROMICRO_SESSION")
    if not raw_cookie:
        raise SystemExit("Set MACROMICRO_SESSION (mm_session cookie value) before running.")

    cookies = parse_cookie(raw_cookie)

    with httpx.Client(
        headers={"User-Agent": USER_AGENT, "Referer": "https://en.macromicro.me/"},
        cookies=cookies,
        follow_redirects=True,
        timeout=30,
    ) as client:
        pe_df = download_series(client, SERIES["forward_pe"], "forward_pe")
        eps_df = download_series(client, SERIES["forward_eps"], "forward_eps")

    prices, rf_daily = load_supporting_series()
    merged = compute_derived(pe_df, eps_df, prices, rf_daily)
    payload = build_payload(merged)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Parquet cache (optional, not served)
    parquet_path = PROCESSED_DIR / "valuation.parquet"
    merged.to_parquet(parquet_path, index=False)

    json_path = DATA_DIR / "valuation.json"
    json_path.write_text(json.dumps(payload, indent=2))
    print(f"Saved valuation data to {json_path} (as_of={payload['as_of']})")


if __name__ == "__main__":
    main()
