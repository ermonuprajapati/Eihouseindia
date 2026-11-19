import { CircuitComponent, CircuitWire } from '../types';
import { getPinWorldCoord } from '@/components/engineering-lab/Canvas/SchematicCanvas';

export interface ErcViolation {
  id: string;
  code:
    | 'ERR_DIRECT_SHORT'
    | 'ERR_DUPLICATE_DESIGNATOR'
    | 'WARN_FLOATING_INPUT'
    | 'WARN_UNCONNECTED_PIN'
    | 'WARN_SINGLE_PIN_NET'
    | 'WARN_MISSING_VALUE'
    | 'WARN_REVERSE_POLARITY'
    | 'INFO_ISOLATED_COMPONENT';
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  compIds?: string[];
  pinIds?: string[];
  wireIds?: string[];
  targetLocation?: { x: number; y: number };
}

/**
 * Runs a comprehensive Electrical Rules Check (ERC) across the schematic.
 * Evaluates net topology, designator collisions, power-ground shorts, and dangling pins.
 */
export function runElectricalRulesCheck(
  components: CircuitComponent[],
  wires: CircuitWire[]
): ErcViolation[] {
  const violations: ErcViolation[] = [];

  // 1. DUPLICATE DESIGNATOR CHECK
  const designatorCounts = new Map<string, CircuitComponent[]>();
  components.forEach((c) => {
    const des = (c.designator || c.label || '').trim().toUpperCase();
    if (des) {
      const list = designatorCounts.get(des) || [];
      list.push(c);
      designatorCounts.set(des, list);
    }
  });

  designatorCounts.forEach((comps, des) => {
    if (comps.length > 1) {
      violations.push({
        id: `erc_dup_${des}`,
        code: 'ERR_DUPLICATE_DESIGNATOR',
        severity: 'error',
        title: `Duplicate Reference Designator "${des}"`,
        message: `${comps.length} components share the identical designator "${des}". In EDA standards, designators must be unique.`,
        compIds: comps.map((c) => c.id),
        targetLocation: { x: comps[0].x, y: comps[0].y },
      });
    }
  });

  // 2. MISSING VALUES CHECK
  components.forEach((c) => {
    const isSourceOrGnd = ['GND', 'GROUND'].includes(c.type);
    if (!isSourceOrGnd && (!c.value || c.value.trim() === '')) {
      violations.push({
        id: `erc_val_${c.id}`,
        code: 'WARN_MISSING_VALUE',
        severity: 'warning',
        title: `Missing Nominal Value for ${c.designator || c.label}`,
        message: `Component ${c.designator || c.label} (${c.type}) has no defined electrical value or rating.`,
        compIds: [c.id],
        targetLocation: { x: c.x, y: c.y },
      });
    }
  });

  // 3. NETLIST UNION-FIND TOPOLOGY
  const parent = new Map<string, string>();
  const find = (i: string): string => {
    if (!parent.has(i)) parent.set(i, i);
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  };
  const union = (i: string, j: string) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  };

  const connectedPins = new Set<string>();
  const netWireMap = new Map<string, string[]>();

  wires.forEach((w) => {
    const p1 = `${w.fromCompId}:${w.fromPinId}`;
    const p2 = `${w.toCompId}:${w.toPinId}`;
    connectedPins.add(p1);
    connectedPins.add(p2);
    union(p1, p2);
  });

  wires.forEach((w) => {
    const root = find(`${w.fromCompId}:${w.fromPinId}`);
    const wList = netWireMap.get(root) || [];
    wList.push(w.id);
    netWireMap.set(root, wList);
  });

  // Pin classification
  const isPowerPin = (pinName: string, compType: string, pinId: string): boolean => {
    const n = pinName.toLowerCase();
    const p = pinId.toLowerCase();
    const c = compType.toLowerCase();
    if (n.includes('vcc') || n.includes('5v') || n.includes('12v') || n.includes('3v3') || n.includes('vin') || n === 'v+') return true;
    if (c.includes('battery') || c.includes('dc_voltage')) return p === 'pos' || p === '1' || n === '+';
    return false;
  };

  const isGroundPin = (pinName: string, compType: string, pinId: string): boolean => {
    const n = pinName.toLowerCase();
    const p = pinId.toLowerCase();
    const c = compType.toLowerCase();
    if (n.includes('gnd') || n.includes('ground') || n === '0v' || n === 'v-') return true;
    if (c.includes('battery') || c.includes('dc_voltage')) return p === 'neg' || p === '2' || n === '-';
    return false;
  };

  const powerPinsByNet = new Map<string, { comp: CircuitComponent; pinName: string }[]>();
  const groundPinsByNet = new Map<string, { comp: CircuitComponent; pinName: string }[]>();
  const pinsPerNet = new Map<string, string[]>();

  components.forEach((c) => {
    c.pins.forEach((p) => {
      const key = `${c.id}:${p.id}`;
      if (connectedPins.has(key)) {
        const root = find(key);
        const list = pinsPerNet.get(root) || [];
        list.push(key);
        pinsPerNet.set(root, list);

        if (isPowerPin(p.name, c.type, p.id)) {
          const arr = powerPinsByNet.get(root) || [];
          arr.push({ comp: c, pinName: p.name });
          powerPinsByNet.set(root, arr);
        }
        if (isGroundPin(p.name, c.type, p.id)) {
          const arr = groundPinsByNet.get(root) || [];
          arr.push({ comp: c, pinName: p.name });
          groundPinsByNet.set(root, arr);
        }
      }
    });
  });

  // 4. DIRECT SHORT CIRCUITS CHECK (Power directly shorted to Ground)
  powerPinsByNet.forEach((pPins, netId) => {
    if (groundPinsByNet.has(netId)) {
      const gPins = groundPinsByNet.get(netId)!;
      const wIds = netWireMap.get(netId) || [];
      const firstComp = pPins[0].comp;
      violations.push({
        id: `erc_short_${netId}`,
        code: 'ERR_DIRECT_SHORT',
        severity: 'error',
        title: 'Direct Power-to-Ground Short Circuit',
        message: `Power net (${pPins.map((p) => `${p.comp.designator || p.comp.label}.${p.pinName}`).join(', ')}) connects directly to Ground (${gPins.map((g) => `${g.comp.designator || g.comp.label}.${g.pinName}`).join(', ')}) with zero series impedance!`,
        compIds: [...pPins.map((p) => p.comp.id), ...gPins.map((g) => g.comp.id)],
        wireIds: wIds,
        targetLocation: { x: firstComp.x, y: firstComp.y },
      });
    }
  });

  // 5. UNCONNECTED PINS & FLOATING INPUTS CHECK
  components.forEach((c) => {
    let unconnCount = 0;
    c.pins.forEach((p) => {
      const key = `${c.id}:${p.id}`;
      if (!connectedPins.has(key)) {
        unconnCount++;
        const worldCoord = getPinWorldCoord(c, p);
        if (p.pinType === 'input') {
          violations.push({
            id: `erc_flt_${c.id}_${p.id}`,
            code: 'WARN_FLOATING_INPUT',
            severity: 'warning',
            title: `Floating Input Pin ${c.designator || c.label}.${p.name}`,
            message: `Input pin "${p.name}" on ${c.designator || c.label} (${c.type}) is floating without a signal or pull-up/down termination.`,
            compIds: [c.id],
            pinIds: [p.id],
            targetLocation: worldCoord,
          });
        }
      }
    });

    if (unconnCount === c.pins.length && c.pins.length > 0) {
      violations.push({
        id: `erc_iso_${c.id}`,
        code: 'INFO_ISOLATED_COMPONENT',
        severity: 'info',
        title: `Unconnected Component ${c.designator || c.label}`,
        message: `All pins of ${c.designator || c.label} (${c.type}) are currently unconnected.`,
        compIds: [c.id],
        targetLocation: { x: c.x, y: c.y },
      });
    }
  });

  // 6. SINGLE-PIN NET CHECK
  pinsPerNet.forEach((pins, netId) => {
    if (pins.length < 2) {
      const wireIds = netWireMap.get(netId) || [];
      violations.push({
        id: `erc_single_${netId}`,
        code: 'WARN_SINGLE_PIN_NET',
        severity: 'warning',
        title: 'Single-Pin Net (Dangling Wire)',
        message: 'A wire is connected to only one terminal pin without completing a circuit loop.',
        wireIds,
      });
    }
  });

  return violations;
}

/**
 * Auto-Annotates components across the schematic sheet by topological coordinate ordering
 * (top-to-bottom, left-to-right), re-assigning standard sequential reference designators (R1, R2, C1, C2...).
 */
export function autoAnnotateComponents(components: CircuitComponent[]): CircuitComponent[] {
  // Group prefix by component type
  const getPrefix = (type: string): string => {
    switch (type) {
      case 'RESISTOR':
      case 'POTENTIOMETER':
        return 'R';
      case 'CAPACITOR':
        return 'C';
      case 'INDUCTOR':
        return 'L';
      case 'DIODE':
        return 'D';
      case 'LED':
      case 'LED_RGB':
        return 'LED';
      case 'BJT_NPN':
      case 'BJT_PNP':
      case 'MOSFET_N':
      case 'MOSFET_P':
        return 'Q';
      case 'TIMER_555':
      case 'OPAMP':
      case 'OPAMP_DUAL':
      case 'LOGIC_AND':
      case 'LOGIC_OR':
      case 'LOGIC_NOT':
      case 'LOGIC_NAND':
      case 'LOGIC_NOR':
      case 'LOGIC_XOR':
      case 'MCU_ARDUINO_UNO':
      case 'MCU_ARDUINO_NANO':
      case 'MCU_ESP32':
      case 'MCU_ATMEGA328P':
      case 'DISPLAY_LCD1602':
      case 'DISPLAY_OLED_I2C':
      case 'DISPLAY_7SEG':
        return 'U';
      case 'BATTERY':
      case 'DC_VOLTAGE':
      case 'AC_SOURCE':
      case 'FUNCTION_GENERATOR':
        return 'BT';
      case 'GROUND':
      case 'GND':
        return 'GND';
      case 'SWITCH_SPST':
      case 'SWITCH_SPDT':
      case 'PUSHBUTTON':
        return 'SW';
      case 'RELAY_SPDT':
        return 'K';
      case 'BUZZER':
        return 'BZ';
      case 'SENSOR_DHT11':
      case 'SENSOR_ULTRASONIC':
      case 'SENSOR_LDR':
      case 'SENSOR_PIR':
      case 'SENSOR_MQ2':
        return 'SEN';
      default:
        return 'COMP';
    }
  };

  // Group components by prefix
  const groups = new Map<string, CircuitComponent[]>();
  components.forEach((c) => {
    const prefix = getPrefix(c.type);
    const list = groups.get(prefix) || [];
    list.push(c);
    groups.set(prefix, list);
  });

  const updatedMap = new Map<string, string>();

  // Sort each group topologically: primary Y (rows), secondary X (columns)
  groups.forEach((list, prefix) => {
    list.sort((a, b) => {
      // 40px row quantization
      const rowA = Math.floor(a.y / 40);
      const rowB = Math.floor(b.y / 40);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    list.forEach((comp, idx) => {
      if (prefix === 'GND') {
        updatedMap.set(comp.id, `GND${idx + 1}`);
      } else {
        updatedMap.set(comp.id, `${prefix}${idx + 1}`);
      }
    });
  });

  return components.map((c) => {
    const newDes = updatedMap.get(c.id);
    if (!newDes) return c;
    return {
      ...c,
      designator: newDes,
      label: newDes,
    };
  });
}
