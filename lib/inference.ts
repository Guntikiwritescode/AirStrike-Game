import { GameCell } from './types';
import { SensorReading } from './sensors';

/**
 * Bayesian inference utilities with numerical stability
 */

/**
 * Convert probability to odds (with numerical stability)
 */
export function probabilityToOdds(p: number): number {
  const clampedP = Math.max(0.001, Math.min(0.999, p));
  return clampedP / (1 - clampedP);
}

/**
 * Convert odds to probability (with numerical stability)
 */
export function oddsToProbability(odds: number): number {
  const clampedOdds = Math.max(0.001, odds);
  return clampedOdds / (1 + clampedOdds);
}

/**
 * Update posterior probability using Bayesian odds form
 */
export function updatePosteriorOdds(
  priorProbability: number,
  sensorReading: SensorReading
): number {
  // Convert prior to odds
  const priorOdds = probabilityToOdds(priorProbability);
  
  // Calculate likelihood ratio based on sensor reading
  const { result, effectiveTPR, effectiveFPR } = sensorReading;
  
  let likelihoodRatio: number;
  if (result) {
    // Positive reading: L(+|H=1) / L(+|H=0) = TPR / FPR
    likelihoodRatio = effectiveTPR / effectiveFPR;
  } else {
    // Negative reading: L(-|H=1) / L(-|H=0) = (1-TPR) / (1-FPR)
    likelihoodRatio = (1 - effectiveTPR) / (1 - effectiveFPR);
  }
  
  // Apply Bayes' rule in odds form
  const posteriorOdds = priorOdds * likelihoodRatio;
  
  // Convert back to probability with stability
  return oddsToProbability(posteriorOdds);
}

/**
 * Spatial diffusion kernel for neighboring cell updates
 */
export interface SpatialDiffusionConfig {
  kernelSize: number;           // Kernel radius (1 = 3x3, 2 = 5x5, etc.)
  diffusionStrength: number;    // How much information spreads (0-1)
  distanceDecay: number;        // How quickly effect decays with distance
}

/**
 * Default spatial diffusion configuration
 */
export const DEFAULT_DIFFUSION_CONFIG: SpatialDiffusionConfig = {
  kernelSize: 1,
  diffusionStrength: 0.15,
  distanceDecay: 1.5,
};

/**
 * Apply spatial diffusion to update neighboring cells
 */
export function applySpatialDiffusion(
  grid: GameCell[][],
  reconX: number,
  reconY: number,
  posteriorUpdate: number,
  config: SpatialDiffusionConfig = DEFAULT_DIFFUSION_CONFIG
): void {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  // Calculate the change in log-odds at the recon cell
  const targetCell = grid[reconY][reconX];
  const priorLogOdds = Math.log(probabilityToOdds(targetCell.posteriorProbability));
  const posteriorLogOdds = Math.log(probabilityToOdds(posteriorUpdate));
  const logOddsChange = posteriorLogOdds - priorLogOdds;
  
  // Apply diffusion to neighboring cells
  for (let dy = -config.kernelSize; dy <= config.kernelSize; dy++) {
    for (let dx = -config.kernelSize; dx <= config.kernelSize; dx++) {
      // Skip the center cell (already updated)
      if (dx === 0 && dy === 0) continue;
      
      const neighborX = reconX + dx;
      const neighborY = reconY + dy;
      
      // Check bounds
      if (neighborX < 0 || neighborX >= gridWidth || neighborY < 0 || neighborY >= gridHeight) {
        continue;
      }
      
      // Calculate distance and diffusion strength
      const distance = Math.sqrt(dx * dx + dy * dy);
      const diffusionWeight = config.diffusionStrength * 
        Math.exp(-distance / config.distanceDecay);
      
      // Apply proportional update to neighbor
      const neighborCell = grid[neighborY][neighborX];
      const neighborLogOdds = Math.log(probabilityToOdds(neighborCell.posteriorProbability));
      const updatedLogOdds = neighborLogOdds + logOddsChange * diffusionWeight;
      
      // Convert back to probability and update
      neighborCell.posteriorProbability = oddsToProbability(Math.exp(updatedLogOdds));
    }
  }
}

/**
 * Calculate Brier score for a single prediction
 */
export function calculateBrierScore(prediction: number, actual: boolean): number {
  const outcome = actual ? 1 : 0;
  return Math.pow(prediction - outcome, 2);
}

/**
 * Calculate log loss for a single prediction
 */
export function calculateLogLoss(prediction: number, actual: boolean): number {
  // Clamp prediction to avoid infinite values
  const clampedPrediction = Math.max(0.001, Math.min(0.999, prediction));
  
  if (actual) {
    return -Math.log(clampedPrediction);
  } else {
    return -Math.log(1 - clampedPrediction);
  }
}

/**
 * Calibration bucket for reliability analysis
 */
export interface CalibrationBucket {
  minProbability: number;
  maxProbability: number;
  predictions: number[];
  outcomes: boolean[];
  count: number;
  averagePrediction: number;
  actualRate: number;
  brierContribution: number;
}

/**
 * Create calibration buckets for reliability analysis
 */
export function createCalibrationBuckets(
  predictions: number[],
  outcomes: boolean[],
  numBuckets: number = 10
): CalibrationBucket[] {
  if (predictions.length !== outcomes.length) {
    throw new Error('Predictions and outcomes must have same length');
  }
  
  const buckets: CalibrationBucket[] = [];
  
  // Initialize buckets
  for (let i = 0; i < numBuckets; i++) {
    const minProb = i / numBuckets;
    const maxProb = (i + 1) / numBuckets;
    
    buckets.push({
      minProbability: minProb,
      maxProbability: maxProb,
      predictions: [],
      outcomes: [],
      count: 0,
      averagePrediction: 0,
      actualRate: 0,
      brierContribution: 0,
    });
  }
  
  // Assign predictions to buckets
  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];
    const outcome = outcomes[i];
    
    // Find appropriate bucket
    const bucketIndex = Math.min(
      Math.floor(prediction * numBuckets),
      numBuckets - 1
    );
    
    const bucket = buckets[bucketIndex];
    bucket.predictions.push(prediction);
    bucket.outcomes.push(outcome);
    bucket.count++;
  }
  
  // Calculate bucket statistics
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      bucket.averagePrediction = bucket.predictions.reduce((sum, p) => sum + p, 0) / bucket.count;
      bucket.actualRate = bucket.outcomes.filter(o => o).length / bucket.count;
      
      // Calculate Brier score contribution
      bucket.brierContribution = bucket.predictions.reduce((sum, p, idx) => {
        return sum + calculateBrierScore(p, bucket.outcomes[idx]);
      }, 0) / bucket.count;
    }
  }
  
  return buckets;
}

/**
 * Calculate overall calibration metrics
 */
export interface CalibrationMetrics {
  brierScore: number;           // Overall Brier score (lower is better)
  logLoss: number;             // Overall log loss (lower is better)
  calibrationError: number;     // Mean absolute calibration error
  reliability: number;          // Reliability component of Brier score
  resolution: number;           // Resolution component of Brier score
  uncertainty: number;          // Uncertainty component of Brier score
  buckets: CalibrationBucket[];
}

/**
 * Calculate comprehensive calibration metrics
 */
export function calculateCalibrationMetrics(
  predictions: number[],
  outcomes: boolean[],
  numBuckets: number = 10
): CalibrationMetrics {
  if (predictions.length === 0) {
    return {
      brierScore: 0,
      logLoss: 0,
      calibrationError: 0,
      reliability: 0,
      resolution: 0,
      uncertainty: 0,
      buckets: [],
    };
  }
  
  const buckets = createCalibrationBuckets(predictions, outcomes, numBuckets);
  
  // Calculate overall metrics
  const brierScore = predictions.reduce((sum, p, idx) => {
    return sum + calculateBrierScore(p, outcomes[idx]);
  }, 0) / predictions.length;
  
  const logLoss = predictions.reduce((sum, p, idx) => {
    return sum + calculateLogLoss(p, outcomes[idx]);
  }, 0) / predictions.length;
  
  // Calculate calibration error (mean absolute difference between prediction and outcome rate)
  let calibrationError = 0;
  let totalWeight = 0;
  
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const weight = bucket.count / predictions.length;
      calibrationError += weight * Math.abs(bucket.averagePrediction - bucket.actualRate);
      totalWeight += weight;
    }
  }
  
  if (totalWeight > 0) {
    calibrationError /= totalWeight;
  }
  
  // Calculate Brier score decomposition (Murphy decomposition)
  const baseRate = outcomes.filter(o => o).length / outcomes.length;
  
  // Reliability: weighted variance of calibration within buckets
  let reliability = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const weight = bucket.count / predictions.length;
      reliability += weight * Math.pow(bucket.averagePrediction - bucket.actualRate, 2);
    }
  }
  
  // Resolution: how much predictions vary from base rate
  let resolution = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const weight = bucket.count / predictions.length;
      resolution += weight * Math.pow(bucket.actualRate - baseRate, 2);
    }
  }
  
  // Uncertainty: irreducible uncertainty in the data
  const uncertainty = baseRate * (1 - baseRate);
  
  return {
    brierScore,
    logLoss,
    calibrationError,
    reliability,
    resolution,
    uncertainty,
    buckets,
  };
}

/**
 * Update running calibration statistics incrementally
 */
export class RunningCalibration {
  private predictions: number[] = [];
  private outcomes: boolean[] = [];
  private brierSum: number = 0;
  private logLossSum: number = 0;
  
  /**
   * Add a new prediction-outcome pair
   */
  addPrediction(prediction: number, actual: boolean): void {
    this.predictions.push(prediction);
    this.outcomes.push(actual);
    
    this.brierSum += calculateBrierScore(prediction, actual);
    this.logLossSum += calculateLogLoss(prediction, actual);
  }
  
  /**
   * Get current metrics
   */
  getMetrics(numBuckets: number = 10): CalibrationMetrics {
    return calculateCalibrationMetrics(this.predictions, this.outcomes, numBuckets);
  }
  
  /**
   * Get running averages (faster than full calibration)
   */
  getRunningAverages(): { brierScore: number; logLoss: number; count: number } {
    const count = this.predictions.length;
    return {
      brierScore: count > 0 ? this.brierSum / count : 0,
      logLoss: count > 0 ? this.logLossSum / count : 0,
      count,
    };
  }
  
  /**
   * Reset all statistics
   */
  reset(): void {
    this.predictions = [];
    this.outcomes = [];
    this.brierSum = 0;
    this.logLossSum = 0;
  }
  
  /**
   * Get raw data for external analysis
   */
  getRawData(): { predictions: number[]; outcomes: boolean[] } {
    return {
      predictions: [...this.predictions],
      outcomes: [...this.outcomes],
    };
  }
}

/**
 * Confidence interval calculation for calibration metrics
 */
export function calculateConfidenceInterval(
  metrics: CalibrationMetrics,
  confidence: number = 0.95
): { brierLower: number; brierUpper: number; logLossLower: number; logLossUpper: number } {
  const n = metrics.buckets.reduce((sum, b) => sum + b.count, 0);
  
  if (n === 0) {
    return { brierLower: 0, brierUpper: 0, logLossLower: 0, logLossUpper: 0 };
  }
  
  // Simple bootstrap-style confidence intervals (approximate)
  const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
  
  // Standard error approximations
  const brierSE = Math.sqrt(metrics.brierScore * (1 - metrics.brierScore) / n);
  const logLossSE = Math.sqrt(metrics.logLoss / n); // Approximation
  
  return {
    brierLower: Math.max(0, metrics.brierScore - z * brierSE),
    brierUpper: Math.min(1, metrics.brierScore + z * brierSE),
    logLossLower: Math.max(0, metrics.logLoss - z * logLossSE),
    logLossUpper: metrics.logLoss + z * logLossSE,
  };
}