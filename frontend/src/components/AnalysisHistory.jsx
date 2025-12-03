import React, { useState } from 'react';
import db, { id } from '../db';

function AnalysisHistory({ onSelectAnalysis }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Query analysis history sorted by createdAt descending
  const { isLoading, error, data } = db.useQuery({
    analysisHistory: {},
  });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatEdge = (edge) => {
    const pct = (edge * 100).toFixed(1);
    return edge > 0 ? `+${pct}%` : `${pct}%`;
  };

  const handleDelete = async (analysisId, e) => {
    e.stopPropagation();
    try {
      await db.transact(db.tx.analysisHistory[analysisId].delete());
    } catch (err) {
      console.error('Failed to delete analysis:', err);
    }
  };

  const handleClearAll = async () => {
    if (!data?.analysisHistory?.length) return;
    if (!confirm('Clear all analysis history?')) return;
    
    try {
      const txs = data.analysisHistory.map(a => db.tx.analysisHistory[a.id].delete());
      await db.transact(txs);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // Sort by createdAt descending (newest first)
  const sortedHistory = data?.analysisHistory
    ? [...data.analysisHistory].sort((a, b) => b.createdAt - a.createdAt)
    : [];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-4 text-xs writing-mode-vertical hover:bg-gray-800 transition-colors z-10"
        style={{ writingMode: 'vertical-rl' }}
      >
        📜 History ({sortedHistory.length})
      </button>
    );
  }

  return (
    <div className="card h-[calc(100vh-180px)] flex flex-col w-72">
      <div className="pb-3 border-b border-black mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">📜 History</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dark">{sortedHistory.length}</span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-xs text-text-dark hover:text-black"
              title="Collapse sidebar"
            >
              ✕
            </button>
          </div>
        </div>
        {sortedHistory.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-text-dark hover:text-black mt-2"
          >
            Clear all
          </button>
        )}
      </div>

      {!import.meta.env.VITE_INSTANTDB_APP_ID && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-xs mb-3">
          <strong>Setup Required:</strong> Add VITE_INSTANTDB_APP_ID to your .env file.
          <a href="https://instantdb.com/dash" target="_blank" rel="noopener" className="block mt-1 text-blue-600 underline">
            Get your free App ID →
          </a>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-dark text-sm">Loading...</div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error.message}
        </div>
      )}

      {!isLoading && !error && sortedHistory.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-text-dark text-sm p-4">
            <div className="text-2xl mb-2">📊</div>
            <div>No analyses yet</div>
            <div className="text-xs mt-1">Run an analysis to save it here</div>
          </div>
        </div>
      )}

      {!isLoading && !error && sortedHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {sortedHistory.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis)}
              className="w-full text-left p-3 border border-accent-gray hover:border-black hover:bg-bg-light transition-colors group"
            >
              <div className="text-xs font-medium text-black line-clamp-2 mb-2">
                {analysis.marketQuestion}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-mono ${analysis.edge > 0 ? 'text-green-700' : analysis.edge < 0 ? 'text-red-700' : 'text-text-dark'}`}>
                  Edge: {formatEdge(analysis.edge)}
                </span>
                <span className="text-text-dark">{formatDate(analysis.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-dark">
                  AI: {(analysis.aiProbability * 100).toFixed(0)}% vs Mkt: {(analysis.marketPrice * 100).toFixed(0)}%
                </span>
                <span
                  onClick={(e) => handleDelete(analysis.id, e)}
                  className="text-xs text-text-dark hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  🗑️
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnalysisHistory;

