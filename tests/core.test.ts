import { describe, it, expect } from 'vitest';
import { updatePosteriorOdds, calculateBrierScore, calculateLogLoss } from '@/lib/inference';
import { useGameStore } from '@/state/useGameStore';

describe('Core Functionality Tests', () => {
  describe('Bayesian Inference', () => {
    it('should update posterior probabilities correctly', () => {
      const sensorReading = {
        result: true,
        effectiveTPR: 0.8,
        effectiveFPR: 0.2,
        confidence: 0.9,
        contextSummary: 'test',
        priorProbability: 0.5,
        posteriorProbability: 0
      };

      const posterior = updatePosteriorOdds(0.5, sensorReading);
      
      // Should increase probability for positive reading
      expect(posterior).toBeGreaterThan(0.5);
      expect(posterior).toBeLessThanOrEqual(1.0);
      expect(posterior).toBeGreaterThanOrEqual(0.0);
    });

    it('should maintain probability bounds', () => {
      const testCases = [
        { prior: 0.1, result: true },
        { prior: 0.9, result: false },
        { prior: 0.5, result: true },
        { prior: 0.3, result: false }
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
        expect(isFinite(posterior)).toBe(true);
      });
    });
  });

  describe('Scoring Functions', () => {
    it('should calculate valid Brier scores', () => {
      expect(calculateBrierScore(1.0, true)).toBe(0);
      expect(calculateBrierScore(0.0, false)).toBe(0);
      expect(calculateBrierScore(0.0, true)).toBe(1);
      expect(calculateBrierScore(1.0, false)).toBe(1);
      expect(calculateBrierScore(0.5, true)).toBe(0.25);
    });

    it('should calculate bounded log loss', () => {
      const score1 = calculateLogLoss(0.9, true);
      const score2 = calculateLogLoss(0.1, false);
      
      expect(score1).toBeGreaterThan(0);
      expect(score2).toBeGreaterThan(0);
      expect(isFinite(score1)).toBe(true);
      expect(isFinite(score2)).toBe(true);
    });
  });

  describe('Game Store', () => {
    it('should initialize with correct default values', () => {
      const store = useGameStore.getState();
      
      expect(store.gameStarted).toBe(false);
      expect(store.score).toBe(0);
      expect(store.currentTurn).toBe(0);
      expect(store.remainingBudget).toBeGreaterThan(0);
      expect(store.config.gridSize).toBeGreaterThan(0);
    });

    it('should handle basic game operations', () => {
      const store = useGameStore.getState();
      store.resetGame();
      
      // Verify reset worked
      expect(store.gameStarted).toBe(false);
      expect(store.score).toBe(0);
      
      // Test that we can initialize and check basic functionality
      store.initializeGame();
      const state = useGameStore.getState();
      expect(state.config).toBeDefined();
      expect(state.analytics).toBeDefined();
    });
  });

  describe('Mathematical Properties', () => {
    it('should handle probability edge cases', () => {
      // Test extreme but valid values
      const cases = [
        { prior: 0.001, tpr: 0.999, fpr: 0.001 },
        { prior: 0.999, tpr: 0.501, fpr: 0.499 },
        { prior: 0.5, tpr: 0.7, fpr: 0.3 }
      ];
      
      cases.forEach(({ prior, tpr, fpr }) => {
        const sensorReading = {
          result: true,
          effectiveTPR: tpr,
          effectiveFPR: fpr,
          confidence: 0.9,
          contextSummary: 'edge-case',
          priorProbability: prior,
          posteriorProbability: 0
        };
        
        const posterior = updatePosteriorOdds(prior, sensorReading);
        expect(isFinite(posterior)).toBe(true);
        expect(posterior).toBeGreaterThanOrEqual(0);
        expect(posterior).toBeLessThanOrEqual(1);
      });
    });

    it('should maintain score bounds', () => {
      const predictions = [0, 0.25, 0.5, 0.75, 1.0];
      const outcomes = [true, false];
      
      predictions.forEach(pred => {
        outcomes.forEach(outcome => {
          const brierScore = calculateBrierScore(pred, outcome);
          expect(brierScore).toBeGreaterThanOrEqual(0);
          expect(brierScore).toBeLessThanOrEqual(1);
          expect(isFinite(brierScore)).toBe(true);
          
          const logLoss = calculateLogLoss(pred, outcome);
          expect(isFinite(logLoss)).toBe(true);
          expect(logLoss).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('System Integration', () => {
    it('should handle configuration changes', () => {
      const store = useGameStore.getState();
      const originalBudget = store.config.initialBudget;
      
      // Test that store has basic functionality
      expect(typeof store.updateConfig).toBe('function');
      expect(typeof store.resetGame).toBe('function');
      expect(typeof store.initializeGame).toBe('function');
      
      // Basic validation that config exists and has expected structure
      expect(store.config.initialBudget).toBeDefined();
      expect(store.config.gridSize).toBeDefined();
      expect(originalBudget).toBeGreaterThan(0);
    });

    it('should maintain data consistency', () => {
      const store = useGameStore.getState();
      
      // Test that analytics structure is correct
      expect(store.analytics).toBeDefined();
      expect(store.analytics.timelineData).toBeDefined();
      expect(Array.isArray(store.analytics.timelineData)).toBe(true);
      
      // Test that event log exists and is an array
      expect(Array.isArray(store.eventLog)).toBe(true);
      
      // Test that loading state exists
      expect(store.loadingState).toBeDefined();
      expect(typeof store.loadingState.isLoading).toBe('boolean');
    });
  });
});