import { SeededRNG, createSubRNG } from './rng';
import { TruthField, SpatialFieldConfig, BetaPriorConfig, GameCell } from './types';

/**
 * Generate spatial hostile probability field θ(x,y) using Gaussian-smoothed noise
 */
export function generateSpatialHostileField(
  width: number, 
  height: number, 
  config: SpatialFieldConfig, 
  rng: SeededRNG
): number[][] {
  // Step 1: Generate random noise field
  const noiseField = rng.gaussianField(width, height, 0, config.noiseScale);
  
  // Step 2: Apply Gaussian smoothing
  const smoothedField = rng.smoothField(noiseField, config.smoothingSigma);
  
  // Step 3: Add base probability bias
  const biasedField = smoothedField.map(row => 
    row.map(value => value + Math.log(config.hostileBaseProbability / (1 - config.hostileBaseProbability)))
  );
  
  // Step 4: Apply logistic transformation to get probabilities
  const probabilityField = rng.logisticTransform(biasedField, config.logisticSteepness);
  
  return probabilityField;
}

/**
 * Generate infrastructure probability field (simpler, more uniform)
 */
export function generateInfrastructureField(
  width: number, 
  height: number, 
  config: SpatialFieldConfig, 
  rng: SeededRNG
): number[][] {
  const field: number[][] = [];
  
  // Create slight spatial variation around base rate
  for (let y = 0; y < height; y++) {
    field[y] = [];
    for (let x = 0; x < width; x++) {
      // Add small random variation to base rate
      const variation = rng.normal(0, 0.1);
      const probability = Math.max(0.001, Math.min(0.999, 
        config.infraBaseProbability + variation * config.infraBaseProbability
      ));
      field[y][x] = probability;
    }
  }
  
  return field;
}

/**
 * Sample truth values from probability fields
 */
export function sampleTruthFromFields(
  hostileField: number[][], 
  infraField: number[][], 
  rng: SeededRNG
): { hostileTruth: boolean[][], infraTruth: boolean[][] } {
  const height = hostileField.length;
  const width = hostileField[0].length;
  
  const hostileTruth: boolean[][] = [];
  const infraTruth: boolean[][] = [];
  
  for (let y = 0; y < height; y++) {
    hostileTruth[y] = [];
    infraTruth[y] = [];
    for (let x = 0; x < width; x++) {
      hostileTruth[y][x] = rng.bernoulli(hostileField[y][x]);
      infraTruth[y][x] = rng.bernoulli(infraField[y][x]);
    }
  }
  
  return { hostileTruth, infraTruth };
}

/**
 * Initialize Beta priors for posterior probabilities
 */
export function initializeBetaPriors(
  width: number, 
  height: number, 
  config: BetaPriorConfig
): { hostilePriors: number[][], infraPriors: number[][] } {
  const hostilePriors: number[][] = [];
  const infraPriors: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    hostilePriors[y] = [];
    infraPriors[y] = [];
    for (let x = 0; x < width; x++) {
      // Beta mean = α / (α + β)
      hostilePriors[y][x] = config.hostileAlpha / (config.hostileAlpha + config.hostileBeta);
      infraPriors[y][x] = config.infraAlpha / (config.infraAlpha + config.infraBeta);
    }
  }
  
  return { hostilePriors, infraPriors };
}

/**
 * Generate complete truth field with enhanced spatial modeling
 */
export function generateTruthField(
  width: number, 
  height: number, 
  spatialConfig: SpatialFieldConfig, 
  betaConfig: BetaPriorConfig, 
  seed: string
): TruthField {
  // Create separate RNGs for different aspects to ensure reproducibility
  const hostileRng = createSubRNG(seed, 'hostiles');
  const infraRng = createSubRNG(seed, 'infrastructure');
  const samplingRng = createSubRNG(seed, 'sampling');
  
  // Generate probability fields
  const hostileField = generateSpatialHostileField(width, height, spatialConfig, hostileRng);
  const infraField = generateInfrastructureField(width, height, spatialConfig, infraRng);
  
  // Sample actual truth values
  const { hostileTruth, infraTruth } = sampleTruthFromFields(hostileField, infraField, samplingRng);
  
  return {
    hostileField,
    infraField,
    hostileTruth,
    infraTruth,
  };
}

/**
 * Create game cells with enhanced truth and prior information
 */
export function createEnhancedGameCells(
  width: number, 
  height: number, 
  truthField: TruthField, 
  betaConfig: BetaPriorConfig
): GameCell[][] {
  const { hostilePriors } = initializeBetaPriors(width, height, betaConfig);
  
  const grid: GameCell[][] = [];
  
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = {
        x,
        y,
        hasHostile: truthField.hostileTruth[y][x],
        hasInfrastructure: truthField.infraTruth[y][x],
        posteriorProbability: hostilePriors[y][x], // Start with Beta prior mean
        reconHistory: [],
        hostilePriorProbability: truthField.hostileField[y][x], // Store θ(x,y)
        infraPriorProbability: truthField.infraField[y][x],     // Store infra rate
      };
    }
  }
  
  return grid;
}

/**
 * Calculate spatial correlation between two 2D fields
 */
export function calculateSpatialCorrelation(field1: number[][], field2: number[][]): number {
  const height = field1.length;
  const width = field1[0].length;
  
  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProducts = 0;
  let count = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val1 = field1[y][x];
      const val2 = field2[y][x];
      
      sum1 += val1;
      sum2 += val2;
      sum1Sq += val1 * val1;
      sum2Sq += val2 * val2;
      sumProducts += val1 * val2;
      count++;
    }
  }
  
  const mean1 = sum1 / count;
  const mean2 = sum2 / count;
  
  const numerator = sumProducts - count * mean1 * mean2;
  const denominator = Math.sqrt(
    (sum1Sq - count * mean1 * mean1) * (sum2Sq - count * mean2 * mean2)
  );
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate how well spatial patterns were detected
 */
export function calculateSpatialAccuracy(
  posteriorField: number[][], 
  truthField: number[][], 
  threshold: number = 0.5
): number {
  const height = posteriorField.length;
  const width = posteriorField[0].length;
  
  let correct = 0;
  let total = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const predicted = posteriorField[y][x] > threshold;
      const actual = truthField[y][x] > threshold;
      
      if (predicted === actual) {
        correct++;
      }
      total++;
    }
  }
  
  return total === 0 ? 0 : correct / total;
}

/**
 * Default spatial field configuration
 */
export const DEFAULT_SPATIAL_CONFIG: SpatialFieldConfig = {
  noiseScale: 1.0,              // Standard deviation of Gaussian noise
  smoothingSigma: 1.5,          // Gaussian smoothing kernel sigma
  logisticSteepness: 1.2,       // Steepness of logistic transformation
  hostileBaseProbability: 0.25, // Base probability for hostiles
  infraBaseProbability: 0.05,   // Base probability for infrastructure
};

/**
 * Default Beta prior configuration
 */
export const DEFAULT_BETA_PRIORS: BetaPriorConfig = {
  hostileAlpha: 2,              // Slightly optimistic about finding hostiles
  hostileBeta: 6,               // But still uncertain (mean = 2/8 = 0.25)
  infraAlpha: 1,                // Very uncertain about infrastructure
  infraBeta: 19,                // Low base rate (mean = 1/20 = 0.05)
};