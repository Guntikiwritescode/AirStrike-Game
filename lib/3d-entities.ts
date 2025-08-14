import { InfrastructureEntity, AircraftEntity, FlightPath, FlightWaypoint } from '@/lib/types';

// Generate sample infrastructure entities based on game grid
export function generateSampleInfrastructure(
  grid: unknown[][],
  bounds: { north: number; south: number; east: number; west: number }
): InfrastructureEntity[] {
  const infrastructure: InfrastructureEntity[] = [];
  const gridSize = grid.length;
  
  // Calculate grid cell dimensions
  const lngStep = (bounds.east - bounds.west) / gridSize;
  const latStep = (bounds.north - bounds.south) / gridSize;
  
  // Add some infrastructure entities at strategic locations
  
  // Place infrastructure at corners and center
  const positions = [
    { x: 2, y: 2, type: 'tower' as const },
    { x: gridSize - 3, y: 2, type: 'dome' as const },
    { x: 2, y: gridSize - 3, type: 'building' as const },
    { x: gridSize - 3, y: gridSize - 3, type: 'tower' as const },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2), type: 'dome' as const },
    { x: Math.floor(gridSize / 3), y: Math.floor(gridSize / 3), type: 'building' as const },
    { x: Math.floor(2 * gridSize / 3), y: Math.floor(2 * gridSize / 3), type: 'tower' as const }
  ];
  
  positions.forEach((pos, index) => {
    const lng = bounds.west + (pos.x + 0.5) * lngStep;
    const lat = bounds.south + (pos.y + 0.5) * latStep;
    const altitude = 50 + Math.random() * 100; // 50-150m elevation
    
    infrastructure.push({
      id: `infra-${index}`,
      type: pos.type,
      position: [lng, lat, altitude],
      rotation: [0, Math.random() * Math.PI * 2, 0], // Random rotation
      scale: 0.8 + Math.random() * 0.4, // 0.8-1.2 scale
      isDestroyed: false,
      gridX: pos.x,
      gridY: pos.y
    });
  });
  
  return infrastructure;
}

// Generate sample aircraft with flight paths
export function generateSampleAircraft(
  bounds: { north: number; south: number; east: number; west: number }
): { aircraft: AircraftEntity[]; flightPaths: FlightPath[] } {
  const aircraft: AircraftEntity[] = [];
  const flightPaths: FlightPath[] = [];
  
  // Center coordinates
  const centerLng = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;
  const areaWidth = bounds.east - bounds.west;
  const areaHeight = bounds.north - bounds.south;
  
  // Fighter aircraft patrol
  const fighter1: AircraftEntity = {
    id: 'fighter-1',
    type: 'fighter',
    position: [
      centerLng - areaWidth * 0.3,
      centerLat + areaHeight * 0.2,
      2000 // 2km altitude
    ],
    heading: Math.PI / 4, // 45 degrees
    speed: 300, // 300 m/s
    altitude: 2000,
    isHostile: false,
    flightPathId: 'patrol-1'
  };
  
  // Hostile drone
  const drone1: AircraftEntity = {
    id: 'drone-1',
    type: 'drone',
    position: [
      centerLng + areaWidth * 0.4,
      centerLat - areaHeight * 0.1,
      500 // 500m altitude
    ],
    heading: -Math.PI / 3, // -60 degrees
    speed: 50, // 50 m/s
    altitude: 500,
    isHostile: true,
    flightPathId: 'recon-1'
  };
  
  // Transport aircraft
  const transport1: AircraftEntity = {
    id: 'transport-1',
    type: 'transport',
    position: [
      centerLng,
      centerLat + areaHeight * 0.4,
      3000 // 3km altitude
    ],
    heading: Math.PI, // 180 degrees (south)
    speed: 150, // 150 m/s
    altitude: 3000,
    isHostile: false,
    flightPathId: 'supply-1'
  };
  
  aircraft.push(fighter1, drone1, transport1);
  
  // Create flight paths with 3D arcs
  const fighterPath: FlightPath = {
    id: 'patrol-1',
    aircraftId: 'fighter-1',
    isActive: true,
    waypoints: generatePatrolWaypoints(fighter1.position, bounds, 2000)
  };
  
  const dronePath: FlightPath = {
    id: 'recon-1',
    aircraftId: 'drone-1',
    isActive: true,
    waypoints: generateReconWaypoints(drone1.position, bounds, 500)
  };
  
  const transportPath: FlightPath = {
    id: 'supply-1',
    aircraftId: 'transport-1',
    isActive: true,
    waypoints: generateSupplyWaypoints(transport1.position, bounds, 3000)
  };
  
  flightPaths.push(fighterPath, dronePath, transportPath);
  
  return { aircraft, flightPaths };
}

// Generate patrol waypoints in a circular pattern
function generatePatrolWaypoints(
  startPos: [number, number, number],
  bounds: { north: number; south: number; east: number; west: number },
  baseAltitude: number
): FlightWaypoint[] {
  const waypoints: FlightWaypoint[] = [];
  const centerLng = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;
  const radius = Math.min(bounds.east - bounds.west, bounds.north - bounds.south) * 0.3;
  
  // Create circular patrol with altitude variation
  for (let i = 0; i <= 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const lng = centerLng + Math.cos(angle) * radius;
    const lat = centerLat + Math.sin(angle) * radius;
    const altitude = baseAltitude + Math.sin(angle * 2) * 300; // Altitude variation ±300m
    
    waypoints.push({
      position: [lng, lat, altitude],
      timestamp: Date.now() + i * 30000, // 30 seconds per waypoint
      speed: 300
    });
  }
  
  return waypoints;
}

// Generate reconnaissance waypoints in a search pattern
function generateReconWaypoints(
  startPos: [number, number, number],
  bounds: { north: number; south: number; east: number; west: number },
  baseAltitude: number
): FlightWaypoint[] {
  const waypoints: FlightWaypoint[] = [];
  const areaWidth = bounds.east - bounds.west;
  const areaHeight = bounds.north - bounds.south;
  
  // Zigzag search pattern
  const rows = 3;
  const cols = 4;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const direction = row % 2 === 0 ? col : cols - 1 - col; // Alternate direction
      const lng = bounds.west + (direction / (cols - 1)) * areaWidth;
      const lat = bounds.south + (row / (rows - 1)) * areaHeight;
      const altitude = baseAltitude + (row * 100); // Gradual altitude increase
      
      waypoints.push({
        position: [lng, lat, altitude],
        timestamp: Date.now() + (row * cols + col) * 20000, // 20 seconds per waypoint
        speed: 50
      });
    }
  }
  
  return waypoints;
}

// Generate supply waypoints in a straight line with altitude arc
function generateSupplyWaypoints(
  startPos: [number, number, number],
  bounds: { north: number; south: number; east: number; west: number },
  baseAltitude: number
): FlightWaypoint[] {
  const waypoints: FlightWaypoint[] = [];
  
  // Straight line from north to south with altitude arc
  const segments = 6;
  for (let i = 0; i <= segments; i++) {
    const progress = i / segments;
    const lng = (bounds.east + bounds.west) / 2; // Center longitude
    const lat = bounds.north - progress * (bounds.north - bounds.south);
    
    // Create altitude arc - higher in the middle
    const altitudeFactor = Math.sin(progress * Math.PI);
    const altitude = baseAltitude + altitudeFactor * 1000; // Up to +1km at arc peak
    
    waypoints.push({
      position: [lng, lat, altitude],
      timestamp: Date.now() + i * 40000, // 40 seconds per waypoint
      speed: 150
    });
  }
  
  return waypoints;
}