'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePerfStats, PerfStats } from '@/lib/hooks/usePerfStats';

interface DebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function DebugPanel({ isVisible, onToggle }: DebugPanelProps) {
  const perfStats = usePerfStats(isVisible) as PerfStats & {
    updateRenderCount: () => void;
    updateWorkerTime: (time: number) => void;
  };

  // Format bytes to human readable
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  // Performance grade based on frame time
  const getPerformanceGrade = useCallback((frameTimeP95: number): string => {
    if (frameTimeP95 < 10) return 'EXCELLENT';
    if (frameTimeP95 < 16.67) return 'GOOD';
    if (frameTimeP95 < 33.33) return 'FAIR';
    return 'POOR';
  }, []);

  // Grade color
  const getGradeColor = useCallback((grade: string): string => {
    switch (grade) {
      case 'EXCELLENT': return 'text-green-400';
      case 'GOOD': return 'text-green-300';
      case 'FAIR': return 'text-yellow-400';
      case 'POOR': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }, []);

  const grade = getPerformanceGrade(perfStats.frameTimeP95);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 z-[9999] bg-black/90 border border-gray-600 rounded-lg p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-cyan-400">PERFORMANCE DEBUG</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
          title="Close (Ctrl/Cmd+D)"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 min-w-[400px]">
        {/* Frame Performance */}
        <div className="space-y-2">
          <div className="text-cyan-300 font-semibold border-b border-gray-600 pb-1">
            FRAME METRICS
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">FPS:</span>
              <span className={perfStats.fps >= 58 ? 'text-green-400' : perfStats.fps >= 45 ? 'text-yellow-400' : 'text-red-400'}>
                {perfStats.fps.toFixed(1)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Frame Time:</span>
              <span className="text-blue-300">
                {perfStats.frameTime.toFixed(2)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Frame P95:</span>
              <span className={perfStats.frameTimeP95 < 10 ? 'text-green-400' : perfStats.frameTimeP95 < 16.67 ? 'text-yellow-400' : 'text-red-400'}>
                {perfStats.frameTimeP95.toFixed(2)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Grade:</span>
              <span className={getGradeColor(grade)}>
                {grade}
              </span>
            </div>
          </div>
        </div>

        {/* Memory & Workers */}
        <div className="space-y-2">
          <div className="text-purple-300 font-semibold border-b border-gray-600 pb-1">
            MEMORY & WORKERS
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Heap Used:</span>
              <span className="text-orange-300">
                {formatBytes(perfStats.heapUsed)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Heap Total:</span>
              <span className="text-orange-200">
                {formatBytes(perfStats.heapTotal)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Worker Time:</span>
              <span className="text-indigo-300">
                {perfStats.workerTime.toFixed(2)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Renders:</span>
              <span className="text-pink-300">
                {perfStats.renderCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${perfStats.fps >= 58 ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-400">60 FPS Target</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${perfStats.frameTimeP95 < 10 ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-400">&lt;10ms P95</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-3 pt-2 border-t border-gray-600 text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Ctrl/Cmd+D</kbd> to toggle
      </div>
    </div>
  );
}

// Global keyboard handler hook for debug panel
export function useDebugPanelToggle(): [boolean, () => void] {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+D or Cmd+D
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return [isVisible, toggle];
}