'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { GateState } from '@/lib/hooks/useAppReady';

interface ReadyGateStatusStripProps {
  gates: GateState[];
  getFormattedDelta: (gate: GateState) => string;
  isVisible?: boolean;
}

export function ReadyGateStatusStrip({ gates, getFormattedDelta, isVisible = true }: ReadyGateStatusStripProps) {
  // Only show in development and when NEXT_PUBLIC_DEBUG is enabled
  if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_DEBUG !== '1') {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3 font-mono text-xs">
      <div className="text-slate-300 mb-2 font-semibold">Ready Gates</div>
      <div className="space-y-1">
        {gates.map((gate) => (
          <div key={gate.id} className="flex items-center justify-between space-x-3 min-w-[160px]">
            <div className="flex items-center space-x-2">
              {gate.ready ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : gate.error ? (
                <XCircle className="w-3 h-3 text-red-400" />
              ) : (
                <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />
              )}
              <span className={`${
                gate.ready ? 'text-green-400' : 
                gate.error ? 'text-red-400' : 
                'text-slate-300'
              }`}>
                {gate.id}
              </span>
            </div>
            <div className="text-slate-400 text-right">
              {getFormattedDelta(gate)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-600 text-slate-400">
        {gates.filter(g => g.ready).length}/{gates.length} ready
      </div>
    </div>
  );
}