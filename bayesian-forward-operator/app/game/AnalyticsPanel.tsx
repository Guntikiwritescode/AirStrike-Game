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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        <div className="bg-slate-700 rounded p-4">
          <h4 className="font-medium mb-2">Decision Quality Metrics</h4>
          <div className="text-sm text-slate-300 space-y-1">
            <div>• Calibration measures how well your probability estimates match reality</div>
            <div>• Brier Score: Lower is better (0 = perfect, 1 = worst possible)</div>
            <div>• Log Loss: Lower is better (penalizes confident wrong predictions heavily)</div>
            <div>• Efficiency: Score per dollar spent</div>
          </div>
        </div>

        {/* Placeholder for calibration plot */}
        <div className="bg-slate-700 rounded p-4 h-40 flex items-center justify-center">
          <div className="text-slate-400">Calibration Plot (To be implemented)</div>
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