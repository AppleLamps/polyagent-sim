import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { searchMarkets, fetchTopOpportunities } from '../api';

function MarketScanner({ markets, loading, selectedMarket, onSelectMarket }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('volume_24h');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'top'
  const [topOpportunities, setTopOpportunities] = useState([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // Load top opportunities when switching to that view
  useEffect(() => {
    if (viewMode === 'top' && topOpportunities.length === 0) {
      loadTopOpportunities();
    }
  }, [viewMode]);

  const loadTopOpportunities = async () => {
    setLoadingTop(true);
    try {
      const data = await fetchTopOpportunities(10);
      setTopOpportunities(data);
    } catch (err) {
      console.error('Failed to load top opportunities:', err);
    } finally {
      setLoadingTop(false);
    }
  };

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

  // Server-side search handler
  const handleServerSearch = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchMarkets(searchTerm);
      setSearchResults(results);
    } catch (err) {
      setSearchError('Search failed. Try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  // Clear server search and go back to main markets
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults(null);
    setSearchError(null);
  }, []);

  // Use search results if available, otherwise filter local markets
  const displayMarkets = searchResults !== null ? searchResults : markets;

  // Filter and sort markets (create a copy to avoid mutating original)
  const filteredMarkets = useMemo(() => {
    // For local filtering (when no server search active)
    const filtered = searchResults !== null
      ? displayMarkets
      : displayMarkets.filter(m =>
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
  }, [displayMarkets, searchResults, searchTerm, sortBy]);

  return (
    <div className="card h-[calc(100vh-180px)] flex flex-col">
      <div className="pb-3 border-b border-black mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-black">Market Scanner</h2>
          <span className="text-xs text-text-dark">
            {viewMode === 'top' ? topOpportunities.length : filteredMarkets.length} markets
          </span>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'all'
              ? 'bg-black text-white'
              : 'bg-white text-black border border-black hover:bg-bg-light'
              }`}
          >
            All Markets
          </button>
          <button
            onClick={() => setViewMode('top')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'top'
              ? 'bg-black text-white'
              : 'bg-white text-black border border-black hover:bg-bg-light'
              }`}
          >
            🎯 Top 10
          </button>
        </div>

        {viewMode === 'all' && (
          <>
            {/* Search with server-side search button */}
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Clear server results when typing to show local filter
                  if (searchResults !== null) setSearchResults(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.length >= 2) {
                    handleServerSearch();
                  }
                }}
                className="input-field text-sm flex-1"
              />
              <button
                onClick={handleServerSearch}
                disabled={searching || searchTerm.length < 2}
                className="px-3 py-1 text-xs bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Search Polymarket for markets not in top 100"
              >
                {searching ? '...' : '🔍'}
              </button>
              {searchResults !== null && (
                <button
                  onClick={clearSearch}
                  className="px-2 py-1 text-xs border border-black hover:bg-bg-light transition-colors"
                  title="Clear search and show all markets"
                >
                  ✕
                </button>
              )}
            </div>
            {searchError && (
              <div className="text-xs text-red-600 mb-2">{searchError}</div>
            )}
            {searchResults !== null && (
              <div className="text-xs text-text-dark mb-2 italic">
                Showing {searchResults.length} search results for "{searchTerm}"
              </div>
            )}

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
          </>
        )}

        {viewMode === 'top' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-dark">
              Ranked by opportunity score
            </span>
            <button
              onClick={loadTopOpportunities}
              disabled={loadingTop}
              className="text-xs text-text-dark hover:text-black"
            >
              {loadingTop ? '...' : '↻ Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Top Opportunities View */}
      {viewMode === 'top' && (
        <>
          {loadingTop ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-text-dark">Analyzing markets...</div>
              </div>
            </div>
          ) : topOpportunities.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-lg font-medium text-black mb-2">No Opportunities</div>
                <button onClick={loadTopOpportunities} className="btn-secondary text-sm">
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {topOpportunities.map((market, idx) => (
                <button
                  key={market.id}
                  onClick={() => onSelectMarket(market)}
                  className={`w-full text-left p-3 border transition-colors ${selectedMarket?.id === market.id
                    ? 'border-black bg-bg-light'
                    : 'border-accent-gray hover:border-black hover:bg-bg-light'
                    }`}
                >
                  {/* Rank and score badge */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-black text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="text-sm font-medium text-black line-clamp-2 flex-1">
                      {market.question}
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-black text-white flex-shrink-0">
                      {market.opportunity_score}
                    </span>
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
                    {market.days_until_resolution !== null && (
                      <span className="text-xs text-text-dark">
                        {market.days_until_resolution === 0 ? 'Today' : `${market.days_until_resolution}d`}
                      </span>
                    )}
                  </div>

                  {/* Score breakdown mini bar */}
                  <div className="flex gap-0.5 h-1">
                    <div className="bg-black" style={{ width: `${market.score_breakdown?.momentum || 0}%` }} title="Momentum" />
                    <div className="bg-gray-600" style={{ width: `${market.score_breakdown?.volume || 0}%` }} title="Volume" />
                    <div className="bg-gray-400" style={{ width: `${market.score_breakdown?.uncertainty || 0}%` }} title="Uncertainty" />
                  </div>

                  {/* Tags */}
                  {market.tags && market.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {market.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[10px] px-1 py-0.5 border border-accent-gray text-text-dark">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* All Markets View */}
      {viewMode === 'all' && (
        <>
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
                        24h: ${Math.round(market.volume_24h).toLocaleString()}
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
        </>
      )}
    </div>
  );
}

export default MarketScanner;

