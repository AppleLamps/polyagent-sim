import httpx
import json
from typing import List, Dict, Any, Optional

GAMMA_API_URL = "https://gamma-api.polymarket.com"

# Default limit increased to fetch more markets
DEFAULT_MARKET_LIMIT = 100


def parse_outcome_prices(outcome_prices_raw) -> tuple:
    """Parse outcome prices which can be a JSON string or list."""
    try:
        # If it's a string (JSON encoded), parse it
        if isinstance(outcome_prices_raw, str):
            outcome_prices = json.loads(outcome_prices_raw)
        else:
            outcome_prices = outcome_prices_raw or []

        if outcome_prices and len(outcome_prices) >= 1:
            yes_price = float(outcome_prices[0])
            no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 1 - yes_price
            return yes_price, no_price
    except (ValueError, IndexError, json.JSONDecodeError):
        pass
    return 0.5, 0.5


def _parse_market(market: Dict, event: Dict) -> Dict[str, Any]:
    """Parse a market dict into our standard format."""
    # Get all possible price sources
    best_bid = market.get("bestBid")
    best_ask = market.get("bestAsk")
    last_trade = market.get("lastTradePrice")
    outcome_prices_raw = market.get("outcomePrices")

    # Priority 1: Use lastTradePrice if available (most accurate)
    if last_trade is not None:
        yes_price = float(last_trade)
        no_price = 1 - yes_price
    # Priority 2: Use mid of bestBid/bestAsk
    elif best_bid is not None and best_ask is not None:
        yes_price = (float(best_bid) + float(best_ask)) / 2
        no_price = 1 - yes_price
    # Priority 3: Parse outcomePrices
    elif outcome_prices_raw:
        yes_price, no_price = parse_outcome_prices(outcome_prices_raw)
    # Fallback
    else:
        yes_price, no_price = 0.5, 0.5

    # Ensure valid probability range
    yes_price = max(0.001, min(0.999, yes_price))
    no_price = 1 - yes_price

    # Calculate days until resolution
    end_date = market.get("endDate") or event.get("endDate")
    days_until = None
    if end_date:
        try:
            from datetime import datetime
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            now = datetime.now(end_dt.tzinfo)
            days_until = max(0, (end_dt - now).days)
        except:
            pass

    return {
        "id": market.get("conditionId") or market.get("id") or "",
        "question": market.get("question") or event.get("title") or "Unknown",
        "description": market.get("description") or event.get("description") or "",
        "yes_price": yes_price,
        "no_price": no_price,
        "best_bid": float(best_bid) if best_bid is not None else None,
        "best_ask": float(best_ask) if best_ask is not None else None,
        "last_trade_price": float(last_trade) if last_trade is not None else None,
        "volume": float(market.get("volume") or 0),
        "volume_24h": float(market.get("volume24hr") or 0),
        "volume_1w": float(market.get("volume1wk") or 0),
        "liquidity": float(market.get("liquidity") or 0),
        "spread": float(market.get("spread") or 0),
        # Price momentum
        "one_hour_change": float(market.get("oneHourPriceChange") or 0),
        "one_day_change": float(market.get("oneDayPriceChange") or 0),
        "one_week_change": float(market.get("oneWeekPriceChange") or 0),
        "one_month_change": float(market.get("oneMonthPriceChange") or 0),
        # Engagement & metadata
        "competitive": float(market.get("competitive") or 0),
        "comment_count": int(event.get("commentCount") or 0),
        "tags": event.get("tags") or [],
        "featured": event.get("featured", False),
        # Timing
        "end_date": end_date,
        "days_until_resolution": days_until,
        "image": market.get("image") or event.get("image")
    }


async def fetch_active_markets(limit: int = DEFAULT_MARKET_LIMIT) -> List[Dict[str, Any]]:
    """
    Fetch active markets from Polymarket Gamma API.
    Returns a list of markets with their current prices.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch active events
        response = await client.get(
            f"{GAMMA_API_URL}/events",
            params={
                "active": "true",
                "closed": "false",
                "limit": limit,
                "order": "volume24hr",
                "ascending": "false"
            }
        )
        response.raise_for_status()
        events = response.json()

    markets = []
    for event in events:
        # Each event can have multiple markets (outcomes)
        event_markets = event.get("markets", [])
        for market in event_markets:
            # Only include active markets
            if market.get("active", True):
                markets.append(_parse_market(market, event))

    return markets


async def search_markets(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Search for markets by keyword in title/question.
    Uses the Gamma API's title_contains parameter for server-side filtering.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Search events by title
        response = await client.get(
            f"{GAMMA_API_URL}/events",
            params={
                "active": "true",
                "closed": "false",
                "limit": limit,
                "title_contains": query,
                "order": "volume24hr",
                "ascending": "false"
            }
        )
        response.raise_for_status()
        events = response.json()

    markets = []
    for event in events:
        event_markets = event.get("markets", [])
        for market in event_markets:
            if market.get("active", True):
                markets.append(_parse_market(market, event))

    return markets


async def get_market_by_id(market_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a specific market by its condition ID."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{GAMMA_API_URL}/markets",
            params={"condition_id": market_id}
        )
        if response.status_code == 200:
            markets = response.json()
            if markets:
                market = markets[0]
                outcome_prices_raw = market.get("outcomePrices", "[\"0.5\", \"0.5\"]")
                yes_price, no_price = parse_outcome_prices(outcome_prices_raw)

                return {
                    "id": market.get("conditionId", ""),
                    "question": market.get("question", ""),
                    "yes_price": yes_price,
                    "no_price": no_price
                }
    return None

