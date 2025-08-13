// Performance-focused Web Worker for heavy calculations
// Handles EV, VOI, risk analysis, and Bayesian inference computations

import { GameCell, GameConfig, HeatmapType } from '@/lib/types';

export interface PerformanceWorkerMessage {
  type: 'calculate_layer_data' | 'calculate_metrics' | 'calculate_risk';
  payload: unknown;
  id: string;
}

export interface PerformanceWorkerResponse {
  type: 'layer_data_result' | 'metrics_result' | 'risk_result' | 'error';
  payload: unknown;
  id: string;
}

export interface LayerCalculationRequest {
  grid: GameCell[][];
  config: GameConfig;
  viewMode: HeatmapType;
  showTruthOverlay: boolean;
}

export interface LayerCalculationResult {
  cellData: {
    position: [number, number, number];
    gridX: number;
    gridY: number;
    value: number;
    color: [number, number, number, number];
    radius: number;
    cell: GameCell;
  }[];
  timestamp: number;
}

// Performance-optimized calculation functions
class PerformanceCalculator {
  // Cache for expensive calculations
  private static cache = new Map<string, unknown>();
  private static cacheMaxSize = 1000;

  // Generate cache key for memoization
  private static getCacheKey(prefix: string, data: unknown): string {
    return `${prefix}_${JSON.stringify(data).slice(0, 100)}_${Date.now() >> 10}`; // 1s granularity
  }

  // Efficient color interpolation with pre-computed gradients
  private static colorGradients = {
    posterior: {
      low: [30, 41, 59] as [number, number, number],   // slate-800
      high: [239, 68, 68] as [number, number, number]  // red-500
    },
    expectedValue: {
      low: [15, 23, 42] as [number, number, number],   // slate-900  
      high: [34, 197, 94] as [number, number, number]  // green-500
    },
    variance: {
      low: [55, 65, 81] as [number, number, number],   // gray-600
      high: [251, 191, 36] as [number, number, number] // amber-400
    },
    truth: {
      hostile: [220, 38, 127] as [number, number, number], // pink-600
      infrastructure: [37, 99, 235] as [number, number, number], // blue-600
      safe: [34, 197, 94] as [number, number, number]  // green-500
    }
  };

  // Fast color interpolation with SIMD-style operations
  static interpolateColor(
    color1: [number, number, number], 
    color2: [number, number, number], 
    factor: number
  ): [number, number, number, number] {
    const invFactor = 1 - factor;
    return [
      Math.round(color1[0] * invFactor + color2[0] * factor),
      Math.round(color1[1] * invFactor + color2[1] * factor),
      Math.round(color1[2] * invFactor + color2[2] * factor),
      255
    ];
  }

  // Optimized layer data calculation with batching
  static calculateLayerData(request: LayerCalculationRequest): LayerCalculationResult {
    const { grid, config, viewMode, showTruthOverlay } = request;
    const cacheKey = this.getCacheKey('layer', { viewMode, showTruthOverlay, gridSize: grid.length });
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as LayerCalculationResult;
    }

    const cellData: LayerCalculationResult['cellData'] = [];
    const gridSize = grid.length;

    // Pre-calculate bounds for value normalization
    let minValue = Infinity;
    let maxValue = -Infinity;

            // First pass: find min/max for normalization
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const cell = grid[y][x];
            let value: number;

            switch (viewMode) {
              case 'posterior':
                value = cell.posteriorProbability;
                break;
              case 'expectedValue':
                value = cell.posteriorProbability; // Use posterior as proxy
                break;
              case 'variance':
                value = Math.abs(cell.posteriorProbability - 0.5); // Use uncertainty as proxy
                break;
              default:
                value = cell.posteriorProbability;
            }

        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }

    const valueRange = maxValue - minValue || 1; // Avoid division by zero

    // Second pass: generate cell data with optimized calculations
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = grid[y][x];
        let value: number;
        let color: [number, number, number, number];

        // Get raw value
        switch (viewMode) {
          case 'posterior':
            value = cell.posteriorProbability;
            break;
          case 'expectedValue':
            value = cell.posteriorProbability; // Use posterior as proxy
            break;
          case 'variance':
            value = Math.abs(cell.posteriorProbability - 0.5); // Use uncertainty as proxy
            break;
          default:
            value = cell.posteriorProbability;
        }

        // Handle truth overlay with optimized branching
        if (showTruthOverlay && config.showTruthOverlay) {
          if (cell.hasHostile) {
            color = [...this.colorGradients.truth.hostile, 255];
          } else if (cell.hasInfrastructure) {
            color = [...this.colorGradients.truth.infrastructure, 255];
          } else {
            color = [...this.colorGradients.truth.safe, 180];
          }
        } else {
          // Normalized value for color interpolation
          const normalizedValue = (value - minValue) / valueRange;
          const gradientKey = viewMode as keyof typeof this.colorGradients;
          if (gradientKey === 'truth') {
            // Truth mode uses different color logic (handled above)
            color = [...this.colorGradients.truth.safe, 180];
          } else {
            const gradient = this.colorGradients[gradientKey] || this.colorGradients.posterior;
            color = this.interpolateColor(gradient.low, gradient.high, normalizedValue);
          }
        }

        // Calculate optimized position (avoid repeated lat/lng conversions in main thread)
        const position: [number, number, number] = [
          x + 0.5, // Normalized grid coordinates
          y + 0.5,
          Math.max(10, value * 100) // Height based on value
        ];

        cellData.push({
          position,
          gridX: x,
          gridY: y,
          value,
          color,
          radius: Math.max(20, Math.min(100, 60 + value * 40)), // Optimized radius calculation
          cell: {
            // Only include essential cell data to reduce payload size
            x: cell.x,
            y: cell.y,
            posteriorProbability: cell.posteriorProbability,
            hasHostile: cell.hasHostile,
            hasInfrastructure: cell.hasInfrastructure,
            reconHistory: cell.reconHistory,
            hostilePriorProbability: cell.hostilePriorProbability,
            infraPriorProbability: cell.infraPriorProbability
          } as GameCell
        });
      }
    }

    const result: LayerCalculationResult = {
      cellData,
      timestamp: Date.now()
    };

    // Cache management
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(cacheKey, result);

    return result;
  }

  // Fast metrics calculation for performance monitoring
  static calculateMetrics(grid: GameCell[][], _config: GameConfig) {
    let totalCells = 0;
    let reconCells = 0;
    const struckCells = 0; // Strike history not available in current GameCell interface
    let averagePosterior = 0;
    let maxPosterior = 0;

          for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const cell = grid[y][x];
          totalCells++;
          
          if (cell.reconHistory.length > 0) reconCells++;
          // Note: strikeHistory not available in current GameCell interface
          
          averagePosterior += cell.posteriorProbability;
          maxPosterior = Math.max(maxPosterior, cell.posteriorProbability);
        }
      }

    return {
      totalCells,
      reconCells,
      struckCells,
      averagePosterior: averagePosterior / totalCells,
      maxPosterior,
      timestamp: Date.now()
    };
  }

  // Risk analysis with optimized calculations
  static calculateRiskAnalysis(grid: GameCell[][], _config: GameConfig) {
    let totalRisk = 0;
    let infraRisk = 0;
    let highRiskCells = 0;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const posterior = cell.posteriorProbability;
        
        totalRisk += posterior;
        
        if (cell.hasInfrastructure) {
          infraRisk += posterior;
        }
        
        if (posterior > 0.7) {
          highRiskCells++;
        }
      }
    }

    return {
      totalRisk,
      infraRisk,
      highRiskCells,
      riskScore: totalRisk / (grid.length * grid.length),
      timestamp: Date.now()
    };
  }
}

// Worker message handler with performance optimizations
self.onmessage = function(event: MessageEvent<PerformanceWorkerMessage>) {
  const { type, payload, id } = event.data;
  
  try {
    let result: unknown;
    const startTime = performance.now();

    switch (type) {
      case 'calculate_layer_data':
        result = PerformanceCalculator.calculateLayerData(payload as LayerCalculationRequest);
        break;
        
      case 'calculate_metrics':
        result = PerformanceCalculator.calculateMetrics(payload.grid, payload.config);
        break;
        
      case 'calculate_risk':
        result = PerformanceCalculator.calculateRiskAnalysis(payload.grid, payload.config);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const processingTime = performance.now() - startTime;
    
    // Send result back to main thread
    self.postMessage({
      type: `${type.split('_')[1]}_result` as PerformanceWorkerResponse['type'],
      payload: {
        ...result,
        processingTime
      },
      id
    } as PerformanceWorkerResponse);
    
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'error',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalType: type
      },
      id
    } as PerformanceWorkerResponse);
  }
};