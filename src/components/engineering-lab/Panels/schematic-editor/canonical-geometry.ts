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
 * Returns canonical wire polyline points [p1, ...interiorWaypoints, p2].
 * Respects wire.points (interior waypoints only) and wire.style ('straight' | 'diagonal45' | 'orthogonal').
 * Uses exact getFullWireVertices from wire-router.ts for 100% parity with SchematicCanvas.tsx.
 */
export function getCanonicalWirePoints(
  wire: CircuitWire,
  components: CircuitComponent[]
): { x: number; y: number }[] {
  const fromComp = components.find((c) => c.id === wire.fromCompId);
  const toComp = components.find((c) => c.id === wire.toCompId);
  const fromPin = fromComp?.pins?.find((p) => p.id === wire.fromPinId);
  const toPin = toComp?.pins?.find((p) => p.id === wire.toPinId);

  if (!fromComp || !toComp || !fromPin || !toPin) {
    return wire.points && wire.points.length > 0 ? wire.points : [];
  }

  const p1 = getCanonicalPinWorldPos(fromComp, fromPin);
  const p2 = getCanonicalPinWorldPos(toComp, toPin);

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
  routedWires: { wireId: string; points: { x: number; y: number }[]; netName?: string }[],
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

  return Array.from(dotMap.values());
}
