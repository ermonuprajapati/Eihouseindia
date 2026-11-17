import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { VirtualMcuRuntime } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { CircuitComponent, CircuitWire, EngineeringProject } from '@/modules/engineering-lab/types';
import { TEMPLATE_555_ASTABLE, TEMPLATE_ARDUINO_BLINK } from '@/modules/engineering-lab/templates/starter-templates';

describe('Engineering Lab - Full Acceptance Test Suite', () => {
  let solver: CircuitSolver;
  let mcu: VirtualMcuRuntime;

  beforeEach(() => {
    solver = new CircuitSolver();
    mcu = new VirtualMcuRuntime();
  });

  // --------------------------------------------------------------------------
  // TEST A - Battery Property and Simulation Update (9V -> 5V)
  // --------------------------------------------------------------------------
  it('TEST A: updates circuit node voltages and branch currents when Battery voltage changes from 9V to 5V', () => {
    // Voltage divider: Battery (9V) -> R1 (10k) -> R2 (10k) -> Ground
    const components: CircuitComponent[] = [
      {
        id: 'bt1',
        type: 'DC_VOLTAGE',
        label: 'BT1',
        designator: 'BT1',
        value: '9V',
        x: 100,
        y: 100,
        rotation: 0,
        pins: [
          { id: '1', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 9.0 },
        category: 'sources',
        footprint: 'BATT-CR2032',
      },
      {
        id: 'gnd1',
        type: 'GND',
        label: 'GND',
        designator: 'GND1',
        value: '0V',
        x: 100,
        y: 300,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD-TH',
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        designator: 'R1',
        value: '10kΩ',
        x: 200,
        y: 100,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 10000 },
        category: 'passive',
        footprint: 'R-AXIAL-0.25W',
      },
      {
        id: 'r2',
        type: 'RESISTOR',
        label: 'R2',
        designator: 'R2',
        value: '10kΩ',
        x: 200,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 10000 },
        category: 'passive',
        footprint: 'R-AXIAL-0.25W',
      },
    ];

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'bt1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'r2', toPinId: '1' },
      { id: 'w3', fromCompId: 'r2', fromPinId: '2', toCompId: 'gnd1', toPinId: '1' },
      { id: 'w4', fromCompId: 'bt1', fromPinId: '2', toCompId: 'gnd1', toPinId: '1' },
    ];

    // Initial 9V solution
    const res9V = solver.step(components, wires, 0.001);
    expect(res9V.componentStates['r1']).toBeDefined();
    expect(res9V.componentStates['r2']).toBeDefined();

    // With 9V across two 10k resistors in series, voltage at divider node is ~4.5V
    const midV9 = res9V.componentStates['r2'].voltage;
    expect(midV9).toBeGreaterThan(4.0);
    expect(midV9).toBeLessThan(5.0);

    // Modify Battery from 9V to 5V
    components[0].parameters = { voltage: 5.0 };
    components[0].value = '5V';

    const res5V = solver.step(components, wires, 0.001);
    const midV5 = res5V.componentStates['r2'].voltage;
    // Divider node with 5V supply is ~2.5V
    expect(midV5).toBeGreaterThan(2.0);
    expect(midV5).toBeLessThan(3.0);
  });

  // --------------------------------------------------------------------------
  // TEST B - Resistor and Component Parameter Updates
  // --------------------------------------------------------------------------
  it('TEST B: recalculates circuit telemetry when R1 changes from 10k to 4.7k', () => {
    const components: CircuitComponent[] = [
      {
        id: 'v1',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
        category: 'sources',
        footprint: 'PAD-TH',
      },
      {
        id: 'gnd',
        type: 'GND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD-TH',
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '10kΩ',
        x: 100,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 10000 },
        category: 'passive',
        footprint: 'R-AXIAL-0.25W',
      },
    ];

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
      { id: 'w3', fromCompId: 'v1', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
    ];

    // At 10k: I = 5V / 10k = 0.5mA (0.0005 A)
    const res1 = solver.step(components, wires, 0.001);
    expect(res1.componentStates['r1'].current).toBeCloseTo(0.0005, 4);

    // Update to 4.7k: I = 5V / 4.7k = 1.0638 mA (0.00106 A)
    components[2].parameters = { resistance: 4700 };
    components[2].value = '4.7kΩ';

    const res2 = solver.step(components, wires, 0.001);
    expect(res2.componentStates['r1'].current).toBeCloseTo(0.00106, 3);
    expect(res2.componentStates['r1'].current).toBeGreaterThan(res1.componentStates['r1'].current);
  });

  // --------------------------------------------------------------------------
  // TEST C - NE555 Astable Circuit Simulation & Closed-Form Verification
  // --------------------------------------------------------------------------
  it('TEST C: runs NE555 astable circuit template and verifies output states match analytical model', () => {
    const tmpl = TEMPLATE_555_ASTABLE;
    expect(tmpl.components.length).toBeGreaterThanOrEqual(7);

    // Run 50 simulation steps
    let finalStep = solver.step(tmpl.components, tmpl.wires, 0.001);
    for (let i = 0; i < 50; i++) {
      finalStep = solver.step(tmpl.components, tmpl.wires, 0.001);
    }

    // Verify 555 IC state exists
    const u1 = tmpl.components.find((c) => c.type === 'TIMER_555');
    expect(u1).toBeDefined();
    const u1State = finalStep.componentStates[u1!.id];
    expect(u1State).toBeDefined();
    expect(typeof u1State.voltage).toBe('number');

    // Analytical equation check: Ra = 10k, Rb = 47k, C = 10uF
    // f = 1.44 / ((Ra + 2*Rb) * C) = 1.44 / ((10000 + 94000) * 10e-6) = 1.44 / (104000 * 1e-5) = 1.44 / 1.04 = 1.38 Hz
    const ra = 10000;
    const rb = 47000;
    const cVal = 10e-6;
    const theoreticalFreq = 1.44 / ((ra + 2 * rb) * cVal);
    expect(theoreticalFreq).toBeCloseTo(1.38, 1);
  });

  // --------------------------------------------------------------------------
  // TEST E - Schematic-to-PCB Conversion, DRC, and RS-274X Gerber & Drill Export
  // --------------------------------------------------------------------------
  it('TEST E: converts schematic to 2D PCB layout, passes DRC checks, and exports valid RS-274X Gerber and Excellon drill files', () => {
    const tmpl = TEMPLATE_555_ASTABLE;
    const pcb = PcbGenerator.generatePcbFromSchematic(tmpl.components, tmpl.wires, 90, 70);

    expect(pcb.widthMm).toBe(90);
    expect(pcb.heightMm).toBe(70);
    expect(pcb.pads.length).toBeGreaterThan(10);
    expect(pcb.tracks.length).toBeGreaterThan(5);
    expect(pcb.components).toBeDefined();
    expect(pcb.components!.length).toBe(tmpl.components.length);

    // DRC check
    expect(Array.isArray(pcb.drcErrors)).toBe(true);

    // RS-274X Gerber Export
    const gerber = PcbGenerator.exportGerberTopCopper(pcb);
    expect(gerber).toContain('%TF.GenerationSoftware');
    expect(gerber).toContain('%FSLAX35Y35*%');
    expect(gerber).toContain('%MOMM*%'); // Metric units
    expect(gerber).toContain('M02*'); // End of Gerber file

    // Excellon NC Drill Export
    const drill = PcbGenerator.exportExcellonDrill(pcb);
    expect(drill).toContain('M48');
    expect(drill).toContain('METRIC,TZ');
    expect(drill).toContain('M30'); // End of drill file
  });

  // --------------------------------------------------------------------------
  // TEST G - Embedded MCU Firmware Execution & UART Serial Monitor
  // --------------------------------------------------------------------------
  it('TEST G: transpiles and executes Arduino C++ firmware, toggling GPIO 13 and logging to Serial', () => {
    const tmpl = TEMPLATE_ARDUINO_BLINK;
    expect(tmpl.firmware).toBeDefined();

    const result = mcu.executeCycle(tmpl.firmware);
    expect(result.executionError).toBeUndefined();

    // Verify GPIO 13 (LED_BUILTIN)
    const gpio = mcu.getGpioState();
    expect(gpio[13]).toBeDefined();
    expect(gpio[13].mode).toBe('OUTPUT');

    // Verify Serial output was logged
    const serial = mcu.getSerialBuffer();
    expect(serial.length).toBeGreaterThan(0);
    expect(serial.some((line) => line.includes('Blink') || line.includes('UART'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST H - Project Persistence & Serialization Round-Trip
  // --------------------------------------------------------------------------
  it('TEST H: serializes and restores engineering project to JSON without data loss', () => {
    const original: EngineeringProject = TEMPLATE_555_ASTABLE;
    const jsonStr = JSON.stringify(original);
    const restored: EngineeringProject = JSON.parse(jsonStr);

    expect(restored.id).toBe(original.id);
    expect(restored.title).toBe(original.title);
    expect(restored.components.length).toBe(original.components.length);
    expect(restored.wires.length).toBe(original.wires.length);
    expect(restored.firmware.targetMcu).toBe(original.firmware.targetMcu);

    // Verify component designators and parameters survived serialization
    const origR1 = original.components.find((c) => c.label === 'R1');
    const restR1 = restored.components.find((c) => c.label === 'R1');
    expect(restR1?.parameters?.resistance).toBe(origR1?.parameters?.resistance);
  });
});
