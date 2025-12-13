import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  /** Optional: stage where error occurred, enables retry functionality */
  stage?: string;
  /** Optional: indicates this is a generation error that can be retried */
  isRetryable?: boolean;
}

interface BuildLogsProps {
  logs: LogEntry[];
  onClear: () => void;
  /** Optional: callback for retrying failed generation */
  onRetry?: (stage: string) => void;
}

/**
 * BuildLogs component displays build output with support for error recovery.
 * A collapsible panel at the bottom that shows only as much space as needed.
 * When collapsed: shows just a small header bar
 * When expanded: shows logs with a fixed max height (200px) with scrolling
 *
 * **Validates: Requirements 5.1, 5.2**
 */
export const BuildLogs: React.FC<BuildLogsProps> = ({ logs, onClear, onRetry }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs come in
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const handleRetry = (stage: string) => {
    if (onRetry) {
      onRetry(stage);
    }
  };

  return (
    <div className="build-logs-wrapper" style={{ flexShrink: 0 }}>
      {/* Header bar - always visible */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800/80 cursor-pointer hover:bg-gray-800 transition-colors border-t border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 select-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span className="text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Build Output
          </span>
          {logs.length > 0 && (
            <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full font-medium">
              {logs.length}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-[10px] px-2 py-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
          title="Clear Logs"
        >
          Clear
        </button>
      </div>

      {/* Logs content - only shown when expanded, with fixed max height */}
      {isExpanded && (
        <div
          className="bg-gray-900/90 border-t border-gray-700 overflow-y-auto"
          style={{ maxHeight: '200px' }}
        >
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500 italic p-3 text-center">
              No build logs yet. Start a build step to see output.
            </div>
          ) : (
            <div className="p-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="text-xs py-1.5 border-b border-gray-800/50 last:border-0"
                >
                  <span className="text-gray-600 font-mono mr-2 text-[10px]">
                    [{log.timestamp}]
                  </span>
                  {log.type === 'ai' ? (
                    <div className="pl-2 border-l-2 border-purple-500/40 mt-1 mb-1 text-gray-300 bg-purple-900/10 p-2 rounded whitespace-pre-wrap text-[11px]">
                      {log.message}
                    </div>
                  ) : log.type === 'error' && log.isRetryable && log.stage ? (
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      <span className="text-red-400">{log.message}</span>
                      <button
                        onClick={() => handleRetry(log.stage!)}
                        className="text-[10px] px-2 py-0.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded text-red-300 transition-colors"
                        title="Retry generation from saved state"
                      >
                        Retry
                      </button>
                    </span>
                  ) : (
                    <span
                      className={
                        log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'success'
                            ? 'text-green-400'
                            : log.type === 'warning'
                              ? 'text-amber-400'
                              : 'text-gray-300'
                      }
                    >
                      {log.message}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
