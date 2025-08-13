'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  variant?: 'default' | 'accent' | 'warn' | 'ok';
  className?: string;
}

export function StatCard({
  title,
  value,
  unit,
  description,
  trend,
  trendValue,
  icon,
  variant = 'default',
  className
}: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'border-accent/40 bg-accent/5';
      case 'warn':
        return 'border-warn/40 bg-warn/5';
      case 'ok':
        return 'border-ok/40 bg-ok/5';
      default:
        return 'border-grid/40';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'accent':
        return 'text-accent';
      case 'warn':
        return 'text-warn';
      case 'ok':
        return 'text-ok';
      default:
        return 'text-ink';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return variant === 'warn' ? 'text-warn' : 'text-ok';
      case 'down':
        return variant === 'ok' ? 'text-warn' : 'text-muted';
      default:
        return 'text-muted';
    }
  };

  return (
    <Card className={cn(
      'p-3 transition-colors duration-fast hover:bg-panel2/50',
      getVariantStyles(),
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon && (
              <div className="text-muted">
                {icon}
              </div>
            )}
            <div className="text-xs font-medium text-muted uppercase tracking-wider truncate">
              {title}
            </div>
          </div>
          
          <div className="flex items-baseline gap-1 mb-1">
            <div className={cn(
              'text-xl font-mono font-bold tabular-nums',
              getValueColor()
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {unit && (
              <div className="text-sm text-muted font-mono">
                {unit}
              </div>
            )}
          </div>

          {description && (
            <div className="text-xs text-muted/80 leading-tight">
              {description}
            </div>
          )}
        </div>

        {trendValue && (
          <div className={cn(
            'text-xs font-mono tabular-nums',
            getTrendColor()
          )}>
            {trend === 'up' && '+'}
            {trend === 'down' && '-'}
            {trendValue}
          </div>
        )}
      </div>
    </Card>
  );
}