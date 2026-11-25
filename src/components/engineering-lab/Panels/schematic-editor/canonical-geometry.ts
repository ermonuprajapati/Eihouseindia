import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { calculateJunctionDots, Point } from '@/modules/engineering-lab/circuit-engine/wire-router';

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
 * Returns canonical wire polyline points [p1, ...waypoints, p2].
 * If wire has manual waypoints (wire.points), uses them.
 * Otherwise uses exact default orthogonal Manhattan routing from SchematicCanvas.tsx.
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

  if (wire.points && wire.points.length > 0) {
    return [p1, ...wire.points, p2];
  }

  // Exact default Manhattan routing from SchematicCanvas.tsx
  const elbow = (wire as unknown as { elbow?: string }).elbow;
  if (elbow === 'vertical-first') {
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }

  const midX = (p1.x + p2.x) / 2;
  return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
}

/**
 * Computes electrical solder junction dots using standard Manhattan T-junctions
 * and 3+ branch meetings, plus user manual junctions.
 */
export function computeCanonicalJunctions(
  routedWires: { wireId: string; points: { x: number; y: number }[]; netName?: string }[],
  manualJunctions: { x: number; y: number }[] = []
): { x: number; y: number }[] {
  const wiresWithVertices = routedWires.map((rw) => ({
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
