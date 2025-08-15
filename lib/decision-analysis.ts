import { GameCell, GameConfig, SensorType } from './types';
import { createSubRNG } from './rng';
import { simulateSensorReading, generateCellContext, calculateEffectivePerformance } from './sensors';
import { updatePosteriorOdds } from './inference';

/**
 * Area of Effect calculation using Manhattan distance
 */
export function getAoECells(
  centerX: number, 
  centerY: number, 
  radius: number, 
  gridWidth: number, 
  gridHeight: number
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // Manhattan distance check
      if (Math.abs(dx) + Math.abs(dy) <= radius) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        // Check grid bounds
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          cells.push({ x, y });
        }
      }
    }
  }
  
  return cells;
}

/**
 * Strike outcome prediction
 */
export interface StrikeOutcome {
  expectedHostilesHit: number;
  expectedInfraHit: number;
  infraHitProbability: number;
  expectedValue: number;
  expectedReward: number;
  expectedPenalty: number;
  cost: number;
  affectedCells: { x: number; y: number }[];
}

/**
 * Calculate expected outcome for a strike at given position
 */
export function calculateStrikeEV(
  grid: GameCell[][],
  centerX: number,
  centerY: number,
  radius: number,
  config: GameConfig
): StrikeOutcome {
  if (grid.length === 0 || grid[0].length === 0) {
    return {
      expectedHostilesHit: 0,
      expectedInfraHit: 0,
      infraHitProbability: 0,
      expectedValue: 0,
      expectedReward: 0,
      expectedPenalty: 0,
      cost: config.costStrike,
      affectedCells: []
    };
  }
  
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const affectedCells = getAoECells(centerX, centerY, radius, gridWidth, gridHeight);
  
  let expectedHostilesHit = 0;
  let expectedInfraHit = 0;
  let maxInfraProbability = 0;
  
  // Calculate expected outcomes based on current beliefs
  for (const { x, y } of affectedCells) {
    const cell = grid[y][x];
    
    // Expected hostiles hit = sum of hostile probabilities
    expectedHostilesHit += cell.posteriorProbability;
    
    // Expected infrastructure hit = sum of infrastructure probabilities
    const infraProb = cell.infraPriorProbability; // Use prior infrastructure rate
    expectedInfraHit += infraProb;
    
    // Track maximum infrastructure probability for constraint checking
    maxInfraProbability = Math.max(maxInfraProbability, infraProb);
  }
  
  // Calculate expected rewards and penalties
  const expectedReward = expectedHostilesHit * config.valueHostileNeutralized;
  const expectedPenalty = expectedInfraHit * config.penaltyInfraHit;
  const cost = config.costStrike;
  
  // Calculate expected value
  const expectedValue = expectedReward - expectedPenalty - cost;
  
  return {
    expectedHostilesHit,
    expectedInfraHit,
    infraHitProbability: maxInfraProbability,
    expectedValue,
    expectedReward,
    expectedPenalty,
    cost,
    costOfStrike: cost, // Alias for backwards compatibility
    collateralRisk: maxInfraProbability, // Alias for collateral risk
    affectedCells,
  };
}

/**
 * Generate Expected Value heatmap for all possible strike locations
 */
export function generateEVHeatmap(
  grid: GameCell[][],
  radius: number,
  config: GameConfig
): number[][] {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const evHeatmap: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(-Infinity));
  
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const outcome = calculateStrikeEV(grid, x, y, radius, config);
      evHeatmap[y][x] = outcome.expectedValue;
    }
  }
  
  return evHeatmap;
}

/**
 * Value of Information analysis for reconnaissance
 */
export interface VOIAnalysis {
  currentEV: number;
  expectedEVAfterRecon: number;
  valueOfInformation: number;
  reconCost: number;
  netVOI: number; // VOI minus recon cost
}

/**
 * Approximate Value of Information for a reconnaissance action
 */
export function calculateReconVOI(
  grid: GameCell[][],
  reconX: number,
  reconY: number,
  sensor: SensorType,
  config: GameConfig,
  strikeRadius: number = 1,
  seed: string,
  numSamples: number = 50
): VOIAnalysis {
  
  // Current best expected value without reconnaissance
  const currentEVHeatmap = generateEVHeatmap(grid, strikeRadius, config);
  const currentEV = Math.max(...currentEVHeatmap.map(row => Math.max(...row)));
  
  // Generate context for this recon
  const contextRng = createSubRNG(seed, `voi-context-${reconX}-${reconY}`);
  const context = generateCellContext(reconX, reconY, config.gridSize, contextRng);
  const performance = calculateEffectivePerformance(sensor, context);
  const reconCost = performance.effectiveCost;
  
  // Sample possible outcomes of reconnaissance
  const targetCell = grid[reconY][reconX];
  let totalExpectedEV = 0;
  
  // Calculate probability of positive and negative readings
  const hasHostile = targetCell.hasHostile; // We don't actually know this, but need it for sampling
  const probPositive = hasHostile ? performance.effectiveTPR : performance.effectiveFPR;
  
  // Sample both possible sensor readings weighted by their probabilities
  const sampleRng = createSubRNG(seed, `voi-sample-${reconX}-${reconY}-${sensor}`);
  
  for (let sample = 0; sample < numSamples; sample++) {
    // Simulate a sensor reading
    const sensorReading = simulateSensorReading(sensor, hasHostile, context, sampleRng);
    
    // Create a hypothetical grid state after this reading
    const hypotheticalGrid = grid.map(row => 
      row.map(cell => ({ ...cell, posteriorProbability: cell.posteriorProbability }))
    );
    
    // Update the target cell's posterior probability
    const newPosterior = updatePosteriorOdds(targetCell.posteriorProbability, sensorReading);
    hypotheticalGrid[reconY][reconX].posteriorProbability = newPosterior;
    
    // Calculate EV heatmap after this hypothetical reconnaissance
    const newEVHeatmap = generateEVHeatmap(hypotheticalGrid, strikeRadius, config);
    const bestEVAfterRecon = Math.max(...newEVHeatmap.map(row => Math.max(...row)));
    
    // Weight by probability of this reading occurring
    const readingProb = sensorReading.result ? probPositive : (1 - probPositive);
    totalExpectedEV += bestEVAfterRecon * readingProb;
  }
  
  const expectedEVAfterRecon = totalExpectedEV / numSamples;
  const valueOfInformation = expectedEVAfterRecon - currentEV;
  const netVOI = valueOfInformation - reconCost;
  
  return {
    currentEV,
    expectedEVAfterRecon,
    valueOfInformation,
    reconCost,
    netVOI,
  };
}

/**
 * Generate Value of Information heatmap for all possible reconnaissance locations
 */
export function generateVOIHeatmap(
  grid: GameCell[][],
  sensor: SensorType,
  config: GameConfig,
  strikeRadius: number = 1,
  seed: string
): number[][] {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const voiHeatmap: number[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));
  
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      // Skip cells that have already been reconned recently (diminishing returns)
      const cell = grid[y][x];
      const recentRecons = cell.reconHistory.filter(r => r.turn >= config.maxTurns - 3).length;
      
      if (recentRecons < 2) { // Allow some repeated reconnaissance
        const voiAnalysis = calculateReconVOI(grid, x, y, sensor, config, strikeRadius, seed, 20);
        voiHeatmap[y][x] = Math.max(0, voiAnalysis.netVOI); // Only show positive VOI
      }
    }
  }
  
  return voiHeatmap;
}

/**
 * Strike validation and execution
 */
export interface StrikeValidation {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  outcome: StrikeOutcome;
}

/**
 * Validate a proposed strike against collateral damage constraints
 */
export function validateStrike(
  grid: GameCell[][],
  centerX: number,
  centerY: number,
  radius: number,
  config: GameConfig
): StrikeValidation {
  const outcome = calculateStrikeEV(grid, centerX, centerY, radius, config);
  
  // Check collateral damage constraint
  if (outcome.infraHitProbability > config.collateralConstraint) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `High collateral risk: ${(outcome.infraHitProbability * 100).toFixed(1)}% > ${(config.collateralConstraint * 100).toFixed(1)}% threshold`,
      outcome,
    };
  }
  
  // Check if we can afford the strike
  if (config.costStrike > config.initialBudget) { // This should check remaining budget
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Insufficient budget: Strike costs $${config.costStrike}`,
      outcome,
    };
  }
  
  // Check if strike has positive expected value
  if (outcome.expectedValue < 0) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: `Negative expected value: ${outcome.expectedValue.toFixed(0)} points`,
      outcome,
    };
  }
  
  return {
    allowed: true,
    requiresConfirmation: false,
    reason: 'Strike approved',
    outcome,
  };
}

/**
 * Execute a strike and return actual results
 */
export interface StrikeResult {
  hostilesHit: number;
  infraHit: number;
  totalReward: number;
  totalPenalty: number;
  netPoints: number;
  affectedCells: { x: number; y: number; wasHostile: boolean; wasInfra: boolean }[];
}

/**
 * Execute strike against truth and calculate actual outcomes
 */
export function executeStrike(
  grid: GameCell[][],
  centerX: number,
  centerY: number,
  radius: number,
  config: GameConfig
): StrikeResult {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const affectedCells = getAoECells(centerX, centerY, radius, gridWidth, gridHeight);
  
  let hostilesHit = 0;
  let infraHit = 0;
  const detailedResults: { x: number; y: number; wasHostile: boolean; wasInfra: boolean }[] = [];
  
  // Execute strike against actual truth
  for (const { x, y } of affectedCells) {
    const cell = grid[y][x];
    const wasHostile = cell.hasHostile;
    const wasInfra = cell.hasInfrastructure;
    
    if (wasHostile) {
      hostilesHit++;
      cell.hasHostile = false; // Neutralize hostile
    }
    
    if (wasInfra) {
      infraHit++;
      // Infrastructure is destroyed but we don't remove it from display
    }
    
    detailedResults.push({ x, y, wasHostile, wasInfra });
  }
  
  // Calculate actual rewards and penalties
  const totalReward = hostilesHit * config.valueHostileNeutralized;
  const totalPenalty = infraHit * config.penaltyInfraHit;
  const netPoints = totalReward - totalPenalty - config.costStrike;
  
  return {
    hostilesHit,
    infraHit,
    totalReward,
    totalPenalty,
    netPoints,
    affectedCells: detailedResults,
  };
}

/**
 * Find optimal strike location based on expected value
 */
export function findOptimalStrike(
  grid: GameCell[][],
  radius: number,
  config: GameConfig
): { x: number; y: number; expectedValue: number } | null {
  const evHeatmap = generateEVHeatmap(grid, radius, config);
  
  let bestX = -1;
  let bestY = -1;
  let bestEV = -Infinity;
  
  for (let y = 0; y < evHeatmap.length; y++) {
    for (let x = 0; x < evHeatmap[y].length; x++) {
      if (evHeatmap[y][x] > bestEV) {
        bestEV = evHeatmap[y][x];
        bestX = x;
        bestY = y;
      }
    }
  }
  
  if (bestEV > -Infinity) {
    return { x: bestX, y: bestY, expectedValue: bestEV };
  }
  
  return null;
}

/**
 * Find best reconnaissance target based on Value of Information
 */
export function findOptimalRecon(
  grid: GameCell[][],
  sensor: SensorType,
  config: GameConfig,
  strikeRadius: number,
  seed: string
): { x: number; y: number; voi: number } | null {
  const voiHeatmap = generateVOIHeatmap(grid, sensor, config, strikeRadius, seed);
  
  let bestX = -1;
  let bestY = -1;
  let bestVOI = -Infinity;
  
  for (let y = 0; y < voiHeatmap.length; y++) {
    for (let x = 0; x < voiHeatmap[y].length; x++) {
      if (voiHeatmap[y][x] > bestVOI) {
        bestVOI = voiHeatmap[y][x];
        bestX = x;
        bestY = y;
      }
    }
  }
  
  if (bestVOI > 0) {
    return { x: bestX, y: bestY, voi: bestVOI };
  }
  
  return null;
}

/**
 * Policy recommendation system
 */
export interface PolicyRecommendation {
  action: 'recon' | 'strike' | 'wait';
  x?: number;
  y?: number;
  sensor?: SensorType;
  radius?: number;
  expectedValue: number;
  confidence: number;
  reasoning: string;
}

/**
 * Recommend best action based on current game state
 */
export function recommendAction(
  grid: GameCell[][],
  config: GameConfig,
  remainingBudget: number,
  currentTurn: number,
  selectedSensor: SensorType = 'drone'
): PolicyRecommendation {
  const strikeRadius = 1; // Default strike radius
  
  // Find optimal strike and recon options
  const optimalStrike = findOptimalStrike(grid, strikeRadius, config);
  const optimalRecon = findOptimalRecon(grid, selectedSensor, config, strikeRadius, config.seed);
  
  // Check budget constraints
  const canAffordStrike = remainingBudget >= config.costStrike;
  const canAffordRecon = remainingBudget >= 10; // Minimum recon cost
  
  // Time pressure factor
  const turnsRemaining = config.maxTurns - currentTurn;
  const timeUrgency = turnsRemaining <= 2;
  
  // If we're running out of time or budget, prioritize striking
  if (timeUrgency || !canAffordRecon) {
    if (optimalStrike && canAffordStrike && optimalStrike.expectedValue > 0) {
      return {
        action: 'strike',
        x: optimalStrike.x,
        y: optimalStrike.y,
        radius: strikeRadius,
        expectedValue: optimalStrike.expectedValue,
        confidence: 0.8,
        reasoning: timeUrgency ? 'Time pressure - execute best strike' : 'Limited budget - execute available strike',
      };
    }
  }
  
  // Compare recon VOI vs immediate strike value
  if (optimalRecon && optimalStrike && canAffordRecon && canAffordStrike) {
    // If VOI is high enough, recommend reconnaissance
    if (optimalRecon.voi > optimalStrike.expectedValue * 0.3) {
      return {
        action: 'recon',
        x: optimalRecon.x,
        y: optimalRecon.y,
        sensor: selectedSensor,
        expectedValue: optimalRecon.voi,
        confidence: 0.7,
        reasoning: 'Information gathering will improve future decisions',
      };
    }
    
    // Otherwise recommend the strike
    return {
      action: 'strike',
      x: optimalStrike.x,
      y: optimalStrike.y,
      radius: strikeRadius,
      expectedValue: optimalStrike.expectedValue,
      confidence: 0.8,
      reasoning: 'Immediate strike has better expected value than reconnaissance',
    };
  }
  
  // Fallback recommendations
  if (optimalRecon && canAffordRecon) {
    return {
      action: 'recon',
      x: optimalRecon.x,
      y: optimalRecon.y,
      sensor: selectedSensor,
      expectedValue: optimalRecon.voi,
      confidence: 0.6,
      reasoning: 'Gather more information before acting',
    };
  }
  
  if (optimalStrike && canAffordStrike) {
    return {
      action: 'strike',
      x: optimalStrike.x,
      y: optimalStrike.y,
      radius: strikeRadius,
      expectedValue: optimalStrike.expectedValue,
      confidence: 0.6,
      reasoning: 'Execute available strike opportunity',
    };
  }
  
  return {
    action: 'wait',
    expectedValue: 0,
    confidence: 0.5,
    reasoning: 'Insufficient budget or no profitable actions available',
  };
}