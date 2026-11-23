import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack, PcbComponentPlacement } from '../types';
import { PcbAutoRouter, compute45RoutePoints } from './autorouter';

/**
 * Returns true if the component represents a virtual schematic symbol
 * (Ground reference, VCC/VDD power flag, net labels) with no physical package.
 */
export function isVirtualSchematicSymbol(type?: string): boolean {
  if (!type) return false;
  const t = type.toUpperCase().trim();
  return (
    t === 'GROUND' ||
    t === 'GND' ||
    t === 'EARTH_PE' ||
    t === 'EARTH_GROUND' ||
    t === 'VCC' ||
    t === 'VDD' ||
    t === 'NET_FLAG' ||
    t === 'POWER_FLAG' ||
    t.startsWith('GND_') ||
    t.startsWith('VCC_')
  );
}

function computeInverted45RoutePoints(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return [from];
  if (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01) return [from, to];

  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;
  const chamfer = Math.min(Math.abs(dx), Math.abs(dy));

  let midX = from.x;
  let midY = from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    midX = from.x;
    midY = from.y + (Math.abs(dy) - chamfer) * signY;
  } else {
    midX = from.x + (Math.abs(dx) - chamfer) * signX;
    midY = from.y;
  }

  const mid2X = midX + chamfer * signX;
  const mid2Y = midY + chamfer * signY;

  const pts: { x: number; y: number }[] = [from];
  if (Math.hypot(midX - from.x, midY - from.y) > 0.05) pts.push({ x: midX, y: midY });
  if (Math.hypot(mid2X - midX, mid2Y - midY) > 0.05) pts.push({ x: mid2X, y: mid2Y });
  if (Math.hypot(to.x - mid2X, to.y - mid2Y) > 0.05) pts.push(to);
  return pts;
}

function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return false;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  return ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95;
}

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

function isRouteClear(
  pts: { x: number; y: number }[],
  layer: 'top_copper' | 'bottom_copper',
  trackWidth: number,
  existingTracks: PcbTrack[],
  allPads: PcbPad[]
): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    const pA = pts[i];
    const pB = pts[i + 1];
    const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    if (segLen < 0.05) continue;

    // Check angle: must be 45° or 90° (0°, 45°, 90°, 135°, 180°)
    const angleDeg = Math.round(Math.abs((Math.atan2(pB.y - pA.y, pB.x - pA.x) * 180) / Math.PI));
    const mod45 = angleDeg % 45;
    if (!(mod45 === 0 || mod45 === 45 || Math.abs(mod45 - 45) <= 1 || mod45 <= 1)) {
      return false;
    }

    // Check crossings and clearance against existing tracks of different nets
    for (const t of existingTracks) {
      if (t.layer !== layer) continue;
      if (t.netId && t.netId === 'GND') continue;

      // Interior intersection
      if (segmentsIntersect(pA, pB, t.from, t.to)) {
        return false;
      }

      // Minimum clearance (DRC 0.2mm + safety margin)
      const dist = segmentToSegmentDistance(pA, pB, t.from, t.to);
      const minRequired = (trackWidth + t.widthMm) / 2 + 0.22;
      if (dist < minRequired) {
        return false;
      }
    }

    // Check clearance against pads of other nets
    for (const pad of allPads) {
      if (pad.netId === 'GND' || pad.pinId === 'GND') continue;
      const padRadius = pad.diameterMm / 2;
      const distToPad = pointToSegmentDistance({ x: pad.x, y: pad.y }, pA, pB);
      if (distToPad < padRadius + trackWidth / 2 + 0.22) {
        return false;
      }
    }
  }
  return true;
}

interface SafeGndRoute {
  waypoints: { x: number; y: number }[];
  layer: 'top_copper' | 'bottom_copper';
  needsVia: boolean;
  score: number;
}

function findBestSafeGndRoute(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  gndLayer: 'top_copper' | 'bottom_copper',
  trackWidth: number,
  existingTracks: PcbTrack[],
  allPads: PcbPad[],
  boardWidth: number,
  boardHeight: number
): SafeGndRoute | null {
  const otherLayer: 'top_copper' | 'bottom_copper' = gndLayer === 'bottom_copper' ? 'top_copper' : 'bottom_copper';
  const candidates: { waypoints: { x: number; y: number }[]; layer: 'top_copper' | 'bottom_copper'; needsVia: boolean; baseCost: number }[] = [];

  const direct45 = compute45RoutePoints(p1, p2);
  const inv45 = computeInverted45RoutePoints(p1, p2);

  // 1. Direct on GND layer
  candidates.push({ waypoints: direct45, layer: gndLayer, needsVia: false, baseCost: 0 });
  candidates.push({ waypoints: inv45, layer: gndLayer, needsVia: false, baseCost: 0 });

  // 2. Direct on other layer (needs via)
  candidates.push({ waypoints: direct45, layer: otherLayer, needsVia: true, baseCost: 15 });
  candidates.push({ waypoints: inv45, layer: otherLayer, needsVia: true, baseCost: 15 });

  // 3. X-detours on GND layer and other layer
  const xOffsets = [-5, 5, -8, 8, -12, 12, -18, 18, -25, 25, -35, 35];
  for (const off of xOffsets) {
    const midX = Math.round((Math.min(p1.x, p2.x) + off) * 100) / 100;
    if (midX >= 3 && midX <= boardWidth - 3) {
      const waypoints = [
        { x: p1.x, y: p1.y },
        { x: midX, y: p1.y },
        { x: midX, y: p2.y },
        { x: p2.x, y: p2.y },
      ];
      candidates.push({ waypoints, layer: gndLayer, needsVia: false, baseCost: Math.abs(off) * 0.5 });
      candidates.push({ waypoints, layer: otherLayer, needsVia: true, baseCost: 15 + Math.abs(off) * 0.5 });
    }
  }

  // 4. Y-detours on GND layer and other layer
  const yOffsets = [-5, 5, -8, 8, -12, 12, -18, 18, -25, 25];
  for (const off of yOffsets) {
    const midY = Math.round((Math.min(p1.y, p2.y) + off) * 100) / 100;
    if (midY >= 3 && midY <= boardHeight - 3) {
      const waypoints = [
        { x: p1.x, y: p1.y },
        { x: p1.x, y: midY },
        { x: p2.x, y: midY },
        { x: p2.x, y: p2.y },
      ];
      candidates.push({ waypoints, layer: gndLayer, needsVia: false, baseCost: Math.abs(off) * 0.5 });
      candidates.push({ waypoints, layer: otherLayer, needsVia: true, baseCost: 15 + Math.abs(off) * 0.5 });
    }
  }

  // 5. Perimeter edge margin fallback (margin 3.5mm from board edges)
  const margin = 3.5;
  const leftPerimeter = [
    { x: p1.x, y: p1.y },
    { x: margin, y: p1.y },
    { x: margin, y: p2.y },
    { x: p2.x, y: p2.y },
  ];
  candidates.push({ waypoints: leftPerimeter, layer: gndLayer, needsVia: false, baseCost: 40 });
  const rightPerimeter = [
    { x: p1.x, y: p1.y },
    { x: boardWidth - margin, y: p1.y },
    { x: boardWidth - margin, y: p2.y },
    { x: p2.x, y: p2.y },
  ];
  candidates.push({ waypoints: rightPerimeter, layer: gndLayer, needsVia: false, baseCost: 40 });

  let bestCandidate: SafeGndRoute | null = null;
  let lowestScore = Infinity;

  for (const cand of candidates) {
    if (isRouteClear(cand.waypoints, cand.layer, trackWidth, existingTracks, allPads)) {
      let length = 0;
      for (let i = 0; i < cand.waypoints.length - 1; i++) {
        length += Math.hypot(cand.waypoints[i + 1].x - cand.waypoints[i].x, cand.waypoints[i + 1].y - cand.waypoints[i].y);
      }
      const score = length + cand.baseCost;
      if (score < lowestScore) {
        lowestScore = score;
        bestCandidate = {
          waypoints: cand.waypoints,
          layer: cand.layer,
          needsVia: cand.needsVia,
          score,
        };
      }
    }
  }

  return bestCandidate;
}
export const DEFAULT_GND_POUR_LAYER: 'bottom_copper' | 'top_copper' | 'off' = 'bottom_copper';

export class PcbGenerator {
  /**
   * Generates a default 2D PCB layout from schematic components and wires.
   * Virtual power/ground symbols (GND, VCC net flags) are filtered out of physical
   * 2D/3D component placements, and their nets route directly to copper pour / thermal relief.
   */
  public static generatePcbFromSchematic(
    components: CircuitComponent[],
    wires: CircuitWire[],
    boardWidthMm: number = 80,
    boardHeightMm: number = 60
  ): PcbLayout & { gndPourLayer?: 'bottom_copper' | 'top_copper' | 'off' } {
    const pads: PcbPad[] = [];
    const placedComponents: PcbComponentPlacement[] = [];

    // Filter virtual schematic symbols from physical component placements
    const physicalComponents = components.filter((c) => !isVirtualSchematicSymbol(c.type));
    const targetComps = physicalComponents.length > 0 ? physicalComponents : components;

    // Scale schematic coordinates down to PCB millimeter space
    // Center of schematic maps to center of board
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    targetComps.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });

    const spanX = Math.max(maxX - minX, 100);
    const spanY = Math.max(maxY - minY, 100);

    const padLookup: Map<string, { x: number; y: number }> = new Map();

    // Map physical components to board placements & compute accurate pads
    physicalComponents.forEach((comp) => {
      // Normalize to 10mm margin inside PCB board boundary
      const normX = Math.round((10 + ((comp.x - minX) / spanX) * (boardWidthMm - 20)) * 10) / 10;
      const normY = Math.round((10 + ((comp.y - minY) / spanY) * (boardHeightMm - 20)) * 10) / 10;

      placedComponents.push({
        componentId: comp.id,
        designator: comp.designator || comp.label,
        type: comp.type,
        label: comp.label,
        value: comp.value,
        footprint: comp.footprint,
        x: normX,
        y: normY,
        rotation: comp.rotation || 0,
        parameters: comp.parameters,
      });

      // Compute physical IPC-7351 footprint pads strictly aligned with package geometry
      const footprintPads = PcbGenerator.calculateFootprintPads(comp, normX, normY, comp.rotation || 0);
      footprintPads.forEach((pad) => {
        pads.push(pad);
        padLookup.set(`${comp.id}:${pad.pinId}`, { x: pad.x, y: pad.y });
      });
    });

    // Net grouping via DSU: identify GND and power nets
    const parent = new Map<string, string>();
    const findSet = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) !== i) parent.set(i, findSet(parent.get(i)!));
      return parent.get(i)!;
    };
    const unionSet = (i: string, j: string) => {
      const rootI = findSet(i);
      const rootJ = findSet(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    wires.forEach((w) => {
      const k1 = `${w.fromCompId}:${w.fromPinId}`;
      const k2 = `${w.toCompId}:${w.toPinId}`;
      unionSet(k1, k2);
    });

    // Detect all net roots connected to GND components or GND pins
    const gndRoots = new Set<string>();
    components.forEach((c) => {
      const isGndType = isVirtualSchematicSymbol(c.type) && (c.type.toUpperCase().includes('GND') || c.type.toUpperCase().includes('GROUND') || c.id.toLowerCase().startsWith('gnd'));
      c.pins?.forEach((p) => {
        const k = `${c.id}:${p.id}`;
        const pinLower = (p.name || p.id || '').toLowerCase();
        if (isGndType || pinLower === 'gnd' || pinLower === 'ground' || pinLower === '0v' || pinLower === 'vss') {
          gndRoots.add(findSet(k));
        }
      });
    });

    // Tag GND pads with netId = 'GND'
    pads.forEach((pad) => {
      const k = `${pad.componentId}:${pad.pinId}`;
      if (gndRoots.has(findSet(k)) || pad.pinId.toLowerCase().includes('gnd')) {
        pad.netId = 'GND';
      }
    });

    // Auto-route signal traces using pro 45-chamfered router (filtering virtual wires)
    const virtualCompIds = new Set(components.filter((c) => isVirtualSchematicSymbol(c.type)).map((c) => c.id));
    const routableWires = wires.filter((w) => !virtualCompIds.has(w.fromCompId) && !virtualCompIds.has(w.toCompId));

    const { tracks: routedTracks, vias } = PcbAutoRouter.route(
      pads,
      routableWires,
      boardWidthMm,
      boardHeightMm,
      { defaultSignalWidthMm: 0.35, powerTrackWidthMm: 0.8 },
      physicalComponents
    );

    // If auto-router returned vias, add them to pads array
    if (vias.length > 0) {
      pads.push(...vias);
    }

    // Connect GND net through-hole pads with visible copper tracks on DEFAULT_GND_POUR_LAYER
    const gndPads = pads.filter((p) => p.netId === 'GND');
    const gndLayer: 'top_copper' | 'bottom_copper' = DEFAULT_GND_POUR_LAYER === 'top_copper' ? 'top_copper' : 'bottom_copper';
    const gndTrackWidth = 0.55; // 0.55mm professional power/GND track width

    // Add a GND stitching via if needed
    let gndStitchVia: PcbPad | null = null;
    if (gndPads.length > 0 && !pads.some((p) => p.componentId === 'VIA' && p.netId === 'GND')) {
      const gPad = gndPads[0];
      const vx = Math.min(boardWidthMm - 4, Math.max(4, gPad.x + 2.54));
      const vy = Math.min(boardHeightMm - 4, Math.max(4, gPad.y + 2.54));
      gndStitchVia = {
        id: `via_gnd_stitch_${Date.now()}`,
        componentId: 'VIA',
        pinId: 'GND',
        netId: 'GND',
        x: Math.round(vx * 100) / 100,
        y: Math.round(vy * 100) / 100,
        shape: 'round',
        diameterMm: 0.8,
        holeMm: 0.4,
        layer: 'all',
      };
      pads.push(gndStitchVia);
    }

    // Connect all GND pads together into a continuous routed ground network using an MST
    const allGndNodes: { x: number; y: number; id: string }[] = gndPads.map((p) => ({ x: p.x, y: p.y, id: p.id }));
    if (gndStitchVia) {
      allGndNodes.push({ x: gndStitchVia.x, y: gndStitchVia.y, id: gndStitchVia.id });
    }

    if (allGndNodes.length >= 2) {
      const inMst = new Set<number>([0]);
      while (inMst.size < allGndNodes.length) {
        let bestFrom = -1;
        let bestTo = -1;
        let bestRoute: SafeGndRoute | null = null;
        let bestScore = Infinity;

        // Find candidate edge (u, v) with the cleanest, lowest-score crossing-free route
        for (const u of inMst) {
          for (let v = 0; v < allGndNodes.length; v++) {
            if (!inMst.has(v)) {
              const p1 = allGndNodes[u];
              const p2 = allGndNodes[v];
              const route = findBestSafeGndRoute(
                p1,
                p2,
                gndLayer,
                gndTrackWidth,
                routedTracks,
                pads,
                boardWidthMm,
                boardHeightMm
              );
              if (route && route.score < bestScore) {
                bestScore = route.score;
                bestFrom = u;
                bestTo = v;
                bestRoute = route;
              }
            }
          }
        }

        // Fallback: if all candidate routes had conflicts, pick closest pair with direct connection
        if (bestTo === -1) {
          let minEuclid = Infinity;
          for (const u of inMst) {
            for (let v = 0; v < allGndNodes.length; v++) {
              if (!inMst.has(v)) {
                const d = Math.hypot(allGndNodes[u].x - allGndNodes[v].x, allGndNodes[u].y - allGndNodes[v].y);
                if (d < minEuclid) {
                  minEuclid = d;
                  bestFrom = u;
                  bestTo = v;
                }
              }
            }
          }
          if (bestTo !== -1) {
            const p1 = allGndNodes[bestFrom];
            const p2 = allGndNodes[bestTo];
            bestRoute = {
              waypoints: compute45RoutePoints(p1, p2),
              layer: gndLayer,
              needsVia: false,
              score: minEuclid,
            };
          }
        }

        if (bestTo !== -1 && bestRoute) {
          inMst.add(bestTo);
          const p1 = allGndNodes[bestFrom];

          if (bestRoute.needsVia) {
            const p1Pad = pads.find((p) => Math.hypot(p.x - p1.x, p.y - p1.y) < 0.1);
            if (!p1Pad || (p1Pad.layer !== 'all' && p1Pad.componentId !== 'VIA')) {
              pads.push({
                id: `via_gnd_hop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                componentId: 'VIA',
                pinId: 'GND',
                netId: 'GND',
                x: p1.x,
                y: p1.y,
                shape: 'round',
                diameterMm: 0.8,
                holeMm: 0.4,
                layer: 'all',
              });
            }
          }

          for (let i = 0; i < bestRoute.waypoints.length - 1; i++) {
            const ptFrom = {
              x: Math.round(bestRoute.waypoints[i].x * 100) / 100,
              y: Math.round(bestRoute.waypoints[i].y * 100) / 100,
            };
            const ptTo = {
              x: Math.round(bestRoute.waypoints[i + 1].x * 100) / 100,
              y: Math.round(bestRoute.waypoints[i + 1].y * 100) / 100,
            };
            if (Math.hypot(ptTo.x - ptFrom.x, ptTo.y - ptFrom.y) >= 0.05) {
              routedTracks.push({
                id: `trk_gnd_${bestFrom}_${bestTo}_${i}_${Math.random().toString(36).substring(2, 6)}`,
                layer: bestRoute.layer,
                from: ptFrom,
                to: ptTo,
                widthMm: gndTrackWidth,
                netId: 'GND',
              });
            }
          }
        } else {
          break;
        }
      }
    }

    // Run Design Rule Checks
    const drcErrors = this.runDrc(pads, routedTracks, boardWidthMm, boardHeightMm);

    return {
      widthMm: boardWidthMm,
      heightMm: boardHeightMm,
      boardThicknessMm: 1.6,
      copperLayers: 2,
      pads,
      tracks: routedTracks,
      components: placedComponents,
      drcErrors,
      gndPourLayer: DEFAULT_GND_POUR_LAYER,
    } as PcbLayout & { gndPourLayer: 'bottom_copper' | 'top_copper' | 'off' };
  }

  /**
   * Computes standard IPC-7351 physical footprint pads strictly matching real component packages
   * (DIP-8, DIP-14/16, Axial Resistors, Radial Caps, LEDs, Transistors, Terminals)
   */
  public static calculateFootprintPads(
    comp: CircuitComponent,
    normX: number,
    normY: number,
    rotationDeg: number = 0
  ): PcbPad[] {
    const pads: PcbPad[] = [];
    const upperType = comp.type.toUpperCase();
    const upperFootprint = (comp.footprint || '').toUpperCase();
    const rad = ((rotationDeg || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const transformCoord = (ox: number, oy: number) => {
      const rx = ox * cos - oy * sin;
      const ry = ox * sin + oy * cos;
      return {
        x: Math.round((normX + rx) * 100) / 100,
        y: Math.round((normY + ry) * 100) / 100,
      };
    };

    // 1. DIP ICs (NE555 Timer, LM358, LM741, ATmega, DIP-8, DIP-14, DIP-16, DIP-28)
    // Strictly adheres to JEDEC Top-View CCW Counter-Clockwise numbering
    if (
      upperType.includes('555') ||
      upperType.includes('TIMER') ||
      upperType.includes('DIP') ||
      upperFootprint.includes('DIP') ||
      ((upperType.includes('_IC') || upperType.startsWith('IC_') || upperType === 'IC' || upperType.includes('INTEGRATED_CIRCUIT')) && comp.pins.length >= 4) ||
      upperType.includes('OPAMP') ||
      upperType.includes('AMPLIFIER') ||
      upperType.includes('ATMEGA')
    ) {
      const is14or16 =
        upperFootprint.includes('DIP-14') ||
        upperFootprint.includes('DIP-16') ||
        upperType.includes('74HC') ||
        upperType.includes('LM324') ||
        upperType.includes('595') ||
        upperType.includes('4017') ||
        upperType.includes('2003') ||
        upperType.includes('293') ||
        comp.pins.length === 14 ||
        comp.pins.length === 16;
      const is28 = upperFootprint.includes('DIP-28') || upperType.includes('ATMEGA') || comp.pins.length === 28;
      const is16 = upperFootprint.includes('DIP-16') || upperType.includes('595') || upperType.includes('4017') || upperType.includes('2003') || upperType.includes('293') || comp.pins.length === 16;
      const pinCount = is28 ? 28 : is14or16 ? (is16 ? 16 : 14) : Math.max(8, comp.pins.length);
      const pinsPerSide = Math.floor(pinCount / 2);
      const startX = -((pinsPerSide - 1) * 2.54) / 2;

      // JEDEC standard: Top row is Pins 1..pinsPerSide (oy: -3.81), Bottom row is pinCount..pinsPerSide+1 (oy: 3.81)
      const pinMap: Record<string, { ox: number; oy: number }> = {};
      for (let i = 0; i < pinsPerSide; i++) {
        pinMap[String(i + 1)] = { ox: Math.round((startX + i * 2.54) * 100) / 100, oy: -3.81 };
      }
      for (let i = 0; i < pinsPerSide; i++) {
        const pinNum = pinCount - i;
        pinMap[String(pinNum)] = { ox: Math.round((startX + i * 2.54) * 100) / 100, oy: 3.81 };
      }

      // Semantic pin name aliases
      const namedPinMap: Record<string, { ox: number; oy: number }> = {
        out: pinMap['1'],
        out1: pinMap['1'],
        gnd: pinMap['1'],
        in_neg: pinMap['2'],
        in1_neg: pinMap['2'],
        trig: pinMap['2'],
        in_pos: pinMap['3'],
        in1_pos: pinMap['3'],
        vee: pinMap['4'],
        reset: pinMap['4'],
        ctrl: pinMap['5'],
        in2_pos: pinMap['5'],
        in2_neg: pinMap['6'],
        thres: pinMap['6'],
        out2: pinMap['7'],
        disch: pinMap['7'],
        vcc: pinMap[String(pinCount)],
        vplus: pinMap[String(pinCount)],
      };

      comp.pins.forEach((pin, idx) => {
        const pinNum = parseInt(pin.id, 10);
        let offset = pinMap[pin.id] || namedPinMap[pin.id.toLowerCase()];
        if (!offset) {
          if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= pinCount) {
            offset = pinMap[String(pinNum)];
          } else if (idx < pinsPerSide) {
            offset = { ox: Math.round((startX + idx * 2.54) * 100) / 100, oy: -3.81 };
          } else {
            offset = { ox: Math.round((-startX - (idx - pinsPerSide) * 2.54) * 100) / 100, oy: 3.81 };
          }
        }

        const pt = transformCoord(offset.ox, offset.oy);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: pin.id === '1' || idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 2. RGB LEDs (4-Pin Through-Hole 5mm dome)
    if (upperType.includes('RGB') || (upperType.includes('LED') && comp.pins.length === 4)) {
      const offsets = [-3.81, -1.27, 1.27, 3.81];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -3.81 + idx * 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 3. HC-SR04 Ultrasonic Sensor Module (4-Pin Header)
    if (upperType.includes('SR04') || upperType.includes('ULTRASONIC')) {
      const offsets = [-3.81, -1.27, 1.27, 3.81];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -3.81 + idx * 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 4. Bluetooth HC-05 / HC-06 Module (6-Pin Header along edge)
    if (upperType.includes('BLUETOOTH') || upperType.includes('HC05') || upperType.includes('HC06')) {
      const offsets = [-6.35, -3.81, -1.27, 1.27, 3.81, 6.35];
      comp.pins.forEach((pin, idx) => {
        const ox = offsets[idx] !== undefined ? offsets[idx] : -6.35 + idx * 2.54;
        const pt = transformCoord(ox, 5.0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 5. Axial Resistors, Diodes & Axial Inductors (Standard 10.16mm pitch)
    if (
      upperType.includes('RESISTOR') ||
      upperType.includes('DIODE') ||
      upperType.includes('INDUCTOR')
    ) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -5.08 : 5.08;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 6. Standard 2-Pin LEDs (5.08mm lead span matching 3D model)
    if (upperType.includes('LED')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 7. LDR Photoresistors & Piezo Buzzers (5.08mm pitch)
    if (upperType.includes('LDR') || upperType.includes('BUZZER')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 8. Capacitors: Polarized Electrolytic (5.08mm) vs Ceramic Disc (2.54mm)
    if (upperType.includes('CAPACITOR')) {
      const isElectrolytic =
        upperType.includes('ELECTROLYTIC') ||
        upperType.includes('RADIAL') ||
        Boolean(comp.parameters?.polarized) ||
        (comp.value && (comp.value.includes('u') || comp.value.includes('µ') || comp.value.includes('U')));
      const oxSpan = isElectrolytic ? 2.54 : 1.27;

      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -oxSpan : oxSpan;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 9. Potentiometers (3-pin Bourns 3386P)
    if (upperType.includes('POTENTIOMETER') || upperType.includes('TRIMMER')) {
      const offsets = [
        { ox: -2.54, oy: 0 },
        { ox: 0, oy: 2.54 },
        { ox: 2.54, oy: 0 },
      ];
      comp.pins.forEach((pin, idx) => {
        const off = offsets[idx] || { ox: (idx - 1) * 2.54, oy: 0 };
        const pt = transformCoord(off.ox, off.oy);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 10. Pushbuttons (4-Pin 6x6mm tactile switch at 5.08mm square pitch)
    if (
      upperType.includes('PUSH') ||
      upperType.includes('BUTTON') ||
      (upperType.includes('SWITCH') && comp.pins.length === 4)
    ) {
      const offsets = [
        { ox: -2.54, oy: -2.54 },
        { ox: 2.54, oy: -2.54 },
        { ox: -2.54, oy: 2.54 },
        { ox: 2.54, oy: 2.54 },
      ];
      comp.pins.forEach((pin, idx) => {
        const off = offsets[idx] || { ox: 0, oy: 0 };
        const pt = transformCoord(off.ox, off.oy);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 11. Slide Switches (3-Pin SPDT at 2.54mm pitch)
    if (upperType.includes('SWITCH')) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : idx === 1 ? 0 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 12. Transistors (TO-92 / TO-220 / BJT / MOSFET at 2.54mm pitch)
    if (
      upperType.includes('TRANSISTOR') ||
      upperType.includes('BJT') ||
      upperType.includes('MOSFET') ||
      upperType.includes('REGULATOR')
    ) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : idx === 1 ? 0 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 1.8,
          holeMm: 0.9,
          layer: 'all',
        });
      });
      return pads;
    }

    // 13. Batteries, Screw Terminals & Power Connectors (5.08mm pitch)
    if (
      upperType.includes('BATTERY') ||
      upperType.includes('VOLTAGE') ||
      upperType.includes('POWER') ||
      upperType.includes('TERMINAL')
    ) {
      comp.pins.forEach((pin, idx) => {
        const ox = idx === 0 ? -2.54 : 2.54;
        const pt = transformCoord(ox, 0);
        pads.push({
          id: `pad_${comp.id}_${pin.id}`,
          componentId: comp.id,
          pinId: pin.id,
          x: pt.x,
          y: pt.y,
          shape: idx === 0 ? 'rect' : 'round',
          diameterMm: 2.2,
          holeMm: 1.2,
          layer: 'all',
        });
      });
      return pads;
    }

    // 8. Generic fallback
    comp.pins.forEach((pin, idx) => {
      let ox = 0;
      let oy = 0;
      if (comp.pins.length === 2) {
        ox = idx === 0 ? -2.54 : 2.54;
      } else {
        const half = Math.ceil(comp.pins.length / 2);
        if (idx < half) {
          ox = -((half - 1) * 2.54) / 2 + idx * 2.54;
          oy = -3.81;
        } else {
          ox = ((half - 1) * 2.54) / 2 - (idx - half) * 2.54;
          oy = 3.81;
        }
      }
      const pt = transformCoord(ox, oy);
      pads.push({
        id: `pad_${comp.id}_${pin.id}`,
        componentId: comp.id,
        pinId: pin.id,
        x: pt.x,
        y: pt.y,
        shape: idx === 0 ? 'rect' : 'round',
        diameterMm: 1.8,
        holeMm: 0.9,
        layer: 'all',
      });
    });

    return pads;
  }

  /**
   * Run automated Design Rule Check (DRC)
   */
  public static runDrc(
    pads: PcbPad[],
    tracks: PcbTrack[],
    boardWidthMm: number,
    boardHeightMm: number
  ): { id: string; message: string; severity: 'error' | 'warning' }[] {
    const errors: { id: string; message: string; severity: 'error' | 'warning' }[] = [];

    // 1. Boundary check: ensure no pads are off-board
    pads.forEach((pad) => {
      if (pad.x < 1.5 || pad.x > boardWidthMm - 1.5 || pad.y < 1.5 || pad.y > boardHeightMm - 1.5) {
        errors.push({
          id: `drc_bound_${pad.id}`,
          message: `Pad ${pad.pinId} on ${pad.componentId} is too close to the board edge (< 1.5mm).`,
          severity: 'warning',
        });
      }
    });

    // 2. Minimum Track Width Check
    tracks.forEach((track) => {
      if (track.widthMm < 0.2) {
        errors.push({
          id: `drc_width_${track.id}`,
          message: `Track ${track.id} width (${track.widthMm}mm) is below minimum fab capability (0.2mm).`,
          severity: 'error',
        });
      }
    });

    // 3. Track Clearance Check
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        if (tracks[i].layer === tracks[j].layer) {
          const dist = Math.hypot(
            (tracks[i].from.x + tracks[i].to.x) / 2 - (tracks[j].from.x + tracks[j].to.x) / 2,
            (tracks[i].from.y + tracks[i].to.y) / 2 - (tracks[j].from.y + tracks[j].to.y) / 2
          );
          if (dist < 0.2) {
            errors.push({
              id: `drc_clear_${tracks[i].id}_${tracks[j].id}`,
              message: `Clearance between track ${tracks[i].id} and track ${tracks[j].id} is below 0.2mm.`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Generates a Bill of Materials (BOM) summary grouped by component type and value
   */
  public static generateBom(components: CircuitComponent[]): {
    componentType: string;
    value: string;
    footprint: string;
    quantity: number;
    designators: string[];
  }[] {
    const map = new Map<string, { componentType: string; value: string; footprint: string; quantity: number; designators: string[] }>();

    for (const comp of components) {
      const key = `${comp.type}__${comp.value}__${comp.footprint}`;
      const des = comp.designator || comp.label;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.designators.push(des);
      } else {
        map.set(key, {
          componentType: comp.type,
          value: comp.value,
          footprint: comp.footprint,
          quantity: 1,
          designators: [des],
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Generates standard RS-274X Gerber Top Copper file content
   */
  public static exportGerberTopCopper(pcb: PcbLayout): string {
    const dateStr = new Date().toISOString();
    let gerber = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,1.0*%\n`;
    gerber += `%TF.CreationDate,${dateStr}*%\n`;
    gerber += `%FSLAX35Y35*%\n`;
    gerber += `%MOMM*%\n`;
    gerber += `%LPD*%\n`;
    gerber += `%ADD10C,0.350000*%\n`; // 0.35mm round aperture for signal tracks
    gerber += `%ADD11C,1.800000*%\n`; // 1.8mm round pad aperture
    gerber += `G04 Layer: Top Copper*\n`;
    gerber += `D10*\n`;

    // Write Top Copper Tracks
    pcb.tracks
      .filter((t) => t.layer === 'top_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        gerber += `X${x1}Y${y1}D02*\n`; // Move to start
        gerber += `X${x2}Y${y2}D01*\n`; // Interpolate to end
      });

    // Write Pads
    gerber += `D11*\n`;
    pcb.pads.forEach((p) => {
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      gerber += `X${px}Y${py}D03*\n`; // Flash pad
    });

    gerber += `M02*\n`;
    return gerber;
  }

  /**
   * Generates standard RS-274X Gerber Bottom Copper (.gbl) file content
   */
  public static exportGerberBottomCopper(pcb: PcbLayout): string {
    const dateStr = new Date().toISOString();
    let gerber = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,1.0*%\n`;
    gerber += `%TF.CreationDate,${dateStr}*%\n`;
    gerber += `%FSLAX35Y35*%\n`;
    gerber += `%MOMM*%\n`;
    gerber += `%LPD*%\n`;
    gerber += `%ADD10C,0.350000*%\n`; // 0.35mm round aperture for signal tracks
    gerber += `%ADD11C,1.800000*%\n`; // 1.8mm round pad aperture
    gerber += `G04 Layer: Bottom Copper*\n`;
    gerber += `D10*\n`;

    // Write Bottom Copper Tracks
    pcb.tracks
      .filter((t) => t.layer === 'bottom_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        gerber += `X${x1}Y${y1}D02*\n`; // Move to start
        gerber += `X${x2}Y${y2}D01*\n`; // Interpolate to end
      });

    // Write Through-hole & Bottom Pads
    gerber += `D11*\n`;
    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'bottom')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        gerber += `X${px}Y${py}D03*\n`; // Flash pad
      });

    gerber += `M02*\n`;
    return gerber;
  }

  /**
   * Generates standard Excellon NC Drill file format
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    let drill = `M48\n`;
    drill += `METRIC,TZ\n`;
    drill += `FMAT,2\n`;
    drill += `T01C0.900\n`; // Tool 1: 0.9mm drill
    drill += `%\n`;
    drill += `G05\n`;
    drill += `G90\n`;
    drill += `T01\n`;

    pcb.pads.forEach((p) => {
      const x = (p.x).toFixed(3);
      const y = (p.y).toFixed(3);
      drill += `X${x}Y${y}\n`;
    });

    drill += `M30\n`;
    return drill;
  }
}
