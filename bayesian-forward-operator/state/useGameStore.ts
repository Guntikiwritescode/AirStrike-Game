import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GameState, GameConfig, GameCell, SensorType, ReconResult, GameEvent } from '@/lib/types';
import { SeededRNG, getDailySeed, generateRandomSeed } from '@/lib/rng';

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
};

const createInitialGrid = (size: number): GameCell[][] => {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      x,
      y,
      hasHostile: false,
      hasInfrastructure: false,
      posteriorProbability: 0.3, // Prior probability
      reconHistory: [],
    }))
  );
};

const createInitialState = (): GameState => ({
  grid: createInitialGrid(DEFAULT_CONFIG.gridSize),
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
  },
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
        state.grid = createInitialGrid(newConfig.gridSize);
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
        };
        
        // Generate truth using seeded RNG
        const rng = new SeededRNG(newConfig.seed);
        
        // Generate spatial field for hostiles (simplified Gaussian kernel)
        const hostileField: number[][] = [];
        for (let y = 0; y < newConfig.gridSize; y++) {
          hostileField[y] = [];
          for (let x = 0; x < newConfig.gridSize; x++) {
            // Create clustered hostiles using distance from random centers
            let baseRate = 0.2;
            const numCenters = rng.randInt(2, 5);
            
            for (let i = 0; i < numCenters; i++) {
              const centerX = rng.randFloat(0, newConfig.gridSize);
              const centerY = rng.randFloat(0, newConfig.gridSize);
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const influence = Math.exp(-dist / 3) * 0.4;
              baseRate += influence;
            }
            
            hostileField[y][x] = Math.min(0.8, baseRate);
            state.grid[y][x].hasHostile = rng.bernoulli(hostileField[y][x]);
          }
        }
        
        // Generate sparse infrastructure
        const infraRate = 0.05;
        for (let y = 0; y < newConfig.gridSize; y++) {
          for (let x = 0; x < newConfig.gridSize; x++) {
            state.grid[y][x].hasInfrastructure = rng.bernoulli(infraRate);
          }
        }
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
        
        // Sensor configurations
        const sensors = {
          drone: { tpr: 0.85, fpr: 0.15, cost: 10 },
          sigint: { tpr: 0.60, fpr: 0.05, cost: 15 },
          ground: { tpr: 0.75, fpr: 0.10, cost: 20 },
        };
        
        const sensorConfig = sensors[sensor];
        const cost = sensorConfig.cost;
        
        if (state.remainingBudget < cost) return;
        
        // Generate sensor reading
        const rng = new SeededRNG(`${state.config.seed}-recon-${state.currentTurn}-${x}-${y}-${sensor}`);
        const hasHostile = cell.hasHostile;
        const reading = hasHostile 
          ? rng.bernoulli(sensorConfig.tpr) 
          : rng.bernoulli(sensorConfig.fpr);
        
        // Update posterior using odds form
        const prior = cell.posteriorProbability;
        const priorOdds = prior / (1 - prior);
        
        const likelihoodRatio = reading
          ? sensorConfig.tpr / sensorConfig.fpr
          : (1 - sensorConfig.tpr) / (1 - sensorConfig.fpr);
        
        const posteriorOdds = priorOdds * likelihoodRatio;
        const posterior = posteriorOdds / (1 + posteriorOdds);
        
        cell.posteriorProbability = Math.max(0.001, Math.min(0.999, posterior));
        cell.reconHistory.push({
          sensor,
          result: reading,
          turn: state.currentTurn,
          timestamp: Date.now(),
        });
        
        state.remainingBudget -= cost;
        state.analytics.totalCost += cost;
        
        state.eventLog.push({
          turn: state.currentTurn,
          type: 'recon',
          data: { x, y, sensor, reading, posterior: cell.posteriorProbability },
          timestamp: Date.now(),
        });
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