'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DegradedModeBannerProps {
  isVisible: boolean;
  onDismiss?: () => void;
  message?: string;
}

export function DegradedModeBanner({ 
  isVisible, 
  onDismiss, 
  message = "Worker disabled — running in degraded mode" 
}: DegradedModeBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">{message}</span>
        <span className="text-sm opacity-75">
          Some features may be slower or unavailable.
        </span>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 p-1 hover:bg-yellow-600 rounded-full transition-colors"
          title="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}