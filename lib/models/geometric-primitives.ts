/**
 * Geometric primitive generators for SimpleMesh layers
 * Replaces GLB model dependencies with procedural primitives
 */

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  texCoords?: Float32Array;
}

export interface PrimitiveConfig {
  radius?: number;
  height?: number;
  width?: number;
  depth?: number;
  segments?: number;
  color?: [number, number, number];
}

export type InfrastructureType = 'tower' | 'antenna' | 'dome' | 'building' | 'radar' | 'bunker';

/**
 * Generate a box/cube primitive
 */
export function generateBoxMesh(config: PrimitiveConfig = {}): MeshData {
  const { width = 1, height = 1, depth = 1 } = config;
  
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;

  // Positions for 8 vertices of a box
  const positions = new Float32Array([
    // Front face
    -w, -h,  d,  w, -h,  d,  w,  h,  d, -w,  h,  d,
    // Back face
    -w, -h, -d, -w,  h, -d,  w,  h, -d,  w, -h, -d,
    // Top face
    -w,  h, -d, -w,  h,  d,  w,  h,  d,  w,  h, -d,
    // Bottom face
    -w, -h, -d,  w, -h, -d,  w, -h,  d, -w, -h,  d,
    // Right face
     w, -h, -d,  w,  h, -d,  w,  h,  d,  w, -h,  d,
    // Left face
    -w, -h, -d, -w, -h,  d, -w,  h,  d, -w,  h, -d
  ]);

  // Normals for each face
  const normals = new Float32Array([
    // Front face
     0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
    // Back face
     0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
    // Top face
     0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,
    // Bottom face
     0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
    // Right face
     1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
    // Left face
    -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0
  ]);

  // Indices for triangles (2 triangles per face)
  const indices = new Uint32Array([
     0,  1,  2,  0,  2,  3,    // Front
     4,  5,  6,  4,  6,  7,    // Back
     8,  9, 10,  8, 10, 11,    // Top
    12, 13, 14, 12, 14, 15,    // Bottom
    16, 17, 18, 16, 18, 19,    // Right
    20, 21, 22, 20, 22, 23     // Left
  ]);

  return { positions, normals, indices };
}

/**
 * Generate a cylinder primitive
 */
export function generateCylinderMesh(config: PrimitiveConfig = {}): MeshData {
  const { radius = 0.5, height = 1, segments = 16 } = config;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Generate vertices for cylinder sides
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Bottom vertex
    positions.push(x, -height / 2, z);
    normals.push(x / radius, 0, z / radius);

    // Top vertex
    positions.push(x, height / 2, z);
    normals.push(x / radius, 0, z / radius);
  }

  // Generate side triangles
  for (let i = 0; i < segments; i++) {
    const base = i * 2;
    const next = ((i + 1) % (segments + 1)) * 2;

    // Two triangles for each segment
    indices.push(base, next, base + 1);
    indices.push(base + 1, next, next + 1);
  }

  // Add bottom cap center
  const bottomCenter = positions.length / 3;
  positions.push(0, -height / 2, 0);
  normals.push(0, -1, 0);

  // Add top cap center
  const topCenter = positions.length / 3;
  positions.push(0, height / 2, 0);
  normals.push(0, 1, 0);

  // Generate bottom cap triangles
  for (let i = 0; i < segments; i++) {
    const current = i * 2;
    const next = ((i + 1) % (segments + 1)) * 2;
    indices.push(bottomCenter, next, current);
  }

  // Generate top cap triangles
  for (let i = 0; i < segments; i++) {
    const current = i * 2 + 1;
    const next = ((i + 1) % (segments + 1)) * 2 + 1;
    indices.push(topCenter, current, next);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices)
  };
}

/**
 * Generate a cone primitive
 */
export function generateConeMesh(config: PrimitiveConfig = {}): MeshData {
  const { radius = 0.5, height = 1, segments = 16 } = config;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Add apex vertex
  positions.push(0, height / 2, 0);
  normals.push(0, 1, 0);

  // Generate base vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positions.push(x, -height / 2, z);
    
    // Calculate normal for cone side
    const sideLength = Math.sqrt(radius * radius + height * height);
    const normalY = radius / sideLength;
    const normalXZ = height / sideLength;
    normals.push(x / radius * normalXZ, normalY, z / radius * normalXZ);
  }

  // Generate side triangles
  for (let i = 0; i < segments; i++) {
    const current = i + 1;
    const next = ((i + 1) % (segments + 1)) + 1;
    indices.push(0, next, current);
  }

  // Add base center
  const baseCenter = positions.length / 3;
  positions.push(0, -height / 2, 0);
  normals.push(0, -1, 0);

  // Generate base triangles
  for (let i = 0; i < segments; i++) {
    const current = i + 1;
    const next = ((i + 1) % (segments + 1)) + 1;
    indices.push(baseCenter, current, next);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices)
  };
}

/**
 * Generate a sphere/dome primitive
 */
export function generateSphereMesh(config: PrimitiveConfig = {}): MeshData {
  const { radius = 0.5, segments = 16 } = config;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Generate vertices
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat / segments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon / segments) * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta * radius;
      const y = cosTheta * radius;
      const z = sinPhi * sinTheta * radius;

      positions.push(x, y, z);
      normals.push(x / radius, y / radius, z / radius);
    }
  }

  // Generate indices
  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices)
  };
}

/**
 * Infrastructure type configurations
 */
export const INFRASTRUCTURE_CONFIGS: Record<InfrastructureType, { 
  geometry: 'box' | 'cylinder' | 'cone' | 'sphere';
  config: PrimitiveConfig;
  color: [number, number, number];
}> = {
  tower: {
    geometry: 'cylinder',
    config: { radius: 2, height: 25, segments: 8 },
    color: [0.7, 0.7, 0.8] // Light gray
  },
  antenna: {
    geometry: 'cone',
    config: { radius: 1.5, height: 15, segments: 6 },
    color: [0.9, 0.6, 0.3] // Orange
  },
  dome: {
    geometry: 'sphere',
    config: { radius: 8, segments: 12 },
    color: [0.4, 0.6, 0.9] // Blue
  },
  building: {
    geometry: 'box',
    config: { width: 12, height: 8, depth: 12 },
    color: [0.6, 0.5, 0.4] // Brown
  },
  radar: {
    geometry: 'cylinder',
    config: { radius: 6, height: 4, segments: 12 },
    color: [0.3, 0.8, 0.3] // Green
  },
  bunker: {
    geometry: 'box',
    config: { width: 8, height: 3, depth: 8 },
    color: [0.5, 0.5, 0.3] // Olive
  }
};

/**
 * Generate mesh data for infrastructure type
 */
export function generateInfrastructureMesh(type: InfrastructureType): {
  meshData: MeshData;
  color: [number, number, number];
} {
  const config = INFRASTRUCTURE_CONFIGS[type];
  
  let meshData: MeshData;
  switch (config.geometry) {
    case 'box':
      meshData = generateBoxMesh(config.config);
      break;
    case 'cylinder':
      meshData = generateCylinderMesh(config.config);
      break;
    case 'cone':
      meshData = generateConeMesh(config.config);
      break;
    case 'sphere':
      meshData = generateSphereMesh(config.config);
      break;
    default:
      meshData = generateBoxMesh(config.config);
  }
  
  return {
    meshData,
    color: config.color
  };
}

/**
 * Create SimpleMeshLayer data for infrastructure entities
 */
export function createInfrastructureLayerData(entities: Array<{
  id: string;
  type: InfrastructureType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}>) {
  return entities.map(entity => {
    const { meshData, color } = generateInfrastructureMesh(entity.type);
    
    return {
      id: entity.id,
      mesh: meshData,
      position: entity.position,
      orientation: entity.rotation || [0, 0, 0],
      scale: entity.scale || 1,
      color: [...color, 1] as [number, number, number, number],
      type: entity.type
    };
  });
}

/**
 * Utility to generate test infrastructure data
 */
export function generateTestInfrastructure(bounds: { north: number; south: number; east: number; west: number }) {
  const types: InfrastructureType[] = ['tower', 'antenna', 'dome', 'building', 'radar', 'bunker'];
  const entities = [];
  
  for (let i = 0; i < 20; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
    const lng = bounds.west + Math.random() * (bounds.east - bounds.west);
    
    entities.push({
      id: `infra-${i}`,
      type,
      position: [lng, lat, 0] as [number, number, number],
      rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
      scale: 0.5 + Math.random() * 0.5
    });
  }
  
  return entities;
}