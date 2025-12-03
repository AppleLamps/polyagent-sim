import json
import re
from typing import Dict, Any, Optional
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import web_search, x_search
from ..config import get_settings


def analyze_market(
    question: str,
    current_price: float,
    description: Optional[str] = None,
    end_date: Optional[str] = None,
    one_day_change: Optional[float] = None,
    one_week_change: Optional[float] = None,
    volume_24h: Optional[float] = None
) -> Dict[str, Any]:
    """
    Use Grok-4-1-fast with agentic search to analyze a prediction market.
    Returns estimated probability, reasoning, confidence, key events, and risks.
    """
    settings = get_settings()
    client = Client(api_key=settings.xai_api_key)

    # Create chat with agentic search tools (web + X)
    chat = client.chat.create(
        model="grok-4-1-fast",
        tools=[
            web_search(),
            x_search(),
        ],
    )

    # Build context section
    context_parts = [f"CURRENT MARKET PRICE: {current_price:.1%}"]

    if description:
        context_parts.append(f"RESOLUTION CRITERIA: {description[:1000]}")
    if end_date:
        context_parts.append(f"RESOLUTION DATE: {end_date}")
    if one_day_change is not None:
        direction = "↑" if one_day_change > 0 else "↓" if one_day_change < 0 else "→"
        context_parts.append(f"24H PRICE CHANGE: {direction} {abs(one_day_change)*100:.1f}%")
    if one_week_change is not None:
        direction = "↑" if one_week_change > 0 else "↓" if one_week_change < 0 else "→"
        context_parts.append(f"7D PRICE CHANGE: {direction} {abs(one_week_change)*100:.1f}%")
    if volume_24h is not None and volume_24h > 0:
        context_parts.append(f"24H VOLUME: ${volume_24h:,.0f}")

    context = "\n".join(context_parts)

    prompt = f"""You are an expert prediction market analyst. Analyze this market and provide a probability estimate.

MARKET QUESTION: {question}

{context}

TASK:
1. Search the web for current news, data, and expert opinions relevant to this question
2. Search X/Twitter for real-time sentiment, breaking news, and insider perspectives
3. Consider the resolution criteria carefully
4. Analyze price momentum (recent price changes may indicate new information)
5. Estimate the TRUE probability this event will resolve YES

Return your analysis as a JSON object with this EXACT structure:
{{
    "estimated_probability": <float between 0.0 and 1.0>,
    "confidence": "<low|medium|high>",
    "reasoning": "<detailed multi-paragraph analysis with line breaks between sections>",
    "key_events": ["<upcoming event/date 1>", "<upcoming event/date 2>"],
    "risks": ["<risk to your thesis 1>", "<risk to your thesis 2>"],
    "sources": ["<url1>", "<url2>", ...]
}}

GUIDELINES:
- Be precise with probability. Don't default to 50%.
- If market has moved significantly, explain why (new information?)
- For "confidence": use "high" only if evidence is strong and recent
- List specific upcoming dates/events that could move the market
- Acknowledge risks that could invalidate your analysis
- Use line breaks in reasoning for readability

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

    # Add citations from agentic search
    if hasattr(response, 'citations') and response.citations:
        existing_sources = result.get("sources", [])
        result["sources"] = list(set(existing_sources + list(response.citations)))

    return result

