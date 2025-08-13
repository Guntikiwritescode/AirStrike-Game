'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface PerfStats {
  fps: number;
  frameTime: number;
  frameTimeP95: number;
  heapUsed: number;
  heapTotal: number;
  renderCount: number;
  workerTime: number;
  isRecording: boolean;
}

export interface PerfSample {
  timestamp: number;
  frameTime: number;
  heapUsed: number;
}

// Global RAF ticker to avoid multiple RAF loops
class RAFTicker {
  private static instance: RAFTicker;
  private callbacks = new Set<(timestamp: number) => void>();
  private rafId: number | null = null;
  private lastTimestamp = 0;

  static getInstance(): RAFTicker {
    if (!RAFTicker.instance) {
      RAFTicker.instance = new RAFTicker();
    }
    return RAFTicker.instance;
  }

  subscribe(callback: (timestamp: number) => void): () => void {
    this.callbacks.add(callback);
    
    if (this.callbacks.size === 1) {
      this.start();
    }

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stop();
      }
    };
  }

  private start(): void {
    const tick = (timestamp: number) => {
      this.lastTimestamp = timestamp;

      // Call all subscribers with coalesced timing
      this.callbacks.forEach(callback => {
        try {
          callback(timestamp);
        } catch (error) {
          console.warn('RAF callback error:', error);
        }
      });

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// Performance monitoring hook
export function usePerfStats(enabled: boolean = false): PerfStats {
  const [stats, setStats] = useState<PerfStats>({
    fps: 0,
    frameTime: 0,
    frameTimeP95: 0,
    heapUsed: 0,
    heapTotal: 0,
    renderCount: 0,
    workerTime: 0,
    isRecording: enabled
  });

  const samplesRef = useRef<PerfSample[]>([]);
  const frameCountRef = useRef(0);
  const renderCountRef = useRef(0);
  const workerTimeRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  // Throttled heap memory sampling (expensive operation)
  const sampleHeap = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      };
    }
    return { used: 0, total: 0 };
  }, []);

  // Calculate P95 frame time from samples
  const calculateP95 = useCallback((samples: PerfSample[]): number => {
    if (samples.length === 0) return 0;
    
    const frameTimes = samples.map(s => s.frameTime).sort((a, b) => a - b);
    const p95Index = Math.floor(frameTimes.length * 0.95);
    return frameTimes[p95Index] || 0;
  }, []);

  // RAF callback for performance monitoring
  const onFrame = useCallback((timestamp: number) => {
    if (!enabled) return;

    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    frameCountRef.current++;

    // Sample collection (limit to 1000 samples for P95 calculation)
    const sample: PerfSample = {
      timestamp,
      frameTime,
      heapUsed: 0 // Will be filled by throttled heap sampling
    };

    samplesRef.current.push(sample);
    if (samplesRef.current.length > 1000) {
      samplesRef.current.shift();
    }

    // Update stats every second
    if (timestamp - lastFpsUpdateRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (timestamp - lastFpsUpdateRef.current));
      const heap = sampleHeap();
      const frameTimeP95 = calculateP95(samplesRef.current);

      // Sample heap for recent samples
      const recentSamples = samplesRef.current.slice(-10);
      recentSamples.forEach(sample => {
        if (sample.heapUsed === 0) {
          sample.heapUsed = heap.used;
        }
      });

      setStats(prevStats => ({
        ...prevStats,
        fps,
        frameTime: frameTime,
        frameTimeP95,
        heapUsed: heap.used,
        heapTotal: heap.total,
        renderCount: renderCountRef.current,
        workerTime: workerTimeRef.current,
        isRecording: enabled
      }));

      frameCountRef.current = 0;
      lastFpsUpdateRef.current = timestamp;
    }
  }, [enabled, sampleHeap, calculateP95]);

  // Subscribe to RAF ticker
  useEffect(() => {
    if (!enabled) return;

    const ticker = RAFTicker.getInstance();
    const unsubscribe = ticker.subscribe(onFrame);

    return unsubscribe;
  }, [enabled, onFrame]);

  // Reset samples when enabled state changes
  useEffect(() => {
    if (!enabled) {
      samplesRef.current = [];
      frameCountRef.current = 0;
      renderCountRef.current = 0;
      workerTimeRef.current = 0;
      lastFpsUpdateRef.current = 0;
    }
  }, [enabled]);

  // Public API for updating stats from external sources
  const updateRenderCount = useCallback(() => {
    renderCountRef.current++;
  }, []);

  const updateWorkerTime = useCallback((time: number) => {
    workerTimeRef.current = time;
  }, []);

  return {
    ...stats,
    // Expose update methods for external components
    updateRenderCount,
    updateWorkerTime
  } as PerfStats & {
    updateRenderCount: () => void;
    updateWorkerTime: (time: number) => void;
  };
}

// Throttled event coalescing utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 16 // 16ms = 60fps
): T {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      // Call immediately if enough time has passed
      lastCallRef.current = now;
      callback(...args);
    } else {
      // Schedule call for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]) as T;
}

// Performance context for debugging
export interface PerfContext {
  markStart: (label: string) => void;
  markEnd: (label: string) => number;
  getMarks: () => Record<string, number>;
  clearMarks: () => void;
}

export function usePerfContext(): PerfContext {
  const marksRef = useRef<Record<string, number>>({});
  const timingsRef = useRef<Record<string, number>>({});

  const markStart = useCallback((label: string) => {
    marksRef.current[label] = performance.now();
  }, []);

  const markEnd = useCallback((label: string): number => {
    const startTime = marksRef.current[label];
    if (startTime === undefined) {
      console.warn(`No start mark found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    timingsRef.current[label] = duration;
    delete marksRef.current[label];
    
    return duration;
  }, []);

  const getMarks = useCallback(() => {
    return { ...timingsRef.current };
  }, []);

  const clearMarks = useCallback(() => {
    marksRef.current = {};
    timingsRef.current = {};
  }, []);

  return {
    markStart,
    markEnd,
    getMarks,
    clearMarks
  };
}