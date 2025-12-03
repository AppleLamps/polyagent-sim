import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MarketScanner from './components/MarketScanner';
import AnalysisPanel from './components/AnalysisPanel';
import TradeLog from './components/TradeLog';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { fetchMarkets } from './api';

function AppContent() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { portfolio, refreshPortfolio } = usePortfolio();

  const loadData = async () => {
    try {
      setLoading(true);
      const [marketsData] = await Promise.all([
        fetchMarkets(),
        refreshPortfolio()
      ]);
      setMarkets(marketsData);
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

  return (
    <div className="min-h-screen bg-bg-light">
      <TopBar onRefresh={loadData} />

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
            <AnalysisPanel market={selectedMarket} />
            <TradeLog trades={portfolio.active_trades} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}

export default App;

