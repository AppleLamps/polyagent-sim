// Use environment variable for API base URL, with fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchMarkets() {
  const response = await fetch(`${API_BASE}/markets`);
  if (!response.ok) throw new Error('Failed to fetch markets');
  return response.json();
}

export async function searchMarkets(query) {
  const response = await fetch(`${API_BASE}/markets/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search markets');
  return response.json();
}

export async function fetchTopOpportunities(limit = 10) {
  const response = await fetch(`${API_BASE}/markets/top?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch top opportunities');
  return response.json();
}

export async function analyzeMarket(market, portfolio = null) {
  const body = {
    market_id: market.id,
    question: market.question,
    description: market.description,
    current_price: market.yes_price,
    end_date: market.end_date,
    // Price momentum
    one_hour_change: market.one_hour_change,
    one_day_change: market.one_day_change,
    one_week_change: market.one_week_change,
    one_month_change: market.one_month_change,
    // Volume & liquidity
    volume_24h: market.volume_24h,
    volume_1w: market.volume_1w,
    liquidity: market.liquidity,
    spread: market.spread,
    // Engagement & metadata
    comment_count: market.comment_count,
    competitive: market.competitive,
    tags: market.tags,
    days_until_resolution: market.days_until_resolution
  };

  // Add portfolio context if available
  if (portfolio) {
    body.portfolio = {
      balance: portfolio.balance,
      total_pnl: portfolio.total_pnl,
      active_trades: (portfolio.active_trades || []).map(t => ({
        market_id: t.market_id,
        market_question: t.market_question,
        direction: t.direction,
        amount: t.amount,
        entry_price: t.entry_price,
        current_price: t.current_price,
        pnl: t.pnl
      }))
    };
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to analyze market');
  return response.json();
}

export async function simulateTrade(marketId, marketQuestion, amount, direction, price) {
  const response = await fetch(`${API_BASE}/simulate-trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      market_id: marketId,
      market_question: marketQuestion,
      amount: parseFloat(amount),
      direction: direction,
      price: price
    })
  });
  if (!response.ok) throw new Error('Failed to place trade');
  return response.json();
}

export async function fetchPortfolio() {
  const response = await fetch(`${API_BASE}/portfolio`);
  if (!response.ok) throw new Error('Failed to fetch portfolio');
  return response.json();
}

export async function resetPortfolio() {
  const response = await fetch(`${API_BASE}/reset-portfolio`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to reset portfolio');
  return response.json();
}

export async function calculatePotentialReturn(amount, price) {
  const response = await fetch(`${API_BASE}/calculate-return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, price })
  });
  if (!response.ok) throw new Error('Failed to calculate return');
  return response.json();
}

