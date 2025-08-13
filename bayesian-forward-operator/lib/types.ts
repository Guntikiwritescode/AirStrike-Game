export interface GameCell {
  x: number;
  y: number;
  hasHostile: boolean;
  hasInfrastructure: boolean;
  posteriorProbability: number; // P(hostile | observations)
  reconHistory: ReconResult[];
}

export interface ReconResult {
  sensor: SensorType;
  result: boolean; // true = positive detection
  turn: number;
  timestamp: number;
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
}

export type HeatmapType = 'posterior' | 'expectedValue' | 'valueOfInformation';

export interface PolicyAction {
  type: 'recon' | 'strike';
  x: number;
  y: number;
  sensor?: SensorType;
  expectedUtility: number;
  risk: number;
}