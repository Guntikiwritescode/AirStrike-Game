'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType } from '@/lib/types';
import { getWorkerManager } from '@/lib/worker-manager';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/components/KeyboardShortcuts';
import { SensorReading } from '@/lib/sensors';
import GameCanvas from './GameCanvas';
import ControlPanel from './ControlPanel';
import AnalyticsPanel from './AnalyticsPanel';
import PolicyPanel from './PolicyPanel';
import LoadingOverlay from '@/components/LoadingOverlay';
import BayesExplanationModal from '@/components/BayesExplanationModal';

export default function GamePage() {
  const {
    initializeGame,
    loadFromLocalStorage,
    saveToLocalStorage,
    performRecon,
    performStrike,
    gameStarted,
    gameEnded,
    grid,
    config,
    remainingBudget
  } = useGameStore();
  
  const [mounted, setMounted] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('drone');
  const [workerLoadingState, setWorkerLoadingState] = useState({
    isLoading: false,
    operation: '',
    progress: 0,
    stage: ''
  });
  
  // Bayes explanation modal state
  const [showBayesModal, setShowBayesModal] = useState(false);
  const [lastReconData, setLastReconData] = useState<{
    x: number;
    y: number;
    prior: number;
    posterior: number;
    sensorReading: SensorReading;
  } | null>(null);
  
  // Selected cell for actions
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

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

  // Handle reconnaissance with explanation tracking
  const handleRecon = async (x: number, y: number, sensor: SensorType) => {
    if (!gameStarted || gameEnded || !grid || x < 0 || y < 0 || x >= grid[0]?.length || y >= grid.length) {
      return;
    }

    const cell = grid[y][x];
    const priorProbability = cell.posteriorProbability;
    
    try {
      await performRecon(x, y, sensor);
      
      // Get updated cell data for explanation
      const updatedState = useGameStore.getState();
      const updatedCell = updatedState.grid[y][x];
      const posteriorProbability = updatedCell.posteriorProbability;
      
      // Get the most recent sensor reading
      const recentReading = updatedCell.reconHistory[updatedCell.reconHistory.length - 1];
      
      if (recentReading) {
        // Convert ReconResult to SensorReading format for the modal
        const sensorReading: SensorReading = {
          result: recentReading.result,
          confidence: recentReading.confidence,
          effectiveTPR: recentReading.effectiveTPR,
          effectiveFPR: recentReading.effectiveFPR,
          contextFactors: {
            terrain: 'open',
            lighting: 'day',
            weather: 'clear',
            concealment: 'none',
            jamming: 'none'
          },
          rawSignal: recentReading.confidence * 100  // Approximate raw signal
        };
        
        setLastReconData({
          x,
          y,
          prior: priorProbability,
          posterior: posteriorProbability,
          sensorReading
        });
      }
    } catch (error) {
      console.error('Failed to perform reconnaissance:', error);
    }
  };

  // Handle strike action
  const handleStrike = async (x: number, y: number) => {
    if (!gameStarted || gameEnded || !grid || x < 0 || y < 0 || x >= grid[0]?.length || y >= grid.length) {
      return;
    }

    try {
      await performStrike(x, y, 1); // Radius of 1
    } catch (error) {
      console.error('Failed to perform strike:', error);
    }
  };

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '1',
      label: 'Drone Sensor',
      description: 'Switch to drone imagery sensor',
      action: () => setSelectedSensor('drone'),
      category: 'Sensors',
      disabled: !gameStarted
    },
    {
      key: '2', 
      label: 'SIGINT Sensor',
      description: 'Switch to signals intelligence sensor',
      action: () => setSelectedSensor('sigint'),
      category: 'Sensors',
      disabled: !gameStarted
    },
    {
      key: '3',
      label: 'Ground Spotter',
      description: 'Switch to ground spotter sensor',
      action: () => setSelectedSensor('ground'),
      category: 'Sensors',
      disabled: !gameStarted
    },
    {
      key: 's',
      label: 'Strike Selected',
      description: 'Strike the selected cell (if any)',
      action: () => {
        if (selectedCell && remainingBudget >= config.strikeCost) {
          handleStrike(selectedCell.x, selectedCell.y);
        }
      },
      category: 'Actions',
      disabled: !gameStarted || !selectedCell || remainingBudget < config.strikeCost
    },
    {
      key: 'r',
      label: 'Recon Selected',
      description: 'Perform reconnaissance on selected cell',
      action: () => {
        if (selectedCell && remainingBudget >= config.reconCost) {
          handleRecon(selectedCell.x, selectedCell.y, selectedSensor);
        }
      },
      category: 'Actions',
      disabled: !gameStarted || !selectedCell || remainingBudget < config.reconCost
    },
    {
      key: 'e',
      label: 'Explain Last Update',
      description: 'Show detailed explanation of last Bayesian update',
      action: () => {
        if (lastReconData) {
          setShowBayesModal(true);
        }
      },
      category: 'Learning',
      disabled: !lastReconData
    }
  ];

  const { KeyboardShortcutsComponent } = useKeyboardShortcuts(shortcuts, mounted && gameStarted);

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
      <div className="bg-yellow-600 text-black p-2 sm:p-3 text-center font-medium text-sm sm:text-base">
        ⚠️ Fictional decision-making simulation. No real-world tactics or guidance. ⚠️
      </div>
      
      <div className="container mx-auto p-2 sm:p-4">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            Bayesian Forward Operator
          </h1>
          <p className="text-slate-300 text-center max-w-2xl mx-auto text-sm sm:text-base px-2">
            A probability-based strategy game. Use noisy sensors to update beliefs about 
            hidden hostiles and infrastructure, then make optimal decisions under uncertainty.
          </p>
          
          {/* Keyboard shortcuts hint - desktop only */}
          <div className="hidden sm:block text-center mt-3">
            <p className="text-xs text-slate-400">
              Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">?</kbd> for keyboard shortcuts
            </p>
          </div>
        </header>

        {/* Mobile-first responsive layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-6 gap-3 sm:gap-6">
          {/* Mobile: Control Panel first on small screens */}
          <div className="lg:hidden order-1">
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <h2 className="text-lg font-semibold mb-3">Controls</h2>
              <ControlPanel />
            </div>
          </div>

          {/* Map Canvas - main focus */}
          <div className="lg:col-span-4 order-2 lg:order-1">
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 min-h-[400px] lg:h-[calc(100vh-280px)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-semibold">Tactical Map</h2>
                <div className="text-xs sm:text-sm text-slate-400">
                  <span className="block sm:inline">Tap/Click: recon</span>
                  <span className="hidden sm:inline"> • </span>
                  <span className="block sm:inline">Long press/Right-click: strike</span>
                </div>
              </div>
              <GameCanvas 
                selectedSensor={selectedSensor}
                onSensorChange={setSelectedSensor}
                onCellClick={(x, y) => {
                  setSelectedCell({ x, y });
                  handleRecon(x, y, selectedSensor);
                }}
                onCellRightClick={(x, y) => {
                  setSelectedCell({ x, y });
                  handleStrike(x, y);
                }}
                onCellHighlight={(_x, _y, _type) => {
                  // Cell highlighting handled internally by GameCanvas
                }}
                onClearHighlight={() => {
                  // Clear highlighting handled internally
                }}
              />
            </div>
          </div>

          {/* Desktop: Control Panel */}
          <div className="hidden lg:block lg:col-span-1 order-3 lg:order-2">
            <div className="bg-slate-800 rounded-lg p-4 h-[calc(100vh-280px)] overflow-y-auto">
              <ControlPanel />
            </div>
          </div>
          
          {/* Policy Panel */}
          <div className="lg:col-span-1 order-4 lg:order-3">
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 lg:h-[calc(100vh-280px)] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-3 lg:hidden">Policy Recommendations</h2>
              <PolicyPanel 
                selectedSensor={selectedSensor}
                onCellHighlight={(x, y, type) => {
                  setSelectedCell({ x, y });
                  // Forward to GameCanvas via window global (temporary solution)
                  const windowWithGlobals = window as typeof window & { 
                    gameCellHighlight?: (x: number, y: number, type: 'primary' | 'alternative') => void;
                  };
                  if (windowWithGlobals.gameCellHighlight) {
                    windowWithGlobals.gameCellHighlight(x, y, type);
                  }
                }}
                onClearHighlight={() => {
                  setSelectedCell(null);
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

          {/* Analytics Panel - full width on mobile, collapsible */}
          <div className="lg:col-span-6 order-5">
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <AnalyticsPanel />
            </div>
          </div>
        </div>

        {/* Mobile action buttons */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-slate-800 rounded-lg p-3 border border-slate-600 shadow-lg">
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => selectedCell && handleRecon(selectedCell.x, selectedCell.y, selectedSensor)}
                disabled={!gameStarted || !selectedCell || remainingBudget < config.reconCost}
                className="px-3 py-2 bg-blue-600 disabled:bg-slate-600 disabled:opacity-50 text-white rounded text-sm font-medium"
              >
                Recon
              </button>
              <button
                onClick={() => selectedCell && handleStrike(selectedCell.x, selectedCell.y)}
                disabled={!gameStarted || !selectedCell || remainingBudget < config.strikeCost}
                className="px-3 py-2 bg-red-600 disabled:bg-slate-600 disabled:opacity-50 text-white rounded text-sm font-medium"
              >
                Strike
              </button>
            </div>
            {lastReconData && (
              <button
                onClick={() => setShowBayesModal(true)}
                className="px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium"
              >
                Explain
              </button>
            )}
          </div>
          {selectedCell && (
            <div className="mt-2 text-xs text-slate-400 text-center">
              Selected: ({selectedCell.x}, {selectedCell.y})
            </div>
          )}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsComponent />
      
      {/* Bayes Explanation Modal */}
      {showBayesModal && lastReconData && (
        <BayesExplanationModal
          isOpen={showBayesModal}
          onClose={() => setShowBayesModal(false)}
          priorProbability={lastReconData.prior}
          sensorReading={lastReconData.sensorReading}
          posteriorProbability={lastReconData.posterior}
          cellX={lastReconData.x}
          cellY={lastReconData.y}
        />
      )}
      
      {/* Loading Overlay for Web Worker Operations */}
      <LoadingOverlay loadingState={workerLoadingState} />
    </div>
  );
}