/**
 * Bulletproof worker factory for Next.js/Vercel deployment
 * Standardizes worker creation and provides feature detection
 */

// Feature detection for OffscreenCanvas
export const hasOffscreen = typeof window !== 'undefined' && 
  typeof (HTMLCanvasElement as unknown as { prototype: { transferControlToOffscreen?: () => void } })?.prototype?.transferControlToOffscreen === 'function';

// Feature detection for Web Workers
export const hasWebWorkers = typeof Worker !== 'undefined';

/**
 * Creates a simulation worker with error handling
 */
export function createSimWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  try {
    return new Worker(
      new URL('../../workers/sim.worker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch (error) {
    console.error('Failed to create simulation worker:', error);
    return null;
  }
}

/**
 * Creates a performance worker with error handling
 */
export function createPerfWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  try {
    return new Worker(
      new URL('../workers/performance.worker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch (error) {
    console.error('Failed to create performance worker:', error);
    return null;
  }
}

/**
 * Creates a heatmap worker with error handling
 */
export function createHeatmapWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  try {
    return new Worker(
      new URL('../workers/heatmap.worker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch (error) {
    console.error('Failed to create heatmap worker:', error);
    return null;
  }
}

/**
 * Environment capability summary
 */
export function getWorkerCapabilities() {
  return {
    hasWebWorkers,
    hasOffscreen,
    canUseWorkers: hasWebWorkers,
    canUseOffscreenCanvas: hasOffscreen,
    environment: typeof window !== 'undefined' ? 'browser' : 'server',
  };
}

/**
 * Log worker capabilities for debugging
 */
export function logWorkerCapabilities() {
  const caps = getWorkerCapabilities();
  console.log('🔧 Worker Capabilities:', caps);
  
  if (!caps.hasWebWorkers) {
    console.warn('⚠️ Web Workers not available - will fall back to main thread');
  }
  
  if (!caps.hasOffscreen) {
    console.warn('⚠️ OffscreenCanvas not available - canvas operations will be limited');
  }
}