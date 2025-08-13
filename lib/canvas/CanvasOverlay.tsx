'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { CanvasLayers } from './types';

interface CanvasOverlayProps {
  width: number;
  height: number;
  layers: CanvasLayers;
  onPointerEvent?: (event: PointerEvent, canvasX: number, canvasY: number) => void;
  onHover?: (canvasX: number, canvasY: number) => void;
  className?: string;
}

export default function CanvasOverlay({
  width,
  height,
  layers,
  onPointerEvent,
  onHover,
  className = ''
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize renderer and setup DPR scaling
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for crisp rendering
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    
    // Set canvas physical size 
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    
    // Set canvas CSS size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Scale context to account for DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Create renderer
    rendererRef.current = new CanvasRenderer(ctx, { width, height, dpr });
    setIsInitialized(true);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height]);

  // Main render loop
  const render = useCallback(() => {
    if (!rendererRef.current || !isInitialized) return;

    try {
      rendererRef.current.render(layers);
    } catch (error) {
      console.error('Canvas render error:', error);
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(render);
  }, [layers, isInitialized]);

  // Start/stop render loop
  useEffect(() => {
    if (isInitialized) {
      animationFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, isInitialized]);

  // Handle pointer events
  const handlePointerEvent = useCallback((event: React.PointerEvent) => {
    if (!canvasRef.current || !onPointerEvent) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onPointerEvent(event.nativeEvent, x, y);
  }, [onPointerEvent]);

  // Handle hover with throttling and hit testing
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!canvasRef.current || !rendererRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Throttle hover events to 60fps max
    const now = performance.now();
    const lastCall = (handlePointerMove as typeof handlePointerMove & { lastCall?: number }).lastCall || 0;
    if (now - lastCall > 16) {
      // Perform hit testing
      const hitResult = rendererRef.current.hitTest({ x, y });
      
      if (onHover) {
        onHover(x, y);
      }
      
      // Update cursor based on hit result
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hitResult.hit ? 'pointer' : 'crosshair';
      }
      
      (handlePointerMove as typeof handlePointerMove & { lastCall?: number }).lastCall = now;
    }
  }, [onHover]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 cursor-crosshair"
        onPointerDown={handlePointerEvent}
        onPointerUp={handlePointerEvent}
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}