import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GameState, GameConfig, GameCell, SensorType, ReconResult, GameEvent, TruthField } from '@/lib/types';
import { SeededRNG, getDailySeed, generateRandomSeed, createSubRNG } from '@/lib/rng';
import { 
  generateTruthField, 
  createEnhancedGameCells, 
  calculateSpatialCorrelation, 
  calculateSpatialAccuracy,
  DEFAULT_SPATIAL_CONFIG,
  DEFAULT_BETA_PRIORS
} from '@/lib/truth-generation';
import {
  simulateSensorReading,
  generateCellContext,
  calculateEffectivePerformance,
  DEFAULT_CONTEXT
} from '@/lib/sensors';
import {
  updatePosteriorOdds,
  applySpatialDiffusion,
  RunningCalibration,
  DEFAULT_DIFFUSION_CONFIG
} from '@/lib/inference';

const DEFAULT_CONFIG: GameConfig = {
  gridSize: 14,
  initialBudget: 1000,
  maxTurns: 10,
  hostileValue: 100,
  infraPenalty: 200,
  strikeCost: 50,
  reconCost: 10,
  collateralThreshold: 0.1,
  riskAversion: 0.5,
  seed: getDailySeed(),
  
  // Enhanced truth generation config
  spatialField: DEFAULT_SPATIAL_CONFIG,
  betaPriors: DEFAULT_BETA_PRIORS,
  
  // Development options
  showTruthOverlay: false,
};

const createInitialTruthField = (size: number): TruthField => {
  // Create empty truth field for initial state
  const emptyField = Array(size).fill(null).map(() => Array(size).fill(0));
  const emptyTruth = Array(size).fill(null).map(() => Array(size).fill(false));
  
  return {
    hostileField: emptyField,
    infraField: emptyField,
    hostileTruth: emptyTruth,
    infraTruth: emptyTruth,
  };
};

// Global running calibration tracker
const runningCalibration = new RunningCalibration();

const createInitialState = (): GameState => ({
  grid: [],
  config: DEFAULT_CONFIG,
  currentTurn: 0,
  remainingBudget: DEFAULT_CONFIG.initialBudget,
  score: 0,
  gameStarted: false,
  gameEnded: false,
  eventLog: [],
  analytics: {
    hostilesNeutralized: 0,
    infraHits: 0,
    totalCost: 0,
    brierScore: 0,
    logLoss: 0,
    calibrationData: [],
    evAccuracy: 0,
    truthCorrelation: 0,
    spatialAccuracy: 0,
    calibrationError: 0,
    reliability: 0,
    resolution: 0,
    uncertainty: 0,
    totalPredictions: 0,
  },
  truthField: createInitialTruthField(DEFAULT_CONFIG.gridSize),
});

interface GameStore extends GameState {
  // Actions
  initializeGame: (config?: Partial<GameConfig>) => void;
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  useDailySeed: () => void;
  useRandomSeed: () => void;
  performRecon: (x: number, y: number, sensor: SensorType) => void;
  performStrike: (x: number, y: number, radius: number) => void;
  nextTurn: () => void;
  updateConfig: (config: Partial<GameConfig>) => void;
  
  // Truth overlay for development
  toggleTruthOverlay: () => void;
  
  // Enhanced analytics
  updateSpatialAnalytics: () => void;
  
  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
}

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    
    initializeGame: (configOverrides = {}) => {
      set((state) => {
        const newConfig = { ...DEFAULT_CONFIG, ...configOverrides };
        state.config = newConfig;
        
        // Generate enhanced truth field using Gaussian-smoothed noise
        state.truthField = generateTruthField(
          newConfig.gridSize,
          newConfig.gridSize,
          newConfig.spatialField,
          newConfig.betaPriors,
          newConfig.seed
        );
        
        // Create game cells with enhanced truth and Beta priors
        state.grid = createEnhancedGameCells(
          newConfig.gridSize,
          newConfig.gridSize,
          state.truthField,
          newConfig.betaPriors
        );
        
        state.currentTurn = 0;
        state.remainingBudget = newConfig.initialBudget;
        state.score = 0;
        state.gameStarted = false;
        state.gameEnded = false;
        state.eventLog = [];
        state.analytics = {
          hostilesNeutralized: 0,
          infraHits: 0,
          totalCost: 0,
          brierScore: 0,
          logLoss: 0,
          calibrationData: [],
          evAccuracy: 0,
          truthCorrelation: 0,
          spatialAccuracy: 0,
          calibrationError: 0,
          reliability: 0,
          resolution: 0,
          uncertainty: 0,
          totalPredictions: 0,
        };
        
        // Reset calibration tracker
        runningCalibration.reset();
      });
    },
    
    startGame: () => {
      set((state) => {
        state.gameStarted = true;
        state.eventLog.push({
          turn: 0,
          type: 'game_start',
          data: { seed: state.config.seed },
          timestamp: Date.now(),
        });
      });
    },
    
    endGame: () => {
      set((state) => {
        state.gameEnded = true;
        state.eventLog.push({
          turn: state.currentTurn,
          type: 'game_end',
          data: { score: state.score },
          timestamp: Date.now(),
        });
      });
    },
    
    resetGame: () => {
      set((state) => {
        const newState = createInitialState();
        Object.assign(state, newState);
      });
    },
    
    useDailySeed: () => {
      set((state) => {
        state.config.seed = getDailySeed();
      });
    },
    
    useRandomSeed: () => {
      set((state) => {
        state.config.seed = generateRandomSeed();
      });
    },
    
    performRecon: (x: number, y: number, sensor: SensorType) => {
      set((state) => {
        const cell = state.grid[y][x];
        if (!cell) return;
        
        // Generate context for this cell
        const contextRng = createSubRNG(state.config.seed, `context-${x}-${y}`);
        const context = generateCellContext(x, y, state.config.gridSize, contextRng);
        
        // Calculate effective sensor performance
        const performance = calculateEffectivePerformance(sensor, context);
        
        // Check if we can afford the recon
        if (state.remainingBudget < performance.effectiveCost) return;
        
        // Generate sensor reading
        const readingRng = createSubRNG(
          state.config.seed, 
          `recon-${state.currentTurn}-${x}-${y}-${sensor}`
        );
        const sensorReading = simulateSensorReading(
          sensor, 
          cell.hasHostile, 
          context, 
          readingRng
        );
        
        // Store prior probability for calibration tracking
        const priorProbability = cell.posteriorProbability;
        
        // Update posterior using Bayesian inference
        const posteriorProbability = updatePosteriorOdds(priorProbability, sensorReading);
        
        // Apply spatial diffusion to neighboring cells
        applySpatialDiffusion(state.grid, x, y, posteriorProbability, DEFAULT_DIFFUSION_CONFIG);
        
        // Update the target cell
        cell.posteriorProbability = posteriorProbability;
        
        // Add to recon history with full context
        cell.reconHistory.push({
          sensor,
          result: sensorReading.result,
          turn: state.currentTurn,
          timestamp: Date.now(),
          effectiveTPR: sensorReading.effectiveTPR,
          effectiveFPR: sensorReading.effectiveFPR,
          confidence: sensorReading.confidence,
          contextSummary: performance.contextSummary,
          priorProbability,
          posteriorProbability,
        });
        
        // Update budget and costs
        state.remainingBudget -= performance.effectiveCost;
        state.analytics.totalCost += performance.effectiveCost;
        
        // Track calibration - add prediction before we know the outcome
        runningCalibration.addPrediction(posteriorProbability, cell.hasHostile);
        state.analytics.totalPredictions++;
        
        // Update calibration metrics
        const calibrationMetrics = runningCalibration.getMetrics();
        state.analytics.brierScore = calibrationMetrics.brierScore;
        state.analytics.logLoss = calibrationMetrics.logLoss;
        state.analytics.calibrationError = calibrationMetrics.calibrationError;
        state.analytics.reliability = calibrationMetrics.reliability;
        state.analytics.resolution = calibrationMetrics.resolution;
        state.analytics.uncertainty = calibrationMetrics.uncertainty;
        
        // Update calibration data for plotting
        state.analytics.calibrationData = calibrationMetrics.buckets.map(bucket => ({
          predicted: bucket.averagePrediction,
          actual: bucket.actualRate,
          count: bucket.count,
        }));
        
        // Log event with enhanced data
        state.eventLog.push({
          turn: state.currentTurn,
          type: 'recon',
          data: { 
            x, 
            y, 
            sensor, 
            reading: sensorReading.result,
            posterior: posteriorProbability,
            prior: priorProbability,
            effectiveTPR: sensorReading.effectiveTPR,
            effectiveFPR: sensorReading.effectiveFPR,
            confidence: sensorReading.confidence,
            context: performance.contextSummary,
            cost: performance.effectiveCost,
          },
          timestamp: Date.now(),
        });
        
        // Update spatial analytics after each recon
        get().updateSpatialAnalytics();
      });
    },
    
    performStrike: (x: number, y: number, radius: number) => {
      set((state) => {
        const cost = state.config.strikeCost;
        if (state.remainingBudget < cost) return;
        
        let hostilesHit = 0;
        let infraHit = 0;
        const affectedCells: { x: number, y: number }[] = [];
        
        // Calculate Area of Effect (Manhattan distance)
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= radius) {
              const cellX = x + dx;
              const cellY = y + dy;
              
              if (cellX >= 0 && cellX < state.config.gridSize &&
                  cellY >= 0 && cellY < state.config.gridSize) {
                const cell = state.grid[cellY][cellX];
                affectedCells.push({ x: cellX, y: cellY });
                
                if (cell.hasHostile) {
                  hostilesHit++;
                  cell.hasHostile = false; // Neutralize hostile
                }
                
                if (cell.hasInfrastructure) {
                  infraHit++;
                }
              }
            }
          }
        }
        
        const points = hostilesHit * state.config.hostileValue - 
                      infraHit * state.config.infraPenalty - cost;
        
        state.score += points;
        state.remainingBudget -= cost;
        state.analytics.hostilesNeutralized += hostilesHit;
        state.analytics.infraHits += infraHit;
        state.analytics.totalCost += cost;
        
        state.eventLog.push({
          turn: state.currentTurn,
          type: 'strike',
          data: { x, y, radius, hostilesHit, infraHit, points, affectedCells },
          timestamp: Date.now(),
        });
      });
    },
    
    nextTurn: () => {
      set((state) => {
        state.currentTurn++;
        if (state.currentTurn >= state.config.maxTurns) {
          state.gameEnded = true;
        }
      });
    },
    
    updateConfig: (configOverrides) => {
      set((state) => {
        state.config = { ...state.config, ...configOverrides };
      });
    },
    
    toggleTruthOverlay: () => {
      set((state) => {
        state.config.showTruthOverlay = !state.config.showTruthOverlay;
      });
    },
    
    updateSpatialAnalytics: () => {
      set((state) => {
        // Calculate correlation between posterior beliefs and truth
        const posteriorField = state.grid.map(row => 
          row.map(cell => cell.posteriorProbability)
        );
        const truthField = state.grid.map(row => 
          row.map(cell => cell.hasHostile ? 1 : 0)
        );
        
        state.analytics.truthCorrelation = calculateSpatialCorrelation(posteriorField, truthField);
        state.analytics.spatialAccuracy = calculateSpatialAccuracy(posteriorField, truthField);
      });
    },
    
    saveToLocalStorage: () => {
      const state = get();
      try {
        localStorage.setItem('bayesian-forward-operator-game', JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    },
    
    loadFromLocalStorage: () => {
      try {
        const saved = localStorage.getItem('bayesian-forward-operator-game');
        if (saved) {
          const state = JSON.parse(saved);
          set(state);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return false;
      }
    },
  }))
);