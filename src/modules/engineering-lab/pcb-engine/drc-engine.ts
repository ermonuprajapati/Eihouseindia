/**
 * Professional Real-Time Design Rule Check (DRC) Engine
 * Validates PCB layout against IPC-2221 manufacturing clearance, drill, and trace rules.
 */

import { PcbLayout, PcbTrack, CircuitWire } from '../types';

export interface DrcViolation {
  id: string;
  rule: 'edge_clearance' | 'min_track_width' | 'track_clearance' | 'pad_clearance' | 'unrouted_nets' | 'hole_clearance' | 'annular_ring';
  message: string;
  severity: 'error' | 'warning';
  targetId?: string;
  location?: { x: number; y: number };
}

/**
 * 2D Geometric Helper Functions for IPC Clearance & Crossing Detection
 */
function pointToSegmentDistance(
  p: { x: number; y: number },
  s1: { x: number; y: number },
  s2: { x: number; y: number }
): number {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - s1.x, p.y - s1.y);
  const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / lenSq));
  const projX = s1.x + t * dx;
  const projY = s1.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function orientation(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0; // Collinear
  return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
}

function onSegment(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-9 &&
    q.x >= Math.min(p.x, r.x) - 1e-9 &&
    q.y <= Math.max(p.y, r.y) + 1e-9 &&
    q.y >= Math.min(p.y, r.y) - 1e-9
  );
}

function segmentsIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  // General intersecting case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special collinear cases
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;

  return false;
}

function segmentToSegmentDistance(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): number {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2)
  );
}

export class DrcEngine {
  /**
   * Run full geometric Design Rule Checks against the PCB Layout
   */
  public static runChecks(
    layout: PcbLayout,
    opts: {
      minEdgeClearanceMm?: number;
      minTrackWidthMm?: number;
      minClearanceMm?: number;
      minHoleClearanceMm?: number;
      wires?: CircuitWire[];
    } = {}
  ): DrcViolation[] {
    const {
      minEdgeClearanceMm = 1.0,
      minTrackWidthMm = 0.15,
      minClearanceMm = 0.2,
      minHoleClearanceMm = 0.5,
      wires = [],
    } = opts;

    const violations: DrcViolation[] = [];
    const { widthMm, heightMm, pads, tracks } = layout;

    // 1. Board Edge Clearance (< minEdgeClearanceMm)
    pads.forEach((pad) => {
      const padRadius = pad.diameterMm / 2;
      if (
        pad.x - padRadius < minEdgeClearanceMm ||
        pad.x + padRadius > widthMm - minEdgeClearanceMm ||
        pad.y - padRadius < minEdgeClearanceMm ||
        pad.y + padRadius > heightMm - minEdgeClearanceMm
      ) {
        violations.push({
          id: `drc_edge_pad_${pad.id}`,
          rule: 'edge_clearance',
          message: `[ERROR][EDGE_CLEARANCE] Pad ${pad.pinId} (${pad.componentId}) at (${pad.x.toFixed(1)}mm, ${pad.y.toFixed(1)}mm) within ${minEdgeClearanceMm}mm of Edge.Cuts. Fix: move component away from board edge.`,
          severity: 'error',
          targetId: pad.id,
          location: { x: pad.x, y: pad.y },
        });
      }
    });

    tracks.forEach((track) => {
      const halfWidth = track.widthMm / 2;
      const minX = Math.min(track.from.x, track.to.x) - halfWidth;
      const maxX = Math.max(track.from.x, track.to.x) + halfWidth;
      const minY = Math.min(track.from.y, track.to.y) - halfWidth;
      const maxY = Math.max(track.from.y, track.to.y) + halfWidth;

      if (
        minX < minEdgeClearanceMm ||
        maxX > widthMm - minEdgeClearanceMm ||
        minY < minEdgeClearanceMm ||
        maxY > heightMm - minEdgeClearanceMm
      ) {
        violations.push({
          id: `drc_edge_track_${track.id}`,
          rule: 'edge_clearance',
          message: `[WARNING][EDGE_CLEARANCE] Track ${track.id} on ${track.layer === 'top_copper' ? 'F.Cu' : 'B.Cu'} violates ${minEdgeClearanceMm}mm board edge clearance limit. Fix: move track inward.`,
          severity: 'warning',
          targetId: track.id,
          location: { x: (track.from.x + track.to.x) / 2, y: (track.from.y + track.to.y) / 2 },
        });
      }
    });

    // 2. Minimum Track Width Violation (< minTrackWidthMm)
    tracks.forEach((track) => {
      if (track.widthMm < minTrackWidthMm) {
        violations.push({
          id: `drc_width_${track.id}`,
          rule: 'min_track_width',
          message: `[ERROR][MIN_TRACK_WIDTH] Track ${track.id} on ${track.layer === 'top_copper' ? 'F.Cu' : 'B.Cu'} width (${track.widthMm.toFixed(2)}mm) is below minimum fab capability (${minTrackWidthMm}mm). Fix: increase track width to at least ${minTrackWidthMm}mm.`,
          severity: 'error',
          targetId: track.id,
          location: { x: track.from.x, y: track.from.y },
        });
      }
    });

    // 3. Copper-to-Copper Clearance Violation (< minClearanceMm)
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const t1 = tracks[i];
        const t2 = tracks[j];
        if (t1.layer !== t2.layer) continue;
        if (t1.netId && t2.netId && t1.netId === t2.netId) continue;

        // Skip consecutive segments of an un-netted manual polyline sharing an endpoint within 0.02mm
        const shareEndpoint =
          Math.hypot(t1.from.x - t2.from.x, t1.from.y - t2.from.y) < 0.02 ||
          Math.hypot(t1.from.x - t2.to.x, t1.from.y - t2.to.y) < 0.02 ||
          Math.hypot(t1.to.x - t2.from.x, t1.to.y - t2.from.y) < 0.02 ||
          Math.hypot(t1.to.x - t2.to.x, t1.to.y - t2.to.y) < 0.02;
        if (!t1.netId && !t2.netId && shareEndpoint) continue;

        const dist = segmentToSegmentDistance(t1.from, t1.to, t2.from, t2.to);
        const allowedDist = (t1.widthMm + t2.widthMm) / 2 + minClearanceMm;
        const layerName = t1.layer === 'top_copper' ? 'F.Cu' : 'B.Cu';
        const midPoint = { x: (t1.from.x + t1.to.x) / 2, y: (t1.from.y + t1.to.y) / 2 };

        if (dist <= 1e-4) {
          violations.push({
            id: `drc_short_${t1.id}_${t2.id}`,
            rule: 'track_clearance',
            message: `[ERROR][CLEARANCE] Short circuit / crossing detected between track ${t1.id} (Net ${t1.netId || 'N/A'}) and track ${t2.id} (Net ${t2.netId || 'N/A'}) on ${layerName} at (${midPoint.x.toFixed(1)}mm, ${midPoint.y.toFixed(1)}mm). Fix: reroute track or switch layer.`,
            severity: 'error',
            targetId: t1.id,
            location: midPoint,
          });
        } else if (dist < allowedDist - 1e-4) {
          const gap = dist - (t1.widthMm + t2.widthMm) / 2;
          violations.push({
            id: `drc_clearance_${t1.id}_${t2.id}`,
            rule: 'track_clearance',
            message: `[ERROR][CLEARANCE] Net ${t1.netId || t1.id} vs Net ${t2.netId || t2.id} on ${layerName} at (${midPoint.x.toFixed(1)}mm, ${midPoint.y.toFixed(1)}mm) - Gap ${Math.max(0, gap).toFixed(2)}mm < ${minClearanceMm.toFixed(2)}mm min. Fix: reroute or increase clearance.`,
            severity: 'error',
            targetId: t1.id,
            location: midPoint,
          });
        }
      }
    }

    // 4. Pad-to-Track Clearance Check (< minClearanceMm)
    pads.forEach((pad) => {
      const padRadius = pad.diameterMm / 2;
      tracks.forEach((track) => {
        // Skip same net
        if (pad.netId && track.netId && pad.netId === track.netId) return;

        // Skip different non-overlapping copper layers
        const layerMatch =
          pad.layer === 'all' ||
          !pad.layer ||
          (pad.layer === 'top' && track.layer === 'top_copper') ||
          (pad.layer === 'bottom' && track.layer === 'bottom_copper');
        if (!layerMatch) return;

        // Only check if track does not terminate on this pad
        const dFrom = Math.hypot(track.from.x - pad.x, track.from.y - pad.y);
        const dTo = Math.hypot(track.to.x - pad.x, track.to.y - pad.y);
        if (dFrom > padRadius + 0.1 && dTo > padRadius + 0.1) {
          // Point to line segment distance
          const dx = track.to.x - track.from.x;
          const dy = track.to.y - track.from.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq > 0) {
            const t = Math.max(0, Math.min(1, ((pad.x - track.from.x) * dx + (pad.y - track.from.y) * dy) / lenSq));
            const projX = track.from.x + t * dx;
            const projY = track.from.y + t * dy;
            const dist = Math.hypot(pad.x - projX, pad.y - projY);
            const trackHalf = track.widthMm / 2;
            const gap = dist - (padRadius + trackHalf);
            if (gap < minClearanceMm && dist > 0.01) {
              const layerName = track.layer === 'top_copper' ? 'F.Cu' : 'B.Cu';
              violations.push({
                id: `drc_pad_track_${pad.id}_${track.id}`,
                rule: 'pad_clearance',
                message: `[WARNING][CLEARANCE] Pad ${pad.pinId} (${pad.componentId}, Net ${pad.netId || 'N/A'}) to Track ${track.id} (Net ${track.netId || 'N/A'}) on ${layerName} at (${pad.x.toFixed(1)}mm, ${pad.y.toFixed(1)}mm) - Gap ${Math.max(0, gap).toFixed(2)}mm < ${minClearanceMm.toFixed(2)}mm min. Fix: reroute track away from pad.`,
                severity: 'warning',
                targetId: pad.id,
                location: { x: pad.x, y: pad.y },
              });
            }
          }
        }
      });
    });

    // 4b. Pad-to-Pad Clearance Check (< minClearanceMm for different nets on same layer)
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const p1 = pads[i];
        const p2 = pads[j];
        if (p1.componentId === p2.componentId) continue;
        if (p1.netId && p2.netId && p1.netId === p2.netId) continue;
        const layerOverlap = p1.layer === 'all' || p2.layer === 'all' || !p1.layer || !p2.layer || p1.layer === p2.layer;
        if (!layerOverlap) continue;
        const centerDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const gap = centerDist - (p1.diameterMm + p2.diameterMm) / 2;
        if (gap < minClearanceMm) {
          violations.push({
            id: `drc_pad_pad_${p1.id}_${p2.id}`,
            rule: 'pad_clearance',
            message: `[ERROR][CLEARANCE] Net ${p1.netId || p1.pinId} vs Net ${p2.netId || p2.pinId} between Pad ${p1.pinId} (${p1.componentId}) and Pad ${p2.pinId} (${p2.componentId}) at (${((p1.x + p2.x) / 2).toFixed(1)}mm, ${((p1.y + p2.y) / 2).toFixed(1)}mm) - Gap ${Math.max(0, gap).toFixed(2)}mm < ${minClearanceMm.toFixed(2)}mm min. Fix: increase component spacing.`,
            severity: 'error',
            targetId: p1.id,
            location: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          });
        }
      }
    }

    // 5. Drill Hole Clearance Check (< minHoleClearanceMm)
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const p1 = pads[i];
        const p2 = pads[j];
        if (!p1.holeMm || !p2.holeMm || p1.holeMm <= 0 || p2.holeMm <= 0) continue;
        // Skip holes belonging to the same component footprint (standard DIP/header pitches)
        if (p1.componentId && p2.componentId && p1.componentId === p2.componentId) continue;

        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const minAllowed = (p1.holeMm + p2.holeMm) / 2 + minHoleClearanceMm;
        if (dist < minAllowed && dist > 0.001) {
          const holeEdgeGap = dist - (p1.holeMm + p2.holeMm) / 2;
          violations.push({
            id: `drc_hole_clear_${p1.id}_${p2.id}`,
            rule: 'hole_clearance',
            message: `[ERROR][HOLE_CLEARANCE] Hole clearance between ${p1.pinId} (${p1.componentId}) and ${p2.pinId} (${p2.componentId}) at (${((p1.x + p2.x) / 2).toFixed(1)}mm, ${((p1.y + p2.y) / 2).toFixed(1)}mm) is ${Math.max(0, holeEdgeGap).toFixed(2)}mm < ${minHoleClearanceMm.toFixed(2)}mm min. Fix: increase drill spacing or move via.`,
            severity: 'error',
            targetId: p1.id,
            location: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          });
        }
      }
    }

    // 5b. Through-Hole Annular Ring Check
    pads.forEach((pad) => {
      if (pad.holeMm && pad.holeMm > 0) {
        const padDia =
          pad.diameterMm ??
          Math.min((pad as { widthMm?: number }).widthMm ?? 1.8, (pad as { heightMm?: number }).heightMm ?? 1.8);
        const ring = (padDia - pad.holeMm) / 2;
        if (ring < 0.05) {
          violations.push({
            id: `drc_ring_breakout_${pad.id}`,
            rule: 'annular_ring',
            message: `[ERROR][ANNULAR_RING] Pad ${pad.pinId} (${pad.componentId}) annular ring width (${ring.toFixed(3)}mm) causes drill breakout (min 0.05mm). Fix: increase pad diameter or reduce drill size.`,
            severity: 'error',
            targetId: pad.id,
            location: { x: pad.x, y: pad.y },
          });
        } else if (ring < 0.125) {
          violations.push({
            id: `drc_ring_warning_${pad.id}`,
            rule: 'annular_ring',
            message: `[WARNING][ANNULAR_RING] Pad ${pad.pinId} (${pad.componentId}) annular ring width (${ring.toFixed(3)}mm) is below standard fab minimum (0.125mm). Fix: enlarge copper annular ring.`,
            severity: 'warning',
            targetId: pad.id,
            location: { x: pad.x, y: pad.y },
          });
        }
      }
    });

    // 6. Unrouted Nets / Airwires Check (Multi-Segment Graph Connectivity)
    if (wires.length > 0 && tracks.length > 0) {
      const padLookup = new Map<string, { x: number; y: number }>();
      pads.forEach((p) => padLookup.set(`${p.componentId}:${p.pinId}`, { x: p.x, y: p.y }));

      // DSU for track endpoints connectivity
      const parent = new Map<number, number>();
      const find = (i: number): number => {
        if (!parent.has(i)) parent.set(i, i);
        let root = i;
        while (root !== parent.get(root)!) {
          root = parent.get(root)!;
        }
        let curr = i;
        while (curr !== root) {
          const nxt = parent.get(curr)!;
          parent.set(curr, root);
          curr = nxt;
        }
        return root;
      };
      const union = (i: number, j: number) => {
        const r1 = find(i);
        const r2 = find(j);
        if (r1 !== r2) parent.set(r1, r2);
      };

      const ptKey = (x: number, y: number) => Math.round(x * 10) * 100000 + Math.round(y * 10);

      tracks.forEach((t) => {
        const k1 = ptKey(t.from.x, t.from.y);
        const k2 = ptKey(t.to.x, t.to.y);
        union(k1, k2);
      });

      // Merge vertices within 0.25mm of each other
      const endpoints: { x: number; y: number; key: number }[] = [];
      tracks.forEach((t) => {
        endpoints.push({ x: t.from.x, y: t.from.y, key: ptKey(t.from.x, t.from.y) });
        endpoints.push({ x: t.to.x, y: t.to.y, key: ptKey(t.to.x, t.to.y) });
      });
      for (let i = 0; i < endpoints.length; i++) {
        for (let j = i + 1; j < endpoints.length; j++) {
          if (Math.hypot(endpoints[i].x - endpoints[j].x, endpoints[i].y - endpoints[j].y) < 0.25) {
            union(endpoints[i].key, endpoints[j].key);
          }
        }
      }

      let unroutedCount = 0;
      wires.forEach((wire) => {
        const p1 = padLookup.get(`${wire.fromCompId}:${wire.fromPinId}`);
        const p2 = padLookup.get(`${wire.toCompId}:${wire.toPinId}`);
        if (p1 && p2) {
          const ep1 = endpoints.find((ep) => Math.hypot(ep.x - p1.x, ep.y - p1.y) < 0.6);
          const ep2 = endpoints.find((ep) => Math.hypot(ep.x - p2.x, ep.y - p2.y) < 0.6);
          if (ep1 && ep2 && find(ep1.key) === find(ep2.key)) {
            // Connected!
          } else {
            unroutedCount++;
          }
        }
      });

      if (unroutedCount > 0) {
        violations.push({
          id: `drc_unrouted_nets`,
          rule: 'unrouted_nets',
          message: `[WARNING][UNROUTED_NETS] ${unroutedCount} unrouted connection airwire(s) remaining in schematic netlist. Fix: route remaining airwires.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Automatically repairs common clearance errors (e.g. tracks below min width or minor edge clearance)
   */
  public static autoFixClearances(layout: PcbLayout, minTrackWidthMm: number = 0.25): PcbLayout {
    const fixedTracks: PcbTrack[] = layout.tracks.map((t) => ({
      ...t,
      widthMm: Math.max(t.widthMm, minTrackWidthMm),
    }));

    // Re-run DRC
    const violations = this.runChecks({ ...layout, tracks: fixedTracks }, { minTrackWidthMm });
    const drcErrors = violations.map((v) => ({
      id: v.id,
      message: v.message,
      severity: v.severity,
    }));

    return {
      ...layout,
      tracks: fixedTracks,
      drcErrors,
    };
  }
}
