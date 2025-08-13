/**
 * Vector-based aircraft glyphs using shaders
 * Replaces PNG sprites with procedural vector graphics
 */

export interface AircraftGlyphConfig {
  size: number;
  color: [number, number, number, number];
  type: 'fighter' | 'bomber' | 'transport' | 'helicopter' | 'drone';
  heading: number; // radians
  friendlyStatus: 'friendly' | 'hostile' | 'unknown' | 'suspect';
}

/**
 * Generate chevron aircraft glyph geometry
 */
export function generateChevronGlyph(config: Partial<AircraftGlyphConfig> = {}): {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
} {
  const { size = 20, type = 'fighter' } = config;
  
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  
  // Define chevron shape based on aircraft type
  let shapeVertices: number[][];
  
  switch (type) {
    case 'fighter':
      // Sharp chevron for fighters
      shapeVertices = [
        [0, size * 0.8],      // Nose
        [-size * 0.3, 0],     // Left wing tip
        [-size * 0.1, -size * 0.2], // Left wing root
        [0, -size * 0.1],     // Tail center
        [size * 0.1, -size * 0.2],  // Right wing root
        [size * 0.3, 0],      // Right wing tip
      ];
      break;
      
    case 'bomber':
      // Wider chevron for bombers
      shapeVertices = [
        [0, size * 0.6],      // Nose
        [-size * 0.5, 0],     // Left wing tip
        [-size * 0.15, -size * 0.3], // Left wing root
        [0, -size * 0.2],     // Tail center
        [size * 0.15, -size * 0.3],  // Right wing root
        [size * 0.5, 0],      // Right wing tip
      ];
      break;
      
    case 'transport':
      // Rectangular for transport
      shapeVertices = [
        [0, size * 0.7],      // Nose
        [-size * 0.4, size * 0.2], // Left wing front
        [-size * 0.4, -size * 0.3], // Left wing back
        [0, -size * 0.1],     // Tail center
        [size * 0.4, -size * 0.3],  // Right wing back
        [size * 0.4, size * 0.2],   // Right wing front
      ];
      break;
      
    case 'helicopter':
      // Cross shape for helicopters
      shapeVertices = [
        [0, size * 0.4],      // Top
        [-size * 0.1, size * 0.1], // Left top
        [-size * 0.4, 0],     // Left
        [-size * 0.1, -size * 0.1], // Left bottom
        [0, -size * 0.4],     // Bottom
        [size * 0.1, -size * 0.1],  // Right bottom
        [size * 0.4, 0],      // Right
        [size * 0.1, size * 0.1],   // Right top
      ];
      break;
      
    case 'drone':
      // Diamond shape for drones
      shapeVertices = [
        [0, size * 0.5],      // Top
        [-size * 0.25, 0],    // Left
        [0, -size * 0.5],     // Bottom
        [size * 0.25, 0],     // Right
      ];
      break;
      
    default:
      shapeVertices = [
        [0, size * 0.8],
        [-size * 0.3, 0],
        [0, -size * 0.1],
        [size * 0.3, 0],
      ];
  }
  
  // Add center vertex for triangle fan
  positions.push(0, 0, 0);
  colors.push(1, 1, 1, 1); // Base color (will be overridden by shader)
  
  // Add shape vertices
  shapeVertices.forEach(([x, y]) => {
    positions.push(x, y, 0);
    colors.push(1, 1, 1, 1);
  });
  
  // Generate triangle fan indices
  for (let i = 1; i < shapeVertices.length; i++) {
    const next = i === shapeVertices.length - 1 ? 1 : i + 1;
    indices.push(0, i, next);
  }
  
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices)
  };
}

/**
 * Aircraft glyph vertex shader
 */
export const aircraftVertexShader = `
attribute vec3 positions;
attribute vec4 colors;
attribute vec3 instancePositions;
attribute float instanceHeadings;
attribute vec4 instanceColors;
attribute float instanceSizes;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 vColor;
varying vec2 vUV;

void main() {
  // Rotate based on heading
  float cosHeading = cos(instanceHeadings);
  float sinHeading = sin(instanceHeadings);
  
  mat2 rotationMatrix = mat2(
    cosHeading, -sinHeading,
    sinHeading, cosHeading
  );
  
  vec2 rotatedPos = rotationMatrix * positions.xy * instanceSizes;
  vec3 worldPos = vec3(rotatedPos, positions.z) + instancePositions;
  
  gl_Position = uPMatrix * uMVMatrix * vec4(worldPos, 1.0);
  
  vColor = instanceColors;
  vUV = positions.xy / instanceSizes;
}
`;

/**
 * Aircraft glyph fragment shader with procedural effects
 */
export const aircraftFragmentShader = `
precision highp float;

varying vec4 vColor;
varying vec2 vUV;

uniform float uTime;
uniform bool uShowRimLight;

void main() {
  vec2 center = vec2(0.0);
  float dist = length(vUV - center);
  
  // Base aircraft color
  vec3 baseColor = vColor.rgb;
  
  // Add rim light effect
  float rimLight = 0.0;
  if (uShowRimLight) {
    rimLight = smoothstep(0.6, 1.0, dist) * 0.3;
    baseColor += vec3(0.0, 0.8, 1.0) * rimLight; // Cyan rim
  }
  
  // Add subtle pulse for active aircraft
  float pulse = 1.0 + sin(uTime * 4.0) * 0.1;
  baseColor *= pulse;
  
  // Anti-aliasing at edges
  float alpha = vColor.a * smoothstep(1.0, 0.8, dist);
  
  gl_FragColor = vec4(baseColor, alpha);
}
`;

/**
 * Color schemes for different aircraft statuses
 */
export const AIRCRAFT_COLORS: Record<string, [number, number, number, number]> = {
  friendly: [0.2, 0.8, 0.2, 1.0],    // Green
  hostile: [0.9, 0.2, 0.2, 1.0],     // Red
  unknown: [0.9, 0.9, 0.2, 1.0],     // Yellow
  suspect: [0.9, 0.5, 0.2, 1.0],     // Orange
  neutral: [0.5, 0.5, 0.5, 1.0],     // Gray
};

/**
 * Create aircraft layer data for deck.gl
 */
export function createAircraftLayerData(aircraft: Array<{
  id: string;
  position: [number, number, number];
  heading: number;
  altitude: number;
  type: 'fighter' | 'bomber' | 'transport' | 'helicopter' | 'drone';
  status: 'friendly' | 'hostile' | 'unknown' | 'suspect';
  speed?: number;
}>) {
  return aircraft.map(entity => {
    const baseSize = 30; // Base size in meters
    const altitudeScale = 1 + (entity.altitude / 10000) * 0.5; // Scale by altitude
    const speedScale = entity.speed ? 1 + (entity.speed / 1000) * 0.2 : 1;
    
    return {
      id: entity.id,
      position: entity.position,
      heading: entity.heading,
      size: baseSize * altitudeScale * speedScale,
      color: AIRCRAFT_COLORS[entity.status] || AIRCRAFT_COLORS.unknown,
      type: entity.type,
      status: entity.status,
      altitude: entity.altitude,
      speed: entity.speed || 0
    };
  });
}

/**
 * Generate procedural aircraft symbols for different types
 */
export function generateAircraftSymbol(type: string, size: number = 1): string {
  // Generate SVG path data for different aircraft types
  const symbols: Record<string, string> = {
    fighter: `M0,${size * 0.8} L${-size * 0.3},0 L0,${-size * 0.1} L${size * 0.3},0 Z`,
    bomber: `M0,${size * 0.6} L${-size * 0.5},0 L0,${-size * 0.2} L${size * 0.5},0 Z`,
    transport: `M0,${size * 0.7} L${-size * 0.4},${size * 0.2} L${-size * 0.4},${-size * 0.3} L0,${-size * 0.1} L${size * 0.4},${-size * 0.3} L${size * 0.4},${size * 0.2} Z`,
    helicopter: `M0,${size * 0.4} L${-size * 0.4},0 L0,${-size * 0.4} L${size * 0.4},0 Z M${-size * 0.6},0 L${size * 0.6},0`,
    drone: `M0,${size * 0.5} L${-size * 0.25},0 L0,${-size * 0.5} L${size * 0.25},0 Z`
  };
  
  return symbols[type] || symbols.fighter;
}

/**
 * Create SVG aircraft icon
 */
export function createAircraftSVG(config: AircraftGlyphConfig): string {
  const { size, color, type, heading } = config;
  const [r, g, b, a] = color;
  const fillColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  
  const pathData = generateAircraftSymbol(type, size);
  const transform = `rotate(${heading * 180 / Math.PI})`;
  
  return `
    <svg width="${size * 2}" height="${size * 2}" viewBox="${-size} ${-size} ${size * 2} ${size * 2}">
      <g transform="${transform}">
        <path d="${pathData}" fill="${fillColor}" stroke="rgba(0, 200, 255, 0.5)" stroke-width="1"/>
      </g>
    </svg>
  `;
}

/**
 * Convert SVG to data URL for use as texture
 */
export function svgToDataURL(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Aircraft trail generator for flight paths
 */
export function generateAircraftTrail(positions: Array<[number, number, number]>, config: {
  color: [number, number, number, number];
  width: number;
  fadeLength: number;
}): Array<{
  position: [number, number, number];
  color: [number, number, number, number];
  width: number;
}> {
  const { color, width, fadeLength } = config;
  const trail = [];
  
  for (let i = 0; i < positions.length; i++) {
    const fadeRatio = Math.max(0, 1 - (positions.length - i - 1) / fadeLength);
    const fadedColor: [number, number, number, number] = [
      color[0],
      color[1], 
      color[2],
      color[3] * fadeRatio
    ];
    
    trail.push({
      position: positions[i],
      color: fadedColor,
      width: width * fadeRatio
    });
  }
  
  return trail;
}

/**
 * Utility to generate test aircraft data
 */
export function generateTestAircraft(bounds: { north: number; south: number; east: number; west: number }) {
  const types: Array<'fighter' | 'bomber' | 'transport' | 'helicopter' | 'drone'> = ['fighter', 'bomber', 'transport', 'helicopter', 'drone'];
  const statuses: Array<'friendly' | 'hostile' | 'unknown' | 'suspect'> = ['friendly', 'hostile', 'unknown', 'suspect'];
  const aircraft = [];
  
  for (let i = 0; i < 15; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
    const lng = bounds.west + Math.random() * (bounds.east - bounds.west);
    const altitude = Math.random() * 12000 + 1000; // 1000-13000m
    const heading = Math.random() * Math.PI * 2;
    const speed = Math.random() * 800 + 200; // 200-1000 km/h
    
    aircraft.push({
      id: `aircraft-${i}`,
      position: [lng, lat, altitude] as [number, number, number],
      heading,
      altitude,
      type,
      status,
      speed
    });
  }
  
  return aircraft;
}