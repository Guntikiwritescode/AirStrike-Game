// Optimized Worker Manager for Performance Calculations
// Handles message queuing, worker pool management, and efficient data transfer

import React from 'react';
import { 
  PerformanceWorkerMessage, 
  PerformanceWorkerResponse, 
  LayerCalculationRequest,
  LayerCalculationResult 
} from '@/lib/workers/performance.worker';
import { createPerfWorker, getWorkerCapabilities, logWorkerCapabilities } from './workers/factory';

export interface WorkerTask<TPayload = unknown, TResult = unknown> {
  id: string;
  type: PerformanceWorkerMessage['type'];
  payload: TPayload;
  resolve: (result: TResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number; // 0 = highest, 10 = lowest
}

export class PerformanceWorkerManager {
  private static instance: PerformanceWorkerManager;
  private workers: Worker[] = [];
  private workerCount = Math.min(4, navigator.hardwareConcurrency || 2);
  private taskQueue: WorkerTask<unknown, unknown>[] = [];
  private activeTasks = new Map<string, WorkerTask<unknown, unknown>>();
  private workerIndex = 0;
  private isInitialized = false;
  private isWorkerMode = true; // Track if we're using workers or fallback

  // Performance metrics
  private metrics = {
    tasksCompleted: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    queueSize: 0,
    workerUtilization: 0
  };

  static getInstance(): PerformanceWorkerManager {
    if (!PerformanceWorkerManager.instance) {
      PerformanceWorkerManager.instance = new PerformanceWorkerManager();
    }
    return PerformanceWorkerManager.instance;
  }

  private constructor() {
    this.initializeWorkers();
  }

  private async initializeWorkers(): Promise<void> {
    if (this.isInitialized) return;

    // Log capabilities for debugging
    logWorkerCapabilities();
    const capabilities = getWorkerCapabilities();

    try {
      // Initialize worker pool with factory
      for (let i = 0; i < this.workerCount; i++) {
        const worker = createPerfWorker();

        if (!worker) {
          throw new Error('Performance worker creation failed');
        }

        worker.onmessage = (event: MessageEvent<PerformanceWorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        worker.onerror = (error) => {
          console.error('Performance worker error:', error);
          this.handleWorkerError(error);
        };

        this.workers.push(worker);
      }

      this.isInitialized = true;
      this.isWorkerMode = true;
      this.processQueue();
      console.log(`✅ Performance worker pool initialized with ${this.workers.length} workers`);
    } catch (error) {
      console.warn('⚠️ Performance worker initialization failed, falling back to main thread:', error);
      
      // Clean up any partially created workers
      this.workers.forEach(worker => worker.terminate());
      this.workers = [];

      // Fall back to main thread mode
      this.isWorkerMode = false;
      this.isInitialized = true;
      
      if (process.env.NEXT_PUBLIC_DEBUG === '1') {
        console.warn('🔄 Performance calculations running in degraded mode');
      }
    }
  }

  private handleWorkerMessage(response: PerformanceWorkerResponse): void {
    const task = this.activeTasks.get(response.id);
    if (!task) {
      console.warn('Received response for unknown task:', response.id);
      return;
    }

    this.activeTasks.delete(response.id);

    // Update metrics
    const payload = response.payload as { processingTime?: number };
    const processingTime = payload.processingTime || 0;
    this.metrics.tasksCompleted++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.tasksCompleted;

    if (response.type === 'error') {
      const errorPayload = response.payload as { error: string };
      task.reject(new Error(errorPayload.error));
    } else {
      task.resolve(response.payload);
    }

    // Process next task in queue
    this.processQueue();
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Find and reject affected tasks
    for (const [taskId, task] of this.activeTasks) {
      task.reject(new Error('Worker error: ' + error.message));
      this.activeTasks.delete(taskId);
    }

    // Re-initialize workers if needed
    setTimeout(() => {
      this.reinitializeWorkers();
    }, 1000);
  }

  private async reinitializeWorkers(): Promise<void> {
    // Terminate existing workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.isInitialized = false;

    // Reinitialize
    await this.initializeWorkers();
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0 || this.activeTasks.size >= this.workers.length) {
      return;
    }

    // Sort queue by priority and timestamp
    this.taskQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });

    const task = this.taskQueue.shift();
    if (!task) return;

    // Assign to least busy worker (round-robin for now)
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;

    // Send task to worker
    const message: PerformanceWorkerMessage = {
      type: task.type,
      payload: task.payload,
      id: task.id
    };

    worker.postMessage(message);
    this.activeTasks.set(task.id, task);

    // Update metrics
    this.metrics.queueSize = this.taskQueue.length;
    this.metrics.workerUtilization = this.activeTasks.size / this.workers.length;

    // Process next task if workers available
    this.processQueue();
  }

  // Public API for task submission
  public submitTask<TPayload, TResult>(
    type: PerformanceWorkerMessage['type'],
    payload: TPayload,
    priority: number = 5
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<TPayload, TResult> = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        resolve,
        reject,
        timestamp: performance.now(),
        priority
      };

      this.taskQueue.push(task as WorkerTask<unknown, unknown>);
      this.processQueue();
    });
  }

  // Specialized methods for common calculations
  public async calculateLayerData(request: LayerCalculationRequest): Promise<LayerCalculationResult> {
    return this.submitTask<LayerCalculationRequest, LayerCalculationResult>(
      'calculate_layer_data',
      request,
      1 // High priority for layer calculations
    );
  }

  public async calculateMetrics(grid: unknown[][], config: unknown): Promise<unknown> {
    return this.submitTask(
      'calculate_metrics',
      { grid, config },
      3 // Medium priority for metrics
    );
  }

  public async calculateRisk(grid: unknown[][], config: unknown): Promise<unknown> {
    return this.submitTask(
      'calculate_risk',
      { grid, config },
      2 // High priority for risk analysis
    );
  }

  // Performance monitoring
  public getMetrics() {
    return {
      ...this.metrics,
      activeWorkers: this.workers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }

  // Cleanup
  public dispose(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const perfWorkerManager = PerformanceWorkerManager.getInstance();

// Optimized React hook for worker-based calculations
export function useWorkerCalculation<TResult>(
  enabled: boolean,
  calculationType: PerformanceWorkerMessage['type'],
  payload: unknown,
  dependencies: unknown[] = []
): {
  result: TResult | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;
} {
  const [state, setState] = React.useState<{
    result: TResult | null;
    isLoading: boolean;
    error: Error | null;
    lastUpdated: number;
  }>({
    result: null,
    isLoading: false,
    error: null,
    lastUpdated: 0
  });

  React.useEffect(() => {
    if (!enabled || !payload) return;

    let isCancelled = false;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    perfWorkerManager.submitTask<unknown, TResult>(calculationType, payload)
      .then(result => {
        if (!isCancelled) {
          setState({
            result,
            isLoading: false,
            error: null,
            lastUpdated: Date.now()
          });
        }
      })
      .catch(error => {
        if (!isCancelled) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error))
          }));
        }
      });

    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, calculationType, payload]);

  return state;
}