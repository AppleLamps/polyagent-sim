from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


# Request schemas
class ActiveTradeInfo(BaseModel):
    """Simplified trade info for analysis context."""
    market_id: str
    market_question: str
    direction: str
    amount: float
    entry_price: float
    current_price: Optional[float] = None
    pnl: Optional[float] = None


class PortfolioContext(BaseModel):
    """Portfolio context for trade recommendations."""
    balance: float
    active_trades: List[ActiveTradeInfo] = []
    total_pnl: float = 0.0


class AnalyzeRequest(BaseModel):
    market_id: str
    question: str
    description: Optional[str] = None
    current_price: float = Field(ge=0.0, le=1.0)
    end_date: Optional[str] = None
    # Price changes
    one_hour_change: Optional[float] = None
    one_day_change: Optional[float] = None
    one_week_change: Optional[float] = None
    one_month_change: Optional[float] = None
    # Volume & liquidity
    volume_24h: Optional[float] = None
    volume_1w: Optional[float] = None
    liquidity: Optional[float] = None
    spread: Optional[float] = None
    # Engagement & metadata
    comment_count: Optional[int] = None
    competitive: Optional[float] = None
    tags: Optional[List[str]] = None
    days_until_resolution: Optional[int] = None
    # Portfolio context for trade recommendations
    portfolio: Optional[PortfolioContext] = None


class SimulateTradeRequest(BaseModel):
    market_id: str
    market_question: str
    amount: float = Field(gt=0, le=1000000, description="Trade amount in USDC (max $1M)")
    direction: str = Field(description="Trade direction: YES or NO")
    price: float = Field(ge=0.0, le=1.0, description="Entry price (0.0 to 1.0)")

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v < 1:
            raise ValueError('Minimum trade amount is $1')
        # Round to 2 decimal places
        return round(v, 2)

    @field_validator('direction')
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ['YES', 'NO']:
            raise ValueError('Direction must be YES or NO')
        return v


# Response schemas
class TradeRecommendation(BaseModel):
    """AI-generated trade recommendation."""
    action: str  # "BUY_YES", "BUY_NO", "HOLD", "SKIP"
    amount: Optional[float] = None  # Recommended amount in USDC
    reasoning: str  # Why this recommendation
    risk_level: str  # "low", "medium", "high"
    kelly_fraction: Optional[float] = None  # Optimal bet size as fraction of bankroll


class AnalysisResult(BaseModel):
    estimated_probability: float
    confidence: str  # low, medium, high
    reasoning: str
    key_events: List[str]  # Upcoming catalysts
    risks: List[str]  # What could go wrong
    sources: List[str]
    edge: float  # AI prob - market price
    recommendation: Optional[TradeRecommendation] = None


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


class ResetResponse(BaseModel):
    """Response model for portfolio reset endpoint."""
    success: bool
    balance: float
    message: str


class CalculateReturnRequest(BaseModel):
    """Request model for calculating potential return."""
    amount: float = Field(gt=0)
    price: float = Field(gt=0, le=1.0)


class CalculateReturnResponse(BaseModel):
    """Response model for calculate return endpoint."""
    amount: float
    price: float
    potential_return: float
    shares: float


class PriceUpdateResponse(BaseModel):
    """Response model for price update endpoint."""
    success: bool
    updated_count: int
    message: str

