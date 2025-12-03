import React, { useState } from 'react';
import { analyzeMarket } from '../api';
import ProbabilityBar from './ProbabilityBar';
import SourceList from './SourceList';
import TradeForm from './TradeForm';

function AnalysisPanel({ market }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!market) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeMarket(market);
      setAnalysis(result);
    } catch (err) {
      // Parse error to provide more specific error messages
      let errorMessage = 'Failed to analyze market.';
      const errStr = err.message || String(err);

      if (errStr.includes('401') || errStr.includes('403')) {
        errorMessage = 'Invalid API key. Please check your XAI_API_KEY in backend/.env';
      } else if (errStr.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (errStr.includes('network') || errStr.includes('fetch') || errStr.includes('Failed to fetch')) {
        errorMessage = 'Network error. Make sure the backend is running on port 8000.';
      } else if (errStr.includes('500')) {
        errorMessage = 'Server error. Check the backend logs for details.';
      } else if (errStr.includes('timeout')) {
        errorMessage = 'Request timed out. The AI analysis is taking too long.';
      }

      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days until resolution
  const getDaysUntil = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatChange = (value) => {
    if (!value) return null;
    const pct = (value * 100).toFixed(1);
    return value > 0 ? `+${pct}%` : `${pct}%`;
  };

  if (!market) {
    return (
      <div className="card min-h-[400px] flex items-center justify-center">
        <div className="text-center text-text-dark">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-medium">Select a market</div>
          <div className="text-sm mt-1">Choose a market from the scanner to analyze</div>
        </div>
      </div>
    );
  }

  const daysUntil = getDaysUntil(market.end_date);

  return (
    <div className="card">
      {/* Market Header */}
      <div className="pb-4 border-b border-black mb-4">
        <h2 className="text-xl font-bold text-black leading-tight">
          {market.question}
        </h2>
        {market.description && (
          <p className="text-sm text-text-dark mt-2 line-clamp-2">
            {market.description}
          </p>
        )}

        {/* Market stats */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <span className="text-text-dark">
            Price: <span className="font-mono font-medium text-black">{(market.yes_price * 100).toFixed(1)}%</span>
          </span>

          {market.one_day_change !== null && market.one_day_change !== 0 && (
            <span className={`font-mono ${market.one_day_change > 0 ? 'text-black' : 'text-text-dark'}`}>
              24h: {formatChange(market.one_day_change)}
            </span>
          )}

          {market.volume_24h > 0 && (
            <span className="text-text-dark">
              Vol 24h: ${market.volume_24h >= 1000 ? `${(market.volume_24h / 1000).toFixed(0)}K` : market.volume_24h.toFixed(0)}
            </span>
          )}

          {daysUntil !== null && (
            <span className="text-text-dark">
              Resolves: <span className="font-medium text-black">{daysUntil === 0 ? 'Today' : `${daysUntil}d`}</span>
            </span>
          )}
        </div>
      </div>

      {/* Analysis Button */}
      {!analysis && !loading && (
        <button
          onClick={handleAnalyze}
          className="btn-primary w-full py-4 text-lg"
        >
          🔍 Run AI Analysis
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block animate-pulse">
            <div className="text-2xl mb-2">🤖</div>
            <div className="text-text-dark">Grok is researching...</div>
            <div className="text-xs text-text-dark mt-1">Searching web, news, and X</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 border border-black bg-bg-light mb-4">
          <div className="text-black font-medium">Analysis Failed</div>
          <div className="text-sm text-text-dark mt-1">{error}</div>
          <button onClick={handleAnalyze} className="btn-secondary mt-3 text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-5">
          {/* Confidence Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-dark">AI Confidence:</span>
            <span className={`px-2 py-1 text-xs font-bold uppercase ${analysis.confidence === 'high' ? 'bg-black text-white' :
              analysis.confidence === 'medium' ? 'bg-gray-200 text-black' :
                'bg-white text-black border border-black'
              }`}>
              {analysis.confidence || 'medium'}
            </span>
          </div>

          {/* Probability Comparison */}
          <ProbabilityBar
            marketPrice={market.yes_price}
            aiPrice={analysis.estimated_probability}
          />

          {/* Reasoning */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-dark uppercase tracking-wide">
              AI Reasoning
            </h4>
            <div className="p-4 bg-bg-light border border-accent-gray text-sm text-black leading-relaxed max-h-64 overflow-y-auto">
              {analysis.reasoning.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? (
                  <p key={idx} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ) : <br key={idx} />
              ))}
            </div>
          </div>

          {/* Key Events & Risks */}
          <div className="grid grid-cols-2 gap-4">
            {/* Key Events */}
            {analysis.key_events && analysis.key_events.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-dark uppercase tracking-wide">
                  📅 Key Events
                </h4>
                <ul className="text-sm space-y-1">
                  {analysis.key_events.map((event, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-text-dark">•</span>
                      <span className="text-black">{event}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {analysis.risks && analysis.risks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-dark uppercase tracking-wide">
                  ⚠️ Risks
                </h4>
                <ul className="text-sm space-y-1">
                  {analysis.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-text-dark">•</span>
                      <span className="text-black">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sources */}
          <SourceList sources={analysis.sources} />

          {/* Trade Form */}
          <div className="pt-4 border-t border-black">
            <TradeForm
              market={market}
              analysis={analysis}
            />
          </div>

          {/* Re-analyze button */}
          <button
            onClick={handleAnalyze}
            className="btn-secondary w-full text-sm"
          >
            Re-analyze Market
          </button>
        </div>
      )}
    </div>
  );
}

export default AnalysisPanel;

