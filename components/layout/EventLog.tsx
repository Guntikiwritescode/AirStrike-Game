'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, FileText, Filter, Download, Trash2, Clock } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';

export interface LogEvent {
  id: string;
  timestamp: number;
  type: 'recon' | 'strike' | 'detection' | 'classification' | 'system' | 'user';
  action: string;
  entity?: string;
  deltaScore?: number;
  details?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface EventLogProps {
  events?: LogEvent[];
  height?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClearLog?: () => void;
  onExportLog?: () => void;
}

// Sample event data generator
const generateSampleEvents = (): LogEvent[] => {
  const now = Date.now();
  return [
    {
      id: 'evt_001',
      timestamp: now - 30000,
      type: 'detection',
      action: 'NEW_CONTACT_DETECTED',
      entity: 'T003',
      deltaScore: 0.15,
      details: 'Aircraft signature matched',
      severity: 'info'
    },
    {
      id: 'evt_002',
      timestamp: now - 45000,
      type: 'recon',
      action: 'RADAR_SCAN_COMPLETE',
      entity: 'T001',
      deltaScore: 0.08,
      details: 'Confidence increased',
      severity: 'success'
    },
    {
      id: 'evt_003',
      timestamp: now - 60000,
      type: 'classification',
      action: 'THREAT_LEVEL_UPDATED',
      entity: 'T004',
      deltaScore: -0.12,
      details: 'Reclassified as hostile',
      severity: 'warning'
    },
    {
      id: 'evt_004',
      timestamp: now - 90000,
      type: 'strike',
      action: 'KINETIC_STRIKE_EXECUTED',
      entity: 'T002',
      deltaScore: -0.95,
      details: 'Target neutralized',
      severity: 'success'
    },
    {
      id: 'evt_005',
      timestamp: now - 120000,
      type: 'system',
      action: 'SENSOR_ARRAY_ONLINE',
      deltaScore: 0.02,
      details: 'All sensors operational',
      severity: 'info'
    },
    {
      id: 'evt_006',
      timestamp: now - 150000,
      type: 'user',
      action: 'MANUAL_OVERRIDE_APPLIED',
      entity: 'T001',
      deltaScore: 0.0,
      details: 'User intervention',
      severity: 'info'
    },
    {
      id: 'evt_007',
      timestamp: now - 180000,
      type: 'detection',
      action: 'CONTACT_LOST',
      entity: 'T005',
      deltaScore: -0.25,
      details: 'Signal interference',
      severity: 'warning'
    },
    {
      id: 'evt_008',
      timestamp: now - 210000,
      type: 'recon',
      action: 'OPTICAL_SCAN_FAILED',
      entity: 'T003',
      deltaScore: 0.0,
      details: 'Weather interference',
      severity: 'error'
    }
  ];
};

export default function EventLog({
  events = generateSampleEvents(),
  height = 200,
  collapsed = false,
  onToggleCollapse,
  onClearLog,
  onExportLog
}: EventLogProps) {
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Filter events based on type
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(event => event.type === filter);
  }, [events, filter]);

  // Sort events by timestamp (newest first)
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredEvents]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }, []);

  // Format delta score
  const formatDelta = useCallback((delta?: number) => {
    if (delta === undefined) return '';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  }, []);

  // Get severity color
  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'info':
      default: return 'text-accent';
    }
  }, []);

  // Get type abbreviation
  const getTypeAbbrev = useCallback((type: string) => {
    switch (type) {
      case 'recon': return 'RCN';
      case 'strike': return 'STK';
      case 'detection': return 'DET';
      case 'classification': return 'CLS';
      case 'system': return 'SYS';
      case 'user': return 'USR';
      default: return 'UNK';
    }
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = sortedEvents[index];
    
    return (
      <div style={style} className="px-3 border-b border-grid/20 last:border-b-0">
        <div className="flex items-center space-x-3 py-1 text-xs font-mono">
          {/* Timestamp */}
          <div className="w-20 text-muted flex-shrink-0">
            {formatTimestamp(event.timestamp)}
          </div>
          
          {/* Type Badge */}
          <div className={`w-8 text-center flex-shrink-0 ${getSeverityColor(event.severity)}`}>
            {getTypeAbbrev(event.type)}
          </div>
          
          {/* Entity ID */}
          <div className="w-12 text-accent flex-shrink-0">
            {event.entity || '---'}
          </div>
          
          {/* Action */}
          <div className="flex-1 text-ink min-w-0">
            <span className="truncate">{event.action}</span>
          </div>
          
          {/* Delta Score */}
          <div className="w-16 text-right flex-shrink-0">
            {event.deltaScore !== undefined && (
              <span className={event.deltaScore >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatDelta(event.deltaScore)}
              </span>
            )}
          </div>
          
          {/* Details */}
          <div className="w-32 text-muted text-right flex-shrink-0 truncate">
            {event.details}
          </div>
        </div>
      </div>
    );
  }, [sortedEvents, formatTimestamp, getSeverityColor, getTypeAbbrev, formatDelta]);

  // Event type counts for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  const filterOptions = [
    { id: 'all', label: 'ALL' },
    { id: 'detection', label: 'DET' },
    { id: 'recon', label: 'RCN' },
    { id: 'strike', label: 'STK' },
    { id: 'classification', label: 'CLS' },
    { id: 'system', label: 'SYS' },
    { id: 'user', label: 'USR' }
  ];

  if (collapsed) {
    return (
      <div className="h-8 bg-panel border-t border-grid/40 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-ink">EVENT LOG</span>
          <div className="text-xs font-mono text-muted">
            {events.length} events
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center transition-colors"
          title="Expand Event Log"
        >
          <ChevronUp className="w-3 h-3 text-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-panel border-t border-grid/40" style={{ height }}>
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-4 border-b border-grid/40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-ink">EVENT LOG</span>
          </div>
          
          {/* Filter Chips */}
          <div className="flex space-x-1">
            {filterOptions.map((option) => {
              const count = typeCounts[option.id] || 0;
              if (count === 0 && option.id !== 'all') return null;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                    filter === option.id
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-panel2 text-muted border border-grid/40 hover:bg-grid/20'
                  }`}
                >
                  {option.label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`w-6 h-6 border border-grid/40 rounded flex items-center justify-center transition-colors ${
              autoScroll ? 'bg-accent/20 text-accent' : 'bg-panel2 text-muted hover:bg-grid/40'
            }`}
            title="Auto-scroll"
          >
            <Clock className="w-3 h-3" />
          </button>
          
          {/* Export */}
          <button
            onClick={onExportLog}
            className="w-6 h-6 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center transition-colors"
            title="Export Log"
          >
            <Download className="w-3 h-3 text-muted" />
          </button>
          
          {/* Clear */}
          <button
            onClick={onClearLog}
            className="w-6 h-6 bg-panel2 hover:bg-warn/20 border border-grid/40 rounded flex items-center justify-center transition-colors"
            title="Clear Log"
          >
            <Trash2 className="w-3 h-3 text-muted hover:text-warn" />
          </button>
          
          {/* Collapse */}
          <button
            onClick={onToggleCollapse}
            className="w-6 h-6 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center transition-colors"
            title="Collapse Event Log"
          >
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="h-6 bg-panel2 border-b border-grid/40 flex items-center px-3 text-xs font-mono text-muted">
        <div className="w-20 flex-shrink-0">TIME</div>
        <div className="w-8 text-center flex-shrink-0">TYP</div>
        <div className="w-12 flex-shrink-0">ENT</div>
        <div className="flex-1 min-w-0">ACTION</div>
        <div className="w-16 text-right flex-shrink-0">ΔSCORE</div>
        <div className="w-32 text-right flex-shrink-0">DETAILS</div>
      </div>

      {/* Event List */}
      <div className="flex-1" style={{ height: height - 56 }}>
        {sortedEvents.length > 0 ? (
          <List
            height={height - 56}
            itemCount={sortedEvents.length}
            itemSize={24}
            width="100%"
            className="scrollbar-thin scrollbar-track-panel2 scrollbar-thumb-grid"
          >
            {Row}
          </List>
        ) : (
          <div className="flex flex-col items-center justify-center h-20 text-muted">
            <FileText className="w-6 h-6 mb-1 opacity-40" />
            <p className="text-sm">No events to display</p>
          </div>
        )}
      </div>
    </div>
  );
}