'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface PerfStats {
  fps: number;
  frameTime: number;
  avgFrameTime: number;
  maxFrameTime: number;
  frameCount: number;
  memoryUsage?: number;
  isDroppedFrames: boolean;
}

interface PerfBudgets {
  targetFPS: number;
  maxFrameTime: number;
  maxMemoryMB: number;
}

const DEFAULT_BUDGETS: PerfBudgets = {
  targetFPS: 60,
  maxFrameTime: 16.67, // 60fps = 16.67ms per frame
  maxMemoryMB: 100
};

export function usePerfStats(budgets: Partial<PerfBudgets> = {}) {
  const [stats, setStats] = useState<PerfStats>({
    fps: 0,
    frameTime: 0,
    avgFrameTime: 0,
    maxFrameTime: 0,
    frameCount: 0,
    isDroppedFrames: false
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const finalBudgets = useMemo(() => ({ ...DEFAULT_BUDGETS, ...budgets }), [budgets]);

  const measureFrame = useCallback((currentTime: number) => {
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = currentTime;
      startTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(measureFrame);
      return;
    }

    const deltaTime = currentTime - lastFrameTimeRef.current;
    lastFrameTimeRef.current = currentTime;

    // Track frame times for averaging
    frameTimesRef.current.push(deltaTime);
    if (frameTimesRef.current.length > 60) { // Keep last 60 frames
      frameTimesRef.current.shift();
    }

    const frameCount = frameTimesRef.current.length;
    const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameCount;
    const maxFrameTime = Math.max(...frameTimesRef.current);
    const fps = 1000 / avgFrameTime;

    // Check for dropped frames (frame time > budget)
    const isDroppedFrames = deltaTime > finalBudgets.maxFrameTime * 1.5;

    // Get memory usage if available
    let memoryUsage: number | undefined;
    const perfWithMemory = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (perfWithMemory.memory) {
      memoryUsage = perfWithMemory.memory.usedJSHeapSize / (1024 * 1024);
    }

    setStats({
      fps: Math.round(fps * 10) / 10,
      frameTime: Math.round(deltaTime * 100) / 100,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      frameCount,
      memoryUsage: memoryUsage ? Math.round(memoryUsage * 10) / 10 : undefined,
      isDroppedFrames
    });

    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(measureFrame);
    }
  }, [isMonitoring, finalBudgets.maxFrameTime]);

  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      setIsMonitoring(true);
      frameTimesRef.current = [];
      lastFrameTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(measureFrame);
    }
  }, [isMonitoring, measureFrame]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const resetStats = useCallback(() => {
    frameTimesRef.current = [];
    lastFrameTimeRef.current = 0;
    startTimeRef.current = 0;
    setStats({
      fps: 0,
      frameTime: 0,
      avgFrameTime: 0,
      maxFrameTime: 0,
      frameCount: 0,
      isDroppedFrames: false
    });
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  // Performance assessments
  const getPerformanceGrade = useCallback(() => {
    if (stats.fps >= finalBudgets.targetFPS * 0.95) return 'excellent';
    if (stats.fps >= finalBudgets.targetFPS * 0.85) return 'good';
    if (stats.fps >= finalBudgets.targetFPS * 0.7) return 'fair';
    return 'poor';
  }, [stats.fps, finalBudgets.targetFPS]);

  const isWithinBudget = useCallback(() => {
    return (
      stats.fps >= finalBudgets.targetFPS * 0.9 &&
      stats.avgFrameTime <= finalBudgets.maxFrameTime * 1.1 &&
      (stats.memoryUsage === undefined || stats.memoryUsage <= finalBudgets.maxMemoryMB)
    );
  }, [stats, finalBudgets]);

  return {
    stats,
    budgets: finalBudgets,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetStats,
    getPerformanceGrade,
    isWithinBudget
  };
}