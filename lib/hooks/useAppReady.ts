'use client';

import { useState, useCallback, useRef } from 'react';

export type Gate = 'fonts' | 'store' | 'map' | 'simWorker' | 'perfWorker' | 'heatmaps';

export interface GateState {
  id: Gate;
  name: string;
  ready: boolean;
  timestamp?: number;
  error?: string;
  details?: string;
}

export interface AppReadyState {
  gates: GateState[];
  allReady: boolean;
  readyCount: number;
  totalGates: number;
  startTime: number;
}

const GATE_DEFINITIONS: Record<Gate, string> = {
  fonts: 'Fonts',
  store: 'Store',
  map: 'Map',
  simWorker: 'Sim Worker',
  perfWorker: 'Perf Worker',
  heatmaps: 'Heatmaps'
};

export function useAppReady() {
  const startTimeRef = useRef<number>(Date.now());
  
  const [gates, setGates] = useState<GateState[]>(() => 
    (Object.keys(GATE_DEFINITIONS) as Gate[]).map(id => ({
      id,
      name: GATE_DEFINITIONS[id],
      ready: false
    }))
  );

  const mark = useCallback((gateId: Gate, ready: boolean, error?: string, details?: string) => {
    const timestamp = Date.now();
    
    setGates(prevGates => 
      prevGates.map(gate => 
        gate.id === gateId 
          ? { 
              ...gate, 
              ready, 
              timestamp, 
              error: ready ? undefined : error,
              details 
            }
          : gate
      )
    );
  }, []);

  const getGate = useCallback((gateId: Gate) => {
    return gates.find(gate => gate.id === gateId);
  }, [gates]);

  const isGateReady = useCallback((gateId: Gate) => {
    return gates.find(gate => gate.id === gateId)?.ready ?? false;
  }, [gates]);

  const readyCount = gates.filter(gate => gate.ready).length;
  const allReady = readyCount === gates.length;

  const getDelta = useCallback((gate: GateState) => {
    if (!gate.timestamp) return null;
    return gate.timestamp - startTimeRef.current;
  }, []);

  const getFormattedDelta = useCallback((gate: GateState) => {
    const delta = getDelta(gate);
    if (delta === null) return '—';
    return `${delta}ms`;
  }, [getDelta]);

  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    setGates(prevGates => 
      prevGates.map(gate => ({
        ...gate,
        ready: false,
        timestamp: undefined,
        error: undefined,
        details: undefined
      }))
    );
  }, []);

  const state: AppReadyState = {
    gates,
    allReady,
    readyCount,
    totalGates: gates.length,
    startTime: startTimeRef.current
  };

  return {
    state,
    gates,
    mark,
    getGate,
    isGateReady,
    getDelta,
    getFormattedDelta,
    reset,
    allReady,
    readyCount
  };
}