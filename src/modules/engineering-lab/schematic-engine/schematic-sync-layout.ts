import { CircuitComponent, CircuitWire, ComponentPin } from '../types';
import { getPinWorldCoord } from '../circuit-engine/schematic-erc';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface RoutedSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RoutedWirePath {
  wireId: string;
  fromCompId: string;
  toCompId: string;
  netName: string;
  points: { x: number; y: number }[];
  segments: RoutedSegment[];
}

export interface JunctionDot {
  x: number;
  y: number;
  netName: string;
}

export interface SchematicLayoutResult {
  components: CircuitComponent[];
  wires: CircuitWire[];
  routedWires: RoutedWirePath[];
  junctions: JunctionDot[];
  overlapsCount: number;
}

/**
 * Compute authentic bounding box for a component including pin stubs,
 * designator/value labels, and generous breathing margin.
 */
export function computeComponentBoundingBox(
  comp: CircuitComponent,
  useEditorPos = false,
  margin = 40
): BoundingBox {
  const posX = useEditorPos && comp.editorPosition ? comp.editorPosition.x : comp.x;
  const posY = useEditorPos && comp.editorPosition ? comp.editorPosition.y : comp.y;

  let localMinX = -35;
  let localMaxX = 35;
  let localMinY = -25;
  let localMaxY = 25;

  // Account for pins if present
  if (comp.pins && comp.pins.length > 0) {
    comp.pins.forEach((p) => {
      localMinX = Math.min(localMinX, p.x - 10);
      localMaxX = Math.max(localMaxX, p.x + 10);
      localMinY = Math.min(localMinY, p.y - 10);
      localMaxY = Math.max(localMaxY, p.y + 10);
    });
  }

  // Account for larger ICs and MCUs
  const typeUpper = comp.type.toUpperCase();
  if (typeUpper.includes('ARDUINO') || typeUpper.includes('ESP32') || typeUpper.includes('PICO')) {
    localMinX = Math.min(localMinX, -100);
    localMaxX = Math.max(localMaxX, 100);
    localMinY = Math.min(localMinY, -80);
    localMaxY = Math.max(localMaxY, 80);
    margin = Math.max(margin, 60);
  } else if (typeUpper.includes('555') || typeUpper.includes('IC_') || typeUpper.includes('OPAMP')) {
    localMinX = Math.min(localMinX, -60);
    localMaxX = Math.max(localMaxX, 60);
    localMinY = Math.min(localMinY, -50);
    localMaxY = Math.max(localMaxY, 50);
    margin = Math.max(margin, 50);
  }

  const minX = posX + localMinX - margin;
  const maxX = posX + localMaxX + margin;
  const minY = posY + localMinY - margin;
  const maxY = posY + localMaxY + margin;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if two AABB bounding boxes intersect.
 */
export function doBoxesOverlap(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(b1.maxX <= b2.minX || b1.minX >= b2.maxX || b1.maxY <= b2.minY || b1.minY >= b2.maxY);
}

/**
 * Count total number of overlapping component pairs.
 */
export function countComponentOverlaps(components: CircuitComponent[], useEditorPos = false): number {
  let overlaps = 0;
  const boxes = components.map((c) => computeComponentBoundingBox(c, useEditorPos, 15)); // strict overlap with 15px inner padding
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (doBoxesOverlap(boxes[i], boxes[j])) {
        overlaps++;
      }
    }
  }
  return overlaps;
}

/**
 * Categorize component for standard engineering signal-flow columns.
 */
function getSignalFlowColumn(comp: CircuitComponent): 'power' | 'control' | 'passive' {
  const type = comp.type.toUpperCase();
  const label = comp.label.toUpperCase();
  if (
    type.includes('VCC') ||
    type.includes('GND') ||
    type.includes('BATTERY') ||
    type.includes('POWER') ||
    type.includes('SOURCE') ||
    label.includes('BAT') ||
    label.includes('9V') ||
    label.includes('5V')
  ) {
    return 'power';
  }
  if (
    type.includes('555') ||
    type.includes('MCU') ||
    type.includes('ARDUINO') ||
    type.includes('ESP32') ||
    type.includes('PICO') ||
    type.includes('IC_') ||
    type.includes('OPAMP') ||
    type.includes('LOGIC') ||
    type.includes('GATE') ||
    type.includes('TRANSISTOR')
  ) {
    return 'control';
  }
  return 'passive';
}

/**
 * Pure 3-Way Collision-Free Auto-Placement Engine:
 * Places all components in clean, non-overlapping grid positions following
 * standard engineering signal flow (Power -> Control -> Passives/Outputs).
 */
export function autoLayoutCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[],
  gridStep = 20
): { components: CircuitComponent[]; wires: CircuitWire[] } {
  if (components.length === 0) return { components, wires };

  const powerComps: CircuitComponent[] = [];
  const controlComps: CircuitComponent[] = [];
  const passiveComps: CircuitComponent[] = [];

  components.forEach((c) => {
    const col = getSignalFlowColumn(c);
    if (col === 'power') powerComps.push(c);
    else if (col === 'control') controlComps.push(c);
    else passiveComps.push(c);
  });

  const placedComponents: CircuitComponent[] = [];
  const occupiedBoxes: BoundingBox[] = [];

  const tryPlaceAt = (comp: CircuitComponent, targetX: number, targetY: number): { x: number; y: number } => {
    let curX = Math.round(targetX / gridStep) * gridStep;
    let curY = Math.round(targetY / gridStep) * gridStep;
    let attempts = 0;
    const maxAttempts = 200;

    while (attempts < maxAttempts) {
      const candidate: CircuitComponent = {
        ...comp,
        x: curX,
        y: curY,
        editorPosition: { x: curX, y: curY },
      };
      const candidateBox = computeComponentBoundingBox(candidate, true, 20);
      const collides = occupiedBoxes.some((box) => doBoxesOverlap(candidateBox, box));

      if (!collides) {
        occupiedBoxes.push(candidateBox);
        return { x: curX, y: curY };
      }

      // Step downward in grid units
      curY += gridStep * 3;
      if (curY > 800) {
        curY = 120;
        curX += gridStep * 8; // step right
      }
      attempts++;
    }

    // Fallback safe position
    occupiedBoxes.push(computeComponentBoundingBox({ ...comp, x: curX, y: curY, editorPosition: { x: curX, y: curY } }, true, 20));
    return { x: curX, y: curY };
  };

  // Place Power/Sources on Left (X: 140..220)
  let powerY = 140;
  powerComps.forEach((c) => {
    const pos = tryPlaceAt(c, 140, powerY);
    placedComponents.push({
      ...c,
      x: pos.x,
      y: pos.y,
      editorPosition: pos,
    });
    powerY += 140;
  });

  // Place Control / ICs / MCUs in Center (X: 460..580)
  let controlY = 180;
  controlComps.forEach((c) => {
    const pos = tryPlaceAt(c, 460, controlY);
    placedComponents.push({
      ...c,
      x: pos.x,
      y: pos.y,
      editorPosition: pos,
    });
    controlY += 220;
  });

  // Place Passives, Sensors, Outputs on Right (X: 760..940)
  let passiveY = 140;
  let passiveX = 760;
  passiveComps.forEach((c, idx) => {
    if (idx > 0 && idx % 4 === 0) {
      passiveX += 180;
      passiveY = 140;
    }
    const pos = tryPlaceAt(c, passiveX, passiveY);
    placedComponents.push({
      ...c,
      x: pos.x,
      y: pos.y,
      editorPosition: pos,
    });
    passiveY += 120;
  });

  return { components: placedComponents, wires };
}

/**
 * Pure helper for converting client mouse coordinates to snapped/unsnapped sheet coordinates.
 */
export function clientToSheetCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width?: number; height?: number },
  pan: { x: number; y: number },
  zoom: number,
  gridStep = 20,
  snap = true
): { x: number; y: number } {
  const effectiveZoom = zoom || 1;
  const rawX = (clientX - rect.left - pan.x) / effectiveZoom;
  const rawY = (clientY - rect.top - pan.y) / effectiveZoom;
  return {
    x: snap ? Math.round(rawX / gridStep) * gridStep : Math.round(rawX),
    y: snap ? Math.round(rawY / gridStep) * gridStep : Math.round(rawY),
  };
}

/**
 * Places ONLY components that lack `editorPosition`, leaving all existing components
 * with their exact editorPosition/editorRotation AND preserving ALL components' simulation (x, y, rotation).
 */
export function placeOnlyUnplacedEditorComponents(
  components: CircuitComponent[],
  wires: CircuitWire[],
  gridStep = 20
): CircuitComponent[] {
  // If all components already have an editorPosition, return components 100% untouched
  if (components.every((c) => Boolean(c.editorPosition))) {
    return components;
  }

  const occupiedBoxes: BoundingBox[] = [];

  // Register existing editor positions as obstacles
  components.forEach((c) => {
    if (c.editorPosition) {
      occupiedBoxes.push(computeComponentBoundingBox(c, true, 20));
    }
  });

  const tryPlaceAt = (comp: CircuitComponent, targetX: number, targetY: number): { x: number; y: number } => {
    let curX = Math.round(targetX / gridStep) * gridStep;
    let curY = Math.round(targetY / gridStep) * gridStep;
    let attempts = 0;
    const maxAttempts = 200;

    while (attempts < maxAttempts) {
      const candidate: CircuitComponent = {
        ...comp,
        editorPosition: { x: curX, y: curY },
      };
      const candidateBox = computeComponentBoundingBox(candidate, true, 20);
      const collides = occupiedBoxes.some((box) => doBoxesOverlap(candidateBox, box));

      if (!collides) {
        occupiedBoxes.push(candidateBox);
        return { x: curX, y: curY };
      }

      curY += gridStep * 3;
      if (curY > 800) {
        curY = 120;
        curX += gridStep * 8;
      }
      attempts++;
    }

    occupiedBoxes.push(computeComponentBoundingBox({ ...comp, editorPosition: { x: curX, y: curY } }, true, 20));
    return { x: curX, y: curY };
  };

  return components.map((c) => {
    if (c.editorPosition) {
      return c; // Keep 100% untouched
    }

    const col = getSignalFlowColumn(c);
    const startX = col === 'power' ? 140 : col === 'control' ? 460 : 760;
    const startY = 160;
    const placedPos = tryPlaceAt(c, startX, startY);

    return {
      ...c,
      // CRITICAL: Preserve simulation x, y, rotation byte-for-byte!
      editorPosition: placedPos,
      editorRotation: c.editorRotation ?? c.rotation ?? 0,
    };
  });
}

/**
 * Determine pin exit outward normal vector.
 */
function getPinExitVector(pin: ComponentPin, comp: CircuitComponent): { dx: number; dy: number } {
  // Rotate local pin coordinates by component rotation
  const rad = ((comp.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const px = comp.mirrored ? -pin.x : pin.x;
  const py = pin.y;
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;

  // Major axis determines stub direction
  if (Math.abs(rx) >= Math.abs(ry)) {
    return { dx: rx >= 0 ? 1 : -1, dy: 0 };
  } else {
    return { dx: 0, dy: ry >= 0 ? 1 : -1 };
  }
}

/**
 * Check if a 2D line segment cuts through a component body box.
 */
export function segmentIntersectsBox(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  box: BoundingBox
): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  if (maxX <= box.minX || minX >= box.maxX) return false;
  if (maxY <= box.minY || minY >= box.maxY) return false;

  // Strictly horizontal segment
  if (p1.y === p2.y) {
    return p1.y > box.minY && p1.y < box.maxY && maxX > box.minX && minX < box.maxX;
  }

  // Strictly vertical segment
  if (p1.x === p2.x) {
    return p1.x > box.minX && p1.x < box.maxX && maxY > box.minY && minY < box.maxY;
  }

  return true;
}

/**
 * Count total number of wire segments cutting through unrelated component bodies.
 */
export function countWireThroughBodyCuts(
  components: CircuitComponent[],
  routedWires: RoutedWirePath[],
  useEditorPos = false
): number {
  let cuts = 0;
  const compBoxes = components.map((c) => ({
    compId: c.id,
    box: computeComponentBoundingBox(c, useEditorPos, 5),
  }));

  routedWires.forEach((rw) => {
    rw.segments.forEach((seg) => {
      compBoxes.forEach(({ compId, box }) => {
        // Wire can only touch its own connected components (fromCompId and toCompId)
        if (compId === rw.fromCompId || compId === rw.toCompId) return;

        if (segmentIntersectsBox({ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }, box)) {
          cuts++;
        }
      });
    });
  });

  return cuts;
}

/**
 * Professional 90° Manhattan Orthogonal Wire Routing Engine:
 * - Straight pin exit stub (>= 20px)
 * - 90° Manhattan turns only (horizontal & vertical lines)
 * - Obstacle avoidance around unrelated component bodies
 * - True 3-way/4-way junction dot detection
 */
export function routeOrthogonalWires(
  components: CircuitComponent[],
  wires: CircuitWire[],
  useEditorPos = false,
  gridStep = 20
): { routedWires: RoutedWirePath[]; junctions: JunctionDot[] } {
  const compMap = new Map<string, CircuitComponent>();
  components.forEach((c) => compMap.set(c.id, c));

  const compBoxes = components.map((c) => ({
    id: c.id,
    box: computeComponentBoundingBox(c, useEditorPos, 8),
  }));

  // Net equivalence via Disjoint Set (Union-Find)
  const pinParent = new Map<string, string>();
  const findRoot = (pinKey: string): string => {
    let root = pinKey;
    while (pinParent.has(root)) {
      root = pinParent.get(root)!;
    }
    let cur = pinKey;
    while (pinParent.has(cur)) {
      const nxt = pinParent.get(cur)!;
      pinParent.set(cur, root);
      cur = nxt;
    }
    return root;
  };
  const unionPins = (k1: string, k2: string) => {
    const r1 = findRoot(k1);
    const r2 = findRoot(k2);
    if (r1 !== r2) {
      pinParent.set(r1, r2);
    }
  };

  wires.forEach((w) => {
    unionPins(`${w.fromCompId}:${w.fromPinId}`, `${w.toCompId}:${w.toPinId}`);
  });

  const rootNetNameMap = new Map<string, string>();
  wires.forEach((w) => {
    if (w.netName) {
      const root = findRoot(`${w.fromCompId}:${w.fromPinId}`);
      if (!rootNetNameMap.has(root)) {
        rootNetNameMap.set(root, w.netName);
      }
    }
  });

  const getWireNetName = (w: CircuitWire): string => {
    const root = findRoot(`${w.fromCompId}:${w.fromPinId}`);
    return rootNetNameMap.get(root) || w.netName || `NET_${root.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  };

  const routedWires: RoutedWirePath[] = [];

  wires.forEach((wire, wireIdx) => {
    const fromComp = compMap.get(wire.fromCompId);
    const toComp = compMap.get(wire.toCompId);
    if (!fromComp || !toComp) return;

    const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId) || { id: wire.fromPinId, name: '', x: 0, y: 0, pinType: 'passive' as const };
    const toPin = toComp.pins.find((p) => p.id === wire.toPinId) || { id: wire.toPinId, name: '', x: 0, y: 0, pinType: 'passive' as const };

    const fromPos = useEditorPos && fromComp.editorPosition ? fromComp.editorPosition : { x: fromComp.x, y: fromComp.y };
    const toPos = useEditorPos && toComp.editorPosition ? toComp.editorPosition : { x: toComp.x, y: toComp.y };

    const p1 = getPinWorldCoord({ ...fromComp, x: fromPos.x, y: fromPos.y }, fromPin);
    const p2 = getPinWorldCoord({ ...toComp, x: toPos.x, y: toPos.y }, toPin);

    const wireNet = getWireNetName(wire);

    // STRICT RULE: If manual editor waypoints exist, render those EXACT points (NEVER auto-overwrite!)
    const manualWaypoints = wire.editorWaypoints || wire.manualWaypoints;
    if (manualWaypoints && manualWaypoints.length >= 2) {
      const points = [...manualWaypoints];
      // Snap ends to pins if close
      points[0] = p1;
      points[points.length - 1] = p2;

      const segments: RoutedSegment[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({
          x1: points[i].x,
          y1: points[i].y,
          x2: points[i + 1].x,
          y2: points[i + 1].y,
        });
      }

      routedWires.push({
        wireId: wire.id,
        fromCompId: wire.fromCompId,
        toCompId: wire.toCompId,
        netName: wireNet,
        points,
        segments,
      });
      return;
    }

    const fromExit = getPinExitVector(fromPin, fromComp);
    const toExit = getPinExitVector(toPin, toComp);

    const stubLen = gridStep;
    const stub1 = {
      x: p1.x + fromExit.dx * stubLen,
      y: p1.y + fromExit.dy * stubLen,
    };
    const stub2 = {
      x: p2.x + toExit.dx * stubLen,
      y: p2.y + toExit.dy * stubLen,
    };

    // Filter out boxes of the 2 connected components
    const obstacleBoxes = compBoxes.filter((b) => b.id !== wire.fromCompId && b.id !== wire.toCompId);

    const isPathClear = (points: { x: number; y: number }[]): boolean => {
      for (let i = 0; i < points.length - 1; i++) {
        const segA = points[i];
        const segB = points[i + 1];
        for (const obs of obstacleBoxes) {
          if (segmentIntersectsBox(segA, segB, obs.box)) {
            return false;
          }
        }
      }
      return true;
    };

    const box1 = compBoxes.find((b) => b.id === wire.fromCompId)?.box || computeComponentBoundingBox(fromComp, useEditorPos, 8);
    const box2 = compBoxes.find((b) => b.id === wire.toCompId)?.box || computeComponentBoundingBox(toComp, useEditorPos, 8);

    const trackOffset = (wireIdx % 5) * 4;
    const chanX1 = fromExit.dx >= 0 ? box1.maxX + 15 + trackOffset : box1.minX - 15 - trackOffset;
    const chanX2 = toExit.dx >= 0 ? box2.maxX + 15 + trackOffset : box2.minX - 15 - trackOffset;

    const topCorridorY = 50 + (wireIdx % 6) * 6;
    const bottomCorridorY = 860 + (wireIdx % 6) * 6;

    // Candidate Manhattan Paths
    const midX = Math.round(((stub1.x + stub2.x) / 2) / gridStep) * gridStep + trackOffset;
    const midY = Math.round(((stub1.y + stub2.y) / 2) / gridStep) * gridStep + trackOffset;

    const candidates: { x: number; y: number }[][] = [
      // Candidate 1: Z-Shape X-then-Y-then-X
      [p1, stub1, { x: midX, y: stub1.y }, { x: midX, y: stub2.y }, stub2, p2],
      // Candidate 2: Z-Shape Y-then-X-then-Y
      [p1, stub1, { x: stub1.x, y: midY }, { x: stub2.x, y: midY }, stub2, p2],
      // Candidate 3: L-Shape X then Y
      [p1, stub1, { x: stub2.x, y: stub1.y }, stub2, p2],
      // Candidate 4: L-Shape Y then X
      [p1, stub1, { x: stub1.x, y: stub2.y }, stub2, p2],
      // Candidate 5: Direct Inter-Column Channel Route
      [p1, stub1, { x: chanX1, y: stub1.y }, { x: chanX1, y: stub2.y }, stub2, p2],
      // Candidate 6: 2-Channel Route
      [p1, stub1, { x: chanX1, y: stub1.y }, { x: chanX1, y: midY }, { x: chanX2, y: midY }, { x: chanX2, y: stub2.y }, stub2, p2],
      // Candidate 7: Top Corridor Detour (above all components)
      [
        p1,
        stub1,
        { x: chanX1, y: stub1.y },
        { x: chanX1, y: topCorridorY },
        { x: chanX2, y: topCorridorY },
        { x: chanX2, y: stub2.y },
        stub2,
        p2,
      ],
      // Candidate 8: Bottom Corridor Detour (below all components)
      [
        p1,
        stub1,
        { x: chanX1, y: stub1.y },
        { x: chanX1, y: bottomCorridorY },
        { x: chanX2, y: bottomCorridorY },
        { x: chanX2, y: stub2.y },
        stub2,
        p2,
      ],
    ];

    // Pick first collision-free candidate
    let chosenPoints = candidates[candidates.length - 2]; // default to clean top corridor
    for (const cand of candidates) {
      if (isPathClear(cand)) {
        chosenPoints = cand;
        break;
      }
    }

    // Simplify collinear points
    const simplified: { x: number; y: number }[] = [];
    for (let i = 0; i < chosenPoints.length; i++) {
      const cur = chosenPoints[i];
      if (simplified.length >= 2) {
        const prev1 = simplified[simplified.length - 1];
        const prev2 = simplified[simplified.length - 2];
        const isCollinearX = Math.abs(prev2.x - prev1.x) < 0.1 && Math.abs(prev1.x - cur.x) < 0.1;
        const isCollinearY = Math.abs(prev2.y - prev1.y) < 0.1 && Math.abs(prev1.y - cur.y) < 0.1;
        if (isCollinearX || isCollinearY) {
          simplified[simplified.length - 1] = cur;
          continue;
        }
      }
      simplified.push(cur);
    }

    // Build segments
    const segments: RoutedSegment[] = [];
    for (let i = 0; i < simplified.length - 1; i++) {
      segments.push({
        x1: simplified[i].x,
        y1: simplified[i].y,
        x2: simplified[i + 1].x,
        y2: simplified[i + 1].y,
      });
    }

    routedWires.push({
      wireId: wire.id,
      fromCompId: wire.fromCompId,
      toCompId: wire.toCompId,
      netName: wireNet,
      points: simplified,
      segments,
    });
  });

  // Accurate Electrical Junction Detection:
  // Detect where 3+ segments of the SAME net meet (T-junctions or branch intersections)
  const junctions: JunctionDot[] = [];
  const junctionKeySet = new Set<string>();

  // Group routed wires by netName
  const netWireMap = new Map<string, RoutedWirePath[]>();
  routedWires.forEach((rw) => {
    const list = netWireMap.get(rw.netName) || [];
    list.push(rw);
    netWireMap.set(rw.netName, list);
  });

  netWireMap.forEach((paths, netName) => {
    // Collect all unique segments in this net
    const allSegments: RoutedSegment[] = [];
    paths.forEach((p) => allSegments.push(...p.segments));

    // Endpoint count map for this net
    const endpointCount = new Map<string, { count: number; x: number; y: number }>();
    allSegments.forEach((seg) => {
      [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }].forEach((pt) => {
        const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
        const existing = endpointCount.get(key);
        if (existing) {
          existing.count++;
        } else {
          endpointCount.set(key, { count: 1, x: pt.x, y: pt.y });
        }
      });
    });

    // 1. Where 3+ endpoints meet in the same net
    endpointCount.forEach((entry, key) => {
      if (entry.count >= 3 && !junctionKeySet.has(key)) {
        junctionKeySet.add(key);
        junctions.push({ x: entry.x, y: entry.y, netName });
      }
    });

    // 2. T-Junctions where an endpoint of segA touches strictly inside segB of the SAME net
    allSegments.forEach((segA) => {
      const endsA = [{ x: segA.x1, y: segA.y1 }, { x: segA.x2, y: segA.y2 }];
      endsA.forEach((pt) => {
        allSegments.forEach((segB) => {
          if (segA === segB) return;
          const isHorizB = Math.abs(segB.y1 - segB.y2) < 0.5;
          const isVertB = Math.abs(segB.x1 - segB.x2) < 0.5;
          const minXB = Math.min(segB.x1, segB.x2);
          const maxXB = Math.max(segB.x1, segB.x2);
          const minYB = Math.min(segB.y1, segB.y2);
          const maxYB = Math.max(segB.y1, segB.y2);

          // Check if pt is strictly on interior of segB (not just at an end)
          if (isHorizB && Math.abs(pt.y - segB.y1) < 1.0 && pt.x > minXB + 1.0 && pt.x < maxXB - 1.0) {
            const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
            if (!junctionKeySet.has(key)) {
              junctionKeySet.add(key);
              junctions.push({ x: pt.x, y: pt.y, netName });
            }
          } else if (isVertB && Math.abs(pt.x - segB.x1) < 1.0 && pt.y > minYB + 1.0 && pt.y < maxYB - 1.0) {
            const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
            if (!junctionKeySet.has(key)) {
              junctionKeySet.add(key);
              junctions.push({ x: pt.x, y: pt.y, netName });
            }
          }
        });
      });
    });
  });

  return { routedWires, junctions };
}

/**
 * Master 3-Way Synchronizer:
 * Syncs circuit between 3D Studio, Schematic, and Schematic Editor.
 */
export function synchronizeCircuitViews(
  components: CircuitComponent[],
  wires: CircuitWire[],
  source: '3d-studio' | 'schematic' | 'schematic-editor'
): SchematicLayoutResult {
  // If components already have clean non-overlapping coordinates, preserve them
  let workingComps = [...components];
  const overlapCount = countComponentOverlaps(workingComps, source === 'schematic-editor');

  if (overlapCount > 0 || source === '3d-studio') {
    const layout = autoLayoutCircuit(workingComps, wires);
    workingComps = layout.components;
  }

  const { routedWires, junctions } = routeOrthogonalWires(workingComps, wires, true);

  return {
    components: workingComps,
    wires,
    routedWires,
    junctions,
    overlapsCount: countComponentOverlaps(workingComps, true),
  };
}
