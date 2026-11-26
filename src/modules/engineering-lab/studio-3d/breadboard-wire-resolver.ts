import { CircuitComponent, CircuitWire, Component3D, Wire3D } from '@/modules/engineering-lab/types';
import {
  START_X,
  PITCH_X,
  getTieGroupForHole as getTieGroupFromTopology,
} from './breadboard-topology';
import {
  getCanonicalPinWorldPos,
  resolveShortestNetWire,
} from '@/components/engineering-lab/Panels/schematic-editor/canonical-geometry';

export interface ResolvedSchematicWire {
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  color?: string;
  tappedWireId?: string;
  junctionPoint?: { x: number; y: number };
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
  const colOnlyMatch = cleanId.match(/^col_(\d+)_(top|bottom)$/i);
  if (colOnlyMatch) {
    const col = parseInt(colOnlyMatch[1], 10);
    const isTop = colOnlyMatch[2].toLowerCase() === 'top';
    return `${prefix}tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
  }

  const colRowMatch = cleanId.match(/col_(\d+)_(?:(top|bottom)_)?([A-Ja-j])(?:$|_)/i);
  if (colRowMatch) {
    const col = parseInt(colRowMatch[1], 10);
    const row = colRowMatch[3].toUpperCase();
    const isTop = colRowMatch[2]
      ? colRowMatch[2].toLowerCase() === 'top'
      : ['A', 'B', 'C', 'D', 'E'].includes(row);
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
  const customComp = comp as ComponentWithPinHoles & { parameters?: { pinHoles?: Record<string, string> } };
  const ph = customComp.pinHoles || customComp.parameters?.pinHoles;
  if (ph) {
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
  const rotY = comp.rotY !== undefined ? (((Math.round(comp.rotY) % 360) + 360) % 360) : 0;

  if (comp.type === 'RESISTOR') {
    let colOffset = pinId === '1' ? -2 : 2;
    let rowLetter = row;
    if (rotY === 180) {
      colOffset = -colOffset;
    } else if (rotY === 90) {
      colOffset = 0;
      rowLetter = pinId === '1' ? 'E' : 'F';
    } else if (rotY === 270) {
      colOffset = 0;
      rowLetter = pinId === '1' ? 'F' : 'E';
    }
    const col = centerCol + colOffset;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
  }

  if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
    const isPin1 =
      pinId === '1' ||
      pinId === '+' ||
      pinId.toLowerCase().includes('pos') ||
      pinId.toLowerCase().includes('anode');
    let colOffset = isPin1 ? -1 : 1;
    let rowLetter = row;
    if (rotY === 180) {
      colOffset = -colOffset;
    } else if (rotY === 90) {
      colOffset = 0;
      rowLetter = isPin1 ? 'E' : 'F';
    } else if (rotY === 270) {
      colOffset = 0;
      rowLetter = isPin1 ? 'F' : 'E';
    }
    const col = centerCol + colOffset;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
  }

  if (comp.type === 'LED') {
    const p = pinId.toLowerCase();
    const isAnode = p === 'anode' || p === 'a' || p === '1' || p === '+';
    let colOffset = isAnode ? -1 : 1;
    let rowLetter = row;
    if (rotY === 180) {
      colOffset = -colOffset;
    } else if (rotY === 90) {
      colOffset = 0;
      rowLetter = isAnode ? 'E' : 'F';
    } else if (rotY === 270) {
      colOffset = 0;
      rowLetter = isAnode ? 'F' : 'E';
    }
    const col = centerCol + colOffset;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
  }

  if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
    const isAnode = pinId === '1' || pinId === 'anode' || pinId === 'a';
    let colOffset = isAnode ? -2 : 2;
    let rowLetter = row;
    if (rotY === 180) {
      colOffset = -colOffset;
    } else if (rotY === 90) {
      colOffset = 0;
      rowLetter = isAnode ? 'E' : 'F';
    } else if (rotY === 270) {
      colOffset = 0;
      rowLetter = isAnode ? 'F' : 'E';
    }
    const col = centerCol + colOffset;
    return `${boardPrefix}col_${Math.max(1, Math.min(63, col))}_${rowLetter}`;
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

// Disjoint Set / Union-Find for electrical nets
class NetUnionFind {
  private parent = new Map<string, string>();

  find(i: string): string {
    if (!this.parent.has(i)) this.parent.set(i, i);
    if (this.parent.get(i) !== i) {
      this.parent.set(i, this.find(this.parent.get(i)!));
    }
    return this.parent.get(i)!;
  }

  union(i: string, j: string) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent.set(rootI, rootJ);
    }
  }

  connected(i: string, j: string): boolean {
    return this.find(i) === this.find(j);
  }
}

// Project a point onto a line segment
function projectPointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number; dist: number } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-4) return null;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  if (t < 0.05 || t > 0.95) return null; // strictly interior, avoid right on corners
  const projX = Math.round(a.x + t * dx);
  const projY = Math.round(a.y + t * dy);
  const dist = Math.hypot(p.x - projX, p.y - projY);
  return { x: projX, y: projY, dist };
}

/**
 * Canonicalizes a raw 3D pin identifier to match the exact CircuitPin.id on the schematic component.
 */
export function canonicalizePinIdForSchematic(comp: CircuitComponent | undefined, rawPinId: string): string {
  if (!comp || !comp.pins || comp.pins.length === 0) return rawPinId;
  const raw = String(rawPinId).trim();
  const rawLower = raw.toLowerCase();

  // 1. Exact match first
  const exact = comp.pins.find((p) => p.id === raw);
  if (exact) return exact.id;

  // 2. Case-insensitive ID or name match
  const caseMatch = comp.pins.find(
    (p) => p.id.toLowerCase() === rawLower || p.name?.toLowerCase() === rawLower
  );
  if (caseMatch) return caseMatch.id;

  // 3. Anode / Pin 1 / Pos aliases
  const posAliases = ['a', 'anode', '1', '+', 'pos', 'p', 'in'];
  if (posAliases.includes(rawLower)) {
    const found = comp.pins.find((p) => {
      const pid = p.id.toLowerCase();
      const pname = (p.name || '').toLowerCase();
      return posAliases.includes(pid) || posAliases.includes(pname);
    });
    if (found) return found.id;
  }

  // 4. Cathode / Pin 2 / Neg aliases
  const negAliases = ['k', 'cathode', '2', '-', 'neg', 'n', 'out'];
  if (negAliases.includes(rawLower)) {
    const found = comp.pins.find((p) => {
      const pid = p.id.toLowerCase();
      const pname = (p.name || '').toLowerCase();
      return negAliases.includes(pid) || negAliases.includes(pname);
    });
    if (found) return found.id;
  }

  // 5. GND aliases
  const gndAliases = ['gnd', 'gnd1', 'gnd2', 'gnd3', 'ground', '0v'];
  if (gndAliases.includes(rawLower)) {
    const found = comp.pins.find((p) => {
      const pid = p.id.toLowerCase();
      const pname = (p.name || '').toLowerCase();
      return gndAliases.includes(pid) || gndAliases.includes(pname);
    });
    if (found) return found.id;
  }

  // 6. Power aliases
  const pwrAliases = ['vcc', '5v', '3v3', '3.3v', 'vin', 'vdd', 'p', '+'];
  if (pwrAliases.includes(rawLower)) {
    const found = comp.pins.find((p) => {
      const pid = p.id.toLowerCase();
      const pname = (p.name || '').toLowerCase();
      return pwrAliases.includes(pid) || pwrAliases.includes(pname);
    });
    if (found) return found.id;
  }

  // 7. Digital/Analog MCU pins: strip or add 'd'/'a' prefix
  const strippedD = rawLower.replace(/^d/, '');
  const foundD = comp.pins.find(
    (p) => p.id.toLowerCase() === strippedD || p.id.toLowerCase() === `d${strippedD}`
  );
  if (foundD) return foundD.id;

  const strippedA = rawLower.replace(/^a/, '');
  const foundA = comp.pins.find(
    (p) => p.id.toLowerCase() === strippedA || p.id.toLowerCase() === `a${strippedA}`
  );
  if (foundA) return foundA.id;

  return rawPinId;
}

/**
 * Resolves a 3D jumper wire to its real component-to-component electrical connections.
 * Enforces strict 1-edge shortest-path / MST net resolution:
 * 1. Resolves candidate pins with priority to exact clicked breadboard column.
 * 2. Skips wire creation if endpoints are already in the same electrical net (0 redundant parallel wires).
 * 3. Chooses exactly 1 shortest Euclidean pair.
 * 4. Auto-taps the closest existing wire segment of that net if closer by >= 15px.
 * 5. Returns at most 1 wire, preserving clean default schematic wire color.
 */
export function resolve3DWireToSchematicConnections(
  w3d: Wire3D,
  allWires3d: Wire3D[],
  components3d: Component3D[],
  schematicComponents: CircuitComponent[],
  schematicWires: CircuitWire[] = []
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
    const schComp = schematicComponents?.find((c) => c.id === comp3d.id);
    const pinsToCheck: string[] = [];
    if (schComp?.pins && schComp.pins.length > 0) {
      pinsToCheck.push(...schComp.pins.map((sp) => sp.id));
    }
    const customComp = comp3d as ComponentWithPinHoles & { parameters?: { pinHoles?: Record<string, string> } };
    const ph = customComp.pinHoles || customComp.parameters?.pinHoles;
    if (ph) {
      for (const k of Object.keys(ph)) {
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
      const canonicalPinId = canonicalizePinIdForSchematic(schComp, p);
      if (schComp?.pins && schComp.pins.length > 0 && !schComp.pins.some((sp) => sp.id === canonicalPinId)) continue;

      if (seenPins.has(canonicalPinId)) continue;
      seenPins.add(canonicalPinId);

      const list = pinsByTieGroup.get(tg) || [];
      list.push({ compId: comp3d.id, pinId: canonicalPinId });
      pinsByTieGroup.set(tg, list);
    }
  }

  // 1b. Seed Power Rails (+ / -)
  const gndComp = schematicComponents?.find((c) => c.type === 'GROUND' || c.id.toLowerCase().startsWith('gnd'));
  const batComp = schematicComponents?.find((c) => c.type === 'BATTERY' || c.type === 'BATTERY_9V' || c.id.toLowerCase().startsWith('bat'));
  const prefixes = ['bb_', 'bb2_', 'bb3_'];
  for (const prefix of prefixes) {
    if (batComp) {
      const posPin = batComp.pins?.find((p) => ['p', '+', 'pos'].includes(p.id.toLowerCase()))?.id || 'p';
      for (const rail of [`${prefix}tie_rail_top_pos`, `${prefix}tie_rail_bottom_pos`]) {
        const list = pinsByTieGroup.get(rail) || [];
        if (!list.some((item) => item.compId === batComp.id && item.pinId === posPin)) {
          list.push({ compId: batComp.id, pinId: posPin });
          pinsByTieGroup.set(rail, list);
        }
      }
    }
    const negComp = gndComp || batComp;
    if (negComp) {
      const negPin = gndComp
        ? (gndComp.pins?.[0]?.id || '1')
        : (batComp?.pins?.find((p) => ['n', '-', 'neg'].includes(p.id.toLowerCase()))?.id || 'n');
      for (const rail of [`${prefix}tie_rail_top_neg`, `${prefix}tie_rail_bottom_neg`]) {
        const list = pinsByTieGroup.get(rail) || [];
        if (!list.some((item) => item.compId === negComp.id && item.pinId === negPin)) {
          list.push({ compId: negComp.id, pinId: negPin });
          pinsByTieGroup.set(rail, list);
        }
      }
    }
  }

  // 1c. Seed Existing Bridged Off-Board Pins (Arduino / Battery / Modules already plugged into breadboard holes)
  const allWires = allWires3d || [w3d];
  for (const wire of allWires) {
    if (wire === w3d || (wire.id && w3d.id && wire.id === w3d.id)) continue;
    const wFrom = parseEndpoint(wire?.fromPin || (wire as WireWithHoles)?.fromHole);
    const wTo = parseEndpoint(wire?.toPin || (wire as WireWithHoles)?.toHole);
    if (!wFrom || !wTo) continue;

    const fromIsBb = wFrom.compId === 'breadboard' || wFrom.compId.startsWith('breadboard');
    const toIsBb = wTo.compId === 'breadboard' || wTo.compId.startsWith('breadboard');

    let compEnd: { compId: string; pinId: string } | null = null;
    let holeEnd: { compId: string; pinId: string } | null = null;
    if (!fromIsBb && validCompIds.has(wFrom.compId) && toIsBb) {
      compEnd = wFrom;
      holeEnd = wTo;
    } else if (!toIsBb && validCompIds.has(wTo.compId) && fromIsBb) {
      compEnd = wTo;
      holeEnd = wFrom;
    }

    if (compEnd && holeEnd) {
      const tg = getHoleTieGroup(holeEnd.pinId);
      if (tg) {
        const schComp = schematicComponents?.find((c) => c.id === compEnd!.compId);
        const canonicalPinId = canonicalizePinIdForSchematic(schComp, compEnd.pinId);
        const list = pinsByTieGroup.get(tg) || [];
        if (!list.some((item) => item.compId === compEnd!.compId && item.pinId === canonicalPinId)) {
          list.push({ compId: compEnd!.compId, pinId: canonicalPinId });
          pinsByTieGroup.set(tg, list);
        }
      }
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

  // 3. Build Union-Find of ALL existing electrical nets from schematicWires
  const uf = new NetUnionFind();
  for (const sw of schematicWires) {
    const k1 = `${sw.fromCompId}:${sw.fromPinId}`;
    const k2 = `${sw.toCompId}:${sw.toPinId}`;
    uf.union(k1, k2);
    if (sw.tappedWireId) {
      const parentWire = schematicWires.find((w) => w.id === sw.tappedWireId);
      if (parentWire) {
        uf.union(k1, `${parentWire.fromCompId}:${parentWire.fromPinId}`);
      }
    }
  }

  // 4. Resolve endpoint candidate pins, prioritizing exact clicked column
  interface CandidatePin {
    compId: string;
    pinId: string;
    isDirectHole: boolean;
  }

  const resolveEndpoint = (endpoint: { compId: string; pinId: string }): CandidatePin[] => {
    const isBb = endpoint.compId === 'breadboard' || endpoint.compId.startsWith('breadboard');
    if (!isBb) {
      const schComp = schematicComponents?.find((c) => c.id === endpoint.compId);
      const canonPin = canonicalizePinIdForSchematic(schComp, endpoint.pinId);
      return [{ compId: endpoint.compId, pinId: canonPin, isDirectHole: true }];
    }

    const exactTg = getHoleTieGroup(endpoint.pinId);
    if (!exactTg) return [];

    const directPins: CandidatePin[] = (pinsByTieGroup.get(exactTg) || []).map((p) => ({
      ...p,
      isDirectHole: true,
    }));

    const connectedTgs = getConnectedTieGroups(exactTg);
    const bridgedPins: CandidatePin[] = [];
    for (const group of connectedTgs) {
      if (group === exactTg) continue;
      const pins = pinsByTieGroup.get(group);
      if (pins) {
        bridgedPins.push(...pins.map((p) => ({ ...p, isDirectHole: false })));
      }
    }

    // Prioritize pins seated in the exact clicked column/hole tieGroup over multi-hop columns
    return directPins.length > 0 ? directPins : bridgedPins;
  };

  const fromCandidates = resolveEndpoint(parsedFrom);
  const toCandidates = resolveEndpoint(parsedTo);

  if (fromCandidates.length === 0 || toCandidates.length === 0) {
    return [];
  }

  // Check if ANY pin on Side A is ALREADY in the same net as ANY pin on Side B
  for (const f of fromCandidates) {
    const fKey = `${f.compId}:${f.pinId}`;
    for (const t of toCandidates) {
      const tKey = `${t.compId}:${t.pinId}`;
      if (f.compId === t.compId && f.pinId === t.pinId) return [];
      if (uf.connected(fKey, tKey)) {
        return []; // Already electrically joined -> ZERO redundant parallel wires!
      }
    }
  }

  // Helper to get 2D schematic coordinates of a pin
  const getPinPos = (compId: string, pinId: string): { x: number; y: number } => {
    const schComp = schematicComponents?.find((c) => c.id === compId);
    if (schComp) {
      return getCanonicalPinWorldPos(schComp, pinId);
    }
    const c3d = components3d.find((c) => c.id === compId);
    return { x: c3d?.x3d ?? 0, y: c3d?.z3d ?? 0 };
  };

  // 5. Pick EXACTLY ONE best pair (bestA, bestB)
  let bestPair: { a: CandidatePin; b: CandidatePin; dist: number } | null = null;

  for (const f of fromCandidates) {
    const posA = getPinPos(f.compId, f.pinId);
    for (const t of toCandidates) {
      if (f.compId === t.compId && f.pinId === t.pinId) continue;
      const posB = getPinPos(t.compId, t.pinId);
      const dist = Math.hypot(posA.x - posB.x, posA.y - posB.y);

      if (!bestPair) {
        bestPair = { a: f, b: t, dist };
        continue;
      }

      const curScore = (bestPair.a.isDirectHole ? 2 : 0) + (bestPair.b.isDirectHole ? 2 : 0);
      const newScore = (f.isDirectHole ? 2 : 0) + (t.isDirectHole ? 2 : 0);

      if (newScore > curScore) {
        bestPair = { a: f, b: t, dist };
      } else if (newScore === curScore && dist < bestPair.dist) {
        bestPair = { a: f, b: t, dist };
      }
    }
  }

  if (!bestPair) return [];

  const { a: bestA, b: bestB } = bestPair;

  // 6. Auto-Tap Nearest Existing Wire of That Net (Shortest Path Junction!) via unified resolver
  const resolved = resolveShortestNetWire(
    bestA.compId,
    bestA.pinId,
    bestB.compId,
    bestB.pinId,
    schematicComponents,
    schematicWires,
    undefined,
    10
  );

  if (resolved.skipDuplicate) {
    return [];
  }

  // Preserve clean default schematic wire color (never force jarring red on normal signal wires)
  let resolvedColor: string | undefined = undefined;
  if (w3d.color && w3d.color !== '#EF4444' && w3d.color.toLowerCase() !== '#ff0000') {
    resolvedColor = w3d.color;
  }

  const fromComp = schematicComponents?.find((c) => c.id === resolved.fromCompId);
  const toComp = schematicComponents?.find((c) => c.id === resolved.toCompId);
  const finalFromPin = canonicalizePinIdForSchematic(fromComp, resolved.fromPinId);
  const finalToPin = canonicalizePinIdForSchematic(toComp, resolved.toPinId);

  return [
    {
      fromCompId: resolved.fromCompId,
      fromPinId: finalFromPin,
      toCompId: resolved.toCompId,
      toPinId: finalToPin,
      color: resolvedColor,
      tappedWireId: resolved.tappedWireId,
      junctionPoint: resolved.junctionPoint,
    },
  ];
}
