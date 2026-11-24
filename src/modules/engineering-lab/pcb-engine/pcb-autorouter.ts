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
  private keys: Int32Array;
  private priorities: Float64Array;
  private capacity: number;
  public size: number = 0;

  constructor(initialCapacity: number = 131072) {
    this.capacity = initialCapacity;
    this.keys = new Int32Array(this.capacity);
    this.priorities = new Float64Array(this.capacity);
  }

  public clear(): void {
    this.size = 0;
  }

  public push(key: number, priority: number): void {
    if (this.size >= this.capacity) {
      this.capacity *= 2;
      const nextKeys = new Int32Array(this.capacity);
      nextKeys.set(this.keys);
      this.keys = nextKeys;

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

/**
 * Strict Octilinear Dogleg Router (strictly 0, 45, 90, 135 degrees)
 */
export function compute45RoutePoints(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return [from];
  if (Math.abs(dx) < 0.001 || Math.abs(dy) < 0.001) return [from, to];

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (Math.abs(absDx - absDy) < 0.001) return [from, to];

  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;
  const chamfer = Math.min(absDx, absDy);

  let midX = from.x;
  let midY = from.y;

  if (absDx >= absDy) {
    midX = from.x + (absDx - chamfer) * signX;
    midY = from.y;
  } else {
    midX = from.x;
    midY = from.y + (absDy - chamfer) * signY;
  }

  const points = [from];
  if (Math.hypot(midX - from.x, midY - from.y) > 0.02 && Math.hypot(to.x - midX, to.y - midY) > 0.02) {
    points.push({ x: Math.round(midX * 1000) / 1000, y: Math.round(midY * 1000) / 1000 });
  }
  points.push(to);
  return points;
}

/**
 * Deterministic 2-Layer Grid A* PCB Autorouter with Fast Typed-Array Multi-Source Search & Rip-Up
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
    const gridStep = options?.gridResolutionMm || 0.635;
    const defaultSignalWidth = options?.defaultSignalWidthMm || 0.35;
    const powerTrackWidth = options?.powerTrackWidthMm || 0.55;
    const clearanceMm = options?.clearanceMm || 0.20;
    const edgeMarginMm = 1.5;

    const cols = Math.ceil(boardWidthMm / gridStep) + 1;
    const rows = Math.ceil(boardHeightMm / gridStep) + 1;
    const layerCells = cols * rows;
    const totalCells = layerCells * 2;

    const getCellIdx = (layer: number, gx: number, gy: number) => layer * layerCells + gy * cols + gx;

    // Fast Typed-Array Memory for A* Search
    const gScores = new Float32Array(totalCells);
    const cameFrom = new Int32Array(totalCells);
    const closed = new Int32Array(totalCells);
    const settled = new Int32Array(totalCells);
    let searchToken = 0;

    const baseObstacles = new Int32Array(totalCells);

    // 1. Mark Board Margins
    const marginCols = Math.ceil(edgeMarginMm / gridStep);
    const marginRows = Math.ceil(edgeMarginMm / gridStep);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (gx < marginCols || gx >= cols - marginCols || gy < marginRows || gy >= rows - marginRows) {
          baseObstacles[getCellIdx(0, gx, gy)] = -1;
          baseObstacles[getCellIdx(1, gx, gy)] = -1;
        }
      }
    }

    // 2. Mark M3 Mounting Holes
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
            baseObstacles[getCellIdx(0, gx, gy)] = -1;
            baseObstacles[getCellIdx(1, gx, gy)] = -1;
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

    // Union explicit netId pads (e.g. GND, VCC)
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

    // Identify Power & GND Nets
    const powerNetIds = new Set<number>();
    const gndNetIds = new Set<number>();
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad);
      if (!nId) return;
      const pinName = (pad.pinId || '').toLowerCase();
      const netName = (pad.netId || '').toLowerCase();
      const isGnd =
        pinName.includes('gnd') ||
        pinName.includes('vss') ||
        netName.includes('gnd') ||
        pad.pinId === 'n';
      const isPwr =
        pinName.includes('vcc') ||
        pinName.includes('vdd') ||
        pinName.includes('+5v') ||
        pinName.includes('+9v') ||
        pinName.includes('bat') ||
        netName.includes('vcc');

      if (isGnd) {
        gndNetIds.add(nId);
        powerNetIds.add(nId);
      } else if (isPwr) {
        powerNetIds.add(nId);
      }
    });

    // 4. Populate Base Obstacle Grid with All Component Pads (2-Phase to Prevent Overlap Pin Traps)
    const maxTrackWidth = Math.max(defaultSignalWidth, powerTrackWidth);

    // Phase 4A: Mark each pad's own copper radius with its net ID
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad) || 0;
      const padRadius = (pad.diameterMm || 1.8) / 2;
      const minGx = Math.max(0, Math.floor((pad.x - padRadius) / gridStep));
      const maxGx = Math.min(cols - 1, Math.ceil((pad.x + padRadius) / gridStep));
      const minGy = Math.max(0, Math.floor((pad.y - padRadius) / gridStep));
      const maxGy = Math.min(rows - 1, Math.ceil((pad.y + padRadius) / gridStep));
      const isTh = pad.layer === 'all' || (pad.holeMm ?? 0) > 0;
      const layers = isTh ? [0, 1] : pad.layer === 'bottom' ? [1] : [0];

      for (const l of layers) {
        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            if (Math.hypot(gx * gridStep - pad.x, gy * gridStep - pad.y) <= padRadius + 0.05) {
              const idx = getCellIdx(l, gx, gy);
              if (baseObstacles[idx] !== -1) {
                baseObstacles[idx] = nId;
              }
            }
          }
        }
      }
    });

    // Phase 4B: Mark pad keepouts without overwriting neighbor copper disks
    pads.forEach((pad) => {
      const nId = padNetMap.get(pad) || 0;
      const padRadius = (pad.diameterMm || 1.8) / 2;
      const keepoutR = padRadius + maxTrackWidth / 2 + 0.14;
      const minGx = Math.max(0, Math.floor((pad.x - keepoutR) / gridStep));
      const maxGx = Math.min(cols - 1, Math.ceil((pad.x + keepoutR) / gridStep));
      const minGy = Math.max(0, Math.floor((pad.y - keepoutR) / gridStep));
      const maxGy = Math.min(rows - 1, Math.ceil((pad.y + keepoutR) / gridStep));
      const isTh = pad.layer === 'all' || (pad.holeMm ?? 0) > 0;
      const layers = isTh ? [0, 1] : pad.layer === 'bottom' ? [1] : [0];

      for (const l of layers) {
        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            const dist = Math.hypot(gx * gridStep - pad.x, gy * gridStep - pad.y);
            if (dist <= keepoutR) {
              const idx = getCellIdx(l, gx, gy);
              if (baseObstacles[idx] === 0) {
                baseObstacles[idx] = nId === 0 ? -1 : nId;
              } else if (baseObstacles[idx] > 0 && baseObstacles[idx] !== nId && dist > padRadius) {
                baseObstacles[idx] = -1;
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

    // 5. Direction vectors: 8 octilinear directions
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

    const heap = new FastMinHeap();
    const grid = new Int32Array(totalCells);

    // Initial Net Ordering: Shortest signal nets first, Power/GND nets last
    const netOrder: { netId: number; pads: PcbPad[]; isPower: boolean; isGnd: boolean; span: number }[] = [];
    netPadsMap.forEach((nPads, nId) => {
      if (nPads.length < 2) return;
      const isGnd = gndNetIds.has(nId);
      const isPower = powerNetIds.has(nId);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nPads.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      const span = Math.hypot(maxX - minX, maxY - minY);
      netOrder.push({ netId: nId, pads: nPads, isPower, isGnd, span });
    });

    netOrder.sort((a, b) => {
      if (a.isGnd && !b.isGnd) return 1;
      if (!a.isGnd && b.isGnd) return -1;
      if (a.isPower && !b.isPower) return 1;
      if (!a.isPower && b.isPower) return -1;
      return a.span - b.span;
    });

    const maxPasses = options?.maxRipUpPasses || 6;
    let finalTracks: PcbTrack[] = [];
    let finalVias: PcbPad[] = [];
    let bestUnroutedCount = Infinity;

    // Precompute forbidden cells for via placement
    const viaForbidden = new Uint8Array(cols * rows);
    const viaOuterR = 0.4;
    const requiredViaClearance = viaOuterR + clearanceMm;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const wx = gx * gridStep;
        const wy = gy * gridStep;
        if (
          wx < edgeMarginMm + requiredViaClearance ||
          wx > boardWidthMm - edgeMarginMm - requiredViaClearance ||
          wy < edgeMarginMm + requiredViaClearance ||
          wy > boardHeightMm - edgeMarginMm - requiredViaClearance
        ) {
          viaForbidden[gy * cols + gx] = 1;
          continue;
        }

        for (const h of mHoles) {
          const hx = h.xMm ?? 5.0;
          const hy = h.yMm ?? 5.0;
          const hr = (h.outerMm || 6.0) / 2;
          if (Math.hypot(wx - hx, wy - hy) < hr + requiredViaClearance + 0.25) {
            viaForbidden[gy * cols + gx] = 1;
            break;
          }
        }
        if (viaForbidden[gy * cols + gx] === 1) continue;

        for (const pad of pads) {
          const padR = (pad.diameterMm || 1.8) / 2;
          if (Math.hypot(wx - pad.x, wy - pad.y) < padR + viaOuterR + 0.25) {
            viaForbidden[gy * cols + gx] = 1;
            break;
          }
        }
      }
    }

    // Helper: Check if a via can be placed at (gx, gy)
    const canPlaceViaAt = (gx: number, gy: number, netId: number): boolean => {
      if (viaForbidden[gy * cols + gx] === 1) return false;
      const rad = 1;
      const minX = Math.max(0, gx - rad);
      const maxX = Math.min(cols - 1, gx + rad);
      const minY = Math.max(0, gy - rad);
      const maxY = Math.min(rows - 1, gy + rad);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const v0 = grid[getCellIdx(0, x, y)];
          const v1 = grid[getCellIdx(1, x, y)];
          if ((v0 !== 0 && v0 !== netId) || (v1 !== 0 && v1 !== netId)) {
            return false;
          }
        }
      }
      return true;
    };

    // Helper: Mark route on obstacle grid with clearance
    const commitRouteToGrid = (
      points: { gx: number; gy: number; layer: number }[],
      netId: number,
      traceRadiusMm: number
    ) => {
      const requiredClearance = Math.max(traceRadiusMm, maxTrackWidth / 2 + defaultSignalWidth / 2 + 0.16);
      const radCells = Math.max(1, Math.ceil(requiredClearance / gridStep));
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const isVia =
          (i > 0 && points[i - 1].layer !== pt.layer) ||
          (i < points.length - 1 && points[i + 1].layer !== pt.layer);
        const layersToMark = isVia ? [0, 1] : [pt.layer];

        const minGx = Math.max(0, pt.gx - radCells);
        const maxGx = Math.min(cols - 1, pt.gx + radCells);
        const minGy = Math.max(0, pt.gy - radCells);
        const maxGy = Math.min(rows - 1, pt.gy + radCells);

        for (const l of layersToMark) {
          for (let gy = minGy; gy <= maxGy; gy++) {
            for (let gx = minGx; gx <= maxGx; gx++) {
              if (Math.hypot((gx - pt.gx) * gridStep, (gy - pt.gy) * gridStep) <= requiredClearance) {
                const idx = getCellIdx(l, gx, gy);
                if (grid[idx] === 0) {
                  grid[idx] = netId;
                }
              }
            }
          }
        }
        if (isVia) {
          viaForbidden[pt.gy * cols + pt.gx] = 1;
        }
      }
    };

    // 6. RIP-UP & RE-ROUTE PASSES
    for (let pass = 0; pass < maxPasses; pass++) {
      grid.set(baseObstacles);
      const tracks: PcbTrack[] = [];
      const vias: PcbPad[] = [];
      let viaCounter = 1;
      const failedNetIds = new Set<number>();

      for (const { netId, pads: nPads, isPower, isGnd } of netOrder) {
        const netName = rootToNetName.get(findSet(`${nPads[0].componentId}:${nPads[0].pinId}`)) || `NET_${netId}`;
        const trackWidth = isGnd ? 0.55 : isPower ? powerTrackWidth : defaultSignalWidth;

        // Tree of already connected nodes for this net
        const treeNodes: { x: number; y: number; gx: number; gy: number; layer: number; pad?: PcbPad }[] = [];

        const p0 = nPads[0];
        const p0Gx = Math.round(p0.x / gridStep);
        const p0Gy = Math.round(p0.y / gridStep);
        const p0IsTh = p0.layer === 'all' || (p0.holeMm ?? 0) > 0;
        const p0Layers = p0IsTh ? [0, 1] : p0.layer === 'bottom' ? [1] : [0];
        const p0R = (p0.diameterMm || 1.8) / 2;

        p0Layers.forEach((l) => {
          treeNodes.push({ x: p0.x, y: p0.y, gx: p0Gx, gy: p0Gy, layer: l, pad: p0 });
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const gx = p0Gx + dx;
              const gy = p0Gy + dy;
              if (gx >= marginCols && gx < cols - marginCols && gy >= marginRows && gy < rows - marginRows) {
                if (Math.hypot(gx * gridStep - p0.x, gy * gridStep - p0.y) <= p0R + 0.05) {
                  treeNodes.push({ x: gx * gridStep, y: gy * gridStep, gx, gy, layer: l, pad: p0 });
                }
              }
            }
          }
        });

        const remainingPads = new Set<PcbPad>(nPads.slice(1));
        let netSuccessfullyRouted = true;

        while (remainingPads.size > 0) {
          // Select closest remaining pad to the current tree
          let bestPad: PcbPad | null = null;
          let bestDist = Infinity;

          remainingPads.forEach((candidate) => {
            for (const tn of treeNodes) {
              const d = Math.hypot(candidate.x - tn.x, candidate.y - tn.y);
              if (d < bestDist) {
                bestDist = d;
                bestPad = candidate;
              }
            }
          });

          if (!bestPad) break;
          const targetPad: PcbPad = bestPad;
          remainingPads.delete(targetPad);

          const targetGx = Math.round(targetPad.x / gridStep);
          const targetGy = Math.round(targetPad.y / gridStep);
          const targetIsTh = targetPad.layer === 'all' || (targetPad.holeMm ?? 0) > 0;
          const targetLayers = new Set<number>(
            targetIsTh
              ? [0, 1]
              : targetPad.layer === 'bottom'
                ? [1]
                : [0]
          );

          // Fast Multi-Source A*: Start from ALL nodes in the existing tree towards targetPad
          heap.clear();
          searchToken++;

          const getHeuristic = (gx: number, gy: number): number => {
            const dx = Math.abs(gx - targetGx);
            const dy = Math.abs(gy - targetGy);
            return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * gridStep;
          };

          for (const tn of treeNodes) {
            const idx = getCellIdx(tn.layer, tn.gx, tn.gy);
            gScores[idx] = 0;
            closed[idx] = searchToken;
            cameFrom[idx] = -1; // Root node in cameFrom
            const key = (tn.layer << 20) | (tn.gy << 10) | tn.gx;
            heap.push(key, getHeuristic(tn.gx, tn.gy));
          }

          let foundEndIdx: number | null = null;
          let iterations = 0;
          const maxIterations = Math.max(120000, cols * rows * 4);

          while (heap.size > 0 && iterations++ < maxIterations) {
            const currentKey = heap.pop()!;
            const currentLayer = (currentKey >> 20) & 1;
            const currentGy = (currentKey >> 10) & 0x3ff;
            const currentGx = currentKey & 0x3ff;
            const currentIdx = getCellIdx(currentLayer, currentGx, currentGy);

            if (settled[currentIdx] === searchToken) continue;
            settled[currentIdx] = searchToken;

            // Reached target pad's cell or copper disk
            const distToTarget = Math.hypot(currentGx * gridStep - targetPad.x, currentGy * gridStep - targetPad.y);
            const targetPadR = (targetPad.diameterMm || 1.8) / 2;
            if (
              (distToTarget <= Math.max(gridStep * 0.75, targetPadR - 0.05) ||
                (currentGx === targetGx && currentGy === targetGy)) &&
              targetLayers.has(currentLayer)
            ) {
              foundEndIdx = currentIdx;
              break;
            }

            const currentG = gScores[currentIdx];

            // 1. Move in 8 octilinear directions on same layer
            for (const dir of DIRS) {
              const nextGx = currentGx + dir.dx;
              const nextGy = currentGy + dir.dy;

              if (nextGx < marginCols || nextGx >= cols - marginCols || nextGy < marginRows || nextGy >= rows - marginRows) {
                continue;
              }

              const nextIdx = getCellIdx(currentLayer, nextGx, nextGy);
              if (settled[nextIdx] === searchToken) continue;

              const cellVal = grid[nextIdx];
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

              // Directional Layer Bias: horizontal on top (layer 0), vertical on bottom (layer 1)
              let biasMultiplier = 1.0;
              if (currentLayer === 0 && !dir.isHoriz) {
                biasMultiplier = 1.25;
              } else if (currentLayer === 1 && dir.isHoriz) {
                biasMultiplier = 1.25;
              }

              const stepCost = dir.cost * gridStep * biasMultiplier;
              const nextG = currentG + stepCost;

              if (closed[nextIdx] !== searchToken || nextG < gScores[nextIdx]) {
                gScores[nextIdx] = nextG;
                closed[nextIdx] = searchToken;
                cameFrom[nextIdx] = currentIdx;
                const nextKey = (currentLayer << 20) | (nextGy << 10) | nextGx;
                heap.push(nextKey, nextG + getHeuristic(nextGx, nextGy));
              }
            }

            // 2. Layer Switch Via
            if (canPlaceViaAt(currentGx, currentGy, netId)) {
              const otherLayer = currentLayer === 0 ? 1 : 0;
              const otherIdx = getCellIdx(otherLayer, currentGx, currentGy);
              if (settled[otherIdx] !== searchToken) {
                const viaCost = (isGnd ? 2.5 : 6.0) * gridStep;
                const nextG = currentG + viaCost;

                if (closed[otherIdx] !== searchToken || nextG < gScores[otherIdx]) {
                  gScores[otherIdx] = nextG;
                  closed[otherIdx] = searchToken;
                  cameFrom[otherIdx] = currentIdx;
                  const nextKey = (otherLayer << 20) | (currentGy << 10) | currentGx;
                  heap.push(nextKey, nextG + getHeuristic(currentGx, currentGy));
                }
              }
            }
          }

          if (foundEndIdx !== null) {
            // Reconstruct path from target back to tree start
            const pathCells: { gx: number; gy: number; layer: number }[] = [];
            let currIdx: number = foundEndIdx;

            while (currIdx !== -1) {
              const l = currIdx < layerCells ? 0 : 1;
              const rem = currIdx - l * layerCells;
              const gy = Math.floor(rem / cols);
              const gx = rem % cols;
              pathCells.push({ gx, gy, layer: l });
              currIdx = cameFrom[currIdx];
            }

            pathCells.reverse(); // Now ordered: [treeStart, ..., targetEnd]

            const startCell = pathCells[0];
            const startCellWorld = {
              x: Math.round(startCell.gx * gridStep * 1000) / 1000,
              y: Math.round(startCell.gy * gridStep * 1000) / 1000,
            };

            const matchedNode = treeNodes.find(
              (tn) => tn.layer === startCell.layer && tn.gx === startCell.gx && tn.gy === startCell.gy
            );
            const isPadBranch = !!matchedNode?.pad;
            const treeStartPoint = isPadBranch && matchedNode?.pad
              ? { x: matchedNode.pad.x, y: matchedNode.pad.y }
              : startCellWorld;

            // Add new path cells to tree
            pathCells.forEach((pt) => {
              treeNodes.push({
                x: pt.gx * gridStep,
                y: pt.gy * gridStep,
                gx: pt.gx,
                gy: pt.gy,
                layer: pt.layer,
                pad: undefined,
              });
            });

            // If target pad is through-hole, register opposite layer as tree node as well
            if (targetIsTh) {
              const oppLayer = pathCells[pathCells.length - 1].layer === 0 ? 1 : 0;
              treeNodes.push({
                x: targetPad.x,
                y: targetPad.y,
                gx: targetGx,
                gy: targetGy,
                layer: oppLayer,
                pad: targetPad,
              });
            }

            commitRouteToGrid(pathCells, netId, trackWidth / 2 + clearanceMm);

            emitStrictOctilinearRoute(
              pathCells,
              treeStartPoint,
              { x: targetPad.x, y: targetPad.y },
              trackWidth,
              netName,
              tracks,
              vias,
              () => viaCounter++,
              isPadBranch
            );
          } else {
            console.log(`[ROUTE-FAIL] Net ${netName} (pass ${pass}) target=${targetPad.componentId}:${targetPad.pinId} at (${targetPad.x},${targetPad.y}) heapSize=${heap.size} iter=${iterations}/${maxIterations}`);
            netSuccessfullyRouted = false;
            failedNetIds.add(netId);
            break;
          }
        }

        if (!netSuccessfullyRouted) {
          failedNetIds.add(netId);
        }
      }

      if (failedNetIds.size === 0) {
        finalTracks = tracks;
        finalVias = vias;
        break;
      }

      if (failedNetIds.size < bestUnroutedCount) {
        bestUnroutedCount = failedNetIds.size;
        finalTracks = tracks;
        finalVias = vias;
      }

      // Re-order nets for next pass: route failed nets FIRST
      netOrder.sort((a, b) => {
        const aFailed = failedNetIds.has(a.netId);
        const bFailed = failedNetIds.has(b.netId);
        if (aFailed && !bFailed) return -1;
        if (!aFailed && bFailed) return 1;
        return a.span - b.span;
      });
    }

    return { tracks: finalTracks, vias: finalVias };
  }
}

function splitTracksAtPoint(
  tracks: PcbTrack[],
  pt: { x: number; y: number },
  layer: 'top_copper' | 'bottom_copper',
  netId: string
) {
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (t.layer !== layer || t.netId !== netId) continue;
    const dFrom = Math.hypot(t.from.x - pt.x, t.from.y - pt.y);
    const dTo = Math.hypot(t.to.x - pt.x, t.to.y - pt.y);
    if (dFrom > 0.05 && dTo > 0.05) {
      const dx = t.to.x - t.from.x;
      const dy = t.to.y - t.from.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const u = ((pt.x - t.from.x) * dx + (pt.y - t.from.y) * dy) / lenSq;
        if (u > 0.01 && u < 0.99) {
          const projX = Math.round((t.from.x + u * dx) * 1000) / 1000;
          const projY = Math.round((t.from.y + u * dy) * 1000) / 1000;
          if (Math.hypot(pt.x - projX, pt.y - projY) < 0.02) {
            const t1: PcbTrack = {
              ...t,
              id: `${t.id}_s1`,
              to: { x: projX, y: projY },
            };
            const t2: PcbTrack = {
              ...t,
              id: `${t.id}_s2`,
              from: { x: projX, y: projY },
            };
            tracks.splice(i, 1, t1, t2);
            break;
          }
        }
      }
    }
  }
}

/**
 * Emits strictly octilinear track segments and through-hole vias
 */
function emitStrictOctilinearRoute(
  rawPath: { gx: number; gy: number; layer: number }[],
  padStartPoint: { x: number; y: number },
  padEndPoint: { x: number; y: number },
  widthMm: number,
  netName: string,
  outTracks: PcbTrack[],
  outVias: PcbPad[],
  nextViaId: () => number,
  isPadBranch: boolean = false
) {
  if (rawPath.length === 0) return;
  const gridStep = 0.635;

  const startLayerName: 'top_copper' | 'bottom_copper' = rawPath[0].layer === 0 ? 'top_copper' : 'bottom_copper';
  if (!isPadBranch) {
    splitTracksAtPoint(outTracks, padStartPoint, startLayerName, netName);
  }

  // 1. Simplify raw grid points using strict integer collinearity
  const simplifiedGrid: { gx: number; gy: number; layer: number }[] = [rawPath[0]];

  for (let i = 1; i < rawPath.length - 1; i++) {
    const prev = simplifiedGrid[simplifiedGrid.length - 1];
    const curr = rawPath[i];
    const next = rawPath[i + 1];

    if (prev.layer !== curr.layer || curr.layer !== next.layer) {
      simplifiedGrid.push(curr);
      continue;
    }

    const dx1 = curr.gx - prev.gx;
    const dy1 = curr.gy - prev.gy;
    const dx2 = next.gx - curr.gx;
    const dy2 = next.gy - curr.gy;

    const cross = dx1 * dy2 - dy1 * dx2;
    const sameDir = dx1 * dx2 >= 0 && dy1 * dy2 >= 0;

    if (cross !== 0 || !sameDir) {
      simplifiedGrid.push(curr);
    }
  }

  if (rawPath.length > 1) {
    simplifiedGrid.push(rawPath[rawPath.length - 1]);
  }

  // 2. Build world coordinate waypoints with strictly octilinear dogleg connections to pads
  const firstGrid = simplifiedGrid[0];
  const lastGrid = simplifiedGrid[simplifiedGrid.length - 1];
  const firstWorld = { x: firstGrid.gx * gridStep, y: firstGrid.gy * gridStep };
  const lastWorld = { x: lastGrid.gx * gridStep, y: lastGrid.gy * gridStep };

  const startDogleg = compute45RoutePoints(padStartPoint, firstWorld);
  const endDogleg = compute45RoutePoints(lastWorld, padEndPoint);

  const waypointsWithLayer: { x: number; y: number; layer: number }[] = [];

  for (let i = 0; i < startDogleg.length - 1; i++) {
    waypointsWithLayer.push({ x: startDogleg[i].x, y: startDogleg[i].y, layer: firstGrid.layer });
  }

  for (let i = 0; i < simplifiedGrid.length; i++) {
    const g = simplifiedGrid[i];
    waypointsWithLayer.push({
      x: Math.round(g.gx * gridStep * 1000) / 1000,
      y: Math.round(g.gy * gridStep * 1000) / 1000,
      layer: g.layer,
    });
  }

  for (let i = 1; i < endDogleg.length; i++) {
    waypointsWithLayer.push({ x: endDogleg[i].x, y: endDogleg[i].y, layer: lastGrid.layer });
  }

  // 3. Emit segments by layer, inserting vias at layer transitions
  let currentSlice: { x: number; y: number }[] = [waypointsWithLayer[0]];
  let currentLayer = waypointsWithLayer[0].layer;

  for (let i = 1; i < waypointsWithLayer.length; i++) {
    const pt = waypointsWithLayer[i];
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
      emitTracksForSlice(
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
    emitTracksForSlice(
      currentSlice,
      currentLayer === 0 ? 'top_copper' : 'bottom_copper',
      widthMm,
      netName,
      outTracks
    );
  }
}

function emitTracksForSlice(
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
    if (Math.hypot(points[i].x - prev.x, points[i].y - prev.y) > 0.01) {
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
    const sameDir = dx1 * dx2 >= -0.001 && dy1 * dy2 >= -0.001;

    if (Math.abs(cross) > 0.001 || !sameDir) {
      simplified.push(pCurr);
    }
  }
  simplified.push(deduped[deduped.length - 1]);

  for (let i = 0; i < simplified.length - 1; i++) {
    const from = simplified[i];
    const to = simplified[i + 1];
    if (Math.hypot(to.x - from.x, to.y - from.y) < 0.01) continue;

    outTracks.push({
      id: `trk_${netName}_${layer}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      layer,
      from,
      to,
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
