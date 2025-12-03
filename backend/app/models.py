from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, Index
from sqlalchemy.sql import func
from .database import Base
import enum


class TradeDirection(str, enum.Enum):
    YES = "YES"
    NO = "NO"


class TradeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class Portfolio(Base):
    """Virtual portfolio balance."""
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, nullable=False)  # No default - rely on config.initial_balance
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Trade(Base):
    """Simulated trade record."""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String(255), index=True)
    market_question = Column(Text)
    direction = Column(Enum(TradeDirection), nullable=False)  # Use enum for type safety
    amount = Column(Float)  # Virtual USDC amount
    entry_price = Column(Float)  # Price when trade was placed
    current_price = Column(Float, nullable=True)  # Latest price for PnL
    status = Column(Enum(TradeStatus), default=TradeStatus.ACTIVE)  # Use enum for type safety
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_trade_status_market', 'status', 'market_id'),
        Index('idx_trade_created', 'created_at'),
    )


class AnalysisLog(Base):
    """Log of AI analysis results."""
    __tablename__ = "analysis_logs"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String(255), index=True)
    market_question = Column(Text)
    market_price = Column(Float)
    ai_probability = Column(Float)
    edge = Column(Float)  # AI probability - market price
    reasoning = Column(Text)
    sources = Column(Text)  # JSON string of sources
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite index for market analysis queries
    __table_args__ = (
        Index('idx_analysis_market_created', 'market_id', 'created_at'),
    )

