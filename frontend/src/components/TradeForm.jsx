import React, { useState } from 'react';
import { simulateTrade } from '../api';

function TradeForm({ market, analysis, balance, onTradeComplete }) {
  const [amount, setAmount] = useState('100');
  const [direction, setDirection] = useState('YES');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (numAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const price = direction === 'YES' ? market.yes_price : market.no_price;
      await simulateTrade(
        market.id,
        market.question,
        numAmount,
        direction,
        price
      );
      setAmount('100');
      onTradeComplete();
    } catch (err) {
      setError('Failed to place trade');
    } finally {
      setLoading(false);
    }
  };

  const suggestedDirection = analysis.edge > 0 ? 'YES' : 'NO';
  const currentPrice = direction === 'YES' ? market.yes_price : market.no_price;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-black">
        <h4 className="font-medium text-black">Place Virtual Bet</h4>
        {analysis.edge > 0 && (
          <span className="text-xs text-text-dark">
            AI suggests: <span className="font-bold text-black">{suggestedDirection}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="p-2 border border-black bg-bg-light text-sm text-black">
          {error}
        </div>
      )}

      {/* Direction toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection('YES')}
          className={`py-3 font-medium transition-colors ${direction === 'YES'
              ? 'bg-black text-white'
              : 'bg-white text-black border border-black hover:bg-bg-light'
            }`}
        >
          YES @ {(market.yes_price * 100).toFixed(1)}%
        </button>
        <button
          type="button"
          onClick={() => setDirection('NO')}
          className={`py-3 font-medium transition-colors ${direction === 'NO'
              ? 'bg-black text-white'
              : 'bg-white text-black border border-black hover:bg-bg-light'
            }`}
        >
          NO @ {(market.no_price * 100).toFixed(1)}%
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-sm text-text-dark mb-1">Amount (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field flex-1 font-mono"
            placeholder="100"
            min="1"
            step="1"
          />
          <button
            type="button"
            onClick={() => setAmount(Math.floor(balance).toString())}
            className="btn-secondary text-sm"
          >
            MAX
          </button>
        </div>
        <div className="text-xs text-text-dark mt-1">
          Available: ${balance.toFixed(2)}
        </div>
      </div>

      {/* Potential return */}
      <div className="p-3 bg-bg-light border border-accent-gray">
        <div className="flex justify-between text-sm">
          <span className="text-text-dark">Potential Return:</span>
          <span className="font-mono font-medium text-black">
            ${((parseFloat(amount) || 0) / currentPrice).toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !market || !analysis}
        className={`btn-primary w-full py-3 text-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''
          } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? '⏳ Placing Trade...' : `Place ${direction} Trade`}
      </button>
    </form>
  );
}

export default TradeForm;

