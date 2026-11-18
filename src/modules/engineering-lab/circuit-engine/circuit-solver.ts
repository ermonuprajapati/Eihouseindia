import { CircuitComponent, CircuitWire, SimulationWaveformPoint } from '../types';

export interface SolverStepResult {
  nodeVoltages: Record<string, number>;
  componentStates: Record<string, { voltage: number; current: number; on?: boolean; digitalOut?: number }>;
  waveformData: Record<string, SimulationWaveformPoint[]>;
  wireCurrents?: Record<string, number>;
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
  private maxHistoryPoints: number = 300;

  public reset() {
    this.capacitorVoltages.clear();
    this.inductorCurrents.clear();
    this.bjtCurrents.clear();
    this.timer555State.clear();
    this.waveformHistory.clear();
    this.currentTime = 0;
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
    for (const comp of components) {
      for (const pin of comp.pins) {
        const pinKey = `${comp.id}:${pin.id}`;
        parent.set(pinKey, pinKey);
      }
    }

    // Connect sets through wires
    for (const wire of wires) {
      const pinA = `${wire.fromCompId}:${wire.fromPinId}`;
      const pinB = `${wire.toCompId}:${wire.toPinId}`;
      union(pinA, pinB);
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
      this.gndNetId = this.nets.values().next().value || 'GND';
    }
  }

  /**
   * Solve a single transient simulation timestep using Modified Nodal Analysis (MNA)
   * with exact KCL conductance matrix relaxation.
   */
  public step(
    components: CircuitComponent[],
    wires: CircuitWire[],
    dt: number = 0.0001,
    timeScale: number = 1.0
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
    for (const comp of components) {
      if (comp.type === 'DC_VOLTAGE' || comp.type === 'BATTERY') {
        const pNet = this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:1`);
        const nNet = this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:2`);
        const vVal = Number(comp.parameters?.voltage ?? parseFloat(comp.value) ?? 9.0);

        if (pNet && nNet) {
          if (nNet === this.gndNetId) {
            nodeVoltages[pNet] = vVal;
            fixedNodes.add(pNet);
          } else if (pNet === this.gndNetId) {
            nodeVoltages[nNet] = -vVal;
            fixedNodes.add(nNet);
          } else {
            nodeVoltages[pNet] = (nodeVoltages[nNet] || 0) + vVal;
            fixedNodes.add(pNet);
          }
        }
      } else if (comp.type === 'FUNCTION_GENERATOR') {
        const pNet = this.netMap.get(`${comp.id}:p`) || this.netMap.get(`${comp.id}:1`);
        const nNet = this.netMap.get(`${comp.id}:n`) || this.netMap.get(`${comp.id}:2`);
        const amp = Number(comp.parameters?.amplitude ?? 5.0);
        const freq = Number(comp.parameters?.frequency ?? 1000);
        const offset = Number(comp.parameters?.offset ?? 0);
        const wave = comp.parameters?.waveform ?? 'sine';
        let instantV = offset;

        const phase = (this.currentTime * freq) % 1.0;
        if (wave === 'square') {
          instantV = offset + (phase < 0.5 ? amp : -amp);
        } else if (wave === 'triangle') {
          instantV = offset + amp * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
        } else {
          instantV = offset + amp * Math.sin(2 * Math.PI * freq * this.currentTime);
        }

        if (pNet && nNet) {
          if (nNet === this.gndNetId) {
            nodeVoltages[pNet] = instantV;
            fixedNodes.add(pNet);
          } else {
            nodeVoltages[pNet] = (nodeVoltages[nNet] || 0) + instantV;
            fixedNodes.add(pNet);
          }
        }
      } else if (
        comp.type.startsWith('ARDUINO_') ||
        comp.type.startsWith('ESP32') ||
        comp.type.startsWith('STM32') ||
        comp.type.startsWith('RASPBERRY_PI_PICO')
      ) {
        // MCU 5V or 3.3V power rails & GND
        const pwrPin = this.netMap.get(`${comp.id}:5V`) || this.netMap.get(`${comp.id}:3V3`);
        const gndPin = this.netMap.get(`${comp.id}:GND`);
        const vccVal = comp.type.includes('ESP') || comp.type.includes('STM') || comp.type.includes('PICO') ? 3.3 : 5.0;

        if (pwrPin && !fixedNodes.has(pwrPin)) {
          nodeVoltages[pwrPin] = vccVal;
          fixedNodes.add(pwrPin);
        }
        if (gndPin && !fixedNodes.has(gndPin)) {
          nodeVoltages[gndPin] = 0;
          fixedNodes.add(gndPin);
        }
      }
    }

    // 2. Iterative Modified Nodal Analysis (MNA) with KCL Conductance Formulation
    const iterations = 25;
    for (let iter = 0; iter < iterations; iter++) {
      const sumGV: Record<string, number> = {};
      const sumG: Record<string, number> = {};

      for (const net of this.nets) {
        sumGV[net] = 0;
        sumG[net] = 0;
      }

      for (const comp of components) {
        if (comp.type === 'RESISTOR') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
            const r = Math.max(Number(comp.parameters?.resistance ?? 1000), 0.01);
            const g = 1.0 / r;

            const v1 = nodeVoltages[pin1] || 0;
            const v2 = nodeVoltages[pin2] || 0;

            sumGV[pin1] += g * v2;
            sumG[pin1] += g;

            sumGV[pin2] += g * v1;
            sumG[pin2] += g;
          }
        } else if (comp.type === 'POTENTIOMETER') {
          // Resolve pins either as A, Wiper, B or 1, 2, 3
          const pinA = this.netMap.get(`${comp.id}:A`) || this.netMap.get(`${comp.id}:1`);
          const pinWiper = this.netMap.get(`${comp.id}:Wiper`) || this.netMap.get(`${comp.id}:2`);
          const pinB = this.netMap.get(`${comp.id}:B`) || this.netMap.get(`${comp.id}:3`);
          const rTotal = Math.max(Number(comp.parameters?.resistance ?? 10000), 1.0);
          const alpha = Math.max(0.001, Math.min(0.999, Number(comp.parameters?.wiperPosition ?? 0.5)));
          const r1 = Math.max(rTotal * alpha, 0.01);
          const r2 = Math.max(rTotal * (1.0 - alpha), 0.01);

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
        } else if (comp.type === 'BJT_NPN') {
          const bPin = this.netMap.get(`${comp.id}:b`) || this.netMap.get(`${comp.id}:B`) || this.netMap.get(`${comp.id}:1`);
          const cPin = this.netMap.get(`${comp.id}:c`) || this.netMap.get(`${comp.id}:C`) || this.netMap.get(`${comp.id}:2`);
          const ePin = this.netMap.get(`${comp.id}:e`) || this.netMap.get(`${comp.id}:E`) || this.netMap.get(`${comp.id}:3`);
          if (bPin && cPin && ePin) {
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
            const gce = isConducting && vce > 0.2 ? Math.min(10.0, Math.max(0.001, icTarget / Math.max(vce - 0.2, 0.1))) : 1e-6;
            const ic = isConducting && vce > 0.2 ? gce * (vce - 0.2) : 0;

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
        } else if (comp.type === 'CAPACITOR') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
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

            const newVc = prevVc + 0.1 * ((v1 - v2) - prevVc);
            this.capacitorVoltages.set(comp.id, newVc);
          }
        } else if (comp.type === 'DIODE' || comp.type === 'LED') {
          const aPin = this.netMap.get(`${comp.id}:a`) || this.netMap.get(`${comp.id}:1`);
          const kPin = this.netMap.get(`${comp.id}:k`) || this.netMap.get(`${comp.id}:2`);
          const vf = comp.type === 'LED' ? 2.0 : 0.7;
          if (aPin && kPin && aPin !== kPin) {
            const va = nodeVoltages[aPin] || 0;
            const vk = nodeVoltages[kPin] || 0;
            const isConducting = (va - vk) > vf;
            const gDiode = isConducting ? 0.05 : 1e-6;

            sumGV[aPin] += gDiode * (vk + vf);
            sumG[aPin] += gDiode;

            sumGV[kPin] += gDiode * (va - vf);
            sumG[kPin] += gDiode;
          }
        } else if (comp.type.startsWith('OPAMP_')) {
          // Operational Amplifier (Inverting / Non-inverting / Comparator)
          const inNegPin = this.netMap.get(`${comp.id}:in_neg`);
          const inPosPin = this.netMap.get(`${comp.id}:in_pos`);
          const outPin = this.netMap.get(`${comp.id}:out`);
          const vccPin = this.netMap.get(`${comp.id}:vcc`);
          const veePin = this.netMap.get(`${comp.id}:vee`);

          const vcc = vccPin ? (nodeVoltages[vccPin] || 12.0) : 12.0;
          const vee = veePin ? (nodeVoltages[veePin] || 0.0) : 0.0;
          const vPos = inPosPin ? (nodeVoltages[inPosPin] || 0.0) : 0.0;
          const vNeg = inNegPin ? (nodeVoltages[inNegPin] || 0.0) : 0.0;

          const openGain = Number(comp.parameters?.openLoopGain ?? 100000);
          const vIdeal = (vPos - vNeg) * openGain;
          const vOutClamped = Math.max(vee + 0.05, Math.min(vcc - 1.2, vIdeal));

          if (outPin) {
            nodeVoltages[outPin] = vOutClamped;
            fixedNodes.add(outPin);
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
        } else if (comp.type === 'TIMER_555') {
          // NE555 Timer Simulation
          const vccPin = this.netMap.get(`${comp.id}:8`);
          const gndPin = this.netMap.get(`${comp.id}:1`);
          const trigPin = this.netMap.get(`${comp.id}:2`);
          const outPin = this.netMap.get(`${comp.id}:3`);
          const threshPin = this.netMap.get(`${comp.id}:6`);
          const dischPin = this.netMap.get(`${comp.id}:7`);

          const vcc = vccPin ? (nodeVoltages[vccPin] || 9.0) : 9.0;
          const gnd = gndPin ? (nodeVoltages[gndPin] || 0.0) : 0.0;
          const vSpan = vcc - gnd;
          const upperThresh = gnd + (2 / 3) * vSpan;
          const lowerThresh = gnd + (1 / 3) * vSpan;

          const vTrig = trigPin ? (nodeVoltages[trigPin] || 0) : vcc;
          const vThresh = threshPin ? (nodeVoltages[threshPin] || 0) : 0;

          let state = this.timer555State.get(comp.id);
          if (!state) {
            state = { flipFlop: false, outV: 0 };
            this.timer555State.set(comp.id, state);
          }

          if (vTrig < lowerThresh) {
            state.flipFlop = true;
          } else if (vThresh > upperThresh) {
            state.flipFlop = false;
          }

          state.outV = state.flipFlop ? (vcc - 0.2) : (gnd + 0.1);

          if (outPin && !fixedNodes.has(outPin)) {
            nodeVoltages[outPin] = state.outV;
          }
          if (dischPin && !state.flipFlop && !fixedNodes.has(dischPin)) {
            nodeVoltages[dischPin] = gnd;
          }
        }
      }

      // KCL relaxation
      for (const net of this.nets) {
        if (!fixedNodes.has(net) && sumG[net] > 0) {
          const calculatedV = sumGV[net] / sumG[net];
          nodeVoltages[net] = nodeVoltages[net] * 0.3 + calculatedV * 0.7;
        }
      }
    }

    // 3. Compute Detailed Component Telemetry
    const componentStates: Record<string, { voltage: number; current: number; on?: boolean; digitalOut?: number }> = {};

    for (const comp of components) {
      if (comp.pins.length >= 2) {
        const netA = this.netMap.get(`${comp.id}:${comp.pins[0].id}`);
        const netB = this.netMap.get(`${comp.id}:${comp.pins[1].id}`);
        const vA = netA ? (nodeVoltages[netA] || 0) : 0;
        const vB = netB ? (nodeVoltages[netB] || 0) : 0;
        const vDiff = vA - vB;

        let current = 0;
        let on = false;

        if (comp.type === 'RESISTOR') {
          const r = Math.max(Number(comp.parameters?.resistance ?? 1000), 0.01);
          current = vDiff / r;
        } else if (comp.type === 'POTENTIOMETER') {
          const rTotal = Math.max(Number(comp.parameters?.resistance ?? 10000), 1.0);
          const alpha = Math.max(0.001, Math.min(0.999, Number(comp.parameters?.wiperPosition ?? 0.5)));
          const rW = rTotal * alpha;
          current = vDiff / rW;
          on = true;
        } else if (comp.type === 'INDUCTOR') {
          current = this.inductorCurrents.get(comp.id) ?? 0;
          on = Math.abs(current) > 0.0001;
        } else if (comp.type === 'SWITCH_SPST') {
          on = comp.parameters?.closed !== false;
          current = on ? vDiff / 0.01 : 0;
        } else if (comp.type === 'BJT_NPN') {
          const bjt = this.bjtCurrents.get(comp.id) ?? { ib: 0, ic: 0 };
          current = bjt.ic > 0 ? bjt.ic : bjt.ib;
          on = current > 0.0001;
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
          const vf = 2.0;
          if (vDiff > vf) {
            current = (vDiff - vf) / 20; // 20 ohm diode forward dynamic resistance
            on = current > 0.001; // illuminated when forward current > 1mA
          }
        } else if (comp.type === 'DIODE') {
          current = vDiff > 0.7 ? (vDiff - 0.7) / 10 : 0;
          on = current > 0.001;
        } else if (comp.type === 'TIMER_555') {
          const state = this.timer555State.get(comp.id);
          on = Boolean(state?.flipFlop);
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
        } else if (comp.type === 'ACTUATOR_RELAY_5V') {
          current = Math.abs(vDiff) > 3.0 ? 0.07 : 0; // 70mA coil current
          on = Math.abs(vDiff) > 3.5;
        } else if (comp.type === 'SENSOR_LDR') {
          const rLdr = Math.max(Number(comp.parameters?.lightResistance ?? 500), 10);
          current = vDiff / rLdr;
          on = true;
        } else if (comp.type === 'BATTERY' || comp.type === 'DC_VOLTAGE') {
          current = Math.abs(vDiff) / 1000;
        }

        componentStates[comp.id] = {
          voltage: Math.round(vDiff * 1000) / 1000,
          current: Math.round(current * 1000000) / 1000000,
          on,
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
      if (fromComp.type === 'BATTERY' || fromComp.type === 'DC_VOLTAGE') {
        const isPosPin = wire.fromPinId === 'p' || wire.fromPinId === '1';
        const vBat = Number(fromComp.parameters?.voltage ?? 9.0);
        iVal = isPosPin ? (vBat >= 0 ? 1 : -1) : (vBat >= 0 ? -1 : 1);
      } else if (toComp.type === 'BATTERY' || toComp.type === 'DC_VOLTAGE') {
        const isPosPin = wire.toPinId === 'p' || wire.toPinId === '1';
        const vBat = Number(toComp.parameters?.voltage ?? 9.0);
        iVal = isPosPin ? (vBat >= 0 ? -1 : 1) : (vBat >= 0 ? 1 : -1);
      } else {
        const compCurrent = componentStates[fromComp.id]?.current || componentStates[toComp.id]?.current || 0;
        iVal = vA >= vB ? compCurrent : -compCurrent;
      }
      wireCurrents[wire.id] = iVal;
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
    };
  }
}
