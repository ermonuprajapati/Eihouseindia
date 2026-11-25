import { CircuitComponent, CircuitWire, WireRoutingStyle } from '@/modules/engineering-lab/types';
import {
  calculateJunctionDots,
  Point,
  getFullWireVertices,
  ElbowOrientation,
} from '@/modules/engineering-lab/circuit-engine/wire-router';

/**
 * Canonical Pin World Position calculation
 * EXACT formula from SchematicCanvas.tsx and schematic-erc.ts
 */
export function getCanonicalPinWorldPos(
  comp: CircuitComponent,
  pin: { x: number; y: number; id?: string } | string
): { x: number; y: number } {
  let targetPin: { x: number; y: number } | undefined;
  if (typeof pin === 'string') {
    targetPin = comp.pins?.find((p) => p.id === pin);
  } else {
    targetPin = pin;
  }

  if (!targetPin) {
    return { x: comp.x ?? 0, y: comp.y ?? 0 };
  }

  let px = targetPin.x;
  const py = targetPin.y;
  if (comp.mirrored) {
    px = -px;
  }
  const rad = ((comp.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = Math.round(px * cos - py * sin);
  const ry = Math.round(px * sin + py * cos);
  return { x: (comp.x ?? 0) + rx, y: (comp.y ?? 0) + ry };
}

/**
 * Projects a point onto the nearest segment of a polyline, snapping optionally to gridStep.
 */
export function projectPointOntoPolyline(
  pt: { x: number; y: number },
  vertices: { x: number; y: number }[],
  gridStep = 10
): { point: { x: number; y: number }; distance: number; segmentIndex: number } | null {
  if (!vertices || vertices.length < 2) return null;

  let best: { point: { x: number; y: number }; distance: number; segmentIndex: number } | null = null;

  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i];
    const b = vertices[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    let projX = a.x;
    let projY = a.y;

    if (lenSq > 1e-4) {
      const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
      projX = a.x + t * dx;
      projY = a.y + t * dy;
    }

    if (gridStep > 1) {
      if (Math.abs(dy) < 1) {
        projX = Math.round(projX / gridStep) * gridStep;
        projX = Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), projX));
      } else if (Math.abs(dx) < 1) {
        projY = Math.round(projY / gridStep) * gridStep;
        projY = Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), projY));
      } else {
        projX = Math.round(projX / gridStep) * gridStep;
        projY = Math.round(projY / gridStep) * gridStep;
      }
    } else {
      projX = Math.round(projX);
      projY = Math.round(projY);
    }

    const dist = Math.hypot(pt.x - projX, pt.y - projY);
    if (!best || dist < best.distance) {
      best = { point: { x: projX, y: projY }, distance: dist, segmentIndex: i };
    }
  }

  return best;
}

/**
 * Returns canonical wire polyline points [p1, ...interiorWaypoints, p2].
 * Respects wire.points (interior waypoints only) and wire.style ('straight' | 'diagonal45' | 'orthogonal').
 * Uses exact getFullWireVertices from wire-router.ts for 100% parity with SchematicCanvas.tsx.
 * Dynamically glues T-junction endpoints (wire.tappedWireId) to the parent wire's live polyline.
 */
export function getCanonicalWirePoints(
  wire: CircuitWire,
  components: CircuitComponent[],
  allWires: CircuitWire[] = [],
  visited: Set<string> = new Set<string>()
): { x: number; y: number }[] {
  if (visited.has(wire.id)) {
    return wire.points && wire.points.length > 0 ? wire.points : [];
  }
  visited.add(wire.id);

  const fromComp = components.find((c) => c.id === wire.fromCompId);
  const toComp = components.find((c) => c.id === wire.toCompId);
  const fromPin = fromComp?.pins?.find((p) => p.id === wire.fromPinId);
  const toPin = toComp?.pins?.find((p) => p.id === wire.toPinId);

  if (!fromComp || !fromPin) {
    return wire.points && wire.points.length > 0 ? wire.points : [];
  }

  const p1 = getCanonicalPinWorldPos(fromComp, fromPin);
  let p2 = toComp && toPin ? getCanonicalPinWorldPos(toComp, toPin) : { x: p1.x, y: p1.y };

  // If wire taps another parent wire, dynamically project onto parent wire's live vertices
  if (wire.tappedWireId && allWires && allWires.length > 0) {
    const parentWire = allWires.find((w) => w.id === wire.tappedWireId);
    if (parentWire) {
      const parentVerts = getCanonicalWirePoints(parentWire, components, allWires, new Set(visited));
      if (parentVerts.length >= 2) {
        const rawTarget = wire.junctionPoint || p2;
        const projected = projectPointOntoPolyline(rawTarget, parentVerts, 10);
        if (projected) {
          p2 = projected.point;
        } else if (wire.junctionPoint) {
          p2 = wire.junctionPoint;
        }
      } else if (wire.junctionPoint) {
        p2 = wire.junctionPoint;
      }
    } else if (wire.junctionPoint) {
      p2 = wire.junctionPoint;
    }
  } else if (wire.junctionPoint) {
    p2 = wire.junctionPoint;
  } else if (!toComp || !toPin) {
    return wire.points && wire.points.length > 0 ? wire.points : [];
  }

  // Interior-only contract: strip any accidental baked-in pin endpoints
  let interiorWaypoints: Point[] | undefined = undefined;
  if (wire.points && wire.points.length > 0) {
    let pts = [...wire.points];
    if (pts.length >= 2 && Math.abs(pts[0].x - p1.x) <= 1 && Math.abs(pts[0].y - p1.y) <= 1) {
      pts = pts.slice(1);
    }
    if (pts.length >= 1 && Math.abs(pts[pts.length - 1].x - p2.x) <= 1 && Math.abs(pts[pts.length - 1].y - p2.y) <= 1) {
      pts = pts.slice(0, -1);
    }
    if (pts.length > 0) {
      interiorWaypoints = pts as Point[];
    }
  }

  const style: WireRoutingStyle = (wire.style as WireRoutingStyle) || 'orthogonal';
  const elbow: ElbowOrientation = (wire as unknown as { elbow?: ElbowOrientation }).elbow || 'horizontal-first';

  return getFullWireVertices(p1, p2, interiorWaypoints, style, elbow);
}

/**
 * Computes electrical solder junction dots using standard Manhattan T-junctions
 * and 3+ branch meetings, plus user manual junctions.
 */
export function computeCanonicalJunctions(
  routedWires: { wireId: string; points: { x: number; y: number }[]; netName?: string; junctionPoint?: { x: number; y: number } }[],
  manualJunctions: { x: number; y: number }[] = []
): { x: number; y: number }[] {
  const validWires = (routedWires || []).filter(
    (rw) => rw && Array.isArray(rw.points) && rw.points.length >= 2
  );
  const wiresWithVertices = validWires.map((rw) => ({
    id: rw.wireId,
    vertices: rw.points as Point[],
    netName: rw.netName,
  }));

  const dots = calculateJunctionDots(wiresWithVertices);
  const dotMap = new Map<string, { x: number; y: number }>();

  dots.forEach((d) => {
    const key = `${Math.round(d.x)},${Math.round(d.y)}`;
    dotMap.set(key, { x: Math.round(d.x), y: Math.round(d.y) });
  });

  manualJunctions.forEach((mj) => {
    const key = `${Math.round(mj.x)},${Math.round(mj.y)}`;
    dotMap.set(key, { x: Math.round(mj.x), y: Math.round(mj.y) });
  });

  routedWires.forEach((rw) => {
    if (rw.junctionPoint) {
      const key = `${Math.round(rw.junctionPoint.x)},${Math.round(rw.junctionPoint.y)}`;
      dotMap.set(key, { x: Math.round(rw.junctionPoint.x), y: Math.round(rw.junctionPoint.y) });
    }
  });

  return Array.from(dotMap.values());
}
