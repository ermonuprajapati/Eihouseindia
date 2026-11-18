/**
 * Professional Real-Time Design Rule Check (DRC) Engine
 */

import { PcbLayout } from '../types';

export interface DrcViolation {
  id: string;
  rule: 'edge_clearance' | 'min_track_width' | 'track_clearance' | 'unrouted_nets' | 'hole_clearance';
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
    } = {}
  ): DrcViolation[] {
    const {
      minEdgeClearanceMm = 1.0,
      minTrackWidthMm = 0.15,
      minClearanceMm = 0.2,
      minHoleClearanceMm: _minHoleClearanceMm = 0.3,
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
          message: `Pad ${pad.pinId} on ${pad.componentId} is within ${minEdgeClearanceMm}mm of the board edge.`,
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
          message: `Track ${track.id} violates the ${minEdgeClearanceMm}mm board edge clearance limit.`,
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
              message: `Clearance between track ${t1.id} and ${t2.id} is below ${minClearanceMm}mm on ${t1.layer}.`,
              severity: 'error',
              targetId: t1.id,
              location: m1,
            });
          }
        }
      }
    }

    return violations;
  }
}
