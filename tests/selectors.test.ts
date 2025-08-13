import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/state/useGameStore';
import { 
  useGameStatus, 
  useGameActions, 
  useBudgetStatus, 
  useComputedMetrics,
  useGridCell
} from '@/lib/store/selectors';

// Mock the game store
vi.mock('@/state/useGameStore');

const mockGameStore = useGameStore as any;

describe('Selector Memoization', () => {
  beforeEach(() => {
    // Reset mock before each test
    vi.clearAllMocks();
  });

  describe('useGameStatus', () => {
    it('should not re-render when unrelated state changes', () => {
      const mockState = {
        gameStarted: true,
        gameEnded: false,
        currentTurn: 1,
        remainingBudget: 100,
        someOtherProp: 'initial'
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result, rerender } = renderHook(() => useGameStatus());
      const initialResult = result.current;

      // Change unrelated property
      mockState.someOtherProp = 'changed';
      rerender();

      // Should return the same object reference (memoized)
      expect(result.current).toBe(initialResult);
    });

    it('should re-render when relevant state changes', () => {
      const mockState = {
        gameStarted: true,
        gameEnded: false,
        currentTurn: 1,
        remainingBudget: 100
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result, rerender } = renderHook(() => useGameStatus());
      const initialResult = result.current;

      // Change relevant property
      mockState.currentTurn = 2;
      rerender();

      // Should return a new object (not memoized)
      expect(result.current).not.toBe(initialResult);
      expect(result.current.currentTurn).toBe(2);
    });
  });

  describe('useGameActions', () => {
    it('should return stable function references', () => {
      const mockActions = {
        startGame: vi.fn(),
        endGame: vi.fn(),
        resetGame: vi.fn(),
        performRecon: vi.fn(),
        performStrike: vi.fn(),
        nextTurn: vi.fn(),
        initializeGame: vi.fn()
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockActions)
      );

      const { result, rerender } = renderHook(() => useGameActions());
      const initialResult = result.current;

      rerender();

      // Function references should remain stable
      expect(result.current).toBe(initialResult);
      expect(result.current.startGame).toBe(mockActions.startGame);
    });
  });

  describe('useBudgetStatus', () => {
    it('should derive correct budget status', () => {
      const mockState = {
        remainingBudget: 50,
        config: {
          reconCost: 10,
          strikeCost: 20
        }
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useBudgetStatus());

      expect(result.current).toEqual({
        remainingBudget: 50,
        canRecon: true,  // 50 >= 10
        canStrike: true, // 50 >= 20
        isLow: false,    // 50 >= 20 (2 * reconCost)
        isCritical: false // 50 >= 10 (min cost)
      });
    });

    it('should handle low budget correctly', () => {
      const mockState = {
        remainingBudget: 15,
        config: {
          reconCost: 10,
          strikeCost: 20
        }
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useBudgetStatus());

      expect(result.current).toEqual({
        remainingBudget: 15,
        canRecon: true,   // 15 >= 10
        canStrike: false, // 15 < 20
        isLow: true,      // 15 < 20 (2 * reconCost)
        isCritical: false // 15 >= 10 (min cost)
      });
    });

    it('should handle critical budget correctly', () => {
      const mockState = {
        remainingBudget: 5,
        config: {
          reconCost: 10,
          strikeCost: 20
        }
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useBudgetStatus());

      expect(result.current).toEqual({
        remainingBudget: 5,
        canRecon: false,  // 5 < 10
        canStrike: false, // 5 < 20
        isLow: true,      // 5 < 20
        isCritical: true  // 5 < 10 (min cost)
      });
    });
  });

  describe('useComputedMetrics', () => {
    it('should compute metrics correctly', () => {
      const mockGrid = [
        [
          { reconHistory: [1, 2], posteriorProbability: 0.5 },
          { reconHistory: [], posteriorProbability: 0.3 }
        ],
        [
          { reconHistory: [1], posteriorProbability: 0.7 },
          { reconHistory: [], posteriorProbability: 0.1 }
        ]
      ];

      const mockState = {
        config: { gridSize: 2, maxTurns: 10 },
        currentTurn: 3,
        grid: mockGrid
      };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useComputedMetrics());

      expect(result.current).toEqual({
        totalCells: 4,
        scannedCells: 2, // Cells with reconHistory.length > 0
        scanProgress: 0.5, // 2/4
        avgPosterior: 0.4, // (0.5 + 0.3 + 0.7 + 0.1) / 4
        turnsRemaining: 7 // 10 - 3
      });
    });
  });

  describe('useGridCell', () => {
    it('should return specific cell data', () => {
      const mockGrid = [
        [
          { x: 0, y: 0, posteriorProbability: 0.5, reconHistory: [] },
          { x: 1, y: 0, posteriorProbability: 0.3, reconHistory: [1] }
        ]
      ];

      const mockState = { grid: mockGrid };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useGridCell(1, 0));

      expect(result.current).toEqual({
        x: 1,
        y: 0,
        posteriorProbability: 0.3,
        reconHistory: [1]
      });
    });

    it('should return null for invalid coordinates', () => {
      const mockGrid = [
        [{ x: 0, y: 0, posteriorProbability: 0.5, reconHistory: [] }]
      ];

      const mockState = { grid: mockGrid };

      mockGameStore.mockImplementation((selector: any) => 
        selector(mockState)
      );

      const { result } = renderHook(() => useGridCell(5, 5));

      expect(result.current).toBeNull();
    });
  });

  describe('Performance Characteristics', () => {
    it('should limit selector execution frequency', () => {
      const selectorSpy = vi.fn();
      const mockState = {
        gameStarted: true,
        currentTurn: 1,
        remainingBudget: 100
      };

      mockGameStore.mockImplementation((selector: any) => {
        selectorSpy();
        return selector(mockState);
      });

      const { rerender } = renderHook(() => useGameStatus());

      // Initial render
      expect(selectorSpy).toHaveBeenCalledTimes(1);

      // Multiple re-renders without state change should not call selector again
      rerender();
      rerender();
      rerender();

      // With shallow comparison, selector should only be called once
      expect(selectorSpy).toHaveBeenCalledTimes(1);
    });
  });
});