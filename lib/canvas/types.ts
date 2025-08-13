export interface RenderConfig {
  width: number;
  height: number;
  dpr: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawableGlyph {
  x: number;
  y: number;
  rotation?: number;
  color?: string;
  size?: number;
  selected?: boolean;
  id?: string;
}

export interface DrawablePath {
  points: Point[];
  color?: string;
  width?: number;
  dashed?: boolean;
  closed?: boolean;
  animatedOffset?: number;
  id?: string;
}

export interface DrawableText {
  x: number;
  y: number;
  text: string;
  color?: string;
  font?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  background?: string;
  id?: string;
}

export interface GridLayer {
  enabled: boolean;
  cellSize: number;
  opacity: number;
}

export interface CanvasLayers {
  heatmap?: number[][];
  grid?: GridLayer;
  boundaries?: DrawablePath[];
  tracks?: DrawableGlyph[];
  overlays?: (DrawableText | DrawableGlyph)[];
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface HitTestResult {
  hit: boolean;
  type?: 'track' | 'boundary' | 'cell' | 'overlay';
  id?: string;
  data?: unknown;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  lastFrameTimestamp: number;
  frameCount: number;
}