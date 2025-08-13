'use client';

import { useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { VirtualizedLogList } from '@/components/ui/virtualized-log-list';
import { Download, Target, AlertTriangle, Activity, FileText, Database } from 'lucide-react';
import TimelineCharts from '@/components/TimelineCharts';

export default function AnalyticsPanel() {
  const {
    eventLog,
    analytics,
    exportGameRun
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'calibration'>('timeline');

  const handleExportRun = () => {
    exportGameRun();
  };

  const renderTimeline = () => {
    return (
      <div className="space-y-6">
        {/* Timeline Charts */}
        <TimelineCharts timelineData={analytics.timelineData} />
        
        {/* Recent Activity Summary */}
        {eventLog.length > 0 && (
          <div className="tactical-panel">
            <h4 className="tactical-subheader flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Recent Activity
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {eventLog.slice(-5).reverse().map((event, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {event.type === 'recon' && <Target className="w-3 h-3 mr-2 text-accent" />}
                    {event.type === 'strike' && <AlertTriangle className="w-3 h-3 mr-2 text-warn" />}
                    <span className="capitalize">{event.type}</span>
                    {event.data && typeof event.data === 'object' && 'x' in event.data && (
                                              <span className="ml-2 text-muted">({(event.data as { x: number; y: number }).x}, {(event.data as { x: number; y: number }).y})</span>
                    )}
                  </div>
                                      <span className="text-muted">Turn {event.turn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  

  const renderEvents = () => {
    const recentEvents = eventLog.slice(-20).reverse();

        return (
      <VirtualizedLogList
        logs={recentEvents.map((event, idx) => ({
          id: `${event.type}-${event.turn}-${idx}`,
          timestamp: event.timestamp,
          type: event.type === 'recon' ? 'recon' : 
                event.type === 'strike' ? 'strike' : 
                event.type === 'game_end' ? 'error' :
                event.type === 'game_start' ? 'info' : 'info',
          message: (() => {
            switch (event.type) {
              case 'recon':
                return `Recon at (${event.data.x}, ${event.data.y}) with ${event.data.sensor}`;
              case 'strike':
                return `Strike at (${event.data.x}, ${event.data.y})`;
              case 'game_start':
                return 'Game started';
              case 'game_end':
                return 'Game ended';
              default:
                return String(event.type).replace('_', ' ');
            }
          })(),
          details: (() => {
            switch (event.type) {
              case 'recon':
                return `Result: ${event.data.reading ? 'Positive' : 'Negative'} | Posterior: ${((event.data.posterior as number) * 100).toFixed(1)}%`;
              case 'strike':
                return `Hostiles: ${event.data.hostilesHit as number} | Infrastructure: ${event.data.infraHit as number} | Points: ${(event.data.points as number) > 0 ? '+' : ''}${event.data.points as number}`;
              case 'game_start':
                return `Seed: ${(event.data.seed as string).slice(0, 12)}...`;
              case 'game_end':
                return `Final score: ${event.data.score as number}`;
              default:
                return undefined;
            }
          })(),
          location: (event.data.x !== undefined && event.data.y !== undefined) 
            ? { x: event.data.x as number, y: event.data.y as number } 
            : undefined
        }))}
        height={320}
        onLogClick={(log) => {
          if (log.location) {
            console.log('Selected location:', log.location);
          }
        }}
      />
    );
  };

  const renderCalibration = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{analytics.hostilesNeutralized}</div>
            <div className="text-sm text-slate-400">Hostiles Neutralized</div>
          </div>
          
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{analytics.infraHits}</div>
            <div className="text-sm text-slate-400">Infrastructure Hits</div>
          </div>
          
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{analytics.brierScore.toFixed(3)}</div>
            <div className="text-sm text-slate-400">Brier Score</div>
          </div>
          
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{analytics.logLoss.toFixed(3)}</div>
            <div className="text-sm text-slate-400">Log Loss</div>
          </div>
          
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{(analytics.calibrationError * 100).toFixed(1)}%</div>
            <div className="text-sm text-slate-400">Calibration Error</div>
          </div>
          
          <div className="bg-slate-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{analytics.totalPredictions}</div>
            <div className="text-sm text-slate-400">Total Predictions</div>
          </div>
        </div>

        {/* Brier Score Decomposition */}
        <div className="bg-slate-700 rounded p-4">
          <h4 className="font-medium mb-3">Brier Score Decomposition</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{analytics.reliability.toFixed(3)}</div>
              <div className="text-slate-400">Reliability</div>
              <div className="text-xs text-slate-500">Calibration error</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{analytics.resolution.toFixed(3)}</div>
              <div className="text-slate-400">Resolution</div>
              <div className="text-xs text-slate-500">Discrimination ability</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{analytics.uncertainty.toFixed(3)}</div>
              <div className="text-slate-400">Uncertainty</div>
              <div className="text-xs text-slate-500">Irreducible noise</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Brier = Reliability - Resolution + Uncertainty = {analytics.brierScore.toFixed(3)}
          </div>
        </div>

        <div className="bg-slate-700 rounded p-4">
          <h4 className="font-medium mb-2">Decision Quality Metrics</h4>
          <div className="text-sm text-slate-300 space-y-1">
            <div>• <strong>Brier Score</strong>: Overall accuracy (lower is better, 0 = perfect)</div>
            <div>• <strong>Reliability</strong>: How well calibrated you are (lower is better)</div>
            <div>• <strong>Resolution</strong>: How well you discriminate (higher is better)</div>
            <div>• <strong>Calibration Error</strong>: Mean absolute difference between predictions and outcomes</div>
            <div>• <strong>Log Loss</strong>: Penalizes confident wrong predictions heavily</div>
          </div>
        </div>

        {/* Calibration Curve */}
        <div className="bg-slate-700 rounded p-4">
          <h4 className="font-medium mb-3">Calibration Curve</h4>
          <div className="h-48 flex items-center justify-center border border-slate-600 rounded">
            {analytics.calibrationData.length > 0 ? (
              <div className="w-full h-full relative">
                {/* Perfect calibration diagonal line */}
                <svg className="absolute inset-0 w-full h-full">
                  <line
                    x1="10%"
                    y1="90%"
                    x2="90%"
                    y2="10%"
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />
                  <text x="50%" y="95%" textAnchor="middle" className="text-xs fill-slate-400">
                    Predicted Probability
                  </text>
                  <text x="5%" y="50%" textAnchor="middle" className="text-xs fill-slate-400" transform="rotate(-90 5% 50%)">
                    Actual Rate
                  </text>
                </svg>
                
                {/* Calibration points */}
                <svg className="absolute inset-0 w-full h-full">
                  {analytics.calibrationData.map((point, idx) => {
                    if (point.count === 0) return null;
                    const x = 10 + (point.predicted * 80); // 10-90% range
                    const y = 90 - (point.actual * 80);     // 90-10% range (inverted y)
                    const size = Math.max(2, Math.min(8, point.count / 2)); // Size based on count
                    
                    return (
                      <circle
                        key={idx}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r={size}
                        fill="#3b82f6"
                        opacity="0.7"
                      />
                    );
                  })}
                </svg>
                
                {/* Labels */}
                <div className="absolute bottom-1 left-1 text-xs text-slate-400">
                  Perfect calibration (diagonal)
                </div>
                <div className="absolute top-1 right-1 text-xs text-slate-400">
                  {analytics.calibrationData.filter(p => p.count > 0).length} buckets
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Make some predictions to see calibration curve</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics & Timeline</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExportRun}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export Run</span>
            <div className="flex space-x-1 ml-2">
              <FileText className="w-3 h-3" />
              <Database className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-700 rounded p-1">
        {(['timeline', 'events', 'calibration'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-80">
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'calibration' && renderCalibration()}
      </div>
    </div>
  );
}