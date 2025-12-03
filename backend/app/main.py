from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
from typing import List

from .database import get_db, init_db
from .models import Portfolio, Trade, AnalysisLog
from .schemas import (
    AnalyzeRequest, AnalysisResult, SimulateTradeRequest,
    TradeResponse, PortfolioInfo, TradeInfo, MarketInfo
)
from .services import xai_service, polymarket_service
from .config import get_settings

app = FastAPI(
    title="PolyAgent Sim",
    description="Polymarket Value-Betting AI Simulator",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    # Initialize portfolio if not exists
    from .database import SessionLocal
    db = SessionLocal()
    try:
        portfolio = db.query(Portfolio).first()
        if not portfolio:
            settings = get_settings()
            portfolio = Portfolio(balance=settings.initial_balance)
            db.add(portfolio)
            db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "app": "PolyAgent Sim"}


@app.get("/markets", response_model=List[MarketInfo])
async def get_markets():
    """Fetch active markets from Polymarket."""
    try:
        markets = await polymarket_service.fetch_active_markets(limit=30)
        return [MarketInfo(**m) for m in markets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch markets: {str(e)}")


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_market(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Analyze a market using Grok-4 with live search."""
    try:
        result = xai_service.analyze_market(
            question=request.question,
            current_price=request.current_price,
            description=request.description,
            end_date=request.end_date,
            one_day_change=request.one_day_change,
            one_week_change=request.one_week_change,
            volume_24h=request.volume_24h
        )
        edge = result["estimated_probability"] - request.current_price

        # Log analysis
        log = AnalysisLog(
            market_id=request.market_id,
            market_question=request.question,
            market_price=request.current_price,
            ai_probability=result["estimated_probability"],
            edge=edge,
            reasoning=result["reasoning"],
            sources=json.dumps(result.get("sources", []))
        )
        db.add(log)
        db.commit()

        return AnalysisResult(
            estimated_probability=result["estimated_probability"],
            confidence=result.get("confidence", "medium"),
            reasoning=result["reasoning"],
            key_events=result.get("key_events", []),
            risks=result.get("risks", []),
            sources=result.get("sources", []),
            edge=edge
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/simulate-trade", response_model=TradeResponse)
async def simulate_trade(request: SimulateTradeRequest, db: Session = Depends(get_db)):
    """Place a simulated trade."""
    portfolio = db.query(Portfolio).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if request.amount > portfolio.balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if request.direction not in ["YES", "NO"]:
        raise HTTPException(status_code=400, detail="Direction must be YES or NO")
    
    # Deduct from balance
    portfolio.balance -= request.amount
    
    # Create trade
    trade = Trade(
        market_id=request.market_id,
        market_question=request.market_question,
        direction=request.direction,
        amount=request.amount,
        entry_price=request.price,
        current_price=request.price,
        status="ACTIVE"
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    
    return TradeResponse(
        success=True,
        message=f"Placed ${request.amount:.2f} on {request.direction}",
        trade=TradeInfo(
            id=trade.id,
            market_id=trade.market_id,
            market_question=trade.market_question,
            direction=trade.direction,
            amount=trade.amount,
            entry_price=trade.entry_price,
            current_price=trade.current_price,
            status=trade.status,
            created_at=trade.created_at
        ),
        new_balance=portfolio.balance
    )


@app.get("/portfolio", response_model=PortfolioInfo)
async def get_portfolio(db: Session = Depends(get_db)):
    """Get current portfolio and active trades."""
    portfolio = db.query(Portfolio).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    trades = db.query(Trade).filter(Trade.status == "ACTIVE").all()
    
    trade_infos = []
    total_pnl = 0.0
    for t in trades:
        # Calculate theoretical PnL
        if t.current_price and t.entry_price:
            if t.direction == "YES":
                pnl = (t.current_price - t.entry_price) * t.amount / t.entry_price
            else:
                pnl = (t.entry_price - t.current_price) * t.amount / t.entry_price
        else:
            pnl = 0.0
        total_pnl += pnl
        
        trade_infos.append(TradeInfo(
            id=t.id, market_id=t.market_id, market_question=t.market_question,
            direction=t.direction, amount=t.amount, entry_price=t.entry_price,
            current_price=t.current_price, status=t.status, pnl=pnl, created_at=t.created_at
        ))
    
    return PortfolioInfo(balance=portfolio.balance, active_trades=trade_infos, total_pnl=total_pnl)


@app.post("/reset-portfolio")
async def reset_portfolio(db: Session = Depends(get_db)):
    """Reset portfolio to initial state."""
    settings = get_settings()
    portfolio = db.query(Portfolio).first()
    if portfolio:
        portfolio.balance = settings.initial_balance
    db.query(Trade).delete()
    db.commit()
    return {"success": True, "balance": settings.initial_balance}

