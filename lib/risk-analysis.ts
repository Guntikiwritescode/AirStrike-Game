import { GameCell, GameConfig, SensorType } from './types';
import { createSubRNG } from './rng';
import { calculateStrikeEV, getAoECells } from './decision-analysis';
import { calculateReconVOI } from './decision-analysis';

/**
 * Represents a sampled possible world state
 */
export interface SampledWorld {
  hostileStates: boolean[][];
  infraStates: boolean[][];
  likelihood: number; // Prior probability of this world
}

/**
 * Monte Carlo sampler configuration
 */
export interface MonteCarloConfig {
  numSamples: number;
  seed: string;
  useImportanceSampling: boolean;
  spatialCorrelation: boolean;
}

/**
 * Risk metrics for a potential action
 */
export interface RiskMetrics {
  expectedValue: number;
  variance: number;
  standardDeviation: number;
  cvar95: number;  // 95th percentile CVaR
  cvar99: number;  // 99th percentile CVaR
  worstCase: number;
  bestCase: number;
  probabilityOfLoss: number;
  expectedShortfall: number;
}

/**
 * Strike outcome in a sampled world
 */
export interface SampledStrikeOutcome {
  world: SampledWorld;
  hostilesHit: number;
  infraHit: number;
  netValue: number;
  probability: number;
}

/**
 * Generate Monte Carlo samples from posterior probability grid
 */
export function generateMonteCarloSamples(
  grid: GameCell[][],
  config: MonteCarloConfig
): SampledWorld[] {
  const height = grid.length;
  const width = grid[0].length;
  const samples: SampledWorld[] = [];
  const rng = createSubRNG(config.seed, 'monte-carlo');
  
  for (let sample = 0; sample < config.numSamples; sample++) {
    const hostileStates: boolean[][] = [];
    const infraStates: boolean[][] = [];
    let likelihood = 1.0;
    
    // Sample hostile states for each cell based on posterior probability
    for (let y = 0; y < height; y++) {
      hostileStates[y] = [];
      infraStates[y] = [];
      
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        
        // Sample hostile state
        const hasHostile = rng.random() < cell.posteriorProbability;
        hostileStates[y][x] = hasHostile;
        
        // Sample infrastructure state (using prior probability)
        const hasInfra = rng.random() < cell.infraPriorProbability;
        infraStates[y][x] = hasInfra;
        
        // Update likelihood (probability of this specific configuration)
        likelihood *= hasHostile ? cell.posteriorProbability : (1 - cell.posteriorProbability);
        likelihood *= hasInfra ? cell.infraPriorProbability : (1 - cell.infraPriorProbability);
      }
    }
    
    samples.push({
      hostileStates,
      infraStates,
      likelihood,
    });
  }
  
  return samples;
}

/**
 * Enhanced Monte Carlo with importance sampling
 */
export function generateImportanceSamples(
  grid: GameCell[][],
  config: MonteCarloConfig,
  focusArea?: { x: number; y: number; radius: number }
): SampledWorld[] {
  if (!config.useImportanceSampling || !focusArea) {
    return generateMonteCarloSamples(grid, config);
  }
  
  const height = grid.length;
  const width = grid[0].length;
  const samples: SampledWorld[] = [];
  const rng = createSubRNG(config.seed, 'importance-sampling');
  
  // Get focus area cells
  const focusCells = getAoECells(focusArea.x, focusArea.y, focusArea.radius, width, height);
  const focusSet = new Set(focusCells.map(cell => `${cell.x},${cell.y}`));
  
  for (let sample = 0; sample < config.numSamples; sample++) {
    const hostileStates: boolean[][] = [];
    const infraStates: boolean[][] = [];
    let likelihood = 1.0;
    let importanceWeight = 1.0;
    
    for (let y = 0; y < height; y++) {
      hostileStates[y] = [];
      infraStates[y] = [];
      
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        const isInFocus = focusSet.has(`${x},${y}`);
        
        // Use biased sampling in focus area to get more diverse outcomes
        let hostileProb = cell.posteriorProbability;
        if (isInFocus) {
          // Increase sampling diversity in focus area
          hostileProb = 0.3 + 0.4 * hostileProb; // Compress to [0.3, 0.7] range
          importanceWeight *= cell.posteriorProbability / hostileProb;
        }
        
        const hasHostile = rng.random() < hostileProb;
        hostileStates[y][x] = hasHostile;
        
        const hasInfra = rng.random() < cell.infraPriorProbability;
        infraStates[y][x] = hasInfra;
        
        likelihood *= hasHostile ? cell.posteriorProbability : (1 - cell.posteriorProbability);
        likelihood *= hasInfra ? cell.infraPriorProbability : (1 - cell.infraPriorProbability);
      }
    }
    
    // Apply importance weight
    likelihood *= importanceWeight;
    
    samples.push({
      hostileStates,
      infraStates,
      likelihood,
    });
  }
  
  return samples;
}

/**
 * Evaluate strike outcomes across Monte Carlo samples
 */
export function evaluateStrikeRisk(
  centerX: number,
  centerY: number,
  radius: number,
  samples: SampledWorld[],
  config: GameConfig
): RiskMetrics {
  const outcomes: number[] = [];
  const weightedOutcomes: { value: number; weight: number }[] = [];
  
  for (const world of samples) {
    const affectedCells = getAoECells(centerX, centerY, radius, 
      world.hostileStates[0].length, world.hostileStates.length);
    
    let hostilesHit = 0;
    let infraHit = 0;
    
    for (const { x, y } of affectedCells) {
      if (world.hostileStates[y][x]) hostilesHit++;
      if (world.infraStates[y][x]) infraHit++;
    }
    
    const netValue = hostilesHit * config.hostileValue - 
                    infraHit * config.infraPenalty - 
                    config.strikeCost;
    
    outcomes.push(netValue);
    weightedOutcomes.push({ value: netValue, weight: world.likelihood });
  }
  
  // Sort outcomes for percentile calculations
  const sortedOutcomes = [...outcomes].sort((a, b) => a - b);
  
  // Calculate basic statistics
  const expectedValue = outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length;
  const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - expectedValue, 2), 0) / outcomes.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Calculate CVaR (Conditional Value at Risk)
  const cvar95Index = Math.floor(0.05 * sortedOutcomes.length); // Worst 5%
  const cvar99Index = Math.floor(0.01 * sortedOutcomes.length); // Worst 1%
  
  const cvar95 = sortedOutcomes.slice(0, Math.max(1, cvar95Index))
    .reduce((sum, val) => sum + val, 0) / Math.max(1, cvar95Index);
  
  const cvar99 = sortedOutcomes.slice(0, Math.max(1, cvar99Index))
    .reduce((sum, val) => sum + val, 0) / Math.max(1, cvar99Index);
  
  const worstCase = sortedOutcomes[0];
  const bestCase = sortedOutcomes[sortedOutcomes.length - 1];
  
  const lossOutcomes = outcomes.filter(val => val < 0);
  const probabilityOfLoss = lossOutcomes.length / outcomes.length;
  const expectedShortfall = lossOutcomes.length > 0 ? 
    lossOutcomes.reduce((sum, val) => sum + val, 0) / lossOutcomes.length : 0;
  
  return {
    expectedValue,
    variance,
    standardDeviation,
    cvar95,
    cvar99,
    worstCase,
    bestCase,
    probabilityOfLoss,
    expectedShortfall,
  };
}

/**
 * Generate risk-averse utility heatmap
 */
export function generateRiskAverseHeatmap(
  grid: GameCell[][],
  radius: number,
  config: GameConfig,
  riskAversion: number = 0.5 // Lambda parameter for risk aversion
): number[][] {
  const height = grid.length;
  const width = grid[0].length;
  
  // Generate Monte Carlo samples for risk analysis
  const mcConfig: MonteCarloConfig = {
    numSamples: 100,
    seed: config.seed + '-risk',
    useImportanceSampling: false,
    spatialCorrelation: false,
  };
  
  const samples = generateMonteCarloSamples(grid, mcConfig);
  const utilityHeatmap: number[][] = Array(height).fill(null).map(() => Array(width).fill(-Infinity));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const riskMetrics = evaluateStrikeRisk(x, y, radius, samples, config);
      
      // Risk-averse utility: U = EV - λ * CVaR_α
      const utility = riskMetrics.expectedValue - riskAversion * Math.abs(riskMetrics.cvar95);
      utilityHeatmap[y][x] = utility;
    }
  }
  
  return utilityHeatmap;
}

/**
 * Generate variance/uncertainty heatmap
 */
export function generateVarianceHeatmap(
  grid: GameCell[][],
  radius: number,
  config: GameConfig
): number[][] {
  const height = grid.length;
  const width = grid[0].length;
  
  const mcConfig: MonteCarloConfig = {
    numSamples: 100,
    seed: config.seed + '-variance',
    useImportanceSampling: false,
    spatialCorrelation: false,
  };
  
  const samples = generateMonteCarloSamples(grid, mcConfig);
  const varianceHeatmap: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const riskMetrics = evaluateStrikeRisk(x, y, radius, samples, config);
      varianceHeatmap[y][x] = riskMetrics.standardDeviation;
    }
  }
  
  return varianceHeatmap;
}

/**
 * Policy recommendation types
 */
export type PolicyType = 'greedyEV' | 'riskAverse' | 'reconVOI';

export interface PolicyRecommendation {
  type: PolicyType;
  action: 'recon' | 'strike' | 'wait';
  x?: number;
  y?: number;
  sensor?: SensorType;
  radius?: number;
  confidence: number;
  reasoning: string;
  value: number; // EV, utility, or VOI
  alternatives?: { x: number; y: number; value: number }[];
}

/**
 * Greedy Expected Value policy
 */
export function getGreedyEVPolicy(
  grid: GameCell[][],
  config: GameConfig,
  remainingBudget: number,
  strikeRadius: number = 1
): PolicyRecommendation {
  const height = grid.length;
  const width = grid[0].length;
  
  let bestX = -1;
  let bestY = -1;
  let bestEV = -Infinity;
  const alternatives: { x: number; y: number; value: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outcome = calculateStrikeEV(grid, x, y, strikeRadius, config);
      
      if (outcome.cost <= remainingBudget && outcome.expectedValue > bestEV) {
        if (bestX !== -1) {
          alternatives.push({ x: bestX, y: bestY, value: bestEV });
        }
        bestEV = outcome.expectedValue;
        bestX = x;
        bestY = y;
      } else if (outcome.cost <= remainingBudget && outcome.expectedValue > 0) {
        alternatives.push({ x, y, value: outcome.expectedValue });
      }
    }
  }
  
  // Sort alternatives by value
  alternatives.sort((a, b) => b.value - a.value);
  alternatives.splice(3); // Keep top 3 alternatives
  
  if (bestEV > 0) {
    return {
      type: 'greedyEV',
      action: 'strike',
      x: bestX,
      y: bestY,
      radius: strikeRadius,
      confidence: Math.min(0.9, 0.5 + bestEV / 100),
      reasoning: `Highest expected value strike: +${bestEV.toFixed(0)} points`,
      value: bestEV,
      alternatives,
    };
  }
  
  return {
    type: 'greedyEV',
    action: 'wait',
    confidence: 0.6,
    reasoning: 'No profitable strikes available',
    value: 0,
  };
}

/**
 * Risk-averse policy using CVaR
 */
export function getRiskAversePolicy(
  grid: GameCell[][],
  config: GameConfig,
  remainingBudget: number,
  riskAversion: number = 0.5,
  strikeRadius: number = 1
): PolicyRecommendation {
  const height = grid.length;
  const width = grid[0].length;
  
  // Generate samples for risk analysis
  const mcConfig: MonteCarloConfig = {
    numSamples: 50, // Fewer samples for real-time performance
    seed: config.seed + '-policy',
    useImportanceSampling: false,
    spatialCorrelation: false,
  };
  
  const samples = generateMonteCarloSamples(grid, mcConfig);
  
  let bestX = -1;
  let bestY = -1;
  let bestUtility = -Infinity;
  const alternatives: { x: number; y: number; value: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (config.strikeCost > remainingBudget) continue;
      
      const riskMetrics = evaluateStrikeRisk(x, y, strikeRadius, samples, config);
      const utility = riskMetrics.expectedValue - riskAversion * Math.abs(riskMetrics.cvar95);
      
      if (utility > bestUtility) {
        if (bestX !== -1) {
          alternatives.push({ x: bestX, y: bestY, value: bestUtility });
        }
        bestUtility = utility;
        bestX = x;
        bestY = y;
      } else if (utility > 0) {
        alternatives.push({ x, y, value: utility });
      }
    }
  }
  
  alternatives.sort((a, b) => b.value - a.value);
  alternatives.splice(3);
  
  if (bestUtility > 0) {
    return {
      type: 'riskAverse',
      action: 'strike',
      x: bestX,
      y: bestY,
      radius: strikeRadius,
      confidence: Math.min(0.9, 0.4 + bestUtility / 50),
      reasoning: `Risk-adjusted optimal strike: +${bestUtility.toFixed(0)} utility (λ=${riskAversion})`,
      value: bestUtility,
      alternatives,
    };
  }
  
  return {
    type: 'riskAverse',
    action: 'wait',
    confidence: 0.5,
    reasoning: 'No risk-acceptable strikes available',
    value: 0,
  };
}

/**
 * Reconnaissance by Value of Information policy
 */
export function getReconVOIPolicy(
  grid: GameCell[][],
  config: GameConfig,
  remainingBudget: number,
  selectedSensor: SensorType,
  strikeRadius: number = 1
): PolicyRecommendation {
  const height = grid.length;
  const width = grid[0].length;
  
  let bestX = -1;
  let bestY = -1;
  let bestVOI = -Infinity;
  const alternatives: { x: number; y: number; value: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip recently reconned cells
      const cell = grid[y][x];
      const recentRecons = cell.reconHistory.filter(r => 
        r.turn >= config.maxTurns - 2 && r.sensor === selectedSensor
      ).length;
      
      if (recentRecons >= 2) continue;
      
      try {
        const voiAnalysis = calculateReconVOI(grid, x, y, selectedSensor, config, strikeRadius, config.seed, 20);
        
        if (voiAnalysis.reconCost <= remainingBudget && voiAnalysis.netVOI > bestVOI) {
          if (bestX !== -1) {
            alternatives.push({ x: bestX, y: bestY, value: bestVOI });
          }
          bestVOI = voiAnalysis.netVOI;
          bestX = x;
          bestY = y;
        } else if (voiAnalysis.reconCost <= remainingBudget && voiAnalysis.netVOI > 0) {
          alternatives.push({ x, y, value: voiAnalysis.netVOI });
        }
             } catch {
         // Skip cells that cause VOI calculation errors
         continue;
       }
    }
  }
  
  alternatives.sort((a, b) => b.value - a.value);
  alternatives.splice(3);
  
  if (bestVOI > 0) {
    return {
      type: 'reconVOI',
      action: 'recon',
      x: bestX,
      y: bestY,
      sensor: selectedSensor,
      confidence: Math.min(0.8, 0.4 + bestVOI / 20),
      reasoning: `Highest information value: +${bestVOI.toFixed(0)} net VOI`,
      value: bestVOI,
      alternatives,
    };
  }
  
  return {
    type: 'reconVOI',
    action: 'wait',
    confidence: 0.3,
    reasoning: 'No valuable reconnaissance opportunities',
    value: 0,
  };
}

/**
 * Get comprehensive policy recommendations
 */
export function getAllPolicyRecommendations(
  grid: GameCell[][],
  config: GameConfig,
  remainingBudget: number,
  currentTurn: number,
  selectedSensor: SensorType,
  riskAversion: number = 0.5
): Record<PolicyType, PolicyRecommendation> {
  const strikeRadius = 1;
  
  return {
    greedyEV: getGreedyEVPolicy(grid, config, remainingBudget, strikeRadius),
    riskAverse: getRiskAversePolicy(grid, config, remainingBudget, riskAversion, strikeRadius),
    reconVOI: getReconVOIPolicy(grid, config, remainingBudget, selectedSensor, strikeRadius),
  };
}

/**
 * Generate probability of loss heatmap
 */
export function generateLossRiskHeatmap(
  grid: GameCell[][],
  radius: number,
  config: GameConfig
): number[][] {
  const height = grid.length;
  const width = grid[0].length;
  
  const mcConfig: MonteCarloConfig = {
    numSamples: 50,
    seed: config.seed + '-loss',
    useImportanceSampling: false,
    spatialCorrelation: false,
  };
  
  const samples = generateMonteCarloSamples(grid, mcConfig);
  const lossRiskHeatmap: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const riskMetrics = evaluateStrikeRisk(x, y, radius, samples, config);
      lossRiskHeatmap[y][x] = riskMetrics.probabilityOfLoss;
    }
  }
  
  return lossRiskHeatmap;
}