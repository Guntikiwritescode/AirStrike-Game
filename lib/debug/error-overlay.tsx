'use client';

import React, { useEffect, useState } from 'react';

export interface ErrorInfo {
  message: string;
  stack: string;
  timestamp: number;
  type: 'error' | 'unhandledrejection';
}

interface ErrorOverlayState {
  errors: ErrorInfo[];
  isVisible: boolean;
}

export function useErrorOverlay() {
  const [state, setState] = useState<ErrorOverlayState>({
    errors: [],
    isVisible: false,
  });

  useEffect(() => {
    // Only activate in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG !== '1') {
      return;
    }

    const handleError = (event: ErrorEvent) => {
      const errorInfo: ErrorInfo = {
        message: event.message,
        stack: event.error?.stack || 'No stack trace available',
        timestamp: Date.now(),
        type: 'error',
      };

      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorInfo],
        isVisible: true,
      }));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorInfo: ErrorInfo = {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || 'No stack trace available',
        timestamp: Date.now(),
        type: 'unhandledrejection',
      };

      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorInfo],
        isVisible: true,
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const clearErrors = () => {
    setState(prev => ({ ...prev, errors: [], isVisible: false }));
  };

  const copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      errors: state.errors,
      localStorage: {
        available: typeof Storage !== 'undefined',
        items: typeof Storage !== 'undefined' && typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [],
      },
      sessionStorage: {
        available: typeof sessionStorage !== 'undefined',
        items: typeof sessionStorage !== 'undefined' ? Object.keys(sessionStorage) : [],
      },
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    }
  };

  return {
    errors: state.errors,
    isVisible: state.isVisible,
    clearErrors,
    copyDiagnostics,
  };
}

export interface ErrorOverlayProps {
  errors: ErrorInfo[];
  isVisible: boolean;
  onClear: () => void;
  onCopyDiagnostics: () => void;
}

export function ErrorOverlay({ errors, isVisible, onClear, onCopyDiagnostics }: ErrorOverlayProps) {
  if (!isVisible || errors.length === 0) {
    return null;
  }

  const latestError = errors[errors.length - 1];

  return (
    <div className="fixed top-4 right-4 max-w-md w-full z-[9999] bg-red-900/95 backdrop-blur-sm border border-red-700 rounded-lg shadow-2xl">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-red-100 font-semibold text-sm">
              Runtime Error ({errors.length})
            </h3>
          </div>
          <button
            onClick={onClear}
            className="text-red-300 hover:text-red-100 text-xs"
            title="Clear errors"
          >
            ✕
          </button>
        </div>

        {/* Latest Error */}
        <div className="mb-3">
          <div className="text-red-100 text-xs font-mono mb-1">
            {latestError.type === 'error' ? 'JavaScript Error' : 'Unhandled Promise Rejection'}
          </div>
          <div className="text-red-200 text-xs mb-2 break-words">
            {latestError.message}
          </div>
          <div className="text-red-300 text-xs font-mono max-h-24 overflow-y-auto bg-red-950/50 p-2 rounded border">
            <pre className="whitespace-pre-wrap text-xs">
              {latestError.stack}
            </pre>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-red-400 text-xs mb-3">
          {new Date(latestError.timestamp).toLocaleTimeString()}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onCopyDiagnostics}
            className="flex-1 bg-red-700 hover:bg-red-600 text-red-100 text-xs py-2 px-3 rounded font-mono uppercase tracking-wider transition-colors"
          >
            Copy Diagnostics
          </button>
          <button
            onClick={onClear}
            className="bg-red-800 hover:bg-red-700 text-red-100 text-xs py-2 px-3 rounded font-mono uppercase tracking-wider transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}