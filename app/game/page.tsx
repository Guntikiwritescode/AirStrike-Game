'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType } from '@/lib/types';
import { getWorkerManager } from '@/lib/worker-manager';

import { SensorReading } from '@/lib/sensors';
import GameCanvas from './GameCanvas';
import MapScene from '@/components/MapScene';
import { generateSampleInfrastructure, generateSampleAircraft } from '@/lib/3d-entities';
import { generateSampleBoundaries, generateSampleAOIs, generateSampleSensorCones } from '@/lib/tactical-overlays';
import AnalyticsPanel from './AnalyticsPanel';
import DebugPanel, { useDebugPanelToggle } from '@/components/DebugPanel';
import { useThrottledCallback } from '@/lib/hooks/usePerfStats';
import LatticeLayout from '@/components/layout/LatticeLayout';
import { TrackEntity } from '@/components/layout/EntityPanel';
import { LogEvent } from '@/components/layout/EventLog';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/lib/hooks/useKeyboardShortcuts';
import LoadingOverlay from '@/components/LoadingOverlay';
import BayesExplanationModal from '@/components/BayesExplanationModal';
import { useErrorOverlay, ErrorOverlay } from '@/lib/debug/error-overlay';
import { DiagnosticStepper, useDiagnosticStepper } from '@/components/DiagnosticStepper';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayerToggle } from '@/components/ui/layer-toggle';

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

  const [showLabels, setShowLabels] = useState(false);
  const [use3DMap, setUse3DMap] = useState(true);

  // Performance monitoring
  const [debugVisible, toggleDebug] = useDebugPanelToggle();

  // Error overlay for debugging
  const { errors, isVisible: errorOverlayVisible, clearErrors, copyDiagnostics } = useErrorOverlay();

  // Diagnostic stepper for tracking loading steps
  const { steps, updateStep, copyDiagnostics: copyStepperDiagnostics } = useDiagnosticStepper();

  // Lattice layout state
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<LogEvent[]>([]);
  
  // UI polish state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Generate 3D entities and tactical overlays for demonstration
  const mapBounds = {
    north: 40.7829, south: 40.7489, east: -73.9441, west: -73.9901
  };
  const infrastructure = generateSampleInfrastructure(grid, mapBounds);
  const { aircraft, flightPaths } = generateSampleAircraft(mapBounds);
  const boundaries = generateSampleBoundaries(mapBounds);
  const aois = generateSampleAOIs(mapBounds);
  const sensorCones = generateSampleSensorCones(mapBounds, infrastructure);

  // Convert game entities to track entities
  const trackEntities: TrackEntity[] = [
    ...infrastructure.map(infra => ({
      id: infra.id,
      name: infra.id.replace(/-/g, ' ').toUpperCase(),
      type: 'infrastructure' as const,
      classification: infra.isDestroyed ? 'unknown' as const : 'hostile' as const,
      position: [infra.position[1], infra.position[0]] as [number, number], // Swap for lat/lng
      lastSeen: Date.now() - Math.random() * 300000,
      confidence: 0.85 + Math.random() * 0.15,
      priority: 'high' as const,
      status: infra.isDestroyed ? 'destroyed' as const : 'active' as const
    })),
    ...aircraft.map(craft => ({
      id: craft.id,
      name: craft.id.replace(/-/g, ' ').toUpperCase(),
      type: 'aircraft' as const,
      classification: craft.isHostile ? 'hostile' as const : 'friendly' as const,
      position: [craft.position[1], craft.position[0]] as [number, number], // Swap for lat/lng
      altitude: craft.altitude,
      speed: craft.speed * 1.94384, // m/s to knots
      heading: craft.heading * 180 / Math.PI, // radians to degrees
      lastSeen: Date.now() - Math.random() * 60000,
      confidence: 0.90 + Math.random() * 0.10,
      priority: craft.isHostile ? 'high' as const : 'medium' as const,
      status: 'active' as const
    }))
  ];

  // Throttled event handlers for performance
  const throttledCellHover = useThrottledCallback((x: number, y: number) => {
    setSelectedCell({ x, y });
  }, 16); // 60fps throttling

  const throttledCellClick = useThrottledCallback((x: number, y: number, sensor: SensorType) => {
    setSelectedCell({ x, y });
    handleRecon(x, y, sensor);
  }, 50); // Slightly slower for click to avoid double-triggers

  // Lattice layout handlers
  const handleEntitySelect = useCallback((entity: TrackEntity) => {
    // Find corresponding cell position if needed
    console.log('Entity selected:', entity);
  }, []);

  const handleEntityFocus = useCallback((entity: TrackEntity) => {
    // Focus map on entity position
    console.log('Focus on entity:', entity);
  }, []);

  const handleLatticeReconAction = useCallback((entityId: string, sensorType: string) => {
    // Add event log entry
    const newEvent: LogEvent = {
      id: `evt_${Date.now()}`,
      timestamp: Date.now(),
      type: 'recon',
      action: `${sensorType.toUpperCase()}_SCAN_INITIATED`,
      entity: entityId,
      deltaScore: 0.05,
      details: 'Scan started',
      severity: 'info'
    };
    setEvents(prev => [newEvent, ...prev]);
    console.log('Recon action:', entityId, sensorType);
  }, []);

  const handleLatticeStrikeAction = useCallback((entityId: string, weaponType: string) => {
    // Add event log entry
    const newEvent: LogEvent = {
      id: `evt_${Date.now()}`,
      timestamp: Date.now(),
      type: 'strike',
      action: `${weaponType.toUpperCase()}_STRIKE_EXECUTED`,
      entity: entityId,
      deltaScore: -0.85,
      details: 'Strike completed',
      severity: 'success'
    };
    setEvents(prev => [newEvent, ...prev]);
    console.log('Strike action:', entityId, weaponType);
  }, []);

  const handleTimeControlChange = useCallback((action: 'play' | 'pause' | 'step' | 'reset') => {
    const newEvent: LogEvent = {
      id: `evt_${Date.now()}`,
      timestamp: Date.now(),
      type: 'system',
      action: `SIMULATION_${action.toUpperCase()}`,
      details: `Simulation ${action}`,
      severity: 'info'
    };
    setEvents(prev => [newEvent, ...prev]);
    
    // Handle game controls
    switch (action) {
      case 'play':
        if (!gameStarted) startGame();
        break;
      case 'pause':
        // Pause logic if needed
        break;
      case 'step':
        // Step logic if needed
        break;
      case 'reset':
        endGame();
        initializeGame();
        break;
    }
  }, [gameStarted, startGame, endGame, initializeGame]);

  const handleClearLog = useCallback(() => {
    setEvents([]);
  }, []);

  const handleExportLog = useCallback(() => {
    const logData = JSON.stringify(events, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tactical-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    onSensorChange: setSelectedSensor,
    onViewModeChange: setActiveLayer,
    onStrikeMode: () => {
      // Strike mode indication
      const newEvent: LogEvent = {
        id: `evt_${Date.now()}`,
        timestamp: Date.now(),
        type: 'user',
        action: 'STRIKE_MODE_ACTIVATED',
        details: 'Ready for kinetic engagement',
        severity: 'warning'
      };
      setEvents(prev => [newEvent, ...prev]);
    },
    onToggleLabels: () => setShowLabels(!showLabels),
    onToggleDebug: toggleDebug,
    onToggleHelp: () => setShowKeyboardHelp(!showKeyboardHelp),
    onPlayPause: () => {
      if (gameStarted) {
        endGame();
      } else {
        startGame();
      }
    },
    onCancel: () => {
      setSelectedCell(null);
      setShowKeyboardHelp(false);
    },
    enabled: true
  });

  // Handle recon action
  const handleRecon = async (x: number, y: number, sensor: SensorType) => {
    if (!gameStarted || remainingBudget < config.reconCost) {
      tacticalToast.constraint('Budget', remainingBudget, config.reconCost);
      return;
    }
    
    // Add bounds checking before grid access
    if (!grid[y] || !grid[y][x]) return;
    
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
      const initializeApp = async () => {
        try {
          // Step 1: Fonts (simulate checking if fonts are loaded)
          updateStep('fonts', { status: 'running', details: 'Checking font loading...' });
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to show the step
          updateStep('fonts', { status: 'success' });

          // Step 2: Store initialization
          updateStep('store', { status: 'running', details: 'Loading game state...' });
          const loaded = loadFromLocalStorage();
          updateStep('store', { status: 'success' });

          // Step 3: Map data
          updateStep('map', { status: 'running', details: 'Loading map bounds and entities...' });
          await new Promise(resolve => setTimeout(resolve, 200));
          updateStep('map', { status: 'success' });

          // Step 4: Simulation worker
          updateStep('simWorker', { status: 'running', details: 'Initializing web worker...' });
          try {
            const workerManager = getWorkerManager();
            await workerManager.initialize();
            updateStep('simWorker', { status: 'success' });
          } catch (error) {
            updateStep('simWorker', { 
              status: 'error', 
              errorMessage: error instanceof Error ? error.message : 'Failed to initialize worker'
            });
          }

          // Step 5: Performance worker (placeholder)
          updateStep('perfWorker', { status: 'running', details: 'Starting performance monitoring...' });
          await new Promise(resolve => setTimeout(resolve, 100));
          updateStep('perfWorker', { status: 'success' });

          // Step 6: Initial game setup
          updateStep('heatmaps', { status: 'running', details: 'Generating initial game state...' });
          if (!loaded) {
            initializeGame();
          }
          updateStep('heatmaps', { status: 'success' });

          setMounted(true);
        } catch (error) {
          console.error('Initialization error:', error);
          // Find the currently running step and mark it as errored
          const runningStepId = steps.find(s => s.status === 'running')?.id;
          if (runningStepId) {
            updateStep(runningStepId, { 
              status: 'error', 
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      };

      initializeApp();
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
  }, [mounted, loadFromLocalStorage, updateStep, initializeGame, steps]);

  // Save to localStorage when game state changes
  useEffect(() => {
    if (mounted) {
      saveToLocalStorage();
    }
  }, [grid, mounted, saveToLocalStorage]);



  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <DiagnosticStepper 
          steps={steps} 
          onCopyDiagnostics={copyStepperDiagnostics}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Lattice Layout */}
      <LatticeLayout
        onEntitySelect={handleEntitySelect}
        onEntityFocus={handleEntityFocus}
        onReconAction={handleLatticeReconAction}
        onStrikeAction={handleLatticeStrikeAction}
        onSeedChange={(seed) => console.log('Seed changed:', seed)}
        onTimeControlChange={handleTimeControlChange}
        onQuickSearch={setSearchQuery}
        onClearLog={handleClearLog}
        onExportLog={handleExportLog}
        searchQuery={searchQuery}
        entities={trackEntities}
        events={events}
      >
        {/* Map area content */}
        <div className="w-full h-full flex flex-col">
          {/* Map header with overlay toggles */}
          <div className="tactical-card m-5 mb-0">
            <div className="flex justify-between items-center">
              <div className="tactical-header mb-0">Tactical Map</div>
              <div className="flex items-center gap-3">
                <LayerToggle
                  activeLayer={activeLayer}
                  onLayerChange={setActiveLayer}
                  showLabels={showLabels}
                  onLabelsChange={setShowLabels}
                  disabled={!gameStarted}
                />
                <Button
                  variant={use3DMap ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUse3DMap(!use3DMap)}
                  className="font-mono text-xs uppercase tracking-wider"
                  title={use3DMap ? 'Switch to 2D canvas' : 'Switch to 3D terrain'}
                >
                  {use3DMap ? '3D' : '2D'}
                </Button>
              </div>
            </div>
          </div>

          {/* Map canvas area */}
          <div className="flex-1 m-5 mt-3">
            <div className="tactical-card h-full p-3">
                              {use3DMap ? (
                  <MapScene
                    grid={grid}
                    config={config}
                    viewMode={activeLayer}
                    showLabels={showLabels}
                    onCellClick={(x, y) => throttledCellClick(x, y, selectedSensor)}
                    onCellHover={throttledCellHover}
                    bounds={mapBounds}
                    infrastructure={infrastructure}
                    aircraft={aircraft}
                    flightPaths={flightPaths}
                    boundaries={boundaries}
                    aois={aois}
                    sensorCones={sensorCones}
                  />
                ) : (
                <GameCanvas 
                  selectedSensor={selectedSensor}
                  onSensorChange={setSelectedSensor}
                  onCellClick={(x, y) => throttledCellClick(x, y, selectedSensor)}
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
              )}
            </div>
          </div>
        </div>

        {/* Right: Control Panel (collapsible) */}
        <div className={`bg-panel2 border-l border-grid/40 transition-all duration-300 ${
          rightPanelCollapsed ? 'w-12' : 'w-80'
        } flex flex-col`}>
          {/* Panel header */}
          <div className="p-5 border-b border-grid/40 flex justify-between items-center">
            {!rightPanelCollapsed && <div className="tactical-header mb-0">Mission Control</div>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="w-8 h-8 p-0 tactical-focus"
            >
              {rightPanelCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

                    {/* Panel content */}
          {!rightPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-5">
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
      </LatticeLayout>

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

      {/* Performance Debug Panel */}
      <DebugPanel isVisible={debugVisible} onToggle={toggleDebug} />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />

      {/* Error Overlay for Debug Mode */}
      <ErrorOverlay 
        errors={errors}
        isVisible={errorOverlayVisible}
        onClear={clearErrors}
        onCopyDiagnostics={copyDiagnostics}
      />

      {/* Professional footer disclaimer */}
      <div className="fixed bottom-4 left-4 text-xs text-muted/60 font-mono bg-panel/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-grid/20">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-warn/60 rounded-full animate-pulse"></div>
          <span>Fictional, abstract simulation • No real-world guidance</span>
        </div>
      </div>
    </div>
  );
}