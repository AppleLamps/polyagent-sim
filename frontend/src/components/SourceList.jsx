import React, { useState } from 'react';

function SourceList({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  // Extract domain from URL for cleaner display
  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <div className="border border-accent-gray">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-light transition-colors"
      >
        <h4 className="text-sm font-medium text-text-dark uppercase tracking-wide">
          Sources ({sources.length})
        </h4>
        <svg
          className={`w-4 h-4 text-text-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-accent-gray p-3 space-y-1">
          {sources.map((source, index) => (
            <a
              key={index}
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 border border-accent-gray hover:border-black transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-dark font-mono">[{index + 1}]</span>
                <span className="text-sm text-black group-hover:underline truncate">
                  {getDomain(source)}
                </span>
                <svg
                  className="w-3 h-3 text-text-dark ml-auto flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default SourceList;

