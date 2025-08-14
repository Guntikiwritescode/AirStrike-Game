/// <reference lib="webworker" />

import { hasOffscreen } from './factory';

interface HeatmapRequest {
  id: string;
  type: 'heatmap';
  data: {
    values: number[][];
    width: number;
    height: number;
    colormap: 'posterior' | 'ev' | 'voi' | 'risk';
    cellSize: number;
  };
  canvas?: OffscreenCanvas;
}

interface HeatmapResponse {
  id: string;
  type: 'heatmap';
  success: boolean;
  canvas?: OffscreenCanvas;
  error?: string;
}

// Color maps for different heatmap types
const COLOR_MAPS = {
  posterior: {
    low: [11, 15, 20, 0],      // --bg with alpha 0
    mid: [85, 227, 255, 127],  // --accent with alpha 0.5
    high: [85, 227, 255, 255]  // --accent full opacity
  },
  ev: {
    low: [132, 247, 168, 0],   // --ok with alpha 0
    mid: [132, 247, 168, 127], // --ok with alpha 0.5
    high: [132, 247, 168, 255] // --ok full opacity
  },
  voi: {
    low: [32, 198, 247, 0],    // --accent-2 with alpha 0
    mid: [32, 198, 247, 127],  // --accent-2 with alpha 0.5
    high: [32, 198, 247, 255]  // --accent-2 full opacity
  },
  risk: {
    low: [255, 107, 107, 0],   // --warn with alpha 0
    mid: [255, 107, 107, 127], // --warn with alpha 0.5
    high: [255, 107, 107, 255] // --warn full opacity
  }
};

function interpolateColor(
  low: number[], 
  high: number[], 
  factor: number
): [number, number, number, number] {
  const result = low.slice() as [number, number, number, number];
  for (let i = 0; i < 4; i++) {
    result[i] = Math.round(result[i] + factor * (high[i] - low[i]));
  }
  return result;
}

function getHeatmapColor(value: number, colormap: keyof typeof COLOR_MAPS): [number, number, number, number] {
  const colors = COLOR_MAPS[colormap];
  
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  
  if (clampedValue <= 0.5) {
    // Interpolate between low and mid
    const factor = clampedValue * 2;
    return interpolateColor(colors.low, colors.mid, factor);
  } else {
    // Interpolate between mid and high
    const factor = (clampedValue - 0.5) * 2;
    return interpolateColor(colors.mid, colors.high, factor);
  }
}

function renderHeatmap(
  ctx: OffscreenCanvasRenderingContext2D,
  values: number[][],
  cellSize: number,
  colormap: keyof typeof COLOR_MAPS
): void {
  const imageData = ctx.createImageData(values[0].length * cellSize, values.length * cellSize);
  const data = imageData.data;
  
  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      const value = values[row][col];
      const [r, g, b, a] = getHeatmapColor(value, colormap);
      
      // Fill cell area
      for (let cy = 0; cy < cellSize; cy++) {
        for (let cx = 0; cx < cellSize; cx++) {
          const pixelX = col * cellSize + cx;
          const pixelY = row * cellSize + cy;
          const pixelIndex = (pixelY * imageData.width + pixelX) * 4;
          
          if (pixelIndex >= 0 && pixelIndex < data.length - 3) {
            data[pixelIndex] = r;     // Red
            data[pixelIndex + 1] = g; // Green
            data[pixelIndex + 2] = b; // Blue
            data[pixelIndex + 3] = a; // Alpha
          }
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Message handler
self.addEventListener('message', (event: MessageEvent<HeatmapRequest>) => {
  const { id, type, data, canvas } = event.data;
  
  try {
    if (type === 'heatmap' && canvas) {
      // Check OffscreenCanvas support before using
      if (!hasOffscreen) {
        throw new Error('OffscreenCanvas not supported in this environment');
      }
      
      // Setup canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas');
      }
      
      // Set canvas size
      canvas.width = data.width;
      canvas.height = data.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, data.width, data.height);
      
      // Render heatmap
      renderHeatmap(ctx, data.values, data.cellSize, data.colormap);
      
      // Send response with canvas
      const response: HeatmapResponse = {
        id,
        type: 'heatmap',
        success: true,
        canvas
      };
      
      self.postMessage(response, [canvas]);
    } else {
      throw new Error(`Unknown request type: ${type}`);
    }
  } catch (error) {
    const response: HeatmapResponse = {
      id,
      type: 'heatmap',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    self.postMessage(response);
  }
});

// Performance monitoring
let frameCount = 0;
let lastFrameTime = performance.now();

function trackPerformance() {
  frameCount++;
  const now = performance.now();
  
  if (now - lastFrameTime >= 1000) {
    // Log performance stats every second
    console.log(`[HeatmapWorker] Rendered ${frameCount} frames in ${now - lastFrameTime}ms`);
    frameCount = 0;
    lastFrameTime = now;
  }
}

// Export for TypeScript
export {};