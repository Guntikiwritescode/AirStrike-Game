import { Point, DrawableGlyph, DrawablePath, DrawableText, HitTestResult } from './types';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface QuadTreeNode {
  bounds: Rectangle;
  objects: Drawable[];
  children: QuadTreeNode[] | null;
  level: number;
}

type Drawable = (DrawableGlyph | DrawablePath | DrawableText) & {
  bounds: Rectangle;
  type: 'track' | 'boundary' | 'overlay';
};

export class QuadTree {
  private root: QuadTreeNode;
  private maxObjects: number;
  private maxLevels: number;

  constructor(bounds: Rectangle, maxObjects = 10, maxLevels = 5) {
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.root = {
      bounds,
      objects: [],
      children: null,
      level: 0
    };
  }

  public clear(): void {
    this.clearNode(this.root);
  }

  private clearNode(node: QuadTreeNode): void {
    node.objects = [];
    if (node.children) {
      node.children.forEach(child => this.clearNode(child));
      node.children = null;
    }
  }

  public insert(object: Drawable): void {
    this.insertIntoNode(this.root, object);
  }

  private insertIntoNode(node: QuadTreeNode, object: Drawable): void {
    if (node.children) {
      const index = this.getIndex(node, object.bounds);
      if (index !== -1) {
        this.insertIntoNode(node.children[index], object);
        return;
      }
    }

    node.objects.push(object);

    if (node.objects.length > this.maxObjects && node.level < this.maxLevels) {
      if (!node.children) {
        this.split(node);
      }

      let i = 0;
      while (i < node.objects.length) {
        const index = this.getIndex(node, node.objects[i].bounds);
        if (index !== -1) {
          const obj = node.objects.splice(i, 1)[0];
          this.insertIntoNode(node.children![index], obj);
        } else {
          i++;
        }
      }
    }
  }

  private split(node: QuadTreeNode): void {
    const subWidth = node.bounds.width / 2;
    const subHeight = node.bounds.height / 2;
    const x = node.bounds.x;
    const y = node.bounds.y;

    node.children = [
      // Top right
      {
        bounds: { x: x + subWidth, y, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Top left
      {
        bounds: { x, y, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Bottom left
      {
        bounds: { x, y: y + subHeight, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Bottom right
      {
        bounds: { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      }
    ];
  }

  private getIndex(node: QuadTreeNode, bounds: Rectangle): number {
    let index = -1;
    const verticalMidpoint = node.bounds.x + node.bounds.width / 2;
    const horizontalMidpoint = node.bounds.y + node.bounds.height / 2;

    const topQuadrant = bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const bottomQuadrant = bounds.y > horizontalMidpoint;

    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    } else if (bounds.x > verticalMidpoint) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }

    return index;
  }

  public query(bounds: Rectangle): Drawable[] {
    const result: Drawable[] = [];
    this.queryNode(this.root, bounds, result);
    return result;
  }

  private queryNode(node: QuadTreeNode, bounds: Rectangle, result: Drawable[]): void {
    if (!this.intersects(bounds, node.bounds)) {
      return;
    }

    node.objects.forEach(obj => {
      if (this.intersects(bounds, obj.bounds)) {
        result.push(obj);
      }
    });

    if (node.children) {
      node.children.forEach(child => {
        this.queryNode(child, bounds, result);
      });
    }
  }

  private intersects(a: Rectangle, b: Rectangle): boolean {
    return !(a.x > b.x + b.width || 
             a.x + a.width < b.x || 
             a.y > b.y + b.height || 
             a.y + a.height < b.y);
  }

  public hitTest(point: Point, tolerance = 5): HitTestResult {
    const queryBounds = {
      x: point.x - tolerance,
      y: point.y - tolerance,
      width: tolerance * 2,
      height: tolerance * 2
    };

    const candidates = this.query(queryBounds);
    
    // Sort by distance to find closest hit
    const hits = candidates
      .map(obj => ({
        object: obj,
        distance: this.distanceToObject(point, obj)
      }))
      .filter(hit => hit.distance <= tolerance)
      .sort((a, b) => a.distance - b.distance);

    if (hits.length > 0) {
      const closest = hits[0].object;
      return {
        hit: true,
        type: closest.type,
        id: closest.id,
        data: closest
      };
    }

    return { hit: false };
  }

  private distanceToObject(point: Point, object: Drawable): number {
    switch (object.type) {
      case 'track':
        return this.distanceToPoint(point, { 
          x: object.bounds.x + object.bounds.width / 2, 
          y: object.bounds.y + object.bounds.height / 2 
        });
      
      case 'boundary':
        if ('points' in object) {
          return this.distanceToPath(point, object.points || []);
        }
        return Infinity;
        
      case 'overlay':
        return this.distanceToRectangle(point, object.bounds);
        
      default:
        return Infinity;
    }
  }

  private distanceToPoint(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private distanceToPath(point: Point, path: Point[]): number {
    if (path.length === 0) return Infinity;
    if (path.length === 1) return this.distanceToPoint(point, path[0]);

    let minDistance = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const distance = this.distanceToLineSegment(point, path[i], path[i + 1]);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return this.distanceToPoint(point, lineStart);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const closest = {
      x: lineStart.x + param * C,
      y: lineStart.y + param * D
    };

    return this.distanceToPoint(point, closest);
  }

  private distanceToRectangle(point: Point, rect: Rectangle): number {
    const dx = Math.max(0, Math.max(rect.x - point.x, point.x - (rect.x + rect.width)));
    const dy = Math.max(0, Math.max(rect.y - point.y, point.y - (rect.y + rect.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Debug visualization
  public getDebugData(): QuadTreeNode {
    return this.root;
  }
}