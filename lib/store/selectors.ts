import { useGameStore } from '@/state/useGameStore';

// Game status selectors (minimal re-renders)
export const useGameStatus = () => useGameStore(
  (state) => ({
    gameStarted: state.gameStarted,
    gameEnded: state.gameEnded,
    currentTurn: state.currentTurn,
    remainingBudget: state.remainingBudget
  })
);

// Grid data selector (only updates when grid changes)
export const useGridData = () => useGameStore(
  (state) => state.grid
);

// Config selector (rarely changes)
export const useGameConfig = () => useGameStore(
  (state) => ({
    config: state.config
  })
);

// Actions selector (functions don't change)
export const useGameActions = () => useGameStore(
  (state) => ({
    startGame: state.startGame,
    endGame: state.endGame,
    resetGame: state.resetGame,
    performRecon: state.performRecon,
    performStrike: state.performStrike,
    nextTurn: state.nextTurn,
    initializeGame: state.initializeGame
  })
);

// Analytics selector (for charts and stats) - simplified
export const useAnalytics = () => useGameStore(
  (state) => ({
    currentTurn: state.currentTurn,
    remainingBudget: state.remainingBudget
  })
);

// UI state selectors - simplified since these may not exist in current store
export const useUIState = () => useGameStore(
  (state) => ({
    gameStarted: state.gameStarted,
    gameEnded: state.gameEnded
  })
);

// Performance-critical selectors for canvas rendering
export const useGridForCanvas = () => useGameStore(
  (state) => state.grid.map(row => 
    row.map(cell => ({
      x: cell.x,
      y: cell.y,
      posteriorProbability: cell.posteriorProbability,
      hasHostile: cell.hasHostile,
      hasInfrastructure: cell.hasInfrastructure
    }))
  )
);

// Specific cell selector (for tooltip/details)
export const useGridCell = (x: number, y: number) => useGameStore(
  (state) => {
    if (!state.grid[y] || !state.grid[y][x]) return null;
    return state.grid[y][x];
  }
);

// Budget status with threshold checking
export const useBudgetStatus = () => useGameStore(
  (state) => {
    const budget = state.remainingBudget;
    const config = state.config;
    
    return {
      remainingBudget: budget,
      canRecon: budget >= config.reconCost,
      canStrike: budget >= config.strikeCost,
      isLow: budget < (config.reconCost * 2), // Less than 2 recon actions
      isCritical: budget < Math.min(config.reconCost, config.strikeCost)
    };
  }
);

// Memoized computed values
export const useComputedMetrics = () => useGameStore(
  (state) => {
    // Only recalculate when these specific values change
    const totalCells = state.config.gridSize * state.config.gridSize;
    const scannedCells = state.grid.flat().filter(cell => cell.reconHistory.length > 0).length;
    const avgPosterior = state.grid.flat().reduce((sum, cell) => sum + cell.posteriorProbability, 0) / totalCells;
    
    return {
      totalCells,
      scannedCells,
      scanProgress: scannedCells / totalCells,
      avgPosterior,
      turnsRemaining: state.config.maxTurns - state.currentTurn
    };
  }
);

// History and events (for log display) - simplified
export const useGameHistory = () => useGameStore(
  (state) => ({
    currentTurn: state.currentTurn,
    gameStarted: state.gameStarted
  })
);

// Worker-specific data selectors (for offscreen canvas)
export const useHeatmapData = (type: 'posterior' | 'truth') => useGameStore(
  (state) => {
    if (type === 'truth' && state.truthField) {
      return state.truthField.hostileField;
    }
    return state.grid.map(row => 
      row.map(cell => cell.posteriorProbability)
    );
  }
);

// Derived selectors for expensive computations - simplified
export const useDerivedAnalytics = () => useGameStore(
  (state) => {
    const scannedCells = state.grid.flat().filter(cell => cell.reconHistory.length > 0).length;
    const totalReconActions = state.grid.flat().reduce((sum, cell) => sum + cell.reconHistory.length, 0);

    return {
      scannedCells,
      totalReconActions,
      averagePosterior: state.grid.flat().reduce((sum, cell) => sum + cell.posteriorProbability, 0) / (state.config.gridSize * state.config.gridSize)
    };
  }
);

// Performance debugging selector
export const useRenderTracker = (componentName: string) => {
  const renderCount = useGameStore((state) => state.currentTurn); // Proxy for render tracking
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${componentName} rendered, turn: ${renderCount}`);
  }
  
  return renderCount;
};