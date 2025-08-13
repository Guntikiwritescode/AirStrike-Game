'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType, HeatmapType } from '@/lib/types';

interface GameCanvasProps {
  selectedSensor: SensorType;
  onSensorChange: (sensor: SensorType) => void;
  onCellHighlight?: (x: number, y: number, type: 'primary' | 'alternative') => void;
  onClearHighlight?: () => void;
}

export default function GameCanvas({ 
  selectedSensor, 
  onSensorChange, 
  onCellHighlight, 
  onClearHighlight 
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<HeatmapType>('posterior');
  const [highlightedCells, setHighlightedCells] = useState<Map<string, 'primary' | 'alternative'>>(new Map());

  // Expose highlight functions to parent
  const handleCellHighlight = (x: number, y: number, type: 'primary' | 'alternative') => {
    setHighlightedCells(prev => {
      const newMap = new Map(prev);
      newMap.set(`${x},${y}`, type);
      return newMap;
    });
    onCellHighlight?.(x, y, type);
  };

  const handleClearHighlight = () => {
    setHighlightedCells(new Map());
    onClearHighlight?.();
  };

  // Expose these functions to parent via refs or callbacks
  useEffect(() => {
    if (onCellHighlight || onClearHighlight) {
      // Replace the passed functions with our internal ones
      Object.assign(window, { 
        gameCellHighlight: handleCellHighlight,
        gameClearHighlight: handleClearHighlight 
      });
    }
  }, [onCellHighlight, onClearHighlight]);
  
  const {
    grid,
    config,
    gameStarted,
    performRecon,
    performStrike,
    toggleTruthOverlay,
    getEVHeatmap,
    getVOIHeatmap,
    validateStrikeAction,
    getRiskAverseHeatmap,
    getVarianceHeatmap,
    getLossRiskHeatmap,
  } = useGameStore();

  const CELL_SIZE = 30;
  const GRID_PADDING = 20;

  const getCellPosition = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - GRID_PADDING;
    const y = clientY - rect.top - GRID_PADDING;

    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);

    if (cellX >= 0 && cellX < config.gridSize && cellY >= 0 && cellY < config.gridSize) {
      return { x: cellX, y: cellY };
    }
    return null;
  }, [config.gridSize]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!gameStarted) return;
    
    const pos = getCellPosition(event.clientX, event.clientY);
    if (pos) {
      performRecon(pos.x, pos.y, selectedSensor);
    }
  }, [gameStarted, getCellPosition, performRecon, selectedSensor]);

  const handleCanvasRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (!gameStarted) return;
    
    const pos = getCellPosition(event.clientX, event.clientY);
    if (pos) {
      const validation = validateStrikeAction(pos.x, pos.y, 1);
      
      if (validation.requiresConfirmation) {
        const confirmed = window.confirm(`Strike Warning: ${validation.reason}\n\nProceed anyway?`);
        if (confirmed) {
          performStrike(pos.x, pos.y, 1, true); // Force execute
        }
      } else if (validation.allowed) {
        performStrike(pos.x, pos.y, 1, false);
      } else {
        alert(`Strike Blocked: ${validation.reason}`);
      }
    }
  }, [gameStarted, getCellPosition, performStrike, validateStrikeAction]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    const pos = getCellPosition(event.clientX, event.clientY);
    setHoveredCell(pos);
  }, [getCellPosition]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const canvasSize = config.gridSize * CELL_SIZE + GRID_PADDING * 2;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Draw grid
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 1;

    for (let i = 0; i <= config.gridSize; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(GRID_PADDING + i * CELL_SIZE, GRID_PADDING);
      ctx.lineTo(GRID_PADDING + i * CELL_SIZE, GRID_PADDING + config.gridSize * CELL_SIZE);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(GRID_PADDING, GRID_PADDING + i * CELL_SIZE);
      ctx.lineTo(GRID_PADDING + config.gridSize * CELL_SIZE, GRID_PADDING + i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw cells with different view modes
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const cellX = GRID_PADDING + x * CELL_SIZE;
        const cellY = GRID_PADDING + y * CELL_SIZE;

        // Determine what to display based on view mode
        let intensity: number;
        let showText = false;
        let textValue = '';
        let useSpecialColorScheme = false;
        
        switch (viewMode) {
          case 'posterior':
            intensity = cell.posteriorProbability;
            showText = intensity > 0.7 || intensity < 0.3;
            textValue = (intensity * 100).toFixed(0) + '%';
            break;
            
          case 'truth':
            if (config.showTruthOverlay) {
              intensity = cell.hasHostile ? 1 : 0;
              showText = true;
              textValue = cell.hasHostile ? 'H' : '';
            } else {
              intensity = cell.posteriorProbability;
              showText = intensity > 0.7 || intensity < 0.3;
              textValue = (intensity * 100).toFixed(0) + '%';
            }
            break;
            
          case 'priorField':
            intensity = cell.hostilePriorProbability;
            showText = true;
            textValue = (intensity * 100).toFixed(0) + '%';
            break;
            
          case 'expectedValue':
            // Get EV heatmap and normalize
            const evHeatmap = getEVHeatmap(1);
            const evValue = evHeatmap[y][x];
            const maxEV = Math.max(...evHeatmap.flat());
            const minEV = Math.min(...evHeatmap.flat());
            
            if (maxEV > minEV) {
              intensity = Math.max(0, (evValue - minEV) / (maxEV - minEV));
            } else {
              intensity = 0;
            }
            
            showText = evValue > 0;
            textValue = evValue > 0 ? `+${evValue.toFixed(0)}` : evValue < -10 ? evValue.toFixed(0) : '';
            useSpecialColorScheme = true;
            break;
            
          case 'valueOfInformation':
            // Get VOI heatmap and normalize
            const voiHeatmap = getVOIHeatmap(selectedSensor, 1);
            const voiValue = voiHeatmap[y][x];
            const maxVOI = Math.max(...voiHeatmap.flat());
            
            if (maxVOI > 0) {
              intensity = voiValue / maxVOI;
            } else {
              intensity = 0;
            }
            
            showText = voiValue > 0;
            textValue = voiValue > 0 ? `+${voiValue.toFixed(0)}` : '';
            useSpecialColorScheme = true;
            break;
            
          case 'riskAverse':
            // Get risk-averse utility heatmap and normalize
            const riskHeatmap = getRiskAverseHeatmap(1, 0.5);
            const riskValue = riskHeatmap[y][x];
            const maxRisk = Math.max(...riskHeatmap.flat());
            const minRisk = Math.min(...riskHeatmap.flat());
            
            if (maxRisk > minRisk) {
              intensity = Math.max(0, (riskValue - minRisk) / (maxRisk - minRisk));
            } else {
              intensity = 0;
            }
            
            showText = riskValue > 0;
            textValue = riskValue > 0 ? `+${riskValue.toFixed(0)}` : riskValue < -10 ? riskValue.toFixed(0) : '';
            useSpecialColorScheme = true;
            break;
            
          case 'variance':
            // Get variance heatmap and normalize
            const varianceHeatmap = getVarianceHeatmap(1);
            const varianceValue = varianceHeatmap[y][x];
            const maxVariance = Math.max(...varianceHeatmap.flat());
            
            if (maxVariance > 0) {
              intensity = varianceValue / maxVariance;
            } else {
              intensity = 0;
            }
            
            showText = varianceValue > 20;
            textValue = varianceValue > 20 ? `σ${varianceValue.toFixed(0)}` : '';
            useSpecialColorScheme = true;
            break;
            
          case 'lossRisk':
            // Get loss risk heatmap
            const lossHeatmap = getLossRiskHeatmap(1);
            const lossValue = lossHeatmap[y][x];
            intensity = lossValue; // Already a probability 0-1
            
            showText = lossValue > 0.3;
            textValue = lossValue > 0.3 ? `${(lossValue * 100).toFixed(0)}%` : '';
            useSpecialColorScheme = true;
            break;
            
          default:
            intensity = cell.posteriorProbability;
            break;
        }

        // Background color based on intensity and view mode
        let red: number, green: number, blue: number;
        
        if (useSpecialColorScheme) {
          if (viewMode === 'expectedValue' || viewMode === 'riskAverse') {
            // EV/Risk-averse: Green for positive, red for negative, intensity determines brightness
            green = Math.floor(255 * intensity);
            red = Math.floor(128 * (1 - intensity));
            blue = 50;
          } else if (viewMode === 'valueOfInformation') {
            // VOI: Purple/blue gradient for information value
            red = Math.floor(128 + 127 * intensity);
            green = Math.floor(64 + 64 * intensity);
            blue = Math.floor(200 + 55 * intensity);
          } else if (viewMode === 'variance') {
            // Variance: Orange gradient for uncertainty
            red = Math.floor(255 * intensity);
            green = Math.floor(165 * intensity);
            blue = Math.floor(64 * intensity);
          } else if (viewMode === 'lossRisk') {
            // Loss risk: Red gradient for danger
            red = Math.floor(255 * intensity);
            green = Math.floor(100 * (1 - intensity));
            blue = Math.floor(100 * (1 - intensity));
          } else {
            red = Math.floor(255 * intensity);
            green = Math.floor(255 * (1 - intensity));
            blue = 100;
          }
        } else {
          red = Math.floor(255 * intensity);
          green = Math.floor(255 * (1 - intensity));
          blue = viewMode === 'truth' && config.showTruthOverlay ? 200 : 100;
        }
        
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.6)`;
        ctx.fillRect(cellX + 1, cellY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        // Draw infrastructure markers (always show in truth mode if enabled)
        if (cell.hasInfrastructure && (viewMode !== 'truth' || config.showTruthOverlay)) {
          ctx.fillStyle = '#3b82f6'; // blue-500
          ctx.fillRect(cellX + CELL_SIZE - 8, cellY + 2, 6, 6);
        }

        // Draw recon history markers (except in truth mode)
        if (cell.reconHistory.length > 0 && viewMode !== 'truth') {
          ctx.fillStyle = '#fbbf24'; // amber-400
          ctx.fillRect(cellX + 2, cellY + 2, 6, 6);
        }

        // Policy recommendation highlights
        const cellKey = `${x},${y}`;
        const highlightType = highlightedCells.get(cellKey);
        if (highlightType) {
          if (highlightType === 'primary') {
            ctx.strokeStyle = '#10b981'; // Green for primary recommendation
            ctx.lineWidth = 4;
          } else {
            ctx.strokeStyle = '#f59e0b'; // Orange for alternatives
            ctx.lineWidth = 2;
          }
          ctx.strokeRect(cellX + 1, cellY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
        
        // Highlight hovered cell (on top of policy highlights)
        if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
        }

        // Show text values
        if (showText && textValue) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            textValue,
            cellX + CELL_SIZE / 2,
            cellY + CELL_SIZE / 2 + 3
          );
        }
      });
    });
  }, [grid, config.gridSize, config.showTruthOverlay, hoveredCell, viewMode, selectedSensor, getEVHeatmap, getVOIHeatmap, getRiskAverseHeatmap, getVarianceHeatmap, getLossRiskHeatmap]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Sensor Selection */}
      <div className="flex space-x-2">
        <label className="text-sm font-medium">Sensor:</label>
        {(['drone', 'sigint', 'ground'] as SensorType[]).map((sensor) => (
          <button
            key={sensor}
            onClick={() => onSensorChange(sensor)}
            className={`px-3 py-1 text-sm rounded ${
              selectedSensor === sensor
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {sensor.charAt(0).toUpperCase() + sensor.slice(1)}
          </button>
        ))}
      </div>

      {/* View Mode Selection */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm font-medium">View:</label>
        {(['posterior', 'priorField', 'expectedValue', 'valueOfInformation', 'riskAverse', 'variance', 'lossRisk', 'truth'] as HeatmapType[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === mode
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {mode === 'posterior' ? 'Beliefs' : 
             mode === 'priorField' ? 'Priors' : 
             mode === 'expectedValue' ? 'EV' :
             mode === 'valueOfInformation' ? 'VOI' : 
             mode === 'riskAverse' ? 'Risk' :
             mode === 'variance' ? 'Variance' :
             mode === 'lossRisk' ? 'Loss Risk' : 'Truth'}
          </button>
        ))}
        
        {/* Developer truth overlay toggle */}
        {viewMode === 'truth' && (
          <button
            onClick={toggleTruthOverlay}
            className={`px-3 py-1 text-sm rounded border ${
              config.showTruthOverlay
                ? 'bg-red-600 text-white border-red-400'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {config.showTruthOverlay ? 'Hide Truth' : 'Show Truth'}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {viewMode === 'expectedValue' ? (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500"></div>
              <span>High Expected Value</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-400"></div>
              <span>Low/Negative EV</span>
            </div>
            <div className="text-xs">Right-click to strike (with confirmation)</div>
          </>
        ) : viewMode === 'valueOfInformation' ? (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-400"></div>
              <span>High Information Value</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-600"></div>
              <span>Low/No Information Value</span>
            </div>
            <div className="text-xs">Left-click to recon high-VOI areas</div>
          </>
        ) : viewMode === 'riskAverse' ? (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500"></div>
              <span>High Risk-Adjusted Utility</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-400"></div>
              <span>Low/Negative Utility (CVaR penalty)</span>
            </div>
            <div className="text-xs">Risk aversion λ=0.5 with 95% CVaR</div>
          </>
        ) : viewMode === 'variance' ? (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500"></div>
              <span>High Uncertainty</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-600"></div>
              <span>Low Uncertainty</span>
            </div>
            <div className="text-xs">Standard deviation of strike outcomes</div>
          </>
        ) : viewMode === 'lossRisk' ? (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-600"></div>
              <span>High Loss Probability</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-600"></div>
              <span>Low Loss Probability</span>
            </div>
            <div className="text-xs">Probability of negative outcomes</div>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 opacity-60"></div>
              <span>
                {viewMode === 'truth' && config.showTruthOverlay ? 'Has Hostile' :
                 viewMode === 'priorField' ? 'High Prior θ(x,y)' : 'High Probability'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 opacity-60"></div>
              <span>
                {viewMode === 'truth' && config.showTruthOverlay ? 'No Hostile' :
                 viewMode === 'priorField' ? 'Low Prior θ(x,y)' : 'Low Probability'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500"></div>
              <span>Infrastructure</span>
            </div>
            {viewMode !== 'truth' && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-400"></div>
                <span>Reconned</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="border border-slate-600 cursor-crosshair"
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasRightClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
        />
      </div>

      {/* Cell Info */}
      {hoveredCell && (
        <div className="text-sm text-slate-300 text-center">
          <div>Cell ({hoveredCell.x}, {hoveredCell.y})</div>
          <div className="flex justify-center space-x-4 mt-1">
            {viewMode === 'posterior' && (
              <span>Belief: {(grid[hoveredCell.y][hoveredCell.x].posteriorProbability * 100).toFixed(1)}%</span>
            )}
                         {viewMode === 'priorField' && (
               <span>Prior θ: {(grid[hoveredCell.y][hoveredCell.x].hostilePriorProbability * 100).toFixed(1)}%</span>
             )}
             {viewMode === 'expectedValue' && (
               <span>EV: {getEVHeatmap(1)[hoveredCell.y][hoveredCell.x].toFixed(0)} points</span>
             )}
             {viewMode === 'valueOfInformation' && (
               <span>VOI: +{getVOIHeatmap(selectedSensor, 1)[hoveredCell.y][hoveredCell.x].toFixed(0)} points</span>
             )}
             {viewMode === 'riskAverse' && (
               <span>Risk Utility: {getRiskAverseHeatmap(1, 0.5)[hoveredCell.y][hoveredCell.x].toFixed(0)} points</span>
             )}
             {viewMode === 'variance' && (
               <span>Std Dev: {getVarianceHeatmap(1)[hoveredCell.y][hoveredCell.x].toFixed(0)} points</span>
             )}
             {viewMode === 'lossRisk' && (
               <span>Loss Risk: {(getLossRiskHeatmap(1)[hoveredCell.y][hoveredCell.x] * 100).toFixed(0)}%</span>
             )}
             {viewMode === 'truth' && config.showTruthOverlay && (
               <>
                 <span>Truth: {grid[hoveredCell.y][hoveredCell.x].hasHostile ? 'Hostile' : 'Clear'}</span>
                 <span>Infra: {grid[hoveredCell.y][hoveredCell.x].hasInfrastructure ? 'Yes' : 'No'}</span>
               </>
             )}
            {grid[hoveredCell.y][hoveredCell.x].reconHistory.length > 0 && viewMode !== 'truth' && (
              <span>Recons: {grid[hoveredCell.y][hoveredCell.x].reconHistory.length}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}