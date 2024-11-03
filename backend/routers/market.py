from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.market_service import MarketService

router = APIRouter()

@router.get("/market")
async def get_market_data(symbol: str, db: Session = Depends(get_db)):
    return await MarketService.get_market_data(db, symbol)