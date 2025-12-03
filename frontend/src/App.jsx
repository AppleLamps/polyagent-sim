import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MarketScanner from './components/MarketScanner';
import AnalysisPanel from './components/AnalysisPanel';
import PortfolioPanel from './components/PortfolioPanel';
import AnalysisHistory from './components/AnalysisHistory';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { fetchMarkets } from './api';

function AppContent() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [preloadedAnalysis, setPreloadedAnalysis] = useState(null);
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

  // Handle selecting an analysis from history
  const handleSelectAnalysis = (analysis) => {
    // Find the market in loaded markets, or create a minimal market object
    const existingMarket = markets.find(m => m.id === analysis.marketId);
    if (existingMarket) {
      setSelectedMarket(existingMarket);
    } else {
      // Create a minimal market object for display
      setSelectedMarket({
        id: analysis.marketId,
        question: analysis.marketQuestion,
        yes_price: analysis.marketPrice,
        description: '',
      });
    }
    setPreloadedAnalysis(analysis);
  };

  // Clear preloaded analysis when user selects a new market from scanner
  const handleSelectMarket = (market) => {
    setSelectedMarket(market);
    setPreloadedAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-bg-light">
      <TopBar onRefresh={loadData} />

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 border border-black bg-white text-black">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Column: Market Scanner */}
          <div className="w-80 flex-shrink-0">
            <MarketScanner
              markets={markets}
              loading={loading}
              selectedMarket={selectedMarket}
              onSelectMarket={handleSelectMarket}
            />
          </div>

          {/* Center Column: Analysis & Execution */}
          <div className="flex-1 space-y-6 min-w-0">
            <AnalysisPanel
              market={selectedMarket}
              preloadedAnalysis={preloadedAnalysis}
              onAnalysisComplete={() => setPreloadedAnalysis(null)}
              portfolio={portfolio}
            />
            <PortfolioPanel />
          </div>

          {/* Right Column: Analysis History */}
          <div className="flex-shrink-0">
            <AnalysisHistory onSelectAnalysis={handleSelectAnalysis} />
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

