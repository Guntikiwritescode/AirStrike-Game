'use client';

import { useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { Download, TrendingUp, Target, AlertTriangle, Activity } from 'lucide-react';

export default function AnalyticsPanel() {
  const {
    eventLog,
    analytics,
    score,
    config,
    currentTurn,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'calibration'>('timeline');

  const downloadGameData = (format: 'json' | 'csv') => {
    const gameData = {
      config,
      analytics,
      eventLog,
      finalScore: score,
      completedTurns: currentTurn,
      timestamp: new Date().toISOString(),
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(gameData, null, 2);
      filename = `bayesian-forward-operator-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      // Convert to CSV
      const csvRows = [
        ['Turn', 'Type', 'X', 'Y', 'Sensor', 'Result', 'Score Change', 'Budget Remaining'].join(','),
                 ...eventLog.map(event => [
           event.turn,
           event.type,
           (event.data?.x as number) || '',
           (event.data?.y as number) || '',
           (event.data?.sensor as string) || '',
           event.data?.reading !== undefined ? (event.data.reading as boolean) : '',
           (event.data?.points as number) || '',
           (event.data?.budgetRemaining as number) || '',
         ].join(','))
      ];
      content = csvRows.join('\n');
      filename = `bayesian-forward-operator-${Date.now()}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTimeline = () => {
    if (eventLog.length === 0) {
      return <div className="text-slate-400 text-center py-8">No game data yet. Start playing to see analytics!</div>;
    }

    // Group events by turn
    const eventsByTurn = eventLog.reduce((acc, event) => {
      if (!acc[event.turn]) acc[event.turn] = [];
      acc[event.turn].push(event);
      return acc;
    }, {} as Record<number, typeof eventLog>);

    const maxTurn = Math.max(...Object.keys(eventsByTurn).map(Number));
    const turns = Array.from({ length: maxTurn + 1 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Score progression chart placeholder */}
          <div className="md:col-span-4 h-32 bg-slate-700 rounded flex items-center justify-center">
            <div className="text-slate-400">Score Timeline Chart (To be implemented)</div>
          </div>
        </div>

        {/* Turn-by-turn breakdown */}
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {turns.map(turn => {
              const turnEvents = eventsByTurn[turn] || [];
              const reconEvents = turnEvents.filter(e => e.type === 'recon');
              const strikeEvents = turnEvents.filter(e => e.type === 'strike');
              
              return (
                <div key={turn} className="bg-slate-700 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Turn {turn}</span>
                    <div className="text-sm text-slate-400">
                      {reconEvents.length} recons, {strikeEvents.length} strikes
                    </div>
                  </div>
                  
                  {turnEvents.length > 0 && (
                    <div className="text-sm space-y-1">
                                             {reconEvents.map((event, idx) => (
                         <div key={idx} className="flex justify-between text-blue-400">
                           <span>Recon ({event.data.x as number}, {event.data.y as number}) - {event.data.sensor as string}</span>
                           <span>{event.data.reading ? '✓' : '✗'}</span>
                         </div>
                       ))}
                                             {strikeEvents.map((event, idx) => (
                         <div key={idx} className="flex justify-between text-orange-400">
                           <span>Strike ({event.data.x as number}, {event.data.y as number})</span>
                           <span>{(event.data.points as number) > 0 ? '+' : ''}{event.data.points as number}</span>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = () => {
    const recentEvents = eventLog.slice(-20).reverse();

    return (
      <div className="max-h-80 overflow-y-auto">
        <div className="space-y-2">
          {recentEvents.map((event, idx) => (
            <div key={idx} className="bg-slate-700 rounded p-3 text-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  {event.type === 'recon' && <Target size={14} className="text-blue-400" />}
                  {event.type === 'strike' && <Activity size={14} className="text-orange-400" />}
                  {event.type === 'game_start' && <TrendingUp size={14} className="text-green-400" />}
                  {event.type === 'game_end' && <AlertTriangle size={14} className="text-red-400" />}
                  
                  <span className="font-medium capitalize">{event.type}</span>
                </div>
                <span className="text-slate-400 text-xs">Turn {event.turn}</span>
              </div>
              
              <div className="mt-1 text-slate-300">
                                 {event.type === 'recon' && (
                   <span>
                     Cell ({event.data.x as number}, {event.data.y as number}) with {event.data.sensor as string} - 
                     Result: {event.data.reading ? 'Positive' : 'Negative'} - 
                     Updated probability: {((event.data.posterior as number) * 100).toFixed(1)}%
                   </span>
                 )}
                 {event.type === 'strike' && (
                   <span>
                     Target ({event.data.x as number}, {event.data.y as number}) - 
                     Hostiles: {event.data.hostilesHit as number}, Infrastructure: {event.data.infraHit as number} - 
                     Points: {(event.data.points as number) > 0 ? '+' : ''}{event.data.points as number}
                   </span>
                 )}
                 {event.type === 'game_start' && (
                   <span>Game started with seed: {(event.data.seed as string).slice(0, 12)}...</span>
                 )}
                 {event.type === 'game_end' && (
                   <span>Game ended with final score: {event.data.score as number}</span>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>
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
            onClick={() => downloadGameData('json')}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm"
          >
            <Download size={14} />
            <span>JSON</span>
          </button>
          <button
            onClick={() => downloadGameData('csv')}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm"
          >
            <Download size={14} />
            <span>CSV</span>
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