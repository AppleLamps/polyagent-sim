import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';

function PortfolioPanel() {
  const { portfolio, refreshPortfolio, loading } = usePortfolio();
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh portfolio every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshPortfolio();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshPortfolio]);

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

  const trades = portfolio?.active_trades || [];
  const balance = portfolio?.balance || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const totalInvested = trades.reduce((sum, t) => sum + t.amount, 0);
  const portfolioValue = balance + totalInvested + totalPnl;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black mb-4">
        <h2 className="text-lg font-bold text-black">Portfolio</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-2 py-1 ${autoRefresh ? 'bg-black text-white' : 'bg-white text-black border border-black'}`}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            {autoRefresh ? '🔄 Live' : '⏸️ Paused'}
          </button>
          <button
            onClick={refreshPortfolio}
            disabled={loading}
            className="text-xs px-2 py-1 bg-white text-black border border-black hover:bg-bg-light disabled:opacity-50"
          >
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium -mb-px ${
            activeTab === 'overview'
              ? 'border-b-2 border-black text-black'
              : 'text-text-dark hover:text-black'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 text-sm font-medium -mb-px ${
            activeTab === 'positions'
              ? 'border-b-2 border-black text-black'
              : 'text-text-dark hover:text-black'
          }`}
        >
          Positions ({trades.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Portfolio Value */}
          <div className="p-4 bg-black text-white">
            <div className="text-xs uppercase tracking-wide opacity-70">Total Portfolio Value</div>
            <div className="text-3xl font-bold font-mono mt-1">{formatCurrency(portfolioValue)}</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-light border border-accent-gray">
              <div className="text-xs text-text-dark uppercase">Cash Balance</div>
              <div className="text-lg font-bold font-mono text-black">{formatCurrency(balance)}</div>
            </div>
            <div className="p-3 bg-bg-light border border-accent-gray">
              <div className="text-xs text-text-dark uppercase">Invested</div>
              <div className="text-lg font-bold font-mono text-black">{formatCurrency(totalInvested)}</div>
            </div>
            <div className={`p-3 border ${totalPnl >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="text-xs text-text-dark uppercase">Unrealized P&L</div>
              <div className={`text-lg font-bold font-mono ${totalPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex justify-between text-sm text-text-dark pt-2 border-t border-accent-gray">
            <span>Active Positions: <span className="font-medium text-black">{trades.length}</span></span>
            <span>
              Return: <span className={`font-medium ${totalPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(1) : '0.0'}%
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <PositionsTable trades={trades} formatCurrency={formatCurrency} formatDate={formatDate} />
      )}
    </div>
  );
}

function PositionsTable({ trades, formatCurrency, formatDate }) {
  if (trades.length === 0) {
    return (
      <div className="py-8 text-center text-text-dark">
        No active positions. Analyze a market and place a trade!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-2 px-4 text-text-dark font-medium">Market</th>
            <th className="text-center py-2 text-text-dark font-medium">Side</th>
            <th className="text-right py-2 text-text-dark font-medium">Amount</th>
            <th className="text-right py-2 text-text-dark font-medium">Entry</th>
            <th className="text-right py-2 text-text-dark font-medium">Current</th>
            <th className="text-right py-2 px-4 text-text-dark font-medium">P&L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const pnlPercent = trade.entry_price > 0 ? ((trade.pnl || 0) / trade.amount) * 100 : 0;
            return (
              <tr key={trade.id} className="border-b border-accent-gray hover:bg-bg-light">
                <td className="py-3 px-4 max-w-[180px]">
                  <div className="truncate text-black font-medium" title={trade.market_question}>
                    {trade.market_question}
                  </div>
                  <div className="text-xs text-text-dark">{formatDate(trade.created_at)}</div>
                </td>
                <td className="py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-bold ${
                    trade.direction === 'YES' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 text-right font-mono text-black">{formatCurrency(trade.amount)}</td>
                <td className="py-3 text-right font-mono text-text-dark">{(trade.entry_price * 100).toFixed(1)}%</td>
                <td className="py-3 text-right font-mono text-black">
                  {trade.current_price ? `${(trade.current_price * 100).toFixed(1)}%` : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`font-mono font-bold ${(trade.pnl || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {(trade.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(trade.pnl || 0)}
                  </div>
                  <div className={`text-xs ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PortfolioPanel;

