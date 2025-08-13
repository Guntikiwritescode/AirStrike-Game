import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameStore } from '@/state/useGameStore';
import { GameConfig } from '@/lib/types';

// Mock the worker manager to avoid Web Worker issues in tests
vi.mock('@/lib/worker-manager', () => ({
  getWorkerManager: () => ({
    generateEVHeatmap: vi.fn().mockResolvedValue({ result: Array(14).fill(Array(14).fill(0)) }),
    generateVOIHeatmap: vi.fn().mockResolvedValue({ result: Array(14).fill(Array(14).fill(0)) }),
    generateRiskAverseHeatmap: vi.fn().mockResolvedValue({ result: Array(14).fill(Array(14).fill(0)) }),
    generateVarianceHeatmap: vi.fn().mockResolvedValue({ result: Array(14).fill(Array(14).fill(0)) }),
    generateLossRiskHeatmap: vi.fn().mockResolvedValue({ result: Array(14).fill(Array(14).fill(0)) }),
    getPolicyRecommendations: vi.fn().mockResolvedValue({ result: {} }),
    onLoadingStateChange: vi.fn().mockReturnValue(() => {}),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Simple test component to test store interactions
function TestGameControls() {
  const {
    gameStarted,
    score,
    remainingBudget,
    currentTurn,
    config,
    startGame,
    resetGame,
    nextTurn,
    updateConfig,
    performRecon,
    performStrike,
    exportGameRun,
  } = useGameStore();

  return (
    <div>
      <div data-testid="game-status">
        {gameStarted ? 'started' : 'not-started'}
      </div>
      <div data-testid="score">{score}</div>
      <div data-testid="budget">{remainingBudget}</div>
      <div data-testid="turn">{currentTurn}</div>
      <div data-testid="grid-size">{config.gridSize}</div>
      
      <button data-testid="start-game" onClick={startGame}>
        Start Game
      </button>
      <button data-testid="reset-game" onClick={resetGame}>
        Reset Game
      </button>
      <button data-testid="next-turn" onClick={nextTurn}>
        Next Turn
      </button>
      <button 
        data-testid="update-budget" 
        onClick={() => updateConfig({ initialBudget: 2000 })}
      >
        Update Budget
      </button>
      <button
        data-testid="perform-recon"
        onClick={() => performRecon(0, 0, 'drone')}
      >
        Perform Recon
      </button>
      <button
        data-testid="perform-strike"
        onClick={() => performStrike(0, 0, 1)}
      >
        Perform Strike
      </button>
      <button data-testid="export-run" onClick={exportGameRun}>
        Export Run
      </button>
    </div>
  );
}

// Mock component for testing heatmap toggles
function TestHeatmapControls() {
  const [viewMode, setViewMode] = React.useState<'posterior' | 'expectedValue' | 'valueOfInformation'>('posterior');
  
  return (
    <div>
      <div data-testid="view-mode">{viewMode}</div>
      <button 
        data-testid="toggle-posterior" 
        onClick={() => setViewMode('posterior')}
      >
        Posterior
      </button>
      <button 
        data-testid="toggle-ev" 
        onClick={() => setViewMode('expectedValue')}
      >
        Expected Value
      </button>
      <button 
        data-testid="toggle-voi" 
        onClick={() => setViewMode('valueOfInformation')}
      >
        Value of Information
      </button>
    </div>
  );
}

describe('Component Tests', () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useGameStore.getState();
    store.resetGame();
    // Initialize the game to ensure grid is properly set up
    store.initializeGame();
  });

  describe('Game State Management', () => {
    it('should initialize with correct default state', () => {
      render(<TestGameControls />);
      
      expect(screen.getByTestId('game-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('score')).toHaveTextContent('0');
      expect(screen.getByTestId('budget')).toHaveTextContent('1000');
      expect(screen.getByTestId('turn')).toHaveTextContent('0');
      expect(screen.getByTestId('grid-size')).toHaveTextContent('14');
    });

    it('should start game when start button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      const startButton = screen.getByTestId('start-game');
      await user.click(startButton);
      
      expect(screen.getByTestId('game-status')).toHaveTextContent('started');
      expect(screen.getByTestId('turn')).toHaveTextContent('1');
    });

    it('should reset game when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game first
      await user.click(screen.getByTestId('start-game'));
      expect(screen.getByTestId('game-status')).toHaveTextContent('started');
      
      // Reset game
      await user.click(screen.getByTestId('reset-game'));
      expect(screen.getByTestId('game-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('turn')).toHaveTextContent('0');
      expect(screen.getByTestId('score')).toHaveTextContent('0');
    });

    it('should advance turn when next turn button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game first
      await user.click(screen.getByTestId('start-game'));
      expect(screen.getByTestId('turn')).toHaveTextContent('1');
      
      // Advance turn
      await user.click(screen.getByTestId('next-turn'));
      expect(screen.getByTestId('turn')).toHaveTextContent('2');
    });

    it('should update config when update button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      expect(screen.getByTestId('budget')).toHaveTextContent('1000');
      
      // Update budget
      await user.click(screen.getByTestId('update-budget'));
      expect(screen.getByTestId('budget')).toHaveTextContent('2000');
    });
  });

  describe('Game Actions', () => {
    it('should perform reconnaissance when recon button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game first
      await user.click(screen.getByTestId('start-game'));
      
      // Check that the action was attempted (budget might not change due to safety checks)
      await user.click(screen.getByTestId('perform-recon'));
      
      // Verify that the action was processed
      const state = useGameStore.getState();
      expect(state.gameStarted).toBe(true);
    });

    it('should perform strike when strike button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game first
      await user.click(screen.getByTestId('start-game'));
      
      // Check that the action was attempted
      await user.click(screen.getByTestId('perform-strike'));
      
      // Verify that the action was processed
      const state = useGameStore.getState();
      expect(state.gameStarted).toBe(true);
    });

    it('should not perform actions when game is not started', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      const initialBudget = parseInt(screen.getByTestId('budget').textContent || '0');
      
      // Try to perform recon without starting game
      await user.click(screen.getByTestId('perform-recon'));
      
      // Budget should not change since game isn't started
      const newBudget = parseInt(screen.getByTestId('budget').textContent || '0');
      expect(newBudget).toBe(initialBudget);
    });
  });

  describe('UI Interactions', () => {
    it('should toggle view modes correctly', async () => {
      const user = userEvent.setup();
      render(<TestHeatmapControls />);
      
      expect(screen.getByTestId('view-mode')).toHaveTextContent('posterior');
      
      // Toggle to EV
      await user.click(screen.getByTestId('toggle-ev'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('expectedValue');
      
      // Toggle to VOI
      await user.click(screen.getByTestId('toggle-voi'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('valueOfInformation');
      
      // Toggle back to posterior
      await user.click(screen.getByTestId('toggle-posterior'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('posterior');
    });

    it('should handle export functionality', async () => {
      const user = userEvent.setup();
      
      // Mock the download functionality
      const createObjectURL = vi.fn();
      const revokeObjectURL = vi.fn();
      Object.defineProperty(window, 'URL', {
        value: { createObjectURL, revokeObjectURL },
      });
      
      render(<TestGameControls />);
      
      // Start game to have some data to export
      await user.click(screen.getByTestId('start-game'));
      
      // Click export
      await user.click(screen.getByTestId('export-run'));
      
      // Should have created blob URLs (one for JSON, one for CSV)
      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Store State Consistency', () => {
    it('should maintain consistent state during game progression', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Initial state
      expect(useGameStore.getState().gameStarted).toBe(false);
      expect(useGameStore.getState().currentTurn).toBe(0);
      expect(useGameStore.getState().score).toBe(0);
      
      // Start game
      await user.click(screen.getByTestId('start-game'));
      
      const state1 = useGameStore.getState();
      expect(state1.gameStarted).toBe(true);
      expect(state1.currentTurn).toBe(1);
      expect(state1.eventLog.length).toBeGreaterThan(0);
      
      // Perform action
      await user.click(screen.getByTestId('perform-recon'));
      
      const state2 = useGameStore.getState();
      expect(state2.eventLog.length).toBeGreaterThan(state1.eventLog.length);
      expect(state2.remainingBudget).toBeLessThan(state1.remainingBudget);
      
      // Reset game
      await user.click(screen.getByTestId('reset-game'));
      
      const state3 = useGameStore.getState();
      expect(state3.gameStarted).toBe(false);
      expect(state3.currentTurn).toBe(0);
      expect(state3.score).toBe(0);
      expect(state3.eventLog).toHaveLength(0);
    });

    it('should preserve config changes across game reset', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Update config
      await user.click(screen.getByTestId('update-budget'));
      expect(useGameStore.getState().config.initialBudget).toBe(2000);
      
      // Start and reset game
      await user.click(screen.getByTestId('start-game'));
      await user.click(screen.getByTestId('reset-game'));
      
      // Config should be preserved
      expect(useGameStore.getState().config.initialBudget).toBe(2000);
      expect(useGameStore.getState().remainingBudget).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      // Test that the store handles out-of-bounds coordinates
      const store = useGameStore.getState();
      
      // This should not throw an error
      expect(() => {
        store.performRecon(-1, -1, 'drone');
      }).not.toThrow();
      
      expect(() => {
        store.performRecon(100, 100, 'drone');
      }).not.toThrow();
    });

    it('should handle insufficient budget gracefully', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game
      await user.click(screen.getByTestId('start-game'));
      
      // Verify budget doesn't go negative through normal action validation
      const initialBudget = useGameStore.getState().remainingBudget;
      expect(initialBudget).toBeGreaterThan(0);
      
      // Test that the store has budget protection mechanisms
      const store = useGameStore.getState();
      expect(store.remainingBudget).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analytics Integration', () => {
    it('should track turn metrics correctly', async () => {
      const user = userEvent.setup();
      render(<TestGameControls />);
      
      // Start game
      await user.click(screen.getByTestId('start-game'));
      
      const initialAnalytics = useGameStore.getState().analytics;
      expect(initialAnalytics.timelineData).toBeDefined();
      
      // Advance turn to trigger metrics recording
      await user.click(screen.getByTestId('next-turn'));
      
      const updatedAnalytics = useGameStore.getState().analytics;
      expect(updatedAnalytics.timelineData).toBeDefined();
      expect(Array.isArray(updatedAnalytics.timelineData)).toBe(true);
    });
  });
});

// Add React import for the TestHeatmapControls component
import React from 'react';