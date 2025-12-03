import React, { useState } from 'react';
import { resetPortfolio } from '../api';
import { usePortfolio } from '../context/PortfolioContext';

function TopBar({ onRefresh }) {
  const [resetting, setResetting] = useState(false);
  const { balance, totalPnl, refreshPortfolio } = usePortfolio();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset your portfolio?\n\n' +
      'This will:\n' +
      '• Delete all active trades\n' +
      '• Reset balance to $100,000\n' +
      '• Clear all trade history\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      await resetPortfolio();
      await refreshPortfolio();
    } catch (err) {
      alert('Failed to reset portfolio: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="bg-white border-b border-black">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* App Name */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-black tracking-tight">
              PolyAgent Sim
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-black text-white">
              VIRTUAL
            </span>
          </div>

          {/* Balance & PnL */}
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-xs text-text-dark uppercase tracking-wide">Balance</div>
              <div className="text-2xl font-bold text-black font-mono">
                {formatCurrency(balance)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-text-dark uppercase tracking-wide">Total P&L</div>
              <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-black' : 'text-text-dark'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                className="btn-secondary text-sm"
              >
                Refresh
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className={`btn-secondary text-sm ${resetting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {resetting ? 'Resetting...' : 'Reset Portfolio'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;

