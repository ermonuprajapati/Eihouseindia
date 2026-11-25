import { CircuitComponent, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import {
  START_X,
  PITCH_X,
  getTieGroupForHole as getTieGroupFromTopology,
} from './breadboard-topology';

export interface ResolvedSchematicWire {
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  color?: string;
}

/**
 * Returns the electrical tieGroup string for any breadboard hole ID.
 * Respects real solderless breadboard electrical rules:
 * - Rows A-E of column N on board B -> `${B}_tie_col_${N}_top` (isolated from F-J across center ravine)
 * - Rows F-J of column N on board B -> `${B}_tie_col_${N}_bottom`
 * - Power rails -> `${B}_tie_${rail}`
 */
export function getHoleTieGroup(holeId: string): string | null {
  if (!holeId || typeof holeId !== 'string') return null;

  // 1. Check existing topology helper
  const topTg = getTieGroupFromTopology(holeId);
  if (topTg) {
    // Normalize bottom rail tie group names
    if (topTg.includes('rail_bot_') || topTg.includes('rail_bottom_')) {
      const isPos = topTg.includes('pos');
      const prefix = topTg.startsWith('bb3_') ? 'bb3_' : topTg.startsWith('bb2_') ? 'bb2_' : 'bb_';
      return `${prefix}tie_rail_bottom_${isPos ? 'pos' : 'neg'}`;
    }
    return topTg;
  }

  // 2. Determine breadboard prefix (bb_, bb2_, bb3_)
  let prefix = 'bb_';
  let cleanId = holeId;
  if (holeId.startsWith('bb3_')) {
    prefix = 'bb3_';
    cleanId = holeId.slice(4);
  } else if (holeId.startsWith('bb2_')) {
    prefix = 'bb2_';
    cleanId = holeId.slice(4);
  } else if (holeId.startsWith('bb_')) {
    prefix = 'bb_';
    cleanId = holeId.slice(3);
  }

  // 3. Pattern match terminal columns: col_{N}_{Row} or hole_bb{N}_{Row}{Col}
  const colRowMatch = cleanId.match(/col_(\d+)_([A-Ja-j])/i);
  if (colRowMatch) {
    const col = parseInt(colRowMatch[1], 10);
    const row = colRowMatch[2].toUpperCase();
    const isTop = ['A', 'B', 'C', 'D', 'E'].includes(row);
    return `${prefix}tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
  }

  const legacyMatch = cleanId.match(/([a-ja-j])(\d+)/i);
  if (legacyMatch) {
    const row = legacyMatch[1].toUpperCase();
    const col = parseInt(legacyMatch[2], 10);
    const isTop = ['A', 'B', 'C', 'D', 'E'].includes(row);
    return `${prefix}tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
  }

  // 4. Pattern match power rails
  if (cleanId.includes('rail')) {
    const isTop = cleanId.includes('top');
    const isPos = cleanId.includes('pos') || cleanId.includes('+');
    const railName = `${isTop ? 'top' : 'bottom'}_${isPos ? 'pos' : 'neg'}`;
    return `${prefix}tie_rail_${railName}`;
  }

  return null;
}

interface ComponentWithPinHoles extends Component3D {
  pinHoles?: Record<string, string>;
}

interface WireWithHoles extends Wire3D {
  fromHole?: string;
  toHole?: string;
}

/**
 * Resolves the breadboard hole for a component's lead pin based on its 3D position and footprint.
 */
export function getComponentPinHole(comp: Component3D, pinId: string): string | null {
  if (!comp || !pinId) return null;

  // Direct pinHoles map check if explicitly assigned
  const customComp = comp as ComponentWithPinHoles;
  if (customComp.pinHoles) {
    const ph = customComp.pinHoles;
    if (ph[pinId]) return ph[pinId];
    if (ph[pinId.toLowerCase()]) return ph[pinId.toLowerCase()];
    if (pinId === 'a' && ph.anode) return ph.anode;
    if (pinId === 'k' && ph.cathode) return ph.cathode;
    if (pinId === 'anode' && ph.a) return ph.a;
    if (pinId === 'cathode' && ph.k) return ph.k;
    if (pinId === '1' && (ph.a || ph.anode)) return ph.a || ph.anode;
    if (pinId === '2' && (ph.k || ph.cathode)) return ph.k || ph.cathode;
  }

  // Non-breadboard components (microcontrollers & standalone power sources)
  if (
    comp.type === 'ARDUINO_UNO' ||
    comp.type === 'ARDUINO_MEGA' ||
    comp.type === 'BATTERY' ||
    comp.type === 'BATTERY_9V' ||
    comp.type === 'POTENTIOMETER' ||
    comp.id.toLowerCase().startsWith('uno') ||
    comp.id.toLowerCase().startsWith('ard') ||
    comp.id.toLowerCase().startsWith('bat')
  ) {
    return null;
  }

  const isBoard3 = comp.z3d !== undefined && comp.z3d < -90;
  const isBoard2 = comp.z3d !== undefined && comp.z3d < -30 && !isBoard3;
  const boardPrefix = isBoard3 ? 'bb3_' : isBoard2 ? 'bb2_' : 'bb_';
  const boardCenterZ = isBoard3 ? -120.0 : isBoard2 ? -60.0 : 0.0;

  const isDip =
    comp.type === 'TIMER_555' ||
    comp.type === 'DIP_IC' ||
    comp.type.includes('DIP') ||
    comp.type.includes('555') ||
    comp.type.includes('74HC') ||
    comp.type.includes('358') ||
    comp.type.includes('324') ||
    comp.type.includes('595') ||
    comp.type.includes('4017') ||
    comp.type.includes('2003') ||
    comp.type.includes('293');

  if (isDip) {
    const isDip16 =
      comp.type.includes('16') ||
      comp.type.includes('595') ||
      comp.type.includes('4017') ||
      comp.type.includes('2003') ||
      comp.type.includes('293');
    const isDip14 =
      !isDip16 && (comp.type.includes('14') || comp.type.includes('74HC') || comp.type.includes('324'));

    if (isDip16) {
      const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
      const pinNum = parseInt(pinId, 10);
      if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 16) {
        if (pinNum <= 8) {
          const col = Math.max(1, Math.min(63, centerCol + (pinNum - 4)));
          return `${boardPrefix}col_${col}_E`;
        } else {
          const col = Math.max(1, Math.min(63, centerCol + (13 - pinNum)));
          return `${boardPrefix}col_${col}_F`;
        }
      }
    } else if (isDip14) {
      const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
      const pinNum = parseInt(pinId, 10);
      if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 14) {
        if (pinNum <= 7) {
          const col = Math.max(1, Math.min(63, centerCol + (pinNum - 4)));
          return `${boardPrefix}col_${col}_E`;
        } else {
          const col = Math.max(1, Math.min(63, centerCol + (11 - pinNum)));
          return `${boardPrefix}col_${col}_F`;
        }
      }
    } else {
      const centerCol = Math.round((comp.x3d - START_X) / PITCH_X - 0.5) + 1;
      const pinNum = parseInt(pinId, 10);
      if (!isNaN(pinNum) && pinNum >= 1 && pinNum <= 8) {
        if (pinNum <= 4) {
          const col = Math.max(1, Math.min(63, centerCol - 1 + (pinNum - 1)));
          return `${boardPrefix}col_${col}_E`;
        } else {
          const col = Math.max(1, Math.min(63, centerCol - 1 + (8 - pinNum)));
          return `${boardPrefix}col_${col}_F`;
        }
      }
    }
  }

  const centerCol = Math.round((comp.x3d - START_X) / PITCH_X) + 1;
  const isTop = (comp.z3d ?? 0) <= boardCenterZ;
  const row = isTop ? 'C' : 'H';

  if (comp.type === 'RESISTOR') {
    const col = pinId === '1' ? centerCol - 2 : centerCol + 2;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
  }

  if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
    const isPin1 =
      pinId === '1' ||
      pinId === '+' ||
      pinId.toLowerCase().includes('pos') ||
      pinId.toLowerCase().includes('anode');
    const col = isPin1 ? centerCol - 1 : centerCol + 1;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
  }

  if (comp.type === 'LED') {
    const p = pinId.toLowerCase();
    const isAnode = p === 'anode' || p === 'a' || p === '1' || p === '+';
    const col = isAnode ? centerCol - 1 : centerCol + 1;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
  }

  if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
    const isAnode = pinId === '1' || pinId === 'anode' || pinId === 'a';
    const col = isAnode ? centerCol - 2 : centerCol + 2;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
  }

  if (
    comp.type === 'LED_RGB' ||
    comp.type === 'ACTUATOR_RGB_LED' ||
    comp.parameters?.model3d === 'led_rgb_5mm'
  ) {
    const p = (pinId || '').trim().toLowerCase();
    let colOffset = 0;
    if (p === 'r' || p === '1' || p === 'red') colOffset = -1;
    else if (p === 'c' || p === 'cc' || p === 'com' || p === 'gnd' || p === '-' || p === '2')
      colOffset = 0;
    else if (p === 'g' || p === '3' || p === 'green') colOffset = 1;
    else if (p === 'b' || p === '4' || p === 'blue') colOffset = 2;
    const col = centerCol + colOffset;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
  }

  // Fallback for 2-pin components
  const col = pinId === '1' || pinId.toLowerCase() === 'a' ? centerCol - 1 : centerCol + 1;
  return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${row}`;
}

/**
 * Resolves a 3D jumper wire to its real component-to-component electrical connections.
 * Builds an electrical Union-Find graph across breadboard tieGroups to support:
 * 1. Direct component-to-component connections
 * 2. Component-to-breadboard-hole connections
 * 3. Breadboard-to-breadboard jumper multi-hops
 */
export function resolve3DWireToSchematicConnections(
  w3d: Wire3D,
  allWires3d: Wire3D[],
  components3d: Component3D[],
  schematicComponents: CircuitComponent[]
): ResolvedSchematicWire[] {
  const parseEndpoint = (raw: unknown): { compId: string; pinId: string } | null => {
    if (!raw) return null;
    if (typeof raw === 'object' && raw !== null && 'compId' in raw && 'pinId' in raw) {
      const obj = raw as { compId: unknown; pinId: unknown };
      return { compId: String(obj.compId), pinId: String(obj.pinId) };
    }
    if (typeof raw === 'string') {
      if (raw.includes(':')) {
        const [c, p] = raw.split(':');
        return { compId: c, pinId: p };
      }
      return { compId: 'breadboard', pinId: raw };
    }
    return null;
  };

  const parsedFrom = parseEndpoint(w3d?.fromPin || (w3d as WireWithHoles)?.fromHole);
  const parsedTo = parseEndpoint(w3d?.toPin || (w3d as WireWithHoles)?.toHole);
  if (!parsedFrom || !parsedTo) return [];

  // Build a set of valid schematic component IDs
  const validCompIds = new Set(
    schematicComponents && schematicComponents.length > 0
      ? schematicComponents.map((c) => c.id)
      : components3d.map((c) => c.id)
  );

  // 1. Map every component pin to its breadboard tieGroup
  const pinsByTieGroup = new Map<string, Array<{ compId: string; pinId: string }>>();
  for (const comp3d of components3d) {
    if (!validCompIds.has(comp3d.id)) continue;

    // Check possible pin IDs
    const pinsToCheck: string[] = [];
    const customComp = comp3d as ComponentWithPinHoles;
    if (customComp.pinHoles) {
      for (const k of Object.keys(customComp.pinHoles)) {
        pinsToCheck.push(k);
      }
    }
    if (comp3d.type === 'LED' || comp3d.type === 'led') pinsToCheck.push('a', 'k', '1', '2', 'anode', 'cathode');
    else if (comp3d.type === 'TIMER_555' || comp3d.type.includes('DIP')) {
      for (let i = 1; i <= 16; i++) pinsToCheck.push(String(i));
    } else {
      pinsToCheck.push('1', '2', 'a', 'b', 'c', 'd', 'r', 'g', 'cc');
    }

    const seenPins = new Set<string>();
    for (const p of pinsToCheck) {
      const hole = getComponentPinHole(comp3d, p);
      if (!hole) continue;
      const tg = getHoleTieGroup(hole);
      if (!tg) continue;

      // Canonicalize pinId if component is in schematicComponents
      const schComp = schematicComponents?.find((c) => c.id === comp3d.id);
      let canonicalPinId = p;
      if (schComp?.pins && schComp.pins.length > 0) {
        const matchingPin = schComp.pins.find(
          (sp) => sp.id.toLowerCase() === p.toLowerCase() || sp.name?.toLowerCase() === p.toLowerCase()
        );
        if (matchingPin) {
          canonicalPinId = matchingPin.id;
        } else {
          // If not in schComp.pins, try to map 'a'/'k' or '1'/'2'
          if (p === 'anode' && schComp.pins.some((sp) => sp.id === 'a')) canonicalPinId = 'a';
          else if (p === 'cathode' && schComp.pins.some((sp) => sp.id === 'k')) canonicalPinId = 'k';
          else if (p === '1' && schComp.pins.some((sp) => sp.id === 'a')) canonicalPinId = 'a';
          else if (p === '2' && schComp.pins.some((sp) => sp.id === 'k')) canonicalPinId = 'k';
          else if (p === 'a' && schComp.pins.some((sp) => sp.id === '1')) canonicalPinId = '1';
          else if (p === 'k' && schComp.pins.some((sp) => sp.id === '2')) canonicalPinId = '2';
          else continue;
        }
      }

      if (seenPins.has(canonicalPinId)) continue;
      seenPins.add(canonicalPinId);

      const list = pinsByTieGroup.get(tg) || [];
      list.push({ compId: comp3d.id, pinId: canonicalPinId });
      pinsByTieGroup.set(tg, list);
    }
  }

  // 2. Build tieGroup adjacency graph using breadboard-to-breadboard jumper wires
  const tieGroupGraph = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    if (!tieGroupGraph.has(a)) tieGroupGraph.set(a, new Set());
    if (!tieGroupGraph.has(b)) tieGroupGraph.set(b, new Set());
    tieGroupGraph.get(a)!.add(b);
    tieGroupGraph.get(b)!.add(a);
  };

  const allWires = allWires3d || [w3d];
  for (const wire of allWires) {
    const wFrom = parseEndpoint(wire?.fromPin || (wire as WireWithHoles)?.fromHole);
    const wTo = parseEndpoint(wire?.toPin || (wire as WireWithHoles)?.toHole);
    if (!wFrom || !wTo) continue;
    const isFromBb = wFrom.compId === 'breadboard' || wFrom.compId.startsWith('breadboard');
    const isToBb = wTo.compId === 'breadboard' || wTo.compId.startsWith('breadboard');
    if (isFromBb && isToBb) {
      const tgA = getHoleTieGroup(wFrom.pinId);
      const tgB = getHoleTieGroup(wTo.pinId);
      if (tgA && tgB) addEdge(tgA, tgB);
    }
  }

  // Helper to find all tieGroups in the same connected component
  const getConnectedTieGroups = (startTg: string): Set<string> => {
    const visited = new Set<string>();
    const queue = [startTg];
    visited.add(startTg);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = tieGroupGraph.get(curr);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }
    return visited;
  };

  // 3. Resolve endpoint candidates
  const resolveEndpoint = (endpoint: { compId: string; pinId: string }): Array<{ compId: string; pinId: string }> => {
    const isBb = endpoint.compId === 'breadboard' || endpoint.compId.startsWith('breadboard');
    if (!isBb) {
      // Direct component endpoint (e.g. Arduino D13 or GND)
      return [{ compId: endpoint.compId, pinId: endpoint.pinId }];
    }

    const tg = getHoleTieGroup(endpoint.pinId);
    if (!tg) return [];

    const connectedTgs = getConnectedTieGroups(tg);
    const reachablePins: Array<{ compId: string; pinId: string }> = [];
    for (const group of connectedTgs) {
      const pins = pinsByTieGroup.get(group);
      if (pins) {
        reachablePins.push(...pins);
      }
    }
    return reachablePins;
  };

  const fromCandidates = resolveEndpoint(parsedFrom);
  const toCandidates = resolveEndpoint(parsedTo);

  if (fromCandidates.length === 0 || toCandidates.length === 0) {
    return [];
  }

  const results: ResolvedSchematicWire[] = [];
  const seenPairs = new Set<string>();

  for (const f of fromCandidates) {
    for (const t of toCandidates) {
      if (f.compId === t.compId && f.pinId === t.pinId) continue;

      const pairKey1 = `${f.compId}:${f.pinId}->${t.compId}:${t.pinId}`;
      const pairKey2 = `${t.compId}:${t.pinId}->${f.compId}:${f.pinId}`;
      if (seenPairs.has(pairKey1) || seenPairs.has(pairKey2)) continue;
      seenPairs.add(pairKey1);

      results.push({
        fromCompId: f.compId,
        fromPinId: f.pinId,
        toCompId: t.compId,
        toPinId: t.pinId,
        color: w3d.color,
      });
    }
  }

  return results;
}
