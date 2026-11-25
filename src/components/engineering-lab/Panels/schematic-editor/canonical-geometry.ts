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
    if (rw.tappedWireId && rw.points && rw.points.length >= 2) {
      const endPt = rw.points[rw.points.length - 1];
      const key = `${Math.round(endPt.x)},${Math.round(endPt.y)}`;
      dotMap.set(key, { x: Math.round(endPt.x), y: Math.round(endPt.y) });
    } else if (rw.junctionPoint) {
      const key = `${Math.round(rw.junctionPoint.x)},${Math.round(rw.junctionPoint.y)}`;
      dotMap.set(key, { x: Math.round(rw.junctionPoint.x), y: Math.round(rw.junctionPoint.y) });
    }
  });

  return Array.from(dotMap.values());
}

export function polylineManhattanLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
  }
  return len;
}

function deduplicatePoints(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length <= 1) return pts;
  const res: { x: number; y: number }[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = res[res.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > 0.5) {
      res.push(pts[i]);
    }
  }
  return res;
}

export interface CanonicalRoutedWire {
  wireId: string;
  points: { x: number; y: number }[];
  svgPath: string;            // SVG path string including upward semicircular bridge arcs at different-net crossings
  hasCrossingHops: boolean;
  netId: string;
  netName?: string;
  autoTappedWireId?: string;  // Set when wire was truncated/merged onto a same-net trunk wire
  autoJunctionPoint?: { x: number; y: number };
  autoTappedReversed?: boolean; // TRUE when walkPts had to be reversed (fromCompId was P_old, toCompId was P_new)
}

export interface CanonicalSchematicGeometry {
  routedWires: CanonicalRoutedWire[];
  wireMap: Map<string, CanonicalRoutedWire>;
  junctionDots: { x: number; y: number; netName?: string }[];
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

export function computeCanonicalSchematicGeometry(
  wires: CircuitWire[],
  components: CircuitComponent[],
  manualJunctions: { x: number; y: number }[] = [],
  gridStep = 10
): CanonicalSchematicGeometry {
  // 1. Build Electrical Nets (Union-Find)
  const uf = new NetUnionFind();
  for (const wire of wires) {
    const k1 = `${wire.fromCompId}:${wire.fromPinId}`;
    const k2 = `${wire.toCompId}:${wire.toPinId}`;
    uf.union(k1, k2);
    if (wire.tappedWireId) {
      const pw = wires.find((w) => w.id === wire.tappedWireId);
      if (pw) {
        uf.union(k1, `${pw.fromCompId}:${pw.fromPinId}`);
      }
    }
  }

  const netWireMap = new Map<string, CircuitWire[]>();
  for (const w of wires) {
    const netId = uf.find(`${w.fromCompId}:${w.fromPinId}`);
    if (!netWireMap.has(netId)) {
      netWireMap.set(netId, []);
    }
    netWireMap.get(netId)!.push(w);
  }

  const routedWireEntries: CanonicalRoutedWire[] = [];

  // 2. Per-Net Prim-Style Shared-Trunk Routing
  netWireMap.forEach((netWires, netId) => {
    if (netWires.length === 1) {
      const w = netWires[0];
      const rawPts = getCanonicalWirePoints(w, components, wires);
      routedWireEntries.push({
        wireId: w.id,
        points: rawPts,
        svgPath: '',
        hasCrossingHops: false,
        netId,
        netName: w.netName,
      });
      return;
    }

    // >= 2 wires in net
    const rawPtsMap = new Map<string, { x: number; y: number }[]>();
    for (const w of netWires) {
      rawPtsMap.set(w.id, getCanonicalWirePoints(w, components, wires));
    }

    const validNetWires = netWires.filter((w) => (rawPtsMap.get(w.id)?.length || 0) >= 2);
    const invalidNetWires = netWires.filter((w) => (rawPtsMap.get(w.id)?.length || 0) < 2);

    for (const w of invalidNetWires) {
      routedWireEntries.push({
        wireId: w.id,
        points: rawPtsMap.get(w.id) || [],
        svgPath: '',
        hasCrossingHops: false,
        netId,
        netName: w.netName,
      });
    }

    if (validNetWires.length === 0) return;
    if (validNetWires.length === 1) {
      const w = validNetWires[0];
      routedWireEntries.push({
        wireId: w.id,
        points: rawPtsMap.get(w.id) || [],
        svgPath: '',
        hasCrossingHops: false,
        netId,
        netName: w.netName,
      });
      return;
    }

    const pinDegree = new Map<string, number>();
    for (const w of validNetWires) {
      const kFrom = `${w.fromCompId}:${w.fromPinId}`;
      const kTo = `${w.toCompId}:${w.toPinId}`;
      pinDegree.set(kFrom, (pinDegree.get(kFrom) || 0) + 1);
      pinDegree.set(kTo, (pinDegree.get(kTo) || 0) + 1);
    }

    // Identify Hub / Destination Pin
    let hubPinKey: string | null = null;
    let maxDeg = -1;
    let hubIsSource = false;

    pinDegree.forEach((deg, pinKey) => {
      const [compId] = pinKey.split(':');
      const comp = components.find((c) => c.id === compId);
      const isSrc = comp
        ? comp.type === 'GROUND' ||
          comp.type === 'BATTERY' ||
          comp.type?.toLowerCase().includes('gnd') ||
          comp.type?.toLowerCase().includes('bat')
        : false;

      let better = false;
      if (deg > maxDeg) {
        better = true;
      } else if (deg === maxDeg) {
        if (isSrc && !hubIsSource) {
          better = true;
        }
      }
      if (better) {
        maxDeg = deg;
        hubPinKey = pinKey;
        hubIsSource = isSrc;
      }
    });

    const connectedPins = new Set<string>();
    const netTreeSegments: Array<{ wireId: string; p1: { x: number; y: number }; p2: { x: number; y: number } }> = [];
    const routedInNet = new Set<string>();

    const getWireSpan = (w: CircuitWire): number => {
      const pts = rawPtsMap.get(w.id) || [];
      if (pts.length < 2) return 0;
      const kFrom = `${w.fromCompId}:${w.fromPinId}`;
      const kTo = `${w.toCompId}:${w.toPinId}`;
      if (hubPinKey && (kFrom === hubPinKey || kTo === hubPinKey)) {
        const hubPt = kFrom === hubPinKey ? pts[0] : pts[pts.length - 1];
        const otherPt = kFrom === hubPinKey ? pts[pts.length - 1] : pts[0];
        return Math.abs(hubPt.x - otherPt.x) + Math.abs(hubPt.y - otherPt.y);
      }
      return Math.abs(pts[0].x - pts[pts.length - 1].x) + Math.abs(pts[0].y - pts[pts.length - 1].y);
    };

    // Pick Primary Trunk Wire #1 FIRST
    const hubTouchingWires = validNetWires.filter(
      (w) => !w.tappedWireId && (`${w.fromCompId}:${w.fromPinId}` === hubPinKey || `${w.toCompId}:${w.toPinId}` === hubPinKey)
    );
    const candidateTrunks = hubTouchingWires.length > 0 ? hubTouchingWires : validNetWires.filter((w) => !w.tappedWireId);
    const trunkPool = candidateTrunks.length > 0 ? candidateTrunks : validNetWires;

    let trunk1 = trunkPool[0];
    let maxSpan = -1;
    for (const w of trunkPool) {
      const span = getWireSpan(w);
      if (span > maxSpan) {
        maxSpan = span;
        trunk1 = w;
      }
    }

    const trunk1Pts = rawPtsMap.get(trunk1.id)!;
    routedInNet.add(trunk1.id);
    connectedPins.add(`${trunk1.fromCompId}:${trunk1.fromPinId}`);
    connectedPins.add(`${trunk1.toCompId}:${trunk1.toPinId}`);
    for (let i = 0; i < trunk1Pts.length - 1; i++) {
      netTreeSegments.push({ wireId: trunk1.id, p1: trunk1Pts[i], p2: trunk1Pts[i + 1] });
    }
    routedWireEntries.push({
      wireId: trunk1.id,
      points: trunk1Pts,
      svgPath: '',
      hasCrossingHops: false,
      netId,
      netName: trunk1.netName,
    });

    // Iteratively Attach Every Remaining Wire in the Net
    while (routedInNet.size < validNetWires.length) {
      const unrouted = validNetWires.filter((w) => !routedInNet.has(w.id));
      const connectedCandidates = unrouted.filter((w) => {
        const kFrom = `${w.fromCompId}:${w.fromPinId}`;
        const kTo = `${w.toCompId}:${w.toPinId}`;
        return connectedPins.has(kFrom) || connectedPins.has(kTo);
      });

      let nextWire: CircuitWire;
      if (connectedCandidates.length > 0) {
        connectedCandidates.sort((a, b) => {
          const aTapped = a.tappedWireId ? 1 : 0;
          const bTapped = b.tappedWireId ? 1 : 0;
          if (aTapped !== bTapped) return aTapped - bTapped;
          return getWireSpan(b) - getWireSpan(a);
        });
        nextWire = connectedCandidates[0];
      } else {
        unrouted.sort((a, b) => getWireSpan(b) - getWireSpan(a));
        nextWire = unrouted[0];
      }

      const w = nextWire;
      routedInNet.add(w.id);
      const rawPts = rawPtsMap.get(w.id) || [];
      const kFrom = `${w.fromCompId}:${w.fromPinId}`;
      const kTo = `${w.toCompId}:${w.toPinId}`;

      // Case 1: w.tappedWireId is explicitly set
      if (w.tappedWireId) {
        let finalPts = rawPts;
        const parentSegs = netTreeSegments.filter((s) => s.wireId === w.tappedWireId);
        if (parentSegs.length > 0) {
          const parentPoly = [parentSegs[0].p1];
          for (const s of parentSegs) {
            parentPoly.push(s.p2);
          }
          const rawTarget = w.junctionPoint || (rawPts.length >= 2 ? rawPts[rawPts.length - 1] : { x: 0, y: 0 });
          const proj = projectPointOntoPolyline(rawTarget, parentPoly, gridStep);
          if (proj && rawPts.length >= 2) {
            const style: WireRoutingStyle = (w.style as WireRoutingStyle) || 'orthogonal';
            const elbow: ElbowOrientation = (w as unknown as { elbow?: ElbowOrientation }).elbow || 'horizontal-first';
            finalPts = getFullWireVertices(rawPts[0], proj.point, w.points && w.points.length > 0 ? (w.points as Point[]) : undefined, style, elbow);
          }
        }
        const junctionPt = finalPts.length >= 2 ? finalPts[finalPts.length - 1] : w.junctionPoint;
        connectedPins.add(kFrom);
        connectedPins.add(kTo);
        for (let i = 0; i < finalPts.length - 1; i++) {
          netTreeSegments.push({ wireId: w.id, p1: finalPts[i], p2: finalPts[i + 1] });
        }
        routedWireEntries.push({
          wireId: w.id,
          points: finalPts,
          svgPath: '',
          hasCrossingHops: false,
          netId,
          netName: w.netName,
          autoTappedWireId: w.tappedWireId,
          autoJunctionPoint: junctionPt,
        });
        continue;
      }

      // Case 2: If BOTH endpoints are already in connectedPins
      if (connectedPins.has(kFrom) && connectedPins.has(kTo)) {
        for (let i = 0; i < rawPts.length - 1; i++) {
          netTreeSegments.push({ wireId: w.id, p1: rawPts[i], p2: rawPts[i + 1] });
        }
        routedWireEntries.push({
          wireId: w.id,
          points: rawPts,
          svgPath: '',
          hasCrossingHops: false,
          netId,
          netName: w.netName,
        });
        continue;
      }

      // Case 3: EXACTLY ONE endpoint (P_new) is NOT yet in connectedPins and the other (P_old) IS already in connectedPins
      const fromInConnected = connectedPins.has(kFrom);
      const toInConnected = connectedPins.has(kTo);
      if ((fromInConnected && !toInConnected) || (!fromInConnected && toInConnected)) {
        const isReversed = fromInConnected; // w.from is P_old, w.to is P_new
        const P_new_key = isReversed ? kTo : kFrom;

        const walkPts = isReversed ? [...rawPts].reverse() : [...rawPts];
        const P_new = walkPts[0];
        const P_old = walkPts[walkPts.length - 1];
        const hasUserWaypoints = Array.isArray(w.points) && w.points.length > 0;

        // Candidate A: Geometric Intersection / First-Touch Collinear Truncation along walkPts
        let candA: { pts: { x: number; y: number }[]; len: number; hitWireId: string; junctionPt: { x: number; y: number } } | null = null;
        for (let segIdx = 0; segIdx < walkPts.length - 1; segIdx++) {
          const a = walkPts[segIdx];
          const b = walkPts[segIdx + 1];

          let bestJ: { pt: { x: number; y: number }; distFromA: number; hitWireId: string } | null = null;

          for (const treeSeg of netTreeSegments) {
            const c = treeSeg.p1;
            const d = treeSeg.p2;

            const isAH = Math.abs(a.y - b.y) < 1;
            const isAV = Math.abs(a.x - b.x) < 1;
            const isCH = Math.abs(c.y - d.y) < 1;
            const isCV = Math.abs(c.x - d.x) < 1;

            let J: { x: number; y: number } | null = null;

            // 1. Perpendicular crossing / T-touch
            if (!J && isAH && isCV) {
              const vx = c.x;
              const hy = a.y;
              const minAX = Math.min(a.x, b.x);
              const maxAX = Math.max(a.x, b.x);
              const minCY = Math.min(c.y, d.y);
              const maxCY = Math.max(c.y, d.y);
              if (vx >= minAX - 1 && vx <= maxAX + 1 && hy >= minCY - 1 && hy <= maxCY + 1) {
                J = { x: vx, y: hy };
              }
            } else if (!J && isAV && isCH) {
              const vx = a.x;
              const hy = c.y;
              const minAY = Math.min(a.y, b.y);
              const maxAY = Math.max(a.y, b.y);
              const minCX = Math.min(c.x, d.x);
              const maxCX = Math.max(c.x, d.x);
              if (hy >= minAY - 1 && hy <= maxAY + 1 && vx >= minCX - 1 && vx <= maxCX + 1) {
                J = { x: vx, y: hy };
              }
            } else if (!J && isAH && isCH && Math.abs(a.y - c.y) < 1) {
              // 2. Collinear horizontal overlap
              const minAX = Math.min(a.x, b.x);
              const maxAX = Math.max(a.x, b.x);
              const minCX = Math.min(c.x, d.x);
              const maxCX = Math.max(c.x, d.x);
              if (maxAX >= minCX - 1 && minAX <= maxCX + 1) {
                if (a.x >= minCX - 1 && a.x <= maxCX + 1) {
                  if (Math.hypot(a.x - P_new.x, a.y - P_new.y) > 3) {
                    J = { x: a.x, y: a.y };
                  }
                } else if (b.x > a.x) {
                  J = { x: Math.min(c.x, d.x), y: a.y };
                } else if (b.x < a.x) {
                  J = { x: Math.max(c.x, d.x), y: a.y };
                }
              }
            } else if (!J && isAV && isCV && Math.abs(a.x - c.x) < 1) {
              // 2. Collinear vertical overlap
              const minAY = Math.min(a.y, b.y);
              const maxAY = Math.max(a.y, b.y);
              const minCY = Math.min(c.y, d.y);
              const maxCY = Math.max(c.y, d.y);
              if (maxAY >= minCY - 1 && minAY <= maxCY + 1) {
                if (a.y >= minCY - 1 && a.y <= maxCY + 1) {
                  if (Math.hypot(a.x - P_new.x, a.y - P_new.y) > 3) {
                    J = { x: a.x, y: a.y };
                  }
                } else if (b.y > a.y) {
                  J = { x: a.x, y: Math.min(c.y, d.y) };
                } else if (b.y < a.y) {
                  J = { x: a.x, y: Math.max(c.y, d.y) };
                }
              }
            }

            if (!J) {
              // General segment-segment intersection
              const denom = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
              if (Math.abs(denom) > 1e-4) {
                const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denom;
                const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denom;
                if (ua >= -0.01 && ua <= 1.01 && ub >= -0.01 && ub <= 1.01) {
                  const ix = Math.round(a.x + ua * (b.x - a.x));
                  const iy = Math.round(a.y + ua * (b.y - a.y));
                  J = { x: ix, y: iy };
                }
              }
            }

            if (!J) {
              if (Math.hypot(b.x - c.x, b.y - c.y) < 2) {
                J = { x: c.x, y: c.y };
              } else if (Math.hypot(b.x - d.x, b.y - d.y) < 2) {
                J = { x: d.x, y: d.y };
              } else if (Math.hypot(a.x - c.x, a.y - c.y) < 2) {
                J = { x: c.x, y: c.y };
              } else if (Math.hypot(a.x - d.x, a.y - d.y) < 2) {
                J = { x: d.x, y: d.y };
              }
            }

            if (J) {
              const dNew = Math.hypot(J.x - P_new.x, J.y - P_new.y);
              const dOld = Math.hypot(J.x - P_old.x, J.y - P_old.y);
              if (dNew > 3 && dOld > 4) {
                const distFromA = Math.hypot(J.x - a.x, J.y - a.y);
                if (!bestJ || distFromA < bestJ.distFromA) {
                  bestJ = { pt: J, distFromA, hitWireId: treeSeg.wireId };
                }
              }
            }
          }

          if (bestJ) {
            const prefix = walkPts.slice(0, segIdx + 1);
            const candPts = deduplicatePoints([...prefix, bestJ.pt]);
            candA = {
              pts: candPts,
              len: polylineManhattanLength(candPts),
              hitWireId: bestJ.hitWireId,
              junctionPt: bestJ.pt,
            };
            break;
          }
        }

        // Candidate B: Shortest Orthogonal Perpendicular Trunk Tap (ONLY when !hasUserWaypoints)
        let candB: { pts: { x: number; y: number }[]; len: number; hitWireId: string; junctionPt: { x: number; y: number } } | null = null;
        if (!hasUserWaypoints) {
          let bestB: { pt: { x: number; y: number }; dist: number; hitWireId: string; isHoriz: boolean } | null = null;
          for (const treeSeg of netTreeSegments) {
            const proj = projectPointOntoPolyline(P_new, [treeSeg.p1, treeSeg.p2], gridStep);
            if (proj) {
              const J = proj.point;
              const dNew = Math.hypot(P_new.x - J.x, P_new.y - J.y);
              const dOld = Math.hypot(J.x - P_old.x, J.y - P_old.y);
              if (dNew > 4 && dOld > 4) {
                const mDist = Math.abs(P_new.x - J.x) + Math.abs(P_new.y - J.y);
                if (!bestB || mDist < bestB.dist) {
                  const isHoriz = Math.abs(treeSeg.p1.y - treeSeg.p2.y) < 1;
                  bestB = { pt: J, dist: mDist, hitWireId: treeSeg.wireId, isHoriz };
                }
              }
            }
          }

          if (bestB) {
            const J = bestB.pt;
            let candBPts: { x: number; y: number }[];
            if (bestB.isHoriz) {
              if (Math.abs(P_new.x - J.x) < 1) {
                candBPts = [P_new, J];
              } else {
                candBPts = [P_new, { x: J.x, y: P_new.y }, J];
              }
            } else {
              if (Math.abs(P_new.y - J.y) < 1) {
                candBPts = [P_new, J];
              } else {
                candBPts = [P_new, { x: P_new.x, y: J.y }, J];
              }
            }
            candBPts = deduplicatePoints(candBPts);
            const candBLen = polylineManhattanLength(candBPts);
            const walkLen = polylineManhattanLength(walkPts);
            if (candBLen < walkLen - 10) {
              candB = {
                pts: candBPts,
                len: candBLen,
                hitWireId: bestB.hitWireId,
                junctionPt: J,
              };
            }
          }
        }

        // Pick optimal clean merge
        let chosen: { pts: { x: number; y: number }[]; hitWireId: string; junctionPt: { x: number; y: number } } | null = null;
        if (hasUserWaypoints) {
          if (candA) chosen = candA;
        } else {
          if (candA && candB) {
            chosen = candB.len < candA.len ? candB : candA;
          } else if (candA) {
            chosen = candA;
          } else if (candB) {
            chosen = candB;
          }
        }

        if (chosen) {
          connectedPins.add(P_new_key);
          for (let i = 0; i < chosen.pts.length - 1; i++) {
            netTreeSegments.push({ wireId: w.id, p1: chosen.pts[i], p2: chosen.pts[i + 1] });
          }
          routedWireEntries.push({
            wireId: w.id,
            points: chosen.pts,
            svgPath: '',
            hasCrossingHops: false,
            netId,
            netName: w.netName,
            autoTappedWireId: chosen.hitWireId,
            autoJunctionPoint: chosen.junctionPt,
            autoTappedReversed: isReversed,
          });
          continue;
        }

        // L-Shape-Safe Order-Independent Intermediate-Pin Trim
        let intermediateTrimDone = false;
        for (const hitEntry of routedWireEntries) {
          if (hitEntry.netId !== netId || hitEntry.points.length < 2) continue;
          const proj = projectPointOntoPolyline(P_new, hitEntry.points, 1);
          if (
            proj &&
            proj.distance < 1.5 &&
            Math.hypot(P_new.x - hitEntry.points[0].x, P_new.y - hitEntry.points[0].y) > 4 &&
            Math.hypot(P_new.x - hitEntry.points[hitEntry.points.length - 1].x, P_new.y - hitEntry.points[hitEntry.points.length - 1].y) > 4
          ) {
            const endIsOld = Math.hypot(hitEntry.points[hitEntry.points.length - 1].x - P_old.x, hitEntry.points[hitEntry.points.length - 1].y - P_old.y) < 2;
            const startIsOld = !endIsOld && Math.hypot(hitEntry.points[0].x - P_old.x, hitEntry.points[0].y - P_old.y) < 2;

            if (endIsOld || startIsOld) {
              const trimmedPts = endIsOld
                ? deduplicatePoints([...hitEntry.points.slice(0, proj.segmentIndex + 1), P_new])
                : deduplicatePoints([...hitEntry.points.slice(proj.segmentIndex + 1).reverse(), P_new]);

              const hitOrigWire = wires.find((ow) => ow.id === hitEntry.wireId);
              let hitFromPos: { x: number; y: number } | null = null;
              if (hitOrigWire) {
                const fc = components.find((c) => c.id === hitOrigWire.fromCompId);
                if (fc) hitFromPos = getCanonicalPinWorldPos(fc, hitOrigWire.fromPinId);
              }

              hitEntry.autoTappedReversed = Boolean(hitFromPos && Math.hypot(hitFromPos.x - P_old.x, hitFromPos.y - P_old.y) < 2);
              hitEntry.points = trimmedPts;
              hitEntry.autoTappedWireId = w.id;
              hitEntry.autoJunctionPoint = P_new;

              // Replace hitEntry's segments in netTreeSegments
              for (let i = netTreeSegments.length - 1; i >= 0; i--) {
                if (netTreeSegments[i].wireId === hitEntry.wireId) {
                  netTreeSegments.splice(i, 1);
                }
              }
              for (let i = 0; i < trimmedPts.length - 1; i++) {
                netTreeSegments.push({ wireId: hitEntry.wireId, p1: trimmedPts[i], p2: trimmedPts[i + 1] });
              }

              connectedPins.add(P_new_key);
              for (let i = 0; i < rawPts.length - 1; i++) {
                netTreeSegments.push({ wireId: w.id, p1: rawPts[i], p2: rawPts[i + 1] });
              }
              routedWireEntries.push({
                wireId: w.id,
                points: rawPts,
                svgPath: '',
                hasCrossingHops: false,
                netId,
                netName: w.netName,
              });

              intermediateTrimDone = true;
              break;
            }
          }
        }

        if (intermediateTrimDone) {
          continue;
        }

        // Neither candidate chosen -> keep rawPts
        connectedPins.add(P_new_key);
        for (let i = 0; i < rawPts.length - 1; i++) {
          netTreeSegments.push({ wireId: w.id, p1: rawPts[i], p2: rawPts[i + 1] });
        }
        routedWireEntries.push({
          wireId: w.id,
          points: rawPts,
          svgPath: '',
          hasCrossingHops: false,
          netId,
          netName: w.netName,
        });
        continue;
      }

      // Case 4: Neither endpoint in connectedPins -> keep rawPts
      connectedPins.add(kFrom);
      connectedPins.add(kTo);
      for (let i = 0; i < rawPts.length - 1; i++) {
        netTreeSegments.push({ wireId: w.id, p1: rawPts[i], p2: rawPts[i + 1] });
      }
      routedWireEntries.push({
        wireId: w.id,
        points: rawPts,
        svgPath: '',
        hasCrossingHops: false,
        netId,
        netName: w.netName,
      });
    }
  });

  // 3. Same-Net ONLY Solder Junction Dots (Zero Ambiguity!)
  const dotMap = new Map<string, { x: number; y: number; netName?: string }>();

  // 1. Every autoJunctionPoint where a branch merged onto a same-net trunk, plus every live endpoint pts[pts.length - 1] of an explicit tappedWireId wire
  routedWireEntries.forEach((rw) => {
    if (rw.autoJunctionPoint) {
      const key = `${Math.round(rw.autoJunctionPoint.x)},${Math.round(rw.autoJunctionPoint.y)}`;
      dotMap.set(key, { x: Math.round(rw.autoJunctionPoint.x), y: Math.round(rw.autoJunctionPoint.y), netName: rw.netName });
    }
    const origWire = wires.find((w) => w.id === rw.wireId);
    if (origWire?.tappedWireId && rw.points && rw.points.length >= 2) {
      const p = rw.points[rw.points.length - 1];
      const key = `${Math.round(p.x)},${Math.round(p.y)}`;
      dotMap.set(key, { x: Math.round(p.x), y: Math.round(p.y), netName: rw.netName });
    }
  });

  // Group wires by netId to only consider SAME-NET for steps 2 & 3
  const routedByNet = new Map<string, CanonicalRoutedWire[]>();
  routedWireEntries.forEach((rw) => {
    if (!routedByNet.has(rw.netId)) routedByNet.set(rw.netId, []);
    routedByNet.get(rw.netId)!.push(rw);
  });

  // 2. Every interior split / T-junction where ANY vertex (endpoint OR corner) of wire A lies strictly inside a segment of wire B OF THE EXACT SAME netId (netA === netB)
  routedByNet.forEach((netWiresList) => {
    for (let i = 0; i < netWiresList.length; i++) {
      const wA = netWiresList[i];
      for (const v of wA.points) {
        for (let j = 0; j < netWiresList.length; j++) {
          if (i === j) continue;
          const wB = netWiresList[j];
          for (let s = 0; s < wB.points.length - 1; s++) {
            const p1 = wB.points[s];
            const p2 = wB.points[s + 1];
            const isH = Math.abs(p1.y - p2.y) < 1 && Math.abs(v.y - p1.y) < 1;
            const isV = Math.abs(p1.x - p2.x) < 1 && Math.abs(v.x - p1.x) < 1;
            if (isH) {
              const minX = Math.min(p1.x, p2.x);
              const maxX = Math.max(p1.x, p2.x);
              if (v.x > minX + 2 && v.x < maxX - 2) {
                const key = `${Math.round(v.x)},${Math.round(v.y)}`;
                dotMap.set(key, { x: Math.round(v.x), y: Math.round(v.y), netName: wA.netName || wB.netName });
              }
            } else if (isV) {
              const minY = Math.min(p1.y, p2.y);
              const maxY = Math.max(p1.y, p2.y);
              if (v.y > minY + 2 && v.y < maxY - 2) {
                const key = `${Math.round(v.x)},${Math.round(v.y)}`;
                dotMap.set(key, { x: Math.round(v.x), y: Math.round(v.y), netName: wA.netName || wB.netName });
              }
            }
          }
        }
      }
    }
  });

  // 3. Every point where 3 or more segments of the EXACT SAME netId meet
  routedByNet.forEach((netWiresList) => {
    const netCoordCounts = new Map<string, { count: number; x: number; y: number; netName?: string }>();
    for (const rw of netWiresList) {
      for (const v of rw.points) {
        const key = `${Math.round(v.x)},${Math.round(v.y)}`;
        const entry = netCoordCounts.get(key) || { count: 0, x: Math.round(v.x), y: Math.round(v.y), netName: rw.netName };
        entry.count += 1;
        netCoordCounts.set(key, entry);
      }
    }
    netCoordCounts.forEach((val, key) => {
      if (val.count >= 3 && !dotMap.has(key)) {
        dotMap.set(key, { x: val.x, y: val.y, netName: val.netName });
      }
    });
  });

  // 4. All user-placed manualJunctions
  manualJunctions.forEach((mj) => {
    const key = `${Math.round(mj.x)},${Math.round(mj.y)}`;
    dotMap.set(key, { x: Math.round(mj.x), y: Math.round(mj.y) });
  });

  // 4. Different-Net Crossings -> Crisp Upward Semicircular Wire-Jump Bridge Arcs (svgPath)
  for (const rwA of routedWireEntries) {
    if (rwA.points.length < 2) {
      rwA.svgPath = '';
      rwA.hasCrossingHops = false;
      continue;
    }

    let pathStr = `M ${rwA.points[0].x} ${rwA.points[0].y}`;
    let wireHasHops = false;

    for (let sIdx = 0; sIdx < rwA.points.length - 1; sIdx++) {
      const p1 = rwA.points[sIdx];
      const p2 = rwA.points[sIdx + 1];
      const isH = Math.abs(p1.y - p2.y) < 1;

      if (!isH) {
        pathStr += ` L ${p2.x} ${p2.y}`;
        continue;
      }

      // Horizontal segment: check against all vertical segments of wires with DIFFERENT netId
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const hy = p1.y;

      const hopsOnSeg: number[] = [];

      for (const rwB of routedWireEntries) {
        if (rwA.netId === rwB.netId) continue; // Different-net only!
        if (rwB.points.length < 2) continue;

        for (let bIdx = 0; bIdx < rwB.points.length - 1; bIdx++) {
          const bp1 = rwB.points[bIdx];
          const bp2 = rwB.points[bIdx + 1];
          const isBV = Math.abs(bp1.x - bp2.x) < 1;
          if (!isBV) continue;

          const vx = bp1.x;
          const minY = Math.min(bp1.y, bp2.y);
          const maxY = Math.max(bp1.y, bp2.y);

          // Strictly cross: minX + 6 < vx < maxX - 6 AND minY + 6 < hy < maxY - 6
          if (vx > minX + 6 && vx < maxX - 6 && hy > minY + 6 && hy < maxY - 6) {
            hopsOnSeg.push(vx);
          }
        }
      }

      if (hopsOnSeg.length === 0) {
        pathStr += ` L ${p2.x} ${p2.y}`;
        continue;
      }

      // Sort in travel direction
      if (p1.x < p2.x) {
        hopsOnSeg.sort((a, b) => a - b);
      } else {
        hopsOnSeg.sort((a, b) => b - a);
      }

      // Filter hops: skip hops closer than 11px to previous accepted hop
      const acceptedHops: number[] = [];
      for (const cx of hopsOnSeg) {
        if (acceptedHops.length === 0) {
          acceptedHops.push(cx);
        } else {
          const prev = acceptedHops[acceptedHops.length - 1];
          if (Math.abs(cx - prev) >= 11) {
            acceptedHops.push(cx);
          }
        }
      }

      if (acceptedHops.length > 0) {
        wireHasHops = true;
      }

      for (const cx of acceptedHops) {
        if (p1.x < p2.x) {
          pathStr += ` L ${cx - 5} ${hy} A 5 5 0 0 1 ${cx + 5} ${hy}`;
        } else {
          pathStr += ` L ${cx + 5} ${hy} A 5 5 0 0 0 ${cx - 5} ${hy}`;
        }
      }
      pathStr += ` L ${p2.x} ${p2.y}`;
    }

    rwA.svgPath = pathStr;
    rwA.hasCrossingHops = wireHasHops;
  }

  const wireMap = new Map<string, CanonicalRoutedWire>(
    routedWireEntries.map((rw) => [rw.wireId, rw])
  );

  return {
    routedWires: routedWireEntries,
    wireMap,
    junctionDots: Array.from(dotMap.values()),
  };
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
