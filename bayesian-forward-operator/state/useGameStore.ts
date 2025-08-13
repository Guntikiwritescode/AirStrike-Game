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
import {
  calculateStrikeEV,
  validateStrike,
  executeStrike,
  generateEVHeatmap,
  generateVOIHeatmap,
  recommendAction
} from '@/lib/decision-analysis';
import {
  generateRiskAverseHeatmap,
  generateVarianceHeatmap,
  generateLossRiskHeatmap,
  getAllPolicyRecommendations,
  PolicyType,
  PolicyRecommendation
} from '@/lib/risk-analysis';

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
  performStrike: (x: number, y: number, radius: number, forceExecute?: boolean) => void;
  nextTurn: () => void;
  updateConfig: (config: Partial<GameConfig>) => void;
  
  // Truth overlay for development
  toggleTruthOverlay: () => void;
  
  // Enhanced analytics
  updateSpatialAnalytics: () => void;
  
  // Decision analysis
  getEVHeatmap: (radius?: number) => number[][];
  getVOIHeatmap: (sensor: SensorType, radius?: number) => number[][];
  getRecommendation: (sensor: SensorType) => any;
  validateStrikeAction: (x: number, y: number, radius: number) => any;
  
  // Risk analysis
  getRiskAverseHeatmap: (radius?: number, riskAversion?: number) => number[][];
  getVarianceHeatmap: (radius?: number) => number[][];
  getLossRiskHeatmap: (radius?: number) => number[][];
  getPolicyRecommendations: (sensor: SensorType, riskAversion?: number) => Record<PolicyType, PolicyRecommendation>;
  
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
    
    performStrike: (x: number, y: number, radius: number, forceExecute: boolean = false) => {
      set((state) => {
        // Validate strike constraints
        const validation = validateStrike(state.grid, x, y, radius, state.config);
        
        // Check budget
        if (state.remainingBudget < validation.outcome.cost) {
          console.warn('Insufficient budget for strike');
          return;
        }
        
        // Check collateral damage constraints
        if (!validation.allowed && !forceExecute) {
          console.warn('Strike blocked:', validation.reason);
          return;
        }
        
        if (validation.requiresConfirmation && !forceExecute) {
          console.warn('Strike requires confirmation:', validation.reason);
          return;
        }
        
        // Execute the strike against truth
        const result = executeStrike(state.grid, x, y, radius, state.config);
        
        // Update game state with actual results
        state.score += result.netPoints;
        state.remainingBudget -= validation.outcome.cost;
        state.analytics.hostilesNeutralized += result.hostilesHit;
        state.analytics.infraHits += result.infraHit;
        state.analytics.totalCost += validation.outcome.cost;
        
        // Log detailed strike event
        state.eventLog.push({
          turn: state.currentTurn,
          type: 'strike',
          data: { 
            x, 
            y, 
            radius,
            hostilesHit: result.hostilesHit,
            infraHit: result.infraHit,
            totalReward: result.totalReward,
            totalPenalty: result.totalPenalty,
            netPoints: result.netPoints,
            cost: validation.outcome.cost,
            expectedValue: validation.outcome.expectedValue,
            actualValue: result.netPoints,
            affectedCells: result.affectedCells,
            validation: validation.reason,
          },
          timestamp: Date.now(),
        });
        
        // Update spatial analytics after strike
        get().updateSpatialAnalytics();
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
    
    getEVHeatmap: (radius = 1) => {
      const state = get();
      return generateEVHeatmap(state.grid, radius, state.config);
    },
    
    getVOIHeatmap: (sensor: SensorType, radius = 1) => {
      const state = get();
      return generateVOIHeatmap(state.grid, sensor, state.config, radius, state.config.seed);
    },
    
    getRecommendation: (sensor: SensorType) => {
      const state = get();
      return recommendAction(state.grid, state.config, state.remainingBudget, state.currentTurn, sensor);
    },
    
    validateStrikeAction: (x: number, y: number, radius: number) => {
      const state = get();
      return validateStrike(state.grid, x, y, radius, state.config);
    },
    
    getRiskAverseHeatmap: (radius = 1, riskAversion = 0.5) => {
      const state = get();
      return generateRiskAverseHeatmap(state.grid, radius, state.config, riskAversion);
    },
    
    getVarianceHeatmap: (radius = 1) => {
      const state = get();
      return generateVarianceHeatmap(state.grid, radius, state.config);
    },
    
    getLossRiskHeatmap: (radius = 1) => {
      const state = get();
      return generateLossRiskHeatmap(state.grid, radius, state.config);
    },
    
    getPolicyRecommendations: (sensor: SensorType, riskAversion = 0.5) => {
      const state = get();
      return getAllPolicyRecommendations(
        state.grid, 
        state.config, 
        state.remainingBudget, 
        state.currentTurn, 
        sensor, 
        riskAversion
      );
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