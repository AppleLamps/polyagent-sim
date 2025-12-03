import React from 'react';

function ProbabilityBar({ marketPrice, aiPrice }) {
  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
  const edge = aiPrice - marketPrice;
  const edgePercent = (edge * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Labels */}
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-text-dark">Market Price: </span>
          <span className="font-bold font-mono text-text-dark">{formatPercent(marketPrice)}</span>
        </div>
        <div>
          <span className="text-text-dark">AI Estimate: </span>
          <span className="font-bold font-mono text-black">{formatPercent(aiPrice)}</span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="relative h-8 bg-accent-gray">
        {/* Market price indicator (gray) */}
        <div 
          className="absolute top-0 h-full bg-gray-400 opacity-50"
          style={{ width: `${marketPrice * 100}%` }}
        />
        
        {/* AI price indicator (black) */}
        <div 
          className="absolute top-0 h-full bg-black"
          style={{ 
            left: `${Math.min(marketPrice, aiPrice) * 100}%`,
            width: `${Math.abs(edge) * 100}%`,
            opacity: edge > 0 ? 1 : 0.3
          }}
        />

        {/* Market price marker */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-gray-600"
          style={{ left: `${marketPrice * 100}%` }}
        />
        
        {/* AI price marker */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-black"
          style={{ left: `${aiPrice * 100}%` }}
        />
      </div>

      {/* Edge display */}
      <div className="flex items-center justify-center gap-2 py-2 border border-black">
        <span className="text-sm text-text-dark">Edge:</span>
        <span className={`text-xl font-bold font-mono ${edge > 0 ? 'text-black' : 'text-text-dark'}`}>
          {edge > 0 ? '+' : ''}{edgePercent}%
        </span>
        {edge > 0.05 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-black text-white">
            VALUE
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-text-dark">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400" />
          <span>Market</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-black" />
          <span>AI Estimate</span>
        </div>
      </div>
    </div>
  );
}

export default ProbabilityBar;

