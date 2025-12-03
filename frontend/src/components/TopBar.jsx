import React from 'react';

function TopBar({ balance, pnl, onRefresh }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
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
              <div className={`text-xl font-bold font-mono ${pnl >= 0 ? 'text-black' : 'text-text-dark'}`}>
                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
              </div>
            </div>

            <button
              onClick={onRefresh}
              className="btn-secondary text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;

