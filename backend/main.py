from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
import numpy as np
import pandas as pd

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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
