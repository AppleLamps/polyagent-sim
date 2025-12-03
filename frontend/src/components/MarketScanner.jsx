import React, { useState, useMemo } from 'react';

function MarketScanner({ markets, loading, selectedMarket, onSelectMarket }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('volume_24h');

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return `${(value * 100).toFixed(1)}%`;
  };
  const formatChange = (value) => {
    if (!value) return null;
    const pct = (value * 100).toFixed(1);
    return value > 0 ? `+${pct}%` : `${pct}%`;
  };

  // Check if market is "hot" (high volume + significant price movement)
  const isHot = (market) => {
    return market.volume_24h > 10000 && Math.abs(market.one_day_change || 0) > 0.03;
  };

  // Filter and sort markets (create a copy to avoid mutating original)
  const filteredMarkets = useMemo(() => {
    const filtered = markets.filter(m =>
      m.question.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Create a shallow copy before sorting to avoid mutating
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'volume_24h') return (b.volume_24h || 0) - (a.volume_24h || 0);
      if (sortBy === 'change') return Math.abs(b.one_day_change || 0) - Math.abs(a.one_day_change || 0);
      if (sortBy === 'price') return (b.yes_price || 0) - (a.yes_price || 0);
      if (sortBy === 'ending') {
        const aDate = a.end_date ? new Date(a.end_date).getTime() : Infinity;
        const bDate = b.end_date ? new Date(b.end_date).getTime() : Infinity;
        return aDate - bDate;
      }
      return 0;
    });

    return sorted;
  }, [markets, searchTerm, sortBy]);

  return (
    <div className="card h-[calc(100vh-180px)] flex flex-col">
      <div className="pb-3 border-b border-black mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-black">Market Scanner</h2>
          <span className="text-xs text-text-dark">{filteredMarkets.length} markets</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search markets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field text-sm mb-2"
        />

        {/* Sort buttons */}
        <div className="flex gap-1">
          {[
            { key: 'volume_24h', label: 'Volume' },
            { key: 'change', label: 'Movers' },
            { key: 'ending', label: 'Ending' },
            { key: 'price', label: 'Price' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2 py-1 text-xs transition-colors ${sortBy === key
                ? 'bg-black text-white'
                : 'bg-white text-black border border-black hover:bg-bg-light'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-text-dark">Loading markets...</div>
          </div>
        </div>
      ) : markets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-lg font-medium text-black mb-2">No Markets Available</div>
            <div className="text-sm text-text-dark mb-4">
              Unable to fetch markets from Polymarket.<br />
              Check your internet connection and try again.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-lg font-medium text-black mb-2">No Results</div>
            <div className="text-sm text-text-dark mb-4">
              No markets match "{searchTerm}"
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="btn-secondary text-sm"
            >
              Clear Search
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredMarkets.map((market) => (
            <button
              key={market.id}
              onClick={() => onSelectMarket(market)}
              className={`w-full text-left p-3 border transition-colors ${selectedMarket?.id === market.id
                ? 'border-black bg-bg-light'
                : 'border-accent-gray hover:border-black hover:bg-bg-light'
                }`}
            >
              {/* Header with hot badge */}
              <div className="flex items-start gap-2 mb-2">
                <div className="text-sm font-medium text-black line-clamp-2 flex-1">
                  {market.question}
                </div>
                {isHot(market) && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-black text-white flex-shrink-0">
                    HOT
                  </span>
                )}
              </div>

              {/* Price and change */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-black">
                    {formatPercent(market.yes_price)}
                  </span>
                  {market.one_day_change !== null && market.one_day_change !== 0 && (
                    <span className={`text-xs font-mono ${market.one_day_change > 0 ? 'text-black' : 'text-text-dark'}`}>
                      {formatChange(market.one_day_change)}
                    </span>
                  )}
                </div>

                {market.volume_24h > 0 && (
                  <span className="text-xs text-text-dark">
                    24h: ${market.volume_24h >= 1000 ? `${(market.volume_24h / 1000).toFixed(0)}K` : market.volume_24h.toFixed(0)}
                  </span>
                )}
              </div>

              {/* Mini price bar */}
              <div className="h-1 bg-accent-gray w-full">
                <div
                  className="h-full bg-black"
                  style={{ width: `${(market.yes_price || 0) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketScanner;

