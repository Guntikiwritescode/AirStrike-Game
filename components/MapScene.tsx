'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  // Map view state
  const [viewState, setViewState] = useState({
    longitude: (bounds.east + bounds.west) / 2,
    latitude: (bounds.north + bounds.south) / 2,
    zoom: 14,
    pitch: 45,    // 3D tilt
    bearing: 0,   // Rotation
    minZoom: 12,
    maxZoom: 18
  });



  // Convert grid coordinates to lat/lng positions
  const getGridPosition = useCallback((gridX: number, gridY: number) => {
    const lngStep = (bounds.east - bounds.west) / config.gridSize;
    const latStep = (bounds.north - bounds.south) / config.gridSize;
    
    return {
      longitude: bounds.west + (gridX + 0.5) * lngStep,
      latitude: bounds.south + (gridY + 0.5) * latStep
    };
  }, [bounds, config.gridSize]);



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
          radius: 200, // Meters
          cell
        });
      });
    });
    
    return cellData;
  }, [grid, viewMode, config.showTruthOverlay, getGridPosition]);

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
    
    // Game grid overlay
    new ScatterplotLayer({
      id: 'game-grid',
      data: layerData,
      pickable: true,
      opacity: 0.7,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 50,
      lineWidthMinPixels: 1,
      getPosition: (d: CellData) => d.position,
      getRadius: (d: CellData) => d.radius,
      getFillColor: (d: CellData) => d.color,
      getLineColor: [255, 255, 255, 100], // White outline
      updateTriggers: {
        getFillColor: [viewMode, config.showTruthOverlay]
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
  ], [layerData, viewMode, config.showTruthOverlay, showLabels, onCellClick, onCellHover]);

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
    <div className="relative w-full h-full">
      <DeckGL
        views={views}
        viewState={{ map: viewState }}
        onViewStateChange={({ viewState: newViewState }) => {
          if ('map' in newViewState && newViewState.map) {
            setViewState(newViewState.map as typeof viewState);
          }
        }}
        layers={layers}


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
      
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs font-mono bg-panel2/80 text-ink px-2 py-1 rounded">
          3D Terrain Active
        </div>
      )}
    </div>
  );
}