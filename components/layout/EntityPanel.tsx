'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Filter, Eye, Target, AlertTriangle, MapPin, Clock, Zap } from 'lucide-react';

// Entity types and data structures
export interface TrackEntity {
  id: string;
  name: string;
  type: 'aircraft' | 'ground' | 'infrastructure' | 'sensor';
  classification: 'friendly' | 'hostile' | 'suspect' | 'unknown';
  position: [number, number];
  altitude?: number;
  speed?: number;
  heading?: number;
  lastSeen: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'inactive' | 'destroyed';
  attributes?: Record<string, unknown>;
}

type FilterType = 'all' | 'friendly' | 'hostile' | 'suspect' | 'unknown';

interface EntityPanelProps {
  entities?: TrackEntity[];
  selectedEntityId?: string;
  onEntitySelect?: (entity: TrackEntity) => void;
  onEntityFocus?: (entity: TrackEntity) => void;
  searchQuery?: string;
  width?: number;
}

// Sample data generator
const generateSampleEntities = (): TrackEntity[] => [
  {
    id: 'T001',
    name: 'EAGLE-1',
    type: 'aircraft',
    classification: 'friendly',
    position: [40.7580, -73.9855],
    altitude: 8500,
    speed: 320,
    heading: 45,
    lastSeen: Date.now() - 30000,
    confidence: 0.95,
    priority: 'high',
    status: 'active'
  },
  {
    id: 'T002', 
    name: 'UNKNOWN-VEH',
    type: 'ground',
    classification: 'suspect',
    position: [40.7489, -73.9680],
    speed: 45,
    heading: 180,
    lastSeen: Date.now() - 120000,
    confidence: 0.72,
    priority: 'medium',
    status: 'active'
  },
  {
    id: 'T003',
    name: 'HOSTILE-AF',
    type: 'aircraft', 
    classification: 'hostile',
    position: [40.7614, -73.9776],
    altitude: 12000,
    speed: 450,
    heading: 270,
    lastSeen: Date.now() - 45000,
    confidence: 0.88,
    priority: 'high',
    status: 'active'
  },
  {
    id: 'T004',
    name: 'RADAR-SITE-A',
    type: 'infrastructure',
    classification: 'hostile',
    position: [40.7505, -73.9934],
    lastSeen: Date.now() - 60000,
    confidence: 0.92,
    priority: 'high',
    status: 'active'
  },
  {
    id: 'T005',
    name: 'PATROL-B2',
    type: 'ground',
    classification: 'friendly',
    position: [40.7542, -73.9712],
    speed: 25,
    heading: 90,
    lastSeen: Date.now() - 10000,
    confidence: 0.98,
    priority: 'low',
    status: 'active'
  }
];

export default function EntityPanel({ 
  entities = generateSampleEntities(),
  selectedEntityId,
  onEntitySelect,
  onEntityFocus,
  searchQuery = '',
  width = 280
}: EntityPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'lastSeen' | 'confidence'>('priority');

  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Apply classification filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(entity => entity.classification === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entity => 
        entity.name.toLowerCase().includes(query) ||
        entity.id.toLowerCase().includes(query) ||
        entity.type.toLowerCase().includes(query)
      );
    }

    // Sort entities
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'lastSeen':
          return b.lastSeen - a.lastSeen;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [entities, activeFilter, searchQuery, sortBy]);

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    return {
      all: entities.length,
      friendly: entities.filter(e => e.classification === 'friendly').length,
      hostile: entities.filter(e => e.classification === 'hostile').length,
      suspect: entities.filter(e => e.classification === 'suspect').length,
      unknown: entities.filter(e => e.classification === 'unknown').length,
    };
  }, [entities]);

  // Format time ago
  const formatTimeAgo = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }, []);

  // Get classification colors
  const getClassificationColor = useCallback((classification: string) => {
    switch (classification) {
      case 'friendly': return 'text-green-400 bg-green-400/20';
      case 'hostile': return 'text-red-400 bg-red-400/20';
      case 'suspect': return 'text-yellow-400 bg-yellow-400/20';
      case 'unknown': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-muted bg-muted/20';
    }
  }, []);

  // Get priority colors
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-muted';
    }
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const entity = filteredEntities[index];
    const isSelected = entity.id === selectedEntityId;
    
    return (
      <div style={style}>
        <div
          className={`mx-2 mb-1 p-2 rounded border cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-accent/20 border-accent/60' 
              : 'bg-panel2 border-grid/40 hover:bg-grid/20'
          }`}
          onClick={() => onEntitySelect?.(entity)}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-ink font-semibold">
                {entity.id}
              </span>
              <div className={`px-1.5 py-0.5 rounded text-xs font-mono ${getClassificationColor(entity.classification)}`}>
                {entity.classification.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <AlertTriangle className={`w-3 h-3 ${getPriorityColor(entity.priority)}`} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEntityFocus?.(entity);
                }}
                className="w-5 h-5 bg-panel hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center"
                title="Focus on Map"
              >
                <Eye className="w-3 h-3 text-muted" />
              </button>
            </div>
          </div>

          {/* Entity Name */}
          <div className="text-sm text-ink mb-1 truncate">
            {entity.name}
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs font-mono text-muted">
            <div className="flex items-center space-x-2">
              {entity.speed && (
                <span>{entity.speed}kt</span>
              )}
              {entity.altitude && (
                <span>{entity.altitude}ft</span>
              )}
              <span className="text-accent">
                {(entity.confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(entity.lastSeen)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [filteredEntities, selectedEntityId, onEntitySelect, onEntityFocus, getClassificationColor, getPriorityColor, formatTimeAgo]);

  return (
    <div className="flex flex-col h-full bg-panel border-r border-grid/40" style={{ width }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-grid/40">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-ink">ENTITIES</span>
        </div>
        <div className="text-xs font-mono text-muted">
          {filteredEntities.length}/{entities.length}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="p-3 border-b border-grid/40">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(filterCounts) as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                activeFilter === filter
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-panel2 text-muted border border-grid/40 hover:bg-grid/20'
              }`}
            >
              {filter.toUpperCase()}
              <span className="ml-1 opacity-60">
                {filterCounts[filter]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-3 py-2 border-b border-grid/40">
        <div className="flex items-center space-x-2">
          <Filter className="w-3 h-3 text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'priority' | 'lastSeen' | 'confidence')}
            className="bg-panel2 border border-grid/40 rounded text-xs text-ink px-2 py-1 focus:outline-none focus:border-accent/60"
          >
            <option value="priority">Priority</option>
            <option value="lastSeen">Last Seen</option>
            <option value="confidence">Confidence</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Virtualized Entity List */}
      <div className="flex-1 relative">
        {filteredEntities.length > 0 ? (
          <List
            height={400} // Will be dynamically calculated
            itemCount={filteredEntities.length}
            itemSize={85}
            width="100%"
            className="scrollbar-thin scrollbar-track-panel2 scrollbar-thumb-grid"
          >
            {Row}
          </List>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted">
            <Target className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No entities found</p>
            <p className="text-xs opacity-60">Try adjusting filters</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t border-grid/40">
        <div className="flex space-x-1">
          <button className="flex-1 h-7 bg-panel2 hover:bg-grid/20 border border-grid/40 rounded text-xs text-muted transition-colors flex items-center justify-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>AUTO</span>
          </button>
          <button className="flex-1 h-7 bg-panel2 hover:bg-grid/20 border border-grid/40 rounded text-xs text-muted transition-colors flex items-center justify-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>CENTER</span>
          </button>
        </div>
      </div>
    </div>
  );
}