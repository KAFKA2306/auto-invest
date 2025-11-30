import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import pandas as pd
from backend.services.leverage import compute_leverage


def load_price_data(symbol: str) -> pd.Series:
    csv_path = Path(f"public/data/price_{symbol}.csv")
    df = pd.read_csv(csv_path, parse_dates=["date"])
    return df.set_index("date")["close"]


def load_ffrate_data() -> pd.Series:
    csv_path = Path("public/data/ffrate.csv")
    df = pd.read_csv(csv_path, parse_dates=["date"])
    return df.set_index("date")["ffrate_annual"] / 252


def load_spx_data() -> pd.Series:
    csv_path = Path("public/data/price_SPY.csv")
    df = pd.read_csv(csv_path, parse_dates=["date"])
    return df.set_index("date")["close"]


app = FastAPI(title="Investment Performance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "status": "ok",
        "endpoints": [
            "/api/v1/leverage",
            "/api/v1/valuation",
            "/data/metrics.json",
            "/data/valuation.json",
        ],
    }


@app.get("/api/v1/leverage")
async def get_leverage(
    symbol: str = "QQQ",
    window_trading_days: int = 756,
    borrow_spread_annual: float = 0.01,
    fund_fee_annual: float = 0.0,
    cap: float = 2.0,
    fraction: float = 0.5,
):
    prices = load_price_data(symbol)
    ffrate = load_ffrate_data()
    spx_prices = load_spx_data()

    common_index = prices.index.intersection(ffrate.index).intersection(spx_prices.index)
    prices = prices.reindex(common_index)
    ffrate = ffrate.reindex(common_index)
    spx_prices = spx_prices.reindex(common_index)

    risk_free_rate_annual = float(ffrate.iloc[-1] * 252)

    return compute_leverage(
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


@app.get("/api/v1/valuation")
async def get_valuation():
    path = Path("public/data/valuation.json")
    if not path.exists():
        raise HTTPException(status_code=404, detail="valuation.json not found. Run scripts/fetch_valuation_pdr.py")
    with path.open() as f:
        return json.load(f)


@app.get("/data/valuation.json")
async def get_valuation_file():
    path = Path("public/data/valuation.json")
    if not path.exists():
        raise HTTPException(status_code=404, detail="valuation.json not found. Run scripts/fetch_valuation_pdr.py")
    return FileResponse(path)


@app.get("/data/metrics.json")
async def get_metrics_file():
    path = Path("public/data/metrics.json")
    if not path.exists():
        raise HTTPException(status_code=404, detail="metrics.json not found. Run scripts/update_leverage.py")
    return FileResponse(path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
