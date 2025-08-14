'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './TopBar';
import EntityPanel, { TrackEntity } from './EntityPanel';
import ActionPanel from './ActionPanel';
import EventLog, { LogEvent } from './EventLog';

interface LatticeLayoutProps {
  children: React.ReactNode; // Map component goes here
  onEntitySelect?: (entity: TrackEntity) => void;
  onEntityFocus?: (entity: TrackEntity) => void;
  onReconAction?: (entityId: string, sensorType: string) => void;
  onStrikeAction?: (entityId: string, weaponType: string) => void;
  onSeedChange?: (seed: string) => void;
  onTimeControlChange?: (action: 'play' | 'pause' | 'step' | 'reset') => void;
  onQuickSearch?: (query: string) => void;
  onClearLog?: () => void;
  onExportLog?: () => void;
  searchQuery?: string;
  entities?: TrackEntity[];
  events?: LogEvent[];
}

// Resize handle component
const ResizeHandle = ({ 
  direction, 
  onResize, 
  className = '' 
}: { 
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      onResize(delta);
      startPosRef.current = currentPos;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, onResize]);

  return (
    <div
      className={`${
        direction === 'horizontal' 
          ? 'w-1 cursor-col-resize hover:bg-accent/40' 
          : 'h-1 cursor-row-resize hover:bg-accent/40'
      } bg-grid/40 transition-colors ${isDragging ? 'bg-accent/60' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      style={{ userSelect: 'none' }}
    />
  );
};

export default function LatticeLayout({
  children,
  onEntitySelect,
  onEntityFocus,
  onReconAction,
  onStrikeAction,
  onSeedChange,
  onTimeControlChange,
  onQuickSearch,
  onClearLog,
  onExportLog,
  searchQuery,
  entities,
  events
}: LatticeLayoutProps) {
  // Panel dimensions
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);

  // Selected entity state
  const [selectedEntity, setSelectedEntity] = useState<TrackEntity | undefined>();

  // Container dimensions for responsive behavior
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Constrain panel dimensions
  const minLeftWidth = 200;
  const maxLeftWidth = Math.min(400, containerDimensions.width * 0.3);
  const minRightWidth = 250;
  const maxRightWidth = Math.min(500, containerDimensions.width * 0.4);
  const minBottomHeight = 120;
  const maxBottomHeight = Math.min(400, containerDimensions.height * 0.4);

  // Resize handlers
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth(prev => 
      Math.min(maxLeftWidth, Math.max(minLeftWidth, prev + delta))
    );
  }, [maxLeftWidth, minLeftWidth]);

  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth(prev => 
      Math.min(maxRightWidth, Math.max(minRightWidth, prev - delta))
    );
  }, [maxRightWidth, minRightWidth]);

  const handleBottomResize = useCallback((delta: number) => {
    setBottomPanelHeight(prev => 
      Math.min(maxBottomHeight, Math.max(minBottomHeight, prev - delta))
    );
  }, [maxBottomHeight, minBottomHeight]);

  // Entity selection handlers
  const handleEntitySelect = useCallback((entity: TrackEntity) => {
    setSelectedEntity(entity);
    onEntitySelect?.(entity);
  }, [onEntitySelect]);

  const handleEntityFocus = useCallback((entity: TrackEntity) => {
    onEntityFocus?.(entity);
  }, [onEntityFocus]);

  // Calculate map area dimensions
  const mapAreaStyle = {
    marginLeft: `${leftPanelWidth}px`,
    marginRight: `${rightPanelWidth}px`,
    marginBottom: bottomPanelCollapsed ? '32px' : `${bottomPanelHeight}px`,
    marginTop: '48px' // Top bar height
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-bg overflow-hidden"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* Top Bar - Fixed */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <TopBar
          onSeedChange={onSeedChange}
          onTimeControlChange={onTimeControlChange}
          onQuickSearch={onQuickSearch}
        />
      </div>

      {/* Left Entity Panel */}
      <div 
        className="absolute top-12 left-0 bottom-0 z-40"
        style={{ width: leftPanelWidth }}
      >
        <EntityPanel
          entities={entities}
          selectedEntityId={selectedEntity?.id}
          onEntitySelect={handleEntitySelect}
          onEntityFocus={handleEntityFocus}
          searchQuery={searchQuery}
          width={leftPanelWidth}
        />
      </div>

      {/* Left Resize Handle */}
      <div 
        className="absolute top-12 bottom-0 z-40"
        style={{ left: leftPanelWidth }}
      >
        <ResizeHandle direction="horizontal" onResize={handleLeftResize} />
      </div>

      {/* Right Action Panel */}
      <div 
        className="absolute top-12 right-0 bottom-0 z-40"
        style={{ width: rightPanelWidth }}
      >
        <ActionPanel
          selectedEntity={selectedEntity}
          width={rightPanelWidth}
          onReconAction={onReconAction}
          onStrikeAction={onStrikeAction}
        />
      </div>

      {/* Right Resize Handle */}
      <div 
        className="absolute top-12 bottom-0 z-40"
        style={{ right: rightPanelWidth }}
      >
        <ResizeHandle direction="horizontal" onResize={handleRightResize} />
      </div>

      {/* Bottom Event Log */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-40"
        style={{ 
          height: bottomPanelCollapsed ? '32px' : bottomPanelHeight 
        }}
      >
        <EventLog
          events={events}
          height={bottomPanelCollapsed ? 32 : bottomPanelHeight}
          collapsed={bottomPanelCollapsed}
          onToggleCollapse={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
          onClearLog={onClearLog}
          onExportLog={onExportLog}
        />
      </div>

      {/* Bottom Resize Handle */}
      {!bottomPanelCollapsed && (
        <div 
          className="absolute left-0 right-0 z-40"
          style={{ bottom: bottomPanelHeight }}
        >
          <ResizeHandle direction="vertical" onResize={handleBottomResize} />
        </div>
      )}

      {/* Map Area - Center */}
      <div 
        className="absolute top-0 left-0 right-0 bottom-0 z-10"
        style={mapAreaStyle}
      >
        {children}
      </div>

      {/* Corner indicators for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="absolute top-12 left-0 w-2 h-2 bg-red-500 z-50 pointer-events-none" style={{ left: leftPanelWidth }} />
          <div className="absolute top-12 right-0 w-2 h-2 bg-blue-500 z-50 pointer-events-none" style={{ right: rightPanelWidth }} />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-green-500 z-50 pointer-events-none" style={{ bottom: bottomPanelCollapsed ? 32 : bottomPanelHeight }} />
        </>
      )}
    </div>
  );
}