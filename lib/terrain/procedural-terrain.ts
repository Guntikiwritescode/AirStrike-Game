/**
 * Procedural terrain generation using Perlin noise
 * Fallback for external terrain tiles when they're unavailable
 */

export class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed: number = 0) {
    // Generate permutation table based on seed
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    // Shuffle using seed-based random
    const random = this.seededRandom(seed);
    for (let i = 255; i >= 1; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    
    // Duplicate for overflow
    this.p = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i % 256];
    }
  }

  private seededRandom(seed: number) {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    
    return function() {
      seed = (a * seed + c) % m;
      return seed / (m - 1);
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number = 0): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, z: number = 0): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z),
          u
        ),
        this.lerp(
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z),
          u
        ),
        v
      ),
      this.lerp(
        this.lerp(
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1),
          u
        ),
        this.lerp(
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
          u
        ),
        v
      ),
      w
    );
  }

  /**
   * Generate fractal noise by combining multiple octaves
   */
  fractalNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5, scale: number = 1): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

export interface TerrainConfig {
  width: number;
  height: number;
  resolution: number;
  elevationScale: number;
  seed: number;
  octaves: number;
  persistence: number;
  frequency: number;
}

export interface TerrainPoint {
  position: [number, number, number];
  normal: [number, number, number];
  color: [number, number, number];
}

export class ProceduralTerrain {
  private noise: PerlinNoise;
  private config: TerrainConfig;

  constructor(config: Partial<TerrainConfig> = {}) {
    this.config = {
      width: 10000, // meters
      height: 10000, // meters
      resolution: 256, // grid points per side
      elevationScale: 500, // max elevation in meters
      seed: 42,
      octaves: 6,
      persistence: 0.6,
      frequency: 0.001, // frequency per meter
      ...config
    };
    
    this.noise = new PerlinNoise(this.config.seed);
  }

  /**
   * Get elevation at a specific world coordinate
   */
  getElevation(worldX: number, worldY: number): number {
    const noiseValue = this.noise.fractalNoise(
      worldX * this.config.frequency,
      worldY * this.config.frequency,
      this.config.octaves,
      this.config.persistence
    );
    
    // Convert from [-1, 1] to [0, elevationScale]
    return (noiseValue * 0.5 + 0.5) * this.config.elevationScale;
  }

  /**
   * Generate terrain mesh data for deck.gl
   */
  generateMeshData(bounds: { north: number; south: number; east: number; west: number }): {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
  } {
    const { resolution } = this.config;
    const width = bounds.east - bounds.west;
    const height = bounds.north - bounds.south;
    
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Generate vertices
    for (let y = 0; y <= resolution; y++) {
      for (let x = 0; x <= resolution; x++) {
        const worldX = bounds.west + (x / resolution) * width;
        const worldY = bounds.south + (y / resolution) * height;
        const elevation = this.getElevation(worldX, worldY);

        // Position (longitude, latitude, elevation)
        positions.push(worldX, worldY, elevation);

        // Calculate normal using neighboring points
        const step = width / resolution * 0.1;
        const elevationLeft = this.getElevation(worldX - step, worldY);
        const elevationRight = this.getElevation(worldX + step, worldY);
        const elevationDown = this.getElevation(worldX, worldY - step);
        const elevationUp = this.getElevation(worldX, worldY + step);

        const normalX = (elevationLeft - elevationRight) / (2 * step);
        const normalY = (elevationDown - elevationUp) / (2 * step);
        const normalZ = 1;

        // Normalize
        const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        normals.push(normalX / length, normalY / length, normalZ / length);

        // Color based on elevation (tactical color scheme)
        const normalizedElevation = elevation / this.config.elevationScale;
        const r = Math.max(0.1, 0.2 + normalizedElevation * 0.3); // Dark tactical base
        const g = Math.max(0.12, 0.25 + normalizedElevation * 0.4);
        const b = Math.max(0.15, 0.3 + normalizedElevation * 0.2);
        colors.push(r, g, b);
      }
    }

    // Generate indices for triangles
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const topLeft = y * (resolution + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * (resolution + 1) + x;
        const bottomRight = bottomLeft + 1;

        // Two triangles per quad
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      colors: new Float32Array(colors),
      indices: new Uint32Array(indices)
    };
  }

  /**
   * Generate height map for deck.gl TerrainLayer fallback
   */
  generateHeightMap(bounds: { north: number; south: number; east: number; west: number }, size: number = 512): {
    data: Uint8Array;
    width: number;
    height: number;
  } {
    const width = size;
    const height = size;
    const data = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = bounds.west + (x / width) * (bounds.east - bounds.west);
        const worldY = bounds.north - (y / height) * (bounds.north - bounds.south);
        
        const elevation = this.getElevation(worldX, worldY);
        const normalizedElevation = Math.max(0, Math.min(255, (elevation / this.config.elevationScale) * 255));
        
        data[y * width + x] = normalizedElevation;
      }
    }

    return { data, width, height };
  }

  /**
   * Get terrain configuration for external use
   */
  getConfig(): TerrainConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating procedural terrain
 */
export function createProceduralTerrain(config?: Partial<TerrainConfig>): ProceduralTerrain {
  return new ProceduralTerrain(config);
}

/**
 * Create a data URL for height map texture
 */
export function createHeightMapDataURL(terrain: ProceduralTerrain, bounds: { north: number; south: number; east: number; west: number }): string {
  const { data, width, height } = terrain.generateHeightMap(bounds);
  
  // Create canvas and render height map
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const pixelIndex = i * 4;
    imageData.data[pixelIndex] = value;     // R
    imageData.data[pixelIndex + 1] = value; // G
    imageData.data[pixelIndex + 2] = value; // B
    imageData.data[pixelIndex + 3] = 255;   // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}