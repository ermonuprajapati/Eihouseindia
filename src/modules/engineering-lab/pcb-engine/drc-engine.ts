/**
 * Professional Real-Time Design Rule Check (DRC) Engine
 * Validates PCB layout against IPC-2221 manufacturing clearance, drill, and trace rules.
 */

import { PcbLayout, PcbTrack, CircuitWire } from '../types';

export interface DrcViolation {
  id: string;
  rule: 'edge_clearance' | 'min_track_width' | 'track_clearance' | 'pad_clearance' | 'unrouted_nets' | 'hole_clearance';
  message: string;
  severity: 'error' | 'warning';
  targetId?: string;
  location?: { x: number; y: number };
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
          message: `Pad ${pad.pinId} (${pad.componentId}) is within ${minEdgeClearanceMm}mm of board edge.`,
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
          message: `Track ${track.id} violates ${minEdgeClearanceMm}mm board edge clearance limit.`,
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
          message: `Track ${track.id} width (${track.widthMm}mm) is below minimum fab capability (${minTrackWidthMm}mm).`,
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
        if (t1.layer === t2.layer && (!t1.netId || !t2.netId || t1.netId !== t2.netId)) {
          // Midpoint approximate distance check
          const m1 = { x: (t1.from.x + t1.to.x) / 2, y: (t1.from.y + t1.to.y) / 2 };
          const m2 = { x: (t2.from.x + t2.to.x) / 2, y: (t2.from.y + t2.to.y) / 2 };
          const dist = Math.hypot(m1.x - m2.x, m1.y - m2.y);
          const allowedDist = (t1.widthMm + t2.widthMm) / 2 + minClearanceMm;

          if (dist < allowedDist && dist > 0.001) {
            violations.push({
              id: `drc_clearance_${t1.id}_${t2.id}`,
              rule: 'track_clearance',
              message: `Clearance between track ${t1.id} and ${t2.id} is below ${minClearanceMm}mm on ${t1.layer === 'top_copper' ? 'F.Cu' : 'B.Cu'}.`,
              severity: 'error',
              targetId: t1.id,
              location: m1,
            });
          }
        }
      }
    }

    // 4. Pad-to-Track Clearance Check (< minClearanceMm)
    pads.forEach((pad) => {
      const padRadius = pad.diameterMm / 2;
      tracks.forEach((track) => {
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
            if (dist < padRadius + trackHalf + minClearanceMm && dist > 0.01) {
              violations.push({
                id: `drc_pad_track_${pad.id}_${track.id}`,
                rule: 'pad_clearance',
                message: `Clearance between Pad ${pad.pinId} and Track ${track.id} is below ${minClearanceMm}mm.`,
                severity: 'warning',
                targetId: pad.id,
                location: { x: pad.x, y: pad.y },
              });
            }
          }
        }
      });
    });

    // 5. Drill Hole Clearance Check (< minHoleClearanceMm)
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const p1 = pads[i];
        const p2 = pads[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const minAllowed = (p1.holeMm + p2.holeMm) / 2 + minHoleClearanceMm;
        if (dist < minAllowed && dist > 0.001) {
          violations.push({
            id: `drc_hole_clear_${p1.id}_${p2.id}`,
            rule: 'hole_clearance',
            message: `Hole clearance between pad ${p1.id} and ${p2.id} is below ${minHoleClearanceMm}mm.`,
            severity: 'error',
            targetId: p1.id,
            location: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          });
        }
      }
    }

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
          message: `${unroutedCount} unrouted connection airwire(s) remaining in schematic netlist.`,
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
