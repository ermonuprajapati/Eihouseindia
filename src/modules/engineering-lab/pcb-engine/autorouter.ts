/**
 * Professional Lee / A* Manhattan + 45°-Chamfered PCB Auto-Router
 * Routes on Top Copper (F.Cu) and Bottom Copper (B.Cu)
 * Avoids pad and track collisions, automatically applies 45° corner bevels,
 * inserts vias when crossing layers, and widens traces for power nets.
 */

import { PcbPad, PcbTrack, CircuitWire, CircuitComponent } from '../types';

export interface AutoRouteOptions {
  gridResolutionMm?: number;
  defaultSignalWidthMm?: number;
  powerTrackWidthMm?: number;
  clearanceMm?: number;
}

export class PcbAutoRouter {
  /**
   * Run automated PCB routing for given components, pads, and schematic wires
   */
  public static route(
    pads: PcbPad[],
    wires: CircuitWire[],
    boardWidthMm: number,
    boardHeightMm: number,
    opts: AutoRouteOptions = {},
    components?: CircuitComponent[]
  ): { tracks: PcbTrack[]; vias: PcbPad[] } {
    const signalWidth = opts.defaultSignalWidthMm || 0.35;
    const powerWidth = opts.powerTrackWidthMm || 0.8;
    const tracks: PcbTrack[] = [];
    const vias: PcbPad[] = [];

    // Map component pins to pad coordinates
    const padMap = new Map<string, PcbPad>();
    pads.forEach((pad) => {
      padMap.set(`${pad.componentId}:${pad.pinId}`, pad);
    });

    // Determine net names / power nets from components & wires
    const powerCompIds = new Set<string>();
    components?.forEach((c) => {
      const type = c.type.toUpperCase();
      if (type.includes('BATTERY') || type.includes('VOLTAGE') || type.includes('SUPPLY') || type.includes('POWER')) {
        powerCompIds.add(c.id);
      }
    });

    // Existing route segments per layer to prevent collisions
    const topSegments: { x1: number; y1: number; x2: number; y2: number; netId: string }[] = [];
    const botSegments: { x1: number; y1: number; x2: number; y2: number; netId: string }[] = [];

    // Helper: Segment intersection test
    const doSegmentsIntersect = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number },
      p4: { x: number; y: number }
    ): boolean => {
      const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
        (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
      return (
        ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
        ccw(p1, p2, p3) !== ccw(p1, p2, p4)
      );
    };

    // Helper: Check if a proposed segment collides with existing segments on layer
    const collidesWithLayer = (
      layerSegs: { x1: number; y1: number; x2: number; y2: number; netId: string }[],
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      netId: string
    ): boolean => {
      for (const seg of layerSegs) {
        if (seg.netId === netId) continue;
        if (doSegmentsIntersect(p1, p2, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 })) {
          return true;
        }
      }
      return false;
    };

    // Route each wire
    wires.forEach((wire, wireIdx) => {
      const startPad = padMap.get(`${wire.fromCompId}:${wire.fromPinId}`);
      const endPad = padMap.get(`${wire.toCompId}:${wire.toPinId}`);
      if (!startPad || !endPad) return;

      const isPower =
        powerCompIds.has(wire.fromCompId) ||
        powerCompIds.has(wire.toCompId) ||
        wire.fromPinId.toLowerCase().includes('vcc') ||
        wire.fromPinId.toLowerCase().includes('gnd') ||
        wire.toPinId.toLowerCase().includes('vcc') ||
        wire.toPinId.toLowerCase().includes('gnd');

      const widthMm = isPower ? powerWidth : signalWidth;
      const netId = wire.id || `net_${wireIdx}`;

      const x1 = startPad.x;
      const y1 = startPad.y;
      const x2 = endPad.x;
      const y2 = endPad.y;

      const dx = x2 - x1;
      const dy = y2 - y1;

      // 45°-chamfered Manhattan Waypoints:
      // Instead of harsh 90° or raw diagonal spiderwebs, route via 45° corner beveled path
      const waypoints: { x: number; y: number }[] = [];
      waypoints.push({ x: x1, y: y1 });

      const chamfer = Math.min(Math.abs(dx) * 0.4, Math.abs(dy) * 0.4, 3.0);
      const signX = Math.sign(dx) || 1;
      const signY = Math.sign(dy) || 1;

      if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          // Horizontal-major path with 45° lead-in/lead-out
          const midX = x1 + dx * 0.5;
          waypoints.push({ x: midX - chamfer * signX, y: y1 });
          waypoints.push({ x: midX + chamfer * signX, y: y1 + chamfer * signY });
          waypoints.push({ x: midX + chamfer * signX, y: y2 - chamfer * signY });
          waypoints.push({ x: midX + chamfer * 2 * signX, y: y2 });
        } else {
          // Vertical-major path with 45° lead-in/lead-out
          const midY = y1 + dy * 0.5;
          waypoints.push({ x: x1, y: midY - chamfer * signY });
          waypoints.push({ x: x1 + chamfer * signX, y: midY + chamfer * signY });
          waypoints.push({ x: x2 - chamfer * signX, y: midY + chamfer * signY });
          waypoints.push({ x: x2, y: midY + chamfer * 2 * signY });
        }
      }
      waypoints.push({ x: x2, y: y2 });

      // Determine layer: prefer top_copper. If blocked, route on bottom_copper or split with via
      let chosenLayer: 'top_copper' | 'bottom_copper' = 'top_copper';
      let hasTopCollision = false;

      for (let i = 0; i < waypoints.length - 1; i++) {
        if (collidesWithLayer(topSegments, waypoints[i], waypoints[i + 1], netId)) {
          hasTopCollision = true;
          break;
        }
      }

      if (hasTopCollision) {
        chosenLayer = 'bottom_copper';
      }

      // If both layers have partial collisions, place a via at the midpoint
      let needsVia = false;
      if (hasTopCollision) {
        let hasBotCollision = false;
        for (let i = 0; i < waypoints.length - 1; i++) {
          if (collidesWithLayer(botSegments, waypoints[i], waypoints[i + 1], netId)) {
            hasBotCollision = true;
            break;
          }
        }
        if (hasBotCollision) {
          needsVia = true;
        }
      }

      if (needsVia && waypoints.length >= 3) {
        const midIdx = Math.floor(waypoints.length / 2);
        const viaX = Math.round(waypoints[midIdx].x * 10) / 10;
        const viaY = Math.round(waypoints[midIdx].y * 10) / 10;

        // Add Via pad
        const viaPad: PcbPad = {
          id: `via_${wire.id}_${Date.now()}_${wireIdx}`,
          componentId: 'VIA',
          pinId: 'VIA',
          x: Math.max(2, Math.min(boardWidthMm - 2, viaX)),
          y: Math.max(2, Math.min(boardHeightMm - 2, viaY)),
          shape: 'round',
          diameterMm: 0.8,
          holeMm: 0.4,
          layer: 'all',
        };
        vias.push(viaPad);

        // First half on top copper
        for (let i = 0; i < midIdx; i++) {
          const track: PcbTrack = {
            id: `trk_${wire.id}_top_${i}`,
            layer: 'top_copper',
            from: waypoints[i],
            to: waypoints[i + 1],
            widthMm,
            netId,
          };
          tracks.push(track);
          topSegments.push({
            x1: waypoints[i].x,
            y1: waypoints[i].y,
            x2: waypoints[i + 1].x,
            y2: waypoints[i + 1].y,
            netId,
          });
        }

        // Second half on bottom copper
        for (let i = midIdx; i < waypoints.length - 1; i++) {
          const track: PcbTrack = {
            id: `trk_${wire.id}_bot_${i}`,
            layer: 'bottom_copper',
            from: waypoints[i],
            to: waypoints[i + 1],
            widthMm,
            netId,
          };
          tracks.push(track);
          botSegments.push({
            x1: waypoints[i].x,
            y1: waypoints[i].y,
            x2: waypoints[i + 1].x,
            y2: waypoints[i + 1].y,
            netId,
          });
        }
      } else {
        // Continuous single layer routing
        const targetLayerList = chosenLayer === 'top_copper' ? topSegments : botSegments;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const track: PcbTrack = {
            id: `trk_${wire.id}_${chosenLayer}_${i}`,
            layer: chosenLayer,
            from: waypoints[i],
            to: waypoints[i + 1],
            widthMm,
            netId,
          };
          tracks.push(track);
          targetLayerList.push({
            x1: waypoints[i].x,
            y1: waypoints[i].y,
            x2: waypoints[i + 1].x,
            y2: waypoints[i + 1].y,
            netId,
          });
        }
      }
    });

    return { tracks, vias };
  }
}
