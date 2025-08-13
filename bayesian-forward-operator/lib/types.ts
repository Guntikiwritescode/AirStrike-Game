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