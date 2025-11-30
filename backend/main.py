from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
import numpy as np
import pandas as pd
from backend.services.leverage import compute_leverage

app = FastAPI(title="Investment Performance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MarketData(BaseModel):
    timestamp: datetime
    price: float
    volume: float
    symbol: str


class PerformanceMetrics(BaseModel):
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float


@app.get("/api/v1/market", response_model=List[MarketData])
async def get_market_data(symbol: str) -> List[MarketData]:
    dates = pd.date_range(end=datetime.now(), periods=100, freq="D")
    prices = np.random.normal(100, 1, len(dates)).cumsum()
    volumes = np.random.normal(1_000_000, 100_000, len(dates))

    return [
        MarketData(
            timestamp=date.to_pydatetime(),
            price=float(price),
            volume=float(volume),
            symbol=symbol,
        )
        for date, price, volume in zip(dates, prices, volumes)
    ]


@app.post("/api/v1/analysis", response_model=PerformanceMetrics)
async def analyze_market(data: List[MarketData]) -> PerformanceMetrics:
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")

    prices = np.array([d.price for d in data])
    returns = np.diff(prices) / prices[:-1]

    sharpe_ratio = float(np.mean(returns) / np.std(returns) * np.sqrt(252))
    cumulative_returns = np.cumprod(1 + returns)
    max_drawdown = float(
        np.min(cumulative_returns / np.maximum.accumulate(cumulative_returns) - 1)
    )
    win_rate = float(np.sum(returns > 0) / len(returns))
    gains = returns[returns > 0].sum()
    losses = -returns[returns < 0].sum()
    profit_factor = float(gains / losses) if losses != 0 else 0.0

    return PerformanceMetrics(
        sharpe_ratio=sharpe_ratio,
        max_drawdown=max_drawdown,
        win_rate=win_rate,
        profit_factor=profit_factor,
    )


@app.get("/api/v1/leverage")
async def get_leverage(
    symbol: str = "QQQ",
    window_trading_days: int = 756,
    risk_free_rate_annual: float = 0.02,
    borrow_spread_annual: float = 0.01,
    fund_fee_annual: float = 0.0,
    cap: float = 2.0,
    fraction: float = 0.5,
) -> Dict:
    dates = pd.date_range(end=datetime.now(), periods=window_trading_days, freq="D")
    prices = pd.Series(
        np.random.normal(100, 1, len(dates)).cumsum(),
        index=dates,
    )
    ffrate = pd.Series(
        np.full(len(dates), risk_free_rate_annual / 252),
        index=dates,
    )

    return compute_leverage(
        prices=prices,
        ffrate_daily=ffrate,
        window_trading_days=window_trading_days,
        risk_free_rate_annual=risk_free_rate_annual,
        borrow_spread_annual=borrow_spread_annual,
        fund_fee_annual=fund_fee_annual,
        cap=cap,
        fraction=fraction,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
