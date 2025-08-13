import { TacticalBoundary, AreaOfInterest, SensorCone, SensorType } from '@/lib/types';

// Generate sample tactical boundaries (FEBA/ROZ lines)
export function generateSampleBoundaries(
  bounds: { north: number; south: number; east: number; west: number }
): TacticalBoundary[] {
  const boundaries: TacticalBoundary[] = [];
  
  const centerLat = (bounds.north + bounds.south) / 2;
  const areaWidth = bounds.east - bounds.west;
  const areaHeight = bounds.north - bounds.south;
  
  // FEBA (Forward Edge of Battle Area) - red dashed line
  const febaPath: [number, number, number][] = [];
  const febaY = centerLat - areaHeight * 0.1; // Slightly south of center
  const segments = 8;
  
  for (let i = 0; i <= segments; i++) {
    const x = bounds.west + (i / segments) * areaWidth;
    const y = febaY + Math.sin((i / segments) * Math.PI * 3) * areaHeight * 0.05; // Wavy line
    febaPath.push([x, y, 100]); // 100m altitude
  }
  
  boundaries.push({
    id: 'feba-1',
    type: 'FEBA',
    name: 'FEBA Alpha',
    path: febaPath,
    color: [255, 107, 107, 220], // Red
    dashLength: 30, // meters
    animated: true
  });
  
  // ROZ (Restricted Operating Zone) - orange dashed line
  const rozPath: [number, number, number][] = [];
  const rozY = centerLat + areaHeight * 0.2; // North of center
  
  for (let i = 0; i <= segments; i++) {
    const x = bounds.west + (i / segments) * areaWidth;
    const y = rozY + Math.cos((i / segments) * Math.PI * 2) * areaHeight * 0.03; // Gentle curve
    rozPath.push([x, y, 150]); // 150m altitude
  }
  
  boundaries.push({
    id: 'roz-1',
    type: 'ROZ',
    name: 'ROZ Bravo',
    path: rozPath,
    color: [255, 150, 50, 200], // Orange
    dashLength: 25, // meters
    animated: true
  });
  
  // Phase Line - static blue dashed line
  const plPath: [number, number, number][] = [
    [bounds.west + areaWidth * 0.2, bounds.south + areaHeight * 0.3, 80],
    [bounds.west + areaWidth * 0.8, bounds.south + areaHeight * 0.7, 80]
  ];
  
  boundaries.push({
    id: 'pl-1',
    type: 'PL',
    name: 'PL Charlie',
    path: plPath,
    color: [100, 150, 255, 180], // Blue
    dashLength: 20, // meters
    animated: false
  });
  
  return boundaries;
}

// Generate sample Areas of Interest (AOIs)
export function generateSampleAOIs(
  bounds: { north: number; south: number; east: number; west: number }
): AreaOfInterest[] {
  const aois: AreaOfInterest[] = [];
  
  const centerLng = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;
  const areaWidth = bounds.east - bounds.west;
  const areaHeight = bounds.north - bounds.south;
  
  // High Priority NAI (Named Area of Interest)
  const nai1Polygon: [number, number, number][] = [
    [centerLng - areaWidth * 0.15, centerLat - areaHeight * 0.1, 50],
    [centerLng + areaWidth * 0.05, centerLat - areaHeight * 0.1, 50],
    [centerLng + areaWidth * 0.05, centerLat + areaHeight * 0.05, 50],
    [centerLng - areaWidth * 0.15, centerLat + areaHeight * 0.05, 50]
  ];
  
  aois.push({
    id: 'nai-1',
    name: 'NAI ALPHA',
    type: 'NAI',
    polygon: nai1Polygon,
    priority: 'HIGH',
    description: 'High-value target area'
  });
  
  // Medium Priority TAI (Target Area of Interest)
  const tai1Polygon: [number, number, number][] = [];
  const centerX = centerLng + areaWidth * 0.2;
  const centerY = centerLat + areaHeight * 0.15;
  const radius = areaWidth * 0.08;
  
  // Circular TAI
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.7; // Elliptical
    tai1Polygon.push([x, y, 60]);
  }
  
  aois.push({
    id: 'tai-1',
    name: 'TAI BRAVO',
    type: 'TAI',
    polygon: tai1Polygon,
    priority: 'MEDIUM',
    description: 'Secondary target zone'
  });
  
  // Low Priority Engagement Area
  const ea1Polygon: [number, number, number][] = [
    [centerLng - areaWidth * 0.25, centerLat + areaHeight * 0.2, 40],
    [centerLng - areaWidth * 0.1, centerLat + areaHeight * 0.25, 40],
    [centerLng - areaWidth * 0.05, centerLat + areaHeight * 0.35, 40],
    [centerLng - areaWidth * 0.2, centerLat + areaHeight * 0.35, 40]
  ];
  
  aois.push({
    id: 'ea-1',
    name: 'EA CHARLIE',
    type: 'EA',
    polygon: ea1Polygon,
    priority: 'LOW',
    description: 'Engagement area - supporting operations'
  });
  
  return aois;
}

// Generate sample sensor cones
export function generateSampleSensorCones(
  bounds: { north: number; south: number; east: number; west: number },
  _infrastructure: unknown[] = []
): SensorCone[] {
  const sensorCones: SensorCone[] = [];
  
  const centerLng = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;
  const areaWidth = bounds.east - bounds.west;
  const areaHeight = bounds.north - bounds.south;
  
  // Tower-based radar sensor
  sensorCones.push({
    id: 'radar-1',
    sensorId: 'tower-radar-alpha',
    position: [
      centerLng - areaWidth * 0.3,
      centerLat - areaHeight * 0.2,
      120 // 120m altitude
    ],
    bearing: Math.PI / 4, // 45 degrees (NE)
    fieldOfView: Math.PI / 3, // 60 degrees FOV
    range: 2000, // 2km range
    sectorHeight: 200, // 200m vertical coverage
    confidence: 0.85,
    sensorType: 'RADAR' as SensorType
  });
  
  // Thermal imaging sensor
  sensorCones.push({
    id: 'thermal-1',
    sensorId: 'dome-thermal-bravo',
    position: [
      centerLng + areaWidth * 0.25,
      centerLat + areaHeight * 0.1,
      80 // 80m altitude
    ],
    bearing: -Math.PI / 6, // -30 degrees (NW)
    fieldOfView: Math.PI / 4, // 45 degrees FOV
    range: 1500, // 1.5km range
    minRange: 100, // 100m minimum range
    sectorHeight: 150, // 150m vertical coverage
    confidence: 0.7,
    sensorType: 'THERMAL' as SensorType
  });
  
  // Visual observation post
  sensorCones.push({
    id: 'visual-1',
    sensorId: 'op-visual-charlie',
    position: [
      centerLng,
      centerLat + areaHeight * 0.25,
      60 // 60m altitude
    ],
    bearing: Math.PI, // 180 degrees (South)
    fieldOfView: Math.PI / 2, // 90 degrees FOV
    range: 800, // 800m range
    sectorHeight: 100, // 100m vertical coverage
    confidence: 0.6,
    sensorType: 'VISUAL' as SensorType
  });
  
  // Acoustic sensor
  sensorCones.push({
    id: 'acoustic-1',
    sensorId: 'building-acoustic-delta',
    position: [
      centerLng - areaWidth * 0.1,
      centerLat + areaHeight * 0.3,
      40 // 40m altitude
    ],
    bearing: -Math.PI / 2, // -90 degrees (West)
    fieldOfView: Math.PI / 1.5, // 120 degrees FOV
    range: 1200, // 1.2km range
    sectorHeight: 80, // 80m vertical coverage
    confidence: 0.5,
    sensorType: 'ACOUSTIC' as SensorType
  });
  
  return sensorCones;
}

// Generate sample tooltip data for entities
export function generateTooltipData(object: unknown): string {
  if (!object || typeof object !== 'object') return '';
  
  const obj = object as Record<string, unknown>;
  
  // Aircraft tooltip
  if (obj.id && typeof obj.heading === 'number') {
    const heading = ((obj.heading * 180 / Math.PI) + 360) % 360;
    return `
AIRCRAFT: ${String(obj.id).toUpperCase()}
TYPE: ${String(obj.type).toUpperCase()}
ALT: ${obj.altitude}m
HDG: ${heading.toFixed(0)}°
SPD: ${obj.speed}m/s
STATUS: ${obj.isHostile ? 'HOSTILE' : 'FRIENDLY'}
    `.trim();
  }
  
  // Infrastructure tooltip
  if (obj.type && ['tower', 'dome', 'building'].includes(String(obj.type))) {
    const position = obj.position as [number, number, number];
    return `
INFRASTRUCTURE: ${String(obj.id).toUpperCase()}
TYPE: ${String(obj.type).toUpperCase()}
POS: ${position[1].toFixed(5)}°N ${position[0].toFixed(5)}°E
ALT: ${position[2]}m
SCALE: ${(Number(obj.scale) * 100).toFixed(0)}%
STATUS: ${obj.isDestroyed ? 'DESTROYED' : 'OPERATIONAL'}
    `.trim();
  }
  
  // Sensor cone tooltip
  if (obj.sensorType) {
    const bearing = ((Number(obj.bearing) * 180 / Math.PI) + 360) % 360;
    const fov = Number(obj.fieldOfView) * 180 / Math.PI;
    return `
SENSOR: ${String(obj.id).toUpperCase()}
TYPE: ${obj.sensorType}
BEARING: ${bearing.toFixed(0)}°
FOV: ${fov.toFixed(0)}°
RANGE: ${obj.range}m
CONFIDENCE: ${(Number(obj.confidence) * 100).toFixed(0)}%
    `.trim();
  }
  
  // Boundary tooltip
  if (obj.name && obj.type) {
    const path = obj.path as unknown[];
    return `
BOUNDARY: ${obj.name}
TYPE: ${obj.type}
LENGTH: ${path ? path.length : 0} waypoints
ANIMATED: ${obj.animated ? 'YES' : 'NO'}
    `.trim();
  }
  
  // AOI tooltip
  if (obj.polygon && obj.priority) {
    return `
AOI: ${obj.name}
TYPE: ${obj.type}
PRIORITY: ${obj.priority}
DESC: ${obj.description || 'N/A'}
    `.trim();
  }
  
  return 'UNKNOWN ENTITY';
}