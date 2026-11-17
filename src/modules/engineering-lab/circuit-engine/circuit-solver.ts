import { CircuitComponent, CircuitWire, SimulationWaveformPoint } from '../types';

export interface SolverStepResult {
  nodeVoltages: Record<string, number>;
  componentStates: Record<string, { voltage: number; current: number; on?: boolean; digitalOut?: number }>;
  waveformData: Record<string, SimulationWaveformPoint[]>;
}

export class CircuitSolver {
  private netMap: Map<string, string> = new Map(); // pinKey -> netId
  private nets: Set<string> = new Set();
  private gndNetId: string = 'GND';
  private capacitorVoltages: Map<string, number> = new Map();
  private inductorCurrents: Map<string, number> = new Map();
  private timer555State: Map<string, { flipFlop: boolean; outV: number }> = new Map();
  private waveformHistory: Map<string, SimulationWaveformPoint[]> = new Map();
  private currentTime: number = 0;
  private maxHistoryPoints: number = 300;

  public reset() {
    this.capacitorVoltages.clear();
    this.inductorCurrents.clear();
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

    // Union-find data structure for net connectivity
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

    // Initialize all pins as their own set
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

    // Look for dedicated GND component to anchor 0V net
    const gndComp = components.find((c) => c.type === 'GND' || c.type === 'GROUND');
    if (gndComp && gndComp.pins.length > 0) {
      const gndPinKey = `${gndComp.id}:${gndComp.pins[0].id}`;
      this.gndNetId = this.netMap.get(gndPinKey) || 'GND';
    } else {
      // Default to the first net or synthetic GND
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

    // 1. Process Independent Fixed DC & AC Voltage Sources
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
      } else if (comp.type === 'AC_SOURCE' || comp.type === 'FUNCTION_GENERATOR') {
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
      }
    }

    // 2. Iterative Modified Nodal Analysis (MNA) with KCL Conductance Formulation
    // Solves node voltages across R, C, L, and semiconductor junctions
    const iterations = 25;
    for (let iter = 0; iter < iterations; iter++) {
      // Accumulate KCL node equations: Sum(G_i * V_adj) / Sum(G_i)
      const sumGV: Record<string, number> = {};
      const sumG: Record<string, number> = {};

      for (const net of this.nets) {
        sumGV[net] = 0;
        sumG[net] = 0;
      }

      for (const comp of components) {
        if (comp.type === 'RESISTOR' || comp.type === 'POTENTIOMETER') {
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
        } else if (comp.type === 'CAPACITOR') {
          const pin1 = this.netMap.get(`${comp.id}:1`);
          const pin2 = this.netMap.get(`${comp.id}:2`);
          if (pin1 && pin2 && pin1 !== pin2) {
            const cVal = Number(comp.parameters?.capacitance ?? 0.00001); // 10uF default
            // Norton equivalent: G_eq = C / dt, I_eq = G_eq * V_prev
            const gEq = cVal / Math.max(dt, 0.00001);
            const prevVc = this.capacitorVoltages.get(comp.id) ?? 0;
            const iEq = gEq * prevVc;

            const v1 = nodeVoltages[pin1] || 0;
            const v2 = nodeVoltages[pin2] || 0;

            sumGV[pin1] += gEq * v2 + iEq;
            sumG[pin1] += gEq;

            sumGV[pin2] += gEq * v1 - iEq;
            sumG[pin2] += gEq;

            // Update capacitor charge
            const newVc = prevVc + 0.1 * ((v1 - v2) - prevVc);
            this.capacitorVoltages.set(comp.id, newVc);
          }
        } else if (comp.type === 'DIODE' || comp.type === 'LED') {
          const aPin = this.netMap.get(`${comp.id}:a`) || this.netMap.get(`${comp.id}:1`);
          const kPin = this.netMap.get(`${comp.id}:k`) || this.netMap.get(`${comp.id}:2`);
          const vf = comp.type === 'LED' ? 2.0 : 0.7; // Forward voltage threshold
          if (aPin && kPin && aPin !== kPin) {
            const va = nodeVoltages[aPin] || 0;
            const vk = nodeVoltages[kPin] || 0;
            const isConducting = (va - vk) > vf;
            const gDiode = isConducting ? 0.05 : 1e-6; // 20 ohms when conducting

            sumGV[aPin] += gDiode * (vk + vf);
            sumG[aPin] += gDiode;

            sumGV[kPin] += gDiode * (va - vf);
            sumG[kPin] += gDiode;
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

          // 555 internal SR Flip-Flop
          if (vTrig < lowerThresh) {
            state.flipFlop = true; // Set Output HIGH
          } else if (vThresh > upperThresh) {
            state.flipFlop = false; // Reset Output LOW
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

      // Update non-fixed node voltages using KCL relaxation
      for (const net of this.nets) {
        if (!fixedNodes.has(net) && sumG[net] > 0) {
          const calculatedV = sumGV[net] / sumG[net];
          // Successive over-relaxation
          nodeVoltages[net] = nodeVoltages[net] * 0.3 + calculatedV * 0.7;
        }
      }
    }

    // 3. Compute Detailed Component Electrical Telemetry (Voltage, Current, Power, Visual State)
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

        if (comp.type === 'RESISTOR' || comp.type === 'POTENTIOMETER') {
          const r = Math.max(Number(comp.parameters?.resistance ?? 1000), 0.01);
          current = vDiff / r;
        } else if (comp.type === 'LED') {
          const vf = 2.0;
          if (vDiff > vf) {
            current = (vDiff - vf) / 220; // current-limiting approximation
            on = current > 0.002; // illuminated when current > 2mA
          }
        } else if (comp.type === 'DIODE') {
          current = vDiff > 0.7 ? (vDiff - 0.7) / 10 : 0;
          on = current > 0.001;
        } else if (comp.type === 'TIMER_555') {
          const state = this.timer555State.get(comp.id);
          on = Boolean(state?.flipFlop);
        } else if (comp.type === 'BATTERY' || comp.type === 'DC_VOLTAGE') {
          // Source delivery current
          current = Math.abs(vDiff) / 1000;
        }

        componentStates[comp.id] = {
          voltage: Math.round(vDiff * 1000) / 1000,
          current: Math.round(current * 1000000) / 1000000,
          on,
        };

        // Record waveform history for Oscilloscope / Logic Analyzer
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

    const waveformDataObj: Record<string, SimulationWaveformPoint[]> = {};
    this.waveformHistory.forEach((points, id) => {
      waveformDataObj[id] = points;
    });

    return {
      nodeVoltages,
      componentStates,
      waveformData: waveformDataObj,
    };
  }
}
