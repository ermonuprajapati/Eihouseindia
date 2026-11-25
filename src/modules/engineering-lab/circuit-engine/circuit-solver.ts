import { CircuitComponent, CircuitWire, SimulationWaveformPoint, VirtualInstrumentState } from '../types';

export interface SolverStepResult {
  nodeVoltages: Record<string, number>;
  componentStates: Record<string, {
    voltage: number;
    current: number;
    on?: boolean;
    brightness?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    faultState?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    isBurnedOut?: boolean;
    thermalStress?: number;
    fault?: string;
    digitalOut?: number;
    pwrLed?: boolean;
    channels?: { r: number; g: number; b: number };
    onRed?: boolean;
    onGreen?: boolean;
    onBlue?: boolean;
    redBrightness?: number;
    greenBrightness?: number;
    blueBrightness?: number;
  }>;
  waveformData: Record<string, SimulationWaveformPoint[]>;
  wireCurrents?: Record<string, number>;
  faults?: Array<{
    compId: string;
    compLabel: string;
    type: 'OVERCURRENT' | 'OVERVOLTAGE' | 'OVERPOWER' | 'REVERSE_POLARITY' | 'SHORT_CIRCUIT' | 'MISSING_GND' | 'OPEN_CIRCUIT' | 'DISCONNECTED';
    message: string;
    timestamp: number;
  }>;
}

export function getLedForwardVoltage(comp: CircuitComponent): number {
  if (comp.parameters?.forwardVoltage) {
    const val = parseFloat(String(comp.parameters.forwardVoltage));
    if (!isNaN(val) && val > 0) return val;
  }
  if (comp.parameters?.forwardVoltageV) {
    const val = parseFloat(String(comp.parameters.forwardVoltageV));
    if (!isNaN(val) && val > 0) return val;
  }
  const colorStr = String(comp.parameters?.color || comp.value || 'Red').toLowerCase();
  if (colorStr.includes('blue') || colorStr.includes('white')) return 3.1;
  if (colorStr.includes('cyan')) return 3.0;
  if (colorStr.includes('purple') || colorStr.includes('violet')) return 3.2;
  if (colorStr.includes('green')) return 2.3;
  if (colorStr.includes('amber') || colorStr.includes('yellow') || colorStr.includes('orange')) return 2.1;
  return 1.9; // Standard Red LED forward drop
}

export function getPotentiometerPins(comp: CircuitComponent, netMap: Map<string, string>): {
  pinA?: string;
  pinWiper?: string;
  pinB?: string;
} {
  let pinA: string | undefined;
  let pinWiper: string | undefined;
  let pinB: string | undefined;

  for (const pin of comp.pins) {
    const idLower = (pin.id || '').toLowerCase();
    const nameLower = (pin.name || '').toLowerCase();
    const net = netMap.get(`${comp.id}:${pin.id}`);
    if (idLower === 'a' || idLower === '1' || nameLower === 'a' || nameLower === '1') {
      pinA = net;
    } else if (
      idLower === 'wiper' ||
      idLower === 'w' ||
      idLower === '2' ||
      nameLower === 'wiper' ||
      nameLower === 'w' ||
      nameLower === '2'
    ) {
      pinWiper = net;
    } else if (idLower === 'b' || idLower === '3' || nameLower === 'b' || nameLower === '3') {
      pinB = net;
    }
  }

  // Fallbacks by pin order if unmapped
  if (!pinA && comp.pins.length > 0) {
    pinA = netMap.get(`${comp.id}:${comp.pins[0].id}`);
  }
  if (!pinWiper && comp.pins.length > 1) {
    pinWiper = netMap.get(`${comp.id}:${comp.pins[1].id}`);
  }
  if (!pinB && comp.pins.length > 2) {
    pinB = netMap.get(`${comp.id}:${comp.pins[2].id}`);
  }

  return { pinA, pinWiper, pinB };
}

export class CircuitSolver {
  private netMap: Map<string, string> = new Map(); // pinKey -> netId
  private nets: Set<string> = new Set();
  private gndNetId: string = 'GND';
  private capacitorVoltages: Map<string, number> = new Map();
  private inductorCurrents: Map<string, number> = new Map();
  private bjtCurrents: Map<string, { ib: number; ic: number }> = new Map();
  private timer555State: Map<string, { flipFlop: boolean; outV: number }> = new Map();
  private waveformHistory: Map<string, SimulationWaveformPoint[]> = new Map();
  private currentTime: number = 0;
  private maxHistoryPoints: number = 2500;
  private burnedComponents: Set<string> = new Set();
  private burnFaultReasons: Map<string, string> = new Map();
  private recordedFaults: Array<{
    compId: string;
    compLabel: string;
    type: 'OVERCURRENT' | 'OVERVOLTAGE' | 'OVERPOWER' | 'REVERSE_POLARITY' | 'SHORT_CIRCUIT' | 'MISSING_GND' | 'OPEN_CIRCUIT' | 'DISCONNECTED';
    message: string;
    timestamp: number;
  }> = [];

  public reset() {
    this.capacitorVoltages.clear();
    this.inductorCurrents.clear();
    this.bjtCurrents.clear();
    this.timer555State.clear();
    this.waveformHistory.clear();
    this.burnedComponents.clear();
    this.burnFaultReasons.clear();
    this.recordedFaults = [];
    this.currentTime = 0;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public resetBurntComponent(compId: string) {
    this.burnedComponents.delete(compId);
    this.burnFaultReasons.delete(compId);
    this.recordedFaults = this.recordedFaults.filter((f) => f.compId !== compId);
  }

  public resetBurntComponents() {
    this.burnedComponents.clear();
    this.burnFaultReasons.clear();
    this.recordedFaults = [];
  }

  public resetFaults() {
    this.resetBurntComponents();
  }

  public getBurntComponentIds(): string[] {
    return Array.from(this.burnedComponents);
  }

  /**
   * Evaluates instantaneous voltage for any standard or custom periodic waveform
   */
  private evaluateWaveform(
    waveform: string,
    freqHz: number,
    ampV: number,
    offsetV: number,
    dutyCycle: number | undefined,
    phaseDeg: number | undefined,
    timeSec: number
  ): number {
    const safeFreq = Number.isFinite(freqHz) ? Math.max(0.1, freqHz) : 1000;
    const safeAmp = Number.isFinite(ampV) ? ampV : 5.0;
    const safeOffset = Number.isFinite(offsetV) ? offsetV : 0.0;
    const safeTime = Number.isFinite(timeSec) ? timeSec : 0.0;

    let duty = 0.5;
    if (dutyCycle !== undefined && Number.isFinite(dutyCycle)) {
      const rawDuty = dutyCycle > 1 ? dutyCycle / 100 : dutyCycle;
      duty = Math.min(0.99, Math.max(0.01, rawDuty));
    }

    const phaseOffset = (((phaseDeg || 0) % 360) + 360) % 360 / 360;
    const rawPhase = ((safeTime * safeFreq) + phaseOffset) % 1.0;
    const phase = (rawPhase + 1.0) % 1.0;

    const wave = (waveform || 'sine').toLowerCase();
    if (wave === 'square') {
      return safeOffset + (phase < duty ? safeAmp : -safeAmp);
    } else if (wave === 'triangle') {
      return safeOffset + safeAmp * (4 * Math.abs(phase - 0.5) - 1);
    } else if (wave === 'sawtooth') {
      return safeOffset + safeAmp * (2 * phase - 1);
    } else if (wave === 'pulse') {
      return safeOffset + (phase < duty ? safeAmp : 0);
    } else if (wave === 'noise') {
      return safeOffset + (Math.random() * 2 - 1) * safeAmp;
    } else {
      // default: 'sine'
      return safeOffset + safeAmp * Math.sin(2 * Math.PI * phase);
    }
  }

  /**
   * Build electrical nets (nodes) from components and connecting wires
   */
  private buildNets(components: CircuitComponent[], wires: CircuitWire[]) {
    this.netMap.clear();
    this.nets.clear();

    const parent: Map<string, string> = new Map();
    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(root, root);
      return root;
    };
    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    // Initialize all pins
    const compMap = new Map<string, CircuitComponent>();
    for (const comp of components) {
      compMap.set(comp.id, comp);
      for (const pin of comp.pins) {
        const pinKey = `${comp.id}:${pin.id}`;
        parent.set(pinKey, pinKey);
      }
    }

    const resolvePinKey = (compId: string, pinId: string): string => {
      const comp = compMap.get(compId);
      if (!comp) return `${compId}:${pinId}`;
      const pIdLower = (pinId || '').toLowerCase();
      // Match pin by id, name, or canonical alias
      for (const p of comp.pins) {
        const pId = (p.id || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        if (pId === pIdLower || pName === pIdLower) {
          return `${compId}:${p.id}`;
        }
        if (pIdLower === 'anode' && (pId === 'a' || pId === '1' || pName.includes('+') || pName.includes('anode'))) {
          return `${compId}:${p.id}`;
        }
        if (pIdLower === 'cathode' && (pId === 'k' || pId === '2' || pName.includes('-') || pName.includes('cathode'))) {
          return `${compId}:${p.id}`;
        }
        if ((pIdLower === '+' || pIdLower === 'pos') && (pId === 'p' || pId === 'pos' || pId === '+' || pId === '1' || pName.includes('+'))) {
          return `${compId}:${p.id}`;
        }
        if ((pIdLower === '-' || pIdLower === 'neg') && (pId === 'n' || pId === 'neg' || pId === '-' || pId === '2' || pName.includes('-'))) {
          return `${compId}:${p.id}`;
        }
      }
      return `${compId}:${pinId}`;
    };

    // Connect sets through wires
    for (const wire of wires) {
      const pinA = resolvePinKey(wire.fromCompId, wire.fromPinId);
      const pinB = resolvePinKey(wire.toCompId, wire.toPinId);
      union(pinA, pinB);
    }

    // Synthesize internal solderless breadboard spring-clip tie-strips
    // Holes in Col/Row N (cols A..E) tie together; holes in Col/Row N (cols F..J) tie together;
    // Continuous power rails (+ and -) tie together with strict electrical topology.
    const breadboardTies = new Map<string, string>();
    for (const wire of wires) {
      for (const end of [{ compId: wire.fromCompId, pinId: wire.fromPinId }, { compId: wire.toCompId, pinId: wire.toPinId }]) {
        const cIdLower = (end.compId || '').toLowerCase();
        if (cIdLower === 'breadboard' || cIdLower === 'bb' || cIdLower.includes('breadboard')) {
          const pinKey = `${end.compId}:${end.pinId}`;
          let tieGroup = end.pinId;

          if (end.pinId.startsWith('bb_col_')) {
            // MB-102 830-hole format: bb_col_{col}_{row}
            const parts = end.pinId.split('_');
            const col = parts[2];
            const row = parts[3];
            const isTop = ['A', 'B', 'C', 'D', 'E'].includes(row);
            tieGroup = `bb_tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
          } else if (end.pinId.startsWith('bb_row_')) {
            // 400-hole format: bb_row_{row}_{col}
            const parts = end.pinId.split('_');
            const row = parts[2];
            const col = parts[3];
            const isTop = ['A', 'B', 'C', 'D', 'E'].includes(col);
            tieGroup = `bb_tie_row_${row}_${isTop ? 'top' : 'bot'}`;
          } else if (end.pinId.startsWith('bb_rail_')) {
            // Power rail format: bb_rail_{section}_{polarity}_{index}
            const parts = end.pinId.split('_');
            const section = parts[2]; // top or bottom
            const polarity = parts[3]; // pos or neg
            tieGroup = `bb_tie_rail_${section}_${polarity}`;
          }

          if (breadboardTies.has(tieGroup)) {
            union(pinKey, breadboardTies.get(tieGroup)!);
          } else {
            breadboardTies.set(tieGroup, pinKey);
          }
        }
      }
    }

    // Synthesize physical breadboard seating for through-hole components placed directly on breadboard
    for (const comp of components) {
      if (
        comp.x3d !== undefined &&
        comp.y3d !== undefined &&
        comp.z3d !== undefined &&
        comp.y3d >= 3.5 &&
        Math.abs(comp.x3d) <= 85 &&
        Math.abs(comp.z3d) <= 30 &&
        !comp.type.startsWith('ARDUINO_') &&
        comp.type !== 'MCU_ARDUINO_UNO' &&
        comp.type !== 'BATTERY' &&
        comp.type !== 'BATTERY_9V'
      ) {
        const startX = -78.74;
        const pitchX = 2.54;
        const rot = comp.rot3d || 0;
        const isRotated = (rot % 180 !== 0);

        if (comp.pins.length === 2) {
          const pinAKey = `${comp.id}:${comp.pins[0].id}`;
          const pinBKey = `${comp.id}:${comp.pins[1].id}`;

          const isLedOrCap = comp.type === 'LED' || comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC' || comp.type === 'SENSOR_LDR';
          const halfSpan = isLedOrCap ? 2.54 : 5.08;

          let colA = Math.round((comp.x3d - (isRotated ? 0 : halfSpan) - startX) / pitchX) + 1;
          let colB = Math.round((comp.x3d + (isRotated ? 0 : halfSpan) - startX) / pitchX) + 1;
          colA = Math.max(1, Math.min(63, colA));
          colB = Math.max(1, Math.min(63, colB));
          if (colA === colB && !isRotated) {
            colB = Math.min(63, colA + 1);
          }

          const isTopA = isRotated ? true : comp.z3d <= 0;
          const isTopB = isRotated ? false : comp.z3d <= 0;

          const tieA = `bb_tie_col_${colA}_${isTopA ? 'top' : 'bottom'}`;
          const tieB = `bb_tie_col_${colB}_${isTopB ? 'top' : 'bottom'}`;

          if (breadboardTies.has(tieA)) {
            union(pinAKey, breadboardTies.get(tieA)!);
          } else {
            breadboardTies.set(tieA, pinAKey);
          }

          if (breadboardTies.has(tieB)) {
            union(pinBKey, breadboardTies.get(tieB)!);
          } else {
            breadboardTies.set(tieB, pinBKey);
          }
        } else if (comp.pins.length === 8 || comp.type === 'TIMER_555' || comp.type === 'DIP_IC') {
          // DIP-8 straddles center isolation notch: Pins 1..4 on Row E (top), Pins 5..8 on Row F (bottom)
          // Package center sits halfway between columns: centerCol represents the column left of center (e.g. Col 30)
          const centerCol = Math.round((comp.x3d - startX) / pitchX + 0.5);
          for (let pIdx = 1; pIdx <= 8; pIdx++) {
            const pinObj = comp.pins.find((p) => p.id === String(pIdx) || p.name === String(pIdx)) || comp.pins[pIdx - 1];
            if (!pinObj) continue;
            const pinKey = `${comp.id}:${pinObj.id}`;
            let col = centerCol;
            let isTop = true;
            if (pIdx >= 1 && pIdx <= 4) {
              col = centerCol - 1 + (pIdx - 1);
              isTop = true;
            } else {
              col = centerCol + 2 - (pIdx - 5);
              isTop = false;
            }
            col = Math.max(1, Math.min(63, col));
            const tie = `bb_tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
            if (breadboardTies.has(tie)) {
              union(pinKey, breadboardTies.get(tie)!);
            } else {
              breadboardTies.set(tie, pinKey);
            }
          }
        } else if (comp.pins.length === 3 || comp.type === 'POTENTIOMETER') {
          const centerCol = Math.round((comp.x3d - startX) / pitchX) + 1;
          const isTop = (comp.z3d || 0) <= 0;
          for (let pIdx = 0; pIdx < comp.pins.length; pIdx++) {
            const pinKey = `${comp.id}:${comp.pins[pIdx].id}`;
            const col = Math.max(1, Math.min(63, centerCol - 1 + pIdx));
            const tie = `bb_tie_col_${col}_${isTop ? 'top' : 'bottom'}`;
            if (breadboardTies.has(tie)) {
              union(pinKey, breadboardTies.get(tie)!);
            } else {
              breadboardTies.set(tie, pinKey);
            }
          }
        }
      }
    }

    // Assign canonical net IDs
    for (const comp of components) {
      for (const pin of comp.pins) {
        const pinKey = `${comp.id}:${pin.id}`;
        const root = find(pinKey);
        this.netMap.set(pinKey, root);
        this.nets.add(root);
      }
    }

    // Dedicated GND component anchors 0V net
    const gndComp = components.find((c) => c.type === 'GND' || c.type === 'GROUND');
    if (gndComp && gndComp.pins.length > 0) {
      const gndPinKey = `${gndComp.id}:${gndComp.pins[0].id}`;
      this.gndNetId = this.netMap.get(gndPinKey) || 'GND';
    } else {
      // Look for MCU or power supply GND / negative pin
      let foundGnd = false;
      for (const c of components) {
        if (
          c.type.startsWith('ARDUINO_') ||
          c.type.startsWith('ESP32') ||
          c.type.startsWith('STM32') ||
          c.type.startsWith('RASPBERRY_PI')
        ) {
          const gPin =
            this.netMap.get(`${c.id}:GND`) ||
            this.netMap.get(`${c.id}:GND_1`) ||
            this.netMap.get(`${c.id}:GND_2`) ||
            this.netMap.get(`${c.id}:GND_3`);
          if (gPin) {
            this.gndNetId = gPin;
            foundGnd = true;
            break;
          }
        } else if (c.type === 'DC_VOLTAGE' || c.type.includes('BATTERY')) {
          const nPin =
            this.netMap.get(`${c.id}:-`) ||
            this.netMap.get(`${c.id}:n`) ||
            this.netMap.get(`${c.id}:2`) ||
            this.netMap.get(`${c.id}:neg`);
          if (nPin) {
            this.gndNetId = nPin;
            foundGnd = true;
            break;
          }
        }
      }
      if (!foundGnd) {
        this.gndNetId = this.nets.values().next().value || 'GND';
      }
    }
  }

  /**
   * Helper: Check whether a component pin is actually connected to an external circuit path
   * (via wires or breadboard tie-points) and not floating / open-circuit.
   */
  public isPinConnected(comp: CircuitComponent, pinId: string, wires: CircuitWire[]): boolean {
    const pTarget = pinId.toLowerCase();
    const hasWire = wires.some((w) => {
      const fromMatch = w.fromCompId === comp.id && String(w.fromPinId).toLowerCase() === pTarget;
      const toMatch = w.toCompId === comp.id && String(w.toPinId).toLowerCase() === pTarget;
      return fromMatch || toMatch;
    });
    if (hasWire) return true;

    // Check if this pin is connected through netlist union (e.g. breadboard tie-points) to another component
    const pinKey = `${comp.id}:${pinId}`;
    const root = this.netMap.get(pinKey);
    if (!root) return false;

    for (const [k, r] of this.netMap.entries()) {
      if (r === root && k !== pinKey && !k.startsWith(`${comp.id}:`)) {
        return true;
      }
    }
    return false;
  }

  private getRgbComPinId(comp: CircuitComponent): string | null {
    const p = comp.pins.find((pin) => {
      const id = pin.id.toLowerCase();
      const name = pin.name.toLowerCase();
      return (
        id === 'cc' ||
        id === 'com' ||
        id === 'c' ||
        id === '2' ||
        id === 'gnd' ||
        id === 'cathode' ||
        id === 'anode' ||
        id === '-' ||
        id === '+' ||
        name.includes('com') ||
        name.includes('cathode') ||
        name.includes('anode') ||
        name === 'gnd' ||
        name === '-' ||
        name === '+'
      );
    });
    return p ? p.id : (comp.pins[1]?.id || 'cc');
  }

  private getRgbChannelPinId(comp: CircuitComponent, channel: 'r' | 'g' | 'b'): string | null {
    const p = comp.pins.find((pin) => {
      const id = pin.id.toLowerCase();
      const name = pin.name.toLowerCase();
      if (channel === 'r') return id === 'r' || id === '1' || id === 'red' || name === 'r' || name.includes('red');
      if (channel === 'g') return id === 'g' || id === '3' || id === 'green' || name === 'g' || name.includes('green');
      if (channel === 'b') return id === 'b' || id === '4' || id === 'blue' || name === 'b' || name.includes('blue');
      return false;
    });
    if (p) return p.id;
    if (channel === 'r') return comp.pins[0]?.id || 'r';
    if (channel === 'g') return comp.pins[2]?.id || 'g';
    if (channel === 'b') return comp.pins[3]?.id || 'b';
    return null;
  }

  /**
   * Solve a single transient simulation timestep using Modified Nodal Analysis (MNA)
   * with exact KCL conductance matrix relaxation.
   */
  public step(
    components: CircuitComponent[],
    wires: CircuitWire[],
    dt: number = 0.0001,
    timeScale: number = 1.0,
    instruments?: VirtualInstrumentState,
    gpioStates?: Record<string | number, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>
  ): SolverStepResult {
    this.currentTime += dt * timeScale;
    this.buildNets(components, wires);

    const nodeVoltages: Record<string, number> = {};
    const fixedNodes = new Set<string>();

    for (const net of this.nets) {
      nodeVoltages[net] = 0;
    }
    nodeVoltages[this.gndNetId] = 0;
    fixedNodes.add(this.gndNetId);

    // 1. Process Independent Fixed DC & AC Voltage Sources & MCU Output Pins
    const dcSources: Array<{ comp: CircuitComponent; pNet: string; nNet: string; vVal: number }> = [];

    for (const comp of components) {
      if (comp.type === 'DC_VOLTAGE' || comp.type.includes('BATTERY')) {
        const pNet =
          this.netMap.get(`${comp.id}:+`) ||
          this.netMap.get(`${comp.id}:p`) ||
          this.netMap.get(`${comp.id}:1`) ||
          this.netMap.get(`${comp.id}:pos`);
        const nNet =
          this.netMap.get(`${comp.id}:-`) ||
          this.netMap.get(`${comp.id}:n`) ||
          this.netMap.get(`${comp.id}:2`) ||
          this.netMap.get(`${comp.id}:neg`);
        const parsedVal =
          comp.parameters?.voltage !== undefined
            ? Number(comp.parameters.voltage)
            : parseFloat(String(comp.value ?? ''));
        const vVal = Number.isFinite(parsedVal) ? parsedVal : 9.0;

        if (pNet && nNet) {
          if (pNet === nNet) {
            const shortFault = `FAULT: Direct short circuit detected across ${comp.label || 'Power Source'}! Terminals are connected together.`;
            if (!this.recordedFaults.some((f) => f.compId === comp.id && f.type === 'SHORT_CIRCUIT')) {
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Power Source',
                type: 'SHORT_CIRCUIT',
                message: shortFault,
                timestamp: Date.now(),
              });
            }
          } else {
            dcSources.push({ comp, pNet, nNet, vVal });
          }
        }
      } else if (comp.type === 'FUNCTION_GENERATOR') {
        const pNet = this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:+`);
        const nNet = this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:-`);
        const amp = Number(comp.parameters?.amplitude ?? 5.0);
        const freq = Number(comp.parameters?.frequency ?? 1000);
        const offset = Number(comp.parameters?.offset ?? 0);
        const wave = String(comp.parameters?.waveform ?? 'sine');
        const duty = comp.parameters?.dutyCycle !== undefined ? Number(comp.parameters.dutyCycle) : undefined;
        const phaseDeg = comp.parameters?.phaseDeg !== undefined ? Number(comp.parameters.phaseDeg) : undefined;

        const instantV = this.evaluateWaveform(wave, freq, amp, offset, duty, phaseDeg, this.currentTime);

        if (pNet && nNet && pNet !== nNet) {
          if (nNet === this.gndNetId || fixedNodes.has(nNet)) {
            if (!fixedNodes.has(pNet)) {
              nodeVoltages[pNet] = (nodeVoltages[nNet] || 0) + instantV;
              fixedNodes.add(pNet);
            }
          } else if (pNet === this.gndNetId || fixedNodes.has(pNet)) {
            if (!fixedNodes.has(nNet)) {
              nodeVoltages[nNet] = (nodeVoltages[pNet] || 0) - instantV;
              fixedNodes.add(nNet);
            }
          } else {
            dcSources.push({ comp, pNet, nNet, vVal: instantV });
          }
        }
      } else if (
        comp.type.startsWith('ARDUINO_') ||
        comp.type.startsWith('ESP32') ||
        comp.type.startsWith('STM32') ||
        comp.type.startsWith('RASPBERRY_PI_PICO') ||
        comp.type === 'MCU_ARDUINO_UNO' ||
        comp.type.includes('MCU')
      ) {
        // Board Power Supply (supports USB 5.0V and DC Barrel Jack 9.0V/12.0V)
        const isDcPowered = comp.parameters?.dcJackPlugged === true;
        const isUsbPowered = !isDcPowered && comp.parameters?.usbPlugged !== false;
        const isPowered = isUsbPowered || isDcPowered;

        // Support all power rails across Arduino Uno/Nano/Mega, ESP32, Raspberry Pi Pico
        const pwr5VPins = [
          this.netMap.get(`${comp.id}:5V`),
          this.netMap.get(`${comp.id}:5V_1`),
          this.netMap.get(`${comp.id}:VBUS`),
          this.netMap.get(`${comp.id}:VSYS`),
        ].filter(Boolean) as string[];

        const pwr3V3Pins = [
          this.netMap.get(`${comp.id}:3V3`),
          this.netMap.get(`${comp.id}:3.3V`),
          this.netMap.get(`${comp.id}:3V3_OUT`),
        ].filter(Boolean) as string[];

        const vinPin = this.netMap.get(`${comp.id}:VIN`);

        // Support all GND pin designators across Uno, Nano, Mega, ESP32, Pico
        const gndPins = [
          this.netMap.get(`${comp.id}:GND`),
          this.netMap.get(`${comp.id}:GND_1`),
          this.netMap.get(`${comp.id}:GND_2`),
          this.netMap.get(`${comp.id}:GND_3`),
          this.netMap.get(`${comp.id}:GND_4`),
          this.netMap.get(`${comp.id}:GND_5`),
          this.netMap.get(`${comp.id}:GND_6`),
          this.netMap.get(`${comp.id}:GND_7`),
          this.netMap.get(`${comp.id}:GND_8`),
          this.netMap.get(`${comp.id}:GND_TOP`),
          this.netMap.get(`${comp.id}:GND_EXT`),
        ].filter(Boolean) as string[];

        if (isPowered) {
          // Anchor 0V GND nodes
          for (const gNet of gndPins) {
            if (!fixedNodes.has(gNet)) {
              nodeVoltages[gNet] = 0.0;
              fixedNodes.add(gNet);
            }
          }

          // Anchor Regulated 5.0V / 3.3V nodes
          for (const p5 of pwr5VPins) {
            if (!fixedNodes.has(p5)) {
              nodeVoltages[p5] = 5.0;
              fixedNodes.add(p5);
            }
          }
          for (const p3 of pwr3V3Pins) {
            if (!fixedNodes.has(p3)) {
              nodeVoltages[p3] = 3.3;
              fixedNodes.add(p3);
            }
          }
          if (isDcPowered && vinPin && !fixedNodes.has(vinPin)) {
            nodeVoltages[vinPin] = Number(comp.parameters?.dcVoltage ?? 9.0);
            fixedNodes.add(vinPin);
          }

          // Bidirectional Microcontroller Firmware GPIO Pin Driving
          if (gpioStates) {
            const logicV =
              comp.type.includes('ESP32') || comp.type.includes('PICO') || comp.type.includes('STM32')
                ? 3.3
                : 5.0;
            for (const [pinKey, st] of Object.entries(gpioStates)) {
              if (st.mode === 'OUTPUT') {
                const targetNet =
                  this.netMap.get(`${comp.id}:${pinKey}`) ||
                  this.netMap.get(`${comp.id}:D${pinKey}`) ||
                  this.netMap.get(`${comp.id}:A${pinKey}`) ||
                  this.netMap.get(`${comp.id}:GP${pinKey}`) ||
                  this.netMap.get(`${comp.id}:pin_${pinKey}`) ||
                  this.netMap.get(`${comp.id}:pin${pinKey}`);
                if (targetNet && !fixedNodes.has(targetNet)) {
                  const outVolt =
                    st.analogVal > 0
                      ? (st.analogVal / 255) * logicV
                      : st.value === 1
                      ? logicV
                      : 0.0;
                  nodeVoltages[targetNet] = outVolt;
                  fixedNodes.add(targetNet);
                }
              }
            }
          }
        } else {
          // Unpowered MCU: USB unplugged and no external power -> strictly clamp 5V, 3.3V, VIN, and all GPIOs to 0.0V (zero ghost voltage)
          for (const p5 of pwr5VPins) {
            if (!fixedNodes.has(p5)) {
              nodeVoltages[p5] = 0.0;
              fixedNodes.add(p5);
            }
          }
          for (const p3 of pwr3V3Pins) {
            if (!fixedNodes.has(p3)) {
              nodeVoltages[p3] = 0.0;
              fixedNodes.add(p3);
            }
          }
          if (vinPin && !fixedNodes.has(vinPin)) {
            nodeVoltages[vinPin] = 0.0;
            fixedNodes.add(vinPin);
          }
          for (const gNet of gndPins) {
            if (!fixedNodes.has(gNet)) {
              nodeVoltages[gNet] = 0.0;
              fixedNodes.add(gNet);
            }
          }
          if (gpioStates) {
            for (const pinKey of Object.keys(gpioStates)) {
              const targetNet =
                this.netMap.get(`${comp.id}:${pinKey}`) ||
                this.netMap.get(`${comp.id}:D${pinKey}`) ||
                this.netMap.get(`${comp.id}:A${pinKey}`) ||
                this.netMap.get(`${comp.id}:GP${pinKey}`) ||
                this.netMap.get(`${comp.id}:pin_${pinKey}`);
              if (targetNet && !fixedNodes.has(targetNet)) {
                nodeVoltages[targetNet] = 0.0;
                fixedNodes.add(targetNet);
              }
            }
          }
        }
      }
    }

    // Anchor grounded DC sources and propagate across series batteries connected to already-fixed nodes
    let newlyFixed = true;
    let fixPasses = 0;
    while (newlyFixed && fixPasses < 10) {
      newlyFixed = false;
      fixPasses++;
      for (const src of dcSources) {
        const { pNet, nNet, vVal } = src;
        if (nNet === this.gndNetId || fixedNodes.has(nNet)) {
          if (!fixedNodes.has(pNet)) {
            nodeVoltages[pNet] = (nodeVoltages[nNet] || 0) + vVal;
            fixedNodes.add(pNet);
            newlyFixed = true;
          }
        } else if (pNet === this.gndNetId || fixedNodes.has(pNet)) {
          if (!fixedNodes.has(nNet)) {
            nodeVoltages[nNet] = (nodeVoltages[pNet] || 0) - vVal;
            fixedNodes.add(nNet);
            newlyFixed = true;
          }
        }
      }
    }

    // Initialize dynamic capacitor node voltages from previous time step
    for (const comp of components) {
      if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
        const pin1 = this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:+`) || this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:pos`);
        const pin2 = this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:-`) || this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:neg`);
        const prevVc = this.capacitorVoltages.get(comp.id) ?? 0;
        if (pin1 && pin2 && pin1 !== pin2 && !fixedNodes.has(pin1)) {
          nodeVoltages[pin1] = (nodeVoltages[pin2] || 0) + prevVc;
        }
      }
    }

    // Pre-compute Bench AWG CH1 & CH2 voltages ONCE per step before the KCL relaxation loop
    let instantGenV = 0;
    let hasGen1 = false;
    let instantGenV2 = 0;
    let hasGen2 = false;

    const awgTheveninSources: Array<{ net: string; voltage: number; g: number }> = [];

    if (instruments?.functionGenerator?.enabled) {
      const fg = instruments.functionGenerator;
      instantGenV = this.evaluateWaveform(
        fg.waveform,
        fg.frequencyHz,
        fg.amplitudeV,
        fg.offsetV,
        fg.dutyCycle,
        fg.phaseDeg,
        this.currentTime
      );
      hasGen1 = true;

      const resolvedNet = fg.outputNet
        ? (this.netMap.get(fg.outputNet) || (this.nets.has(fg.outputNet) ? fg.outputNet : undefined))
        : undefined;

      if (resolvedNet && resolvedNet !== this.gndNetId) {
        if (fg.outputImpedance === '50') {
          awgTheveninSources.push({ net: resolvedNet, voltage: instantGenV, g: 1 / 50 });
        } else {
          // 'High-Z' or default ideal voltage drive
          if (!fixedNodes.has(resolvedNet)) {
            nodeVoltages[resolvedNet] = instantGenV;
            fixedNodes.add(resolvedNet);
          } else {
            // If already fixed by another power source, stamp with g = 0.02 instead of colliding
            awgTheveninSources.push({ net: resolvedNet, voltage: instantGenV, g: 0.02 });
          }
        }
      }
    }

    if (instruments?.functionGenerator?.channel2?.enabled) {
      const fg = instruments.functionGenerator;
      const fg2 = fg.channel2!;
      instantGenV2 = this.evaluateWaveform(
        fg2.waveform,
        fg2.frequencyHz,
        fg2.amplitudeV,
        fg2.offsetV,
        fg2.dutyCycle,
        undefined,
        this.currentTime
      );
      hasGen2 = true;

      const resolvedNet2 = fg2.outputNet
        ? (this.netMap.get(fg2.outputNet) || (this.nets.has(fg2.outputNet) ? fg2.outputNet : undefined))
        : undefined;

      if (resolvedNet2 && resolvedNet2 !== this.gndNetId) {
        const imp2 = (fg2 as { outputImpedance?: string })?.outputImpedance || fg.outputImpedance;
        if (imp2 === '50') {
          awgTheveninSources.push({ net: resolvedNet2, voltage: instantGenV2, g: 1 / 50 });
        } else {
          if (!fixedNodes.has(resolvedNet2)) {
            nodeVoltages[resolvedNet2] = instantGenV2;
            fixedNodes.add(resolvedNet2);
          } else {
            awgTheveninSources.push({ net: resolvedNet2, voltage: instantGenV2, g: 0.02 });
          }
        }
      }
    }

    // 2. Iterative Modified Nodal Analysis (MNA) with KCL Conductance Formulation
    const iterations = 120;
    for (let iter = 0; iter < iterations; iter++) {
      let stateChanged = false;
      const sumGV: Record<string, number> = {};
      const sumG: Record<string, number> = {};

      for (const net of this.nets) {
        sumGV[net] = 0;
        sumG[net] = 0;
      }

      // Stamp active AWG Thevenin sources inside EVERY iteration
      for (const src of awgTheveninSources) {
        sumGV[src.net] += src.g * src.voltage;
        sumG[src.net] += src.g;
      }

      for (const comp of components) {
        if (comp.type === 'DC_VOLTAGE' || comp.type.includes('BATTERY')) {
          const pNet =
            this.netMap.get(`${comp.id}:+`) ||
            this.netMap.get(`${comp.id}:p`) ||
            this.netMap.get(`${comp.id}:1`) ||
            this.netMap.get(`${comp.id}:pos`);
          const nNet =
            this.netMap.get(`${comp.id}:-`) ||
            this.netMap.get(`${comp.id}:n`) ||
            this.netMap.get(`${comp.id}:2`) ||
            this.netMap.get(`${comp.id}:neg`);
          if (pNet && nNet && pNet !== nNet) {
            const pFixed = fixedNodes.has(pNet);
            const nFixed = fixedNodes.has(nNet);
            if (!pFixed || !nFixed) {
              const parsedVal =
                comp.parameters?.voltage !== undefined
                  ? Number(comp.parameters.voltage)
                  : parseFloat(String(comp.value ?? ''));
              const vVal = Number.isFinite(parsedVal) ? parsedVal : 9.0;
              const gSrc = 10.0; // 0.1 ohm realistic internal resistance

              const vp = nodeVoltages[pNet] || 0;
              const vn = nodeVoltages[nNet] || 0;

              if (!pFixed) {
                sumGV[pNet] += gSrc * (vn + vVal);
                sumG[pNet] += gSrc;
              }
              if (!nFixed) {
                sumGV[nNet] += gSrc * (vp - vVal);
                sumG[nNet] += gSrc;
              }
            }
          }
        } else if (comp.type === 'FUNCTION_GENERATOR') {
          const pNet = this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:+`);
          const nNet = this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:-`);
          if (pNet && nNet && pNet !== nNet) {
            const pFixed = fixedNodes.has(pNet);
            const nFixed = fixedNodes.has(nNet);
            if (!pFixed || !nFixed) {
              const amp = Number(comp.parameters?.amplitude ?? 5.0);
              const freq = Number(comp.parameters?.frequency ?? 1000);
              const offset = Number(comp.parameters?.offset ?? 0);
              const wave = String(comp.parameters?.waveform ?? 'sine');
              const duty = comp.parameters?.dutyCycle !== undefined ? Number(comp.parameters.dutyCycle) : undefined;
              const phaseDeg = comp.parameters?.phaseDeg !== undefined ? Number(comp.parameters.phaseDeg) : undefined;
              const instantV = this.evaluateWaveform(wave, freq, amp, offset, duty, phaseDeg, this.currentTime);

              const gSrc = 10.0;
              const vp = nodeVoltages[pNet] || 0;
              const vn = nodeVoltages[nNet] || 0;

              if (!pFixed) {
                sumGV[pNet] += gSrc * (vn + instantV);
                sumG[pNet] += gSrc;
              }
              if (!nFixed) {
                sumGV[nNet] += gSrc * (vp - instantV);
                sumG[nNet] += gSrc;
              }
            }
          }
        } else if (comp.type === 'RESISTOR') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
            if (this.burnedComponents.has(comp.id)) {
              // Burned out open circuit: minimal leakage
              const g = 1e-12;
              sumG[pin1] += g;
              sumG[pin2] += g;
            } else {
              const r = Math.max(Number(comp.parameters?.resistance ?? 1000), 0.01);
              const g = 1.0 / r;

              const v1 = nodeVoltages[pin1] || 0;
              const v2 = nodeVoltages[pin2] || 0;

              sumGV[pin1] += g * v2;
              sumG[pin1] += g;

              sumGV[pin2] += g * v1;
              sumG[pin2] += g;
            }
          }
        } else if (comp.type === 'POTENTIOMETER') {
          // Robust 3-terminal Potentiometer resolution: Terminal A (0%), Wiper, and Terminal B (100%)
          const { pinA, pinWiper, pinB } = getPotentiometerPins(comp, this.netMap);
          const rTotal = Math.max(Number(comp.parameters?.resistance ?? 10000), 1.0);
          const alpha = Math.max(0.001, Math.min(0.999, Number(comp.parameters?.wiperPosition ?? 0.5)));
          // Standard convention: alpha = 0.0 is Terminal A (Pin 1), alpha = 1.0 is Terminal B (Pin 3)
          const r1 = Math.max(rTotal * alpha, 0.01);         // Resistance between Terminal A and Wiper
          const r2 = Math.max(rTotal * (1.0 - alpha), 0.01); // Resistance between Wiper and Terminal B

          if (pinA && pinWiper && pinA !== pinWiper) {
            const g1 = 1.0 / r1;
            sumGV[pinA] += g1 * (nodeVoltages[pinWiper] || 0);
            sumG[pinA] += g1;
            sumGV[pinWiper] += g1 * (nodeVoltages[pinA] || 0);
            sumG[pinWiper] += g1;
          }
          if (pinB && pinWiper && pinB !== pinWiper) {
            const g2 = 1.0 / r2;
            sumGV[pinB] += g2 * (nodeVoltages[pinWiper] || 0);
            sumG[pinB] += g2;
            sumGV[pinWiper] += g2 * (nodeVoltages[pinB] || 0);
            sumG[pinWiper] += g2;
          }
          if (pinA && pinB && pinA !== pinB && (!pinWiper || (pinWiper !== pinA && pinWiper !== pinB))) {
            const gTotal = 1.0 / (r1 + r2);
            sumGV[pinA] += gTotal * (nodeVoltages[pinB] || 0);
            sumG[pinA] += gTotal;
            sumGV[pinB] += gTotal * (nodeVoltages[pinA] || 0);
            sumG[pinB] += gTotal;
          }
        } else if (comp.type === 'INDUCTOR') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
            const lVal = Math.max(Number(comp.parameters?.inductance ?? 0.01), 0.000001); // 10mH default
            const gEq = dt / lVal;
            const prevIl = this.inductorCurrents.get(comp.id) ?? 0;

            sumGV[pin1] -= prevIl;
            sumG[pin1] += gEq;

            sumGV[pin2] += prevIl;
            sumG[pin2] += gEq;

            const v1 = nodeVoltages[pin1] || 0;
            const v2 = nodeVoltages[pin2] || 0;
            const newIl = prevIl + (v1 - v2) * gEq;
            this.inductorCurrents.set(comp.id, newIl * 0.999);
          }
        } else if (comp.type === 'SWITCH_SPST') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
            const isClosed = comp.parameters?.closed !== false;
            const g = isClosed ? 100.0 : 1e-9;
            const v1 = nodeVoltages[pin1] || 0;
            const v2 = nodeVoltages[pin2] || 0;
            sumGV[pin1] += g * v2;
            sumG[pin1] += g;
            sumGV[pin2] += g * v1;
            sumG[pin2] += g;
          }
        } else if (
          comp.type === 'PUSHBUTTON_NO' ||
          comp.type === 'PUSHBUTTON_NC' ||
          comp.type === 'EMERGENCY_STOP' ||
          comp.type === 'SWITCH_DPST' ||
          comp.type === 'SWITCH_DPDT' ||
          comp.type === 'SWITCH_LIMIT' ||
          comp.type === 'SWITCH_ISOLATOR' ||
          comp.type === 'SWITCH_KEY' ||
          comp.type === 'SWITCH_MICRO' ||
          comp.type === 'SWITCH_FOOT'
        ) {
          let isClosed = false;
          if (comp.type === 'PUSHBUTTON_NO') {
            isClosed = comp.parameters?.closed === true;
          } else if (comp.type === 'PUSHBUTTON_NC' || comp.type === 'EMERGENCY_STOP') {
            isClosed = comp.parameters?.closed !== false && !comp.parameters?.latched;
          } else if (comp.type === 'SWITCH_ISOLATOR') {
            isClosed = comp.parameters?.closed !== false;
          } else {
            isClosed = comp.parameters?.closed === true;
          }

          const g = isClosed ? 100.0 : 1e-9;
          const switchPairs = [
            ['1', '2'],
            ['3', '4'],
            ['5', '6'],
            ['13', '14'],
            ['com1', 'no1'],
            ['com2', 'no2'],
            ['com', 'no'],
          ];
          for (const [pA, pB] of switchPairs) {
            const pinA = this.netMap.get(`${comp.id}:${pA}`);
            const pinB = this.netMap.get(`${comp.id}:${pB}`);
            if (pinA && pinB && pinA !== pinB) {
              const vA = nodeVoltages[pinA] || 0;
              const vB = nodeVoltages[pinB] || 0;
              sumGV[pinA] += g * vB;
              sumG[pinA] += g;
              sumGV[pinB] += g * vA;
              sumG[pinB] += g;
            }
          }
        } else if (
          comp.type === 'CONTACTOR_MAIN' ||
          comp.type === 'INDUSTRIAL_RELAY_24V' ||
          comp.type === 'ACTUATOR_RELAY_5V' ||
          comp.type === 'RELAY_ELECTROMECHANICAL' ||
          comp.type === 'RELAY_TIMER' ||
          comp.type === 'AUXILIARY_CONTACT_BLOCK'
        ) {
          // Coil pins A1 and A2 (or 13/14 for DPDT relay)
          const a1Pin = this.netMap.get(`${comp.id}:a1`) || this.netMap.get(`${comp.id}:13`);
          const a2Pin = this.netMap.get(`${comp.id}:a2`) || this.netMap.get(`${comp.id}:14`);
          let isEnergized = comp.parameters?.energized === true;

          if (a1Pin && a2Pin && a1Pin !== a2Pin) {
            const v1 = nodeVoltages[a1Pin] || 0;
            const v2 = nodeVoltages[a2Pin] || 0;
            const vCoil = Math.abs(v1 - v2);
            const rCoil = Math.max(Number(comp.parameters?.coilResistance ?? 360.0), 10.0);
            const gCoil = 1.0 / rCoil;
            sumGV[a1Pin] += gCoil * v2;
            sumG[a1Pin] += gCoil;
            sumGV[a2Pin] += gCoil * v1;
            sumG[a2Pin] += gCoil;

            const ratedV = Number(comp.parameters?.coilVoltageV ?? (comp.type === 'ACTUATOR_RELAY_5V' ? 5.0 : 24.0));
            const pickupV = ratedV * 0.7; // Standard 70% coil pickup threshold
            if (vCoil >= pickupV) {
              isEnergized = true;
            }
          }

          // Main 3-Phase Power Poles and NO Auxiliary Contacts
          const noPairs = [
            ['1', '2'],
            ['3', '4'],
            ['5', '6'],
            ['13', '14'], // NO aux latching contact on contactor or relay
            ['53', '54'], // NO on auxiliary contact block
            ['5', '9'],   // NO1 on DPDT relay
            ['8', '12'],  // NO2 on DPDT relay
            ['no', 'com'],
          ];

          const noConductance = isEnergized ? 100.0 : 1e-9;
          for (const [pA, pB] of noPairs) {
            const pinA = this.netMap.get(`${comp.id}:${pA}`);
            const pinB = this.netMap.get(`${comp.id}:${pB}`);
            if (pinA && pinB && pinA !== pinB) {
              const vA = nodeVoltages[pinA] || 0;
              const vB = nodeVoltages[pinB] || 0;
              sumGV[pinA] += noConductance * vB;
              sumG[pinA] += noConductance;
              sumGV[pinB] += noConductance * vA;
              sumG[pinB] += noConductance;
            }
          }

          // NC Auxiliary Contacts (open when energized, closed when de-energized)
          const ncPairs = [
            ['21', '22'],
            ['61', '62'],
            ['1', '9'],
            ['4', '12'],
            ['16', '15'],
            ['nc', 'com'],
          ];
          const ncConductance = isEnergized ? 1e-9 : 100.0;
          for (const [pA, pB] of ncPairs) {
            const pinA = this.netMap.get(`${comp.id}:${pA}`);
            const pinB = this.netMap.get(`${comp.id}:${pB}`);
            if (pinA && pinB && pinA !== pinB) {
              const vA = nodeVoltages[pinA] || 0;
              const vB = nodeVoltages[pinB] || 0;
              sumGV[pinA] += ncConductance * vB;
              sumG[pinA] += ncConductance;
              sumGV[pinB] += ncConductance * vA;
              sumG[pinB] += ncConductance;
            }
          }
        } else if (
          comp.type.startsWith('PROTECTION_') ||
          comp.type === 'DIN_RAIL_TERMINAL' ||
          comp.type === 'TERMINAL_PE_N'
        ) {
          const isTripped = comp.parameters?.tripped === true;
          const isClosed = !isTripped && comp.parameters?.closed !== false;
          const g = isClosed ? 100.0 : 1e-9;
          const breakerPairs = [
            ['1', '2'],
            ['3', '4'],
            ['5', '6'],
            ['n_in', 'n_out'],
            ['pe1', 'pe2'],
            ['n1', 'n2'],
          ];
          for (const [pA, pB] of breakerPairs) {
            const pinA = this.netMap.get(`${comp.id}:${pA}`);
            const pinB = this.netMap.get(`${comp.id}:${pB}`);
            if (pinA && pinB && pinA !== pinB) {
              const vA = nodeVoltages[pinA] || 0;
              const vB = nodeVoltages[pinB] || 0;
              sumGV[pinA] += g * vB;
              sumG[pinA] += g;
              sumGV[pinB] += g * vA;
              sumG[pinB] += g;
            }
          }
        } else if (comp.type === 'POWER_SUPPLY_24V') {
          const vPosPin = this.netMap.get(`${comp.id}:v_pos`);
          const vNegPin = this.netMap.get(`${comp.id}:v_neg`);
          const vNeg = vNegPin ? (nodeVoltages[vNegPin] || 0) : 0;
          if (vPosPin) {
            nodeVoltages[vPosPin] = vNeg + 24.0;
            fixedNodes.add(vPosPin);
          }
        } else if (comp.type === 'BJT_NPN') {
          const bPin = this.netMap.get(`${comp.id}:b`) || this.netMap.get(`${comp.id}:B`) || this.netMap.get(`${comp.id}:1`);
          const cPin = this.netMap.get(`${comp.id}:c`) || this.netMap.get(`${comp.id}:C`) || this.netMap.get(`${comp.id}:2`);
          const ePin = this.netMap.get(`${comp.id}:e`) || this.netMap.get(`${comp.id}:E`) || this.netMap.get(`${comp.id}:3`);
          if (bPin && cPin && ePin) {
            if (this.burnedComponents.has(comp.id)) {
              sumG[bPin] += 1e-12;
              sumG[cPin] += 1e-12;
              sumG[ePin] += 1e-12;
              continue;
            }
            const vb = nodeVoltages[bPin] || 0;
            const vc = nodeVoltages[cPin] || 0;
            const ve = nodeVoltages[ePin] || 0;
            const vbe = vb - ve;
            const vce = vc - ve;
            const beta = Math.max(Number(comp.parameters?.beta ?? 100), 1);

            const isConducting = vbe > 0.65;
            const gbe = isConducting ? 0.04 : 1e-6;
            const ib = isConducting ? Math.max(0, (vbe - 0.65) * gbe) : 0;

            const icTarget = beta * ib;
            const gce = isConducting && vce >= 0 ? Math.min(10.0, Math.max(0.001, icTarget / Math.max(vce - 0.2, 0.1))) : 1e-6;
            const ic = isConducting && vce >= 0 ? gce * (vce - 0.2) : 0;

            this.bjtCurrents.set(comp.id, { ib, ic });

            // Base-Emitter Diode Formulation
            sumGV[bPin] += gbe * (ve + 0.65);
            sumG[bPin] += gbe;
            sumGV[ePin] += gbe * (vb - 0.65);
            sumG[ePin] += gbe;

            // Collector-Emitter Controlled Channel Formulation
            sumGV[cPin] += gce * (ve + 0.2);
            sumG[cPin] += gce;
            sumGV[ePin] += gce * (vc - 0.2);
            sumG[ePin] += gce;
          }
        } else if (comp.type === 'BJT_PNP') {
          const bPin = this.netMap.get(`${comp.id}:b`) || this.netMap.get(`${comp.id}:B`) || this.netMap.get(`${comp.id}:1`);
          const cPin = this.netMap.get(`${comp.id}:c`) || this.netMap.get(`${comp.id}:C`) || this.netMap.get(`${comp.id}:2`);
          const ePin = this.netMap.get(`${comp.id}:e`) || this.netMap.get(`${comp.id}:E`) || this.netMap.get(`${comp.id}:3`);
          if (bPin && cPin && ePin) {
            if (this.burnedComponents.has(comp.id)) {
              sumG[bPin] += 1e-12;
              sumG[cPin] += 1e-12;
              sumG[ePin] += 1e-12;
              continue;
            }
            const vb = nodeVoltages[bPin] || 0;
            const vc = nodeVoltages[cPin] || 0;
            const ve = nodeVoltages[ePin] || 0;
            const veb = ve - vb;
            const vec = ve - vc;
            const beta = Math.max(Number(comp.parameters?.beta ?? 100), 1);

            const isConducting = veb > 0.65;
            const gbe = isConducting ? 0.04 : 1e-6;
            const ib = isConducting ? Math.max(0, (veb - 0.65) * gbe) : 0;

            const icTarget = beta * ib;
            const gce = isConducting && vec >= 0 ? Math.min(10.0, Math.max(0.001, icTarget / Math.max(vec - 0.2, 0.1))) : 1e-6;
            const ic = isConducting && vec >= 0 ? gce * (vec - 0.2) : 0;

            this.bjtCurrents.set(comp.id, { ib, ic });

            // Emitter-Base Diode Formulation
            sumGV[ePin] += gbe * (vb + 0.65);
            sumG[ePin] += gbe;
            sumGV[bPin] += gbe * (ve - 0.65);
            sumG[bPin] += gbe;

            // Emitter-Collector Controlled Channel Formulation
            sumGV[ePin] += gce * (vc + 0.2);
            sumG[ePin] += gce;
            sumGV[cPin] += gce * (ve - 0.2);
            sumG[cPin] += gce;
          }
        } else if (comp.type === 'MOSFET_N') {
          const gPin = this.netMap.get(`${comp.id}:g`) || this.netMap.get(`${comp.id}:G`) || this.netMap.get(`${comp.id}:1`);
          const dPin = this.netMap.get(`${comp.id}:d`) || this.netMap.get(`${comp.id}:D`) || this.netMap.get(`${comp.id}:2`);
          const sPin = this.netMap.get(`${comp.id}:s`) || this.netMap.get(`${comp.id}:S`) || this.netMap.get(`${comp.id}:3`);
          if (gPin && dPin && sPin) {
            if (this.burnedComponents.has(comp.id)) {
              sumG[gPin] += 1e-12;
              sumG[dPin] += 1e-12;
              sumG[sPin] += 1e-12;
              continue;
            }
            const vg = nodeVoltages[gPin] || 0;
            const vd = nodeVoltages[dPin] || 0;
            const vs = nodeVoltages[sPin] || 0;
            const vgs = vg - vs;
            const vth = Number(comp.parameters?.vgsTh ?? 3.0);
            const rdsOn = Math.max(Number(comp.parameters?.rdsOn ?? 0.044), 0.001);

            const isConducting = vgs >= vth;
            const gds = isConducting ? Math.min(1.0 / rdsOn, Math.max(0.1, (vgs - vth) * 10.0)) : 1e-9;

            // Insulated gate leakage resistance for MNA numerical stability
            sumG[gPin] += 1e-9;

            // Drain-Source conduction channel
            sumGV[dPin] += gds * vs;
            sumG[dPin] += gds;
            sumGV[sPin] += gds * vd;
            sumG[sPin] += gds;
          }
        } else if (comp.type.startsWith('REGULATOR_')) {
          const inPin = this.netMap.get(`${comp.id}:in`);
          const outPin = this.netMap.get(`${comp.id}:out`);
          const gndPin = this.netMap.get(`${comp.id}:gnd`) || this.netMap.get(`${comp.id}:adj`);
          const vIn = inPin ? (nodeVoltages[inPin] || 0) : 0;
          const vGnd = gndPin ? (nodeVoltages[gndPin] || 0) : 0;

          let targetV = 5.0;
          if (comp.type === 'REGULATOR_7812') targetV = 12.0;
          else if (comp.type === 'REGULATOR_LM317') targetV = vGnd + 1.25;
          else targetV = vGnd + 5.0;

          const regulatedV = Math.max(0, Math.min(targetV, vIn - 1.5));
          if (outPin) {
            nodeVoltages[outPin] = regulatedV;
            fixedNodes.add(outPin);
          }
        } else if (comp.type.startsWith('COMPARATOR_')) {
          const inNegPin = this.netMap.get(`${comp.id}:in_neg`);
          const inPosPin = this.netMap.get(`${comp.id}:in_pos`);
          const outPin = this.netMap.get(`${comp.id}:out`);
          const veePin = this.netMap.get(`${comp.id}:vee`);
          const vPos = inPosPin ? (nodeVoltages[inPosPin] || 0.0) : 0.0;
          const vNeg = inNegPin ? (nodeVoltages[inNegPin] || 0.0) : 0.0;
          const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;

          if (outPin) {
            if (vPos < vNeg) {
              // Open-collector pulled down to negative rail
              nodeVoltages[outPin] = vee;
              fixedNodes.add(outPin);
            }
          }
        } else if (comp.type === 'METER_AMMETER') {
          // Ammeter acts as an ultra-low resistance shunt (0.001Ω)
          const pinIn = this.netMap.get(`${comp.id}:in`);
          const pinOut = this.netMap.get(`${comp.id}:out`);
          if (pinIn && pinOut && pinIn !== pinOut) {
            const r = 0.001;
            const g = 1.0 / r;
            const v1 = nodeVoltages[pinIn] || 0;
            const v2 = nodeVoltages[pinOut] || 0;

            sumGV[pinIn] += g * v2;
            sumG[pinIn] += g;
            sumGV[pinOut] += g * v1;
            sumG[pinOut] += g;
          }
        } else if (comp.type === 'METER_VOLTMETER' || comp.type === 'METER_MULTIMETER') {
          // Voltmeter acts as very high 10MΩ impedance
          const pinP = this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:red`);
          const pinN = this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:black`);
          if (pinP && pinN && pinP !== pinN) {
            const r = 10000000;
            const g = 1.0 / r;
            sumGV[pinP] += g * (nodeVoltages[pinN] || 0);
            sumG[pinP] += g;
            sumGV[pinN] += g * (nodeVoltages[pinP] || 0);
            sumG[pinN] += g;
          }
        } else if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
          const pin1 = this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:+`) || this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:pos`);
          const pin2 = this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:-`) || this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:neg`);
          if (pin1 && pin2 && pin1 !== pin2) {
            if (this.burnedComponents.has(comp.id)) {
              // Burned out open circuit: minimal leakage
              const gCap = 1e-12;
              sumG[pin1] += gCap;
              sumG[pin2] += gCap;
              continue;
            }
            const cVal = Number(comp.parameters?.capacitance ?? 0.0000001); // 100nF default
            const gEq = cVal / Math.max(dt, 0.00001);
            const prevVc = this.capacitorVoltages.get(comp.id) ?? 0;
            const iEq = gEq * prevVc;

            const v1 = nodeVoltages[pin1] || 0;
            const v2 = nodeVoltages[pin2] || 0;

            sumGV[pin1] += gEq * v2 + iEq;
            sumG[pin1] += gEq;

            sumGV[pin2] += gEq * v1 - iEq;
            sumG[pin2] += gEq;
          }
        } else if (comp.type === 'DIODE' || comp.type === 'LED') {
          const aPin = this.netMap.get(`${comp.id}:a`) || this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:anode`);
          const kPin = this.netMap.get(`${comp.id}:k`) || this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:cathode`);
          const vf = comp.type === 'LED' ? getLedForwardVoltage(comp) : 0.7;
          if (aPin && kPin && aPin !== kPin) {
            if (this.burnedComponents.has(comp.id)) {
              // Burned out open circuit
              const gDiode = 1e-12;
              sumG[aPin] += gDiode;
              sumG[kPin] += gDiode;
            } else {
              const va = nodeVoltages[aPin] || 0;
              const vk = nodeVoltages[kPin] || 0;
              const isConducting = (va - vk) > vf;
              // 15 ohm forward dynamic resistance
              const rd = 15;
              const gDiode = isConducting ? (1.0 / rd) : 1e-6;
              const vOffset = isConducting ? vf : 0;

              sumGV[aPin] += gDiode * (vk + vOffset);
              sumG[aPin] += gDiode;

              sumGV[kPin] += gDiode * (va - vOffset);
              sumG[kPin] += gDiode;
            }
          }
        } else if (comp.type === 'ACTUATOR_RGB_LED' || comp.type === 'LED_RGB') {
          const comPinId = this.getRgbComPinId(comp);
          const isComConnected = comPinId ? this.isPinConnected(comp, comPinId, wires) : false;
          if (!isComConnected) {
            // Unconnected / floating COM pin: Kirchhoff's Current Law prevents any conduction
            continue;
          }

          const rPinId = this.getRgbChannelPinId(comp, 'r');
          const gPinId = this.getRgbChannelPinId(comp, 'g');
          const bPinId = this.getRgbChannelPinId(comp, 'b');

          const rPin = rPinId && this.isPinConnected(comp, rPinId, wires) ? this.netMap.get(`${comp.id}:${rPinId}`) : undefined;
          const gPin = gPinId && this.isPinConnected(comp, gPinId, wires) ? this.netMap.get(`${comp.id}:${gPinId}`) : undefined;
          const bPin = bPinId && this.isPinConnected(comp, bPinId, wires) ? this.netMap.get(`${comp.id}:${bPinId}`) : undefined;
          const comPin = comPinId ? this.netMap.get(`${comp.id}:${comPinId}`) : undefined;
          const isCommonAnode = comp.parameters?.commonType === 'anode';

          const channels = [
            { pin: rPin, vf: Number(comp.parameters?.redVf) || 2.0 },
            { pin: gPin, vf: Number(comp.parameters?.greenVf) || 3.0 },
            { pin: bPin, vf: Number(comp.parameters?.blueVf) || 3.2 },
          ];

          if (comPin) {
            const vCom = nodeVoltages[comPin] || 0;
            for (const ch of channels) {
              if (ch.pin && ch.pin !== comPin) {
                const vCh = nodeVoltages[ch.pin] || 0;
                const vDrop = isCommonAnode ? (vCom - vCh) : (vCh - vCom);
                const isConducting = vDrop > ch.vf;
                const gCh = isConducting ? 0.05 : 1e-6;
                const vOffset = isConducting ? ch.vf : 0;

                if (isCommonAnode) {
                  sumGV[comPin] += gCh * (vCh + vOffset);
                  sumG[comPin] += gCh;
                  sumGV[ch.pin] += gCh * (vCom - vOffset);
                  sumG[ch.pin] += gCh;
                } else {
                  sumGV[ch.pin] += gCh * (vCom + vOffset);
                  sumG[ch.pin] += gCh;
                  sumGV[comPin] += gCh * (vCh - vOffset);
                  sumG[comPin] += gCh;
                }
              }
            }
          }
        } else if (comp.type.startsWith('OPAMP_')) {
          // Operational Amplifier (Single, Dual LM358, or Quad LM324)
          const openGain = Number(comp.parameters?.openLoopGain ?? 100000);

          if (comp.type.includes('LM324')) {
            // Quad Op-Amp (DIP-14): VCC=Pin 4, GND=Pin 11
            const vccPin = this.netMap.get(`${comp.id}:4`) || this.netMap.get(`${comp.id}:vcc`) || this.netMap.get(`${comp.id}:VCC`);
            const veePin = this.netMap.get(`${comp.id}:11`) || this.netMap.get(`${comp.id}:gnd`) || this.netMap.get(`${comp.id}:GND`);
            const vcc = vccPin ? (nodeVoltages[vccPin] || 0.0) : 0.0;
            const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;
            const isPowered = vcc - vee >= 2.0;

            const channels = [
              { out: '1', inNeg: '2', inPos: '3' },
              { out: '7', inNeg: '6', inPos: '5' },
              { out: '8', inNeg: '9', inPos: '10' },
              { out: '14', inNeg: '13', inPos: '12' },
            ];

            for (const ch of channels) {
              const outNet = this.netMap.get(`${comp.id}:${ch.out}`);
              const inNegNet = this.netMap.get(`${comp.id}:${ch.inNeg}`);
              const inPosNet = this.netMap.get(`${comp.id}:${ch.inPos}`);
              if (!outNet) continue;

              if (isPowered) {
                const vPos = inPosNet ? (nodeVoltages[inPosNet] || 0.0) : 0.0;
                const vNeg = inNegNet ? (nodeVoltages[inNegNet] || 0.0) : 0.0;
                const vIdeal = (vPos - vNeg) * openGain;
                nodeVoltages[outNet] = Math.max(vee + 0.05, Math.min(vcc - 1.2, vIdeal));
              } else {
                nodeVoltages[outNet] = 0.0;
              }
              fixedNodes.add(outNet);
            }
          } else if (comp.type.includes('LM358')) {
            // Dual Op-Amp (DIP-8): VCC=Pin 8, GND=Pin 4
            const vccPin = this.netMap.get(`${comp.id}:8`) || this.netMap.get(`${comp.id}:vcc`) || this.netMap.get(`${comp.id}:VCC`);
            const veePin = this.netMap.get(`${comp.id}:4`) || this.netMap.get(`${comp.id}:gnd`) || this.netMap.get(`${comp.id}:GND`) || this.netMap.get(`${comp.id}:vee`);
            const vcc = vccPin ? (nodeVoltages[vccPin] || 0.0) : 0.0;
            const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;
            const isPowered = vcc - vee >= 2.0;

            const channels = [
              { out: '1', inNeg: '2', inPos: '3' },
              { out: '7', inNeg: '6', inPos: '5' },
            ];

            for (const ch of channels) {
              const outNet = this.netMap.get(`${comp.id}:${ch.out}`) || (ch.out === '1' ? this.netMap.get(`${comp.id}:out`) : undefined);
              const inNegNet = this.netMap.get(`${comp.id}:${ch.inNeg}`) || (ch.inNeg === '2' ? this.netMap.get(`${comp.id}:in_neg`) : undefined);
              const inPosNet = this.netMap.get(`${comp.id}:${ch.inPos}`) || (ch.inPos === '3' ? this.netMap.get(`${comp.id}:in_pos`) : undefined);
              if (!outNet) continue;

              if (isPowered) {
                const vPos = inPosNet ? (nodeVoltages[inPosNet] || 0.0) : 0.0;
                const vNeg = inNegNet ? (nodeVoltages[inNegNet] || 0.0) : 0.0;
                const vIdeal = (vPos - vNeg) * openGain;
                nodeVoltages[outNet] = Math.max(vee + 0.05, Math.min(vcc - 1.2, vIdeal));
              } else {
                nodeVoltages[outNet] = 0.0;
              }
              fixedNodes.add(outNet);
            }
          } else {
            // Generic / Single Op-Amp (LM741 etc.)
            const inNegPin = this.netMap.get(`${comp.id}:in_neg`) || this.netMap.get(`${comp.id}:2`);
            const inPosPin = this.netMap.get(`${comp.id}:in_pos`) || this.netMap.get(`${comp.id}:3`);
            const outPin = this.netMap.get(`${comp.id}:out`) || this.netMap.get(`${comp.id}:6`);
            const vccPin = this.netMap.get(`${comp.id}:vcc`) || this.netMap.get(`${comp.id}:7`);
            const veePin = this.netMap.get(`${comp.id}:vee`) || this.netMap.get(`${comp.id}:4`);

            const vcc = vccPin ? (nodeVoltages[vccPin] || 12.0) : 12.0;
            const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;
            const vPos = inPosPin ? (nodeVoltages[inPosPin] || 0.0) : 0.0;
            const vNeg = inNegPin ? (nodeVoltages[inNegPin] || 0.0) : 0.0;

            const vIdeal = (vPos - vNeg) * openGain;
            const vOutClamped = Math.max(vee + 0.05, Math.min(vcc - 1.2, vIdeal));

            if (outPin) {
              nodeVoltages[outPin] = vOutClamped;
              fixedNodes.add(outPin);
            }
          }
        } else if (comp.type.startsWith('LOGIC_')) {
          // Digital Logic Gates: 74HC series
          const aPin = this.netMap.get(`${comp.id}:a`);
          const bPin = this.netMap.get(`${comp.id}:b`);
          const outPin = this.netMap.get(`${comp.id}:out`);

          const vA = aPin ? (nodeVoltages[aPin] || 0) : 0;
          const vB = bPin ? (nodeVoltages[bPin] || 0) : 0;
          const highThresh = 2.0;

          const isHighA = vA >= highThresh;
          const isHighB = vB >= highThresh;
          let logicOutHigh = false;

          switch (comp.type) {
            case 'LOGIC_AND':
              logicOutHigh = isHighA && isHighB;
              break;
            case 'LOGIC_OR':
              logicOutHigh = isHighA || isHighB;
              break;
            case 'LOGIC_NOT':
              logicOutHigh = !isHighA;
              break;
            case 'LOGIC_NAND':
              logicOutHigh = !(isHighA && isHighB);
              break;
            case 'LOGIC_NOR':
              logicOutHigh = !(isHighA || isHighB);
              break;
            case 'LOGIC_XOR':
              logicOutHigh = isHighA !== isHighB;
              break;
            case 'LOGIC_XNOR':
              logicOutHigh = isHighA === isHighB;
              break;
          }

          const outV = logicOutHigh ? 5.0 : 0.0;
          if (outPin) {
            nodeVoltages[outPin] = outV;
            fixedNodes.add(outPin);
          }
        } else if (
          comp.type === 'IC_74HC14' ||
          comp.type === '74HC14' ||
          comp.type === 'IC_74HC04' ||
          comp.type === '74HC04' ||
          comp.type === 'IC_74HC00' ||
          comp.type === '74HC00' ||
          comp.type === 'IC_74HC08' ||
          comp.type === '74HC08' ||
          comp.type === 'IC_74HC32' ||
          comp.type === '74HC32' ||
          comp.type === 'IC_74HC86' ||
          comp.type === '74HC86'
        ) {
          // Multi-Gate Real Digital IC Packages (DIP-14)
          const vccPin =
            this.netMap.get(`${comp.id}:14`) ||
            this.netMap.get(`${comp.id}:vcc`) ||
            this.netMap.get(`${comp.id}:VCC`);
          const gndPin =
            this.netMap.get(`${comp.id}:7`) ||
            this.netMap.get(`${comp.id}:gnd`) ||
            this.netMap.get(`${comp.id}:GND`);

          const vcc = vccPin ? (nodeVoltages[vccPin] ?? 0.0) : 0.0;
          const gnd = gndPin ? (nodeVoltages[gndPin] ?? 0.0) : 0.0;
          const vSupply = vcc - gnd;
          const isPowered = vSupply >= 2.0;

          if (comp.type.includes('74HC14') || comp.type.includes('74HC04')) {
            // Hex Inverter / Hex Schmitt-Trigger Inverter (6 independent gates)
            // Gate 1: 1A (pin 1) -> 1Y (pin 2)
            // Gate 2: 2A (pin 3) -> 2Y (pin 4)
            // Gate 3: 3A (pin 5) -> 3Y (pin 6)
            // Gate 4: 4A (pin 9) -> 4Y (pin 8)
            // Gate 5: 5A (pin 11) -> 5Y (pin 10)
            // Gate 6: 6A (pin 13) -> 6Y (pin 12)
            const gates = [
              { in: '1', out: '2' },
              { in: '3', out: '4' },
              { in: '5', out: '6' },
              { in: '9', out: '8' },
              { in: '11', out: '10' },
              { in: '13', out: '12' },
            ];

            const highThresh = comp.type.includes('74HC14') ? (gnd + 0.55 * vSupply) : (gnd + 0.5 * vSupply);

            for (const gate of gates) {
              const inNet = this.netMap.get(`${comp.id}:${gate.in}`);
              const outNet = this.netMap.get(`${comp.id}:${gate.out}`);
              const targetNode = outNet || `${comp.id}:${gate.out}`;

              if (isPowered) {
                const vIn = inNet ? (nodeVoltages[inNet] ?? 0.0) : 0.0;
                const isHighIn = vIn >= highThresh;
                // Inverter: In high -> Out low (gnd); In low -> Out high (vcc)
                nodeVoltages[targetNode] = isHighIn ? gnd : vcc;
              } else {
                nodeVoltages[targetNode] = 0.0;
              }
              if (outNet) {
                fixedNodes.add(outNet);
              }
            }
          } else {
            // Quad 2-Input Gates (74HC00 NAND, 74HC08 AND, 74HC32 OR, 74HC86 XOR)
            // Gate 1: 1A (1), 1B (2) -> 1Y (3)
            // Gate 2: 2A (4), 2B (5) -> 2Y (6)
            // Gate 3: 3A (9), 3B (10) -> 3Y (8)
            // Gate 4: 4A (12), 4B (13) -> 4Y (11)
            const quadGates = [
              { inA: '1', inB: '2', out: '3' },
              { inA: '4', inB: '5', out: '6' },
              { inA: '9', inB: '10', out: '8' },
              { inA: '12', inB: '13', out: '11' },
            ];

            const highThresh = gnd + 0.5 * vSupply;

            for (const qg of quadGates) {
              const inANet = this.netMap.get(`${comp.id}:${qg.inA}`);
              const inBNet = this.netMap.get(`${comp.id}:${qg.inB}`);
              const outNet = this.netMap.get(`${comp.id}:${qg.out}`);
              const targetNode = outNet || `${comp.id}:${qg.out}`;

              if (isPowered) {
                const vInA = inANet ? (nodeVoltages[inANet] ?? 0.0) : 0.0;
                const vInB = inBNet ? (nodeVoltages[inBNet] ?? 0.0) : 0.0;
                const isHighA = vInA >= highThresh;
                const isHighB = vInB >= highThresh;
                let outHigh = false;

                if (comp.type.includes('74HC00')) {
                  outHigh = !(isHighA && isHighB); // NAND
                } else if (comp.type.includes('74HC08')) {
                  outHigh = isHighA && isHighB; // AND
                } else if (comp.type.includes('74HC32')) {
                  outHigh = isHighA || isHighB; // OR
                } else if (comp.type.includes('74HC86')) {
                  outHigh = isHighA !== isHighB; // XOR
                }

                nodeVoltages[targetNode] = outHigh ? vcc : gnd;
              } else {
                nodeVoltages[targetNode] = 0.0;
              }
              if (outNet) {
                fixedNodes.add(outNet);
              }
            }
          }
        } else if (comp.type === 'TIMER_555') {
          // NE555 Timer Simulation
          const vccPin = this.netMap.get(`${comp.id}:8`);
          const gndPin = this.netMap.get(`${comp.id}:1`);
          const trigPin = this.netMap.get(`${comp.id}:2`);
          const outPin = this.netMap.get(`${comp.id}:3`);
          const resetPin = this.netMap.get(`${comp.id}:4`) || this.netMap.get(`${comp.id}:reset`) || this.netMap.get(`${comp.id}:rst`);
          const threshPin = this.netMap.get(`${comp.id}:6`);
          const dischPin = this.netMap.get(`${comp.id}:7`);
          const ctrlPin = this.netMap.get(`${comp.id}:5`) || this.netMap.get(`${comp.id}:ctrl`) || this.netMap.get(`${comp.id}:cv`);

          const vcc = vccPin ? (nodeVoltages[vccPin] ?? 0.0) : 0.0;
          const gnd = gndPin ? (nodeVoltages[gndPin] ?? 0.0) : 0.0;
          const vSpan = vcc - gnd;
          if (this.burnedComponents.has(comp.id)) {
            // Burned out IC: non-functional
            continue;
          }

          if (vSpan > 16.0) {
            // Overvoltage destruction: Absolute Maximum Rating exceeded!
            this.burnedComponents.add(comp.id);
            const reason = `FAULT: ${comp.label || 'NE555'} burned out (Supply voltage ${vSpan.toFixed(1)}V exceeded 16V max rating).`;
            this.burnFaultReasons.set(comp.id, reason);
            this.recordedFaults.push({
              compId: comp.id,
              compLabel: comp.label || 'NE555',
              type: 'OVERVOLTAGE',
              message: reason,
              timestamp: Date.now(),
            });
            continue;
          }

          if (vSpan < 4.5) {
            // Undervoltage: NE555 inactive below 4.5V minimum supply
            continue;
          }

          // NE555 Internal 5k-5k-5k Divider (Pin 5 CTRL voltage)
          if (ctrlPin && !fixedNodes.has(ctrlPin)) {
            const g5k = 1.0 / 5000.0;
            const g10k = 1.0 / 10000.0;
            sumGV[ctrlPin] += g5k * vcc + g10k * gnd;
            sumG[ctrlPin] += g5k + g10k;
          }

          const upperThresh = ctrlPin && nodeVoltages[ctrlPin] !== undefined
            ? nodeVoltages[ctrlPin]
            : gnd + (2 / 3) * vSpan;
          const lowerThresh = gnd + (upperThresh - gnd) * 0.5;

          const vTrig = trigPin ? (nodeVoltages[trigPin] ?? 0) : vcc;
          const vThresh = threshPin ? (nodeVoltages[threshPin] ?? 0) : 0;

          let state = this.timer555State.get(comp.id);
          if (!state) {
            state = { flipFlop: false, outV: 0 };
            this.timer555State.set(comp.id, state);
          }

          if (iter > 5) {
            const oldFlipFlop = state.flipFlop;
            if (resetPin && (nodeVoltages[resetPin] ?? vcc) < gnd + 0.7) {
              state.flipFlop = false;
            } else if (vTrig <= lowerThresh) {
              state.flipFlop = true;
            } else if (vThresh >= upperThresh) {
              state.flipFlop = false;
            }
            if (state.flipFlop !== oldFlipFlop) {
              stateChanged = true;
            }
          }

          // Real bipolar NE555 output stage drops ~1.4V from Vcc when high (~7.6V at 9V Vcc)
          state.outV = state.flipFlop ? (vcc - 1.4) : (gnd + 0.1);

          if (outPin && !fixedNodes.has(outPin)) {
            sumGV[outPin] += 0.1 * state.outV;
            sumG[outPin] += 0.1;
          }
          if (dischPin && !state.flipFlop && !fixedNodes.has(dischPin)) {
            sumGV[dischPin] += 0.1 * (gnd + 0.05);
            sumG[dischPin] += 0.1;
          }
        }
      }

      // KCL relaxation
      let maxDelta = 0;
      for (const net of this.nets) {
        if (!fixedNodes.has(net) && sumG[net] > 0) {
          const calculatedV = sumGV[net] / sumG[net];
          const oldV = nodeVoltages[net] || 0;
          const newV = oldV * 0.3 + calculatedV * 0.7;
          maxDelta = Math.max(maxDelta, Math.abs(newV - oldV));
          nodeVoltages[net] = newV;
        }
      }

      if (iter >= 12 && maxDelta < 1e-6 && !stateChanged) {
        break;
      }
    }

    // Snapshot dynamic state from previous time step before updating
    const prevCapacitorVoltages = new Map(this.capacitorVoltages);

    // Update dynamic capacitor state from solved node voltages for next time step
    for (const comp of components) {
      if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
        const pin1 = this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:+`) || this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:pos`);
        const pin2 = this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:-`) || this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:neg`);
        if (pin1 && pin2 && pin1 !== pin2) {
          const v1 = nodeVoltages[pin1] || 0;
          const v2 = nodeVoltages[pin2] || 0;
          this.capacitorVoltages.set(comp.id, v1 - v2);
        }
      }
    }

    // 3. Compute Detailed Component Telemetry
    const componentStates: SolverStepResult['componentStates'] = {};

    for (const comp of components) {
      let status: 'NORMAL' | 'WARNING' | 'BURNED' = this.burnedComponents.has(comp.id) ? 'BURNED' : 'NORMAL';
      let faultState: 'NORMAL' | 'WARNING' | 'BURNED' = status;
      let burned = this.burnedComponents.has(comp.id);
      let isBurnedOut = burned;
      let thermalStress = burned ? 1.5 : 0;
      let fault = this.burnFaultReasons.get(comp.id);
      let brightness = 0;

      if (comp.type === 'POTENTIOMETER') {
        const { pinA, pinWiper, pinB } = getPotentiometerPins(comp, this.netMap);
        const vA = pinA ? (nodeVoltages[pinA] || 0) : 0;
        const vWiper = pinWiper ? (nodeVoltages[pinWiper] || 0) : 0;
        const vB = pinB ? (nodeVoltages[pinB] || 0) : 0;

        const rTotal = Math.max(Number(comp.parameters?.resistance ?? 10000), 1.0);
        const alpha = Math.max(0.001, Math.min(0.999, Number(comp.parameters?.wiperPosition ?? 0.5)));
        const r1 = Math.max(rTotal * alpha, 0.01);
        const r2 = Math.max(rTotal * (1.0 - alpha), 0.01);

        const iA_W = (vA - vWiper) / r1;
        const iW_B = (vWiper - vB) / r2;
        const totalCurrent = Math.max(Math.abs(iA_W), Math.abs(iW_B));

        // Output wiper voltage relative to Terminal A (0% reference)
        const vDiff = pinWiper && pinA ? vWiper - vA : vB - vA;

        componentStates[comp.id] = {
          voltage: Math.round(vDiff * 1000) / 1000,
          current: Math.round(totalCurrent * 100000) / 100000,
          on: Math.abs(vA - vB) > 0.01 || Math.abs(vWiper - vB) > 0.01,
          status,
          faultState,
          burned,
          isBurnedOut,
          thermalStress,
          fault,
        };
        continue;
      }

      if (comp.pins.length >= 2) {
        const netA = this.netMap.get(`${comp.id}:${comp.pins[0].id}`);
        const netB = this.netMap.get(`${comp.id}:${comp.pins[1].id}`);
        const vA = netA ? (nodeVoltages[netA] || 0) : 0;
        const vB = netB ? (nodeVoltages[netB] || 0) : 0;
        let vDiff = vA - vB;

        let current = 0;
        let on = false;

        if (comp.type === 'RESISTOR') {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const r = Math.max(Number(comp.parameters?.resistance ?? 1000), 0.01);
            current = vDiff / r;
            const p = Math.abs(vDiff * current);
            const pMax = Number(comp.parameters?.powerRating ?? comp.parameters?.powerRatingW ?? comp.parameters?.ratedPower ?? 0.25);
            thermalStress = p / pMax;
            if (p > pMax) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Resistor'} burned out: ${p.toFixed(2)}W exceeded ${pMax}W rating.`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Resistor',
                type: 'OVERPOWER',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
            } else if (p > 0.8 * pMax) {
              status = 'WARNING';
              faultState = 'WARNING';
            }
          }
        } else if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const absVc = Math.abs(vDiff);
            const vRated = Number(comp.parameters?.voltageRating ?? comp.parameters?.voltageRatingV ?? comp.parameters?.ratedVoltage ?? 16.0);
            thermalStress = absVc / vRated;
            const isPolarized = comp.parameters?.polarized === true ||
              comp.subCategory === 'electrolytic' ||
              comp.subCategory === 'tantalum' ||
              (comp.label || '').toLowerCase().includes('electrolytic') ||
              (comp.value || '').toLowerCase().includes('electrolytic');

            if (absVc > vRated) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Capacitor'} destroyed by dielectric breakdown (${absVc.toFixed(1)}V exceeded ${vRated}V rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Capacitor',
                type: 'OVERVOLTAGE',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
            } else if (isPolarized && vDiff < -0.5) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Electrolytic Capacitor'} destroyed by reverse polarity (${vDiff.toFixed(2)}V exceeded -0.5V reverse limit).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Electrolytic Capacitor',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
            } else {
              const cVal = comp.parameters?.capacitance ? Number(comp.parameters.capacitance) : 0.0000001;
              const prevVc = prevCapacitorVoltages.get(comp.id) ?? 0;
              current = (cVal * (vDiff - prevVc)) / Math.max(dt, 0.000001);
              on = Math.abs(current) > 0.00001;
              if (absVc > 0.85 * vRated) {
                status = 'WARNING';
                faultState = 'WARNING';
              }
            }
          }
        } else if (comp.type === 'INDUCTOR') {
          current = this.inductorCurrents.get(comp.id) ?? 0;
          on = Math.abs(current) > 0.0001;
        } else if (comp.type === 'SWITCH_SPST') {
          on = comp.parameters?.closed !== false;
          current = on ? vDiff / 0.01 : 0;
        } else if (comp.type === 'BJT_NPN' || comp.type === 'BJT_PNP') {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const bjt = this.bjtCurrents.get(comp.id) ?? { ib: 0, ic: 0 };
            current = bjt.ic > 0 ? bjt.ic : bjt.ib;
            on = current > 0.0001;
            const cPin = this.netMap.get(`${comp.id}:c`) || this.netMap.get(`${comp.id}:2`);
            const ePin = this.netMap.get(`${comp.id}:e`) || this.netMap.get(`${comp.id}:3`);
            const vc = cPin ? (nodeVoltages[cPin] || 0) : 0;
            const ve = ePin ? (nodeVoltages[ePin] || 0) : 0;
            const vce = Math.abs(vc - ve);
            const p = vce * current;
            const maxIc = Number(comp.parameters?.maxIc ?? 0.8);
            const maxPower = Number(comp.parameters?.maxPower ?? 0.625);
            thermalStress = Math.max(current / maxIc, p / maxPower);

            if (current > maxIc || p > maxPower) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'BJT'} destroyed (${p.toFixed(2)}W or ${(current * 1000).toFixed(0)}mA exceeded rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'BJT',
                type: current > maxIc ? 'OVERCURRENT' : 'OVERPOWER',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
            }
          }
        } else if (comp.type.startsWith('REGULATOR_')) {
          current = Math.abs(vDiff) > 1.0 ? 0.02 : 0;
          on = Math.abs(vDiff) > 3.0;
        } else if (comp.type === 'METER_VOLTMETER' || comp.type === 'METER_MULTIMETER') {
          current = vDiff / 10000000;
          on = Math.abs(vDiff) > 0.05;
        } else if (comp.type === 'METER_AMMETER') {
          current = vDiff / 0.001;
          on = Math.abs(current) > 0.0001;
        } else if (comp.type === 'LED') {
          const vf = getLedForwardVoltage(comp);
          const aPinId = comp.pins.find((p) => p.id === 'a' || p.id === 'anode' || p.id === '1' || p.name === 'A')?.id || 'a';
          const kPinId = comp.pins.find((p) => p.id === 'k' || p.id === 'cathode' || p.id === '2' || p.name === 'K')?.id || 'k';
          const isAConnected = this.isPinConnected(comp, aPinId, wires);
          const isKConnected = this.isPinConnected(comp, kPinId, wires);

          const aPin = this.netMap.get(`${comp.id}:${aPinId}`) || netA;
          const kPin = this.netMap.get(`${comp.id}:${kPinId}`) || netB;
          const vAnode = aPin && isAConnected ? (nodeVoltages[aPin] || 0) : 0;
          const vCathode = kPin && isKConnected ? (nodeVoltages[kPin] || 0) : 0;
          const forwardDrop = isAConnected && isKConnected ? vAnode - vCathode : 0;
          vDiff = forwardDrop;

          if (!isAConnected || !isKConnected) {
            current = 0;
            on = false;
            brightness = 0;
          } else if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            brightness = 0;
            status = 'BURNED';
            burned = true;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            // Check reverse breakdown: V_rev = vCathode - vAnode = -forwardDrop. Max reverse rating is 5.0V (threshold 5.5V)
            if (forwardDrop < -5.5) {
              this.burnedComponents.add(comp.id);
              burned = true;
              status = 'BURNED';
              fault = `FAULT: ${comp.label || 'LED'} destroyed by reverse breakdown (${(-forwardDrop).toFixed(1)}V exceeded 5V max reverse limit).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'LED',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
              brightness = 0;
            } else if (forwardDrop > vf) {
              const rd = 15; // 15 ohm diode forward dynamic resistance
              current = (forwardDrop - vf) / rd;

              // Max forward current rating is 30mA (0.030 A)
              if (current > 0.030) {
                this.burnedComponents.add(comp.id);
                burned = true;
                status = 'BURNED';
                const curMa = (current * 1000).toFixed(0);
                fault = `FAULT: ${comp.label || 'LED'} burned out (Current: ${curMa}mA exceeded 30mA max rating). Add a current-limiting resistor.`;
                this.burnFaultReasons.set(comp.id, fault);
                this.recordedFaults.push({
                  compId: comp.id,
                  compLabel: comp.label || 'LED',
                  type: 'OVERCURRENT',
                  message: fault,
                  timestamp: Date.now(),
                });
                current = 0;
                on = false;
                brightness = 0;
              } else {
                // Continuous proportional brightness:
                // clamp((If - I_min) / (I_nominal - I_min), 0, 1)
                // I_min = 0.5mA (0.0005A), I_nominal = 20mA (0.020A)
                const iMin = 0.0005;
                const iNom = 0.020;
                brightness = Math.max(0, Math.min(1, (current - iMin) / (iNom - iMin)));
                on = brightness > 0;
                if (current > 0.025) {
                  status = 'WARNING';
                } else {
                  status = 'NORMAL';
                }
              }
            } else {
              current = 0;
              on = false;
              brightness = 0;
            }
          }
        } else if (comp.type === 'ACTUATOR_RGB_LED' || comp.type === 'LED_RGB') {
          const comPinId = this.getRgbComPinId(comp);
          const isComConnected = comPinId ? this.isPinConnected(comp, comPinId, wires) : false;

          const rPinId = this.getRgbChannelPinId(comp, 'r');
          const gPinId = this.getRgbChannelPinId(comp, 'g');
          const bPinId = this.getRgbChannelPinId(comp, 'b');

          const isRConnected = isComConnected && rPinId ? this.isPinConnected(comp, rPinId, wires) : false;
          const isGConnected = isComConnected && gPinId ? this.isPinConnected(comp, gPinId, wires) : false;
          const isBConnected = isComConnected && bPinId ? this.isPinConnected(comp, bPinId, wires) : false;

          const rPin = rPinId ? this.netMap.get(`${comp.id}:${rPinId}`) : undefined;
          const gPin = gPinId ? this.netMap.get(`${comp.id}:${gPinId}`) : undefined;
          const bPin = bPinId ? this.netMap.get(`${comp.id}:${bPinId}`) : undefined;
          const comPin = comPinId ? this.netMap.get(`${comp.id}:${comPinId}`) : undefined;
          const isCommonAnode = comp.parameters?.commonType === 'anode';

          const vCom = comPin && isComConnected ? (nodeVoltages[comPin] || 0) : 0;
          const vR = rPin && isRConnected ? (nodeVoltages[rPin] || 0) : 0;
          const vG = gPin && isGConnected ? (nodeVoltages[gPin] || 0) : 0;
          const vB = bPin && isBConnected ? (nodeVoltages[bPin] || 0) : 0;

          // Forward drop calculations:
          // For CC (Common Cathode): V_drop = V_channel - V_com
          // For CA (Common Anode): V_drop = V_com - V_channel
          const rDrop = isCommonAnode ? (vCom - vR) : (vR - vCom);
          const gDrop = isCommonAnode ? (vCom - vG) : (vG - vCom);
          const bDrop = isCommonAnode ? (vCom - vB) : (vB - vCom);

          const rVf = Number(comp.parameters?.redVf) || 2.0;
          const gVf = Number(comp.parameters?.greenVf) || 3.0;
          const bVf = Number(comp.parameters?.blueVf) || 3.2;

          let rCur = 0;
          let gCur = 0;
          let bCur = 0;
          let redBrightness = 0;
          let greenBrightness = 0;
          let blueBrightness = 0;

          if (this.burnedComponents.has(comp.id)) {
            status = 'BURNED';
            burned = true;
            fault = this.burnFaultReasons.get(comp.id);
          } else if (!isComConnected) {
            // STRICT OPEN-CIRCUIT CHECK: COM is floating/open -> strictly 0 current and 0 glow across all channels
            rCur = 0;
            gCur = 0;
            bCur = 0;
            redBrightness = 0;
            greenBrightness = 0;
            blueBrightness = 0;
            on = false;
            brightness = 0;
            current = 0;
          } else {
            const rd = 15;
            // Strict forward-bias check: only conducts if forwardDrop > Vf and channel is connected.
            // Reverse bias (rDrop <= 0) strictly yields 0 current and 0 glow.
            rCur = isRConnected && rDrop > rVf ? (rDrop - rVf) / rd : 0;
            gCur = isGConnected && gDrop > gVf ? (gDrop - gVf) / rd : 0;
            bCur = isBConnected && bDrop > bVf ? (bDrop - bVf) / rd : 0;

            if (rCur > 0.035 || gCur > 0.035 || bCur > 0.035) {
              this.burnedComponents.add(comp.id);
              burned = true;
              status = 'BURNED';
              const maxCurMa = (Math.max(rCur, gCur, bCur) * 1000).toFixed(0);
              fault = `FAULT: ${comp.label || 'RGB LED'} burned out (Current: ${maxCurMa}mA exceeded 30mA max rating). Add a current-limiting resistor.`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'RGB LED',
                type: 'OVERCURRENT',
                message: fault,
                timestamp: Date.now(),
              });
              rCur = 0;
              gCur = 0;
              bCur = 0;
            } else {
              // Minimum forward current threshold: 0.5mA (0.0005A)
              const iMin = 0.0005;
              const iNom = 0.020;
              redBrightness = rCur > iMin ? Math.max(0, Math.min(1, (rCur - iMin) / (iNom - iMin))) : 0;
              greenBrightness = gCur > iMin ? Math.max(0, Math.min(1, (gCur - iMin) / (iNom - iMin))) : 0;
              blueBrightness = bCur > iMin ? Math.max(0, Math.min(1, (bCur - iMin) / (iNom - iMin))) : 0;
            }
          }

          const onRed = redBrightness > 0;
          const onGreen = greenBrightness > 0;
          const onBlue = blueBrightness > 0;
          on = onRed || onGreen || onBlue;
          current = rCur + gCur + bCur;
          brightness = Math.max(redBrightness, greenBrightness, blueBrightness);
          vDiff = isComConnected ? Math.max(rDrop, gDrop, bDrop, 0) : 0;

          componentStates[comp.id] = {
            voltage: Math.round(vDiff * 1000) / 1000,
            current: Math.round(current * 1000000) / 1000000,
            on,
            brightness,
            onRed,
            onGreen,
            onBlue,
            redBrightness,
            greenBrightness,
            blueBrightness,
            channels: {
              r: redBrightness,
              g: greenBrightness,
              b: blueBrightness,
            },
            status,
            faultState: status,
            burned,
            isBurnedOut: burned,
            thermalStress: burned ? 1.5 : (brightness > 0 ? 0.7 : 0),
            fault,
          };
          let waveHist = this.waveformHistory.get(comp.id);
          if (!waveHist) {
            waveHist = [];
            this.waveformHistory.set(comp.id, waveHist);
          }
          waveHist.push({ time: this.currentTime, value: vDiff });
          continue;
        } else if (comp.type === 'DIODE') {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const aPin = this.netMap.get(`${comp.id}:a`) || this.netMap.get(`${comp.id}:1`) || this.netMap.get(`${comp.id}:anode`) || netA;
            const kPin = this.netMap.get(`${comp.id}:k`) || this.netMap.get(`${comp.id}:2`) || this.netMap.get(`${comp.id}:cathode`) || netB;
            const va = aPin ? (nodeVoltages[aPin] || 0) : 0;
            const vk = kPin ? (nodeVoltages[kPin] || 0) : 0;
            const forwardDrop = va - vk;
            vDiff = forwardDrop;
            const maxI = Number(comp.parameters?.maxCurrent ?? 1.0);
            const maxVr = Number(comp.parameters?.maxReverseVoltage ?? 100.0);

            if (forwardDrop < -maxVr) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Diode'} destroyed by peak inverse voltage (${(-forwardDrop).toFixed(1)}V exceeded ${maxVr}V rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Diode',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
            } else if (forwardDrop > 0.7) {
              current = (forwardDrop - 0.7) / 10;
              thermalStress = current / maxI;
              if (current > maxI) {
                this.burnedComponents.add(comp.id);
                burned = true;
                isBurnedOut = true;
                status = 'BURNED';
                faultState = 'BURNED';
                fault = `FAULT: ${comp.label || 'Diode'} burned out: ${current.toFixed(2)}A exceeded ${maxI}A rating.`;
                this.burnFaultReasons.set(comp.id, fault);
                this.recordedFaults.push({
                  compId: comp.id,
                  compLabel: comp.label || 'Diode',
                  type: 'OVERCURRENT',
                  message: fault,
                  timestamp: Date.now(),
                });
                current = 0;
                on = false;
              } else {
                on = current > 0.001;
                if (current > 0.8 * maxI) {
                  status = 'WARNING';
                  faultState = 'WARNING';
                }
              }
            } else {
              current = 0;
              on = false;
            }
          }
        } else if (comp.type === 'TIMER_555') {
          if (this.burnedComponents.has(comp.id)) {
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const state = this.timer555State.get(comp.id);
            on = Boolean(state?.flipFlop);
            const vccPin = this.netMap.get(`${comp.id}:8`);
            const gndPin = this.netMap.get(`${comp.id}:1`);
            const outPin = this.netMap.get(`${comp.id}:3`);
            const vcc = vccPin ? (nodeVoltages[vccPin] ?? 0.0) : 0.0;
            const gnd = gndPin ? (nodeVoltages[gndPin] ?? 0.0) : 0.0;
            const vSpan = vcc - gnd;
            vDiff = outPin ? (nodeVoltages[outPin] || 0) : 0;

            if (vSpan > 16.0) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'NE555'} burned out (Supply voltage ${vSpan.toFixed(1)}V exceeded 16V max rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'NE555',
                type: 'OVERVOLTAGE',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            } else if (vSpan < -0.3) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'NE555'} destroyed by reverse supply polarity (${vSpan.toFixed(1)}V).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'NE555',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            }
          }
        } else if (comp.type.startsWith('OPAMP_')) {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const vccPin = this.netMap.get(`${comp.id}:vcc`);
            const veePin = this.netMap.get(`${comp.id}:vee`);
            const outPin = this.netMap.get(`${comp.id}:out`);
            const vcc = vccPin ? (nodeVoltages[vccPin] || 12.0) : 12.0;
            const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;
            const vSpan = vcc - vee;
            on = vSpan > 3.0;
            vDiff = outPin ? (nodeVoltages[outPin] || 0) : 0;

            if (vSpan > 36.0) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Op-Amp'} burned out (Supply ${vSpan.toFixed(1)}V exceeded 36V max rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Op-Amp',
                type: 'OVERVOLTAGE',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            } else if (vSpan < -0.3) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'Op-Amp'} destroyed by reverse supply polarity (${vSpan.toFixed(1)}V).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'Op-Amp',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            }
          }
        } else if (
          comp.type.startsWith('ARDUINO_') ||
          comp.type.startsWith('ESP32') ||
          comp.type.startsWith('STM32') ||
          comp.type.startsWith('RASPBERRY_PI') ||
          comp.type === 'MCU_ARDUINO_UNO' ||
          comp.type.includes('MCU')
        ) {
          const isDcPowered = comp.parameters?.dcJackPlugged === true;
          const isUsbPowered = !isDcPowered && comp.parameters?.usbPlugged !== false;
          const isPowered = isUsbPowered || isDcPowered;

          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const pwr5VPin = this.netMap.get(`${comp.id}:5V`) || this.netMap.get(`${comp.id}:VBUS`) || this.netMap.get(`${comp.id}:VSYS`);
            const pwr3V3Pin = this.netMap.get(`${comp.id}:3V3`) || this.netMap.get(`${comp.id}:3.3V`) || this.netMap.get(`${comp.id}:3V3_OUT`);
            const gndPin = this.netMap.get(`${comp.id}:GND`) || this.netMap.get(`${comp.id}:GND_1`);
            const v5V = pwr5VPin ? (nodeVoltages[pwr5VPin] || 0) : 0;
            const v3V3 = pwr3V3Pin ? (nodeVoltages[pwr3V3Pin] || 0) : 0;
            const vGnd = gndPin ? (nodeVoltages[gndPin] || 0) : 0;
            const vSpan = Math.max(v5V - vGnd, v3V3 - vGnd);

            // Board powered either from USB, DC jack, or external source
            on = isPowered || vSpan > 2.8;
            vDiff = isPowered ? (vSpan > 0.5 ? vSpan : (comp.type.includes('PICO') || comp.type.includes('ESP32') ? 3.3 : 5.0)) : vSpan;
            current = on ? 0.045 : 0;

            if (vSpan > 6.5) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'MCU'} burned out (Supply voltage ${vSpan.toFixed(1)}V exceeded max rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'MCU',
                type: 'OVERVOLTAGE',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            } else if (vSpan < -0.3) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'MCU'} destroyed by reverse polarity (${vSpan.toFixed(1)}V).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'MCU',
                type: 'REVERSE_POLARITY',
                message: fault,
                timestamp: Date.now(),
              });
              on = false;
            } else {
              status = 'NORMAL';
              faultState = 'NORMAL';
            }
          }
        } else if (comp.type.startsWith('LOGIC_')) {
          const outPin = this.netMap.get(`${comp.id}:out`);
          const outV = outPin ? (nodeVoltages[outPin] || 0) : 0;
          on = outV > 2.0;
        } else if (comp.type === 'ACTUATOR_DC_MOTOR') {
          current = Math.abs(vDiff) > 1.0 ? vDiff / 25 : 0; // 25 ohm armature coil resistance
          on = Math.abs(vDiff) > 1.5;
        } else if (comp.type === 'ACTUATOR_BUZZER_ACTIVE') {
          current = Math.abs(vDiff) > 2.0 ? vDiff / 80 : 0;
          on = Math.abs(vDiff) > 2.5;
        } else if (comp.type === 'ACTUATOR_RELAY_5V' || comp.type === 'CONTACTOR_MAIN' || comp.type === 'INDUSTRIAL_RELAY_24V' || comp.type === 'RELAY_ELECTROMECHANICAL') {
          const ratedV = Number(comp.parameters?.coilVoltageV ?? (comp.type === 'ACTUATOR_RELAY_5V' ? 5.0 : 24.0));
          const isCoilEnergized = Math.abs(vDiff) >= ratedV * 0.7 || comp.parameters?.energized === true;
          current = isCoilEnergized ? Math.abs(vDiff) / Math.max(Number(comp.parameters?.coilResistance ?? 360), 10) : 0;
          on = isCoilEnergized;
        } else if (comp.type.startsWith('PUSHBUTTON_') || comp.type === 'EMERGENCY_STOP' || comp.type.startsWith('SWITCH_')) {
          on = comp.type === 'PUSHBUTTON_NO' ? comp.parameters?.closed === true : comp.parameters?.closed !== false;
          current = on ? vDiff / 0.01 : 0;
        } else if (comp.type.startsWith('PROTECTION_')) {
          const isClosed = !comp.parameters?.tripped && comp.parameters?.closed !== false;
          on = isClosed;
          current = isClosed ? vDiff / 0.01 : 0;
        } else if (comp.type === 'SENSOR_LDR') {
          const rLdr = Math.max(Number(comp.parameters?.lightResistance ?? 500), 10);
          current = vDiff / rLdr;
          on = true;
        } else if (comp.type === 'MOSFET_N' || comp.type === 'MOSFET_P') {
          if (this.burnedComponents.has(comp.id)) {
            current = 0;
            on = false;
            status = 'BURNED';
            faultState = 'BURNED';
            burned = true;
            isBurnedOut = true;
            thermalStress = 1.5;
            fault = this.burnFaultReasons.get(comp.id);
          } else {
            const gPin = this.netMap.get(`${comp.id}:g`) || this.netMap.get(`${comp.id}:1`);
            const dPin = this.netMap.get(`${comp.id}:d`) || this.netMap.get(`${comp.id}:2`);
            const sPin = this.netMap.get(`${comp.id}:s`) || this.netMap.get(`${comp.id}:3`);
            const vg = gPin ? (nodeVoltages[gPin] || 0) : 0;
            const vd = dPin ? (nodeVoltages[dPin] || 0) : 0;
            const vs = sPin ? (nodeVoltages[sPin] || 0) : 0;
            const vgs = vg - vs;
            const vds = vd - vs;
            const vth = Number(comp.parameters?.vgsTh ?? 3.0);
            const rdsOn = Math.max(Number(comp.parameters?.rdsOn ?? 0.044), 0.001);
            on = vgs >= vth;
            current = on ? Math.abs(vds) / rdsOn : 0;
            vDiff = Math.abs(vds);
            const p = vDiff * current;
            const maxId = Number(comp.parameters?.maxId ?? 10.0);
            const maxVds = Number(comp.parameters?.maxVds ?? 60.0);
            const maxPower = Number(comp.parameters?.maxPower ?? 20.0);
            thermalStress = Math.max(current / maxId, p / maxPower, vDiff / maxVds);

            if (current > maxId || vDiff > maxVds || p > maxPower) {
              this.burnedComponents.add(comp.id);
              burned = true;
              isBurnedOut = true;
              status = 'BURNED';
              faultState = 'BURNED';
              fault = `FAULT: ${comp.label || 'MOSFET'} burned out (${p.toFixed(2)}W or ${current.toFixed(1)}A exceeded rating).`;
              this.burnFaultReasons.set(comp.id, fault);
              this.recordedFaults.push({
                compId: comp.id,
                compLabel: comp.label || 'MOSFET',
                type: current > maxId ? 'OVERCURRENT' : 'OVERPOWER',
                message: fault,
                timestamp: Date.now(),
              });
              current = 0;
              on = false;
            }
          }
        } else if (comp.type.includes('BATTERY') || comp.type === 'DC_VOLTAGE') {
          current = Math.abs(vDiff) / 1000;
        }

        componentStates[comp.id] = {
          voltage: Math.round(vDiff * 1000) / 1000,
          current: Math.round(current * 1000000) / 1000000,
          on,
          pwrLed: on,
          brightness,
          status,
          faultState,
          burned,
          isBurnedOut,
          thermalStress,
          fault,
        };

        let waveHist = this.waveformHistory.get(comp.id);
        if (!waveHist) {
          waveHist = [];
          this.waveformHistory.set(comp.id, waveHist);
        }
        waveHist.push({ time: this.currentTime, value: vDiff });
        if (waveHist.length > this.maxHistoryPoints) {
          waveHist.shift();
        }
      }
    }

    // 4. Calculate Wire Currents & Conventional Current Direction
    const wireCurrents: Record<string, number> = {};
    for (const wire of wires) {
      const fromComp = components.find((c) => c.id === wire.fromCompId);
      const toComp = components.find((c) => c.id === wire.toCompId);
      if (!fromComp || !toComp) continue;

      const netA = this.netMap.get(`${wire.fromCompId}:${wire.fromPinId}`);
      const netB = this.netMap.get(`${wire.toCompId}:${wire.toPinId}`);
      const vA = netA ? (nodeVoltages[netA] || 0) : 0;
      const vB = netB ? (nodeVoltages[netB] || 0) : 0;

      let iVal = vA - vB;
      if (fromComp.type.includes('BATTERY') || fromComp.type === 'DC_VOLTAGE') {
        const isPosPin = wire.fromPinId === 'p' || wire.fromPinId === '1' || wire.fromPinId === '+' || wire.fromPinId.toLowerCase().includes('pos');
        const vBat = Number(fromComp.parameters?.voltage ?? 9.0);
        iVal = isPosPin ? (vBat >= 0 ? 1 : -1) : (vBat >= 0 ? -1 : 1);
      } else if (toComp.type.includes('BATTERY') || toComp.type === 'DC_VOLTAGE') {
        const isPosPin = wire.toPinId === 'p' || wire.toPinId === '1' || wire.toPinId === '+' || wire.toPinId.toLowerCase().includes('pos');
        const vBat = Number(toComp.parameters?.voltage ?? 9.0);
        iVal = isPosPin ? (vBat >= 0 ? -1 : 1) : (vBat >= 0 ? 1 : -1);
      } else {
        const compCurrent = componentStates[fromComp.id]?.current || componentStates[toComp.id]?.current || 0;
        iVal = vA >= vB ? compCurrent : -compCurrent;
      }
      wireCurrents[wire.id] = iVal;
    }

    // Validate MCU GPIO Pin Current Ratings (max 40mA per pin)
    for (const comp of components) {
      if (
        comp.type.startsWith('ARDUINO_') ||
        comp.type.startsWith('ESP32') ||
        comp.type.startsWith('STM32') ||
        comp.type.startsWith('RASPBERRY_PI_PICO') ||
        comp.type === 'MCU_ARDUINO_UNO' ||
        comp.type.includes('MCU')
      ) {
        if (!this.burnedComponents.has(comp.id)) {
          for (const wire of wires) {
            let mcuPinId: string | null = null;
            let otherCompId: string | null = null;
            if (wire.fromCompId === comp.id) {
              mcuPinId = wire.fromPinId;
              otherCompId = wire.toCompId;
            } else if (wire.toCompId === comp.id) {
              mcuPinId = wire.toPinId;
              otherCompId = wire.fromCompId;
            }
            if (mcuPinId && (mcuPinId.startsWith('D') || /^\d+$/.test(mcuPinId))) {
              const otherSt = otherCompId ? componentStates[otherCompId] : null;
              const wireI = Math.abs(wireCurrents[wire.id] || (otherSt?.current ?? 0));
              if (wireI > 0.040) {
                this.burnedComponents.add(comp.id);
                const curMa = (wireI * 1000).toFixed(0);
                const fault = `FAULT: ${comp.label || 'MCU'} GPIO pin ${mcuPinId} damaged (Current: ${curMa}mA exceeded 40mA max pin rating).`;
                this.burnFaultReasons.set(comp.id, fault);
                this.recordedFaults.push({
                  compId: comp.id,
                  compLabel: comp.label || 'MCU',
                  type: 'OVERCURRENT',
                  message: fault,
                  timestamp: Date.now(),
                });
                if (componentStates[comp.id]) {
                  componentStates[comp.id].status = 'BURNED';
                  componentStates[comp.id].faultState = 'BURNED';
                  componentStates[comp.id].burned = true;
                  componentStates[comp.id].isBurnedOut = true;
                  componentStates[comp.id].fault = fault;
                }
                break;
              }
            }
          }
        }
      }
    }

    // 5. Record Bench AWG Waveform History for Scope CH1/CH2 tapping
    if (hasGen1) {
      let genHist = this.waveformHistory.get('gen:out');
      if (!genHist) {
        genHist = [];
        this.waveformHistory.set('gen:out', genHist);
      }
      genHist.push({ time: this.currentTime, value: instantGenV });
      if (genHist.length > this.maxHistoryPoints) genHist.shift();
    }

    if (hasGen2) {
      let genHist2 = this.waveformHistory.get('gen:out2');
      if (!genHist2) {
        genHist2 = [];
        this.waveformHistory.set('gen:out2', genHist2);
      }
      genHist2.push({ time: this.currentTime, value: instantGenV2 });
      if (genHist2.length > this.maxHistoryPoints) genHist2.shift();
    }

    // 6. Record Waveform History for all Circuit Nets and Component Pins
    for (const net of this.nets) {
      const netKey = `net:${net}`;
      let netHist = this.waveformHistory.get(netKey);
      if (!netHist) {
        netHist = [];
        this.waveformHistory.set(netKey, netHist);
      }
      netHist.push({ time: this.currentTime, value: nodeVoltages[net] || 0 });
      if (netHist.length > this.maxHistoryPoints) netHist.shift();
    }

    for (const comp of components) {
      for (const pin of comp.pins) {
        const net = this.netMap.get(`${comp.id}:${pin.id}`);
        const pinV = net ? (nodeVoltages[net] || 0) : 0;
        const pinKey = `${comp.id}:${pin.id}`;
        let pinHist = this.waveformHistory.get(pinKey);
        if (!pinHist) {
          pinHist = [];
          this.waveformHistory.set(pinKey, pinHist);
        }
        pinHist.push({ time: this.currentTime, value: pinV });
        if (pinHist.length > this.maxHistoryPoints) pinHist.shift();
      }
    }

    const waveformDataObj: Record<string, SimulationWaveformPoint[]> = {};
    this.waveformHistory.forEach((points, id) => {
      waveformDataObj[id] = points;
    });

    return {
      nodeVoltages,
      componentStates,
      waveformData: waveformDataObj,
      wireCurrents,
      faults: [...this.recordedFaults],
    };
  }

  public getNetForPin(compId: string, pinId: string): string | undefined {
    return this.netMap.get(`${compId}:${pinId}`);
  }

  public getPinVoltage(compId: string, pinId: string, nodeVoltages: Record<string, number>): number {
    const net = this.netMap.get(`${compId}:${pinId}`);
    return net ? (nodeVoltages[net] || 0) : 0;
  }
}
