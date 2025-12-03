import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MarketScanner from './components/MarketScanner';
import AnalysisPanel from './components/AnalysisPanel';
import TradeLog from './components/TradeLog';
import { fetchMarkets, fetchPortfolio } from './api';

function App() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [portfolio, setPortfolio] = useState({ balance: 10000, active_trades: [], total_pnl: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [marketsData, portfolioData] = await Promise.all([
        fetchMarkets(),
        fetchPortfolio()
      ]);
      setMarkets(marketsData);
      setPortfolio(portfolioData);
      setError(null);
    } catch (err) {
      setError('Failed to load data. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshPortfolio = async () => {
    try {
      const portfolioData = await fetchPortfolio();
      setPortfolio(portfolioData);
    } catch (err) {
      console.error('Failed to refresh portfolio:', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light">
      <TopBar balance={portfolio.balance} pnl={portfolio.total_pnl} onRefresh={loadData} />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 border border-black bg-white text-black">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Market Scanner */}
          <div className="lg:col-span-1">
            <MarketScanner
              markets={markets}
              loading={loading}
              selectedMarket={selectedMarket}
              onSelectMarket={setSelectedMarket}
            />
          </div>

          {/* Right Column: Analysis & Execution */}
          <div className="lg:col-span-2 space-y-6">
            <AnalysisPanel
              market={selectedMarket}
              balance={portfolio.balance}
              onTradeComplete={refreshPortfolio}
            />
            
            <TradeLog trades={portfolio.active_trades} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

