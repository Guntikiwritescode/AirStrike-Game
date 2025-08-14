'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Info, Eye, Target, BarChart3, TrendingUp, AlertTriangle, Clock, Zap, MapPin } from 'lucide-react';
import { TrackEntity } from './EntityPanel';

type TabType = 'overview' | 'recon' | 'strike' | 'analytics';

interface ActionPanelProps {
  selectedEntity?: TrackEntity;
  width?: number;
  onReconAction?: (entityId: string, sensorType: string) => void;
  onStrikeAction?: (entityId: string, weaponType: string) => void;
}

// Mini sparkline component
const Sparkline = ({ data, color = 'var(--color-accent)', width = 60, height = 20 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) => {
  const points = useMemo(() => {
    if (data.length < 2) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  }, [data, width, height]);

  if (data.length < 2) {
    return <div className="w-15 h-5 bg-panel2 rounded"></div>;
  }

  return (
    <svg width={width} height={height} className="rounded">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.8"
      />
    </svg>
  );
};

// Risk gate banner component
const RiskGateBanner = ({ riskLevel, threshold = 0.7 }: { riskLevel: number; threshold?: number }) => {
  const isViolated = riskLevel > threshold;
  
  if (!isViolated) return null;
  
  return (
    <div className="mx-3 mb-3 p-2 bg-warn/20 border border-warn/40 rounded">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-warn" />
        <div className="text-sm text-warn font-semibold">RISK GATE VIOLATION</div>
      </div>
      <div className="text-xs text-warn/80 mt-1">
        Chance constraint exceeded: {(riskLevel * 100).toFixed(1)}% &gt; {(threshold * 100)}%
      </div>
    </div>
  );
};

export default function ActionPanel({ 
  selectedEntity,
  width = 320,
  onReconAction,
  onStrikeAction
}: ActionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Sample probability history for sparkline
  const probabilityHistory = useMemo(() => {
    if (!selectedEntity) return [];
    // Generate sample data based on entity confidence
    const base = selectedEntity.confidence;
    return Array.from({ length: 20 }, (_, i) => {
      const noise = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, base + noise));
    });
  }, [selectedEntity]);

  const tabs = [
    { id: 'overview', label: 'OVERVIEW', icon: Info },
    { id: 'recon', label: 'RECON', icon: Eye },
    { id: 'strike', label: 'STRIKE', icon: Target },
    { id: 'analytics', label: 'ANALYTICS', icon: BarChart3 }
  ] as const;

  // Overview Tab Content
  const OverviewTab = () => {
    if (!selectedEntity) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-muted">
          <Info className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No entity selected</p>
          <p className="text-xs opacity-60">Select an entity to view details</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Entity Header */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-ink">{selectedEntity.name}</div>
            <div className="text-xs font-mono text-muted">{selectedEntity.id}</div>
          </div>
          <div className="text-xs text-muted capitalize">{selectedEntity.type} • {selectedEntity.classification}</div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-panel2 p-2 rounded border border-grid/40">
            <div className="text-xs text-muted mb-1">CONFIDENCE</div>
            <div className="text-lg font-mono text-accent">
              {(selectedEntity.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-panel2 p-2 rounded border border-grid/40">
            <div className="text-xs text-muted mb-1">PRIORITY</div>
            <div className={`text-lg font-mono ${
              selectedEntity.priority === 'high' ? 'text-red-400' :
              selectedEntity.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {selectedEntity.priority.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Probability Trend */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted">P(HOSTILE) TREND</div>
            <TrendingUp className="w-3 h-3 text-accent" />
          </div>
          <div className="flex items-center space-x-3">
            <Sparkline data={probabilityHistory} />
            <div className="text-sm font-mono text-ink">
              {(selectedEntity.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Location Info */}
        {selectedEntity.position && (
          <div className="bg-panel2 p-3 rounded border border-grid/40">
            <div className="text-xs text-muted mb-2">POSITION</div>
            <div className="text-xs font-mono text-ink space-y-1">
              <div>LAT: {selectedEntity.position[0].toFixed(6)}°</div>
              <div>LNG: {selectedEntity.position[1].toFixed(6)}°</div>
              {selectedEntity.altitude && (
                <div>ALT: {selectedEntity.altitude.toLocaleString()}ft</div>
              )}
            </div>
          </div>
        )}

        {/* Movement Data */}
        {(selectedEntity.speed || selectedEntity.heading) && (
          <div className="bg-panel2 p-3 rounded border border-grid/40">
            <div className="text-xs text-muted mb-2">MOVEMENT</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-ink">
              {selectedEntity.speed && (
                <div>SPD: {selectedEntity.speed}kt</div>
              )}
              {selectedEntity.heading && (
                <div>HDG: {selectedEntity.heading.toFixed(0)}°</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Recon Tab Content
  const ReconTab = () => {
    if (!selectedEntity) {
      return <div className="text-muted text-sm p-4">No entity selected</div>;
    }

    const sensorTypes = [
      { id: 'optical', name: 'OPTICAL', cost: 10, time: '30s', accuracy: '85%' },
      { id: 'radar', name: 'RADAR', cost: 15, time: '15s', accuracy: '92%' },
      { id: 'thermal', name: 'THERMAL', cost: 12, time: '45s', accuracy: '78%' },
      { id: 'signals', name: 'SIGINT', cost: 20, time: '60s', accuracy: '95%' }
    ];

    return (
      <div className="space-y-4">
        <div className="text-sm text-ink mb-3">Available Sensors</div>
        
        {sensorTypes.map((sensor) => (
          <div key={sensor.id} className="bg-panel2 p-3 rounded border border-grid/40">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-ink">{sensor.name}</div>
              <button
                onClick={() => onReconAction?.(selectedEntity.id, sensor.id)}
                className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-mono rounded border border-accent/40 transition-colors"
              >
                SCAN
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-muted">
              <div>Cost: {sensor.cost}</div>
              <div>Time: {sensor.time}</div>
              <div>Acc: {sensor.accuracy}</div>
            </div>
          </div>
        ))}

        {/* Scan History */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="text-xs text-muted mb-2">SCAN HISTORY</div>
          <div className="space-y-1 text-xs font-mono text-ink">
            <div className="flex justify-between">
              <span>RADAR</span>
              <span className="text-muted">2m ago</span>
            </div>
            <div className="flex justify-between">
              <span>OPTICAL</span>
              <span className="text-muted">5m ago</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Strike Tab Content
  const StrikeTab = () => {
    if (!selectedEntity) {
      return <div className="text-muted text-sm p-4">No entity selected</div>;
    }

    const weaponTypes = [
      { id: 'precision', name: 'PRECISION', damage: 'High', collateral: 'Low', cost: 50 },
      { id: 'area', name: 'AREA EFFECT', damage: 'Very High', collateral: 'High', cost: 100 },
      { id: 'emp', name: 'EMP', damage: 'Electronics', collateral: 'None', cost: 75 }
    ];

    return (
      <div className="space-y-4">
        <RiskGateBanner riskLevel={selectedEntity.confidence} />
        
        <div className="text-sm text-ink mb-3">Strike Options</div>
        
        {weaponTypes.map((weapon) => (
          <div key={weapon.id} className="bg-panel2 p-3 rounded border border-grid/40">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-ink">{weapon.name}</div>
              <button
                onClick={() => onStrikeAction?.(selectedEntity.id, weapon.id)}
                className="px-2 py-1 bg-warn/20 hover:bg-warn/30 text-warn text-xs font-mono rounded border border-warn/40 transition-colors"
              >
                STRIKE
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-muted">
              <div>DMG: {weapon.damage}</div>
              <div>COL: {weapon.collateral}</div>
              <div>Cost: {weapon.cost}</div>
            </div>
          </div>
        ))}

        {/* Rules of Engagement */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="text-xs text-muted mb-2">RULES OF ENGAGEMENT</div>
          <div className="text-xs text-ink space-y-1">
            <div>• Confidence threshold: ≥70%</div>
            <div>• Collateral damage: Minimize</div>
            <div>• Authorization: Required</div>
          </div>
        </div>
      </div>
    );
  };

  // Analytics Tab Content
  const AnalyticsTab = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-ink mb-3">Performance Metrics</div>
        
        {/* Detection Rate */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted">DETECTION RATE</div>
            <div className="text-sm font-mono text-accent">87.3%</div>
          </div>
          <Sparkline data={[0.85, 0.87, 0.89, 0.85, 0.88, 0.87, 0.90, 0.85]} />
        </div>

        {/* Classification Accuracy */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted">CLASSIFICATION ACC</div>
            <div className="text-sm font-mono text-accent">92.1%</div>
          </div>
          <Sparkline data={[0.90, 0.92, 0.91, 0.93, 0.92, 0.94, 0.92, 0.91]} />
        </div>

        {/* Response Time */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted">AVG RESPONSE TIME</div>
            <div className="text-sm font-mono text-accent">2.3s</div>
          </div>
          <Sparkline data={[2.1, 2.3, 2.0, 2.5, 2.2, 2.4, 2.1, 2.3]} color="var(--color-warn)" />
        </div>

        {/* Threat Assessment */}
        <div className="bg-panel2 p-3 rounded border border-grid/40">
          <div className="text-xs text-muted mb-2">THREAT LEVELS</div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-400">HIGH</span>
              <span className="text-ink">3</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-yellow-400">MEDIUM</span>
              <span className="text-ink">7</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-green-400">LOW</span>
              <span className="text-ink">14</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'recon': return <ReconTab />;
      case 'strike': return <StrikeTab />;
      case 'analytics': return <AnalyticsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-panel border-l border-grid/40" style={{ width }}>
      {/* Tab Header */}
      <div className="border-b border-grid/40">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors border-r border-grid/40 last:border-r-0 ${
                  activeTab === tab.id
                    ? 'bg-accent/20 text-accent border-b-2 border-accent'
                    : 'text-muted hover:bg-grid/20 hover:text-ink'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderTabContent()}
      </div>

      {/* Quick Actions Footer */}
      {selectedEntity && (
        <div className="p-3 border-t border-grid/40 bg-panel2">
          <div className="flex space-x-2">
            <button className="flex-1 h-8 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-mono rounded border border-accent/40 transition-colors flex items-center justify-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>FOCUS</span>
            </button>
            <button className="flex-1 h-8 bg-panel hover:bg-grid/20 text-muted text-xs font-mono rounded border border-grid/40 transition-colors flex items-center justify-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>TRACK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}