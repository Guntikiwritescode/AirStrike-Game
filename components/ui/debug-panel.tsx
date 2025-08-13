'use client';

import { useState, useEffect } from 'react';
import { usePerfStats } from '@/lib/hooks/usePerfStats';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Monitor, X, RotateCcw } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function DebugPanel({ isOpen, onClose, className }: DebugPanelProps) {
  const { stats, budgets, resetStats, getPerformanceGrade, isWithinBudget } = usePerfStats();
  const [dpr, setDpr] = useState<number>(1);

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  if (!isOpen) return null;

  const performanceGrade = getPerformanceGrade();
  const withinBudget = isWithinBudget();

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'text-ok';
      case 'good': return 'text-accent';
      case 'fair': return 'text-warn2';
      case 'poor': return 'text-warn';
      default: return 'text-muted';
    }
  };

  const getBudgetColor = (current: number, budget: number, inverse = false) => {
    const ratio = inverse ? budget / current : current / budget;
    if (ratio >= 0.95) return 'text-ok';
    if (ratio >= 0.85) return 'text-accent';
    if (ratio >= 0.7) return 'text-warn2';
    return 'text-warn';
  };

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 w-80 animate-slide-up',
      className
    )}>
      <Card className="p-4 border-accent/40 bg-panel/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-accent" />
            <div className="panel-header mb-0">Display Debug</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetStats}
              className="w-8 h-8 p-0"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Performance</span>
            <Badge
              variant={withinBudget ? "default" : "destructive"}
              className="text-xs"
            >
              {withinBudget ? 'WITHIN BUDGET' : 'OVER BUDGET'}
            </Badge>
          </div>
          <div className={cn('text-lg font-mono font-bold', getGradeColor(performanceGrade))}>
            {performanceGrade.toUpperCase()}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* FPS */}
          <div className="space-y-1">
            <div className="text-xs text-muted uppercase tracking-wider">FPS</div>
            <div className={cn(
              'text-xl font-mono font-bold tabular-nums',
              getBudgetColor(stats.fps, budgets.targetFPS)
            )}>
              {stats.fps}
            </div>
            <div className="text-xs text-muted">
              Target: {budgets.targetFPS}
            </div>
          </div>

          {/* Frame Time */}
          <div className="space-y-1">
            <div className="text-xs text-muted uppercase tracking-wider">Frame Time</div>
            <div className={cn(
              'text-xl font-mono font-bold tabular-nums',
              getBudgetColor(stats.avgFrameTime, budgets.maxFrameTime, true)
            )}>
              {stats.avgFrameTime}
              <span className="text-sm text-muted ml-1">ms</span>
            </div>
            <div className="text-xs text-muted">
              Budget: {budgets.maxFrameTime}ms
            </div>
          </div>

          {/* DPR */}
          <div className="space-y-1">
            <div className="text-xs text-muted uppercase tracking-wider">DPR</div>
            <div className="text-xl font-mono font-bold text-accent">
              {dpr}x
            </div>
            <div className="text-xs text-muted">
              Device Pixel Ratio
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-1">
            <div className="text-xs text-muted uppercase tracking-wider">Memory</div>
            {stats.memoryUsage !== undefined ? (
              <>
                <div className={cn(
                  'text-xl font-mono font-bold tabular-nums',
                  getBudgetColor(stats.memoryUsage, budgets.maxMemoryMB, true)
                )}>
                  {stats.memoryUsage}
                  <span className="text-sm text-muted ml-1">MB</span>
                </div>
                <div className="text-xs text-muted">
                  Budget: {budgets.maxMemoryMB}MB
                </div>
              </>
            ) : (
              <div className="text-sm text-muted">N/A</div>
            )}
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="divider" />
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted">Current Frame</span>
            <span className="stat">{stats.frameTime}ms</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted">Max Frame Time</span>
            <span className="stat">{stats.maxFrameTime}ms</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted">Frame Count</span>
            <span className="stat">{stats.frameCount}</span>
          </div>
          {stats.isDroppedFrames && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="destructive" className="text-xs">
                DROPPED FRAMES
              </Badge>
            </div>
          )}
        </div>

        {/* Performance Tips */}
        {!withinBudget && (
          <>
            <div className="divider" />
            <div className="text-xs text-muted space-y-1">
              <div className="font-medium text-warn">Performance Tips:</div>
              {stats.fps < budgets.targetFPS * 0.9 && (
                <div>• Reduce heatmap complexity</div>
              )}
              {stats.avgFrameTime > budgets.maxFrameTime * 1.1 && (
                <div>• Enable OffscreenCanvas workers</div>
              )}
              {stats.memoryUsage && stats.memoryUsage > budgets.maxMemoryMB && (
                <div>• Clear old cached data</div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}