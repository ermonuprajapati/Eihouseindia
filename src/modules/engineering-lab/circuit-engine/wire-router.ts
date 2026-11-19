/**
 * Professional EDA Schematic Wire Routing & Geometry Engine
 * Supports 90° Orthogonal (Manhattan), 45° Chamfer, and Straight routing.
 * Provides interactive segment sliding, vertex dragging, collinear segment simplification,
 * rubber-banding component movement, and T-junction / crossing detection.
 */

import { WireRoutingStyle } from '../types';

export interface Point {
  x: number;
  y: number;
}

export type ElbowOrientation = 'horizontal-first' | 'vertical-first';

export interface WireSegment {
  wireId: string;
  segmentIndex: number;
  p1: Point;
  p2: Point;
  isHorizontal: boolean;
  isVertical: boolean;
  length: number;
}

export interface WireJunction {
  x: number;
  y: number;
  netName?: string;
}

/**
 * Snap a point to the schematic grid (default 10px).
 */
export function snapToGrid(val: number, gridSize = 10): number {
  return Math.round(val / gridSize) * gridSize;
}

export function snapPointToGrid(p: Point, gridSize = 10): Point {
  return {
    x: snapToGrid(p.x, gridSize),
    y: snapToGrid(p.y, gridSize),
  };
}

/**
 * Removes consecutive duplicate vertices and merges collinear 3-point sequences.
 */
export function simplifyCollinearPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  // 1. Remove consecutive duplicates
  const deduped: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = points[i];
    if (Math.abs(curr.x - prev.x) > 0.5 || Math.abs(curr.y - prev.y) > 0.5) {
      deduped.push(curr);
    }
  }

  if (deduped.length <= 2) return deduped;

  // 2. Merge collinear sequences
  const result: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    // Collinear horizontal: prev.y === curr.y === next.y
    const isCollinearH =
      Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    // Collinear vertical: prev.x === curr.x === next.x
    const isCollinearV =
      Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;

    if (!isCollinearH && !isCollinearV) {
      result.push(curr);
    }
  }
  result.push(deduped[deduped.length - 1]);

  return result;
}

/**
 * Computes standard 90° Manhattan orthogonal vertices from p1 to p2.
 * Respects elbow orientation (horizontal-first vs vertical-first).
 */
export function computeOrthogonalVertices(
  p1: Point,
  p2: Point,
  elbow: ElbowOrientation = 'horizontal-first'
): Point[] {
  if (Math.abs(p1.x - p2.x) < 0.5 || Math.abs(p1.y - p2.y) < 0.5) {
    return [p1, p2];
  }

  if (elbow === 'horizontal-first') {
    const corner = { x: p2.x, y: p1.y };
    return [p1, corner, p2];
  } else {
    const corner = { x: p1.x, y: p2.y };
    return [p1, corner, p2];
  }
}

/**
 * Computes 45° chamfered vertices from p1 to p2.
 */
export function compute45Vertices(
  p1: Point,
  p2: Point,
  elbow: ElbowOrientation = 'horizontal-first'
): Point[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
    return [p1, p2];
  }

  const signX = Math.sign(dx);
  const signY = Math.sign(dy);
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (elbow === 'horizontal-first') {
    if (absX >= absY) {
      const corner1 = { x: p1.x + signX * (absX - absY), y: p1.y };
      return [p1, corner1, p2];
    } else {
      const corner1 = { x: p2.x, y: p1.y + signY * (absX) };
      return [p1, corner1, p2];
    }
  } else {
    if (absY >= absX) {
      const corner1 = { x: p1.x, y: p1.y + signY * (absY - absX) };
      return [p1, corner1, p2];
    } else {
      const corner1 = { x: p1.x + signX * absY, y: p2.y };
      return [p1, corner1, p2];
    }
  }
}

/**
 * Resolves full ordered list of vertices for a wire from start pin to end pin.
 */
export function getFullWireVertices(
  p1: Point,
  p2: Point,
  waypoints?: Point[],
  style: WireRoutingStyle = 'orthogonal',
  elbow: ElbowOrientation = 'horizontal-first'
): Point[] {
  if (waypoints && waypoints.length > 0) {
    const raw = [p1, ...waypoints, p2];
    return simplifyCollinearPoints(raw);
  }

  if (style === 'straight') {
    return [p1, p2];
  }

  if (style === 'diagonal45') {
    return compute45Vertices(p1, p2, elbow);
  }

  // Orthogonal default
  return computeOrthogonalVertices(p1, p2, elbow);
}

/**
 * Generates an SVG path string from an array of vertices.
 */
export function verticesToSvgPath(vertices: Point[]): string {
  if (vertices.length === 0) return '';
  let d = `M ${vertices[0].x} ${vertices[0].y}`;
  for (let i = 1; i < vertices.length; i++) {
    d += ` L ${vertices[i].x} ${vertices[i].y}`;
  }
  return d;
}

/**
 * Extracts line segments from wire vertices for interactive dragging.
 */
export function extractWireSegments(wireId: string, vertices: Point[]): WireSegment[] {
  const segments: WireSegment[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i];
    const b = vertices[i + 1];
    const isHorizontal = Math.abs(a.y - b.y) < 1;
    const isVertical = Math.abs(a.x - b.x) < 1;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({
      wireId,
      segmentIndex: i,
      p1: a,
      p2: b,
      isHorizontal,
      isVertical,
      length,
    });
  }
  return segments;
}

/**
 * Slidably drags a wire segment perpendicular to its orientation,
 * keeping both wire terminal ends anchored to their pins and maintaining 90° orthogonal angles.
 * Returns the updated list of intermediate waypoints.
 */
export function slideWireSegment(
  vertices: Point[],
  segmentIndex: number,
  newCoord: number,
  gridSize = 10
): Point[] {
  if (vertices.length < 2 || segmentIndex < 0 || segmentIndex >= vertices.length - 1) {
    return vertices.slice(1, -1);
  }

  const snapped = snapToGrid(newCoord, gridSize);
  const pStart = vertices[0];
  const pEnd = vertices[vertices.length - 1];

  // Case A: 2-point wire (p1 -> p2)
  if (vertices.length === 2) {
    const p1 = vertices[0];
    const p2 = vertices[1];
    const isH = Math.abs(p1.y - p2.y) < 1;
    if (isH) {
      // Horizontal segment dragged vertically
      const newWaypoints = [
        { x: p1.x, y: snapped },
        { x: p2.x, y: snapped },
      ];
      return simplifyCollinearPoints([p1, ...newWaypoints, p2]).slice(1, -1);
    } else {
      // Vertical segment dragged horizontally
      const newWaypoints = [
        { x: snapped, y: p1.y },
        { x: snapped, y: p2.y },
      ];
      return simplifyCollinearPoints([p1, ...newWaypoints, p2]).slice(1, -1);
    }
  }

  // Clone current vertices
  const updated: Point[] = vertices.map((v) => ({ ...v }));
  const a = updated[segmentIndex];
  const b = updated[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < 1;

  if (isHorizontal) {
    // Sliding horizontal segment along Y
    if (segmentIndex === 0) {
      // First segment: a is pStart, anchored. Split with vertical leg
      updated.splice(1, 0, { x: a.x, y: snapped });
      updated[2].y = snapped;
    } else if (segmentIndex === vertices.length - 2) {
      // Last segment: b is pEnd, anchored.
      updated[segmentIndex].y = snapped;
      updated.splice(segmentIndex + 1, 0, { x: b.x, y: snapped });
    } else {
      // Middle segment: adjust Y of both ends
      a.y = snapped;
      b.y = snapped;
    }
  } else {
    // Sliding vertical segment along X
    if (segmentIndex === 0) {
      // First segment: a is pStart, anchored. Split with horizontal leg
      updated.splice(1, 0, { x: snapped, y: a.y });
      updated[2].x = snapped;
    } else if (segmentIndex === vertices.length - 2) {
      // Last segment: b is pEnd, anchored.
      updated[segmentIndex].x = snapped;
      updated.splice(segmentIndex + 1, 0, { x: snapped, y: b.y });
    } else {
      // Middle segment: adjust X of both ends
      a.x = snapped;
      b.x = snapped;
    }
  }

  // Keep endpoints locked
  updated[0] = pStart;
  updated[updated.length - 1] = pEnd;

  const simplified = simplifyCollinearPoints(updated);
  return simplified.slice(1, -1);
}

/**
 * Drags an intermediate corner vertex, snapping to grid and preserving orthogonal routing.
 */
export function dragWireCornerVertex(
  vertices: Point[],
  vertexIndex: number,
  targetPos: Point,
  gridSize = 10
): Point[] {
  if (vertexIndex <= 0 || vertexIndex >= vertices.length - 1) {
    return vertices.slice(1, -1);
  }

  const snapped = snapPointToGrid(targetPos, gridSize);
  const updated = vertices.map((v) => ({ ...v }));
  updated[vertexIndex] = snapped;

  // Orthogonal correction for adjacent segments
  const prev = updated[vertexIndex - 1];
  const next = updated[vertexIndex + 1];

  if (prev) {
    if (Math.abs(prev.y - vertices[vertexIndex].y) < 1) {
      prev.y = snapped.y; // Keep previous segment horizontal
    } else if (Math.abs(prev.x - vertices[vertexIndex].x) < 1) {
      prev.x = snapped.x; // Keep previous segment vertical
    }
  }

  if (next) {
    if (Math.abs(next.y - vertices[vertexIndex].y) < 1) {
      next.y = snapped.y; // Keep next segment horizontal
    } else if (Math.abs(next.x - vertices[vertexIndex].x) < 1) {
      next.x = snapped.x; // Keep next segment vertical
    }
  }

  const simplified = simplifyCollinearPoints(updated);
  return simplified.slice(1, -1);
}

/**
 * Calculates genuine T-junction points where a wire terminates onto another wire
 * or where 3 or more wires meet at the exact same point.
 * Crossing lines with no connection do NOT produce a junction dot.
 */
export function calculateJunctionDots(
  wiresWithVertices: { id: string; vertices: Point[]; netName?: string }[]
): WireJunction[] {
  const junctions: WireJunction[] = [];
  const junctionKeySet = new Set<string>();

  // 1. T-Junction: Endpoint of one wire lies on a segment of another wire
  for (let i = 0; i < wiresWithVertices.length; i++) {
    const wA = wiresWithVertices[i];
    const endsA = [wA.vertices[0], wA.vertices[wA.vertices.length - 1]];

    for (const endPt of endsA) {
      for (let j = 0; j < wiresWithVertices.length; j++) {
        if (i === j) continue;
        const wB = wiresWithVertices[j];
        for (let s = 0; s < wB.vertices.length - 1; s++) {
          const p1 = wB.vertices[s];
          const p2 = wB.vertices[s + 1];

          // Check if endPt is strictly between p1 and p2
          const isH = Math.abs(p1.y - p2.y) < 1 && Math.abs(endPt.y - p1.y) < 1;
          const isV = Math.abs(p1.x - p2.x) < 1 && Math.abs(endPt.x - p1.x) < 1;

          let onSegment = false;
          if (isH) {
            const minX = Math.min(p1.x, p2.x);
            const maxX = Math.max(p1.x, p2.x);
            if (endPt.x > minX + 2 && endPt.x < maxX - 2) {
              onSegment = true;
            }
          } else if (isV) {
            const minY = Math.min(p1.y, p2.y);
            const maxY = Math.max(p1.y, p2.y);
            if (endPt.y > minY + 2 && endPt.y < maxY - 2) {
              onSegment = true;
            }
          }

          if (onSegment) {
            const key = `${Math.round(endPt.x)},${Math.round(endPt.y)}`;
            if (!junctionKeySet.has(key)) {
              junctionKeySet.add(key);
              junctions.push({
                x: Math.round(endPt.x),
                y: Math.round(endPt.y),
                netName: wA.netName || wB.netName,
              });
            }
          }
        }
      }
    }
  }

  // 2. Vertex Node Junction: 3 or more wires sharing the exact same terminal/vertex point
  const coordCounts = new Map<string, { count: number; x: number; y: number; netName?: string }>();
  for (const w of wiresWithVertices) {
    for (const v of w.vertices) {
      const key = `${Math.round(v.x)},${Math.round(v.y)}`;
      const entry = coordCounts.get(key) || { count: 0, x: Math.round(v.x), y: Math.round(v.y), netName: w.netName };
      entry.count += 1;
      coordCounts.set(key, entry);
    }
  }

  coordCounts.forEach((val, key) => {
    if (val.count >= 3 && !junctionKeySet.has(key)) {
      junctionKeySet.add(key);
      junctions.push({ x: val.x, y: val.y, netName: val.netName });
    }
  });

  return junctions;
}
