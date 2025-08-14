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
 * Safe worker creation utility
 */
export function safeNewWorker(url: URL): Worker | null {
  try { 
    return new Worker(url, { type: 'module' }); 
  } catch (e) { 
    console.error('Worker failed', e); 
    return null;
  }
}

/**
 * Creates a simulation worker with error handling
 */
export function createSimWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  return safeNewWorker(new URL('../../workers/sim.worker.ts', import.meta.url));
}

/**
 * Creates a performance worker with error handling
 */
export function createPerfWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  return safeNewWorker(new URL('../workers/performance.worker.ts', import.meta.url));
}

/**
 * Creates a heatmap worker with error handling
 */
export function createHeatmapWorker(): Worker | null {
  if (!hasWebWorkers) {
    console.warn('Web Workers not supported in this environment');
    return null;
  }

  return safeNewWorker(new URL('../workers/heatmap.worker.ts', import.meta.url));
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