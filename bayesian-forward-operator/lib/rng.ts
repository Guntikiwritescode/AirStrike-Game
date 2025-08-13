import seedrandom from 'seedrandom';

export class SeededRNG {
  private rng: seedrandom.PRNG;
  
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
   */
  normal(mean: number = 0, std: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * std + mean;
  }
  
  /**
   * Sample from array with uniform probability
   */
  choice<T>(array: T[]): T {
    return array[this.randInt(0, array.length)];
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