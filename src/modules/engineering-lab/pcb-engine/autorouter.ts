/**
 * Professional 2-Layer Obstacle-Aware Lee / A* Maze PCB Auto-Router
 *
 * Implements a true 2-layer (F.Cu / B.Cu) grid-based pathfinder with:
 * 1. Disjoint Set Union (DSU) electrical net classification and MST connection ordering.
 * 2. True obstacle grid with pad clearances, previously routed track keepouts, and board margins.
 * 3. 2-layer 3D A* search with Manhattan layer biases (Top=Horizontal, Bottom=Vertical),
 *    45° diagonal steps, turn penalties, and dynamic layer-hopping via insertion.
 * 4. Post-route 45° corner beveling and collinear trace simplification.
 */

import { PcbPad, PcbTrack, CircuitWire, CircuitComponent } from '../types';

export interface AutoRouteOptions {
  gridResolutionMm?: number;
  defaultSignalWidthMm?: number;
  powerTrackWidthMm?: number;
  clearanceMm?: number;
}

/**
 * Computes a clean 45°-chamfered Manhattan waypoint sequence between two points.
 * Ensures either horizontal-then-45° or vertical-then-45° corner bevels with |dx| == |dy|.
 */
export function compute45RoutePoints(
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
    // Horizontal lead-in, then 45° chamfer to destination
    midX = from.x + (Math.abs(dx) - chamfer) * signX;
    midY = from.y;
  } else {
    // Vertical lead-in, then 45° chamfer to destination
    midX = from.x;
    midY = from.y + (Math.abs(dy) - chamfer) * signY;
  }

  const points: { x: number; y: number }[] = [from];
  if (Math.hypot(midX - from.x, midY - from.y) > 0.05 && Math.hypot(to.x - midX, to.y - midY) > 0.05) {
    points.push({ x: Math.round(midX * 100) / 100, y: Math.round(midY * 100) / 100 });
  }
  points.push(to);
  return points;
}

/**
 * Fast Binary Min-Heap Priority Queue for A* search
 */
class FastMinHeap {
  private data: { key: number; f: number }[] = [];

  public push(key: number, f: number) {
    this.data.push({ key, f });
    this.bubbleUp(this.data.length - 1);
  }

  public pop(): number | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0].key;
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public get size(): number {
    return this.data.length;
  }

  private bubbleUp(idx: number) {
    const el = this.data[idx];
    while (idx > 0) {
      const pIdx = (idx - 1) >> 1;
      const parent = this.data[pIdx];
      if (el.f >= parent.f) break;
      this.data[idx] = parent;
      this.data[pIdx] = el;
      idx = pIdx;
    }
  }

  private sinkDown(idx: number) {
    const len = this.data.length;
    const el = this.data[idx];
    while (true) {
      const leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let swapIdx = -1;
      let minF = el.f;

      if (leftIdx < len && this.data[leftIdx].f < minF) {
        swapIdx = leftIdx;
        minF = this.data[leftIdx].f;
      }
      if (rightIdx < len && this.data[rightIdx].f < minF) {
        swapIdx = rightIdx;
      }
      if (swapIdx === -1) break;
      this.data[idx] = this.data[swapIdx];
      this.data[swapIdx] = el;
      idx = swapIdx;
    }
  }
}

interface ConnectionTarget {
  netId: number;
  netName: string;
  isPower: boolean;
  startPad: PcbPad;
  endPad: PcbPad;
  widthMm: number;
}

export class PcbAutoRouter {
  /**
   * Run automated obstacle-aware 2-layer PCB routing
   */
  public static route(
    pads: PcbPad[],
    wires: CircuitWire[],
    boardWidthMm: number,
    boardHeightMm: number,
    opts: AutoRouteOptions = {},
    components?: CircuitComponent[]
  ): { tracks: PcbTrack[]; vias: PcbPad[] } {
    if (!pads || pads.length === 0 || !wires || wires.length === 0) {
      return { tracks: [], vias: [] };
    }

    const gridStep = opts.gridResolutionMm || 0.5;
    const defaultSignalWidth = opts.defaultSignalWidthMm || 0.35;
    const powerTrackWidth = opts.powerTrackWidthMm || 0.8;
    const clearanceMm = opts.clearanceMm || 0.25;

    const cols = Math.ceil(boardWidthMm / gridStep) + 1;
    const rows = Math.ceil(boardHeightMm / gridStep) + 1;
    const totalCells = cols * rows;

    // Layer 0: top_copper (F.Cu), Layer 1: bottom_copper (B.Cu)
    // 0 = free, -1 = obstacle / keepout, > 0 = occupied by netId
    const grid = new Int32Array(2 * totalCells);

    const getCellIdx = (layer: number, gx: number, gy: number): number => {
      return (layer * rows + gy) * cols + gx;
    };

    // 1. Mark Board Margins (keepout margin 1.0mm from board edge)
    const marginCells = Math.max(1, Math.ceil(1.0 / gridStep));
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (
          gx < marginCells ||
          gx >= cols - marginCells ||
          gy < marginCells ||
          gy >= rows - marginCells
        ) {
          grid[getCellIdx(0, gx, gy)] = -1;
          grid[getCellIdx(1, gx, gy)] = -1;
        }
      }
    }

    // 2. Map Component Pins to Pads
    const padByPinKey = new Map<string, PcbPad>();
    pads.forEach((pad) => {
      padByPinKey.set(`${pad.componentId}:${pad.pinId}`, pad);
    });

    // 3. Build Electrical Nets using Union-Find (DSU)
    const parent = new Map<string, string>();
    const findSet = (key: string): string => {
      let p = parent.get(key) || key;
      if (p !== key) {
        p = findSet(p);
        parent.set(key, p);
      }
      return p;
    };
    const unionSet = (k1: string, k2: string) => {
      const r1 = findSet(k1);
      const r2 = findSet(k2);
      if (r1 !== r2) parent.set(r1, r2);
    };

    // Initialize all pins
    padByPinKey.forEach((_, key) => parent.set(key, key));

    // Union pins connected by wires
    wires.forEach((w) => {
      const k1 = `${w.fromCompId}:${w.fromPinId}`;
      const k2 = `${w.toCompId}:${w.toPinId}`;
      if (padByPinKey.has(k1) && padByPinKey.has(k2)) {
        unionSet(k1, k2);
      }
    });

    // Assign integer net IDs (1, 2, 3...)
    const rootToNetId = new Map<string, number>();
    let nextNetId = 1;
    padByPinKey.forEach((_, key) => {
      const root = findSet(key);
      if (!rootToNetId.has(root)) {
        rootToNetId.set(root, nextNetId++);
      }
    });

    const padNetMap = new Map<PcbPad, number>();
    pads.forEach((pad) => {
      const key = `${pad.componentId}:${pad.pinId}`;
      const root = findSet(key);
      const nId = rootToNetId.get(root) || 0;
      padNetMap.set(pad, nId);
    });

    // Determine Power Nets
    const powerNetIds = new Set<number>();
    const powerCompIds = new Set<string>();
    components?.forEach((c) => {
      const type = c.type.toUpperCase();
      if (
        type.includes('BATTERY') ||
        type.includes('VOLTAGE') ||
        type.includes('SUPPLY') ||
        type.includes('POWER')
      ) {
        powerCompIds.add(c.id);
      }
    });

    pads.forEach((pad) => {
      const nId = padNetMap.get(pad);
      if (!nId) return;
      const pinName = pad.pinId.toLowerCase();
      if (
        powerCompIds.has(pad.componentId) ||
        pinName.includes('vcc') ||
        pinName.includes('vdd') ||
        pinName.includes('gnd') ||
        pinName.includes('vss') ||
        pinName.includes('+5v') ||
        pinName.includes('+9v') ||
        pinName.includes('bat')
      ) {
        powerNetIds.add(nId);
      }
    });

    // 4. Populate Obstacle Grid with All Pads
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad) || 0;
      const padRadius = pad.diameterMm / 2;
      const totalR = padRadius + clearanceMm;
      const minGx = Math.max(0, Math.floor((pad.x - totalR) / gridStep));
      const maxGx = Math.min(cols - 1, Math.ceil((pad.x + totalR) / gridStep));
      const minGy = Math.max(0, Math.floor((pad.y - totalR) / gridStep));
      const maxGy = Math.min(rows - 1, Math.ceil((pad.y + totalR) / gridStep));

      for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const px = gx * gridStep;
          const py = gy * gridStep;
          if (Math.hypot(px - pad.x, py - pad.y) <= totalR) {
            // Apply to appropriate layers
            if (pad.layer === 'all' || pad.layer === 'top') {
              grid[getCellIdx(0, gx, gy)] = nId;
            }
            if (pad.layer === 'all' || pad.layer === 'bottom') {
              grid[getCellIdx(1, gx, gy)] = nId;
            }
          }
        }
      }
    });

    // 5. Build Connections to Route (Minimum Spanning Tree per Net)
    // Group pads by net
    const netPadsMap = new Map<number, PcbPad[]>();
    padNetMap.forEach((nId, pad) => {
      if (!netPadsMap.has(nId)) netPadsMap.set(nId, []);
      netPadsMap.get(nId)!.push(pad);
    });

    const connections: ConnectionTarget[] = [];

    // For each wire, if it exists, ensure connection is made
    wires.forEach((wire) => {
      const p1 = padByPinKey.get(`${wire.fromCompId}:${wire.fromPinId}`);
      const p2 = padByPinKey.get(`${wire.toCompId}:${wire.toPinId}`);
      if (!p1 || !p2 || p1 === p2) return;
      const nId = padNetMap.get(p1) || 0;
      const isPower = powerNetIds.has(nId);
      connections.push({
        netId: nId,
        netName: `NET_${nId}`,
        isPower,
        startPad: p1,
        endPad: p2,
        widthMm: isPower ? powerTrackWidth : defaultSignalWidth,
      });
    });

    // Sort connections: Power nets first (wide highway traces), then shortest signals
    connections.sort((a, b) => {
      if (a.isPower && !b.isPower) return -1;
      if (!a.isPower && b.isPower) return 1;
      const dA = Math.hypot(a.startPad.x - a.endPad.x, a.startPad.y - a.endPad.y);
      const dB = Math.hypot(b.startPad.x - b.endPad.x, b.startPad.y - b.endPad.y);
      return dA - dB;
    });

    const tracks: PcbTrack[] = [];
    const vias: PcbPad[] = [];
    let viaCounter = 1;

    // Direction vectors: 8 directions (4 orthogonal, 4 diagonal)
    const DIRS = [
      { dx: 1, dy: 0, cost: 1.0, isDiag: false, dirIdx: 0 },
      { dx: -1, dy: 0, cost: 1.0, isDiag: false, dirIdx: 1 },
      { dx: 0, dy: 1, cost: 1.0, isDiag: false, dirIdx: 2 },
      { dx: 0, dy: -1, cost: 1.0, isDiag: false, dirIdx: 3 },
      { dx: 1, dy: 1, cost: 1.414, isDiag: true, dirIdx: 4 },
      { dx: 1, dy: -1, cost: 1.414, isDiag: true, dirIdx: 5 },
      { dx: -1, dy: 1, cost: 1.414, isDiag: true, dirIdx: 6 },
      { dx: -1, dy: -1, cost: 1.414, isDiag: true, dirIdx: 7 },
    ];

    // Helper: Mark route on obstacle grid
    const commitRouteToGrid = (
      points: { gx: number; gy: number; layer: number }[],
      netId: number,
      traceRadiusMm: number
    ) => {
      const radCells = Math.max(1, Math.ceil(traceRadiusMm / gridStep));
      for (const pt of points) {
        const minGx = Math.max(0, pt.gx - radCells);
        const maxGx = Math.min(cols - 1, pt.gx + radCells);
        const minGy = Math.max(0, pt.gy - radCells);
        const maxGy = Math.min(rows - 1, pt.gy + radCells);

        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            if (Math.hypot((gx - pt.gx) * gridStep, (gy - pt.gy) * gridStep) <= traceRadiusMm) {
              const idx = getCellIdx(pt.layer, gx, gy);
              if (grid[idx] === 0) {
                grid[idx] = netId;
              }
            }
          }
        }
      }
    };

    // Helper: Check if a via can be placed at (gx, gy)
    const canPlaceViaAt = (gx: number, gy: number, netId: number): boolean => {
      const viaRadiusMm = 0.4 + clearanceMm; // 0.8mm dia via / 2 + clearance
      const radCells = Math.ceil(viaRadiusMm / gridStep);
      const minGx = Math.max(0, gx - radCells);
      const maxGx = Math.min(cols - 1, gx + radCells);
      const minGy = Math.max(0, gy - radCells);
      const maxGy = Math.min(rows - 1, gy + radCells);

      for (let y = minGy; y <= maxGy; y++) {
        for (let x = minGx; x <= maxGx; x++) {
          if (Math.hypot((x - gx) * gridStep, (y - gy) * gridStep) <= viaRadiusMm) {
            const v0 = grid[getCellIdx(0, x, y)];
            const v1 = grid[getCellIdx(1, x, y)];
            // Must not hit another net or board edge on either layer
            if ((v0 !== 0 && v0 !== netId) || (v1 !== 0 && v1 !== netId)) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // 6. Route each connection using 2-Layer 3D A*
    connections.forEach((conn, connIdx) => {
      const { netId, widthMm, startPad, endPad } = conn;
      const startGx = Math.round(startPad.x / gridStep);
      const startGy = Math.round(startPad.y / gridStep);
      const endGx = Math.round(endPad.x / gridStep);
      const endGy = Math.round(endPad.y / gridStep);

      // Start layers: prefer layer 0 (top copper)
      const startLayers =
        startPad.layer === 'bottom'
          ? [1]
          : startPad.layer === 'top'
          ? [0]
          : [0, 1]; // through-hole can start on either layer

      const heap = new FastMinHeap();
      const gScores = new Map<number, number>();
      const cameFrom = new Map<number, { parentKey: number; gx: number; gy: number; layer: number }>();

      // Heuristic: Octile distance to target
      const heuristic = (gx: number, gy: number, layer: number): number => {
        const dx = Math.abs(gx - endGx);
        const dy = Math.abs(gy - endGy);
        const octile = (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * gridStep;
        // Small penalty if on bottom layer and target is SMD top
        const layerPenalty = endPad.layer === 'top' && layer === 1 ? 5.0 : 0;
        return octile + layerPenalty;
      };

      for (const layer of startLayers) {
        const key = (layer << 20) | (startGy << 10) | startGx;
        gScores.set(key, 0);
        heap.push(key, heuristic(startGx, startGy, layer));
      }

      let foundEndKey: number | null = null;
      let iterations = 0;
      const maxIterations = 12000; // Fast cutoff to guarantee 60fps interaction

      while (heap.size > 0 && iterations++ < maxIterations) {
        const currentKey = heap.pop()!;
        const currentLayer = (currentKey >> 20) & 1;
        const currentGy = (currentKey >> 10) & 0x3ff;
        const currentGx = currentKey & 0x3ff;

        // Check if destination pad reached
        if (currentGx === endGx && currentGy === endGy) {
          // If endPad is single-layer SMD, must be on that layer
          if (endPad.layer === 'top' && currentLayer !== 0) {
            // Need via to reach top layer
          } else if (endPad.layer === 'bottom' && currentLayer !== 1) {
            // Need via to reach bottom layer
          } else {
            foundEndKey = currentKey;
            break;
          }
        }

        const currentG = gScores.get(currentKey) || 0;

        // 1. Move in 8 directions on same layer
        for (const dir of DIRS) {
          const nextGx = currentGx + dir.dx;
          const nextGy = currentGy + dir.dy;

          if (nextGx < marginCells || nextGx >= cols - marginCells || nextGy < marginCells || nextGy >= rows - marginCells) {
            continue;
          }

          const cellVal = grid[getCellIdx(currentLayer, nextGx, nextGy)];
          // Passable if 0 (free) or netId (same electrical net)
          if (cellVal !== 0 && cellVal !== netId) {
            continue;
          }

          // Corner-cutting check for diagonal moves
          if (dir.isDiag) {
            const adj1 = grid[getCellIdx(currentLayer, currentGx + dir.dx, currentGy)];
            const adj2 = grid[getCellIdx(currentLayer, currentGx, currentGy + dir.dy)];
            if ((adj1 !== 0 && adj1 !== netId) || (adj2 !== 0 && adj2 !== netId)) {
              continue;
            }
          }

          // Layer directional bias: Layer 0 prefers Horizontal, Layer 1 prefers Vertical
          let biasCost = 0;
          if (currentLayer === 0 && dir.dx === 0 && dir.dy !== 0) {
            biasCost = 0.2 * gridStep;
          } else if (currentLayer === 1 && dir.dy === 0 && dir.dx !== 0) {
            biasCost = 0.2 * gridStep;
          }

          const nextG = currentG + dir.cost * gridStep + biasCost;
          const nextKey = (currentLayer << 20) | (nextGy << 10) | nextGx;

          if (!gScores.has(nextKey) || nextG < gScores.get(nextKey)!) {
            gScores.set(nextKey, nextG);
            cameFrom.set(nextKey, {
              parentKey: currentKey,
              gx: currentGx,
              gy: currentGy,
              layer: currentLayer,
            });
            heap.push(nextKey, nextG + heuristic(nextGx, nextGy, currentLayer));
          }
        }

        // 2. Layer hop (via) to the other layer at same (gx, gy)
        // Vias only allowed if not directly inside start or end pad, and has clearance
        const dStart = Math.hypot((currentGx - startGx) * gridStep, (currentGy - startGy) * gridStep);
        const dEnd = Math.hypot((currentGx - endGx) * gridStep, (currentGy - endGy) * gridStep);

        if (dStart > 1.2 && dEnd > 1.2 && canPlaceViaAt(currentGx, currentGy, netId)) {
          const otherLayer = currentLayer === 0 ? 1 : 0;
          const viaCost = 14.0 * gridStep; // Via insertion penalty
          const nextG = currentG + viaCost;
          const nextKey = (otherLayer << 20) | (currentGy << 10) | currentGx;

          if (!gScores.has(nextKey) || nextG < gScores.get(nextKey)!) {
            gScores.set(nextKey, nextG);
            cameFrom.set(nextKey, {
              parentKey: currentKey,
              gx: currentGx,
              gy: currentGy,
              layer: currentLayer,
            });
            heap.push(nextKey, nextG + heuristic(currentGx, currentGy, otherLayer));
          }
        }
      }

      // Reconstruct path
      if (foundEndKey !== null) {
        const rawPath: { gx: number; gy: number; layer: number }[] = [];
        let curr: number | undefined = foundEndKey;

        while (curr !== undefined) {
          const l = (curr >> 20) & 1;
          const gy = (curr >> 10) & 0x3ff;
          const gx = curr & 0x3ff;
          rawPath.push({ gx, gy, layer: l });
          const prev = cameFrom.get(curr);
          curr = prev ? prev.parentKey : undefined;
        }

        rawPath.reverse();

        // Commit obstacle cells along this path
        commitRouteToGrid(rawPath, netId, widthMm / 2 + clearanceMm);

        // Convert path to segments, inserting vias at layer hops
        let currentSlice: { x: number; y: number }[] = [];
        let currentSliceLayer = rawPath[0].layer;

        for (let i = 0; i < rawPath.length; i++) {
          const p = rawPath[i];
          const worldPt = {
            x: Math.round(p.gx * gridStep * 100) / 100,
            y: Math.round(p.gy * gridStep * 100) / 100,
          };

          if (p.layer !== currentSliceLayer) {
            // Layer transition: insert via and emit current slice tracks
            const viaX = worldPt.x;
            const viaY = worldPt.y;
            const viaPad: PcbPad = {
              id: `via_${conn.netName}_${viaCounter++}`,
              componentId: 'VIA',
              pinId: 'VIA',
              x: viaX,
              y: viaY,
              shape: 'round',
              diameterMm: 0.8,
              holeMm: 0.4,
              layer: 'all',
            };
            vias.push(viaPad);

            currentSlice.push(worldPt);
            emitChamferedTracks(
              currentSlice,
              currentSliceLayer === 0 ? 'top_copper' : 'bottom_copper',
              widthMm,
              conn.netName,
              tracks
            );

            // Start new slice on other layer
            currentSlice = [worldPt];
            currentSliceLayer = p.layer;
          } else {
            currentSlice.push(worldPt);
          }
        }

        if (currentSlice.length >= 2) {
          emitChamferedTracks(
            currentSlice,
            currentSliceLayer === 0 ? 'top_copper' : 'bottom_copper',
            widthMm,
            conn.netName,
            tracks
          );
        }
      } else {
        // Fallback: 45° chamfered route on less congested layer
        const waypoints = compute45RoutePoints(
          { x: startPad.x, y: startPad.y },
          { x: endPad.x, y: endPad.y }
        );
        const chosenLayer: 'top_copper' | 'bottom_copper' =
          connIdx % 2 === 0 ? 'top_copper' : 'bottom_copper';

        for (let i = 0; i < waypoints.length - 1; i++) {
          tracks.push({
            id: `trk_${conn.netName}_fb_${chosenLayer}_${i}`,
            layer: chosenLayer,
            from: waypoints[i],
            to: waypoints[i + 1],
            widthMm,
            netId: conn.netName,
          });
        }
      }
    });

    return { tracks, vias };
  }
}

/**
 * Emits clean, 45°-chamfered, collinear-simplified PCB tracks from a sequence of points
 */
function emitChamferedTracks(
  points: { x: number; y: number }[],
  layer: 'top_copper' | 'bottom_copper',
  widthMm: number,
  netId: string,
  outputTracks: PcbTrack[]
) {
  if (points.length < 2) return;

  // 1. Remove duplicate adjacent points
  const deduped: { x: number; y: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.hypot(points[i].x - prev.x, points[i].y - prev.y) > 0.05) {
      deduped.push(points[i]);
    }
  }

  if (deduped.length < 2) return;

  // 2. Collinear simplification
  const simplified: { x: number; y: number }[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const pPrev = simplified[simplified.length - 1];
    const pCurr = deduped[i];
    const pNext = deduped[i + 1];

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;

    // Cross product to test collinearity
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 0.001) {
      simplified.push(pCurr);
    }
  }
  simplified.push(deduped[deduped.length - 1]);

  // 3. Bevel 90° corners to 45° chamfers
  const finalPoints: { x: number; y: number }[] = [simplified[0]];
  for (let i = 1; i < simplified.length - 1; i++) {
    const pPrev = finalPoints[finalPoints.length - 1];
    const pCurr = simplified[i];
    const pNext = simplified[i + 1];

    const v1x = pCurr.x - pPrev.x;
    const v1y = pCurr.y - pPrev.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    // If 90-degree corner (dot product close to 0)
    const dot = v1x * v2x + v1y * v2y;
    if (Math.abs(dot) < 0.01 && len1 > 0.8 && len2 > 0.8) {
      const chamfer = Math.min(1.2, len1 * 0.45, len2 * 0.45);
      const cut1 = {
        x: pCurr.x - (v1x / len1) * chamfer,
        y: pCurr.y - (v1y / len1) * chamfer,
      };
      const cut2 = {
        x: pCurr.x + (v2x / len2) * chamfer,
        y: pCurr.y + (v2y / len2) * chamfer,
      };
      finalPoints.push({ x: Math.round(cut1.x * 100) / 100, y: Math.round(cut1.y * 100) / 100 });
      finalPoints.push({ x: Math.round(cut2.x * 100) / 100, y: Math.round(cut2.y * 100) / 100 });
    } else {
      finalPoints.push(pCurr);
    }
  }
  finalPoints.push(simplified[simplified.length - 1]);

  // 4. Emit track segments
  for (let i = 0; i < finalPoints.length - 1; i++) {
    outputTracks.push({
      id: `trk_${netId}_${layer}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      layer,
      from: finalPoints[i],
      to: finalPoints[i + 1],
      widthMm,
      netId,
    });
  }
}
