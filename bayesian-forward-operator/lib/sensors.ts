import { SeededRNG } from './rng';
import { SensorType } from './types';

/**
 * Context factors that modify sensor performance
 */
export interface SensorContext {
  terrain: TerrainType;
  lighting: LightingCondition;
  weather: WeatherCondition;
  concealment: ConcealmentLevel;
  jamming: JammingLevel;
}

export type TerrainType = 'urban' | 'forest' | 'desert' | 'mountain' | 'open';
export type LightingCondition = 'day' | 'dusk' | 'night' | 'infrared';
export type WeatherCondition = 'clear' | 'overcast' | 'rain' | 'fog' | 'storm';
export type ConcealmentLevel = 'none' | 'light' | 'moderate' | 'heavy';
export type JammingLevel = 'none' | 'light' | 'moderate' | 'heavy';

/**
 * Base sensor configuration with context modifiers
 */
export interface EnhancedSensorConfig {
  name: string;
  description: string;
  baseTPR: number;
  baseFPR: number;
  baseCost: number;
  
  // Context multipliers for TPR (detection capability)
  terrainTPRModifiers: Record<TerrainType, number>;
  lightingTPRModifiers: Record<LightingCondition, number>;
  weatherTPRModifiers: Record<WeatherCondition, number>;
  concealmentTPRModifiers: Record<ConcealmentLevel, number>;
  jammingTPRModifiers: Record<JammingLevel, number>;
  
  // Context multipliers for FPR (false alarm rate)
  terrainFPRModifiers: Record<TerrainType, number>;
  lightingFPRModifiers: Record<LightingCondition, number>;
  weatherFPRModifiers: Record<WeatherCondition, number>;
  concealmentFPRModifiers: Record<ConcealmentLevel, number>;
  jammingFPRModifiers: Record<JammingLevel, number>;
  
  // Cost multipliers
  terrainCostModifiers: Record<TerrainType, number>;
  weatherCostModifiers: Record<WeatherCondition, number>;
}

/**
 * Effective sensor performance after context modifications
 */
export interface EffectiveSensorPerformance {
  effectiveTPR: number;
  effectiveFPR: number;
  effectiveCost: number;
  contextSummary: string;
}

/**
 * Sensor reading result
 */
export interface SensorReading {
  result: boolean;              // true = positive detection
  confidence: number;           // sensor confidence in reading (0-1)
  effectiveTPR: number;         // actual TPR used
  effectiveFPR: number;         // actual FPR used
  contextFactors: SensorContext;
  rawSignal: number;            // internal signal strength
}

/**
 * Enhanced sensor catalog with context-aware performance
 */
export const SENSOR_CATALOG: Record<SensorType, EnhancedSensorConfig> = {
  drone: {
    name: 'Drone Imagery',
    description: 'High-resolution visual reconnaissance drone with electro-optical sensors',
    baseTPR: 0.85,
    baseFPR: 0.15,
    baseCost: 10,
    
    terrainTPRModifiers: {
      urban: 0.9,     // Buildings provide some cover but good for signatures
      forest: 0.7,    // Heavy canopy reduces effectiveness
      desert: 1.1,    // Clear visibility, good contrast
      mountain: 0.8,  // Terrain shadows and angles
      open: 1.2,      // Perfect visibility
    },
    lightingTPRModifiers: {
      day: 1.0,       // Optimal conditions
      dusk: 0.8,      // Reduced visibility
      night: 0.3,     // Very limited without IR
      infrared: 0.9,  // Good IR capability
    },
    weatherTPRModifiers: {
      clear: 1.0,     // Perfect conditions
      overcast: 0.9,  // Slightly reduced
      rain: 0.6,      // Water on lens, reduced visibility
      fog: 0.3,       // Severely limited
      storm: 0.2,     // Nearly impossible
    },
    concealmentTPRModifiers: {
      none: 1.0,      // Clear target
      light: 0.8,     // Some camouflage
      moderate: 0.5,  // Good concealment
      heavy: 0.2,     // Expert camouflage
    },
    jammingTPRModifiers: {
      none: 1.0,      // No interference
      light: 0.9,     // Minor signal loss
      moderate: 0.7,  // Significant degradation
      heavy: 0.4,     // Barely functional
    },
    
    terrainFPRModifiers: {
      urban: 1.3,     // Many false signatures (vehicles, etc.)
      forest: 1.1,    // Some false signatures from animals
      desert: 0.8,    // Few false signatures
      mountain: 1.0,  // Moderate false signatures
      open: 0.9,      // Clean environment
    },
    lightingFPRModifiers: {
      day: 1.0,       // Baseline
      dusk: 1.2,      // Shadows create false positives
      night: 1.5,     // Many false positives
      infrared: 1.1,  // Some heat signature confusion
    },
    weatherFPRModifiers: {
      clear: 1.0,     // Baseline
      overcast: 1.1,  // Slight increase
      rain: 1.3,      // Weather artifacts
      fog: 1.4,       // Many false positives
      storm: 1.6,     // Extreme false positives
    },
    concealmentFPRModifiers: {
      none: 1.0,      // Clear discrimination
      light: 1.1,     // Slight confusion
      moderate: 1.2,  // Moderate confusion
      heavy: 1.4,     // High confusion
    },
    jammingFPRModifiers: {
      none: 1.0,      // Clean signal
      light: 1.2,     // Some artifacts
      moderate: 1.4,  // Many artifacts
      heavy: 1.8,     // Extreme artifacts
    },
    
    terrainCostModifiers: {
      urban: 1.2,     // Navigation complexity
      forest: 1.3,    // Obstacle avoidance
      desert: 0.9,    // Easy flight
      mountain: 1.4,  // Altitude and wind challenges
      open: 0.8,      // Optimal flight conditions
    },
    weatherCostModifiers: {
      clear: 1.0,     // Normal operation
      overcast: 1.1,  // Slight increase
      rain: 1.4,      // Weather protection needed
      fog: 1.5,       // Extended flight time
      storm: 2.0,     // High risk operation
    },
  },
  
  sigint: {
    name: 'SIGINT',
    description: 'Signals Intelligence - electronic signature detection and analysis',
    baseTPR: 0.60,
    baseFPR: 0.05,
    baseCost: 15,
    
    terrainTPRModifiers: {
      urban: 1.2,     // Many electronic signatures
      forest: 0.8,    // Natural interference
      desert: 1.0,    // Clean electromagnetic environment
      mountain: 0.7,  // Terrain blocking
      open: 1.1,      // Good propagation
    },
    lightingTPRModifiers: {
      day: 1.0,       // No direct effect
      dusk: 1.0,      // No direct effect
      night: 1.1,     // More electronic activity
      infrared: 1.0,  // No effect on SIGINT
    },
    weatherTPRModifiers: {
      clear: 1.0,     // Optimal conditions
      overcast: 1.0,  // No effect
      rain: 0.9,      // Slight atmospheric effect
      fog: 1.0,       // No effect
      storm: 0.7,     // Atmospheric interference
    },
    concealmentTPRModifiers: {
      none: 1.0,      // Full signature
      light: 0.9,     // Some emission control
      moderate: 0.7,  // Good EMCON discipline
      heavy: 0.4,     // Expert electronic concealment
    },
    jammingTPRModifiers: {
      none: 1.0,      // Clean spectrum
      light: 0.8,     // Some interference
      moderate: 0.5,  // Significant jamming
      heavy: 0.2,     // Heavy jamming
    },
    
    terrainFPRModifiers: {
      urban: 1.5,     // Many civilian electronics
      forest: 0.8,    // Few false sources
      desert: 0.7,    // Very clean
      mountain: 0.9,  // Some atmospheric effects
      open: 0.8,      // Clean environment
    },
    lightingFPRModifiers: {
      day: 1.0,       // Baseline
      dusk: 1.0,      // No effect
      night: 1.2,     // More electronic activity
      infrared: 1.0,  // No effect
    },
    weatherFPRModifiers: {
      clear: 1.0,     // Baseline
      overcast: 1.0,  // No effect
      rain: 1.1,      // Some atmospheric noise
      fog: 1.0,       // No effect
      storm: 1.4,     // Atmospheric interference
    },
    concealmentFPRModifiers: {
      none: 1.0,      // Clear signals
      light: 1.1,     // Some confusion
      moderate: 1.2,  // Signal masking creates confusion
      heavy: 1.3,     // Complex signal environment
    },
    jammingFPRModifiers: {
      none: 1.0,      // Clean spectrum
      light: 1.3,     // Jamming artifacts
      moderate: 1.6,  // Many false signals
      heavy: 2.0,     // Extreme false positives
    },
    
    terrainCostModifiers: {
      urban: 1.3,     // Complex signal environment
      forest: 1.0,    // Standard processing
      desert: 0.9,    // Simple environment
      mountain: 1.2,  // Terrain effects
      open: 0.8,      // Optimal conditions
    },
    weatherCostModifiers: {
      clear: 1.0,     // Standard processing
      overcast: 1.0,  // No effect
      rain: 1.1,      // Some additional processing
      fog: 1.0,       // No effect
      storm: 1.3,     // Complex atmospheric processing
    },
  },
  
  ground: {
    name: 'Ground Spotter',
    description: 'Human intelligence and ground-based reconnaissance',
    baseTPR: 0.75,
    baseFPR: 0.10,
    baseCost: 20,
    
    terrainTPRModifiers: {
      urban: 1.1,     // Good for human intel
      forest: 0.6,    // Limited visibility
      desert: 0.9,    // Long sight lines but harsh
      mountain: 0.7,  // Difficult terrain
      open: 1.2,      // Excellent visibility
    },
    lightingTPRModifiers: {
      day: 1.0,       // Optimal for human vision
      dusk: 0.7,      // Reduced visibility
      night: 0.4,     // Very limited without equipment
      infrared: 0.8,  // Good with night vision
    },
    weatherTPRModifiers: {
      clear: 1.0,     // Perfect conditions
      overcast: 0.9,  // Slightly reduced
      rain: 0.5,      // Significantly impaired
      fog: 0.3,       // Severely limited
      storm: 0.2,     // Nearly impossible
    },
    concealmentTPRModifiers: {
      none: 1.0,      // Clear observation
      light: 0.7,     // Some difficulty
      moderate: 0.4,  // Significant challenge
      heavy: 0.1,     // Nearly impossible
    },
    jammingTPRModifiers: {
      none: 1.0,      // No effect on human observation
      light: 0.95,    // Slight communication issues
      moderate: 0.9,  // Communication problems
      heavy: 0.8,     // Coordination difficulties
    },
    
    terrainFPRModifiers: {
      urban: 1.2,     // Many civilians, confusion
      forest: 1.0,    // Some animal false positives
      desert: 0.8,    // Clear environment
      mountain: 0.9,  // Good discrimination
      open: 0.7,      // Excellent discrimination
    },
    lightingFPRModifiers: {
      day: 1.0,       // Clear discrimination
      dusk: 1.3,      // Shadows cause confusion
      night: 1.8,     // Many false positives
      infrared: 1.2,  // Some equipment artifacts
    },
    weatherFPRModifiers: {
      clear: 1.0,     // Clear identification
      overcast: 1.1,  // Slight increase
      rain: 1.4,      // Reduced discrimination
      fog: 1.6,       // Many false positives
      storm: 1.8,     // Extreme confusion
    },
    concealmentFPRModifiers: {
      none: 1.0,      // Clear identification
      light: 1.2,     // Some confusion
      moderate: 1.4,  // Significant confusion
      heavy: 1.7,     // High confusion
    },
    jammingFPRModifiers: {
      none: 1.0,      // No effect
      light: 1.1,     // Slight communication confusion
      moderate: 1.2,  // Coordination problems
      heavy: 1.3,     // Information confusion
    },
    
    terrainCostModifiers: {
      urban: 1.1,     // Urban hazards
      forest: 1.4,    // Difficult movement
      desert: 1.3,    // Harsh environment
      mountain: 1.5,  // Extreme difficulty
      open: 0.9,      // Easy movement
    },
    weatherCostModifiers: {
      clear: 1.0,     // Normal operation
      overcast: 1.1,  // Slight increase
      rain: 1.5,      // Protection and difficulty
      fog: 1.4,       // Navigation difficulty
      storm: 2.2,     // Dangerous conditions
    },
  },
};

/**
 * Calculate effective sensor performance given context
 */
export function calculateEffectivePerformance(
  sensorType: SensorType,
  context: SensorContext
): EffectiveSensorPerformance {
  const config = SENSOR_CATALOG[sensorType];
  
  // Calculate effective TPR (multiplicative effects, clamped to [0.01, 0.99])
  let effectiveTPR = config.baseTPR;
  effectiveTPR *= config.terrainTPRModifiers[context.terrain];
  effectiveTPR *= config.lightingTPRModifiers[context.lighting];
  effectiveTPR *= config.weatherTPRModifiers[context.weather];
  effectiveTPR *= config.concealmentTPRModifiers[context.concealment];
  effectiveTPR *= config.jammingTPRModifiers[context.jamming];
  effectiveTPR = Math.max(0.01, Math.min(0.99, effectiveTPR));
  
  // Calculate effective FPR (multiplicative effects, clamped to [0.01, 0.99])
  let effectiveFPR = config.baseFPR;
  effectiveFPR *= config.terrainFPRModifiers[context.terrain];
  effectiveFPR *= config.lightingFPRModifiers[context.lighting];
  effectiveFPR *= config.weatherFPRModifiers[context.weather];
  effectiveFPR *= config.concealmentFPRModifiers[context.concealment];
  effectiveFPR *= config.jammingFPRModifiers[context.jamming];
  effectiveFPR = Math.max(0.01, Math.min(0.99, effectiveFPR));
  
  // Calculate effective cost
  let effectiveCost = config.baseCost;
  effectiveCost *= config.terrainCostModifiers[context.terrain];
  effectiveCost *= config.weatherCostModifiers[context.weather];
  effectiveCost = Math.ceil(effectiveCost);
  
  // Generate context summary
  const contextSummary = `${context.terrain} terrain, ${context.lighting} lighting, ${context.weather} weather, ${context.concealment} concealment, ${context.jamming} jamming`;
  
  return {
    effectiveTPR,
    effectiveFPR,
    effectiveCost,
    contextSummary,
  };
}

/**
 * Generate sensor context for a specific cell
 */
export function generateCellContext(
  x: number,
  y: number,
  gridSize: number,
  rng: SeededRNG
): SensorContext {
  // Generate context based on cell position with some randomness
  const terrains: TerrainType[] = ['urban', 'forest', 'desert', 'mountain', 'open'];
  const lightings: LightingCondition[] = ['day', 'dusk', 'night', 'infrared'];
  const weathers: WeatherCondition[] = ['clear', 'overcast', 'rain', 'fog', 'storm'];
  const concealments: ConcealmentLevel[] = ['none', 'light', 'moderate', 'heavy'];
  const jammings: JammingLevel[] = ['none', 'light', 'moderate', 'heavy'];
  
  // Weight probabilities based on realistic scenarios
  const terrainWeights = [0.2, 0.2, 0.2, 0.2, 0.2]; // Equal for now
  const lightingWeights = [0.4, 0.2, 0.2, 0.2]; // Favor day operations
  const weatherWeights = [0.4, 0.25, 0.15, 0.1, 0.1]; // Favor clear weather
  const concealmentWeights = [0.3, 0.3, 0.25, 0.15]; // Moderate concealment likely
  const jammingWeights = [0.5, 0.25, 0.15, 0.1]; // Usually no jamming
  
  return {
    terrain: rng.weightedChoice(terrains, terrainWeights),
    lighting: rng.weightedChoice(lightings, lightingWeights),
    weather: rng.weightedChoice(weathers, weatherWeights),
    concealment: rng.weightedChoice(concealments, concealmentWeights),
    jamming: rng.weightedChoice(jammings, jammingWeights),
  };
}

/**
 * Simulate a sensor reading given truth and context
 */
export function simulateSensorReading(
  sensorType: SensorType,
  hasHostile: boolean,
  context: SensorContext,
  rng: SeededRNG
): SensorReading {
  const performance = calculateEffectivePerformance(sensorType, context);
  
  // Generate raw signal strength (for internal use)
  const rawSignal = rng.normal(hasHostile ? 1 : 0, 0.3);
  
  // Determine reading based on TPR/FPR
  let result: boolean;
  if (hasHostile) {
    result = rng.bernoulli(performance.effectiveTPR);
  } else {
    result = rng.bernoulli(performance.effectiveFPR);
  }
  
  // Calculate confidence based on signal strength and sensor reliability
  const baseConfidence = hasHostile ? performance.effectiveTPR : (1 - performance.effectiveFPR);
  const signalConfidence = Math.abs(rawSignal) / 2; // 0-1 based on signal strength
  const confidence = Math.max(0.1, Math.min(0.9, (baseConfidence + signalConfidence) / 2));
  
  return {
    result,
    confidence,
    effectiveTPR: performance.effectiveTPR,
    effectiveFPR: performance.effectiveFPR,
    contextFactors: context,
    rawSignal,
  };
}

/**
 * Default context for simplified scenarios
 */
export const DEFAULT_CONTEXT: SensorContext = {
  terrain: 'open',
  lighting: 'day',
  weather: 'clear',
  concealment: 'light',
  jamming: 'none',
};