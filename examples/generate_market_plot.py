"""Generate and save a sample market price chart using the FastAPI backend."""

from __future__ import annotations

from pathlib import Path

import httpx
import matplotlib.pyplot as plt
import pandas as pd

API_URL = "http://localhost:8000/api/v1/market?symbol=AAPL"
OUTPUT_PATH = Path(__file__).with_name("sample_market.png")


def main() -> None:
    """Fetch market data from the API and plot price over time."""
    response = httpx.get(API_URL, timeout=10)
    response.raise_for_status()
    data = response.json()

    df = pd.DataFrame(data)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    plt.figure(figsize=(10, 4))
    plt.plot(df["timestamp"], df["price"], label="AAPL")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.title("Sample Market Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_PATH)
    print(f"Saved chart to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
