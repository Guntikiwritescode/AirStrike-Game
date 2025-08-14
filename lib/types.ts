export interface GameCell {
  x: number;
  y: number;
  hasHostile: boolean;
  hasInfrastructure: boolean;
  posteriorProbability: number; // P(hostile | observations)
  reconHistory: ReconResult[];
  // Enhanced truth generation fields
  hostilePriorProbability: number; // θ(x,y) from spatial field
  infraPriorProbability: number;   // Base rate for infrastructure
}

export interface TruthField {
  hostileField: number[][];        // θ(x,y) values before sampling
  infraField: number[][];          // Infrastructure probability field
  hostileTruth: boolean[][];       // H(x,y) sampled truth
  infraTruth: boolean[][];         // I(x,y) sampled truth
}

export interface SpatialFieldConfig {
  noiseScale: number;              // Standard deviation of Gaussian noise
  smoothingSigma: number;          // Gaussian smoothing kernel sigma
  logisticSteepness: number;       // Steepness of logistic transformation
  hostileBaseProbability: number;  // Base probability for hostiles
  infraBaseProbability: number;    // Base probability for infrastructure
}

export interface BetaPriorConfig {
  hostileAlpha: number;            // Beta prior α for hostiles
  hostileBeta: number;             // Beta prior β for hostiles
  infraAlpha: number;              // Beta prior α for infrastructure  
  infraBeta: number;               // Beta prior β for infrastructure
}

export interface ReconResult {
  sensor: SensorType;
  result: boolean; // true = positive detection
  turn: number;
  timestamp: number;
  effectiveTPR: number;        // Actual TPR used for this reading
  effectiveFPR: number;        // Actual FPR used for this reading
  confidence: number;          // Sensor confidence (0-1)
  contextSummary: string;      // Description of context factors
  priorProbability: number;    // Probability before this reading
  posteriorProbability: number; // Probability after this reading
}

export interface SensorConfig {
  name: string;
  truePositiveRate: number;
  falsePositiveRate: number;
  cost: number;
  costMultiplier: number;
}

export type SensorType = 'drone' | 'sigint' | 'ground';

export interface StrikeAction {
  x: number;
  y: number;
  radius: number;
  cost: number;
  expectedValue: number;
  collateralRisk: number;
}

export interface GameConfig {
  gridSize: number;
  initialBudget: number;
  maxTurns: number;
  hostileValue: number;
  infraPenalty: number;
  strikeCost: number;
  reconCost: number;
  collateralThreshold: number; // max allowed P(infra hit)
  riskAversion: number; // λ for CVaR
  seed: string;
  
  // Enhanced truth generation config
  spatialField: SpatialFieldConfig;
  betaPriors: BetaPriorConfig;
  
  // Development options
  showTruthOverlay: boolean;       // Developer mode: show hidden truth
}

export interface GameState {
  grid: GameCell[][];
  config: GameConfig;
  currentTurn: number;
  remainingBudget: number;
  score: number;
  gameStarted: boolean;
  gameEnded: boolean;
  eventLog: GameEvent[];
  analytics: GameAnalytics;
  
  // Enhanced truth storage
  truthField: TruthField;
  
  // Loading state for Web Worker operations
  loadingState: {
    isLoading: boolean;
    operation: string;
    progress: number;
    stage: string;
    startTime?: number;
    expectedDuration?: number;
  };
}

export interface GameEvent {
  turn: number;
  type: 'recon' | 'strike' | 'game_start' | 'game_end';
  data: Record<string, unknown>;
  timestamp: number;
}

export interface GameAnalytics {
  hostilesNeutralized: number;
  infraHits: number;
  totalCost: number;
  brierScore: number;
  logLoss: number;
  calibrationData: CalibrationPoint[];
  evAccuracy: number;
  
  // Enhanced analytics for truth comparison
  truthCorrelation: number;        // Correlation between beliefs and truth
  spatialAccuracy: number;         // How well spatial patterns were detected
  
  // Advanced calibration metrics
  calibrationError: number;        // Mean absolute calibration error
  reliability: number;             // Reliability component of Brier score
  resolution: number;              // Resolution component of Brier score
  uncertainty: number;             // Uncertainty component of Brier score
  totalPredictions: number;        // Total number of predictions made
  
  // Per-turn timeline data
  timelineData: TurnMetrics[];
}

export interface TurnMetrics {
  turn: number;
  timestamp: number;
  score: number;
  remainingBudget: number;
  brierScore: number;
  logLoss: number;
  hostilesNeutralized: number;
  infraHits: number;
  totalCost: number;
  // Decision quality metrics
  bestEVAvailable: number;        // Best EV strike available this turn
  chosenEV: number;               // EV of action actually taken (0 if no action)
  evGap: number;                  // bestEVAvailable - chosenEV
  infraRisk: number;              // Average P(infrastructure hit) across all cells
  uncertaintyLevel: number;       // Average posterior uncertainty (entropy)
  // Action summary
  actionsThisTurn: {
    recons: number;
    strikes: number;
    totalCost: number;
  };
  // Spatial analysis
  beliefAccuracy: number;         // Correlation with truth at this point
  spatialConcentration: number;   // How concentrated are the beliefs
}

export interface CalibrationPoint {
  predicted: number;
  actual: number;
  count: number;
}

export interface HeatmapData {
  posterior: number[][];
  expectedValue: number[][];
  valueOfInformation: number[][];
  truth: number[][];               // For developer overlay
  priorField: number[][];          // θ(x,y) field visualization
}

export type HeatmapType = 'posterior' | 'expectedValue' | 'valueOfInformation' | 'riskAverse' | 'variance' | 'lossRisk' | 'truth' | 'priorField';

export interface PolicyAction {
  type: 'recon' | 'strike';
  x: number;
  y: number;
  sensor?: SensorType;
  expectedUtility: number;
  risk: number;
}

export interface GameRunExport {
  // Metadata
  exportTimestamp: number;
  gameConfig: GameConfig;
  seed: string;
  totalTurns: number;
  finalScore: number;
  
  // Timeline data
  turnMetrics: TurnMetrics[];
  
  // Event log
  events: GameEvent[];
  
  // Final analytics
  finalAnalytics: GameAnalytics;
  
  // Truth data (for analysis)
  truthField: {
    hostiles: boolean[][];
    infrastructure: boolean[][];
    hostilePriorField: number[][];
    infraPriorField: number[][];
  };
  
  // 3D entities for rendering
  entities: {
    infrastructure: InfrastructureEntity[];
    aircraft: AircraftEntity[];
    flightPaths: FlightPath[];
  };
  
  // Performance metrics
  performanceMetrics: {
    totalComputationTime: number;
    workerCacheHitRate: number;
    averageDecisionTime: number;
  };
}

// 3D Entity Types for Infrastructure and Aircraft
export interface InfrastructureEntity {
  id: string;
  type: 'tower' | 'dome' | 'building';
  position: [number, number, number]; // [lng, lat, altitude]
  rotation: [number, number, number]; // [pitch, yaw, roll] in radians
  scale: number;
  isDestroyed: boolean;
  gridX: number;
  gridY: number;
}

export interface AircraftEntity {
  id: string;
  type: 'fighter' | 'drone' | 'transport';
  position: [number, number, number]; // [lng, lat, altitude]
  heading: number; // radians
  speed: number; // m/s
  altitude: number; // meters above ground
  isHostile: boolean;
  flightPathId?: string;
}

export interface FlightPath {
  id: string;
  waypoints: FlightWaypoint[];
  isActive: boolean;
  aircraftId?: string;
}

export interface FlightWaypoint {
  position: [number, number, number]; // [lng, lat, altitude]
  timestamp: number;
  speed: number;
}

// Tactical Overlay Types
export interface TacticalBoundary {
  id: string;
  type: 'FEBA' | 'ROZ' | 'FLOT' | 'PL'; // Forward Edge of Battle Area, Restricted Operating Zone, Forward Line of Own Troops, Phase Line
  name: string;
  path: [number, number, number][]; // 3D path coordinates
  color: [number, number, number, number];
  dashLength: number;
  animated: boolean;
}

export interface AreaOfInterest {
  id: string;
  name: string;
  type: 'NAI' | 'TAI' | 'EA' | 'OBJECTIVE'; // Named Area of Interest, Target Area of Interest, Engagement Area, Objective
  polygon: [number, number, number][]; // 3D polygon coordinates
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
}

export interface SensorCone {
  id: string;
  sensorId: string;
  position: [number, number, number]; // [lng, lat, altitude]
  bearing: number; // radians
  fieldOfView: number; // radians (total FOV, not half-angle)
  range: number; // meters
  minRange?: number; // meters
  sectorHeight: number; // meters (vertical extent)
  confidence: number; // 0-1 for opacity/gradient
  sensorType: SensorType;
}