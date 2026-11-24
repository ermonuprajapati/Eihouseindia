import { CircuitComponent, CircuitWire, PcbLayout, PcbPad, PcbTrack } from '../types';

export interface AutoRouteOptions {
  gridResolutionMm?: number;
  defaultSignalWidthMm?: number;
  powerTrackWidthMm?: number;
  clearanceMm?: number;
  maxRipUpPasses?: number;
}

export interface RoutingStats {
  unroutedNets: number;
  crossings: number;
  padShorts: number;
  orphanVias: number;
  deadEndTracks: number;
}

export interface ManufacturingIntegrityResult {
  valid: boolean;
  errors: string[];
  stats: RoutingStats;
}

/**
 * High-performance Binary Min-Heap Priority Queue for A* Search
 */
class FastMinHeap {
  private keys: number[] = [];
  private priorities: Float64Array;
  private capacity: number;
  public size: number = 0;

  constructor(initialCapacity: number = 65536) {
    this.capacity = initialCapacity;
    this.priorities = new Float64Array(this.capacity);
  }

  public clear(): void {
    this.size = 0;
  }

  public push(key: number, priority: number): void {
    if (this.size >= this.capacity) {
      this.capacity *= 2;
      const nextP = new Float64Array(this.capacity);
      nextP.set(this.priorities);
      this.priorities = nextP;
    }

    let i = this.size++;
    this.keys[i] = key;
    this.priorities[i] = priority;

    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.priorities[i] >= this.priorities[p]) break;
      this.swap(i, p);
      i = p;
    }
  }

  public pop(): number | undefined {
    if (this.size === 0) return undefined;
    const topKey = this.keys[0];
    this.size--;
    if (this.size > 0) {
      this.keys[0] = this.keys[this.size];
      this.priorities[0] = this.priorities[this.size];
      let i = 0;
      while (true) {
        const left = (i << 1) + 1;
        const right = left + 1;
        let smallest = i;

        if (left < this.size && this.priorities[left] < this.priorities[smallest]) {
          smallest = left;
        }
        if (right < this.size && this.priorities[right] < this.priorities[smallest]) {
          smallest = right;
        }
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return topKey;
  }

  private swap(a: number, b: number): void {
    const tk = this.keys[a];
    this.keys[a] = this.keys[b];
    this.keys[b] = tk;

    const tp = this.priorities[a];
    this.priorities[a] = this.priorities[b];
    this.priorities[b] = tp;
  }
}

/**
 * 2D Geometric Helper Functions
 */
export function linesIntersect(
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

export function pointToSegmentDist(
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
    midX = from.x + (Math.abs(dx) - chamfer) * signX;
    midY = from.y;
  } else {
    midX = from.x;
    midY = from.y + (Math.abs(dy) - chamfer) * signY;
  }

  const points = [from];
  if (Math.hypot(midX - from.x, midY - from.y) > 0.05 && Math.hypot(to.x - midX, to.y - midY) > 0.05) {
    points.push({ x: Math.round(midX * 100) / 100, y: Math.round(midY * 100) / 100 });
  }
  points.push(to);
  return points;
}

/**
 * Deterministic 2-Layer Grid A* PCB Autorouter
 */
export class PcbGridAutorouter {
  public static route(
    pads: PcbPad[],
    wires: CircuitWire[],
    boardWidthMm: number,
    boardHeightMm: number,
    options?: AutoRouteOptions,
    _components?: CircuitComponent[]
  ): { tracks: PcbTrack[]; vias: PcbPad[] } {
    const gridStep = options?.gridResolutionMm || 0.635; // 2.54 / 4 = 0.635mm
    const defaultSignalWidth = options?.defaultSignalWidthMm || 0.35;
    const powerTrackWidth = options?.powerTrackWidthMm || 0.55;
    const clearanceMm = options?.clearanceMm || 0.25;
    const edgeMarginMm = 1.5;

    const cols = Math.ceil(boardWidthMm / gridStep) + 1;
    const rows = Math.ceil(boardHeightMm / gridStep) + 1;
    const layerCells = cols * rows;

    const getCellIdx = (layer: number, gx: number, gy: number) => layer * layerCells + gy * cols + gx;

    // Obstacle grid: 0 = free, -1 = permanent obstacle (margin/hole), > 0 = net ID
    const grid = new Int32Array(layerCells * 2);

    // 1. Mark Board Margins as Permanent Obstacles (-1)
    const marginCols = Math.ceil(edgeMarginMm / gridStep);
    const marginRows = Math.ceil(edgeMarginMm / gridStep);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (gx < marginCols || gx >= cols - marginCols || gy < marginRows || gy >= rows - marginRows) {
          grid[getCellIdx(0, gx, gy)] = -1;
          grid[getCellIdx(1, gx, gy)] = -1;
        }
      }
    }

    // 2. Mark M3 Mounting Holes as Permanent Obstacles (-1) on both layers
    const mHoles = [
      { id: 'm3_tl', xMm: 5.0, yMm: 5.0, drillMm: 3.2, outerMm: 6.0 },
      { id: 'm3_tr', xMm: boardWidthMm - 5.0, yMm: 5.0, drillMm: 3.2, outerMm: 6.0 },
      { id: 'm3_bl', xMm: 5.0, yMm: boardHeightMm - 5.0, drillMm: 3.2, outerMm: 6.0 },
      { id: 'm3_br', xMm: boardWidthMm - 5.0, yMm: boardHeightMm - 5.0, drillMm: 3.2, outerMm: 6.0 },
    ];

    mHoles.forEach((h) => {
      const hx = h.xMm ?? 5.0;
      const hy = h.yMm ?? 5.0;
      const keepoutR = (h.outerMm || 6.0) / 2 + defaultSignalWidth / 2 + 0.35;
      const minGx = Math.max(0, Math.floor((hx - keepoutR) / gridStep));
      const maxGx = Math.min(cols - 1, Math.ceil((hx + keepoutR) / gridStep));
      const minGy = Math.max(0, Math.floor((hy - keepoutR) / gridStep));
      const maxGy = Math.min(rows - 1, Math.ceil((hy + keepoutR) / gridStep));

      for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          if (Math.hypot(gx * gridStep - hx, gy * gridStep - hy) <= keepoutR) {
            grid[getCellIdx(0, gx, gy)] = -1;
            grid[getCellIdx(1, gx, gy)] = -1;
          }
        }
      }
    });

    // 3. Net Clustering via Disjoint Set Union (DSU)
    const padByPinKey = new Map<string, PcbPad>();
    pads.forEach((p) => {
      if (p.componentId && p.pinId) {
        padByPinKey.set(`${p.componentId}:${p.pinId}`, p);
      }
    });

    const parent = new Map<string, string>();
    const findSet = (x: string): string => {
      let r = x;
      while (parent.get(r) && parent.get(r) !== r) {
        r = parent.get(r)!;
      }
      let curr = x;
      while (parent.get(curr) && parent.get(curr) !== r) {
        const next = parent.get(curr)!;
        parent.set(curr, r);
        curr = next;
      }
      return r;
    };
    const unionSet = (x: string, y: string) => {
      const rx = findSet(x);
      const ry = findSet(y);
      if (rx !== ry) parent.set(rx, ry);
    };

    padByPinKey.forEach((_, key) => parent.set(key, key));

    wires.forEach((w) => {
      const k1 = `${w.fromCompId}:${w.fromPinId}`;
      const k2 = `${w.toCompId}:${w.toPinId}`;
      if (padByPinKey.has(k1) && padByPinKey.has(k2)) {
        unionSet(k1, k2);
      }
    });

    // Also union any pads that already share the same explicit netId (e.g. GND, VCC)
    const padsByExplicitNet = new Map<string, PcbPad[]>();
    pads.forEach((pad) => {
      if (pad.netId && pad.componentId && pad.pinId) {
        if (!padsByExplicitNet.has(pad.netId)) padsByExplicitNet.set(pad.netId, []);
        padsByExplicitNet.get(pad.netId)!.push(pad);
      }
    });
    padsByExplicitNet.forEach((nPads) => {
      const firstKey = `${nPads[0].componentId}:${nPads[0].pinId}`;
      for (let i = 1; i < nPads.length; i++) {
        unionSet(firstKey, `${nPads[i].componentId}:${nPads[i].pinId}`);
      }
    });

    // Assign Integer Net IDs
    const rootToNetId = new Map<string, number>();
    const rootToNetName = new Map<string, string>();
    let nextNetId = 1;

    padByPinKey.forEach((pad, key) => {
      const root = findSet(key);
      if (!rootToNetId.has(root)) {
        const id = nextNetId++;
        rootToNetId.set(root, id);
        rootToNetName.set(root, pad.netId || `NET_${id}`);
      }
    });

    const padNetMap = new Map<PcbPad, number>();
    pads.forEach((pad) => {
      const key = `${pad.componentId}:${pad.pinId}`;
      const root = findSet(key);
      const nId = rootToNetId.get(root) || 0;
      const nName = rootToNetName.get(root) || pad.netId || `NET_${nId}`;
      padNetMap.set(pad, nId);
      if (!pad.netId) pad.netId = nName;
    });

    // Identify Power Nets
    const powerNetIds = new Set<number>();
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad);
      if (!nId) return;
      const pinName = (pad.pinId || '').toLowerCase();
      const netName = (pad.netId || '').toLowerCase();
      if (
        pinName.includes('vcc') ||
        pinName.includes('vdd') ||
        pinName.includes('gnd') ||
        pinName.includes('vss') ||
        pinName.includes('+5v') ||
        pinName.includes('+9v') ||
        pinName.includes('bat') ||
        netName.includes('vcc') ||
        netName.includes('gnd')
      ) {
        powerNetIds.add(nId);
      }
    });

    // 4. Populate Obstacle Grid with All Component Pads
    const maxTrackWidth = Math.max(defaultSignalWidth, powerTrackWidth);
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad) || 0;
      const padRadius = (pad.diameterMm || 1.8) / 2;
      const keepoutR = padRadius + maxTrackWidth / 2 + 0.16;
      const minGx = Math.max(0, Math.floor((pad.x - keepoutR) / gridStep));
      const maxGx = Math.min(cols - 1, Math.ceil((pad.x + keepoutR) / gridStep));
      const minGy = Math.max(0, Math.floor((pad.y - keepoutR) / gridStep));
      const maxGy = Math.min(rows - 1, Math.ceil((pad.y + keepoutR) / gridStep));

      const layers = pad.layer === 'bottom' ? [1] : pad.layer === 'top' ? [0] : [0, 1];

      for (const l of layers) {
        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            const dist = Math.hypot(gx * gridStep - pad.x, gy * gridStep - pad.y);
            if (dist <= keepoutR) {
              const idx = getCellIdx(l, gx, gy);
              if (grid[idx] === -1) {
                continue;
              }
              if (nId === 0) {
                grid[idx] = -1;
              } else if (grid[idx] === 0) {
                grid[idx] = nId;
              } else if (grid[idx] !== nId) {
                grid[idx] = -1;
              }
            }
          }
        }
      }
    });

    // Group pads by electrical Net
    const netPadsMap = new Map<number, PcbPad[]>();
    padNetMap.forEach((nId, pad) => {
      if (nId === 0) return;
      if (!netPadsMap.has(nId)) netPadsMap.set(nId, []);
      netPadsMap.get(nId)!.push(pad);
    });

    // 5. Direction vectors: 8 directions (4 orthogonal, 4 diagonal)
    const DIRS = [
      { dx: 1, dy: 0, cost: 1.0, isDiag: false, isHoriz: true },
      { dx: -1, dy: 0, cost: 1.0, isDiag: false, isHoriz: true },
      { dx: 0, dy: 1, cost: 1.0, isDiag: false, isHoriz: false },
      { dx: 0, dy: -1, cost: 1.0, isDiag: false, isHoriz: false },
      { dx: 1, dy: 1, cost: 1.414, isDiag: true, isHoriz: false },
      { dx: 1, dy: -1, cost: 1.414, isDiag: true, isHoriz: false },
      { dx: -1, dy: 1, cost: 1.414, isDiag: true, isHoriz: false },
      { dx: -1, dy: -1, cost: 1.414, isDiag: true, isHoriz: false },
    ];

    const tracks: PcbTrack[] = [];
    const vias: PcbPad[] = [];
    let viaCounter = 1;

    // Helper: Mark route on obstacle grid with clearance
    const commitRouteToGrid = (
      points: { gx: number; gy: number; layer: number }[],
      netId: number,
      traceRadiusMm: number
    ) => {
      const requiredClearance = Math.max(traceRadiusMm, maxTrackWidth / 2 + defaultSignalWidth / 2 + 0.22);
      const radCells = Math.max(1, Math.ceil(requiredClearance / gridStep));
      for (const pt of points) {
        const minGx = Math.max(0, pt.gx - radCells);
        const maxGx = Math.min(cols - 1, pt.gx + radCells);
        const minGy = Math.max(0, pt.gy - radCells);
        const maxGy = Math.min(rows - 1, pt.gy + radCells);

        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            if (Math.hypot((gx - pt.gx) * gridStep, (gy - pt.gy) * gridStep) <= requiredClearance) {
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
      const viaOuterR = 0.4;
      const requiredClearance = viaOuterR + clearanceMm;
      const wx = gx * gridStep;
      const wy = gy * gridStep;

      if (
        wx < edgeMarginMm + requiredClearance ||
        wx > boardWidthMm - edgeMarginMm - requiredClearance ||
        wy < edgeMarginMm + requiredClearance ||
        wy > boardHeightMm - edgeMarginMm - requiredClearance
      ) {
        return false;
      }

      for (const h of mHoles) {
        const hx = h.xMm ?? 5.0;
        const hy = h.yMm ?? 5.0;
        const hr = (h.outerMm || 6.0) / 2;
        if (Math.hypot(wx - hx, wy - hy) < hr + requiredClearance + 0.25) {
          return false;
        }
      }

      for (const pad of pads) {
        const padR = (pad.diameterMm || 1.8) / 2;
        if (Math.hypot(wx - pad.x, wy - pad.y) < padR + viaOuterR + 0.30) {
          return false;
        }
      }

      const radCells = Math.ceil(requiredClearance / gridStep);
      const minGx = Math.max(0, gx - radCells);
      const maxGx = Math.min(cols - 1, gx + radCells);
      const minGy = Math.max(0, gy - radCells);
      const maxGy = Math.min(rows - 1, gy + radCells);

      for (let y = minGy; y <= maxGy; y++) {
        for (let x = minGx; x <= maxGx; x++) {
          if (Math.hypot((x - gx) * gridStep, (y - gy) * gridStep) <= requiredClearance) {
            const v0 = grid[getCellIdx(0, x, y)];
            const v1 = grid[getCellIdx(1, x, y)];
            if ((v0 !== 0 && v0 !== netId) || (v1 !== 0 && v1 !== netId)) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // 6. Multi-Net Ordering: Shortest signal nets first, long power/GND nets last
    const sortedNets: { netId: number; pads: PcbPad[]; isPower: boolean; span: number }[] = [];
    netPadsMap.forEach((nPads, nId) => {
      if (nPads.length < 2) return;
      const isPower = powerNetIds.has(nId);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nPads.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      const span = Math.hypot(maxX - minX, maxY - minY);
      sortedNets.push({ netId: nId, pads: nPads, isPower, span });
    });

    sortedNets.sort((a, b) => {
      if (a.isPower && !b.isPower) return 1;
      if (!a.isPower && b.isPower) return -1;
      return a.span - b.span;
    });

    // 7. Route each net using Multi-Target Tree A*
    const heap = new FastMinHeap();

    sortedNets.forEach(({ netId, pads: nPads, isPower }) => {
      const netName = rootToNetName.get(findSet(`${nPads[0].componentId}:${nPads[0].pinId}`)) || `NET_${netId}`;
      const isGnd =
        netName.toLowerCase().includes('gnd') ||
        nPads.some((p) => (p.pinId || '').toLowerCase().includes('gnd') || p.netId === 'GND');
      const trackWidth = isGnd ? 0.55 : isPower ? powerTrackWidth : defaultSignalWidth;

      const treePoints: { x: number; y: number; gx: number; gy: number; layer: number }[] = [];

      const p0 = nPads[0];
      const p0Gx = Math.round(p0.x / gridStep);
      const p0Gy = Math.round(p0.y / gridStep);
      const preferredLayer = isGnd ? 1 : p0.layer === 'bottom' ? 1 : 0;
      treePoints.push({ x: p0.x, y: p0.y, gx: p0Gx, gy: p0Gy, layer: preferredLayer });

      const remainingPads = new Set<PcbPad>(nPads.slice(1));

      while (remainingPads.size > 0) {
        let bestPad: PcbPad | null = null;
        let bestDist = Infinity;

        remainingPads.forEach((candidate) => {
          for (const tp of treePoints) {
            const d = Math.hypot(candidate.x - tp.x, candidate.y - tp.y);
            if (d < bestDist) {
              bestDist = d;
              bestPad = candidate;
            }
          }
        });

        if (!bestPad) break;
        const currentTargetPad: PcbPad = bestPad;
        remainingPads.delete(currentTargetPad);

        const targetGx = Math.round(currentTargetPad.x / gridStep);
        const targetGy = Math.round(currentTargetPad.y / gridStep);

        heap.clear();
        const gScores = new Map<number, number>();
        const cameFrom = new Map<number, { parentKey: number; gx: number; gy: number; layer: number }>();

        const startLayers = isGnd
          ? [1]
          : currentTargetPad.layer === 'bottom'
            ? [1]
            : currentTargetPad.layer === 'top'
              ? [0]
              : [0, 1];

        const targetCellKeys = new Set<number>();
        treePoints.forEach((tp) => {
          targetCellKeys.add((tp.layer << 20) | (tp.gy << 10) | tp.gx);
        });

        const heuristic = (gx: number, gy: number): number => {
          let minD = Infinity;
          for (const tp of treePoints) {
            const dx = Math.abs(gx - tp.gx);
            const dy = Math.abs(gy - tp.gy);
            const octile = Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
            if (octile < minD) minD = octile;
          }
          return minD * gridStep;
        };

        for (const l of startLayers) {
          const key = (l << 20) | (targetGy << 10) | targetGx;
          gScores.set(key, 0);
          heap.push(key, heuristic(targetGx, targetGy));
        }

        let foundEndKey: number | null = null;
        let iterations = 0;
        const maxIterations = 25000;

        while (heap.size > 0 && iterations++ < maxIterations) {
          const currentKey = heap.pop()!;
          const currentLayer = (currentKey >> 20) & 1;
          const currentGy = (currentKey >> 10) & 0x3ff;
          const currentGx = currentKey & 0x3ff;

          if (targetCellKeys.has(currentKey)) {
            foundEndKey = currentKey;
            break;
          }

          const currentG = gScores.get(currentKey) || 0;

          // 1. Move in 8 directions on same layer
          for (const dir of DIRS) {
            const nextGx = currentGx + dir.dx;
            const nextGy = currentGy + dir.dy;

            if (nextGx < marginCols || nextGx >= cols - marginCols || nextGy < marginRows || nextGy >= rows - marginRows) {
              continue;
            }

            const cellVal = grid[getCellIdx(currentLayer, nextGx, nextGy)];
            if (cellVal !== 0 && cellVal !== netId) {
              continue;
            }

            // Diagonal corner-crossing prevention
            if (dir.isDiag) {
              const adj1 = grid[getCellIdx(currentLayer, currentGx + dir.dx, currentGy)];
              const adj2 = grid[getCellIdx(currentLayer, currentGx, currentGy + dir.dy)];
              if ((adj1 !== 0 && adj1 !== netId) || (adj2 !== 0 && adj2 !== netId)) {
                continue;
              }
            }

            // Directional Layer Bias
            let biasMultiplier = 1.0;
            if (currentLayer === 0 && !dir.isHoriz) {
              biasMultiplier = 1.35;
            } else if (currentLayer === 1 && dir.isHoriz) {
              biasMultiplier = 1.35;
            }

            const stepCost = dir.cost * gridStep * biasMultiplier;
            const nextG = currentG + stepCost;
            const nextKey = (currentLayer << 20) | (nextGy << 10) | nextGx;

            if (!gScores.has(nextKey) || nextG < gScores.get(nextKey)!) {
              gScores.set(nextKey, nextG);
              cameFrom.set(nextKey, {
                parentKey: currentKey,
                gx: currentGx,
                gy: currentGy,
                layer: currentLayer,
              });
              heap.push(nextKey, nextG + heuristic(nextGx, nextGy));
            }
          }

          // 2. Layer Switch Via ((gx, gy, 0) <-> (gx, gy, 1))
          if (!isGnd && canPlaceViaAt(currentGx, currentGy, netId)) {
            const otherLayer = currentLayer === 0 ? 1 : 0;
            const viaCost = 10.0 * gridStep;
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
              heap.push(nextKey, nextG + heuristic(currentGx, currentGy));
            }
          }
        }

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

          rawPath.forEach((pt) => {
            treePoints.push({
              x: pt.gx * gridStep,
              y: pt.gy * gridStep,
              gx: pt.gx,
              gy: pt.gy,
              layer: pt.layer,
            });
          });

          commitRouteToGrid(rawPath, netId, trackWidth / 2 + clearanceMm);

          const endPtCell = rawPath[rawPath.length - 1];
          let treeEndPt = { x: endPtCell.gx * gridStep, y: endPtCell.gy * gridStep };
          for (const p of nPads) {
            if (p === currentTargetPad) continue;
            if (Math.hypot(p.x - treeEndPt.x, p.y - treeEndPt.y) <= gridStep * 1.5) {
              treeEndPt = { x: p.x, y: p.y };
              break;
            }
          }

          for (let ti = 0; ti < tracks.length; ti++) {
            const ot = tracks[ti];
            if (ot.netId === netName && pointToSegmentDist(treeEndPt, ot.from, ot.to) < 0.05) {
              const dFrom = Math.hypot(ot.from.x - treeEndPt.x, ot.from.y - treeEndPt.y);
              const dTo = Math.hypot(ot.to.x - treeEndPt.x, ot.to.y - treeEndPt.y);
              if (dFrom > 0.05 && dTo > 0.05) {
                tracks.splice(ti, 1);
                tracks.push(
                  {
                    id: `${ot.id}_s1`,
                    layer: ot.layer,
                    from: ot.from,
                    to: treeEndPt,
                    widthMm: ot.widthMm,
                    netId: ot.netId,
                  },
                  {
                    id: `${ot.id}_s2`,
                    layer: ot.layer,
                    from: treeEndPt,
                    to: ot.to,
                    widthMm: ot.widthMm,
                    netId: ot.netId,
                  }
                );
                break;
              }
            }
          }

          emitRouteSegmentsAndVias(
            rawPath,
            { x: currentTargetPad.x, y: currentTargetPad.y },
            treeEndPt,
            trackWidth,
            netName,
            tracks,
            vias,
            () => viaCounter++
          );
        } else {
          // Fallback: Chamfered 45 route to closest already-connected tree pad
          let bestConnectedPad: PcbPad = nPads[0];
          let bestD = Infinity;
          nPads.forEach((p) => {
            if (p !== currentTargetPad && !remainingPads.has(p)) {
              const d = Math.hypot(p.x - currentTargetPad.x, p.y - currentTargetPad.y);
              if (d < bestD) {
                bestD = d;
                bestConnectedPad = p;
              }
            }
          });
          const waypoints = compute45RoutePoints(
            { x: currentTargetPad.x, y: currentTargetPad.y },
            { x: bestConnectedPad.x, y: bestConnectedPad.y }
          );
          const chosenLayer: 'top_copper' | 'bottom_copper' = isGnd
            ? 'bottom_copper'
            : currentTargetPad.layer === 'bottom'
              ? 'bottom_copper'
              : 'top_copper';
          for (let i = 0; i < waypoints.length - 1; i++) {
            tracks.push({
              id: `trk_${netName}_fb_${chosenLayer}_${Date.now()}_${i}`,
              layer: chosenLayer,
              from: waypoints[i],
              to: waypoints[i + 1],
              widthMm: trackWidth,
              netId: netName,
            });
          }
        }
      }
    });

    return { tracks, vias };
  }
}

function emitRouteSegmentsAndVias(
  rawPath: { gx: number; gy: number; layer: number }[],
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  widthMm: number,
  netName: string,
  outTracks: PcbTrack[],
  outVias: PcbPad[],
  nextViaId: () => number
) {
  if (rawPath.length === 0) return;

  const gridStep = 0.635;

  if (rawPath.length === 1) {
    const layer = rawPath[0].layer === 0 ? 'top_copper' : 'bottom_copper';
    if (Math.hypot(startPoint.x - endPoint.x, startPoint.y - endPoint.y) > 0.05) {
      outTracks.push({
        id: `trk_${netName}_${layer}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        layer,
        from: startPoint,
        to: endPoint,
        widthMm,
        netId: netName,
      });
    }
    return;
  }

  const pointsWithLayer: { x: number; y: number; layer: number }[] = [];
  for (let i = 0; i < rawPath.length; i++) {
    if (i === 0) {
      pointsWithLayer.push({ x: startPoint.x, y: startPoint.y, layer: rawPath[0].layer });
    } else if (i === rawPath.length - 1) {
      pointsWithLayer.push({ x: endPoint.x, y: endPoint.y, layer: rawPath[i].layer });
    } else {
      pointsWithLayer.push({
        x: Math.round(rawPath[i].gx * gridStep * 100) / 100,
        y: Math.round(rawPath[i].gy * gridStep * 100) / 100,
        layer: rawPath[i].layer,
      });
    }
  }

  let currentSlice: { x: number; y: number }[] = [pointsWithLayer[0]];
  let currentLayer = pointsWithLayer[0].layer;

  for (let i = 1; i < pointsWithLayer.length; i++) {
    const pt = pointsWithLayer[i];
    if (pt.layer !== currentLayer) {
      const viaWorldPt = { x: pt.x, y: pt.y };
      const viaPad: PcbPad = {
        id: `via_${netName}_${nextViaId()}`,
        componentId: 'VIA',
        pinId: 'VIA',
        netId: netName,
        x: viaWorldPt.x,
        y: viaWorldPt.y,
        shape: 'round',
        diameterMm: 0.8,
        holeMm: 0.4,
        layer: 'all',
      };
      outVias.push(viaPad);

      currentSlice.push(viaWorldPt);
      emitSimplifiedSlice(
        currentSlice,
        currentLayer === 0 ? 'top_copper' : 'bottom_copper',
        widthMm,
        netName,
        outTracks
      );

      currentSlice = [viaWorldPt];
      currentLayer = pt.layer;
    } else {
      currentSlice.push({ x: pt.x, y: pt.y });
    }
  }

  if (currentSlice.length >= 2) {
    emitSimplifiedSlice(
      currentSlice,
      currentLayer === 0 ? 'top_copper' : 'bottom_copper',
      widthMm,
      netName,
      outTracks
    );
  }
}

function emitSimplifiedSlice(
  points: { x: number; y: number }[],
  layer: 'top_copper' | 'bottom_copper',
  widthMm: number,
  netName: string,
  outTracks: PcbTrack[]
) {
  if (points.length < 2) return;

  const deduped: { x: number; y: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.hypot(points[i].x - prev.x, points[i].y - prev.y) > 0.05) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length < 2) return;

  const simplified: { x: number; y: number }[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const pPrev = simplified[simplified.length - 1];
    const pCurr = deduped[i];
    const pNext = deduped[i + 1];

    const dx1 = pCurr.x - pPrev.x;
    const dy1 = pCurr.y - pPrev.y;
    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 0.001) {
      simplified.push(pCurr);
    }
  }
  simplified.push(deduped[deduped.length - 1]);

  for (let i = 0; i < simplified.length - 1; i++) {
    outTracks.push({
      id: `trk_${netName}_${layer}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      layer,
      from: simplified[i],
      to: simplified[i + 1],
      widthMm,
      netId: netName,
    });
  }
}

export function verifyPcbManufacturingIntegrity(pcb: PcbLayout): ManufacturingIntegrityResult {
  const errors: string[] = [];
  const stats: RoutingStats = {
    unroutedNets: 0,
    crossings: 0,
    padShorts: 0,
    orphanVias: 0,
    deadEndTracks: 0,
  };

  const tracks = pcb.tracks || [];
  const pads = pcb.pads || [];

  const netPadsMap = new Map<string, PcbPad[]>();
  pads.forEach((p) => {
    if (p.componentId === 'VIA' || p.id.startsWith('via_')) return;
    const n = p.netId;
    if (!n) return;
    if (!netPadsMap.has(n)) netPadsMap.set(n, []);
    netPadsMap.get(n)!.push(p);
  });

  netPadsMap.forEach((nPads, netId) => {
    if (nPads.length < 2) return;
    const netTracks = tracks.filter((t) => t.netId === netId);
    const netVias = pads.filter((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && p.netId === netId);

    const reachable = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: nPads[0].x, y: nPads[0].y }];
    const visitedNodes = new Set<string>();

    const nodeKey = (x: number, y: number) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const k = nodeKey(curr.x, curr.y);
      if (visitedNodes.has(k)) continue;
      visitedNodes.add(k);

      nPads.forEach((p) => {
        if (Math.hypot(p.x - curr.x, p.y - curr.y) <= (p.diameterMm || 1.8) / 2 + 0.35) {
          reachable.add(p.id);
        }
      });

      netTracks.forEach((t) => {
        if (Math.hypot(t.from.x - curr.x, t.from.y - curr.y) < 0.35) {
          queue.push(t.to);
        } else if (Math.hypot(t.to.x - curr.x, t.to.y - curr.y) < 0.35) {
          queue.push(t.from);
        } else if (pointToSegmentDist(curr, t.from, t.to) < 0.25) {
          queue.push(t.from);
          queue.push(t.to);
        }
      });

      netVias.forEach((v) => {
        if (Math.hypot(v.x - curr.x, v.y - curr.y) < 0.35) {
          netTracks.forEach((t) => {
            if (Math.hypot(t.from.x - v.x, t.from.y - v.y) < 0.35) queue.push(t.to);
            if (Math.hypot(t.to.x - v.x, t.to.y - v.y) < 0.35) queue.push(t.from);
          });
        }
      });
    }

    if (reachable.size < nPads.length) {
      stats.unroutedNets++;
      errors.push(`Net ${netId} has unrouted or broken connections (${reachable.size}/${nPads.length} reachable pads)`);
    }
  });

  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const t1 = tracks[i];
      const t2 = tracks[j];
      if (t1.layer === t2.layer && t1.netId && t2.netId && t1.netId !== t2.netId) {
        if (linesIntersect(t1.from, t1.to, t2.from, t2.to)) {
          stats.crossings++;
          errors.push(`Crossing short between ${t1.netId} and ${t2.netId} on ${t1.layer}`);
        }
      }
    }
  }

  tracks.forEach((t) => {
    pads.forEach((p) => {
      if (p.componentId === 'VIA' || p.id.startsWith('via_')) return;
      if (p.netId && t.netId && p.netId !== t.netId) {
        const dist = pointToSegmentDist(p, t.from, t.to);
        const minClearance = (p.diameterMm || 1.8) / 2 + (t.widthMm || 0.35) / 2 + 0.12;
        if (dist < minClearance) {
          stats.padShorts++;
          errors.push(
            `Track ${t.netId} cuts through unrelated pad ${p.componentId}:${p.pinId} (${p.netId}) - clearance ${dist.toFixed(2)}mm < ${minClearance.toFixed(2)}mm`
          );
        }
      }
    });
  });

  const vias = pads.filter((p) => (p.componentId === 'VIA' || p.id.startsWith('via_')) && !p.isManual && !p.id.includes('stitch'));
  vias.forEach((via) => {
    const hasTop = tracks.some(
      (t) =>
        t.layer === 'top_copper' &&
        (!via.netId || !t.netId || t.netId === via.netId) &&
        (Math.hypot(t.from.x - via.x, t.from.y - via.y) < 0.25 || Math.hypot(t.to.x - via.x, t.to.y - via.y) < 0.25)
    );
    const hasBottom = tracks.some(
      (t) =>
        t.layer === 'bottom_copper' &&
        (!via.netId || !t.netId || t.netId === via.netId) &&
        (Math.hypot(t.from.x - via.x, t.from.y - via.y) < 0.25 || Math.hypot(t.to.x - via.x, t.to.y - via.y) < 0.25)
    );

    if (!hasTop || !hasBottom) {
      stats.orphanVias++;
      errors.push(`Orphan via at (${via.x}, ${via.y}) lacks connection to both copper layers (Top: ${hasTop}, Bottom: ${hasBottom})`);
    }
  });

  tracks.forEach((t) => {
    if (t.isManual) return;
    const checkEndpoint = (pt: { x: number; y: number }) => {
      const nearPad = pads.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < ((p.diameterMm || 1.8) / 2 + 0.35));
      const nearVia = vias.some((v) => Math.hypot(v.x - pt.x, v.y - pt.y) < 0.25);
      const nearTrack = tracks.some(
        (ot) =>
          ot.id !== t.id &&
          ot.layer === t.layer &&
          (Math.hypot(ot.from.x - pt.x, ot.from.y - pt.y) < 0.25 ||
            Math.hypot(ot.to.x - pt.x, ot.to.y - pt.y) < 0.25 ||
            pointToSegmentDist(pt, ot.from, ot.to) < 0.25)
      );
      return nearPad || nearVia || nearTrack;
    };

    if (!checkEndpoint(t.from) || !checkEndpoint(t.to)) {
      stats.deadEndTracks++;
      errors.push(`Dead-end track ${t.id} on ${t.layer} terminates in empty space`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    stats,
  };
}
