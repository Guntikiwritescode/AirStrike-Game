'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info, Calculator, Target, TrendingUp } from 'lucide-react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  maxWidth?: number;
  delay?: number;
  className?: string;
  trigger?: 'hover' | 'click' | 'both';
  ariaLabel?: string;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'auto', 
  maxWidth = 320,
  delay = 500,
  className = '',
  trigger = 'hover',
  ariaLabel
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const toggleTooltip = () => {
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      
      if (!trigger || !tooltip) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newPosition = position;
      
      if (position === 'auto') {
        // Auto-position based on available space
        const spaceTop = trigger.top;
        const spaceBottom = viewportHeight - trigger.bottom;
        const spaceLeft = trigger.left;
        const spaceRight = viewportWidth - trigger.right;
        
        if (spaceBottom >= tooltip.height || spaceBottom >= spaceTop) {
          newPosition = 'bottom';
        } else if (spaceTop >= tooltip.height) {
          newPosition = 'top';
        } else if (spaceRight >= tooltip.width) {
          newPosition = 'right';
        } else {
          newPosition = 'left';
        }
      }
      
      setActualPosition(newPosition as 'top' | 'bottom' | 'left' | 'right');
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, position]);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};
    
    const trigger = triggerRef.current.getBoundingClientRect();
    const offset = 8; // Gap between trigger and tooltip
    
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      maxWidth: `${maxWidth}px`,
      pointerEvents: 'none',
    };
    
    switch (actualPosition) {
      case 'top':
        return {
          ...baseStyle,
          left: trigger.left + trigger.width / 2,
          bottom: window.innerHeight - trigger.top + offset,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyle,
          left: trigger.left + trigger.width / 2,
          top: trigger.bottom + offset,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          ...baseStyle,
          right: window.innerWidth - trigger.left + offset,
          top: trigger.top + trigger.height / 2,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          ...baseStyle,
          left: trigger.right + offset,
          top: trigger.top + trigger.height / 2,
          transform: 'translateY(-50%)',
        };
      default:
        return baseStyle;
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    const arrowSize = 6;
    
    switch (actualPosition) {
      case 'top':
        return {
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid rgb(15 23 42)`, // slate-900
        };
      case 'bottom':
        return {
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid rgb(15 23 42)`,
        };
      case 'left':
        return {
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid rgb(15 23 42)`,
        };
      case 'right':
        return {
          position: 'absolute',
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid rgb(15 23 42)`,
        };
      default:
        return {};
    }
  };

  const handleTriggerEvents = () => {
    const events: Record<string, () => void> = {};
    
    if (trigger === 'hover' || trigger === 'both') {
      events.onMouseEnter = showTooltip;
      events.onMouseLeave = hideTooltip;
    }
    
    if (trigger === 'click' || trigger === 'both') {
      events.onClick = toggleTooltip;
    }
    
    return events;
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        aria-describedby={isVisible ? 'tooltip' : undefined}
        aria-label={ariaLabel}
        {...handleTriggerEvents()}
      >
        {children}
      </div>
      
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          style={getTooltipStyle()}
          className="bg-slate-900 text-slate-100 px-3 py-2 rounded-lg shadow-lg border border-slate-700 text-sm leading-relaxed"
        >
          <div style={getArrowStyle()} />
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

// Specialized tooltip components for mathematical concepts
export interface MathTooltipProps {
  formula: string;
  explanation: string;
  variables?: Record<string, string>;
  children: React.ReactNode;
  className?: string;
}

export function MathTooltip({ formula, explanation, variables, children, className }: MathTooltipProps) {
  const content = (
    <div className="space-y-2">
      <div className="font-mono text-blue-300 bg-slate-800 px-2 py-1 rounded border">
        {formula}
      </div>
      <div className="text-slate-200">
        {explanation}
      </div>
      {variables && Object.keys(variables).length > 0 && (
        <div className="text-xs space-y-1 pt-2 border-t border-slate-600">
          <div className="text-slate-400 font-medium">Where:</div>
          {Object.entries(variables).map(([variable, meaning]) => (
            <div key={variable} className="flex gap-2">
              <span className="font-mono text-blue-300 min-w-0">{variable}:</span>
              <span className="text-slate-300">{meaning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} maxWidth={400} className={className}>
      <div className="inline-flex items-center gap-1 cursor-help">
        {children}
        <Calculator className="w-3 h-3 text-blue-400 opacity-60" />
      </div>
    </Tooltip>
  );
}

export interface InfoTooltipProps {
  title?: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function InfoTooltip({ title, description, children, className, icon }: InfoTooltipProps) {
  const content = (
    <div className="space-y-1">
      {title && (
        <div className="font-medium text-slate-100 border-b border-slate-600 pb-1">
          {title}
        </div>
      )}
      <div className="text-slate-200">
        {description}
      </div>
    </div>
  );

  return (
    <Tooltip content={content} className={className}>
      <div className="inline-flex items-center gap-1 cursor-help">
        {children}
        {icon || <Info className="w-3 h-3 text-slate-400 opacity-60" />}
      </div>
    </Tooltip>
  );
}

export interface MetricTooltipProps {
  value: number;
  description: string;
  interpretation?: string;
  goodRange?: [number, number];
  children: React.ReactNode;
  className?: string;
}

export function MetricTooltip({ 
  value, 
  description, 
  interpretation, 
  goodRange, 
  children, 
  className 
}: MetricTooltipProps) {
  const isInGoodRange = goodRange ? value >= goodRange[0] && value <= goodRange[1] : undefined;
  
  const content = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-slate-300">Current Value:</span>
        <span className={`font-mono font-medium ${
          isInGoodRange === true ? 'text-green-400' : 
          isInGoodRange === false ? 'text-yellow-400' : 
          'text-slate-100'
        }`}>
          {value.toFixed(3)}
        </span>
      </div>
      
      <div className="text-slate-200">
        {description}
      </div>
      
      {interpretation && (
        <div className="text-sm text-slate-300 bg-slate-800 p-2 rounded border-l-2 border-blue-500">
          {interpretation}
        </div>
      )}
      
      {goodRange && (
        <div className="text-xs text-slate-400 pt-1 border-t border-slate-600">
          Good range: {goodRange[0].toFixed(2)} - {goodRange[1].toFixed(2)}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} className={className}>
      <div className="inline-flex items-center gap-1 cursor-help">
        {children}
        <TrendingUp className="w-3 h-3 text-slate-400 opacity-60" />
      </div>
    </Tooltip>
  );
}