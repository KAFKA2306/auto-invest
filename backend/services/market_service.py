from typing import List
from ..models import MarketDataModel
from sqlalchemy.orm import Session

class MarketService:
    @staticmethod
    async def get_market_data(db: Session, symbol: str) -> List[MarketDataModel]:
        return db.query(MarketDataModel).filter(MarketDataModel.symbol == symbol).all()