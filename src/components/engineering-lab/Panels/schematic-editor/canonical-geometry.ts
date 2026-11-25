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
  routedWires: { wireId: string; points: { x: number; y: number }[]; netName?: string; junctionPoint?: { x: number; y: number }; tappedWireId?: string }[],
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
    if (rw.tappedWireId && rw.points && rw.points.length >= 2) {
      const endPt = rw.points[rw.points.length - 1];
      const key = `${Math.round(endPt.x)},${Math.round(endPt.y)}`;
      dotMap.set(key, { x: Math.round(endPt.x), y: Math.round(endPt.y) });
    }
  });

  return Array.from(dotMap.values());
}

/**
 * Union-Find helper to manage electrical nets.
 */
class NetUnionFind {
  private parent = new Map<string, string>();

  find(i: string): string {
    if (!this.parent.has(i)) this.parent.set(i, i);
    if (this.parent.get(i) !== i) {
      this.parent.set(i, this.find(this.parent.get(i)!));
    }
    return this.parent.get(i)!;
  }

  union(i: string, j: string) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent.set(rootI, rootJ);
    }
  }

  connected(i: string, j: string): boolean {
    return this.find(i) === this.find(j);
  }
}

/**
 * Resolves a requested wire to the shortest net-connected trunk path or direct connection.
 * Enforces:
 * 1. Build Union-Find of ALL electrical nets in existingWires (including tappedWireId parent links).
 * 2. If from and to are ALREADY in the same electrical net AND no explicit manualWaypoints -> return skipDuplicate: true.
 * 3. If manualWaypoints are empty/undefined:
 *    - Check all existing wires in net(to) and net(from).
 *    - Project endpoint onto polyline of existing wire.
 *    - If a valid projection is shorter than directDist - 5, return T-junction tap!
 */
export function resolveShortestNetWire(
  fromCompId: string,
  fromPinId: string,
  toCompId: string,
  toPinId: string,
  components: CircuitComponent[],
  existingWires: CircuitWire[],
  manualWaypoints?: { x: number; y: number }[],
  gridStep = 10
): {
  skipDuplicate?: boolean;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  tappedWireId?: string;
  junctionPoint?: { x: number; y: number };
  points?: { x: number; y: number }[];
} {
  const uf = new NetUnionFind();
  for (const wire of existingWires) {
    const k1 = `${wire.fromCompId}:${wire.fromPinId}`;
    const k2 = `${wire.toCompId}:${wire.toPinId}`;
    uf.union(k1, k2);
    if (wire.tappedWireId) {
      const parentWire = existingWires.find((pw) => pw.id === wire.tappedWireId);
      if (parentWire) {
        uf.union(k1, `${parentWire.fromCompId}:${parentWire.fromPinId}`);
      }
    }
  }

  const keyFrom = `${fromCompId}:${fromPinId}`;
  const keyTo = `${toCompId}:${toPinId}`;

  if (keyFrom === keyTo) {
    return { skipDuplicate: true, fromCompId, fromPinId, toCompId, toPinId };
  }

  const hasExplicitWaypoints = Array.isArray(manualWaypoints) && manualWaypoints.length > 0;
  if (!hasExplicitWaypoints && uf.connected(keyFrom, keyTo)) {
    return {
      skipDuplicate: true,
      fromCompId,
      fromPinId,
      toCompId,
      toPinId,
    };
  }

  const fromComp = components.find((c) => c.id === fromCompId);
  const toComp = components.find((c) => c.id === toCompId);

  if (fromComp && toComp && !hasExplicitWaypoints) {
    const posFrom = getCanonicalPinWorldPos(fromComp, fromPinId);
    const posTo = getCanonicalPinWorldPos(toComp, toPinId);
    const directDist = Math.hypot(posFrom.x - posTo.x, posFrom.y - posTo.y);

    const rootTo = uf.find(keyTo);
    const rootFrom = uf.find(keyFrom);

    let bestTap: {
      fromC: string;
      fromP: string;
      toC: string;
      toP: string;
      wireId: string;
      point: { x: number; y: number };
      dist: number;
    } | null = null;

    // Check ALL existing wires belonging to net(to)
    for (const sw of existingWires) {
      const swNet = uf.find(`${sw.fromCompId}:${sw.fromPinId}`);
      if (swNet === rootTo) {
        const verts = getCanonicalWirePoints(sw, components, existingWires);
        const proj = projectPointOntoPolyline(posFrom, verts, gridStep);
        if (proj) {
          const dToPoint = Math.hypot(proj.point.x - posTo.x, proj.point.y - posTo.y);
          if (dToPoint > 4 || verts.length > 2) {
            if (proj.distance < directDist - 5) {
              if (!bestTap || proj.distance < bestTap.dist) {
                bestTap = {
                  fromC: fromCompId,
                  fromP: fromPinId,
                  toC: toCompId,
                  toP: toPinId,
                  wireId: sw.id,
                  point: proj.point,
                  dist: proj.distance,
                };
              }
            }
          }
        }
      }
    }

    // ALSO check reverse direction: ALL existing wires belonging to net(from)
    for (const sw of existingWires) {
      const swNet = uf.find(`${sw.fromCompId}:${sw.fromPinId}`);
      if (swNet === rootFrom) {
        const verts = getCanonicalWirePoints(sw, components, existingWires);
        const proj = projectPointOntoPolyline(posTo, verts, gridStep);
        if (proj) {
          const dFromPoint = Math.hypot(proj.point.x - posFrom.x, proj.point.y - posFrom.y);
          if (dFromPoint > 4 || verts.length > 2) {
            if (proj.distance < directDist - 5) {
              if (!bestTap || proj.distance < bestTap.dist) {
                // Swap so tapping endpoint is always `to` -> `junctionPoint`
                bestTap = {
                  fromC: toCompId,
                  fromP: toPinId,
                  toC: fromCompId,
                  toP: fromPinId,
                  wireId: sw.id,
                  point: proj.point,
                  dist: proj.distance,
                };
              }
            }
          }
        }
      }
    }

    if (bestTap) {
      return {
        fromCompId: bestTap.fromC,
        fromPinId: bestTap.fromP,
        toCompId: bestTap.toC,
        toPinId: bestTap.toP,
        tappedWireId: bestTap.wireId,
        junctionPoint: bestTap.point,
      };
    }
  }

  return {
    fromCompId,
    fromPinId,
    toCompId,
    toPinId,
    points: hasExplicitWaypoints ? manualWaypoints : undefined,
  };
}
