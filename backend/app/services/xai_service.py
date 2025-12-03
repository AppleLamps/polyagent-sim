import json
import re
from typing import Dict, Any, Optional, List
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import web_search, x_search
from ..config import get_settings


def analyze_market(
    question: str,
    current_price: float,
    description: Optional[str] = None,
    end_date: Optional[str] = None,
    one_hour_change: Optional[float] = None,
    one_day_change: Optional[float] = None,
    one_week_change: Optional[float] = None,
    one_month_change: Optional[float] = None,
    volume_24h: Optional[float] = None,
    volume_1w: Optional[float] = None,
    liquidity: Optional[float] = None,
    spread: Optional[float] = None,
    comment_count: Optional[int] = None,
    competitive: Optional[float] = None,
    tags: Optional[list] = None,
    days_until_resolution: Optional[int] = None,
    portfolio: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Use AI with agentic search to analyze a prediction market.
    Model is configurable via XAI_MODEL env var (default: grok-4-1-fast).
    Returns estimated probability, reasoning, confidence, key events, and risks.
    """
    settings = get_settings()
    client = Client(api_key=settings.xai_api_key)

    # Create chat with agentic search tools (web + X)
    # Model is configurable via settings.xai_model
    chat = client.chat.create(
        model=settings.xai_model,
        tools=[
            web_search(),
            x_search(),
        ],
    )

    # Build context section with all available market data
    context_parts = [f"CURRENT MARKET PRICE: {current_price:.1%}"]

    if description:
        context_parts.append(f"RESOLUTION CRITERIA: {description[:1500]}")
    if end_date:
        context_parts.append(f"RESOLUTION DATE: {end_date}")
    if days_until_resolution is not None:
        if days_until_resolution == 0:
            context_parts.append("TIME TO RESOLUTION: TODAY (imminent)")
        elif days_until_resolution <= 7:
            context_parts.append(f"TIME TO RESOLUTION: {days_until_resolution} days (short-term)")
        else:
            context_parts.append(f"TIME TO RESOLUTION: {days_until_resolution} days")

    # Price momentum - very important for analysis
    momentum_parts = []
    if one_hour_change is not None and one_hour_change != 0:
        direction = "↑" if one_hour_change > 0 else "↓"
        momentum_parts.append(f"1h: {direction}{abs(one_hour_change)*100:.1f}%")
    if one_day_change is not None and one_day_change != 0:
        direction = "↑" if one_day_change > 0 else "↓"
        momentum_parts.append(f"24h: {direction}{abs(one_day_change)*100:.1f}%")
    if one_week_change is not None and one_week_change != 0:
        direction = "↑" if one_week_change > 0 else "↓"
        momentum_parts.append(f"7d: {direction}{abs(one_week_change)*100:.1f}%")
    if one_month_change is not None and one_month_change != 0:
        direction = "↑" if one_month_change > 0 else "↓"
        momentum_parts.append(f"30d: {direction}{abs(one_month_change)*100:.1f}%")
    if momentum_parts:
        context_parts.append(f"PRICE MOMENTUM: {', '.join(momentum_parts)}")

    # Volume and liquidity - indicates market quality
    if volume_24h is not None and volume_24h > 0:
        context_parts.append(f"24H TRADING VOLUME: ${volume_24h:,.0f}")
    if volume_1w is not None and volume_1w > 0:
        context_parts.append(f"7D TRADING VOLUME: ${volume_1w:,.0f}")
    if liquidity is not None and liquidity > 0:
        context_parts.append(f"MARKET LIQUIDITY: ${liquidity:,.0f}")
    if spread is not None:
        context_parts.append(f"BID-ASK SPREAD: {spread:.1%}")

    # Engagement and competitiveness
    if comment_count is not None and comment_count > 0:
        context_parts.append(f"COMMUNITY DISCUSSION: {comment_count} comments")
    if competitive is not None:
        if competitive > 0.7:
            context_parts.append(f"COMPETITIVENESS: High ({competitive:.0%}) - market is close/uncertain")
        elif competitive > 0.3:
            context_parts.append(f"COMPETITIVENESS: Medium ({competitive:.0%})")
        else:
            context_parts.append(f"COMPETITIVENESS: Low ({competitive:.0%}) - outcome seems clear")

    # Category tags
    if tags and len(tags) > 0:
        context_parts.append(f"CATEGORIES: {', '.join(tags[:5])}")

    context = "\n".join(context_parts)

    # Build portfolio context if available
    portfolio_context = ""
    if portfolio:
        balance = portfolio.get("balance", 0)
        total_pnl = portfolio.get("total_pnl", 0)
        active_trades = portfolio.get("active_trades", [])

        portfolio_parts = [
            f"\n\nPORTFOLIO STATUS:",
            f"Available Balance: ${balance:,.2f}",
            f"Total P&L: ${total_pnl:+,.2f}"
        ]

        # Check for existing position in this market
        existing_position = None
        for trade in active_trades:
            if trade.get("market_id") == question or trade.get("market_question") == question:
                existing_position = trade
                break

        if existing_position:
            portfolio_parts.append(f"\nEXISTING POSITION IN THIS MARKET:")
            portfolio_parts.append(f"  Direction: {existing_position.get('direction')}")
            portfolio_parts.append(f"  Amount: ${existing_position.get('amount', 0):,.2f}")
            portfolio_parts.append(f"  Entry Price: {existing_position.get('entry_price', 0):.1%}")
            if existing_position.get('pnl') is not None:
                portfolio_parts.append(f"  Current P&L: ${existing_position.get('pnl', 0):+,.2f}")

        if active_trades and len(active_trades) > 0:
            portfolio_parts.append(f"\nOTHER ACTIVE TRADES: {len(active_trades)} positions")

        portfolio_context = "\n".join(portfolio_parts)

    # Build prompt with or without portfolio
    recommendation_section = ""
    if portfolio:
        recommendation_section = """,
    "recommendation": {{
        "action": "<BUY_YES|BUY_NO|HOLD|SKIP>",
        "amount": <recommended USDC amount or null if SKIP/HOLD>,
        "reasoning": "<why this specific trade recommendation>",
        "risk_level": "<low|medium|high>",
        "kelly_fraction": <optimal bet size as decimal 0.0-1.0 based on edge and confidence>
    }}"""

    prompt = f"""You are an expert prediction market analyst and portfolio manager. Analyze this market and provide a probability estimate with a specific trade recommendation.

MARKET QUESTION: {question}

{context}{portfolio_context}

TASK:
1. Search the web for current news, data, and expert opinions relevant to this question
2. Search X/Twitter for real-time sentiment, breaking news, and insider perspectives
3. Consider the resolution criteria carefully
4. Analyze price momentum (recent price changes may indicate new information)
5. Estimate the TRUE probability this event will resolve YES
6. Provide a specific trade recommendation based on edge, confidence, and portfolio status

Return your analysis as a JSON object with this EXACT structure:
{{
    "estimated_probability": <float between 0.0 and 1.0>,
    "confidence": "<low|medium|high>",
    "reasoning": "<detailed multi-paragraph analysis with line breaks between sections>",
    "key_events": ["<upcoming event/date 1>", "<upcoming event/date 2>"],
    "risks": ["<risk to your thesis 1>", "<risk to your thesis 2>"],
    "sources": ["<url1>", "<url2>", ...]{recommendation_section}
}}

GUIDELINES:
- Be precise with probability. Don't default to 50%.
- If market has moved significantly, explain why (new information?)
- For "confidence": use "high" only if evidence is strong and recent
- List specific upcoming dates/events that could move the market
- Acknowledge risks that could invalidate your analysis
- Use line breaks in reasoning for readability

TRADE RECOMMENDATION GUIDELINES:
- BUY_YES: If your probability > market price (positive edge on YES)
- BUY_NO: If your probability < market price (positive edge on NO)
- HOLD: If already have a position and should keep it
- SKIP: If edge is too small (<5%), confidence is low, or risk is too high
- Amount should be based on Kelly Criterion: edge * balance / odds, but be conservative (use fractional Kelly ~25%)
- Never recommend more than 10% of balance on a single trade
- Consider existing positions - don't double down recklessly
- If balance is low (<$50), recommend smaller amounts

Only return the JSON object, no other text."""

    # Add user message and get response
    chat.append(user(prompt))
    response = chat.sample()

    content = response.content

    # Parse JSON from response
    try:
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "estimated_probability": current_price,
            "confidence": "low",
            "reasoning": content,
            "key_events": [],
            "risks": [],
            "sources": []
        }

    # Ensure required fields exist
    result.setdefault("confidence", "medium")
    result.setdefault("key_events", [])
    result.setdefault("risks", [])
    result.setdefault("sources", [])

    # Ensure probability is valid
    prob = result.get("estimated_probability", current_price)
    if isinstance(prob, str):
        prob = float(prob.strip('%')) / 100 if '%' in prob else float(prob)
    result["estimated_probability"] = max(0.0, min(1.0, prob))

    # Validate recommendation if present
    if "recommendation" in result and result["recommendation"]:
        rec = result["recommendation"]
        # Ensure valid action
        valid_actions = ["BUY_YES", "BUY_NO", "HOLD", "SKIP"]
        if rec.get("action") not in valid_actions:
            rec["action"] = "SKIP"
        # Ensure valid risk level
        if rec.get("risk_level") not in ["low", "medium", "high"]:
            rec["risk_level"] = "medium"
        # Ensure amount is reasonable
        if rec.get("amount") is not None:
            rec["amount"] = max(0, float(rec["amount"]))
        # Ensure kelly fraction is valid
        if rec.get("kelly_fraction") is not None:
            rec["kelly_fraction"] = max(0.0, min(1.0, float(rec["kelly_fraction"])))

    # Add citations from agentic search
    if hasattr(response, 'citations') and response.citations:
        existing_sources = result.get("sources", [])
        result["sources"] = list(set(existing_sources + list(response.citations)))

    return result

