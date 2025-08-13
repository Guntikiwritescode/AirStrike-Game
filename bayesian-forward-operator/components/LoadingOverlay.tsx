'use client';

import { useEffect, useState } from 'react';
import { Loader2, Activity, BarChart3, Brain, Cpu, CheckCircle, XCircle } from 'lucide-react';
import { LoadingState } from '@/lib/worker-manager';

export interface LoadingOverlayProps {
  loadingState: LoadingState;
  className?: string;
}

export default function LoadingOverlay({ loadingState, className = '' }: LoadingOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState(0);

  useEffect(() => {
    if (!loadingState.isLoading || !loadingState.startTime) {
      setElapsed(0);
      setEstimatedRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - loadingState.startTime!;
      setElapsed(elapsedMs);

      if (loadingState.expectedDuration && loadingState.progress > 0) {
        const estimatedTotal = elapsedMs / loadingState.progress;
        const remaining = Math.max(0, estimatedTotal - elapsedMs);
        setEstimatedRemaining(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loadingState.isLoading, loadingState.startTime, loadingState.progress, loadingState.expectedDuration]);

  if (!loadingState.isLoading) {
    return null;
  }

  const getOperationIcon = (operation: string) => {
    if (operation.includes('Risk') || operation.includes('Monte Carlo')) {
      return <BarChart3 className="w-5 h-5" />;
    }
    if (operation.includes('Policy')) {
      return <Brain className="w-5 h-5" />;
    }
    if (operation.includes('EV') || operation.includes('VOI')) {
      return <Activity className="w-5 h-5" />;
    }
    return <Cpu className="w-5 h-5" />;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 0.3) return 'bg-blue-500';
    if (progress < 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            {getOperationIcon(loadingState.operation)}
            <Loader2 className="w-3 h-3 absolute -top-1 -right-1 animate-spin text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {loadingState.operation}
            </h3>
            <p className="text-sm text-slate-400">
              Computing in background worker...
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(loadingState.progress * 100)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`${getProgressColor(loadingState.progress)} h-2 rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${loadingState.progress * 100}%` }}
            />
          </div>
        </div>

        {/* Current Stage */}
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-300 mb-1">
            Current Stage
          </div>
          <div className="text-sm text-slate-400 flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadingState.stage}</span>
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-slate-400 mb-1">Elapsed</div>
            <div className="text-white font-mono">
              {formatTime(elapsed)}
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-slate-400 mb-1">Remaining</div>
            <div className="text-white font-mono">
              {estimatedRemaining > 0 ? formatTime(estimatedRemaining) : '—'}
            </div>
          </div>
        </div>

        {/* Performance Hint */}
        {loadingState.operation.includes('256 samples') && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">
                High-fidelity analysis with 256 Monte Carlo samples
              </span>
            </div>
          </div>
        )}

        {/* Cancel/Info */}
        <div className="mt-4 text-xs text-slate-500 text-center">
          Computation is running in a Web Worker to keep the UI responsive
        </div>
      </div>
    </div>
  );
}

/**
 * Smaller inline loading indicator
 */
export interface InlineLoadingProps {
  isLoading: boolean;
  operation?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoading({ 
  isLoading, 
  operation = 'Computing...', 
  progress = 0,
  size = 'md' 
}: InlineLoadingProps) {
  if (!isLoading) return null;

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className="flex items-center space-x-2">
      <Loader2 className={`${iconSize} animate-spin text-blue-400`} />
      <span className={`${textSize} text-slate-400`}>
        {operation}
        {progress > 0 && (
          <span className="ml-1 text-slate-500">
            ({Math.round(progress * 100)}%)
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Progress bar component
 */
export interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function ProgressBar({ 
  progress, 
  label, 
  showPercentage = true, 
  size = 'md',
  color = 'blue' 
}: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className={`flex justify-between ${textSize} text-slate-400 mb-1`}>
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(progress * 100)}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full ${height}`}>
        <div 
          className={`${colorClasses[color]} ${height} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Performance metrics display
 */
export interface PerformanceDisplayProps {
  computationTime: number;
  samplesUsed?: number;
  cacheHit?: boolean;
  className?: string;
}

export function PerformanceDisplay({ 
  computationTime, 
  samplesUsed, 
  cacheHit, 
  className = '' 
}: PerformanceDisplayProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`flex items-center space-x-3 text-xs text-slate-500 ${className}`}>
      <div className="flex items-center space-x-1">
        <Cpu className="w-3 h-3" />
        <span>{formatTime(computationTime)}</span>
      </div>
      
      {samplesUsed && (
        <div className="flex items-center space-x-1">
          <BarChart3 className="w-3 h-3" />
          <span>{samplesUsed} samples</span>
        </div>
      )}
      
      {cacheHit !== undefined && (
        <div className="flex items-center space-x-1">
          {cacheHit ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <XCircle className="w-3 h-3 text-slate-500" />
          )}
          <span>{cacheHit ? 'cached' : 'computed'}</span>
        </div>
      )}
    </div>
  );
}