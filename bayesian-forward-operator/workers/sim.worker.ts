import * as Comlink from 'comlink';

// Import all the computational modules
import { GameCell, GameConfig, SensorType } from '../lib/types';
import { createSubRNG } from '../lib/rng';
import { 
  simulateSensorReading, 
  generateCellContext, 
  calculateEffectivePerformance,
  SensorReading 
} from '../lib/sensors';
import { 
  updatePosteriorOdds, 
  applySpatialDiffusion, 
  calculateBrierScore,
  calculateLogLoss,
  DEFAULT_DIFFUSION_CONFIG 
} from '../lib/inference';
import { 
  calculateStrikeEV, 
  getAoECells, 
  generateEVHeatmap, 
  generateVOIHeatmap,
  StrikeOutcome 
} from '../lib/decision-analysis';
import {
  generateMonteCarloSamples,
  generateImportanceSamples,
  evaluateStrikeRisk,
  generateRiskAverseHeatmap,
  generateVarianceHeatmap,
  generateLossRiskHeatmap,
  getAllPolicyRecommendations,
  MonteCarloConfig,
  RiskMetrics,
  PolicyType,
  PolicyRecommendation,
  SampledWorld
} from '../lib/risk-analysis';

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number, stage: string) => void;

/**
 * Heavy computation result with performance metrics
 */
export interface ComputationResult<T> {
  result: T;
  computationTime: number;
  samplesUsed?: number;
  cacheHit?: boolean;
}

/**
 * Inference computation worker
 */
export class InferenceWorker {
  public cache = new Map<string, any>();
  
  /**
   * Perform reconnaissance with spatial diffusion
   */
  async performReconComputation(
    grid: GameCell[][],
    x: number,
    y: number,
    sensor: SensorType,
    config: GameConfig,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<{
    newPosterior: number;
    sensorReading: SensorReading;
    spatialUpdates: { x: number; y: number; newPosterior: number }[];
    brierContribution: number;
    logLossContribution: number;
  }>> {
    const startTime = performance.now();
    
    onProgress?.(0.1, 'Generating context');
    
    // Generate context for this recon
    const contextRng = createSubRNG(config.seed, `context-${x}-${y}`);
    const context = generateCellContext(x, y, config.gridSize, contextRng);
    const performance_metrics = calculateEffectivePerformance(sensor, context);
    
    onProgress?.(0.3, 'Simulating sensor reading');
    
    // Simulate sensor reading
    const readingRng = createSubRNG(
      config.seed,
      `recon-${Date.now()}-${x}-${y}-${sensor}`
    );
    const cell = grid[y][x];
    const sensorReading = simulateSensorReading(
      sensor,
      cell.hasHostile,
      context,
      readingRng
    );
    
    onProgress?.(0.5, 'Updating posterior probability');
    
    // Update posterior probability
    const priorProbability = cell.posteriorProbability;
    const newPosterior = updatePosteriorOdds(priorProbability, sensorReading);
    
    onProgress?.(0.7, 'Applying spatial diffusion');
    
    // Apply spatial diffusion and collect updates
    const gridCopy = grid.map(row => row.map(cell => ({ ...cell })));
    gridCopy[y][x].posteriorProbability = newPosterior;
    
    applySpatialDiffusion(gridCopy, x, y, newPosterior, DEFAULT_DIFFUSION_CONFIG);
    
    // Collect spatial updates
    const spatialUpdates: { x: number; y: number; newPosterior: number }[] = [];
    for (let sy = 0; sy < gridCopy.length; sy++) {
      for (let sx = 0; sx < gridCopy[sy].length; sx++) {
        if (gridCopy[sy][sx].posteriorProbability !== grid[sy][sx].posteriorProbability) {
          spatialUpdates.push({
            x: sx,
            y: sy,
            newPosterior: gridCopy[sy][sx].posteriorProbability
          });
        }
      }
    }
    
    onProgress?.(0.9, 'Calculating metrics');
    
    // Calculate calibration metrics
    const brierContribution = calculateBrierScore(newPosterior, cell.hasHostile);
    const logLossContribution = calculateLogLoss(newPosterior, cell.hasHostile);
    
    onProgress?.(1.0, 'Complete');
    
    const computationTime = performance.now() - startTime;
    
    return {
      result: {
        newPosterior,
        sensorReading,
        spatialUpdates,
        brierContribution,
        logLossContribution
      },
      computationTime
    };
  }
}

/**
 * Decision analysis computation worker
 */
export class DecisionAnalysisWorker {
  public cache = new Map<string, any>();
  
  /**
   * Generate Expected Value heatmap
   */
  async generateEVHeatmapComputation(
    grid: GameCell[][],
    radius: number,
    config: GameConfig,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<number[][]>> {
    const startTime = performance.now();
    const cacheKey = `ev-${JSON.stringify({ gridHash: this.hashGrid(grid), radius, config })}`;
    
    if (this.cache.has(cacheKey)) {
      return {
        result: this.cache.get(cacheKey),
        computationTime: 0,
        cacheHit: true
      };
    }
    
    onProgress?.(0.1, 'Initializing EV calculation');
    
    const height = grid.length;
    const width = grid[0].length;
    const evHeatmap: number[][] = Array(height).fill(null).map(() => Array(width).fill(-Infinity));
    
    const totalCells = height * width;
    let processedCells = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outcome = calculateStrikeEV(grid, x, y, radius, config);
        evHeatmap[y][x] = outcome.expectedValue;
        
        processedCells++;
        const progress = 0.1 + (0.8 * processedCells / totalCells);
        onProgress?.(progress, `Computing EV for cell (${x}, ${y})`);
      }
    }
    
    onProgress?.(1.0, 'EV heatmap complete');
    
    this.cache.set(cacheKey, evHeatmap);
    const computationTime = performance.now() - startTime;
    
    return {
      result: evHeatmap,
      computationTime
    };
  }
  
  /**
   * Generate Value of Information heatmap
   */
  async generateVOIHeatmapComputation(
    grid: GameCell[][],
    sensor: SensorType,
    config: GameConfig,
    strikeRadius: number = 1,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<number[][]>> {
    const startTime = performance.now();
    const cacheKey = `voi-${JSON.stringify({ gridHash: this.hashGrid(grid), sensor, config })}`;
    
    if (this.cache.has(cacheKey)) {
      return {
        result: this.cache.get(cacheKey),
        computationTime: 0,
        cacheHit: true
      };
    }
    
    onProgress?.(0.1, 'Initializing VOI calculation');
    
    const voiHeatmap = generateVOIHeatmap(grid, sensor, config, strikeRadius, config.seed);
    
    onProgress?.(1.0, 'VOI heatmap complete');
    
    this.cache.set(cacheKey, voiHeatmap);
    const computationTime = performance.now() - startTime;
    
    return {
      result: voiHeatmap,
      computationTime
    };
  }
  
  private hashGrid(grid: GameCell[][]): string {
    // Simple hash of grid state for caching
    return grid.map(row => 
      row.map(cell => `${cell.posteriorProbability.toFixed(3)}`).join(',')
    ).join('|');
  }
}

/**
 * Monte Carlo sampling and risk analysis worker
 */
export class RiskAnalysisWorker {
  public cache = new Map<string, any>();
  
  /**
   * Generate Monte Carlo samples
   */
  async generateMonteCarloSamplesComputation(
    grid: GameCell[][],
    config: MonteCarloConfig,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<SampledWorld[]>> {
    const startTime = performance.now();
    const cacheKey = `mc-${JSON.stringify({ gridHash: this.hashGrid(grid), config })}`;
    
    if (this.cache.has(cacheKey)) {
      return {
        result: this.cache.get(cacheKey),
        computationTime: 0,
        samplesUsed: config.numSamples,
        cacheHit: true
      };
    }
    
    onProgress?.(0.1, 'Starting Monte Carlo sampling');
    
    // Progress tracking function
    const progressCallback = (sampleIndex: number) => {
      const progress = 0.1 + (0.8 * sampleIndex / config.numSamples);
      onProgress?.(progress, `Generating sample ${sampleIndex + 1}/${config.numSamples}`);
    };
    
    const samples = await this.generateSamplesWithProgress(grid, config, progressCallback);
    
    onProgress?.(1.0, 'Monte Carlo sampling complete');
    
    this.cache.set(cacheKey, samples);
    const computationTime = performance.now() - startTime;
    
    return {
      result: samples,
      computationTime,
      samplesUsed: config.numSamples
    };
  }
  
  /**
   * Generate risk-averse utility heatmap
   */
  async generateRiskAverseHeatmapComputation(
    grid: GameCell[][],
    radius: number,
    config: GameConfig,
    riskAversion: number = 0.5,
    numSamples: number = 256,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<number[][]>> {
    const startTime = performance.now();
    
    onProgress?.(0.1, 'Generating Monte Carlo samples for risk analysis');
    
    // Generate Monte Carlo samples
    const mcConfig: MonteCarloConfig = {
      numSamples,
      seed: config.seed + '-risk',
      useImportanceSampling: false,
      spatialCorrelation: false,
    };
    
    const samples = generateMonteCarloSamples(grid, mcConfig);
    
    onProgress?.(0.3, 'Computing risk metrics');
    
    const height = grid.length;
    const width = grid[0].length;
    const utilityHeatmap: number[][] = Array(height).fill(null).map(() => Array(width).fill(-Infinity));
    
    const totalCells = height * width;
    let processedCells = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const riskMetrics = evaluateStrikeRisk(x, y, radius, samples, config);
        const utility = riskMetrics.expectedValue - riskAversion * Math.abs(riskMetrics.cvar95);
        utilityHeatmap[y][x] = utility;
        
        processedCells++;
        const progress = 0.3 + (0.6 * processedCells / totalCells);
        onProgress?.(progress, `Computing risk for cell (${x}, ${y})`);
      }
    }
    
    onProgress?.(1.0, 'Risk analysis complete');
    
    const computationTime = performance.now() - startTime;
    
    return {
      result: utilityHeatmap,
      computationTime,
      samplesUsed: numSamples
    };
  }
  
  /**
   * Generate variance heatmap
   */
  async generateVarianceHeatmapComputation(
    grid: GameCell[][],
    radius: number,
    config: GameConfig,
    numSamples: number = 256,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<number[][]>> {
    const startTime = performance.now();
    
    onProgress?.(0.1, 'Generating samples for variance analysis');
    
    const mcConfig: MonteCarloConfig = {
      numSamples,
      seed: config.seed + '-variance',
      useImportanceSampling: false,
      spatialCorrelation: false,
    };
    
    const samples = generateMonteCarloSamples(grid, mcConfig);
    
    onProgress?.(0.3, 'Computing variance metrics');
    
    const varianceHeatmap = generateVarianceHeatmap(grid, radius, config);
    
    onProgress?.(1.0, 'Variance analysis complete');
    
    const computationTime = performance.now() - startTime;
    
    return {
      result: varianceHeatmap,
      computationTime,
      samplesUsed: numSamples
    };
  }
  
  /**
   * Generate loss risk heatmap
   */
  async generateLossRiskHeatmapComputation(
    grid: GameCell[][],
    radius: number,
    config: GameConfig,
    numSamples: number = 256,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<number[][]>> {
    const startTime = performance.now();
    
    onProgress?.(0.1, 'Generating samples for loss risk analysis');
    
    const mcConfig: MonteCarloConfig = {
      numSamples,
      seed: config.seed + '-loss',
      useImportanceSampling: false,
      spatialCorrelation: false,
    };
    
    const samples = generateMonteCarloSamples(grid, mcConfig);
    
    onProgress?.(0.3, 'Computing loss probabilities');
    
    const lossRiskHeatmap = generateLossRiskHeatmap(grid, radius, config);
    
    onProgress?.(1.0, 'Loss risk analysis complete');
    
    const computationTime = performance.now() - startTime;
    
    return {
      result: lossRiskHeatmap,
      computationTime,
      samplesUsed: numSamples
    };
  }
  
  /**
   * Get policy recommendations
   */
  async getPolicyRecommendationsComputation(
    grid: GameCell[][],
    config: GameConfig,
    remainingBudget: number,
    currentTurn: number,
    selectedSensor: SensorType,
    riskAversion: number = 0.5,
    onProgress?: ProgressCallback
  ): Promise<ComputationResult<Record<PolicyType, PolicyRecommendation>>> {
    const startTime = performance.now();
    
    onProgress?.(0.1, 'Analyzing game state');
    onProgress?.(0.3, 'Computing optimal policies');
    
    const recommendations = getAllPolicyRecommendations(
      grid,
      config,
      remainingBudget,
      currentTurn,
      selectedSensor,
      riskAversion
    );
    
    onProgress?.(1.0, 'Policy analysis complete');
    
    const computationTime = performance.now() - startTime;
    
    return {
      result: recommendations,
      computationTime
    };
  }
  
  private async generateSamplesWithProgress(
    grid: GameCell[][],
    config: MonteCarloConfig,
    progressCallback: (sampleIndex: number) => void
  ): Promise<SampledWorld[]> {
    const height = grid.length;
    const width = grid[0].length;
    const samples: SampledWorld[] = [];
    const rng = createSubRNG(config.seed, 'monte-carlo');
    
    for (let sample = 0; sample < config.numSamples; sample++) {
      progressCallback(sample);
      
      const hostileStates: boolean[][] = [];
      const infraStates: boolean[][] = [];
      let likelihood = 1.0;
      
      for (let y = 0; y < height; y++) {
        hostileStates[y] = [];
        infraStates[y] = [];
        
        for (let x = 0; x < width; x++) {
          const cell = grid[y][x];
          
          const hasHostile = rng.random() < cell.posteriorProbability;
          hostileStates[y][x] = hasHostile;
          
          const hasInfra = rng.random() < cell.infraPriorProbability;
          infraStates[y][x] = hasInfra;
          
          likelihood *= hasHostile ? cell.posteriorProbability : (1 - cell.posteriorProbability);
          likelihood *= hasInfra ? cell.infraPriorProbability : (1 - cell.infraPriorProbability);
        }
      }
      
      samples.push({
        hostileStates,
        infraStates,
        likelihood,
      });
      
      // Yield control occasionally to prevent blocking
      if (sample % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return samples;
  }
  
  private hashGrid(grid: GameCell[][]): string {
    return grid.map(row => 
      row.map(cell => `${cell.posteriorProbability.toFixed(3)}`).join(',')
    ).join('|');
  }
}

/**
 * Main simulation worker that combines all computational modules
 */
export class SimulationWorker {
  public inference = new InferenceWorker();
  public decisionAnalysis = new DecisionAnalysisWorker();
  public riskAnalysis = new RiskAnalysisWorker();
  
  /**
   * Clear all computation caches
   */
  clearCaches(): void {
    this.inference.cache?.clear();
    this.decisionAnalysis.cache?.clear();
    this.riskAnalysis.cache?.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    inference: number; 
    decisionAnalysis: number; 
    riskAnalysis: number; 
  } {
    return {
      inference: this.inference.cache?.size || 0,
      decisionAnalysis: this.decisionAnalysis.cache?.size || 0,
      riskAnalysis: this.riskAnalysis.cache?.size || 0,
    };
  }
}

// Expose the worker API through Comlink
Comlink.expose(SimulationWorker);