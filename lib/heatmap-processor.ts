import { scaleLinear } from 'd3-scale';
import { GameCell, HeatmapType } from './types';
import { COLOR_SCHEMES } from '@/components/ui/HeatmapLegend';

export interface HeatmapDataPoint {
  position: [number, number]; // [lng, lat] for deck.gl
  value: number;
  normalizedValue: number;
  color: [number, number, number, number]; // RGBA
  cell: GameCell;
}

export interface HeatmapBounds {
  minValue: number;
  maxValue: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ProcessedHeatmapData {
  dataPoints: HeatmapDataPoint[];
  bounds: HeatmapBounds;
  colorScheme: keyof typeof COLOR_SCHEMES;
  gridSize: number;
}

// Convert hex color to RGBA array
function hexToRgba(hex: string, alpha: number = 255): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}

// Get color interpolation function for a scheme
function getColorInterpolator(colorScheme: keyof typeof COLOR_SCHEMES) {
  const scheme = COLOR_SCHEMES[colorScheme];
  const scale = scaleLinear<string>()
    .domain(scheme.colors.map((_, i) => i / (scheme.colors.length - 1)))
    .range(scheme.colors);
  
  return (t: number) => scale(Math.max(0, Math.min(1, t)));
}

// Extract value from cell based on heatmap type
function extractCellValue(cell: GameCell, heatmapType: HeatmapType): number {
  switch (heatmapType) {
    case 'posterior':
      return cell.posteriorProbability;
    case 'expectedValue':
      return cell.posteriorProbability; // Use posterior as proxy for EV
    case 'variance':
      return Math.abs(cell.posteriorProbability - 0.5); // Uncertainty as proxy for variance
    case 'riskAverse':
      return cell.posteriorProbability * 1.2; // Risk-weighted posterior
    case 'truth':
      return cell.hasHostile ? 1 : 0;
    default:
      return cell.posteriorProbability;
  }
}

// Map heatmap type to color scheme
function getColorSchemeForHeatmapType(heatmapType: HeatmapType): keyof typeof COLOR_SCHEMES {
  switch (heatmapType) {
    case 'posterior':
      return 'posterior';
    case 'expectedValue':
      return 'value';
    case 'variance':
      return 'variance';
    case 'riskAverse':
      return 'risk';
    case 'truth':
      return 'posterior'; // Use posterior colors for truth
    default:
      return 'posterior';
  }
}

// Convert grid coordinates to geographic bounds
function gridToGeoBounds(
  gridSize: number,
  mapBounds: { north: number; south: number; east: number; west: number }
): { cellWidth: number; cellHeight: number } {
  const cellWidth = (mapBounds.east - mapBounds.west) / gridSize;
  const cellHeight = (mapBounds.north - mapBounds.south) / gridSize;
  return { cellWidth, cellHeight };
}

// Main heatmap processing function
export function processHeatmapData(
  grid: GameCell[][],
  heatmapType: HeatmapType,
  mapBounds: { north: number; south: number; east: number; west: number },
  options: {
    fadeOpacity?: number;
    minOpacity?: number;
    maxOpacity?: number;
  } = {}
): ProcessedHeatmapData {
  const { fadeOpacity = 0.8, minOpacity = 0.1, maxOpacity = 0.9 } = options;
  
  const gridSize = grid.length;
  const { cellWidth, cellHeight } = gridToGeoBounds(gridSize, mapBounds);
  const colorScheme = getColorSchemeForHeatmapType(heatmapType);
  const colorInterpolator = getColorInterpolator(colorScheme);
  
  // First pass: extract all values and find min/max
  const values: number[] = [];
  const cellData: { cell: GameCell; x: number; y: number; value: number }[] = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = grid[y][x];
      const value = extractCellValue(cell, heatmapType);
      values.push(value);
      cellData.push({ cell, x, y, value });
    }
  }
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1; // Avoid division by zero
  
  // Second pass: create data points with normalized values and colors
  const dataPoints: HeatmapDataPoint[] = cellData.map(({ cell, x, y, value }) => {
    // Normalize value to 0-1 range
    const normalizedValue = (value - minValue) / valueRange;
    
    // Get color from interpolation
    const hexColor = colorInterpolator(normalizedValue);
    
    // Calculate opacity based on value (higher values more opaque)
    const alpha = Math.round((minOpacity + (maxOpacity - minOpacity) * normalizedValue) * fadeOpacity * 255);
    const color = hexToRgba(hexColor, alpha);
    
    // Convert grid position to geographic coordinates (center of cell)
    const lng = mapBounds.west + (x + 0.5) * cellWidth;
    const lat = mapBounds.south + (y + 0.5) * cellHeight;
    
    return {
      position: [lng, lat] as [number, number],
      value,
      normalizedValue,
      color,
      cell
    };
  });
  
  // Create bounds object
  const bounds: HeatmapBounds = {
    minValue,
    maxValue,
    north: mapBounds.north,
    south: mapBounds.south,
    east: mapBounds.east,
    west: mapBounds.west
  };
  
  return {
    dataPoints,
    bounds,
    colorScheme,
    gridSize
  };
}

// Generate heatmap tiles for BitmapLayer (for larger datasets)
export function generateHeatmapTiles(
  processedData: ProcessedHeatmapData,
  tileSize: number = 512
): {
  imageData: ImageData;
  bounds: [number, number, number, number]; // [west, south, east, north]
} {
  const { dataPoints, bounds, gridSize } = processedData;
  
  // Create canvas for tile generation
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  
  // Clear canvas
  ctx.clearRect(0, 0, tileSize, tileSize);
  
  // Calculate scale factors
  const scaleX = tileSize / gridSize;
  const scaleY = tileSize / gridSize;
  
  // Draw each data point as a rectangle
  dataPoints.forEach((point) => {
    const { color, position } = point;
    
    // Convert geographic position back to grid position
    const gridX = Math.floor(((position[0] - bounds.west) / (bounds.east - bounds.west)) * gridSize);
    const gridY = Math.floor(((bounds.north - position[1]) / (bounds.north - bounds.south)) * gridSize);
    
    // Convert to tile coordinates
    const tileX = gridX * scaleX;
    const tileY = gridY * scaleY;
    
    // Set fill style
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
    ctx.fillRect(tileX, tileY, scaleX, scaleY);
  });
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  
  return {
    imageData,
    bounds: [bounds.west, bounds.south, bounds.east, bounds.north]
  };
}

// Smooth transition utilities
export class HeatmapTransitionManager {
  private transitions = new Map<string, {
    fromData: ProcessedHeatmapData | null;
    toData: ProcessedHeatmapData;
    startTime: number;
    duration: number;
  }>();

  startTransition(
    key: string,
    fromData: ProcessedHeatmapData | null,
    toData: ProcessedHeatmapData,
    duration: number = 180 // 180ms as specified
  ) {
    this.transitions.set(key, {
      fromData,
      toData,
      startTime: performance.now(),
      duration
    });
  }

  getTransitionData(key: string): ProcessedHeatmapData | null {
    const transition = this.transitions.get(key);
    if (!transition) return null;

    const elapsed = performance.now() - transition.startTime;
    const progress = Math.min(elapsed / transition.duration, 1);

    // If transition is complete, clean up
    if (progress >= 1) {
      this.transitions.delete(key);
      return transition.toData;
    }

    // If no from data, just fade in the new data
    if (!transition.fromData) {
      return {
        ...transition.toData,
        dataPoints: transition.toData.dataPoints.map(point => ({
          ...point,
          color: [
            point.color[0],
            point.color[1],
            point.color[2],
            Math.round(point.color[3] * progress)
          ] as [number, number, number, number]
        }))
      };
    }

    // Interpolate between from and to data
    // For simplicity, we'll just crossfade opacity
    const fadeOutOpacity = 1 - progress;
    const fadeInOpacity = progress;

    return {
      ...transition.toData,
      dataPoints: transition.toData.dataPoints.map((toPoint, i) => {
        const fromPoint = transition.fromData!.dataPoints[i];
        
        return {
          ...toPoint,
          color: [
            Math.round(fromPoint.color[0] * fadeOutOpacity + toPoint.color[0] * fadeInOpacity),
            Math.round(fromPoint.color[1] * fadeOutOpacity + toPoint.color[1] * fadeInOpacity),
            Math.round(fromPoint.color[2] * fadeOutOpacity + toPoint.color[2] * fadeInOpacity),
            Math.round(fromPoint.color[3] * fadeOutOpacity + toPoint.color[3] * fadeInOpacity)
          ] as [number, number, number, number]
        };
      })
    };
  }

  isTransitioning(key: string): boolean {
    return this.transitions.has(key);
  }

  clearTransition(key: string) {
    this.transitions.delete(key);
  }

  clearAllTransitions() {
    this.transitions.clear();
  }
}

// Export singleton transition manager
export const heatmapTransitionManager = new HeatmapTransitionManager();