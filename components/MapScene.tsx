'use client';

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { TerrainLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers';
import { Map as ReactMapGL } from 'react-map-gl/maplibre';
import { HeatmapType, InfrastructureEntity, AircraftEntity, FlightPath, TacticalBoundary, AreaOfInterest, SensorCone } from '@/lib/types';
import TacticalTooltip from '@/components/TacticalTooltip';
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
  
  // 3D entity data
  infrastructure?: InfrastructureEntity[];
  aircraft?: AircraftEntity[];
  flightPaths?: FlightPath[];
  
  // Tactical overlays
  boundaries?: TacticalBoundary[];
  aois?: AreaOfInterest[];
  sensorCones?: SensorCone[];
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
  bounds = DEFAULT_BOUNDS,
  infrastructure = [],
  aircraft = [],
  flightPaths = [],
  boundaries = [],
  aois = [],
  sensorCones = []
}: MapSceneProps) {
  // Refs for ResizeObserver and DPR handling
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  // Tooltip state temporarily disabled
  // const [hoveredObject, setHoveredObject] = useState<unknown>(null);
  // const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

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

  // Animation loop for dashed lines
  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      setAnimationTime(elapsed);
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
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

  // Generate sensor cone polygons
  const generateSensorConePolygon = useCallback((cone: SensorCone): [number, number, number][] => {
    const polygon: [number, number, number][] = [];
    const [lng, lat, alt] = cone.position;
    
    // Convert range from meters to approximate lat/lng degrees
    const rangeLng = cone.range / (111320 * Math.cos(lat * Math.PI / 180)); // meters to lng degrees
    const rangeLat = cone.range / 110540; // meters to lat degrees
    
    // Start at sensor position
    polygon.push([lng, lat, alt]);
    
    // Create arc for the sensor cone
    const segments = 24; // Smooth arc
    const halfFOV = cone.fieldOfView / 2;
    
    for (let i = 0; i <= segments; i++) {
      const angle = cone.bearing - halfFOV + (cone.fieldOfView * i / segments);
      const x = lng + Math.sin(angle) * rangeLng;
      const y = lat + Math.cos(angle) * rangeLat;
      polygon.push([x, y, alt + cone.sectorHeight]);
    }
    
    // Close the polygon by returning to center
    polygon.push([lng, lat, alt]);
    
    return polygon;
  }, []);

  // Note: 3D models will be implemented in future iteration
  // Currently using enhanced ScatterplotLayer for infrastructure and aircraft



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

  // Generate 3D flight path data
  const flightPathData = useMemo(() => {
    return flightPaths.map(path => ({
      path: path.waypoints.map(wp => wp.position),
      color: [85, 227, 255, 180], // Cyan color with transparency
      width: 15 // meters
    }));
  }, [flightPaths]);

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
    }),

    // 3D Infrastructure placeholders (using ScatterplotLayer for now)
    new ScatterplotLayer({
      id: 'infrastructure',
      data: infrastructure,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusUnits: 'meters',
      radiusMinPixels: Math.ceil(8 * devicePixelRatio),
      radiusMaxPixels: Math.ceil(120 * devicePixelRatio),
      lineWidthScale: 1,
      lineWidthUnits: 'meters',
      lineWidthMinPixels: Math.ceil(2 * devicePixelRatio),
      getPosition: (d: InfrastructureEntity) => d.position,
      getRadius: (d: InfrastructureEntity) => {
        // Different sizes for different infrastructure types
        const baseSizes = { tower: 80, dome: 120, building: 100 };
        return baseSizes[d.type] * d.scale;
      },
      getFillColor: (d: InfrastructureEntity): [number, number, number, number] => {
        if (d.isDestroyed) return [255, 107, 107, 200]; // Red if destroyed
        // Different colors for different types
        const colors: Record<string, [number, number, number, number]> = {
          tower: [150, 180, 200, 255],    // Gray-blue
          dome: [200, 150, 180, 255],     // Purple-ish
          building: [180, 200, 150, 255]  // Green-ish
        };
        return colors[d.type];
      },
      getLineColor: [255, 255, 255, 180],
      getLineWidth: 8,
      updateTriggers: {
        getFillColor: infrastructure.map(i => `${i.type}-${i.isDestroyed}`),
        getRadius: infrastructure.map(i => `${i.type}-${i.scale}`)
      }
    }),

    // 3D Aircraft placeholders (using ScatterplotLayer with orientation indicators)
    new ScatterplotLayer({
      id: 'aircraft',
      data: aircraft,
      pickable: true,
      opacity: 0.95,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusUnits: 'meters',
      radiusMinPixels: Math.ceil(6 * devicePixelRatio),
      radiusMaxPixels: Math.ceil(80 * devicePixelRatio),
      lineWidthScale: 1,
      lineWidthUnits: 'meters',
      lineWidthMinPixels: Math.ceil(2 * devicePixelRatio),
      getPosition: (d: AircraftEntity) => d.position,
      getRadius: (d: AircraftEntity) => {
        // Scale by altitude - higher aircraft appear larger
        const baseRadius = 60;
        const altitudeScale = Math.max(0.5, Math.min(2.0, d.altitude / 2000));
        return baseRadius * altitudeScale;
      },
      getFillColor: (d: AircraftEntity): [number, number, number, number] => {
        if (d.isHostile) {
          return [255, 107, 107, 255]; // Red for hostile
        } else {
          return [85, 227, 255, 255]; // Cyan for friendly
        }
      },
      getLineColor: (d: AircraftEntity): [number, number, number, number] => {
        return d.isHostile ? [255, 255, 255, 200] : [85, 227, 255, 200]; // Cyan rim for friendly
      },
      getLineWidth: 12, // Thicker outline for rim light effect
      updateTriggers: {
        getPosition: aircraft.map(a => `${a.position[0]}-${a.position[1]}-${a.position[2]}`),
        getRadius: aircraft.map(a => a.altitude),
        getFillColor: aircraft.map(a => a.isHostile),
        getLineColor: aircraft.map(a => a.isHostile)
      }
    }),

    // Tactical Boundaries (FEBA/ROZ lines with animated dashes)
    ...(boundaries.length > 0 ? [new PathLayer({
      id: 'tactical-boundaries',
      data: boundaries,
      pickable: true,
      getPath: (d: TacticalBoundary): [number, number, number][] => d.path,
      getColor: (d: TacticalBoundary): [number, number, number, number] => d.color,
      getWidth: 8, // meters
      widthUnits: 'meters',
      opacity: 0.9,
      capRounded: false,
      jointRounded: false,
      billboard: false,
      dashJustified: true,
      getDashArray: (d: TacticalBoundary): [number, number] => [d.dashLength, d.dashLength],
      getOffset: (d: TacticalBoundary): number => {
        return d.animated ? (animationTime * 20) % (d.dashLength * 2) : 0; // 3s loop
      },
      updateTriggers: {
        getOffset: animationTime
      }
    })] : []),

    // Areas of Interest (AOIs) 
    ...(aois.length > 0 ? [new PolygonLayer({
      id: 'aois',
      data: aois,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      getPolygon: (d: AreaOfInterest): [number, number, number][] => d.polygon,
      getFillColor: (d: AreaOfInterest): [number, number, number, number] => {
        const baseColor: [number, number, number] = [85, 227, 255]; // Cyan
        const alpha = d.priority === 'HIGH' ? 40 : d.priority === 'MEDIUM' ? 25 : 15;
        return [...baseColor, alpha];
      },
      getLineColor: [85, 227, 255, 180], // Cyan stroke
      getLineWidth: 3,
      lineWidthUnits: 'meters',
      lineWidthMinPixels: Math.ceil(1 * devicePixelRatio),
      updateTriggers: {
        getFillColor: aois.map(a => a.priority)
      }
    })] : []),

    // Sensor Footprint Cones
    ...(sensorCones.length > 0 ? [new PolygonLayer({
      id: 'sensor-cones',
      data: sensorCones,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: true,
      getPolygon: (d: SensorCone): [number, number, number][] => generateSensorConePolygon(d),
      getFillColor: (d: SensorCone): [number, number, number, number] => {
        // Different colors for different sensor types
        const sensorColors: Record<string, [number, number, number]> = {
          'VISUAL': [255, 255, 100],    // Yellow
          'THERMAL': [255, 150, 100],   // Orange
          'RADAR': [100, 255, 100],     // Green
          'ACOUSTIC': [150, 100, 255]   // Purple
        };
        const baseColor = sensorColors[d.sensorType] || [200, 200, 200];
        const alpha = Math.floor(d.confidence * 60); // 0-60 based on confidence
        return [...baseColor, alpha];
      },
      getLineColor: (d: SensorCone): [number, number, number, number] => {
        const sensorColors: Record<string, [number, number, number]> = {
          'VISUAL': [255, 255, 100],
          'THERMAL': [255, 150, 100],
          'RADAR': [100, 255, 100],
          'ACOUSTIC': [150, 100, 255]
        };
        const baseColor = sensorColors[d.sensorType] || [200, 200, 200];
        return [...baseColor, 150];
      },
      getElevation: (d: SensorCone): number => d.sectorHeight,
      getLineWidth: 4,
      lineWidthUnits: 'meters',
      lineWidthMinPixels: Math.ceil(1 * devicePixelRatio),
      updateTriggers: {
        getFillColor: sensorCones.map(s => `${s.sensorType}-${s.confidence}`),
        getPolygon: sensorCones.map(s => `${s.position[0]}-${s.position[1]}-${s.bearing}-${s.fieldOfView}`)
      }
    })] : []),

    // 3D Flight paths
    ...(flightPathData.length > 0 ? [new PathLayer({
      id: 'flight-paths',
      data: flightPathData,
      pickable: false,
      getPath: (d: { path: [number, number, number][] }): [number, number, number][] => d.path,
      getColor: (d: { color: [number, number, number, number] }): [number, number, number, number] => d.color,
      getWidth: (d: { width: number }): number => d.width,
      widthUnits: 'meters',
      opacity: 0.7,
      capRounded: true,
      jointRounded: true,
      billboard: false // Keep 3D
    })] : [])
  ], [layerData, viewMode, config.showTruthOverlay, showLabels, onCellClick, onCellHover, devicePixelRatio, viewState.zoom, infrastructure, aircraft, flightPathData, bounds, boundaries, aois, sensorCones, animationTime, generateSensorConePolygon]);

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
          
          // Tooltip functionality temporarily disabled
          // if (info.object && info.x !== undefined && info.y !== undefined) {
          //   setHoveredObject(info.object);
          //   setTooltipPosition({ x: info.x, y: info.y });
          // } else {
          //   setHoveredObject(null);
          //   setTooltipPosition(null);
          // }
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

      {/* Tactical Tooltip - Temporarily disabled */}
      {/* Will be implemented in separate commit */}

      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs font-mono bg-panel2/80 text-ink px-2 py-1 rounded border border-grid/40">
          3D Map • {containerSize.width}×{containerSize.height}
        </div>
      )}
    </div>
  );
}