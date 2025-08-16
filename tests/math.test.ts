import { describe, it, expect } from 'vitest';
import { updatePosteriorOdds, calculateBrierScore, calculateLogLoss } from '@/lib/inference';
import { calculateStrikeEV, generateEVHeatmap, generateVOIHeatmap } from '@/lib/decision-analysis';
import { GameCell, GameConfig } from '@/lib/types';

describe('Odds Update Mathematics', () => {
  describe('updatePosteriorOdds', () => {
    it('should correctly update posterior with positive reading', () => {
      const prior = 0.5;
      const sensorReading = {
        result: true,
        effectiveTPR: 0.8,
        effectiveFPR: 0.2,
        confidence: 0.9,
        contextSummary: 'test',
        priorProbability: prior,
        posteriorProbability: 0 // Will be calculated
      };

      const posterior = updatePosteriorOdds(prior, sensorReading);
      
      // Manual calculation: odds = 0.5 / 0.5 = 1
      // new_odds = 1 * (0.8 / 0.2) = 4
      // new_posterior = 4 / (1 + 4) = 0.8
      expect(posterior).toBeCloseTo(0.8, 3);
    });

    it('should correctly update posterior with negative reading', () => {
      const prior = 0.5;
      const sensorReading = {
        result: false,
        effectiveTPR: 0.8,
        effectiveFPR: 0.2,
        confidence: 0.9,
        contextSummary: 'test',
        priorProbability: prior,
        posteriorProbability: 0
      };

      const posterior = updatePosteriorOdds(prior, sensorReading);
      
      // Manual calculation: odds = 1
      // new_odds = 1 * ((1-0.8) / (1-0.2)) = 1 * (0.2 / 0.8) = 0.25
      // new_posterior = 0.25 / (1 + 0.25) = 0.2
      expect(posterior).toBeCloseTo(0.2, 3);
    });

    it('should handle extreme priors correctly', () => {
      const sensorReading = {
        result: true,
        effectiveTPR: 0.9,
        effectiveFPR: 0.1,
        confidence: 0.95,
        contextSummary: 'test',
        priorProbability: 0.01,
        posteriorProbability: 0
      };

      const posterior = updatePosteriorOdds(0.01, sensorReading);
      
      // Should increase significantly but not to 1
      expect(posterior).toBeGreaterThan(0.01);
      expect(posterior).toBeLessThan(1);
    });

    it('should handle near-perfect sensors correctly', () => {
      const nearPerfectSensor = {
        result: true,
        effectiveTPR: 0.999,
        effectiveFPR: 0.001,
        confidence: 1.0,
        contextSummary: 'near-perfect',
        priorProbability: 0.5,
        posteriorProbability: 0
      };

      const posterior = updatePosteriorOdds(0.5, nearPerfectSensor);
      // Should be very high probability but not exactly 1 due to numerical stability
      expect(posterior).toBeGreaterThan(0.99);
      expect(posterior).toBeLessThanOrEqual(1.0);
    });

    it('should preserve probability bounds', () => {
      const testCases = [
        { prior: 0.001, result: true },
        { prior: 0.999, result: false },
        { prior: 0.5, result: true },
        { prior: 0.1, result: false }
      ];

      testCases.forEach(({ prior, result }) => {
        const sensorReading = {
          result,
          effectiveTPR: 0.85,
          effectiveFPR: 0.15,
          confidence: 0.9,
          contextSummary: 'test',
          priorProbability: prior,
          posteriorProbability: 0
        };

        const posterior = updatePosteriorOdds(prior, sensorReading);
        expect(posterior).toBeGreaterThanOrEqual(0);
        expect(posterior).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Brier Score Calculation', () => {
    it('should calculate perfect prediction score', () => {
      expect(calculateBrierScore(1.0, true)).toBe(0);
      expect(calculateBrierScore(0.0, false)).toBe(0);
    });

    it('should calculate worst prediction score', () => {
      expect(calculateBrierScore(0.0, true)).toBe(1);
      expect(calculateBrierScore(1.0, false)).toBe(1);
    });

    it('should calculate uncertain prediction score', () => {
      const score = calculateBrierScore(0.5, true);
      expect(score).toBe(0.25);
    });

    it('should be symmetric around 0.5', () => {
      const score1 = calculateBrierScore(0.3, true);
      const score2 = calculateBrierScore(0.7, false);
      expect(score1).toBeCloseTo(score2, 10);
    });
  });

  describe('Log Loss Calculation', () => {
    it('should calculate near-perfect prediction scores', () => {
      // Due to clamping for numerical stability, perfect predictions aren't exactly 0
      expect(calculateLogLoss(1.0, true)).toBeLessThan(0.01);
      expect(calculateLogLoss(0.0, false)).toBeLessThan(0.01);
    });

    it('should handle edge cases safely', () => {
      // Should clamp to avoid infinite values
      const score1 = calculateLogLoss(0.0, true);
      const score2 = calculateLogLoss(1.0, false);
      
      expect(isFinite(score1)).toBe(true);
      expect(isFinite(score2)).toBe(true);
      expect(score1).toBeGreaterThan(0);
      expect(score2).toBeGreaterThan(0);
    });

    it('should penalize confident wrong predictions more', () => {
      const wrongConfident = calculateLogLoss(0.9, false);
      const wrongUncertain = calculateLogLoss(0.6, false);
      
      expect(wrongConfident).toBeGreaterThan(wrongUncertain);
    });
  });
});

describe('Expected Value Mathematics', () => {
  const createTestConfig = (): GameConfig => ({
    gridSize: 5,
    initialBudget: 1000,
    maxTurns: 10,
    costRecon: 10,
    costStrike: 50,
    valueHostileNeutralized: 100,
    penaltyInfraHit: 200,
    collateralConstraint: 0.3,
    showTruthOverlay: false,
    seed: 'test-seed'
  });

  const createTestGrid = (): GameCell[][] => {
    const grid: GameCell[][] = [];
    for (let y = 0; y < 5; y++) {
      grid[y] = [];
      for (let x = 0; x < 5; x++) {
        grid[y][x] = {
          hasHostile: false,
          hasInfrastructure: false,
          posteriorProbability: 0.3,
          hostilePriorProbability: 0.2,
          infraPriorProbability: 0.1,
          lastReconTurn: -1,
          reconCount: 0,
          reconHistory: []
        };
      }
    }
    return grid;
  };

  describe('calculateStrikeEV', () => {
    it('should calculate basic EV correctly', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Set up a cell with known probabilities
      grid[2][2].posteriorProbability = 0.8;
      grid[2][2].infraPriorProbability = 0.1;
      
      const result = calculateStrikeEV(grid, 2, 2, 1, config);
      
      // EV = -cost + P(hostile) * value - P(infra) * penalty
      // EV = -50 + 0.8 * 100 - 0.1 * 200 = -50 + 80 - 20 = 10
      expect(result.expectedValue).toBeCloseTo(10, 1);
      expect(result.costOfStrike).toBe(50);
    });

    it('should account for Area of Effect', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Set up multiple cells in AoE
      grid[2][2].posteriorProbability = 0.7;
      grid[2][1].posteriorProbability = 0.5; // Manhattan distance 1
      grid[2][3].posteriorProbability = 0.5;
      grid[1][2].posteriorProbability = 0.5;
      grid[3][2].posteriorProbability = 0.5;
      
      const result = calculateStrikeEV(grid, 2, 2, 1, config);
      
      // Should include all cells within Manhattan radius 1
      const expectedHostiles = 0.7 + 0.5 + 0.5 + 0.5 + 0.5; // 2.7 expected hostiles
      const expectedValue = -50 + 2.7 * 100 - 5 * 0.1 * 200; // 5 cells with 0.1 infra prob each
      
      expect(result.expectedValue).toBeCloseTo(expectedValue, 1);
    });

    it('should handle edge coordinates correctly', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Strike at corner - should only affect valid cells
      const result = calculateStrikeEV(grid, 0, 0, 1, config);
      
      expect(result.expectedValue).toBeDefined();
      expect(result.affectedCells.length).toBeLessThanOrEqual(4); // Corner has fewer neighbors
    });

    it('should calculate collateral risk correctly', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Set up high infrastructure probability
      grid[2][2].infraPriorProbability = 0.5;
      
      const result = calculateStrikeEV(grid, 2, 2, 1, config);
      
      expect(result.collateralRisk).toBeGreaterThan(0);
      expect(result.collateralRisk).toBeLessThanOrEqual(1);
    });
  });

  describe('generateEVHeatmap', () => {
    it('should generate heatmap with correct dimensions', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      const heatmap = generateEVHeatmap(grid, 1, config);
      
      expect(heatmap).toHaveLength(5);
      expect(heatmap[0]).toHaveLength(5);
    });

    it('should contain finite values', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      const heatmap = generateEVHeatmap(grid, 1, config);
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(isFinite(heatmap[y][x])).toBe(true);
        }
      }
    });

    it('should reflect probability differences', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Create cells with different hostile probabilities
      grid[1][1].posteriorProbability = 0.9;
      grid[3][3].posteriorProbability = 0.1;
      
      const heatmap = generateEVHeatmap(grid, 1, config);
      
      // Cell with higher hostile probability should have higher EV
      expect(heatmap[1][1]).toBeGreaterThan(heatmap[3][3]);
    });
  });

  describe('generateVOIHeatmap', () => {
    it('should generate non-negative VOI values', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      const heatmap = generateVOIHeatmap(grid, 'drone', config, 1, 'test-seed');
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(heatmap[y][x]).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should give higher VOI to uncertain cells', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      // Create cells with different uncertainty levels
      grid[1][1].posteriorProbability = 0.5; // Maximum uncertainty
      grid[3][3].posteriorProbability = 0.9; // Low uncertainty
      
      const heatmap = generateVOIHeatmap(grid, 'drone', config, 1, 'test-seed');
      
      // More uncertain cell should have higher VOI
      expect(heatmap[1][1]).toBeGreaterThanOrEqual(heatmap[3][3]);
    });

    it('should vary by sensor type', () => {
      const grid = createTestGrid();
      const config = createTestConfig();
      
      const droneVOI = generateVOIHeatmap(grid, 'drone', config, 1, 'test-seed');
      const sigintVOI = generateVOIHeatmap(grid, 'sigint', config, 1, 'test-seed');
      
      // Different sensors should give different VOI patterns
      let hasDifference = false;
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (Math.abs(droneVOI[y][x] - sigintVOI[y][x]) > 0.01) {
            hasDifference = true;
            break;
          }
        }
      }
      expect(hasDifference).toBe(true);
    });
  });
});

describe('Mathematical Invariants', () => {
  it('should maintain probability bounds after multiple updates', () => {
    let probability = 0.5;
    
    // Apply multiple sensor readings
    for (let i = 0; i < 10; i++) {
      const sensorReading = {
        result: Math.random() > 0.5,
        effectiveTPR: 0.8 + Math.random() * 0.1,
        effectiveFPR: 0.1 + Math.random() * 0.1,
        confidence: 0.9,
        contextSummary: `test-${i}`,
        priorProbability: probability,
        posteriorProbability: 0
      };
      
      probability = updatePosteriorOdds(probability, sensorReading);
      
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(1);
    }
  });

  it('should have Brier score in valid range', () => {
    const testCases = [
      { pred: 0.0, actual: true },
      { pred: 0.5, actual: true },
      { pred: 1.0, actual: true },
      { pred: 0.0, actual: false },
      { pred: 0.5, actual: false },
      { pred: 1.0, actual: false }
    ];

    testCases.forEach(({ pred, actual }) => {
      const score = calculateBrierScore(pred, actual);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  it('should have consistent EV calculations', () => {
    const grid = createTestGrid();
    const config = createTestConfig();
    
    // Calculate EV in different ways
    const directEV = calculateStrikeEV(grid, 2, 2, 1, config);
    const heatmap = generateEVHeatmap(grid, 1, config);
    
    expect(directEV.expectedValue).toBeCloseTo(heatmap[2][2], 2);
  });

  function createTestGrid(): GameCell[][] {
    const grid: GameCell[][] = [];
    for (let y = 0; y < 5; y++) {
      grid[y] = [];
      for (let x = 0; x < 5; x++) {
        grid[y][x] = {
          hasHostile: false,
          hasInfrastructure: false,
          posteriorProbability: 0.3,
          hostilePriorProbability: 0.2,
          infraPriorProbability: 0.1,
          lastReconTurn: -1,
          reconCount: 0,
          reconHistory: []
        };
      }
    }
    return grid;
  }

  function createTestConfig(): GameConfig {
    return {
      gridSize: 5,
      initialBudget: 1000,
      maxTurns: 10,
      reconCost: 10,
      strikeCost: 50,
      hostileValue: 100,
      infraPenalty: 200,
      collateralThreshold: 0.3,
      riskAversion: 0.1,
      showTruthOverlay: false,
      seed: 'test-seed',
      spatialField: {
        noiseScale: 0.5,
        smoothingSigma: 1.0,
        logisticSteepness: 5.0,
        hostileBaseProbability: 0.2,
        infraBaseProbability: 0.1
      },
      betaPriors: {
        hostileAlpha: 2,
        hostileBeta: 8,
        infraAlpha: 1,
        infraBeta: 9
      }
    };
  }
});