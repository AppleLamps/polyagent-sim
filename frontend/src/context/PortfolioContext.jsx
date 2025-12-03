import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchPortfolio } from '../api';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [portfolio, setPortfolio] = useState({
    balance: 100000,
    active_trades: [],
    total_pnl: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPortfolio();
      setPortfolio(data);
      return data;
    } catch (err) {
      setError('Failed to fetch portfolio');
      console.error('Portfolio refresh error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    portfolio,
    balance: portfolio.balance,
    activeTrades: portfolio.active_trades,
    totalPnl: portfolio.total_pnl,
    loading,
    error,
    refreshPortfolio,
    setPortfolio
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

export default PortfolioContext;

