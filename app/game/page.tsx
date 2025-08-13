'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType } from '@/lib/types';
import { getWorkerManager } from '@/lib/worker-manager';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/components/KeyboardShortcuts';
import { SensorReading } from '@/lib/sensors';
import GameCanvas from './GameCanvas';
import AnalyticsPanel from './AnalyticsPanel';
import LoadingOverlay from '@/components/LoadingOverlay';
import BayesExplanationModal from '@/components/BayesExplanationModal';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayerToggle } from '@/components/ui/layer-toggle';
import { DebugPanel } from '@/components/ui/debug-panel';
import { AccordionControlPanel } from '@/components/ui/accordion-control-panel';
import { tacticalToast } from '@/components/ui/toast-provider';
import { HeatmapType } from '@/lib/types';

export default function GamePage() {
  const {
    initializeGame,
    loadFromLocalStorage,
    saveToLocalStorage,
    performRecon,
    performStrike,
    startGame,
    endGame,
    resetGame,
    gameStarted,
    gameEnded,
    grid,
    config,
    remainingBudget,
    currentTurn
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
  
  // Layout state
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  // Layer and debug state
  const [activeLayer, setActiveLayer] = useState<HeatmapType>('posterior');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Handle recon action
  const handleRecon = async (x: number, y: number, sensor: SensorType) => {
    if (!gameStarted || remainingBudget < config.reconCost) {
      tacticalToast.constraint('Budget', remainingBudget, config.reconCost);
      return;
    }
    
    const prior = grid[y][x].posteriorProbability;
    await performRecon(x, y, sensor);
    const posterior = grid[y][x].posteriorProbability;
    
    // Get the most recent recon result for the modal
    const recentRecon = grid[y][x].reconHistory[grid[y][x].reconHistory.length - 1];
    if (recentRecon) {
             // Convert ReconResult to SensorReading format for the modal
      const sensorReading = {
        result: recentRecon.result,
        confidence: recentRecon.confidence || 0.8,
        effectiveTPR: recentRecon.effectiveTPR,
        effectiveFPR: recentRecon.effectiveFPR,
        contextFactors: {
          terrain: 'open' as const,
          lighting: 'day' as const, 
          weather: 'clear' as const,
          concealment: 'none' as const,
          jamming: 'none' as const
        },
        rawSignal: recentRecon.confidence ? recentRecon.confidence * 100 : 80
      };
      
      setLastReconData({
        x, y,
        prior,
        posterior, 
        sensorReading
      });
    }
  };

  // Handle strike action
  const handleStrike = async (x: number, y: number) => {
    if (!gameStarted || remainingBudget < config.strikeCost) {
      tacticalToast.constraint('Budget', remainingBudget, config.strikeCost);
      return;
    }
    await performStrike(x, y, 1); // Radius of 1
    tacticalToast.success('Strike executed', `Target: (${x.toString().padStart(2, '0')}, ${y.toString().padStart(2, '0')})`);
  };

  // Initialize game on mount
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      loadFromLocalStorage();
      return;
    }

    // Setup worker loading state listener
    const workerManager = getWorkerManager();
    const unsubscribe = workerManager.onLoadingStateChange((loadingState) => {
      setWorkerLoadingState({
        isLoading: loadingState.isLoading,
        operation: loadingState.operation || '',
        progress: loadingState.progress || 0,
        stage: loadingState.stage || ''
      });
    });

    return () => {
      unsubscribe();
    };
  }, [mounted, loadFromLocalStorage]);

  // Save to localStorage when game state changes
  useEffect(() => {
    if (mounted) {
      saveToLocalStorage();
    }
  }, [grid, mounted, saveToLocalStorage]);

  // Keyboard shortcuts setup
  const shortcuts: KeyboardShortcut[] = [
    { key: '1', label: 'Drone Sensor', description: 'Switch to Drone sensor', action: () => setSelectedSensor('drone'), category: 'Sensors' },
    { key: '2', label: 'SIGINT Sensor', description: 'Switch to SIGINT sensor', action: () => setSelectedSensor('sigint'), category: 'Sensors' },
    { key: '3', label: 'Ground Sensor', description: 'Switch to Ground sensor', action: () => setSelectedSensor('ground'), category: 'Sensors' },
    { key: 'e', label: 'Expected Value', description: 'Show Expected Value heatmap', action: () => setActiveLayer('expectedValue'), category: 'Layers' },
    { key: 'v', label: 'Value of Information', description: 'Show Value of Information heatmap', action: () => setActiveLayer('valueOfInformation'), category: 'Layers' },
    { key: 'r', label: 'Risk Layer', description: 'Show Risk heatmap', action: () => setActiveLayer('riskAverse'), category: 'Layers' },
    { key: 'p', label: 'Posterior Layer', description: 'Show Posterior heatmap', action: () => setActiveLayer('posterior'), category: 'Layers' },
    { key: 's', label: 'Strike', description: 'Strike selected cell', action: () => selectedCell && handleStrike(selectedCell.x, selectedCell.y), category: 'Actions', disabled: !selectedCell },
    { key: 't', label: 'Toggle Timeline', description: 'Toggle timeline panel', action: () => setTimelineCollapsed(!timelineCollapsed), category: 'UI' },
    { key: 'd', label: 'Debug Panel', description: 'Toggle debug panel', action: () => setShowDebugPanel(!showDebugPanel), category: 'Debug' },
    { key: 'Escape', label: 'Clear Selection', description: 'Clear selection', action: () => setSelectedCell(null), category: 'Actions' }
  ];

  useKeyboardShortcuts(shortcuts);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted">Loading tactical interface...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Main tactical ops layout */}
      <div className="flex h-screen">
        {/* Left: Map area (fills available space) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Map header with overlay toggles */}
          <div className="card m-3 mb-0">
            <div className="flex justify-between items-center">
              <div className="panel-header mb-0">Tactical Map</div>
              <LayerToggle
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
                disabled={!gameStarted}
              />
            </div>
          </div>

          {/* Map canvas area */}
          <div className="flex-1 m-3 mt-2">
            <div className="card h-full p-2">
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
                onCellHighlight={(x, y) => {
                  setSelectedCell({ x, y });
                }}
                onClearHighlight={() => {
                  setSelectedCell(null);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Control Panel (collapsible) */}
        <div className={`bg-panel2 border-l border-grid/40 transition-all duration-medium ${
          rightPanelCollapsed ? 'w-12' : 'w-80'
        } flex flex-col`}>
          {/* Panel header */}
          <div className="p-3 border-b border-grid/40 flex justify-between items-center">
            {!rightPanelCollapsed && <div className="panel-header mb-0">Mission Control</div>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="w-8 h-8 p-0"
            >
              {rightPanelCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

                    {/* Panel content */}
          {!rightPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-3">
              <AccordionControlPanel
                selectedSensor={selectedSensor}
                onSensorChange={setSelectedSensor}
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
                selectedCell={selectedCell}
                gameStarted={gameStarted}
                remainingBudget={remainingBudget}
                currentTurn={currentTurn}
                onRecon={() => selectedCell && handleRecon(selectedCell.x, selectedCell.y, selectedSensor)}
                onStrike={() => selectedCell && handleStrike(selectedCell.x, selectedCell.y)}
                onStartGame={() => {
                  startGame();
                  tacticalToast.mission('started');
                }}
                onEndGame={() => {
                  endGame();
                  tacticalToast.mission('ended');
                }}
                onResetGame={() => {
                  resetGame();
                  initializeGame();
                  tacticalToast.info('Mission reset');
                }}
                reconCost={config.reconCost}
                strikeCost={config.strikeCost}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Timeline/Analytics tray (collapsible) */}
      <div className={`bg-panel border-t border-grid/40 transition-all duration-medium ${
        timelineCollapsed ? 'h-12' : 'h-64'
      }`}>
        {/* Tray header */}
        <div className="p-3 flex justify-between items-center border-b border-grid/40">
          {!timelineCollapsed && <div className="panel-header mb-0">Analytics & Timeline</div>}
          <div className="flex items-center gap-2">
            {!timelineCollapsed && lastReconData && (
              <Button
                onClick={() => setShowBayesModal(true)}
                variant="outline"
                size="sm"
                className="btn"
              >
                <span className="font-mono text-xs">EXPLAIN BAYES</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimelineCollapsed(!timelineCollapsed)}
              className="w-8 h-8 p-0"
            >
              {timelineCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Tray content */}
        {!timelineCollapsed && (
          <div className="h-52 overflow-y-auto p-3">
            <AnalyticsPanel />
          </div>
        )}
      </div>

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

      {/* Debug Panel */}
      <DebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />

      {/* Ethics footer */}
      <div className="fixed bottom-2 left-2 text-xs text-muted/60 font-mono">
        Fictional, abstract decision-making simulation. No real-world guidance.
      </div>
    </div>
  );
}