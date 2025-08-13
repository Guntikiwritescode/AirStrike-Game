'use client';

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { TerrainLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map as ReactMapGL } from 'react-map-gl/maplibre';
import { HeatmapType } from '@/lib/types';
import 'maplibre-gl/dist/maplibre-gl.css';

// Types for our game integration
interface ReconHistory {
  result: boolean;
  confidence?: number;
  effectiveTPR: number;
  effectiveFPR: number;
}

interface GameCell {
  x: number;
  y: number;
  posteriorProbability: number;
  hasHostile?: boolean;
  hasInfrastructure?: boolean;
  reconHistory?: ReconHistory[];
}

interface MapSceneProps {
  // Game state
  grid: GameCell[][];
  config: {
    gridSize: number;
    showTruthOverlay?: boolean;
  };
  
  // View state
  viewMode: HeatmapType;
  showLabels: boolean;
  
  // Interactions
  onCellClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number) => void;
  
  // Map bounds (lat/lng coordinates for the tactical area)
  bounds?: {
    north: number;
    south: number; 
    east: number;
    west: number;
  };
}

// Default tactical area bounds (can be customized)
const DEFAULT_BOUNDS = {
  north: 40.7829,  // NYC area for realistic terrain
  south: 40.7489,
  east: -73.9441,
  west: -73.9893
};



export default function MapScene({
  grid,
  config,
  viewMode,
  showLabels,
  onCellClick,
  onCellHover,
  bounds = DEFAULT_BOUNDS
}: MapSceneProps) {
  // Refs for ResizeObserver and DPR handling
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);

  // Map view state with proper scale constraints
  const [viewState, setViewState] = useState({
    longitude: (bounds.east + bounds.west) / 2,
    latitude: (bounds.north + bounds.south) / 2,
    zoom: 15.5,     // Optimal zoom for tactical grid visibility
    pitch: 60,      // Better 3D perspective for terrain
    bearing: -45,   // Slightly angled for visual interest
    minZoom: 13,    // Prevent excessive zoom out
    maxZoom: 18     // Prevent excessive zoom in
  });

  // ResizeObserver for responsive sizing without layout shift
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // DPR detection for crisp rendering
  useEffect(() => {
    const updateDPR = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1);
    };

    updateDPR();
    window.addEventListener('resize', updateDPR);
    return () => window.removeEventListener('resize', updateDPR);
  }, []);



  // Convert grid coordinates to lat/lng positions
  const getGridPosition = useCallback((gridX: number, gridY: number) => {
    const lngStep = (bounds.east - bounds.west) / config.gridSize;
    const latStep = (bounds.north - bounds.south) / config.gridSize;
    
    return {
      longitude: bounds.west + (gridX + 0.5) * lngStep,
      latitude: bounds.south + (gridY + 0.5) * latStep
    };
  }, [bounds, config.gridSize]);

  // Zoom-aware radius calculation for consistent visual size
  const getRadiusForZoom = useCallback((zoom: number) => {
    // Base radius at zoom 15.5, scales with zoom level
    const baseRadius = 150; // meters
    const zoomFactor = Math.pow(2, 15.5 - zoom);
    return Math.max(50, Math.min(400, baseRadius * zoomFactor));
  }, []);

  // Calculate scale bar length based on zoom level
  const getScaleBarData = useCallback(() => {
    const zoom = viewState.zoom;
    // Approximate meters per pixel at this zoom level and latitude
    const metersPerPixel = (156543.03392 * Math.cos(viewState.latitude * Math.PI / 180)) / Math.pow(2, zoom);
    
    // Target scale bar length: 100px
    const targetPixels = 100;
    const targetMeters = metersPerPixel * targetPixels;
    
    // Round to nice numbers
    let scaleMeters: number;
    if (targetMeters < 100) {
      scaleMeters = Math.round(targetMeters / 10) * 10;
    } else if (targetMeters < 1000) {
      scaleMeters = Math.round(targetMeters / 50) * 50;
    } else {
      scaleMeters = Math.round(targetMeters / 500) * 500;
    }
    
    const scalePixels = (scaleMeters / metersPerPixel);
    const scaleText = scaleMeters >= 1000 ? `${(scaleMeters / 1000).toFixed(1)} km` : `${scaleMeters} m`;
    
    return { scalePixels, scaleText, scaleMeters };
  }, [viewState.zoom, viewState.latitude]);

  const scaleBarData = getScaleBarData();



  // Create data for deck.gl layers
  interface CellData {
    position: [number, number, number];
    gridX: number;
    gridY: number;
    value: number;
    color: [number, number, number, number];
    radius: number;
    cell: GameCell;
  }

  const layerData = useMemo(() => {
    const cellData: CellData[] = [];
    
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const position = getGridPosition(x, y);
        
        let value: number;
        let color: [number, number, number, number];
        
        // Determine value and color based on view mode
        switch (viewMode) {
          case 'posterior':
            value = cell.posteriorProbability;
            color = [
              Math.floor(255 * value),           // Red intensity
              Math.floor(255 * (1 - value)),     // Green intensity  
              100,                               // Blue constant
              Math.floor(180 * value + 75)       // Alpha based on probability
            ];
            break;
            
          case 'truth':
            if (config.showTruthOverlay) {
              value = cell.hasHostile ? 1 : 0;
              color = cell.hasHostile 
                ? [255, 100, 100, 200]  // Red for hostiles
                : [100, 255, 100, 100]; // Green for clear
            } else {
              value = cell.posteriorProbability;
              color = [255 * value, 255 * (1 - value), 100, 180 * value + 75];
            }
            break;
            
          case 'expectedValue':
          case 'valueOfInformation':
          case 'riskAverse':
          case 'variance':
          case 'lossRisk':
          case 'priorField':
            // For these modes, use a blue-to-red gradient
            value = cell.posteriorProbability; // Fallback to posterior for now
            color = [
              Math.floor(200 * value + 55),      // Blue to cyan
              Math.floor(150 * (1 - value) + 100), // Variable green
              Math.floor(255 * (1 - value)),     // Red intensity
              Math.floor(160 * value + 95)       // Alpha
            ];
            break;
            
          default:
            value = cell.posteriorProbability;
            color = [255 * value, 255 * (1 - value), 100, 180 * value + 75];
        }
        
        cellData.push({
          position: [position.longitude, position.latitude, 50], // Elevated for visibility
          gridX: x,
          gridY: y,
          value,
          color,
          radius: getRadiusForZoom(viewState.zoom), // Zoom-aware radius in meters
          cell
        });
      });
    });
    
    return cellData;
  }, [grid, viewMode, config.showTruthOverlay, getGridPosition, getRadiusForZoom, viewState.zoom]);

  // Deck.gl layers
  const layers = useMemo(() => [
    // Terrain layer for 3D elevation
    new TerrainLayer({
      id: 'terrain',
      minZoom: 0,
      maxZoom: 23,
      strategy: 'no-overlap',
      elevationData: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
      texture: showLabels 
        ? 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
        : undefined,
      elevationDecoder: {
        rScaler: 256,
        gScaler: 1,
        bScaler: 1 / 256,
        offset: -32768
      },
      color: showLabels ? [255, 255, 255] : [40, 60, 80], // Tactical tint when no labels
      opacity: 0.8,
      wireframe: false
    }),
    
    // Game grid overlay with DPR-aware sizing
    new ScatterplotLayer({
      id: 'game-grid',
      data: layerData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusUnits: 'meters',
      radiusMinPixels: Math.ceil(6 * devicePixelRatio),  // DPR-aware minimum
      radiusMaxPixels: Math.ceil(80 * devicePixelRatio), // DPR-aware maximum
      lineWidthScale: 1,
      lineWidthUnits: 'meters',
      lineWidthMinPixels: Math.ceil(1 * devicePixelRatio), // Crisp 1px lines
      getPosition: (d: CellData) => d.position,
      getRadius: (d: CellData) => d.radius,
      getFillColor: (d: CellData) => d.color,
      getLineColor: [255, 255, 255, 120], // Slightly more visible outline
      getLineWidth: 5, // 5 meters for consistent outline width
      updateTriggers: {
        getFillColor: [viewMode, config.showTruthOverlay],
        getRadius: [viewState.zoom]
      },
      
      // Interaction handlers
      onClick: (info: { object?: CellData }) => {
        if (info.object && onCellClick) {
          onCellClick(info.object.gridX, info.object.gridY);
        }
      },
      
      onHover: (info: { object?: CellData }) => {
        if (info.object && onCellHover) {
          onCellHover(info.object.gridX, info.object.gridY);
        }
      }
    })
  ], [layerData, viewMode, config.showTruthOverlay, showLabels, onCellClick, onCellHover, devicePixelRatio, viewState.zoom]);

  // View configuration
  const views = useMemo(() => [
    new MapView({
      id: 'map',
      controller: {
        inertia: true,
        scrollZoom: { speed: 0.01, smooth: true },
        dragPan: true,
        dragRotate: true,
        doubleClickZoom: true,
        touchZoom: true,
        touchRotate: true,
        keyboard: true
      }
    })
  ], []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <DeckGL
        views={views}
        viewState={{ map: viewState }}
        onViewStateChange={({ viewState: newViewState }) => {
          if ('map' in newViewState && newViewState.map) {
            setViewState(newViewState.map as typeof viewState);
          }
        }}
        onHover={(info) => {
          if (info.coordinate) {
            setMousePosition({ 
              lat: info.coordinate[1], 
              lng: info.coordinate[0] 
            });
          }
        }}
        layers={layers}
        width={containerSize.width}
        height={containerSize.height}
        style={{ 
          width: `${containerSize.width}px`, 
          height: `${containerSize.height}px` 
        }}
      >
        <ReactMapGL
          {...viewState}
          onMove={(evt) => setViewState({
            ...evt.viewState,
            minZoom: viewState.minZoom,
            maxZoom: viewState.maxZoom
          })}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>
      
      {/* Scale bar */}
      <div className="absolute bottom-4 left-4 bg-panel2/90 text-ink px-3 py-2 rounded border border-grid/40">
        <div className="flex items-end gap-3">
          <div className="relative">
            <div 
              className="border-b-2 border-l-2 border-r-2 border-accent"
              style={{ 
                width: `${scaleBarData.scalePixels}px`, 
                height: '8px',
                imageRendering: 'pixelated' // Crisp rendering
              }}
            />
            <div className="text-xs font-mono mt-1 text-center">
              {scaleBarData.scaleText}
            </div>
          </div>
        </div>
      </div>

      {/* Coordinate readout */}
      <div className="absolute bottom-4 right-4 bg-panel2/90 text-ink px-3 py-2 rounded border border-grid/40">
        <div className="text-xs font-mono space-y-1">
          <div className="text-muted mb-1">Center:</div>
          <div>Lat: {viewState.latitude.toFixed(6)}°</div>
          <div>Lng: {viewState.longitude.toFixed(6)}°</div>
          {mousePosition && (
            <>
              <div className="text-muted mt-2 mb-1">Cursor:</div>
              <div>Lat: {mousePosition.lat.toFixed(6)}°</div>
              <div>Lng: {mousePosition.lng.toFixed(6)}°</div>
            </>
          )}
          <div className="text-muted mt-2 mb-1">View:</div>
          <div>Zoom: {viewState.zoom.toFixed(1)}</div>
          <div>DPR: {devicePixelRatio.toFixed(1)}x</div>
        </div>
      </div>
        
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs font-mono bg-panel2/80 text-ink px-2 py-1 rounded border border-grid/40">
          3D Map • {containerSize.width}×{containerSize.height}
        </div>
      )}
    </div>
  );
}