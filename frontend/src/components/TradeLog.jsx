import React from 'react';

function TradeLog({ trades }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between pb-3 border-b border-black mb-3">
        <h2 className="text-lg font-bold text-black">Trade Log</h2>
        <span className="text-xs text-text-dark">{trades.length} active positions</span>
      </div>

      {trades.length === 0 ? (
        <div className="py-8 text-center text-text-dark">
          No active trades yet. Analyze a market and place a virtual bet!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2 text-text-dark font-medium">Market</th>
                <th className="text-center py-2 text-text-dark font-medium">Side</th>
                <th className="text-right py-2 text-text-dark font-medium">Amount</th>
                <th className="text-right py-2 text-text-dark font-medium">Entry</th>
                <th className="text-right py-2 text-text-dark font-medium">Current</th>
                <th className="text-right py-2 text-text-dark font-medium">P&L</th>
                <th className="text-right py-2 text-text-dark font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-accent-gray hover:bg-bg-light">
                  <td className="py-3 pr-4 max-w-[200px]">
                    <div className="truncate text-black" title={trade.market_question}>
                      {trade.market_question}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-medium ${
                      trade.direction === 'YES' 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black border border-black'
                    }`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-black">
                    {formatCurrency(trade.amount)}
                  </td>
                  <td className="py-3 text-right font-mono text-text-dark">
                    {(trade.entry_price * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 text-right font-mono text-black">
                    {trade.current_price ? `${(trade.current_price * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className={`py-3 text-right font-mono font-medium ${
                    (trade.pnl || 0) >= 0 ? 'text-black' : 'text-text-dark'
                  }`}>
                    {trade.pnl !== null ? (trade.pnl >= 0 ? '+' : '') + formatCurrency(trade.pnl) : '-'}
                  </td>
                  <td className="py-3 text-right text-text-dark text-xs">
                    {formatDate(trade.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TradeLog;

