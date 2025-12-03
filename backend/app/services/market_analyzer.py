"""
Market Opportunity Analyzer

Scores and ranks Polymarket markets to identify the best trading opportunities.
Uses multiple factors: momentum, volume, liquidity, competitiveness, uncertainty, and timing.
"""

import httpx
import math
from typing import List, Dict, Any
from datetime import datetime, timezone

GAMMA_API_URL = "https://gamma-api.polymarket.com"


def calculate_opportunity_score(market: Dict, event: Dict) -> Dict[str, Any]:
    """
    Calculate an opportunity score for a market based on multiple factors.
    Returns the market data enriched with scoring information.
    """
    
    # Extract market data with defaults
    price = float(market.get("lastTradePrice") or 0.5)
    volume_24h = float(market.get("volume24hr") or 0)
    volume_1w = float(market.get("volume1wk") or 0)
    liquidity = float(market.get("liquidityNum") or market.get("liquidity") or 0)
    spread = float(market.get("spread") or 0.05)
    competitive = float(market.get("competitive") or 0)
    
    # Price changes
    change_1h = float(market.get("oneHourPriceChange") or 0)
    change_24h = float(market.get("oneDayPriceChange") or 0)
    change_1w = float(market.get("oneWeekPriceChange") or 0)
    change_1m = float(market.get("oneMonthPriceChange") or 0)
    
    # Event-level data
    comment_count = int(event.get("commentCount") or 0)
    is_featured = event.get("featured", False)
    
    # Parse end date for time-based scoring
    end_date_str = market.get("endDate") or event.get("endDate")
    days_until_resolution = None
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_until_resolution = max(0, (end_date - now).days)
        except:
            pass

    # === SCORING COMPONENTS (0-100 each) ===
    
    # 1. MOMENTUM SCORE (25%): Recent price movement indicates activity/news
    abs_change_24h = abs(change_24h)
    abs_change_1w = abs(change_1w)
    momentum_score = min(100, (abs_change_24h * 500) + (abs_change_1w * 200))
    
    # 2. VOLUME SCORE (20%): Higher volume = more interest & liquidity
    # Log scale since volume varies wildly
    volume_score = min(100, math.log10(max(1, volume_24h)) * 15)
    
    # 3. LIQUIDITY SCORE (15%): Higher liquidity = easier to trade
    liquidity_score = min(100, math.log10(max(1, liquidity)) * 15)
    
    # 4. SPREAD SCORE (10%): Tighter spread = better execution
    # Invert: lower spread = higher score
    spread_score = max(0, 100 - (spread * 2000))
    
    # 5. UNCERTAINTY SCORE (15%): Prices near 50% have highest uncertainty/opportunity
    # Markets at 50% could go either way - more opportunity for edge
    uncertainty_score = 100 - abs(price - 0.5) * 200
    
    # 6. TIMING SCORE (10%): Prefer markets resolving soon but not immediately
    timing_score = 50  # default
    if days_until_resolution is not None:
        if days_until_resolution < 1:
            timing_score = 30  # Too soon, risky
        elif days_until_resolution < 7:
            timing_score = 100  # Sweet spot
        elif days_until_resolution < 30:
            timing_score = 80
        elif days_until_resolution < 90:
            timing_score = 60
        else:
            timing_score = 40  # Too far out
    
    # 7. ENGAGEMENT SCORE (5%): More comments = more interest
    engagement_score = min(100, math.log10(max(1, comment_count)) * 30)
    if is_featured:
        engagement_score = min(100, engagement_score + 20)
    
    # === WEIGHTED TOTAL SCORE ===
    total_score = (
        momentum_score * 0.25 +
        volume_score * 0.20 +
        liquidity_score * 0.15 +
        spread_score * 0.10 +
        uncertainty_score * 0.15 +
        timing_score * 0.10 +
        engagement_score * 0.05
    )
    
    # Build the enriched market object
    return {
        "id": market.get("conditionId") or market.get("id") or "",
        "question": market.get("question") or event.get("title") or "Unknown",
        "description": market.get("description") or event.get("description") or "",
        "yes_price": price,
        "no_price": 1 - price,
        "best_bid": float(market.get("bestBid")) if market.get("bestBid") else None,
        "best_ask": float(market.get("bestAsk")) if market.get("bestAsk") else None,
        "spread": spread,
        "volume": float(market.get("volume") or 0),
        "volume_24h": volume_24h,
        "volume_1w": volume_1w,
        "liquidity": liquidity,
        "one_hour_change": change_1h,
        "one_day_change": change_24h,
        "one_week_change": change_1w,
        "one_month_change": change_1m,
        "competitive": competitive,
        "comment_count": comment_count,
        "is_featured": is_featured,
        "end_date": end_date_str,
        "days_until_resolution": days_until_resolution,
        "image": market.get("image") or event.get("image"),
        "tags": [t.get("label") for t in event.get("tags", [])],
        # Scoring breakdown
        "opportunity_score": round(total_score, 1),
        "score_breakdown": {
            "momentum": round(momentum_score, 1),
            "volume": round(volume_score, 1),
            "liquidity": round(liquidity_score, 1),
            "spread": round(spread_score, 1),
            "uncertainty": round(uncertainty_score, 1),
            "timing": round(timing_score, 1),
            "engagement": round(engagement_score, 1),
        }
    }


async def get_top_opportunities(limit: int = 10, fetch_limit: int = 100) -> List[Dict[str, Any]]:
    """
    Fetch markets from Polymarket, analyze them, and return the top opportunities.

    Args:
        limit: Number of top opportunities to return
        fetch_limit: Number of markets to fetch and analyze

    Returns:
        List of top markets sorted by opportunity score
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch active events with full data
        response = await client.get(
            f"{GAMMA_API_URL}/events",
            params={
                "active": "true",
                "closed": "false",
                "limit": fetch_limit,
                "order": "volume24hr",
                "ascending": "false"
            }
        )
        response.raise_for_status()
        events = response.json()

    # Analyze all markets
    analyzed_markets = []
    for event in events:
        event_markets = event.get("markets", [])
        for market in event_markets:
            if market.get("active", True) and market.get("acceptingOrders", True):
                analyzed = calculate_opportunity_score(market, event)
                analyzed_markets.append(analyzed)

    # Sort by opportunity score (descending) and return top N
    analyzed_markets.sort(key=lambda x: x["opportunity_score"], reverse=True)
    return analyzed_markets[:limit]

