'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType, HeatmapType } from '@/lib/types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('drone');
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<HeatmapType>('posterior');
  
  const {
    grid,
    config,
    gameStarted,
    performRecon,
    performStrike,
    toggleTruthOverlay,
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
      performStrike(pos.x, pos.y, 1); // radius 1 for now
    }
  }, [gameStarted, getCellPosition, performStrike]);

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
            
          default:
            intensity = cell.posteriorProbability;
            break;
        }

        // Background color based on intensity
        const red = Math.floor(255 * intensity);
        const green = Math.floor(255 * (1 - intensity));
        const blue = viewMode === 'truth' && config.showTruthOverlay ? 200 : 100;
        
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

        // Highlight hovered cell
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
  }, [grid, config.gridSize, config.showTruthOverlay, hoveredCell, viewMode]);

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
            onClick={() => setSelectedSensor(sensor)}
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
      <div className="flex space-x-2 items-center">
        <label className="text-sm font-medium">View:</label>
        {(['posterior', 'priorField', 'truth'] as HeatmapType[]).map((mode) => (
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
             mode === 'priorField' ? 'Priors' : 'Truth'}
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