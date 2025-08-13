'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType } from '@/lib/types';
import { getWorkerManager } from '@/lib/worker-manager';
import GameCanvas from './GameCanvas';
import ControlPanel from './ControlPanel';
import AnalyticsPanel from './AnalyticsPanel';
import PolicyPanel from './PolicyPanel';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function GamePage() {
  const {
    initializeGame,
    loadFromLocalStorage,
    saveToLocalStorage,
  } = useGameStore();
  
  const [mounted, setMounted] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('drone');
  const [workerLoadingState, setWorkerLoadingState] = useState({
    isLoading: false,
    operation: '',
    progress: 0,
    stage: ''
  });

  useEffect(() => {
    setMounted(true);
    
    // Initialize worker manager and subscribe to loading state
    const workerManager = getWorkerManager();
    const unsubscribe = workerManager.onLoadingStateChange(setWorkerLoadingState);
    
    // Try to load saved game state
    const loaded = loadFromLocalStorage();
    if (!loaded) {
      // Initialize new game if no saved state
      initializeGame();
    }
    
    return () => {
      unsubscribe();
    };
  }, [loadFromLocalStorage, initializeGame]);

  useEffect(() => {
    if (mounted) {
      // Auto-save game state periodically
      const interval = setInterval(saveToLocalStorage, 10000);
      return () => clearInterval(interval);
    }
  }, [mounted, saveToLocalStorage]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Ethics Disclaimer Banner */}
      <div className="bg-yellow-600 text-black p-3 text-center font-medium">
        ⚠️ Fictional decision-making simulation. No real-world tactics or guidance. ⚠️
      </div>
      
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">
            Bayesian Forward Operator
          </h1>
          <p className="text-slate-300 text-center max-w-2xl mx-auto">
            A probability-based strategy game. Use noisy sensors to update beliefs about 
            hidden hostiles and infrastructure, then make optimal decisions under uncertainty.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-6 gap-6 h-[calc(100vh-200px)]">
          {/* Left: Map Canvas */}
          <div className="xl:col-span-4">
            <div className="bg-slate-800 rounded-lg p-4 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tactical Map</h2>
                <div className="text-sm text-slate-400">
                  Click cells to recon • Right-click to strike
                </div>
              </div>
              <GameCanvas 
                selectedSensor={selectedSensor}
                onSensorChange={setSelectedSensor}
                onCellHighlight={(_x, _y, _type) => {
                  // Cell highlighting handled internally by GameCanvas
                }}
                onClearHighlight={() => {
                  // Clear highlighting handled internally
                }}
              />
            </div>
          </div>

          {/* Center: Control Panel */}
          <div className="xl:col-span-1">
            <div className="bg-slate-800 rounded-lg p-4 h-full overflow-y-auto">
              <ControlPanel />
            </div>
          </div>
          
          {/* Right: Policy Panel */}
          <div className="xl:col-span-1">
            <div className="bg-slate-800 rounded-lg p-4 h-full overflow-y-auto">
              <PolicyPanel 
                selectedSensor={selectedSensor}
                onCellHighlight={(x, y, type) => {
                  // Forward to GameCanvas via window global (temporary solution)
                  const windowWithGlobals = window as typeof window & { 
                    gameCellHighlight?: (x: number, y: number, type: 'primary' | 'alternative') => void;
                  };
                  if (windowWithGlobals.gameCellHighlight) {
                    windowWithGlobals.gameCellHighlight(x, y, type);
                  }
                }}
                onClearHighlight={() => {
                  const windowWithGlobals = window as typeof window & { 
                    gameClearHighlight?: () => void;
                  };
                  if (windowWithGlobals.gameClearHighlight) {
                    windowWithGlobals.gameClearHighlight();
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Analytics Panel */}
        <div className="mt-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <AnalyticsPanel />
          </div>
        </div>
      </div>
      
      {/* Loading Overlay for Web Worker Operations */}
      <LoadingOverlay loadingState={workerLoadingState} />
    </div>
  );
}