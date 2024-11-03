from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from datetime import datetime

app = FastAPI(title="Investment Performance API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/api/v1/market")
async def get_market_data(symbol: str) -> List[MarketData]:
    # モックデータを生成
    dates = pd.date_range(end=datetime.now(), periods=100, freq='D')
    prices = np.random.normal(100, 10, 100).cumsum()
    volumes = np.random.normal(1000000, 100000, 100)
    
    return [
        MarketData(
            timestamp=date,
            price=price,
            volume=volume,
            symbol=symbol
        )
        for date, price, volume in zip(dates, prices, volumes)
    ]

@app.post("/api/v1/analysis")
async def analyze_market(data: List[MarketData]) -> PerformanceMetrics:
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    # リターンの計算
    prices = [d.price for d in data]
    returns = np.diff(prices) / prices[:-1]
    
    # 各指標の計算
    sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252)
    
    cumulative_returns = np.cumprod(1 + returns)
    max_drawdown = np.min(cumulative_returns / np.maximum.accumulate(cumulative_returns) - 1)
    
    win_rate = len([r for r in returns if r > 0]) / len(returns)
    
    gains = sum([r for r in returns if r > 0])
    losses = abs(sum([r for r in returns if r < 0]))
    profit_factor = gains / losses if losses != 0 else float('inf')
    
    return PerformanceMetrics(
        sharpe_ratio=float(sharpe_ratio),
        max_drawdown=float(max_drawdown),
        win_rate=float(win_rate),
        profit_factor=float(profit_factor)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)