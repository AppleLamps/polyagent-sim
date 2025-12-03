from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import defaultdict, deque
from functools import partial
import asyncio
import time
import json
import logging
from typing import List, Optional, Dict, Any, Deque

from .database import get_db, init_db, SessionLocal
from .models import Portfolio, Trade, AnalysisLog, TradeDirection, TradeStatus
from .schemas import (
    AnalyzeRequest, AnalysisResult, SimulateTradeRequest,
    TradeResponse, PortfolioInfo, TradeInfo, MarketInfo, ResetResponse, PriceUpdateResponse,
    CalculateReturnRequest, CalculateReturnResponse
)
from .services import xai_service, polymarket_service
from .config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Simple in-memory cache for market data
_market_cache: Dict[str, Any] = {"data": None, "timestamp": None}

# Thread pool for running synchronous AI calls without blocking
_executor = ThreadPoolExecutor(max_workers=4)

# Rate limiter using deque for O(1) cleanup from front
_rate_limit_store: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=100))

def check_rate_limit(client_ip: str, endpoint: str, max_requests: int, window_seconds: int) -> bool:
    """Check if client has exceeded rate limit. Returns True if allowed, False if exceeded."""
    key = f"{client_ip}:{endpoint}"
    now = time.time()
    window_start = now - window_seconds

    requests = _rate_limit_store[key]

    # Remove expired entries from front (O(k) where k = expired entries, not O(n))
    while requests and requests[0] < window_start:
        requests.popleft()

    # Check limit
    if len(requests) >= max_requests:
        return False

    # Record request
    requests.append(now)
    return True

def get_client_ip(request: Request) -> str:
    """Get client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting PolyAgent Sim server...")
    init_db()
    db = SessionLocal()
    try:
        portfolio = db.query(Portfolio).first()
        if not portfolio:
            settings = get_settings()
            portfolio = Portfolio(balance=settings.initial_balance)
            db.add(portfolio)
            db.commit()
            logger.info(f"Initialized portfolio with balance: ${settings.initial_balance:,.2f}")
    finally:
        db.close()
    logger.info("Server startup complete")
    yield
    # Shutdown
    logger.info("Shutting down PolyAgent Sim server...")


app = FastAPI(
    title="PolyAgent Sim",
    description="Polymarket Value-Betting AI Simulator",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "app": "PolyAgent Sim"}


@app.get("/markets", response_model=List[MarketInfo])
async def get_markets(request: Request):
    """Fetch active markets from Polymarket with caching."""
    settings = get_settings()

    # Rate limit using configurable settings
    client_ip = get_client_ip(request)
    if not check_rate_limit(client_ip, "markets", max_requests=settings.rate_limit_markets, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {settings.rate_limit_markets} market requests per minute."
        )

    now = datetime.now()

    # Check cache - return cached data if still valid (TTL from settings)
    if (_market_cache["data"] is not None and
        _market_cache["timestamp"] is not None and
        (now - _market_cache["timestamp"]).total_seconds() < settings.cache_ttl):
        return _market_cache["data"]

    # Fetch fresh data
    try:
        markets = await polymarket_service.fetch_active_markets(limit=30)
        result = [MarketInfo(**m) for m in markets]

        # Update cache
        _market_cache["data"] = result
        _market_cache["timestamp"] = now

        return result
    except Exception as e:
        # Return stale cache if available on error
        if _market_cache["data"] is not None:
            return _market_cache["data"]
        raise HTTPException(status_code=500, detail=f"Failed to fetch markets: {str(e)}")


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_market(request: AnalyzeRequest, http_request: Request, db: Session = Depends(get_db)):
    """Analyze a market using Grok-4 with live search."""
    settings = get_settings()

    # Rate limit using configurable settings
    client_ip = get_client_ip(http_request)
    if not check_rate_limit(client_ip, "analyze", max_requests=settings.rate_limit_analyze, window_seconds=60):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {settings.rate_limit_analyze} analyses per minute. Please wait and try again."
        )

    logger.info(f"Analyzing market: {request.market_id[:20]}... price={request.current_price:.2f}")
    try:
        # Run synchronous AI call in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        analyze_func = partial(
            xai_service.analyze_market,
            question=request.question,
            current_price=request.current_price,
            description=request.description,
            end_date=request.end_date,
            one_day_change=request.one_day_change,
            one_week_change=request.one_week_change,
            volume_24h=request.volume_24h
        )
        result = await loop.run_in_executor(_executor, analyze_func)

        edge = result["estimated_probability"] - request.current_price
        logger.info(f"Analysis complete: prob={result['estimated_probability']:.2f}, edge={edge:+.2f}")

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
        logger.error(f"Analysis failed for market {request.market_id}: {str(e)}", exc_info=True)
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
        logger.warning(f"Insufficient balance: requested ${request.amount:.2f}, available ${portfolio.balance:.2f}")
        raise HTTPException(status_code=400, detail="Insufficient balance")

    if request.direction not in ["YES", "NO"]:
        raise HTTPException(status_code=400, detail="Direction must be YES or NO")

    # Create trade
    trade = Trade(
        market_id=request.market_id,
        market_question=request.market_question,
        direction=TradeDirection(request.direction),
        amount=request.amount,
        entry_price=request.price,
        current_price=request.price,
        status=TradeStatus.ACTIVE
    )
    db.add(trade)

    # Deduct from balance using SQLAlchemy expression to prevent race conditions
    # This generates: UPDATE portfolio SET balance = balance - :amount
    portfolio.balance = Portfolio.balance - request.amount
    db.commit()
    db.refresh(portfolio)  # Get the updated value from DB
    db.refresh(trade)

    logger.info(f"Trade placed: ${request.amount:.2f} {request.direction} @ {request.price:.2f} | Balance: ${portfolio.balance:.2f}")
    
    return TradeResponse(
        success=True,
        message=f"Placed ${request.amount:.2f} on {request.direction}",
        trade=TradeInfo(
            id=trade.id,
            market_id=trade.market_id,
            market_question=trade.market_question,
            direction=trade.direction.value,
            amount=trade.amount,
            entry_price=trade.entry_price,
            current_price=trade.current_price,
            status=trade.status.value,
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
    
    trades = db.query(Trade).filter(Trade.status == TradeStatus.ACTIVE).all()

    trade_infos = []
    total_pnl = 0.0
    for t in trades:
        # Calculate theoretical PnL
        if t.current_price and t.entry_price:
            if t.direction == TradeDirection.YES:
                pnl = (t.current_price - t.entry_price) * t.amount / t.entry_price
            else:
                pnl = (t.entry_price - t.current_price) * t.amount / t.entry_price
        else:
            pnl = 0.0
        total_pnl += pnl
        
        trade_infos.append(TradeInfo(
            id=t.id, market_id=t.market_id, market_question=t.market_question,
            direction=t.direction.value, amount=t.amount, entry_price=t.entry_price,
            current_price=t.current_price, status=t.status.value, pnl=pnl, created_at=t.created_at
        ))
    
    return PortfolioInfo(balance=portfolio.balance, active_trades=trade_infos, total_pnl=total_pnl)


@app.post("/reset-portfolio", response_model=ResetResponse)
async def reset_portfolio(db: Session = Depends(get_db)):
    """Reset portfolio to initial state."""
    settings = get_settings()
    portfolio = db.query(Portfolio).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio.balance = settings.initial_balance
    db.query(Trade).delete()
    db.commit()
    return ResetResponse(
        success=True,
        balance=settings.initial_balance,
        message="Portfolio reset successfully"
    )


@app.post("/update-prices", response_model=PriceUpdateResponse)
async def update_trade_prices(db: Session = Depends(get_db)):
    """Update current prices for all active trades."""
    trades = db.query(Trade).filter(Trade.status == TradeStatus.ACTIVE).all()
    updated_count = 0

    for trade in trades:
        try:
            market = await polymarket_service.get_market_by_id(trade.market_id)
            if market:
                new_price = market["yes_price"] if trade.direction == TradeDirection.YES else market["no_price"]
                trade.current_price = new_price
                updated_count += 1
        except Exception:
            # Skip trades that fail to update
            continue

    db.commit()
    return PriceUpdateResponse(
        success=True,
        updated_count=updated_count,
        message=f"Updated prices for {updated_count} of {len(trades)} active trades"
    )


@app.post("/calculate-return", response_model=CalculateReturnResponse)
async def calculate_potential_return(request: CalculateReturnRequest):
    """Calculate potential return using Python's Decimal for precision."""
    from decimal import Decimal, ROUND_HALF_UP

    # Use Decimal for precise financial calculations
    amount = Decimal(str(request.amount))
    price = Decimal(str(request.price))

    # Calculate shares and potential return with precision
    shares = (amount / price).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
    potential_return = shares.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return CalculateReturnResponse(
        amount=float(amount),
        price=float(price),
        potential_return=float(potential_return),
        shares=float(shares)
    )
