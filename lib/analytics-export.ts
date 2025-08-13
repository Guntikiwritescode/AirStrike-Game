import { GameCell, GameConfig, GameEvent, GameAnalytics, TurnMetrics, GameRunExport, TruthField } from './types';
import { calculateStrikeEV } from './decision-analysis';
import { calculateSpatialCorrelation } from './truth-generation';

/**
 * Calculate turn metrics for timeline tracking
 */
export function calculateTurnMetrics(
  turn: number,
  grid: GameCell[][],
  config: GameConfig,
  currentScore: number,
  remainingBudget: number,
  analytics: GameAnalytics,
  truthField: TruthField,
  eventsThisTurn: GameEvent[]
): TurnMetrics {
  const timestamp = Date.now();
  
  // Calculate best EV available
  let bestEVAvailable = -Infinity;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const outcome = calculateStrikeEV(grid, x, y, 1, config);
      if (outcome.expectedValue > bestEVAvailable) {
        bestEVAvailable = outcome.expectedValue;
      }
    }
  }
  
  // Calculate chosen EV from strikes this turn
  let chosenEV = 0;
  const strikeEvents = eventsThisTurn.filter(e => e.type === 'strike');
  if (strikeEvents.length > 0) {
    // Use the EV of the best strike taken this turn
    chosenEV = Math.max(...strikeEvents.map(e => {
      const strikeData = e.data as { expectedValue?: number };
      return strikeData.expectedValue || 0;
    }));
  }
  
  const evGap = bestEVAvailable - chosenEV;
  
  // Calculate infrastructure risk
  let totalInfraRisk = 0;
  if (grid.length === 0 || grid[0].length === 0) {
    return {
      turn,
      timestamp,
      score: currentScore,
      remainingBudget,
      brierScore: analytics.brierScore,
      logLoss: analytics.logLoss,
      hostilesNeutralized: analytics.hostilesNeutralized,
      infraHits: analytics.infraHits,
      totalCost: analytics.totalCost,
      bestEVAvailable: 0,
      chosenEV: 0,
      evGap: 0,
      infraRisk: 0,
      uncertaintyLevel: 0,
      actionsThisTurn: {
        recons: 0,
        strikes: 0,
        totalCost: 0
      },
      beliefAccuracy: 0,
      spatialConcentration: 0
    };
  }
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      totalInfraRisk += grid[y][x].infraPriorProbability;
    }
  }
  const infraRisk = totalInfraRisk / (grid.length * grid[0].length);
  
  // Calculate uncertainty level (average entropy)
  let totalEntropy = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const p = grid[y][x].posteriorProbability;
      const entropy = p > 0 && p < 1 ? -(p * Math.log2(p) + (1-p) * Math.log2(1-p)) : 0;
      totalEntropy += entropy;
    }
  }
  const uncertaintyLevel = totalEntropy / (grid.length * grid[0].length);
  
  // Calculate belief accuracy (correlation with truth)
  const posteriorField = grid.map(row => row.map(cell => cell.posteriorProbability));
  const truthGrid = truthField.hostileTruth.map(row => row.map(cell => cell ? 1 : 0));
  const beliefAccuracy = calculateSpatialCorrelation(posteriorField, truthGrid);
  
  // Calculate spatial concentration (variance of beliefs)
  const flatPosteriors = posteriorField.flat();
  const meanPosterior = flatPosteriors.reduce((sum, p) => sum + p, 0) / flatPosteriors.length;
  const variance = flatPosteriors.reduce((sum, p) => sum + Math.pow(p - meanPosterior, 2), 0) / flatPosteriors.length;
  const spatialConcentration = Math.sqrt(variance);
  
  // Count actions this turn
  const reconEvents = eventsThisTurn.filter(e => e.type === 'recon');
  const actionCost = eventsThisTurn.reduce((sum, e) => {
    const data = e.data as { cost?: number };
    return sum + (data.cost || 0);
  }, 0);
  
  return {
    turn,
    timestamp,
    score: currentScore,
    remainingBudget,
    brierScore: analytics.brierScore,
    logLoss: analytics.logLoss,
    hostilesNeutralized: analytics.hostilesNeutralized,
    infraHits: analytics.infraHits,
    totalCost: analytics.totalCost,
    bestEVAvailable,
    chosenEV,
    evGap,
    infraRisk,
    uncertaintyLevel,
    actionsThisTurn: {
      recons: reconEvents.length,
      strikes: strikeEvents.length,
      totalCost: actionCost
    },
    beliefAccuracy,
    spatialConcentration
  };
}

/**
 * Generate comprehensive game run export
 */
export function generateGameRunExport(
  config: GameConfig,
  analytics: GameAnalytics,
  eventLog: GameEvent[],
  truthField: TruthField,
  finalScore: number,
  totalTurns: number,
  performanceMetrics?: {
    totalComputationTime: number;
    workerCacheHitRate: number;
    averageDecisionTime: number;
  }
): GameRunExport {
  return {
    exportTimestamp: Date.now(),
    gameConfig: config,
    seed: config.seed,
    totalTurns,
    finalScore,
    turnMetrics: analytics.timelineData,
    events: eventLog,
    finalAnalytics: analytics,
    truthField: {
      hostiles: truthField.hostileTruth,
      infrastructure: truthField.infraTruth,
      hostilePriorField: truthField.hostileField,
      infraPriorField: truthField.infraField
    },
    entities: {
      infrastructure: [],
      aircraft: [],
      flightPaths: []
    },
    performanceMetrics: performanceMetrics || {
      totalComputationTime: 0,
      workerCacheHitRate: 0,
      averageDecisionTime: 0
    }
  };
}

/**
 * Convert export data to CSV format
 */
export function exportToCSV(exportData: GameRunExport): string {
  const lines: string[] = [];
  
  // Metadata header
  lines.push('# Bayesian Forward Operator - Game Run Export');
  lines.push(`# Export Date: ${new Date(exportData.exportTimestamp).toISOString()}`);
  lines.push(`# Seed: ${exportData.seed}`);
  lines.push(`# Final Score: ${exportData.finalScore}`);
  lines.push(`# Total Turns: ${exportData.totalTurns}`);
  lines.push('');
  
  // Turn metrics
  lines.push('## Turn Metrics');
  const turnHeaders = [
    'Turn', 'Timestamp', 'Score', 'Budget', 'Brier', 'LogLoss', 
    'HostilesKilled', 'InfraHits', 'TotalCost', 'BestEV', 'ChosenEV', 
    'EVGap', 'InfraRisk', 'Uncertainty', 'Recons', 'Strikes', 
    'ActionCost', 'BeliefAccuracy', 'Concentration'
  ];
  lines.push(turnHeaders.join(','));
  
  exportData.turnMetrics.forEach(turn => {
    const row = [
      turn.turn,
      turn.timestamp,
      turn.score,
      turn.remainingBudget,
      turn.brierScore.toFixed(4),
      turn.logLoss.toFixed(4),
      turn.hostilesNeutralized,
      turn.infraHits,
      turn.totalCost,
      turn.bestEVAvailable.toFixed(2),
      turn.chosenEV.toFixed(2),
      turn.evGap.toFixed(2),
      turn.infraRisk.toFixed(4),
      turn.uncertaintyLevel.toFixed(4),
      turn.actionsThisTurn.recons,
      turn.actionsThisTurn.strikes,
      turn.actionsThisTurn.totalCost,
      turn.beliefAccuracy.toFixed(4),
      turn.spatialConcentration.toFixed(4)
    ];
    lines.push(row.join(','));
  });
  
  lines.push('');
  
  // Events log
  lines.push('## Events Log');
  const eventHeaders = ['Turn', 'Type', 'Timestamp', 'Details'];
  lines.push(eventHeaders.join(','));
  
  exportData.events.forEach(event => {
    const details = JSON.stringify(event.data).replace(/,/g, ';'); // Escape commas
    const row = [
      event.turn,
      event.type,
      event.timestamp,
      `"${details}"`
    ];
    lines.push(row.join(','));
  });
  
  lines.push('');
  
  // Final analytics summary
  lines.push('## Final Analytics');
  lines.push('Metric,Value');
  lines.push(`Final Score,${exportData.finalScore}`);
  lines.push(`Hostiles Neutralized,${exportData.finalAnalytics.hostilesNeutralized}`);
  lines.push(`Infrastructure Hits,${exportData.finalAnalytics.infraHits}`);
  lines.push(`Total Cost,${exportData.finalAnalytics.totalCost}`);
  lines.push(`Final Brier Score,${exportData.finalAnalytics.brierScore.toFixed(4)}`);
  lines.push(`Final Log Loss,${exportData.finalAnalytics.logLoss.toFixed(4)}`);
  lines.push(`Calibration Error,${exportData.finalAnalytics.calibrationError.toFixed(4)}`);
  lines.push(`Truth Correlation,${exportData.finalAnalytics.truthCorrelation.toFixed(4)}`);
  lines.push(`Spatial Accuracy,${exportData.finalAnalytics.spatialAccuracy.toFixed(4)}`);
  lines.push(`Total Predictions,${exportData.finalAnalytics.totalPredictions}`);
  
  return lines.join('\n');
}

/**
 * Download file utility
 */
export function downloadFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export game run data as both JSON and CSV
 */
export function exportGameRun(exportData: GameRunExport): void {
  const timestamp = new Date(exportData.exportTimestamp).toISOString().replace(/:/g, '-').split('.')[0];
  const baseFilename = `bayesian-forward-operator-${exportData.seed}-${timestamp}`;
  
  // Export JSON
  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, `${baseFilename}.json`, 'application/json');
  
  // Export CSV
  const csvContent = exportToCSV(exportData);
  downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv');
  
  console.log(`📊 Exported game run data: ${baseFilename}`);
}

/**
 * Calculate EV gap metrics for timeline analysis
 */
export function calculateEVGapMetrics(timelineData: TurnMetrics[]): {
  averageGap: number;
  maxGap: number;
  gapTrend: 'improving' | 'worsening' | 'stable';
  optimalDecisionRate: number;
} {
  if (timelineData.length === 0) {
    return { averageGap: 0, maxGap: 0, gapTrend: 'stable', optimalDecisionRate: 0 };
  }
  
  const gaps = timelineData.map(t => t.evGap);
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const maxGap = Math.max(...gaps);
  
  // Calculate trend
  const firstHalf = gaps.slice(0, Math.floor(gaps.length / 2));
  const secondHalf = gaps.slice(Math.floor(gaps.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, gap) => sum + gap, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, gap) => sum + gap, 0) / secondHalf.length;
  
  let gapTrend: 'improving' | 'worsening' | 'stable';
  if (Math.abs(secondHalfAvg - firstHalfAvg) < 0.1) {
    gapTrend = 'stable';
  } else if (secondHalfAvg < firstHalfAvg) {
    gapTrend = 'improving';
  } else {
    gapTrend = 'worsening';
  }
  
  // Calculate optimal decision rate (when EV gap is near zero)
  const optimalDecisions = gaps.filter(gap => gap < 5).length; // Within 5 points is "near optimal"
  const optimalDecisionRate = optimalDecisions / gaps.length;
  
  return {
    averageGap,
    maxGap,
    gapTrend,
    optimalDecisionRate
  };
}

/**
 * Calculate infrastructure risk trends
 */
export function calculateInfraRiskTrends(timelineData: TurnMetrics[]): {
  initialRisk: number;
  finalRisk: number;
  averageRisk: number;
  riskReduction: number;
  criticalTurns: number[];
} {
  if (timelineData.length === 0) {
    return { initialRisk: 0, finalRisk: 0, averageRisk: 0, riskReduction: 0, criticalTurns: [] };
  }
  
  const risks = timelineData.map(t => t.infraRisk);
  const initialRisk = risks[0];
  const finalRisk = risks[risks.length - 1];
  const averageRisk = risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
  const riskReduction = initialRisk - finalRisk;
  
  // Find turns where infrastructure risk was above critical threshold
  const criticalThreshold = 0.3; // 30% average infrastructure risk
  const criticalTurns = timelineData
    .filter(t => t.infraRisk > criticalThreshold)
    .map(t => t.turn);
  
  return {
    initialRisk,
    finalRisk,
    averageRisk,
    riskReduction,
    criticalTurns
  };
}