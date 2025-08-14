import { Point } from './types';

/**
 * Draw a crisp horizontal line with pixel alignment
 */
export function drawHLine(
  ctx: CanvasRenderingContext2D, 
  x1: number, 
  x2: number, 
  y: number
): void {
  const yy = Math.round(y) + 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, yy);
  ctx.lineTo(x2, yy);
  ctx.stroke();
}

/**
 * Draw a crisp vertical line with pixel alignment
 */
export function drawVLine(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y1: number, 
  y2: number
): void {
  const xx = Math.round(x) + 0.5;
  ctx.beginPath();
  ctx.moveTo(xx, y1);
  ctx.lineTo(xx, y2);
  ctx.stroke();
}

/**
 * Draw a dashed line between points with pixel alignment
 */
export function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  dashLength: number = 6,
  gapLength: number = 6,
  animatedOffset: number = 0
): void {
  if (points.length < 2) return;

  const totalDashLength = dashLength + gapLength;
  let currentDistance = animatedOffset % totalDashLength;
  let isDrawing = currentDistance < dashLength;

  ctx.beginPath();

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (segmentLength === 0) continue;
    
    const unitX = dx / segmentLength;
    const unitY = dy / segmentLength;
    
    let segmentDistance = 0;
    let lastPoint = start;
    
    if (i === 0) {
      // Start the path
      if (isDrawing) {
        ctx.moveTo(Math.round(start.x) + 0.5, Math.round(start.y) + 0.5);
      }
    }
    
    while (segmentDistance < segmentLength) {
      const remainingInCurrentPhase = isDrawing 
        ? dashLength - (currentDistance % totalDashLength)
        : totalDashLength - (currentDistance % totalDashLength);
      
      const distanceToNextPhase = Math.min(remainingInCurrentPhase, segmentLength - segmentDistance);
      
      const nextPoint = {
        x: lastPoint.x + unitX * distanceToNextPhase,
        y: lastPoint.y + unitY * distanceToNextPhase
      };
      
      if (isDrawing) {
        ctx.lineTo(Math.round(nextPoint.x) + 0.5, Math.round(nextPoint.y) + 0.5);
      } else {
        ctx.moveTo(Math.round(nextPoint.x) + 0.5, Math.round(nextPoint.y) + 0.5);
      }
      
      segmentDistance += distanceToNextPhase;
      currentDistance += distanceToNextPhase;
      lastPoint = nextPoint;
      
      if (currentDistance % totalDashLength < 0.001) {
        isDrawing = !isDrawing;
      }
    }
  }
  
  ctx.stroke();
}

/**
 * Draw a warning boundary (polygon) with animated dashed outline
 */
export function drawWarnBoundary(
  ctx: CanvasRenderingContext2D,
  polygon: Point[],
  animatedOffset: number = 0,
  dashLength: number = 6,
  gapLength: number = 6
): void {
  if (polygon.length < 3) return;

  ctx.save();
  
  // Set warning red color and style
  ctx.strokeStyle = 'var(--color-warn)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Create closed polygon by adding first point to end
  const closedPolygon = [...polygon, polygon[0]];
  
  // Draw dashed outline
  drawDashedLine(ctx, closedPolygon, dashLength, gapLength, animatedOffset);
  
  ctx.restore();
}

/**
 * Draw an aircraft glyph (tactical chevron) with rotation
 */
export function drawJet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  color: string = 'var(--color-accent)',
  size: number = 12
): void {
  ctx.save();
  
  // Move to position and rotate
  ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.rotate(headingRad);
  
  // Scale based on size
  const scale = size / 12;
  ctx.scale(scale, scale);
  
  // Draw chevron shape
  ctx.beginPath();
  ctx.moveTo(10, 0);   // nose
  ctx.lineTo(-12, 8);  // left wing
  ctx.lineTo(-8, 0);   // body
  ctx.lineTo(-12, -8); // right wing
  ctx.closePath();
  
  // Fill and stroke
  ctx.fillStyle = color;
  ctx.strokeStyle = 'var(--color-accent)';
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Draw a grid with crisp 1px lines
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  opacity: number = 0.3
): void {
  ctx.save();
  
  ctx.strokeStyle = `rgba(27, 36, 48, ${opacity})`;
  ctx.lineWidth = 1;
  
  // Draw vertical lines
  for (let x = 0; x <= width; x += cellSize) {
    drawVLine(ctx, x, 0, height);
  }
  
  // Draw horizontal lines  
  for (let y = 0; y <= height; y += cellSize) {
    drawHLine(ctx, 0, width, y);
  }
  
  ctx.restore();
}

/**
 * Get animated dash offset for smooth animation
 * Call this in your render loop with current timestamp
 */
export function getAnimatedDashOffset(timestamp: number, speed: number = 1): number {
  // 3 second loop as specified
  const loopDuration = 3000;
  const progress = (timestamp % loopDuration) / loopDuration;
  return progress * 24 * speed; // 24px total offset for smooth loop
}

/**
 * Draw a selection highlight around a cell
 */
export function drawCellHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  type: 'primary' | 'alternative' = 'primary'
): void {
  ctx.save();
  
  const color = type === 'primary' ? 'var(--color-accent)' : 'var(--color-warn)';
  const padding = 2;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  // Draw selection rectangle
  const rectX = x * cellSize + padding;
  const rectY = y * cellSize + padding; 
  const rectW = cellSize - padding * 2;
  const rectH = cellSize - padding * 2;
  
  ctx.strokeRect(
    Math.round(rectX) + 0.5,
    Math.round(rectY) + 0.5,
    rectW,
    rectH
  );
  
  // Add glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.strokeRect(
    Math.round(rectX) + 0.5,
    Math.round(rectY) + 0.5,
    rectW,
    rectH
  );
  
  ctx.restore();
}

/**
 * Setup canvas for crisp rendering
 */
export function setupCrispCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  
  // Set canvas physical size
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  
  // Set canvas CSS size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Scale context to account for DPR
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  // Setup for crisp rendering
  ctx.imageSmoothingEnabled = false;
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  return dpr;
}