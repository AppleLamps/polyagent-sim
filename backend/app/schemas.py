from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Request schemas
class AnalyzeRequest(BaseModel):
    market_id: str
    question: str
    description: Optional[str] = None
    current_price: float
    end_date: Optional[str] = None
    one_day_change: Optional[float] = None
    one_week_change: Optional[float] = None
    volume_24h: Optional[float] = None


class SimulateTradeRequest(BaseModel):
    market_id: str
    market_question: str
    amount: float
    direction: str  # "YES" or "NO"
    price: float


# Response schemas
class AnalysisResult(BaseModel):
    estimated_probability: float
    confidence: str  # low, medium, high
    reasoning: str
    key_events: List[str]  # Upcoming catalysts
    risks: List[str]  # What could go wrong
    sources: List[str]
    edge: float  # AI prob - market price


class MarketInfo(BaseModel):
    id: str
    question: str
    description: Optional[str] = None
    yes_price: float
    no_price: float
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    last_trade_price: Optional[float] = None
    volume: Optional[float] = None
    volume_24h: Optional[float] = None
    liquidity: Optional[float] = None
    spread: Optional[float] = None
    one_day_change: Optional[float] = None
    one_week_change: Optional[float] = None
    one_month_change: Optional[float] = None
    end_date: Optional[str] = None
    image: Optional[str] = None


class TradeInfo(BaseModel):
    id: int
    market_id: str
    market_question: str
    direction: str
    amount: float
    entry_price: float
    current_price: Optional[float]
    status: str
    pnl: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PortfolioInfo(BaseModel):
    balance: float
    active_trades: List[TradeInfo]
    total_pnl: float


class TradeResponse(BaseModel):
    success: bool
    message: str
    trade: Optional[TradeInfo] = None
    new_balance: float

