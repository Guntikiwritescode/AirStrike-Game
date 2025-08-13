import * as Comlink from 'comlink';
import { GameCell, GameConfig, SensorType } from './types';
import { PolicyType, PolicyRecommendation, MonteCarloConfig } from './risk-analysis';

// Import types from the worker
export type ProgressCallback = (progress: number, stage: string) => void;

export interface ComputationResult<T> {
  result: T;
  computationTime: number;
  samplesUsed?: number;
  cacheHit?: boolean;
}

// Define the worker API interface
export interface SimulationWorkerAPI {
  inference: {
    performReconComputation(
      grid: GameCell[][],
      x: number,
      y: number,
      sensor: SensorType,
      config: GameConfig,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<{
      newPosterior: number;
      sensorReading: {
        result: boolean;
        confidence: number;
        effectiveTPR: number;
        effectiveFPR: number;
      };
      spatialUpdates: { x: number; y: number; newPosterior: number }[];
      brierContribution: number;
      logLossContribution: number;
    }>>;
  };
  
  decisionAnalysis: {
    generateEVHeatmapComputation(
      grid: GameCell[][],
      radius: number,
      config: GameConfig,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<number[][]>>;
    
    generateVOIHeatmapComputation(
      grid: GameCell[][],
      sensor: SensorType,
      config: GameConfig,
      strikeRadius?: number,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<number[][]>>;
  };
  
  riskAnalysis: {
    generateMonteCarloSamplesComputation(
      grid: GameCell[][],
      config: MonteCarloConfig,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<{ hostileStates: boolean[][]; infraStates: boolean[][]; likelihood: number }[]>>;
    
    generateRiskAverseHeatmapComputation(
      grid: GameCell[][],
      radius: number,
      config: GameConfig,
      riskAversion?: number,
      numSamples?: number,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<number[][]>>;
    
    generateVarianceHeatmapComputation(
      grid: GameCell[][],
      radius: number,
      config: GameConfig,
      numSamples?: number,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<number[][]>>;
    
    generateLossRiskHeatmapComputation(
      grid: GameCell[][],
      radius: number,
      config: GameConfig,
      numSamples?: number,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<number[][]>>;
    
    getPolicyRecommendationsComputation(
      grid: GameCell[][],
      config: GameConfig,
      remainingBudget: number,
      currentTurn: number,
      selectedSensor: SensorType,
      riskAversion?: number,
      onProgress?: ProgressCallback
    ): Promise<ComputationResult<Record<PolicyType, PolicyRecommendation>>>;
  };
  
  clearCaches(): Promise<void>;
  getCacheStats(): Promise<{ inference: number; decisionAnalysis: number; riskAnalysis: number }>;
}

/**
 * Performance monitoring for worker operations
 */
export interface PerformanceMetrics {
  operationType: string;
  computationTime: number;
  samplesUsed?: number;
  cacheHit?: boolean;
  gridSize: number;
  timestamp: number;
}

/**
 * Loading state for UI feedback
 */
export interface LoadingState {
  isLoading: boolean;
  operation: string;
  progress: number;
  stage: string;
  startTime?: number;
  expectedDuration?: number;
}

/**
 * Web Worker Manager for simulation computations
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private workerApi: SimulationWorkerAPI | null = null;
  private isInitialized: boolean = false;
  private performanceMetrics: PerformanceMetrics[] = [];
  private loadingState: LoadingState = {
    isLoading: false,
    operation: '',
    progress: 0,
    stage: ''
  };
  private loadingCallbacks: ((state: LoadingState) => void)[] = [];

  /**
   * Initialize the Web Worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create the worker
      this.worker = new Worker(
        new URL('../workers/sim.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Wrap the worker with Comlink
      const WorkerClass = Comlink.wrap(this.worker) as unknown as new () => Promise<SimulationWorkerAPI>;
      this.workerApi = await new WorkerClass();

      this.isInitialized = true;
      console.log('✅ Simulation Worker initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Web Worker:', error);
      throw error;
    }
  }

  /**
   * Subscribe to loading state changes
   */
  onLoadingStateChange(callback: (state: LoadingState) => void): () => void {
    this.loadingCallbacks.push(callback);
    return () => {
      const index = this.loadingCallbacks.indexOf(callback);
      if (index > -1) this.loadingCallbacks.splice(index, 1);
    };
  }

  /**
   * Update loading state and notify subscribers
   */
  private updateLoadingState(updates: Partial<LoadingState>): void {
    this.loadingState = { ...this.loadingState, ...updates };
    this.loadingCallbacks.forEach(callback => callback(this.loadingState));
  }

  /**
   * Execute computation with loading state management
   */
  private async executeWithLoading<T>(
    operation: string,
    expectedDuration: number,
    computation: (onProgress: ProgressCallback) => Promise<ComputationResult<T>>
  ): Promise<ComputationResult<T>> {
    if (!this.workerApi) {
      await this.initialize();
    }

    const startTime = performance.now();
    
    this.updateLoadingState({
      isLoading: true,
      operation,
      progress: 0,
      stage: 'Starting...',
      startTime,
      expectedDuration
    });

    try {
      const result = await computation((progress, stage) => {
        this.updateLoadingState({
          progress: Math.min(progress, 1),
          stage
        });
      });

      // Record performance metrics
      const metrics: PerformanceMetrics = {
        operationType: operation,
        computationTime: result.computationTime,
        samplesUsed: result.samplesUsed,
        cacheHit: result.cacheHit,
        gridSize: 14, // Default grid size
        timestamp: Date.now()
      };
      
      this.performanceMetrics.push(metrics);
      
      // Keep only last 100 metrics
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100);
      }

      return result;
    } finally {
      this.updateLoadingState({
        isLoading: false,
        operation: '',
        progress: 0,
        stage: ''
      });
    }
  }

  /**
   * Perform reconnaissance computation
   */
  async performRecon(
    grid: GameCell[][],
    x: number,
    y: number,
    sensor: SensorType,
    config: GameConfig
  ): Promise<ComputationResult<{
    newPosterior: number;
    sensorReading: {
      result: boolean;
      confidence: number;
      effectiveTPR: number;
      effectiveFPR: number;
    };
    spatialUpdates: { x: number; y: number; newPosterior: number }[];
    brierContribution: number;
    logLossContribution: number;
  }>> {
    return this.executeWithLoading(
      'Reconnaissance',
      100, // Expected duration in ms
      (onProgress) => this.workerApi!.inference.performReconComputation(
        grid, x, y, sensor, config, onProgress
      )
    );
  }

  /**
   * Generate Expected Value heatmap
   */
  async generateEVHeatmap(
    grid: GameCell[][],
    radius: number = 1,
    config: GameConfig
  ): Promise<ComputationResult<number[][]>> {
    return this.executeWithLoading(
      'Expected Value Analysis',
      500, // Expected duration in ms
      (onProgress) => this.workerApi!.decisionAnalysis.generateEVHeatmapComputation(
        grid, radius, config, onProgress
      )
    );
  }

  /**
   * Generate Value of Information heatmap
   */
  async generateVOIHeatmap(
    grid: GameCell[][],
    sensor: SensorType,
    config: GameConfig,
    strikeRadius: number = 1
  ): Promise<ComputationResult<number[][]>> {
    return this.executeWithLoading(
      'Value of Information Analysis',
      2000, // Expected duration in ms
      (onProgress) => this.workerApi!.decisionAnalysis.generateVOIHeatmapComputation(
        grid, sensor, config, strikeRadius, onProgress
      )
    );
  }

  /**
   * Generate risk-averse utility heatmap
   */
  async generateRiskAverseHeatmap(
    grid: GameCell[][],
    radius: number = 1,
    config: GameConfig,
    riskAversion: number = 0.5,
    numSamples: number = 256
  ): Promise<ComputationResult<number[][]>> {
    return this.executeWithLoading(
      'Risk Analysis (256 samples)',
      3000, // Expected duration in ms
      (onProgress) => this.workerApi!.riskAnalysis.generateRiskAverseHeatmapComputation(
        grid, radius, config, riskAversion, numSamples, onProgress
      )
    );
  }

  /**
   * Generate variance heatmap
   */
  async generateVarianceHeatmap(
    grid: GameCell[][],
    radius: number = 1,
    config: GameConfig,
    numSamples: number = 256
  ): Promise<ComputationResult<number[][]>> {
    return this.executeWithLoading(
      'Variance Analysis (256 samples)',
      2500, // Expected duration in ms
      (onProgress) => this.workerApi!.riskAnalysis.generateVarianceHeatmapComputation(
        grid, radius, config, numSamples, onProgress
      )
    );
  }

  /**
   * Generate loss risk heatmap
   */
  async generateLossRiskHeatmap(
    grid: GameCell[][],
    radius: number = 1,
    config: GameConfig,
    numSamples: number = 256
  ): Promise<ComputationResult<number[][]>> {
    return this.executeWithLoading(
      'Loss Risk Analysis (256 samples)',
      2500, // Expected duration in ms
      (onProgress) => this.workerApi!.riskAnalysis.generateLossRiskHeatmapComputation(
        grid, radius, config, numSamples, onProgress
      )
    );
  }

  /**
   * Get policy recommendations
   */
  async getPolicyRecommendations(
    grid: GameCell[][],
    config: GameConfig,
    remainingBudget: number,
    currentTurn: number,
    selectedSensor: SensorType,
    riskAversion: number = 0.5
  ): Promise<ComputationResult<Record<PolicyType, PolicyRecommendation>>> {
    return this.executeWithLoading(
      'Policy Analysis',
      800, // Expected duration in ms
      (onProgress) => this.workerApi!.riskAnalysis.getPolicyRecommendationsComputation(
        grid, config, remainingBudget, currentTurn, selectedSensor, riskAversion, onProgress
      )
    );
  }

  /**
   * Clear all computation caches
   */
  async clearCaches(): Promise<void> {
    if (!this.workerApi) await this.initialize();
    await this.workerApi!.clearCaches();
    console.log('🧹 Worker caches cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ inference: number; decisionAnalysis: number; riskAnalysis: number }> {
    if (!this.workerApi) await this.initialize();
    return await this.workerApi!.getCacheStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Get average performance for operation type
   */
  getAveragePerformance(operationType: string): {
    avgTime: number;
    avgSamples: number;
    cacheHitRate: number;
    count: number;
  } {
    const metrics = this.performanceMetrics.filter(m => m.operationType === operationType);
    
    if (metrics.length === 0) {
      return { avgTime: 0, avgSamples: 0, cacheHitRate: 0, count: 0 };
    }

    const avgTime = metrics.reduce((sum, m) => sum + m.computationTime, 0) / metrics.length;
    const avgSamples = metrics.reduce((sum, m) => sum + (m.samplesUsed || 0), 0) / metrics.length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = cacheHits / metrics.length;

    return {
      avgTime: Math.round(avgTime),
      avgSamples: Math.round(avgSamples),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      count: metrics.length
    };
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerApi = null;
      this.isInitialized = false;
      console.log('🚫 Simulation Worker terminated');
    }
  }
}

// Global singleton instance
let workerManagerInstance: WorkerManager | null = null;

/**
 * Get the global WorkerManager instance
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}