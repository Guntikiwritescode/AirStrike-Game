'use client';

import { Toaster, toast } from 'react-hot-toast';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Custom toast styles matching tactical theme
const toastStyles = {
  className: '',
  style: {
    background: 'var(--color-panel)',
    color: 'var(--color-ink)',
    border: '1px solid rgba(27, 36, 48, 0.4)',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'var(--font-inter)',
    maxWidth: '400px',
  },
  iconTheme: {
    primary: 'var(--color-accent)',
    secondary: 'var(--color-panel)',
  },
};

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={toastStyles}
      gutter={8}
    />
  );
}

// Tactical toast functions
export const tacticalToast = {
  // Blocked action toast (4s timeout)
  blocked: (message: string, details?: string) => {
    return toast.custom(
      (t) => (
        <div className={`tactical-card p-4 flex items-start gap-3 ${t.visible ? 'animate-slide-up' : 'animate-fade-out'}`}>
          <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-warn mb-1">Action Blocked</div>
            <div className="text-sm text-ink">{message}</div>
            {details && (
              <div className="text-xs text-muted mt-1 font-mono">{details}</div>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-muted hover:text-ink transition-colors p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: 4000, id: 'blocked-action' }
    );
  },

  // Success toast
  success: (message: string, details?: string) => {
    return toast.custom(
      (t) => (
        <div className={`tactical-card p-4 flex items-start gap-3 ${t.visible ? 'animate-slide-up' : 'animate-fade-out'}`}>
          <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-accent mb-1">Success</div>
            <div className="text-sm text-ink">{message}</div>
            {details && (
              <div className="text-xs text-muted mt-1 font-mono">{details}</div>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-muted hover:text-ink transition-colors p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: 3000 }
    );
  },

  // Info toast
  info: (message: string, details?: string) => {
    return toast.custom(
      (t) => (
        <div className={`card p-3 flex items-start gap-3 ${t.visible ? 'animate-slide-up' : 'animate-fade-out'}`}>
          <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-accent mb-1">Information</div>
            <div className="text-sm text-ink">{message}</div>
            {details && (
              <div className="text-xs text-muted mt-1 font-mono">{details}</div>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-muted hover:text-ink transition-colors p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: 3000 }
    );
  },

  // Constraint violation (budget, turn limits, etc.)
  constraint: (constraint: string, current: number, limit: number) => {
    return tacticalToast.blocked(
      `${constraint} constraint violated`,
      `Current: ${current} / Limit: ${limit}`
    );
  },

  // Mission update
  mission: (status: 'started' | 'ended' | 'paused', details?: string) => {
    const statusMap = {
      started: { icon: CheckCircle, color: 'text-ok', label: 'Mission Started' },
      ended: { icon: Info, color: 'text-accent', label: 'Mission Ended' },
      paused: { icon: AlertTriangle, color: 'text-warn', label: 'Mission Paused' }
    };
    
    const config = statusMap[status];
    
    return toast.custom(
      (t) => (
        <div className={`card p-3 flex items-start gap-3 ${t.visible ? 'animate-slide-up' : 'animate-fade-out'}`}>
          <config.icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className={`font-medium ${config.color} mb-1`}>{config.label}</div>
            {details && (
              <div className="text-sm text-ink">{details}</div>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-muted hover:text-ink transition-colors p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: 3000 }
    );
  }
};