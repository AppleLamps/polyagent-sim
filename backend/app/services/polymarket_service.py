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
        # Try fetching by condition_id with slug filter to get exact match
        response = await client.get(
            f"{GAMMA_API_URL}/markets/{market_id}"
        )

        # If direct fetch fails, try the query endpoint
        if response.status_code != 200:
            response = await client.get(
                f"{GAMMA_API_URL}/markets",
                params={"condition_id": market_id}
            )

        if response.status_code == 200:
            data = response.json()
            # Handle both single market and list response
            if isinstance(data, list):
                # Find the matching market by conditionId
                for market in data:
                    if market.get("conditionId") == market_id:
                        outcome_prices_raw = market.get("outcomePrices", "[\"0.5\", \"0.5\"]")
                        yes_price, no_price = parse_outcome_prices(outcome_prices_raw)
                        return {
                            "id": market.get("conditionId", ""),
                            "question": market.get("question", ""),
                            "yes_price": yes_price,
                            "no_price": no_price
                        }
            elif isinstance(data, dict):
                market = data
                outcome_prices_raw = market.get("outcomePrices", "[\"0.5\", \"0.5\"]")
                yes_price, no_price = parse_outcome_prices(outcome_prices_raw)
                return {
                    "id": market.get("conditionId", ""),
                    "question": market.get("question", ""),
                    "yes_price": yes_price,
                    "no_price": no_price
                }
    return None


async def get_markets_batch(market_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Fetch multiple markets efficiently by fetching from the events endpoint
    and creating a lookup map. Much faster than N individual API calls.
    Returns a dict mapping market_id -> market data.
    """
    import logging
    logger = logging.getLogger(__name__)

    if not market_ids:
        return {}

    market_map = {}
    market_id_set = set(market_ids)

    # Fetch from events endpoint (same as scanner) - this has full conditionIds
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"{GAMMA_API_URL}/events",
            params={
                "active": "true",
                "closed": "false",
                "limit": 200,  # Fetch many events
                "order": "volume24hr",
                "ascending": "false"
            }
        )
        if response.status_code != 200:
            logger.error(f"Events fetch failed with status {response.status_code}")
            return {}

        events = response.json()
        logger.info(f"Fetched {len(events)} events from Polymarket")

        # Extract all markets from events
        for event in events:
            for market in event.get("markets", []):
                condition_id = market.get("conditionId", "")
                if condition_id in market_id_set:
                    outcome_prices_raw = market.get("outcomePrices", "[\"0.5\", \"0.5\"]")
                    yes_price, no_price = parse_outcome_prices(outcome_prices_raw)
                    market_map[condition_id] = {
                        "id": condition_id,
                        "question": market.get("question", ""),
                        "yes_price": yes_price,
                        "no_price": no_price
                    }

    logger.info(f"Found {len(market_map)} matches in events, {len(market_id_set) - len(market_map)} missing")

    # For any missing markets, try fetching more events or closed markets
    missing_ids = market_id_set - set(market_map.keys())
    if missing_ids:
        logger.info(f"Trying to fetch {len(missing_ids)} missing markets from closed events...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Try closed events too
            response = await client.get(
                f"{GAMMA_API_URL}/events",
                params={
                    "closed": "true",
                    "limit": 100,
                    "order": "endDate",
                    "ascending": "false"
                }
            )
            if response.status_code == 200:
                events = response.json()
                for event in events:
                    for market in event.get("markets", []):
                        condition_id = market.get("conditionId", "")
                        if condition_id in missing_ids:
                            outcome_prices_raw = market.get("outcomePrices", "[\"0.5\", \"0.5\"]")
                            yes_price, no_price = parse_outcome_prices(outcome_prices_raw)
                            market_map[condition_id] = {
                                "id": condition_id,
                                "question": market.get("question", ""),
                                "yes_price": yes_price,
                                "no_price": no_price
                            }

    final_missing = market_id_set - set(market_map.keys())
    if final_missing:
        logger.warning(f"Could not find {len(final_missing)} markets: {[m[:20] for m in final_missing]}")

    return market_map

