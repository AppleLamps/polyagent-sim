const API_BASE = 'http://localhost:8000';

export async function fetchMarkets() {
  const response = await fetch(`${API_BASE}/markets`);
  if (!response.ok) throw new Error('Failed to fetch markets');
  return response.json();
}

export async function analyzeMarket(market) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      market_id: market.id,
      question: market.question,
      description: market.description,
      current_price: market.yes_price,
      end_date: market.end_date,
      one_day_change: market.one_day_change,
      one_week_change: market.one_week_change,
      volume_24h: market.volume_24h
    })
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

