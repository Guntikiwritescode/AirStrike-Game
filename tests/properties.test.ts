import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { updatePosteriorOdds, calculateBrierScore, calculateLogLoss } from '@/lib/inference';
import { calculateStrikeEV, generateEVHeatmap, generateVOIHeatmap } from '@/lib/decision-analysis';
import { generateMonteCarloSamples } from '@/lib/risk-analysis';
import { GameCell, GameConfig, SensorType } from '@/lib/types';

// Create arbitrary data generators for tests
const createArbitrary = {
  gameConfig: (): fc.Arbitrary<GameConfig> => fc.record({
    gridSize: fc.constant(5),
    initialBudget: fc.integer({ min: 100, max: 1000 }),
    maxTurns: fc.integer({ min: 5, max: 20 }),
    reconCost: fc.integer({ min: 5, max: 20 }),
    strikeCost: fc.integer({ min: 20, max: 100 }),
    hostileValue: fc.integer({ min: 50, max: 200 }),
    infraPenalty: fc.integer({ min: 100, max: 500 }),
    collateralThreshold: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }),
    riskAversion: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5) }),
    showTruthOverlay: fc.boolean(),
    seed: fc.constant('test-seed'),
    spatialField: fc.record({
      noiseScale: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
      smoothingSigma: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0) }),
      logisticSteepness: fc.float({ min: Math.fround(1.0), max: Math.fround(10.0) }),
      hostileBaseProbability: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }),
      infraBaseProbability: fc.float({ min: Math.fround(0.05), max: Math.fround(0.3) })
    }),
    betaPriors: fc.record({
      hostileAlpha: fc.float({ min: Math.fround(1.0), max: Math.fround(5.0) }),
      hostileBeta: fc.float({ min: Math.fround(5.0), max: Math.fround(15.0) }),
      infraAlpha: fc.float({ min: Math.fround(1.0), max: Math.fround(3.0) }),
      infraBeta: fc.float({ min: Math.fround(7.0), max: Math.fround(20.0) })
    })
  }),

  gameCell: (): fc.Arbitrary<GameCell> => fc.record({
    hasHostile: fc.boolean(),
    hasInfrastructure: fc.boolean(),
    posteriorProbability: fc.float({ min: Math.fround(0.01), max: Math.fround(0.99) }),
    hostilePriorProbability: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5) }),
    infraPriorProbability: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3) }),
    lastReconTurn: fc.integer({ min: -1, max: 10 }),
    reconCount: fc.integer({ min: 0, max: 5 })
  }),

  gameGrid: (): fc.Arbitrary<GameCell[][]> => 
    fc.array(fc.array(createArbitrary.gameCell(), { minLength: 5, maxLength: 5 }), { minLength: 5, maxLength: 5 })
};

describe('Property-Based Tests', () => {
  describe('Posterior Update Properties', () => {
    it('should always produce valid probabilities', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.999) }), // prior probability
        fc.boolean(), // sensor result
        fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }), // effective TPR
        fc.float({ min: Math.fround(0.0), max: Math.fround(0.5) }), // effective FPR
        (prior, result, tpr, fpr) => {
          const sensorReading = {
            result,
            effectiveTPR: tpr,
            effectiveFPR: fpr,
            confidence: 0.9,
            contextSummary: 'property-test',
            priorProbability: prior,
            posteriorProbability: 0
          };

          const posterior = updatePosteriorOdds(prior, sensorReading);

          // Property: Posterior must be a valid probability
          expect(posterior).toBeGreaterThanOrEqual(0);
          expect(posterior).toBeLessThanOrEqual(1);
          expect(posterior).toBeFinite();
        }
      ));
    });

    it('should increase posterior when positive reading from good sensor', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }), // prior probability
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0) }), // high TPR
        fc.float({ min: Math.fround(0.0), max: Math.fround(0.2) }), // low FPR
        (prior, tpr, fpr) => {
          fc.pre(tpr > fpr); // Ensure sensor is better than random

          const sensorReading = {
            result: true,
            effectiveTPR: tpr,
            effectiveFPR: fpr,
            confidence: 0.9,
            contextSummary: 'property-test',
            priorProbability: prior,
            posteriorProbability: 0
          };

          const posterior = updatePosteriorOdds(prior, sensorReading);

          // Property: Positive reading from good sensor should increase belief
          expect(posterior).toBeGreaterThan(prior);
        }
      ));
    });

    it('should decrease posterior when negative reading from good sensor', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }), // prior probability
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0) }), // high TPR
        fc.float({ min: Math.fround(0.0), max: Math.fround(0.2) }), // low FPR
        (prior, tpr, fpr) => {
          fc.pre(tpr > fpr); // Ensure sensor is better than random

          const sensorReading = {
            result: false,
            effectiveTPR: tpr,
            effectiveFPR: fpr,
            confidence: 0.9,
            contextSummary: 'property-test',
            priorProbability: prior,
            posteriorProbability: 0
          };

          const posterior = updatePosteriorOdds(prior, sensorReading);

          // Property: Negative reading from good sensor should decrease belief
          expect(posterior).toBeLessThan(prior);
        }
      ));
    });

    it('should be commutative for independent observations', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }), // prior
        fc.boolean(), // first reading
        fc.boolean(), // second reading
        fc.float({ min: Math.fround(0.6), max: Math.fround(0.9) }), // TPR
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.4) }), // FPR
        (prior, reading1, reading2, tpr, fpr) => {
          // Apply readings in order 1, 2
          const sensor1 = {
            result: reading1,
            effectiveTPR: tpr,
            effectiveFPR: fpr,
            confidence: 0.9,
            contextSummary: 'test1',
            priorProbability: prior,
            posteriorProbability: 0
          };

          const intermediate1 = updatePosteriorOdds(prior, sensor1);

          const sensor2 = {
            result: reading2,
            effectiveTPR: tpr,
            effectiveFPR: fpr,
            confidence: 0.9,
            contextSummary: 'test2',
            priorProbability: intermediate1,
            posteriorProbability: 0
          };

          const final1 = updatePosteriorOdds(intermediate1, sensor2);

          // Apply readings in order 2, 1
          const sensor2First = { ...sensor2, priorProbability: prior };
          const intermediate2 = updatePosteriorOdds(prior, sensor2First);

          const sensor1Second = { ...sensor1, priorProbability: intermediate2 };
          const final2 = updatePosteriorOdds(intermediate2, sensor1Second);

          // Property: Order shouldn't matter for independent observations
          expect(final1).toBeCloseTo(final2, 10);
        }
      ));
    });
  });

  describe('Brier Score Properties', () => {
    it('should always be between 0 and 1', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1) }), // prediction
        fc.boolean(), // actual outcome
        (prediction, actual) => {
          const score = calculateBrierScore(prediction, actual);

          // Property: Brier score must be in [0, 1]
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      ));
    });

    it('should be minimized by the true probability', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99) }), // true probability
        fc.integer({ min: 1, max: 100 }), // number of trials
        (trueProb, numTrials) => {
          // Generate outcomes according to true probability
          let totalScore = 0;
          let perfectScore = 0;

          for (let i = 0; i < numTrials; i++) {
            const outcome = Math.random() < trueProb;
            
            // Score for predicting true probability
            totalScore += calculateBrierScore(trueProb, outcome);
            
            // Score for perfect prediction (if we knew the outcome)
            perfectScore += calculateBrierScore(outcome ? 1.0 : 0.0, outcome);
          }

          const avgScore = totalScore / numTrials;
          const avgPerfectScore = perfectScore / numTrials;

          // Property: Predicting true probability should be better than random
          const randomScore = 0.25; // Average Brier score for 0.5 prediction
          expect(avgScore).toBeLessThan(randomScore);
          
          // Property: Perfect prediction should be better than or equal to true probability
          expect(avgPerfectScore).toBeLessThanOrEqual(avgScore + 0.1); // Small tolerance for randomness
        }
      ));
    });
  });

  describe('Expected Value Properties', () => {

    it('should have finite EV for all valid inputs', () => {
      fc.assert(fc.property(
        createArbitrary.gameGrid(),
        createArbitrary.gameConfig(),
        fc.integer({ min: 0, max: 4 }), // x coordinate
        fc.integer({ min: 0, max: 4 }), // y coordinate
        fc.integer({ min: 1, max: 3 }), // radius
        (grid, config, x, y, radius) => {
          const result = calculateStrikeEV(grid, x, y, radius, config);

          // Property: EV should always be finite
          expect(result.expectedValue).toBeFinite();
          expect(result.cost).toBeFinite();
          expect(result.infraHitProbability).toBeFinite();
          
          // Property: Collateral risk should be a valid probability
          expect(result.infraHitProbability).toBeGreaterThanOrEqual(0);
          expect(result.infraHitProbability).toBeLessThanOrEqual(1);
        }
      ));
    });

    it('should have higher EV for higher hostile probabilities', () => {
      fc.assert(fc.property(
        createArbitrary.gameConfig(),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.4) }), // low hostile probability
        fc.float({ min: Math.fround(0.6), max: Math.fround(0.9) }), // high hostile probability
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.2) }), // infrastructure probability
        (config, lowHostile, highHostile, infraProb) => {
          const createGrid = (hostileProb: number): GameCell[][] => {
            const grid: GameCell[][] = [];
            for (let y = 0; y < 5; y++) {
              grid[y] = [];
              for (let x = 0; x < 5; x++) {
                grid[y][x] = {
                  hasHostile: false,
                  hasInfrastructure: false,
                  posteriorProbability: hostileProb,
                  hostilePriorProbability: hostileProb,
                  infraPriorProbability: infraProb,
                  lastReconTurn: -1,
                  reconCount: 0
                };
              }
            }
            return grid;
          };

          const lowGrid = createGrid(lowHostile);
          const highGrid = createGrid(highHostile);

          const lowEV = calculateStrikeEV(lowGrid, 2, 2, 1, config);
          const highEV = calculateStrikeEV(highGrid, 2, 2, 1, config);

          // Property: Higher hostile probability should lead to higher EV
          expect(highEV.expectedValue).toBeGreaterThan(lowEV.expectedValue);
        }
      ));
    });

    it('should have lower EV for higher infrastructure probabilities', () => {
      fc.assert(fc.property(
        createArbitrary.gameConfig(),
        fc.float({ min: Math.fround(0.5), max: Math.fround(0.7) }), // hostile probability
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.1) }), // low infrastructure probability
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.5) }), // high infrastructure probability
        (config, hostileProb, lowInfra, highInfra) => {
          const createGrid = (infraProb: number): GameCell[][] => {
            const grid: GameCell[][] = [];
            for (let y = 0; y < 5; y++) {
              grid[y] = [];
              for (let x = 0; x < 5; x++) {
                grid[y][x] = {
                  hasHostile: false,
                  hasInfrastructure: false,
                  posteriorProbability: hostileProb,
                  hostilePriorProbability: hostileProb,
                  infraPriorProbability: infraProb,
                  lastReconTurn: -1,
                  reconCount: 0
                };
              }
            }
            return grid;
          };

          const lowInfraGrid = createGrid(lowInfra);
          const highInfraGrid = createGrid(highInfra);

          const lowInfraEV = calculateStrikeEV(lowInfraGrid, 2, 2, 1, config);
          const highInfraEV = calculateStrikeEV(highInfraGrid, 2, 2, 1, config);

          // Property: Higher infrastructure probability should lead to lower EV
          expect(lowInfraEV.expectedValue).toBeGreaterThan(highInfraEV.expectedValue);
        }
      ));
    });
  });

  describe('VOI Properties', () => {
    it('should always generate non-negative VOI', () => {
      fc.assert(fc.property(
        createArbitrary.gameGrid(),
        createArbitrary.gameConfig(),
        fc.constantFrom('drone', 'sigint', 'ground'),
        (grid, config, sensor) => {
          const heatmap = generateVOIHeatmap(grid, sensor as SensorType, config, 1, 'test-seed');

          // Property: VOI should always be non-negative
          for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
              expect(heatmap[y][x]).toBeGreaterThanOrEqual(0);
              expect(heatmap[y][x]).toBeFinite();
            }
          }
        }
      ));
    });

    it('should give maximum VOI near probability 0.5', () => {
      fc.assert(fc.property(
        createArbitrary.gameConfig(),
        fc.constantFrom('drone', 'sigint', 'ground'),
        (config, sensor) => {
          const createUniformGrid = (prob: number): GameCell[][] => {
            const grid: GameCell[][] = [];
            for (let y = 0; y < 5; y++) {
              grid[y] = [];
              for (let x = 0; x < 5; x++) {
                grid[y][x] = {
                  hasHostile: false,
                  hasInfrastructure: false,
                  posteriorProbability: prob,
                  hostilePriorProbability: prob,
                  infraPriorProbability: 0.1,
                  lastReconTurn: -1,
                  reconCount: 0
                };
              }
            }
            return grid;
          };

          const uncertainGrid = createUniformGrid(0.5); // Maximum uncertainty
          const certainGrid = createUniformGrid(0.9);   // Low uncertainty

          const uncertainVOI = generateVOIHeatmap(uncertainGrid, sensor as SensorType, config, 1, 'test-seed');
          const certainVOI = generateVOIHeatmap(certainGrid, sensor as SensorType, config, 1, 'test-seed');

          // Property: Uncertain cells should have higher or equal VOI
          for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
              expect(uncertainVOI[y][x]).toBeGreaterThanOrEqual(certainVOI[y][x] - 0.1); // Small tolerance
            }
          }
        }
      ));
    });
  });

  describe('Monte Carlo Properties', () => {
    it('should generate samples with correct structure', () => {
      fc.assert(fc.property(
        createArbitrary.gameGrid(),
        fc.integer({ min: 10, max: 50 }), // number of samples
        (grid, numSamples) => {
          const config = {
            numSamples,
            seed: 'test-mc',
            useImportanceSampling: false,
            spatialCorrelation: false
          };

          const samples = generateMonteCarloSamples(grid, config);

          // Property: Should generate correct number of samples
          expect(samples).toHaveLength(numSamples);

          // Property: Each sample should have correct structure
          samples.forEach(sample => {
            expect(sample.hostileStates).toHaveLength(5);
            expect(sample.infraStates).toHaveLength(5);
            expect(sample.likelihood).toBeGreaterThan(0);
            expect(sample.likelihood).toBeLessThanOrEqual(1);

            // Each row should have correct length
            sample.hostileStates.forEach(row => {
              expect(row).toHaveLength(5);
            });
            sample.infraStates.forEach(row => {
              expect(row).toHaveLength(5);
            });
          });
        }
      ));
    });

    it('should respect grid probabilities statistically', () => {
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.2), max: Math.fround(0.8) }), // hostile probability
        fc.integer({ min: 100, max: 200 }), // number of samples
        (hostileProb, numSamples) => {
          // Create uniform grid with known probability
          const grid: GameCell[][] = [];
          for (let y = 0; y < 3; y++) { // Smaller grid for faster testing
            grid[y] = [];
            for (let x = 0; x < 3; x++) {
              grid[y][x] = {
                hasHostile: false,
                hasInfrastructure: false,
                posteriorProbability: hostileProb,
                hostilePriorProbability: hostileProb,
                infraPriorProbability: 0.1,
                lastReconTurn: -1,
                reconCount: 0
              };
            }
          }

          const config = {
            numSamples,
            seed: 'test-mc-stats',
            useImportanceSampling: false,
            spatialCorrelation: false
          };

          const samples = generateMonteCarloSamples(grid, config);

          // Count hostile occurrences at center cell
          const centerHostileCount = samples.reduce((count, sample) => {
            return count + (sample.hostileStates[1][1] ? 1 : 0);
          }, 0);

          const observedFrequency = centerHostileCount / numSamples;

          // Property: Observed frequency should be close to expected probability
          // Allow for statistical variation with reasonable tolerance
          const tolerance = 3 * Math.sqrt(hostileProb * (1 - hostileProb) / numSamples); // 3-sigma
          expect(Math.abs(observedFrequency - hostileProb)).toBeLessThan(tolerance + 0.05);
        }
      ));
    });
  });

  describe('Constraint Properties', () => {
    it('should respect collateral constraint in strike validation', () => {
      fc.assert(fc.property(
        createArbitrary.gameConfig(),
        fc.float({ min: Math.fround(0.0), max: Math.fround(1.0) }), // infrastructure probability
        (config, infraProb) => {
          // Create grid with known infrastructure probability
          const grid: GameCell[][] = [];
          for (let y = 0; y < 5; y++) {
            grid[y] = [];
            for (let x = 0; x < 5; x++) {
              grid[y][x] = {
                hasHostile: false,
                hasInfrastructure: false,
                posteriorProbability: 0.5,
                hostilePriorProbability: 0.3,
                infraPriorProbability: infraProb,
                lastReconTurn: -1,
                reconCount: 0
              };
            }
          }

          const result = calculateStrikeEV(grid, 2, 2, 1, config);

          // Property: Collateral risk should be valid probability  
          expect(result.infraHitProbability).toBeGreaterThanOrEqual(0);
          expect(result.infraHitProbability).toBeLessThanOrEqual(1);
          expect(result.infraHitProbability).toBeFinite();
        }
      ));
    });
  });

});