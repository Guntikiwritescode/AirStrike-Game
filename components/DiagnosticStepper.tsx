'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, Copy } from 'lucide-react';

export interface DiagnosticStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime?: number;
  endTime?: number;
  errorMessage?: string;
  details?: string;
}

interface DiagnosticStepperProps {
  steps: DiagnosticStep[];
  onCopyDiagnostics?: () => void;
}

export function DiagnosticStepper({ steps, onCopyDiagnostics }: DiagnosticStepperProps) {
  const [elapsed, setElapsed] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsed: Record<string, number> = {};
      
      steps.forEach(step => {
        if (step.status === 'running' && step.startTime) {
          newElapsed[step.id] = now - step.startTime;
        } else if (step.status === 'success' && step.startTime && step.endTime) {
          newElapsed[step.id] = step.endTime - step.startTime;
        }
      });
      
      setElapsed(newElapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [steps]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (step: DiagnosticStep) => {
    switch (step.status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>;
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (step: DiagnosticStep) => {
    switch (step.status) {
      case 'pending':
        return 'text-slate-500';
      case 'running':
        return 'text-blue-300';
      case 'success':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
    }
  };

  const hasAnyStalled = steps.some(step => 
    step.status === 'running' && 
    step.startTime && 
    Date.now() - step.startTime > 5000
  );

  const stalledStep = steps.find(step => 
    step.status === 'running' && 
    step.startTime && 
    Date.now() - step.startTime > 5000
  );

  const lastError = steps.find(step => step.status === 'error');

  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">System Diagnostics</h3>
        {onCopyDiagnostics && (
          <button
            onClick={onCopyDiagnostics}
            className="text-slate-400 hover:text-white text-sm flex items-center space-x-1"
            title="Copy diagnostics"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-3">
            {getStatusIcon(step)}
            <div className="flex-1">
              <div className={`text-sm font-medium ${getStatusColor(step)}`}>
                {step.name}
              </div>
              {step.details && (
                <div className="text-xs text-slate-400 mt-1">
                  {step.details}
                </div>
              )}
              {step.errorMessage && (
                <div className="text-xs text-red-400 mt-1 font-mono">
                  {step.errorMessage}
                </div>
              )}
            </div>
            <div className="text-xs text-slate-500 min-w-[60px] text-right">
              {elapsed[step.id] ? formatTime(elapsed[step.id]) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Stalled Warning */}
      {hasAnyStalled && stalledStep && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300 font-medium">
              Step stalled for {formatTime(elapsed[stalledStep.id] || 0)}
            </span>
          </div>
          {lastError && (
            <div className="text-xs text-yellow-200">
              Last error: {lastError.errorMessage}
            </div>
          )}
          {onCopyDiagnostics && (
            <button
              onClick={onCopyDiagnostics}
              className="mt-2 bg-yellow-700 hover:bg-yellow-600 text-yellow-100 text-xs py-1 px-2 rounded font-mono uppercase tracking-wider transition-colors"
            >
              Copy Diagnostics
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-slate-400 text-center">
        {steps.filter(s => s.status === 'success').length} of {steps.length} steps completed
      </div>
    </div>
  );
}

// Hook to manage diagnostic steps
export function useDiagnosticStepper() {
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { id: 'fonts', name: 'Loading fonts', status: 'pending' },
    { id: 'store', name: 'Initializing store', status: 'pending' },
    { id: 'map', name: 'Loading map data', status: 'pending' },
    { id: 'simWorker', name: 'Starting simulation worker', status: 'pending' },
    { id: 'perfWorker', name: 'Starting performance worker', status: 'pending' },
    { id: 'heatmaps', name: 'Generating heatmaps', status: 'pending' },
  ]);

  const updateStep = (id: string, updates: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id 
        ? { 
            ...step, 
            ...updates,
            startTime: updates.status === 'running' && !step.startTime ? Date.now() : step.startTime,
            endTime: updates.status === 'success' || updates.status === 'error' ? Date.now() : step.endTime,
          }
        : step
    ));
  };

  const copyDiagnostics = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      // Not running in the browser; do nothing
      return;
    }
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      steps: steps.map(step => ({
        ...step,
        duration: step.startTime && step.endTime ? step.endTime - step.startTime : null,
      })),
      url: window.location.href,
      localStorage: {
        available: typeof Storage !== 'undefined',
        items: typeof Storage !== 'undefined' && typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [],
      },
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    }
  };

  return {
    steps,
    updateStep,
    copyDiagnostics,
  };
}