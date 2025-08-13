'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'recon' | 'strike' | 'info' | 'warning' | 'error';
  message: string;
  details?: string;
  location?: { x: number; y: number };
}

interface VirtualizedLogListProps {
  logs: LogEntry[];
  height: number;
  className?: string;
  onLogClick?: (log: LogEntry) => void;
}

export function VirtualizedLogList({
  logs,
  height,
  className,
  onLogClick
}: VirtualizedLogListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  const getTypeStyles = (type: LogEntry['type']) => {
    switch (type) {
      case 'recon':
        return 'text-accent border-l-accent/40';
      case 'strike':
        return 'text-warn border-l-warn/40';
      case 'info':
        return 'text-ink border-l-grid';
      case 'warning':
        return 'text-warn2 border-l-warn2/40';
      case 'error':
        return 'text-warn border-l-warn/60';
      default:
        return 'text-muted border-l-grid';
    }
  };

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'recon':
        return '🔍';
      case 'strike':
        return '🎯';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '•';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatLocation = (location?: { x: number; y: number }) => {
    if (!location) return '';
    return `(${location.x.toString().padStart(2, '0')}, ${location.y.toString().padStart(2, '0')})`;
  };

  if (logs.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center text-muted text-sm', className)}
        style={{ height }}
      >
        No log entries
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const log = logs[virtualItem.index];
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                className={cn(
                  'p-2 border-l-2 hover:bg-panel2/50 transition-colors duration-fast cursor-pointer text-xs',
                  getTypeStyles(log.type),
                  onLogClick && 'hover:bg-panel2'
                )}
                onClick={() => onLogClick?.(log)}
              >
                <div className="flex items-start gap-2">
                  {/* Type icon */}
                  <span className="text-xs mt-0.5 flex-shrink-0">
                    {getTypeIcon(log.type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Timestamp */}
                      <span className="font-mono text-xs text-muted tabular-nums">
                        {formatTimestamp(log.timestamp)}
                      </span>

                      {/* Location */}
                      {log.location && (
                        <span className="font-mono text-xs text-muted/70 tabular-nums">
                          {formatLocation(log.location)}
                        </span>
                      )}

                      {/* Type badge */}
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs uppercase tracking-wider font-medium',
                        log.type === 'recon' && 'bg-accent/10 text-accent',
                        log.type === 'strike' && 'bg-warn/10 text-warn',
                        log.type === 'info' && 'bg-grid/20 text-ink',
                        log.type === 'warning' && 'bg-warn2/10 text-warn2',
                        log.type === 'error' && 'bg-warn/20 text-warn'
                      )}>
                        {log.type}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="text-sm leading-tight mb-1">
                      {log.message}
                    </div>

                    {/* Details */}
                    {log.details && (
                      <div className="text-xs text-muted/80 font-mono leading-tight">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}