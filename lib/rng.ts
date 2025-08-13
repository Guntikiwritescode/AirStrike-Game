import seedrandom from 'seedrandom';

export class SeededRNG {
  private rng: seedrandom.PRNG;
  private hasNextGaussian: boolean = false;
  private nextGaussian: number = 0;
  
  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }
  
  /**
   * Generate random float between 0 and 1
   */
  random(): number {
    return this.rng();
  }
  
  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }
  
  /**
   * Generate random float between min and max
   */
  randFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
  
  /**
   * Sample from Bernoulli distribution
   */
  bernoulli(p: number): boolean {
    return this.random() < p;
  }
  
  /**
   * Sample from normal distribution using Box-Muller transform
   * Uses cached value for efficiency
   */
  normal(mean: number = 0, std: number = 1): number {
    if (this.hasNextGaussian) {
      this.hasNextGaussian = false;
      return this.nextGaussian * std + mean;
    }
    
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    this.hasNextGaussian = true;
    this.nextGaussian = z1;
    
    return z0 * std + mean;
  }
  
  /**
   * Sample from Beta distribution using rejection sampling
   */
  beta(alpha: number, beta: number): number {
    if (alpha <= 0 || beta <= 0) {
      throw new Error('Beta parameters must be positive');
    }
    
    // For efficiency, use different methods based on parameters
    if (alpha === 1 && beta === 1) {
      return this.random(); // Uniform distribution
    }
    
    if (alpha < 1 && beta < 1) {
      // Jöhnk's algorithm for alpha, beta < 1
      while (true) {
        const u = this.random();
        const v = this.random();
        const x = Math.pow(u, 1 / alpha);
        const y = Math.pow(v, 1 / beta);
        
        if (x + y <= 1) {
          return x / (x + y);
        }
      }
    }
    
    // Use gamma distribution relationship: Beta(α,β) = Gamma(α,1) / (Gamma(α,1) + Gamma(β,1))
    const x = this.gamma(alpha, 1);
    const y = this.gamma(beta, 1);
    return x / (x + y);
  }
  
  /**
   * Sample from Gamma distribution using Marsaglia and Tsang's method
   */
  gamma(shape: number, scale: number = 1): number {
    if (shape <= 0) {
      throw new Error('Gamma shape parameter must be positive');
    }
    
    if (shape < 1) {
      // For shape < 1, use transformation
      return this.gamma(shape + 1, scale) * Math.pow(this.random(), 1 / shape);
    }
    
    // Marsaglia and Tsang's squeeze method
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x = this.normal();
      const v = Math.pow(1 + c * x, 3);
      
      if (v <= 0) continue;
      
      x = x * x;
      const u = this.random();
      
      if (u < 1 - 0.0331 * x * x) {
        return d * v * scale;
      }
      
      if (Math.log(u) < 0.5 * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }
  
  /**
   * Sample from exponential distribution
   */
  exponential(rate: number = 1): number {
    return -Math.log(this.random()) / rate;
  }
  
  /**
   * Sample from array with uniform probability
   */
  choice<T>(array: T[]): T {
    return array[this.randInt(0, array.length)];
  }
  
  /**
   * Sample from array with given weights
   */
  weightedChoice<T>(array: T[], weights: number[]): T {
    if (array.length !== weights.length) {
      throw new Error('Array and weights must have same length');
    }
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.random() * totalWeight;
    
    for (let i = 0; i < array.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return array[i];
      }
    }
    
    return array[array.length - 1];
  }
  
  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Generate 2D Gaussian noise field
   */
  gaussianField(width: number, height: number, mean: number = 0, std: number = 1): number[][] {
    const field: number[][] = [];
    for (let y = 0; y < height; y++) {
      field[y] = [];
      for (let x = 0; x < width; x++) {
        field[y][x] = this.normal(mean, std);
      }
    }
    return field;
  }
  
  /**
   * Apply Gaussian smoothing to a 2D field
   */
  smoothField(field: number[][], sigma: number): number[][] {
    const height = field.length;
    const width = field[0].length;
    const smoothed: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
    
    // Create Gaussian kernel
    const kernelSize = Math.ceil(3 * sigma);
    const kernel: number[][] = [];
    let kernelSum = 0;
    
    for (let ky = -kernelSize; ky <= kernelSize; ky++) {
      kernel[ky + kernelSize] = [];
      for (let kx = -kernelSize; kx <= kernelSize; kx++) {
        const value = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
        kernel[ky + kernelSize][kx + kernelSize] = value;
        kernelSum += value;
      }
    }
    
    // Normalize kernel
    for (let ky = 0; ky < kernel.length; ky++) {
      for (let kx = 0; kx < kernel[ky].length; kx++) {
        kernel[ky][kx] /= kernelSum;
      }
    }
    
    // Apply convolution
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const fieldY = Math.max(0, Math.min(height - 1, y + ky));
            const fieldX = Math.max(0, Math.min(width - 1, x + kx));
            sum += field[fieldY][fieldX] * kernel[ky + kernelSize][kx + kernelSize];
          }
        }
        smoothed[y][x] = sum;
      }
    }
    
    return smoothed;
  }
  
  /**
   * Apply logistic transformation to convert real values to probabilities
   */
  logisticTransform(field: number[][], steepness: number = 1): number[][] {
    return field.map(row => 
      row.map(value => 1 / (1 + Math.exp(-steepness * value)))
    );
  }
}

/**
 * Generate daily seed based on current date
 */
export function getDailySeed(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `daily-${dateStr}`;
}

/**
 * Generate random seed string
 */
export function generateRandomSeed(): string {
  return `random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a sub-RNG with a derived seed for different game aspects
 */
export function createSubRNG(baseSeed: string, aspect: string): SeededRNG {
  return new SeededRNG(`${baseSeed}-${aspect}`);
}