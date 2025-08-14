import { CanvasLayers, DrawableGlyph, DrawablePath, DrawableText, RenderConfig, Point, HitTestResult } from './types';
import { QuadTree } from './quadtree';
import { getAnimatedDashOffset } from './drawing-utils';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private viewTransform = { x: 0, y: 0, scale: 1 };
  private quadTree: QuadTree;
  private lastFrameTime = 0;

  constructor(ctx: CanvasRenderingContext2D, config: RenderConfig) {
    this.ctx = ctx;
    this.config = config;
    
    // Initialize quadtree for hit testing
    this.quadTree = new QuadTree({
      x: 0,
      y: 0,
      width: config.width,
      height: config.height
    });
    
    // Setup context defaults for crisp rendering
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  public render(layers: CanvasLayers, timestamp: number = performance.now()): void {
    this.clear();
    this.lastFrameTime = timestamp;
    
    // Clear and rebuild quadtree for this frame
    this.quadTree.clear();
    
    // Render layers in order (back to front)
    this.renderHeatmap(layers.heatmap);
    this.renderGrid(layers.grid);
    this.renderBoundaries(layers.boundaries, timestamp);
    this.renderTracks(layers.tracks);
    this.renderOverlays(layers.overlays);
  }

  private clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.restore();
  }

  private renderHeatmap(heatmapData?: number[][]): void {
    if (!heatmapData || heatmapData.length === 0) return;

    const cellWidth = this.config.width / heatmapData[0].length;
    const cellHeight = this.config.height / heatmapData.length;

    this.ctx.save();

    for (let y = 0; y < heatmapData.length; y++) {
      for (let x = 0; x < heatmapData[y].length; x++) {
        const value = heatmapData[y][x];
        if (value <= 0) continue;

        const alpha = Math.min(value, 1);
        this.ctx.fillStyle = `rgba(85, 227, 255, ${alpha * 0.3})`;
        
        const pixelX = Math.round(x * cellWidth);
        const pixelY = Math.round(y * cellHeight);
        const pixelW = Math.round(cellWidth);
        const pixelH = Math.round(cellHeight);
        
        this.ctx.fillRect(pixelX, pixelY, pixelW, pixelH);
      }
    }

    this.ctx.restore();
  }

  private renderGrid(gridData?: { enabled: boolean; cellSize: number; opacity: number }): void {
    if (!gridData?.enabled) return;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(27, 36, 48, ${gridData.opacity})`;
    this.ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= this.config.width; x += gridData.cellSize) {
      this.drawCrispLine(x, 0, x, this.config.height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.config.height; y += gridData.cellSize) {
      this.drawCrispLine(0, y, this.config.width, y);
    }

    this.ctx.restore();
  }

  private renderBoundaries(boundaries?: DrawablePath[], timestamp?: number): void {
    if (!boundaries || boundaries.length === 0) return;

    this.ctx.save();

    boundaries.forEach(boundary => {
      if (boundary.points.length < 2) return;

      // Add to quadtree for hit testing
      if (boundary.points.length >= 2) {
        const bounds = this.getBoundingBox(boundary.points);
        const drawable = {
          ...boundary,
          bounds,
          type: 'boundary' as const
        };
        this.quadTree.insert(drawable);
      }

      this.ctx.strokeStyle = boundary.color || 'var(--color-warn)';
      this.ctx.lineWidth = boundary.width || 2;

      if (boundary.dashed && timestamp) {
        this.ctx.setLineDash([6, 6]);
        this.ctx.lineDashOffset = getAnimatedDashOffset(timestamp, 1);
      }

      this.ctx.beginPath();
      const firstPoint = boundary.points[0];
      this.ctx.moveTo(Math.round(firstPoint.x) + 0.5, Math.round(firstPoint.y) + 0.5);

      for (let i = 1; i < boundary.points.length; i++) {
        const point = boundary.points[i];
        this.ctx.lineTo(Math.round(point.x) + 0.5, Math.round(point.y) + 0.5);
      }

      if (boundary.closed) {
        this.ctx.closePath();
      }

      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });

    this.ctx.restore();
  }

  private renderTracks(tracks?: DrawableGlyph[]): void {
    if (!tracks || tracks.length === 0) return;

    this.ctx.save();

    tracks.forEach(track => {
      // Add to quadtree for hit testing
      const size = track.size || 12;
      const bounds = {
        x: track.x - size/2,
        y: track.y - size/2,
        width: size,
        height: size
      };
      const drawable = {
        ...track,
        bounds,
        type: 'track' as const
      };
      this.quadTree.insert(drawable);

      this.ctx.save();
      this.ctx.translate(track.x, track.y);
      
      if (track.rotation !== undefined) {
        this.ctx.rotate(track.rotation);
      }

      // Draw glow effect for selected tracks
      if (track.selected) {
        this.ctx.shadowColor = 'var(--color-accent)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }

      // Draw aircraft glyph (tactical chevron)
      this.drawAircraftGlyph(track.color || 'var(--color-accent)', track.size || 12);

      this.ctx.restore();
    });

    this.ctx.restore();
  }

  private renderOverlays(overlays?: (DrawableText | DrawableGlyph)[]): void {
    if (!overlays || overlays.length === 0) return;

    this.ctx.save();

    overlays.forEach(overlay => {
      if ('text' in overlay) {
        this.renderText(overlay as DrawableText);
      } else {
        // Handle additional overlay types
      }
    });

    this.ctx.restore();
  }

  private renderText(textDrawable: DrawableText): void {
    this.ctx.save();
    
    this.ctx.fillStyle = textDrawable.color || 'var(--color-ink)';
    this.ctx.font = textDrawable.font || '12px "var(--font-jetbrains)"';
    this.ctx.textAlign = textDrawable.align || 'center';
    this.ctx.textBaseline = textDrawable.baseline || 'middle';

    // Add background if specified
    if (textDrawable.background) {
      const metrics = this.ctx.measureText(textDrawable.text);
      const padding = 4;
      const x = textDrawable.x - metrics.width / 2 - padding;
      const y = textDrawable.y - 8 - padding;
      const w = metrics.width + padding * 2;
      const h = 16 + padding * 2;

      this.ctx.fillStyle = textDrawable.background;
      this.ctx.fillRect(x, y, w, h);
      this.ctx.fillStyle = textDrawable.color || 'var(--color-ink)';
    }

    this.ctx.fillText(textDrawable.text, textDrawable.x, textDrawable.y);
    this.ctx.restore();
  }

  private drawAircraftGlyph(color: string, size: number): void {
    const halfSize = size / 2;
    
    this.ctx.beginPath();
    // Tactical chevron shape
    this.ctx.moveTo(halfSize, 0);           // nose
    this.ctx.lineTo(-halfSize * 0.8, halfSize * 0.6);  // left wing
    this.ctx.lineTo(-halfSize * 0.5, 0);    // body
    this.ctx.lineTo(-halfSize * 0.8, -halfSize * 0.6); // right wing
    this.ctx.closePath();

    // Fill
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Stroke for definition
    this.ctx.strokeStyle = 'var(--color-accent)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawCrispLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    
    // Align to pixel boundaries for 1px crisp lines
    const alignedX1 = Math.round(x1) + 0.5;
    const alignedY1 = Math.round(y1) + 0.5;
    const alignedX2 = Math.round(x2) + 0.5;
    const alignedY2 = Math.round(y2) + 0.5;
    
    this.ctx.moveTo(alignedX1, alignedY1);
    this.ctx.lineTo(alignedX2, alignedY2);
    this.ctx.stroke();
  }

  public setViewTransform(x: number, y: number, scale: number): void {
    this.viewTransform = { x, y, scale };
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewTransform.x) / this.viewTransform.scale,
      y: (screenY - this.viewTransform.y) / this.viewTransform.scale
    };
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.viewTransform.scale + this.viewTransform.x,
      y: worldY * this.viewTransform.scale + this.viewTransform.y
    };
  }

  public hitTest(screenPoint: Point): HitTestResult {
    const worldPoint = this.screenToWorld(screenPoint.x, screenPoint.y);
    return this.quadTree.hitTest(worldPoint, 10); // 10px tolerance
  }

  private getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    for (let i = 1; i < points.length; i++) {
      minX = Math.min(minX, points[i].x);
      maxX = Math.max(maxX, points[i].x);
      minY = Math.min(minY, points[i].y);
      maxY = Math.max(maxY, points[i].y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}