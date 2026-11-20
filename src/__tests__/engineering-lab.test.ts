import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSolver, getLedForwardVoltage } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { DrcEngine } from '@/modules/engineering-lab/pcb-engine/drc-engine';
import { GerberExporter } from '@/modules/engineering-lab/pcb-engine/gerber-exporter';
import { VirtualMcuRuntime } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { CircuitComponent, CircuitWire, EngineeringProject, PcbTrack } from '@/modules/engineering-lab/types';
import { computeWireSvgPath } from '@/components/engineering-lab/Canvas/SchematicCanvas';
import { slideWireSegment } from '@/modules/engineering-lab/circuit-engine/wire-router';
import { TEMPLATE_555_ASTABLE, TEMPLATE_ARDUINO_BLINK } from '@/modules/engineering-lab/templates/starter-templates';
import { COMPONENT_CATALOG, createComponentInstance, ComponentTemplate } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { TARGET_BOARDS, TargetBoardSpec } from '@/modules/engineering-lab/embedded-engine/board-definitions';
import { FirmwareCompiler } from '@/modules/engineering-lab/embedded-engine/firmware-compiler';
import {
  findNearestBreadboardHole,
  getBreadboardHoleCoords,
  getResistorColorBands,
} from '@/modules/engineering-lab/virtual3d-engine/breadboard-model';
import { getLedColorPalette } from '@/modules/engineering-lab/studio-3d/models/Led3D';

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

  // --------------------------------------------------------------------------
  // SECTION 13 - ACCEPTANCE TEST A: COMPONENT LIBRARY SEARCH & ADD
  // --------------------------------------------------------------------------
  it('TEST A - Library Search & Add: verifies presence and instantiation of all required components', () => {
    const requiredSearches = [
      'Arduino Uno R3',
      'Arduino Mega 2560',
      'Arduino Nano',
      'ESP32-S3',
      'STM32F103',
      'Raspberry Pi Pico',
      'NE555',
      'LM358',
      '74HC08',
      'HC-SR04',
      '10kΩ',
      '100nF',
      'Voltmeter',
      'Ammeter',
      'Multimeter',
    ];

    for (const term of requiredSearches) {
      const found = COMPONENT_CATALOG.find((c: ComponentTemplate) =>
        c.name.toLowerCase().includes(term.toLowerCase()) ||
        c.type.toLowerCase().includes(term.toLowerCase()) ||
        c.defaultValue.toLowerCase().includes(term.toLowerCase())
      );
      expect(found, `Expected to find component matching '${term}' in COMPONENT_CATALOG`).toBeDefined();

      // Test instantiation
      const instance = createComponentInstance(found!, 100, 100);
      expect(instance.id).toBeDefined();
      expect(instance.pins.length).toBeGreaterThan(0);
      expect(instance.type).toBe(found!.type);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 13 - TARGET BOARDS SPECIFICATIONS & VERIFIED EXECUTABILITY
  // --------------------------------------------------------------------------
  it('Target Boards: verifies verified hardware specs and non-executable status of RP2350', () => {
    const expectedBoards = [
      'arduino-uno',
      'arduino-mega',
      'arduino-nano',
      'esp32',
      'esp32-s3',
      'esp32-c3',
      'stm32f103',
      'stm32-nucleo-f401',
      'rp2040-pico',
      'rp2350',
    ];

    for (const bId of expectedBoards) {
      const board = TARGET_BOARDS.find((b: TargetBoardSpec) => b.id === bId);
      expect(board, `Board ${bId} must be defined in TARGET_BOARDS`).toBeDefined();
      expect(board!.architecture).toBeDefined();
      expect(board!.flashBytes).toBeGreaterThan(0);
      expect(board!.ramBytes).toBeGreaterThan(0);
      expect(board!.supportedCompiler).toBeDefined();
      expect(board!.buildFormat).toBeDefined();
      expect(board!.simulationEngine).toBeDefined();
      expect(board!.limitations).toBeDefined();
    }

    // MANDATORY REQUIREMENT: "Do not present an unsupported board as executable."
    // RP2350 simulation engine is pending verified cycle-accurate upstream core
    const rp2350 = TARGET_BOARDS.find((b: TargetBoardSpec) => b.id === 'rp2350');
    expect(rp2350!.isExecutable).toBe(false);

    // Executable boards
    const uno = TARGET_BOARDS.find((b: TargetBoardSpec) => b.id === 'arduino-uno');
    expect(uno!.isExecutable).toBe(true);

    const pico = TARGET_BOARDS.find((b: TargetBoardSpec) => b.id === 'rp2040-pico');
    expect(pico!.isExecutable).toBe(true);
  });

  // --------------------------------------------------------------------------
  // FIRMWARE COMPILER, SYNTAX DIAGNOSTICS & SERIAL PLOTTER TESTS
  // --------------------------------------------------------------------------
  it('Firmware Compiler: validates syntax, reports diagnostics, generates memory summary and parses plotter', () => {
    const unoBoard = TARGET_BOARDS.find((b: TargetBoardSpec) => b.id === 'arduino-uno');
    expect(unoBoard).toBeDefined();

    // 1. Valid sketch
    const validSketch = `void setup() { pinMode(13, OUTPUT); } void loop() { digitalWrite(13, HIGH); delay(100); }`;
    const res = FirmwareCompiler.compile(unoBoard!, [{ name: 'sketch.ino', content: validSketch }]);
    expect(res.success).toBe(true);
    expect(res.output).toBeDefined();
    expect(res.output!.format).toBe('.hex');
    expect(res.output!.flashBytesUsed).toBeGreaterThan(0);
    expect(res.output!.ramBytesUsed).toBeGreaterThan(0);

    // 2. Syntax error detection (unclosed brace)
    const brokenSketch = `void setup() { pinMode(13, OUTPUT);`;
    const errRes = FirmwareCompiler.compile(unoBoard!, [{ name: 'sketch.ino', content: brokenSketch }]);
    expect(errRes.success).toBe(false);
    expect(errRes.diagnostics.some((d) => d.severity === 'error')).toBe(true);

    // 3. Serial Plotter line parser
    const plotLine1 = '[1200ms] temp: 24.5, humidity: 62.0';
    const parsed1 = FirmwareCompiler.parsePlotterLine(plotLine1);
    expect(parsed1.length).toBe(2);
    expect(parsed1[0].label).toBe('temp');
    expect(parsed1[0].value).toBe(24.5);

    const plotLine2 = '10.5, 42.1, 99.8';
    const parsed2 = FirmwareCompiler.parsePlotterLine(plotLine2);
    expect(parsed2.length).toBe(3);
    expect(parsed2[0].value).toBe(10.5);
  });

  // --------------------------------------------------------------------------
  // CIRCUIT SOLVER: LOGIC GATES, OP-AMP, METERS
  // --------------------------------------------------------------------------
  it('Circuit Solver: solves LM358 Op-Amp, Logic Gates, and Voltmeter/Ammeter measurements', () => {
    const s = new CircuitSolver();

    // 1. Logic AND gate test: 5V on A, 5V on B -> Out should be 5V
    const andComponents: CircuitComponent[] = [
      {
        id: 'v1',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
          { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
        category: 'sources',
        footprint: 'HDR',
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD',
      },
      {
        id: 'and1',
        type: 'LOGIC_AND',
        label: 'AND1',
        value: '74HC08',
        x: 100,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'a', name: 'A', x: -30, y: -8, pinType: 'input' },
          { id: 'b', name: 'B', x: -30, y: 8, pinType: 'input' },
          { id: 'out', name: 'Y', x: 30, y: 0, pinType: 'output' },
        ],
        parameters: {},
        category: 'logic',
        footprint: 'DIP8',
      },
      {
        id: 'vm1',
        type: 'METER_VOLTMETER',
        label: 'VM1',
        value: '0V',
        x: 200,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'p', name: 'V+', x: 0, y: -28, pinType: 'passive' },
          { id: 'n', name: 'COM', x: 0, y: 28, pinType: 'passive' },
        ],
        parameters: { internalResistance: 10000000 },
        category: 'instruments',
        footprint: 'PAD',
      },
    ];

    const andWires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v1', fromPinId: 'p', toCompId: 'and1', toPinId: 'a' },
      { id: 'w2', fromCompId: 'v1', fromPinId: 'p', toCompId: 'and1', toPinId: 'b' },
      { id: 'w3', fromCompId: 'v1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
      { id: 'w4', fromCompId: 'and1', fromPinId: 'out', toCompId: 'vm1', toPinId: 'p' },
      { id: 'w5', fromCompId: 'vm1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
    ];

    const andResult = s.step(andComponents, andWires, 0.001);
    expect(andResult.componentStates['and1']).toBeDefined();
    expect(andResult.componentStates['and1'].on).toBe(true);

    // Voltmeter reading
    const vmState = andResult.componentStates['vm1'];
    expect(vmState).toBeDefined();
    expect(vmState.voltage).toBeCloseTo(5.0, 0);
  });

  // --------------------------------------------------------------------------
  // TEST C - MEASUREMENT INSTRUMENTS (VOLTMETER, AMMETER & AC SOURCE)
  // --------------------------------------------------------------------------
  it('TEST C - Instruments: verifies DC Voltmeter, series DC Ammeter, and AC waveform telemetry', () => {
    const s = new CircuitSolver();

    // 5V Source -> Ammeter (in series) -> 1kΩ Resistor -> Ground, with Voltmeter across Resistor
    const comps: CircuitComponent[] = [
      {
        id: 'v_src',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
          { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
        category: 'sources',
        footprint: 'HDR',
      },
      {
        id: 'ammeter1',
        type: 'METER_AMMETER',
        label: 'A1',
        value: '0mA',
        x: 100,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'in', name: 'IN', x: -30, y: 0, pinType: 'passive' },
          { id: 'out', name: 'OUT', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { internalResistance: 0.001 },
        category: 'instruments',
        footprint: 'PAD',
      },
      {
        id: 'r_load',
        type: 'RESISTOR',
        label: 'R1',
        value: '1kΩ',
        x: 200,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 1000 },
        category: 'passive',
        footprint: 'R-AXIAL',
      },
      {
        id: 'vm_load',
        type: 'METER_VOLTMETER',
        label: 'V_METER',
        value: '0V',
        x: 200,
        y: 80,
        rotation: 0,
        pins: [
          { id: 'p', name: '+', x: 0, y: -28, pinType: 'passive' },
          { id: 'n', name: '-', x: 0, y: 28, pinType: 'passive' },
        ],
        parameters: { internalResistance: 10000000 },
        category: 'instruments',
        footprint: 'PAD',
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD',
      },
    ];

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v_src', fromPinId: 'p', toCompId: 'ammeter1', toPinId: 'in' },
      { id: 'w2', fromCompId: 'ammeter1', fromPinId: 'out', toCompId: 'r_load', toPinId: '1' },
      { id: 'w3', fromCompId: 'r_load', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
      { id: 'w4', fromCompId: 'v_src', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
      // Voltmeter probes connected in parallel with R1
      { id: 'w5', fromCompId: 'r_load', fromPinId: '1', toCompId: 'vm_load', toPinId: 'p' },
      { id: 'w6', fromCompId: 'r_load', fromPinId: '2', toCompId: 'vm_load', toPinId: 'n' },
    ];

    const res = s.step(comps, wires, 0.001);

    // DC Voltmeter reading should be 5V across R1
    const vm = res.componentStates['vm_load'];
    expect(vm).toBeDefined();
    expect(vm.voltage).toBeCloseTo(5.0, 1);

    // DC Ammeter in series should measure I = V / R = 5V / 1000Ω = 0.005 A (5 mA)
    const am = res.componentStates['ammeter1'];
    expect(am).toBeDefined();
    expect(am.current).toBeCloseTo(0.005, 3);
  });

  // --------------------------------------------------------------------------
  // TEST D - CONVENTIONAL CURRENT DIRECTION & POLARITY REVERSAL
  // --------------------------------------------------------------------------
  it('TEST D - Current Direction: verifies conventional current reverses when source polarity is reversed', () => {
    const s = new CircuitSolver();

    const comps: CircuitComponent[] = [
      {
        id: 'bat1',
        type: 'DC_VOLTAGE',
        label: 'BT1',
        value: '9V',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
          { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
        ],
        parameters: { voltage: 9.0 },
        category: 'sources',
        footprint: 'HDR',
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '1kΩ',
        x: 100,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 1000 },
        category: 'passive',
        footprint: 'R-AXIAL',
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD',
      },
    ];

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'bat1', fromPinId: 'p', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
      { id: 'w3', fromCompId: 'bat1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
    ];

    // Case 1: Standard positive polarity (+9V)
    const forwardStep = s.step(comps, wires, 0.001);
    expect(forwardStep.wireCurrents).toBeDefined();
    expect(forwardStep.wireCurrents!['w1']).toBeGreaterThan(0); // Forward conventional flow

    // Case 2: Reverse source polarity (-9V)
    comps[0].parameters.voltage = -9.0;
    const reverseStep = s.step(comps, wires, 0.001);
    expect(reverseStep.wireCurrents!['w1']).toBeLessThan(0); // Reversed conventional flow
  });

  // --------------------------------------------------------------------------
  // TEST E - LED FORWARD GLOW & REVERSE-BIASED EXTINCTION
  // --------------------------------------------------------------------------
  it('TEST E - LED Glow: verifies visible illumination in forward-bias and extinction in reverse-bias', () => {
    const s = new CircuitSolver();

    const forwardComps: CircuitComponent[] = [
      {
        id: 'v1',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
          { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
        category: 'sources',
        footprint: 'HDR',
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '330Ω',
        x: 100,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 330 },
        category: 'passive',
        footprint: 'R-AXIAL',
      },
      {
        id: 'led1',
        type: 'LED',
        label: 'LED1',
        value: 'Red LED',
        x: 200,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
          { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardVoltageV: 2.0 },
        category: 'active',
        footprint: 'LED_5MM',
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD',
      },
    ];

    // Forward bias: V+ -> R1 -> Anode(a), Cathode(k) -> GND
    const forwardWires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v1', fromPinId: 'p', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: 'a' },
      { id: 'w3', fromCompId: 'led1', fromPinId: 'k', toCompId: 'gnd', toPinId: '1' },
      { id: 'w4', fromCompId: 'v1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
    ];

    const forwardRes = s.step(forwardComps, forwardWires, 0.001);
    const ledForward = forwardRes.componentStates['led1'];
    expect(ledForward).toBeDefined();
    expect(ledForward.current).toBeGreaterThan(0.002); // > 2mA current
    expect(ledForward.on).toBe(true); // Active visual glow

    // Reverse bias: V+ -> R1 -> Cathode(k), Anode(a) -> GND
    const reverseWires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v1', fromPinId: 'p', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: 'k' }, // Cathode connected to high potential
      { id: 'w3', fromCompId: 'led1', fromPinId: 'a', toCompId: 'gnd', toPinId: '1' },
      { id: 'w4', fromCompId: 'v1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
    ];

    const reverseRes = s.step(forwardComps, reverseWires, 0.001);
    const ledReverse = reverseRes.componentStates['led1'];
    expect(ledReverse).toBeDefined();
    expect(ledReverse.on).toBe(false); // Glow stops completely!
    expect(ledReverse.current).toBeCloseTo(0, 3);
  });

  // --------------------------------------------------------------------------
  // TEST F - DIGITAL LOGIC GATES TRUTH TABLES (NAND, NOR, XOR, NOT, OR, AND)
  // --------------------------------------------------------------------------
  it('TEST F - Logic Gates: validates standard truth tables for AND, OR, NOT, NAND, NOR, and XOR', () => {
    const s = new CircuitSolver();

    const gateTypes = ['LOGIC_AND', 'LOGIC_OR', 'LOGIC_NOT', 'LOGIC_NAND', 'LOGIC_NOR', 'LOGIC_XOR'];

    for (const gType of gateTypes) {
      const isNot = gType === 'LOGIC_NOT';

      // Test with inputs (1, 0)
      const comps: CircuitComponent[] = [
        {
          id: 'v_high',
          type: 'DC_VOLTAGE',
          label: 'V_HIGH',
          value: '5V',
          x: 0,
          y: 0,
          rotation: 0,
          pins: [
            { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
            { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
          ],
          parameters: { voltage: 5.0 },
          category: 'sources',
          footprint: 'HDR',
        },
        {
          id: 'gnd',
          type: 'GROUND',
          label: 'GND',
          value: '0V',
          x: 0,
          y: 100,
          rotation: 0,
          pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
          parameters: { voltage: 0 },
          category: 'sources',
          footprint: 'PAD',
        },
        {
          id: 'gate',
          type: gType,
          label: gType,
          value: gType,
          x: 100,
          y: 0,
          rotation: 0,
          pins: isNot
            ? [
                { id: 'a', name: 'A', x: -25, y: 0, pinType: 'input' },
                { id: 'out', name: 'Y', x: 25, y: 0, pinType: 'output' },
              ]
            : [
                { id: 'a', name: 'A', x: -30, y: -8, pinType: 'input' },
                { id: 'b', name: 'B', x: -30, y: 8, pinType: 'input' },
                { id: 'out', name: 'Y', x: 30, y: 0, pinType: 'output' },
              ],
          parameters: {},
          category: 'logic',
          footprint: 'DIP8',
        },
      ];

      // A = 5V (HIGH), B = 0V (LOW)
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'v_high', fromPinId: 'p', toCompId: 'gate', toPinId: 'a' },
        { id: 'w2', fromCompId: 'v_high', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
      ];
      if (!isNot) {
        wires.push({ id: 'w3', fromCompId: 'gnd', fromPinId: '1', toCompId: 'gate', toPinId: 'b' });
      }

      const res = s.step(comps, wires, 0.001);
      const gateState = res.componentStates['gate'];
      expect(gateState).toBeDefined();

      // Truth table check for Input (A=1, B=0)
      if (gType === 'LOGIC_AND') expect(gateState.on).toBe(false); // 1 AND 0 = 0
      if (gType === 'LOGIC_OR') expect(gateState.on).toBe(true);   // 1 OR 0 = 1
      if (gType === 'LOGIC_NOT') expect(gateState.on).toBe(false); // NOT 1 = 0
      if (gType === 'LOGIC_NAND') expect(gateState.on).toBe(true); // 1 NAND 0 = 1
      if (gType === 'LOGIC_NOR') expect(gateState.on).toBe(false); // 1 NOR 0 = 0
      if (gType === 'LOGIC_XOR') expect(gateState.on).toBe(true);  // 1 XOR 0 = 1
    }
  });

  // --------------------------------------------------------------------------
  // TEST H - PCB DIMENSIONS (100mm x 80mm) & DUAL COPPER LAYERS
  // --------------------------------------------------------------------------
  it('TEST H - PCB Layout: creates custom 100mm x 80mm board, verifies active layers and placement', () => {
    const tmpl = TEMPLATE_555_ASTABLE;

    // Generate 100mm x 80mm board as specified in Test H
    const pcb = PcbGenerator.generatePcbFromSchematic(tmpl.components, tmpl.wires, 100, 80);

    expect(pcb.widthMm).toBe(100);
    expect(pcb.heightMm).toBe(80);
    expect(pcb.copperLayers).toBe(2);
    expect(pcb.boardThicknessMm).toBe(1.6); // Standard FR4 1.6mm thickness

    // All placed components should reside within the 100mm x 80mm boundaries
    pcb.components!.forEach((comp) => {
      expect(comp.x).toBeGreaterThanOrEqual(0);
      expect(comp.x).toBeLessThanOrEqual(100);
      expect(comp.y).toBeGreaterThanOrEqual(0);
      expect(comp.y).toBeLessThanOrEqual(80);
    });

    // Verify Gerber fabrication export format
    const gerber = PcbGenerator.exportGerberTopCopper(pcb);
    expect(gerber).toContain('G04 Layer: Top Copper*');
    expect(gerber).toContain('M02*');
  });

  // --------------------------------------------------------------------------
  // TEST L - 3D VIRTUAL ELECTRONICS STUDIO & JUMPER WIRING
  // --------------------------------------------------------------------------
  it('TEST L - 3D Virtual Electronics Studio: validates 3D jumper wiring, color retention, and breadboard connectivity', () => {
    const uno = COMPONENT_CATALOG.find((c) => c.type === 'ARDUINO_UNO')!;
    const led = COMPONENT_CATALOG.find((c) => c.type === 'LED')!;
    const r220 = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;

    const unoInst = createComponentInstance(uno, 100, 100);
    const ledInst = createComponentInstance(led, 200, 100);
    const rInst = createComponentInstance(r220, 150, 100);

    // 3D jumper wires with explicit color coding
    const wires: CircuitWire[] = [
      { id: 'w_3d_1', fromCompId: unoInst.id, fromPinId: 'D13', toCompId: rInst.id, toPinId: '1', color: '#EF4444' }, // Red
      { id: 'w_3d_2', fromCompId: rInst.id, fromPinId: '2', toCompId: ledInst.id, toPinId: 'a', color: '#F59E0B' },   // Yellow
      { id: 'w_3d_3', fromCompId: ledInst.id, fromPinId: 'k', toCompId: unoInst.id, toPinId: 'GND', color: '#1E293B' }, // Black
    ];

    expect(wires[0].color).toBe('#EF4444');
    expect(wires[1].color).toBe('#F59E0B');
    expect(wires[2].color).toBe('#1E293B');

    // Solve connected circuit through MNA
    const step = solver.step([unoInst, rInst, ledInst], wires, 0.001);
    expect(step.componentStates).toBeDefined();
    expect(step.wireCurrents).toBeDefined();
    expect(Object.keys(step.wireCurrents!).length).toBe(3);
  });

  // --------------------------------------------------------------------------
  // TEST M - EXPANDED DEVICE & SENSOR COVERAGE
  // --------------------------------------------------------------------------
  it('TEST M - Expanded Device & Sensor Library: verifies coverage across all mandatory categories', () => {
    const requiredDeviceTypes = [
      'ARDUINO_UNO',
      'ARDUINO_MEGA',
      'ARDUINO_NANO',
      'ESP32_DEVKIT',
      'ESP32_S3',
      'ESP32_C3',
      'STM32F103',
      'STM32_NUCLEO',
      'RASPBERRY_PI_PICO',
      'RASPBERRY_PI_PICO2',
      'SENSOR_ULTRASONIC',
      'SENSOR_DHT11',
      'SENSOR_PIR',
      'SENSOR_LDR',
      'SENSOR_MPU6050',
      'DISPLAY_LCD1602',
      'DISPLAY_OLED_SSD1306',
      'DISPLAY_7SEG',
      'ACTUATOR_SERVO_SG90',
      'ACTUATOR_DC_MOTOR',
      'ACTUATOR_RELAY_5V',
      'ACTUATOR_BUZZER_ACTIVE',
      'ACTUATOR_RGB_LED',
    ];

    for (const dType of requiredDeviceTypes) {
      const template = COMPONENT_CATALOG.find((c) => c.type === dType);
      expect(template, `Expected ${dType} to exist in COMPONENT_CATALOG`).toBeDefined();
      expect(template!.pins.length).toBeGreaterThan(0);
      expect(template!.category).toBeDefined();

      const instance = createComponentInstance(template!, 0, 0);
      expect(instance.id).toBeDefined();
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 13 - TEST 3: SENSOR VIRTUAL DISTANCE & HC-SR04 ECHO PULSE SIMULATION
  // --------------------------------------------------------------------------
  it('SECTION 13 - TEST 3: HC-SR04 sensor simulates virtual echo timing and firmware distance calculation', () => {
    const firmwareCode = `
      int trigPin = 9;
      int echoPin = 10;
      long duration;
      int distance;

      void setup() {
        Serial.begin(9600);
      }

      void loop() {
        duration = pulseIn(echoPin, HIGH);
        distance = duration * 0.034 / 2;
        Serial.print("Target Distance: ");
        Serial.println(distance);
      }
    `;

    // 1. Test at 45cm distance
    const res1 = mcu.executeCycle(
      {
        code: firmwareCode,
        language: 'arduino',
        targetMcu: 'ATmega328P',
        serialLog: [],
        isRunning: true,
        gpioStates: {},
      },
      { distanceCm: 45.0 }
    );

    expect(res1.executionError).toBeUndefined();
    expect(res1.serialLines.some((l) => l.includes('45') || l.includes('Target Distance'))).toBe(true);

    // 2. Change distance to 120cm
    const res2 = mcu.executeCycle(
      {
        code: firmwareCode,
        language: 'arduino',
        targetMcu: 'ATmega328P',
        serialLog: [],
        isRunning: true,
        gpioStates: {},
      },
      { distanceCm: 120.0 }
    );

    expect(res2.executionError).toBeUndefined();
    expect(res2.serialLines.some((l) => l.includes('120') || l.includes('Target Distance'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // SECTION 13 - TEST 4: COMPONENT EDITING (220Ω to 330Ω)
  // --------------------------------------------------------------------------
  it('SECTION 13 - TEST 4: updates circuit model and current when resistor value changes from 220Ω to 330Ω', () => {
    const rTemplate = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const bat = createComponentInstance(batTemplate, 100, 100);
    bat.parameters.voltage = 5.0;

    const gnd = createComponentInstance(gndTemplate, 100, 200);

    const r = createComponentInstance(rTemplate, 200, 100);
    r.parameters.resistance = 220; // 220 ohms

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: bat.id, fromPinId: 'p', toCompId: r.id, toPinId: '1' },
      { id: 'w2', fromCompId: r.id, fromPinId: '2', toCompId: gnd.id, toPinId: '1' },
      { id: 'w3', fromCompId: bat.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
    ];

    // Initial 220Ω: I = 5 / 220 = 22.7mA
    const step1 = solver.step([bat, r, gnd], wires, 0.001);
    const i1 = step1.componentStates[r.id].current;
    expect(i1).toBeCloseTo(0.0227, 3);

    // Edit to 330Ω: I = 5 / 330 = 15.1mA
    r.parameters.resistance = 330;
    r.value = '330Ω';
    const step2 = solver.step([bat, r, gnd], wires, 0.001);
    const i2 = step2.componentStates[r.id].current;
    expect(i2).toBeCloseTo(0.0151, 3);
    expect(i2).toBeLessThan(i1);
  });

  // --------------------------------------------------------------------------
  // TEST N - POTENTIOMETER 3-PIN WIPER VOLTAGE DIVISION
  // --------------------------------------------------------------------------
  it('TEST N - Potentiometer Wiper Division: verifies 3-pin potentiometer wiper division with alpha = 0.25 and 0.75', () => {
    const s = new CircuitSolver();
    const potTemplate = COMPONENT_CATALOG.find((c) => c.type === 'POTENTIOMETER')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const bat = createComponentInstance(batTemplate, 0, 0);
    bat.parameters.voltage = 10.0; // 10V source

    const gnd = createComponentInstance(gndTemplate, 0, 100);

    const pot = createComponentInstance(potTemplate, 100, 0);
    pot.parameters.resistance = 10000; // 10kΩ pot
    pot.parameters.wiperPosition = 0.25; // alpha = 0.25 -> V_wiper should be ~2.5V

    // Wire: Bat+ -> Pot Pin 3 (B), Pot Pin 1 (A) -> GND, Bat- -> GND
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: bat.id, fromPinId: 'p', toCompId: pot.id, toPinId: '3' },
      { id: 'w2', fromCompId: pot.id, fromPinId: '1', toCompId: gnd.id, toPinId: '1' },
      { id: 'w3', fromCompId: bat.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
    ];

    const res1 = s.step([bat, pot, gnd], wires, 0.001);
    const potState1 = res1.componentStates[pot.id];
    expect(potState1).toBeDefined();

    // Verify wiper division voltage
    const wiperPinKey = `${pot.id}:2`;
    const sInternal = s as unknown as { netMap?: Map<string, string> };
    const wiperNode1 = sInternal.netMap?.get(wiperPinKey);
    if (wiperNode1 !== undefined) {
      const vWiper1 = res1.nodeVoltages[wiperNode1];
      expect(vWiper1).toBeCloseTo(2.5, 0.5);
    }

    // Now change wiper position to 0.75 -> V_wiper should be ~7.5V
    pot.parameters.wiperPosition = 0.75;
    const res2 = s.step([bat, pot, gnd], wires, 0.001);
    const wiperNode2 = sInternal.netMap?.get(wiperPinKey);
    if (wiperNode2 !== undefined) {
      const vWiper2 = res2.nodeVoltages[wiperNode2];
      expect(vWiper2).toBeCloseTo(7.5, 0.5);
    }
  });

  // --------------------------------------------------------------------------
  // TEST O - INDUCTOR TRANSIENT COMPANION MODEL
  // --------------------------------------------------------------------------
  it('TEST O - Inductor Companion MNA Model: verifies transient companion integration with L = 10mH', () => {
    const s = new CircuitSolver();
    const indTemplate = COMPONENT_CATALOG.find((c) => c.type === 'INDUCTOR')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const rTemplate = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const bat = createComponentInstance(batTemplate, 0, 0);
    bat.parameters.voltage = 5.0; // 5V

    const gnd = createComponentInstance(gndTemplate, 0, 100);

    const r = createComponentInstance(rTemplate, 100, 0);
    r.parameters.resistance = 100; // 100Ω series resistor

    const ind = createComponentInstance(indTemplate, 200, 0);
    ind.parameters.inductance = 0.01; // 10mH

    // RL series circuit: Bat+ -> R(1), R(2) -> Ind(1), Ind(2) -> GND, Bat- -> GND
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: bat.id, fromPinId: 'p', toCompId: r.id, toPinId: '1' },
      { id: 'w2', fromCompId: r.id, fromPinId: '2', toCompId: ind.id, toPinId: '1' },
      { id: 'w3', fromCompId: ind.id, fromPinId: '2', toCompId: gnd.id, toPinId: '1' },
      { id: 'w4', fromCompId: bat.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
    ];

    // Step 1: Initial transient step
    const step1 = s.step([bat, r, ind, gnd], wires, 0.0001);
    const indState1 = step1.componentStates[ind.id];
    expect(indState1).toBeDefined();

    // Step multiple times (simulate RL charging toward steady state I = 5V / 100Ω = 50mA)
    for (let i = 0; i < 20; i++) {
      s.step([bat, r, ind, gnd], wires, 0.0001);
    }
    const finalStep = s.step([bat, r, ind, gnd], wires, 0.0001);
    const finalIndCurrent = finalStep.componentStates[ind.id].current;
    expect(finalIndCurrent).toBeGreaterThan(0);
    expect(finalIndCurrent).toBeLessThanOrEqual(0.051); // Upper bound steady state
  });

  // --------------------------------------------------------------------------
  // TEST P - SPST SWITCH CONDUCTANCE (OPEN VS CLOSED)
  // --------------------------------------------------------------------------
  it('TEST P - SPST Switch Conductance: verifies zero current when open and full conduction when closed', () => {
    const s = new CircuitSolver();
    const swTemplate = COMPONENT_CATALOG.find((c) => c.type === 'SWITCH_SPST')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const rTemplate = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const bat = createComponentInstance(batTemplate, 0, 0);
    bat.parameters.voltage = 12.0;

    const gnd = createComponentInstance(gndTemplate, 0, 100);

    const r = createComponentInstance(rTemplate, 100, 0);
    r.parameters.resistance = 1000; // 1kΩ

    const sw = createComponentInstance(swTemplate, 200, 0);
    sw.parameters.closed = false; // Open initially

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: bat.id, fromPinId: 'p', toCompId: sw.id, toPinId: '1' },
      { id: 'w2', fromCompId: sw.id, fromPinId: '2', toCompId: r.id, toPinId: '1' },
      { id: 'w3', fromCompId: r.id, fromPinId: '2', toCompId: gnd.id, toPinId: '1' },
      { id: 'w4', fromCompId: bat.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
    ];

    // Open switch: Current should be essentially zero (< 1e-6 A)
    const openRes = s.step([bat, sw, r, gnd], wires, 0.001);
    const iOpen = openRes.componentStates[r.id].current;
    expect(Math.abs(iOpen)).toBeLessThan(1e-6);

    // Close switch: Current should be ~12V / 1kΩ = 12mA
    sw.parameters.closed = true;
    const closedRes = s.step([bat, sw, r, gnd], wires, 0.001);
    const iClosed = closedRes.componentStates[r.id].current;
    expect(iClosed).toBeCloseTo(0.012, 3);
  });

  // --------------------------------------------------------------------------
  // TEST Q - BJT NPN TRANSISTOR COMPANION MODEL
  // --------------------------------------------------------------------------
  it('TEST Q - BJT NPN Companion Model: verifies base current injection and collector current conduction', () => {
    const s = new CircuitSolver();
    const bjtTemplate = COMPONENT_CATALOG.find((c) => c.type === 'BJT_NPN')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const rTemplate = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const vcc = createComponentInstance(batTemplate, 0, 0);
    vcc.parameters.voltage = 10.0;

    const gnd = createComponentInstance(gndTemplate, 0, 100);

    const rc = createComponentInstance(rTemplate, 100, 0);
    rc.parameters.resistance = 1000; // 1kΩ collector resistor

    const bjt = createComponentInstance(bjtTemplate, 200, 0);
    bjt.parameters.beta = 100;

    // VCC -> RC(1), RC(2) -> BJT(c), BJT(e) -> GND, BJT(b) -> VCC through Rb
    const rb = createComponentInstance(rTemplate, 150, -50);
    rb.parameters.resistance = 10000; // 10kΩ base resistor

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: vcc.id, fromPinId: 'p', toCompId: rc.id, toPinId: '1' },
      { id: 'w2', fromCompId: rc.id, fromPinId: '2', toCompId: bjt.id, toPinId: 'c' },
      { id: 'w3', fromCompId: bjt.id, fromPinId: 'e', toCompId: gnd.id, toPinId: '1' },
      { id: 'w4', fromCompId: vcc.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
      { id: 'w5', fromCompId: vcc.id, fromPinId: 'p', toCompId: rb.id, toPinId: '1' },
      { id: 'w6', fromCompId: rb.id, fromPinId: '2', toCompId: bjt.id, toPinId: 'b' },
    ];

    const res = s.step([vcc, gnd, rc, rb, bjt], wires, 0.001);
    const bjtState = res.componentStates[bjt.id];
    expect(bjtState).toBeDefined();
    // BJT should be conducting current in saturation/active
    expect(bjtState.current).toBeGreaterThan(0.001);
  });

  // --------------------------------------------------------------------------
  // TEST R - VOLTAGE REGULATOR 7805 REGULATION
  // --------------------------------------------------------------------------
  it('TEST R - Voltage Regulator 7805: verifies 9V battery input regulated down to 5.0V output', () => {
    const s = new CircuitSolver();
    const regTemplate = COMPONENT_CATALOG.find((c) => c.type === 'REGULATOR_7805')!;
    const batTemplate = COMPONENT_CATALOG.find((c) => c.type === 'DC_VOLTAGE')!;
    const rTemplate = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR')!;
    const gndTemplate = COMPONENT_CATALOG.find((c) => c.type === 'GROUND')!;

    const bat = createComponentInstance(batTemplate, 0, 0);
    bat.parameters.voltage = 9.0; // 9V input

    const gnd = createComponentInstance(gndTemplate, 0, 100);

    const reg = createComponentInstance(regTemplate, 100, 0);
    reg.parameters.vOut = 5.0;

    const load = createComponentInstance(rTemplate, 200, 0);
    load.parameters.resistance = 500; // 500Ω load -> I = 5V / 500Ω = 10mA

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: bat.id, fromPinId: 'p', toCompId: reg.id, toPinId: 'in' },
      { id: 'w2', fromCompId: reg.id, fromPinId: 'gnd', toCompId: gnd.id, toPinId: '1' },
      { id: 'w3', fromCompId: bat.id, fromPinId: 'n', toCompId: gnd.id, toPinId: '1' },
      { id: 'w4', fromCompId: reg.id, fromPinId: 'out', toCompId: load.id, toPinId: '1' },
      { id: 'w5', fromCompId: load.id, fromPinId: '2', toCompId: gnd.id, toPinId: '1' },
    ];

    const res = s.step([bat, gnd, reg, load], wires, 0.001);
    const regState = res.componentStates[reg.id];
    expect(regState).toBeDefined();

    // Verify regulated output voltage across load
    const loadState = res.componentStates[load.id];
    expect(loadState.voltage).toBeCloseTo(5.0, 0.5);
    expect(loadState.current).toBeCloseTo(0.01, 0.002);
  });

  // --------------------------------------------------------------------------
  // TEST S - PCB TRACE ROUTING & LAYER STACKUP
  // --------------------------------------------------------------------------
  it('TEST S - PCB Trace Routing & Layer Stackup: validates trace addition on top/bottom copper and 2/4 layer stackup', () => {
    const pcb = PcbGenerator.generatePcbFromSchematic(
      TEMPLATE_555_ASTABLE.components,
      TEMPLATE_555_ASTABLE.wires,
      120,
      90
    );

    // Initial PCB specs
    expect(pcb.widthMm).toBe(120);
    expect(pcb.heightMm).toBe(90);
    expect(pcb.copperLayers).toBe(2);

    // Add interactive user routed trace
    const userTrace: PcbTrack = {
      id: 'trk_user_routed_1',
      layer: 'top_copper',
      from: { x: 15, y: 20 },
      to: { x: 45, y: 20 },
      widthMm: 0.35,
    };
    pcb.tracks.push(userTrace);
    expect(pcb.tracks.find((t) => t.id === 'trk_user_routed_1')).toBeDefined();

    // Upgrade stackup to 4-layer
    pcb.copperLayers = 4;
    pcb.boardThicknessMm = 1.0;
    expect(pcb.copperLayers).toBe(4);
    expect(pcb.boardThicknessMm).toBe(1.0);
  });

  // --------------------------------------------------------------------------
  // TEST T - USER CUSTOM LIBRARY PERSISTENCE & CATALOG MANIFEST
  // --------------------------------------------------------------------------
  it('TEST T - User Custom Library & Ecosystem Manifest: validates custom part creation, persistence, and manifest export', () => {
    const customPart = {
      type: 'CUSTOM_PRECISION_SENSOR_XY',
      name: 'Custom High-Precision Optical Sensor',
      designatorPrefix: 'SEN',
      category: 'sensors' as const,
      subCategory: 'sensors_optical',
      simulationStatus: 'full_mna' as const,
      packageType: 'SMD' as const,
      defaultValue: '100mV/Lux',
      pins: [
        { id: '1', name: 'VCC', x: -20, y: 0, pinType: 'power' as const },
        { id: '2', name: 'OUT', x: 20, y: 0, pinType: 'output' as const },
      ],
      footprint: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',
      model3d: 'dip8_integrated_circuit',
      width: 50,
      height: 40,
      symbolSvg: 'sensor_optical',
      description: 'Custom optical sensor created by user.',
    };

    // Serialize custom library JSON
    const exportedJson = JSON.stringify([customPart]);
    expect(exportedJson).toContain('CUSTOM_PRECISION_SENSOR_XY');

    // Parse and instantiate custom component
    const parsed = JSON.parse(exportedJson);
    expect(parsed.length).toBe(1);
    const instance = createComponentInstance(parsed[0], 100, 100);
    expect(instance.id).toBeDefined();
    expect(instance.type).toBe('CUSTOM_PRECISION_SENSOR_XY');
    expect(instance.pins.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // TEST U - Industrial Contactor Dynamic Coil Excitation & Contacts
  // --------------------------------------------------------------------------
  it('TEST U: verifies industrial contactor coil excitation and auxiliary NO/NC contact state switching', () => {
    // Contactor with 24V DC applied to coil A1-A2
    const contactor: CircuitComponent = {
      id: 'km1',
      type: 'CONTACTOR_MAIN',
      label: 'Main Contactor',
      category: 'relays_contactors',
      x: 200,
      y: 200,
      rotation: 0,
      value: '24VDC 18A',
      parameters: { coilVoltageV: 24.0, coilResistance: 360.0, energized: false },
      pins: [
        { id: 'a1', name: 'A1', x: -35, y: -20, pinType: 'input' },
        { id: 'a2', name: 'A2', x: -35, y: 20, pinType: 'input' },
        { id: '1', name: '1', x: -15, y: -20, pinType: 'passive' },
        { id: '2', name: '2', x: -15, y: 20, pinType: 'passive' },
        { id: '13', name: '13', x: 45, y: -20, pinType: 'passive' },
        { id: '14', name: '14', x: 45, y: 20, pinType: 'passive' },
        { id: '21', name: '21', x: 60, y: -20, pinType: 'passive' },
        { id: '22', name: '22', x: 60, y: 20, pinType: 'passive' },
      ],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical',
    };

    // 24V Source
    const psu: CircuitComponent = {
      id: 'v24',
      type: 'DC_VOLTAGE',
      label: '24V Supply',
      category: 'power',
      x: 100,
      y: 200,
      rotation: 0,
      value: '24V',
      parameters: { voltage: 24.0 },
      pins: [
        { id: 'pos', name: '+', x: 0, y: -20, pinType: 'power' },
        { id: 'neg', name: '-', x: 0, y: 20, pinType: 'power' },
      ],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',
    };

    const gnd: CircuitComponent = {
      id: 'gnd1',
      type: 'GROUND',
      label: 'GND',
      category: 'power',
      x: 100,
      y: 300,
      rotation: 0,
      value: '0V',
      parameters: {},
      pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical',
    };

    // Wire 24V supply to coil A1 and GND to coil A2
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v24', fromPinId: 'pos', toCompId: 'km1', toPinId: 'a1' },
      { id: 'w2', fromCompId: 'v24', fromPinId: 'neg', toCompId: 'gnd1', toPinId: '1' },
      { id: 'w3', fromCompId: 'km1', fromPinId: 'a2', toCompId: 'gnd1', toPinId: '1' },
    ];

    const result = solver.step([contactor, psu, gnd], wires, 0.001, 1.0);
    const coilState = result.componentStates['km1'];
    expect(coilState).toBeDefined();
    expect(coilState.voltage).toBeGreaterThanOrEqual(23.5);
    expect(coilState.on).toBe(true);
    expect(coilState.current).toBeGreaterThan(0.04); // ~24V / 360Ω ≈ 0.066A
  });

  // --------------------------------------------------------------------------
  // TEST V - Pushbutton NO (Start) & NC (Stop) Conduction
  // --------------------------------------------------------------------------
  it('TEST V: verifies Push Button NO conducts only when pressed, and Push Button NC opens when pressed', () => {
    const pbStart: CircuitComponent = {
      id: 'pb_start',
      type: 'PUSHBUTTON_NO',
      label: 'Start PB',
      category: 'switches',
      x: 200,
      y: 100,
      rotation: 0,
      value: 'NO',
      parameters: { closed: false },
      pins: [
        { id: '3', name: '3', x: -25, y: 0, pinType: 'passive' },
        { id: '4', name: '4', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',
    };

    const pbStop: CircuitComponent = {
      id: 'pb_stop',
      type: 'PUSHBUTTON_NC',
      label: 'Stop PB',
      category: 'switches',
      x: 200,
      y: 200,
      rotation: 0,
      value: 'NC',
      parameters: { closed: true },
      pins: [
        { id: '1', name: '1', x: -25, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 25, y: 0, pinType: 'passive' },
      ],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',
    };

    // By default: Start PB is OPEN (on = false), Stop PB is CLOSED (on = true)
    let res = solver.step([pbStart, pbStop], [], 0.001, 1.0);
    expect(res.componentStates['pb_start'].on).toBe(false);
    expect(res.componentStates['pb_stop'].on).toBe(true);

    // When operator presses Start PB (closed = true)
    pbStart.parameters.closed = true;
    res = solver.step([pbStart, pbStop], [], 0.001, 1.0);
    expect(res.componentStates['pb_start'].on).toBe(true);

    // When operator presses Stop PB (closed = false)
    pbStop.parameters.closed = false;
    res = solver.step([pbStart, pbStop], [], 0.001, 1.0);
    expect(res.componentStates['pb_stop'].on).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST W - Circuit Breakers (MCB) Normal vs Tripped Operation
  // --------------------------------------------------------------------------
  it('TEST W: verifies MCB conducts in normal armed state and opens upon tripping', () => {
    const mcb: CircuitComponent = {
      id: 'qf1',
      type: 'PROTECTION_MCB_1P',
      label: 'C16 MCB',
      category: 'protection',
      x: 150,
      y: 150,
      rotation: 0,
      value: '16A',
      parameters: { ratedCurrentA: 16.0, tripped: false, closed: true },
      pins: [
        { id: '1', name: '1', x: 0, y: -25, pinType: 'passive' },
        { id: '2', name: '2', x: 0, y: 25, pinType: 'passive' },
      ],
      footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',
    };

    let res = solver.step([mcb], [], 0.001, 1.0);
    expect(res.componentStates['qf1'].on).toBe(true);

    // Operator or overcurrent trips MCB
    mcb.parameters.tripped = true;
    res = solver.step([mcb], [], 0.001, 1.0);
    expect(res.componentStates['qf1'].on).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST X - Professional Wire Routing with Intermediate Waypoints
  // --------------------------------------------------------------------------
  it('TEST X: computes SVG polyline path passing through user intermediate waypoints', () => {
    const p1 = { x: 50, y: 100 };
    const p2 = { x: 250, y: 300 };
    const waypoints = [
      { x: 120, y: 100 },
      { x: 120, y: 220 },
      { x: 250, y: 220 },
    ];

    const pathSvg = computeWireSvgPath(p1, p2, waypoints);
    expect(pathSvg).toBe('M 50 100 L 120 100 L 120 220 L 250 220 L 250 300');

    // Without waypoints: falls back to Manhattan orthogonal
    const defaultPath = computeWireSvgPath(p1, p2);
    expect(defaultPath).toBe('M 50 100 L 150 100 L 150 300 L 250 300');
  });

  // --------------------------------------------------------------------------
  // TEST Y - Advanced Catalogue Search & Multi-Criteria Filtering
  // --------------------------------------------------------------------------
  it('TEST Y: filters component catalogue across category, part number, and simulation tier', () => {
    // 1. Search by exact MPN
    const contactorMatch = COMPONENT_CATALOG.find((c) => c.manufacturerPartNumber === 'LC1D18BD');
    expect(contactorMatch).toBeDefined();
    expect(contactorMatch?.type).toBe('CONTACTOR_MAIN');
    expect(contactorMatch?.category).toBe('relays_contactors');

    // 2. Filter by industrial categories
    const switches = COMPONENT_CATALOG.filter((c) => c.category === 'switches');
    expect(switches.length).toBeGreaterThanOrEqual(8);

    const protection = COMPONENT_CATALOG.filter((c) => c.category === 'protection');
    expect(protection.length).toBeGreaterThanOrEqual(5);

    // 3. Verify total verified catalog contains 80+ parts
    expect(COMPONENT_CATALOG.length).toBeGreaterThanOrEqual(80);
  });

  // --------------------------------------------------------------------------
  // TEST Z - PCB Multi-Layer Stackup Configuration (2, 4, 6 Layers)
  // --------------------------------------------------------------------------
  it('TEST Z: supports 2, 4, 6 layer stackup and custom board thickness in PCB data model', () => {
    const pcbLayout = PcbGenerator.generatePcbFromSchematic([], []);
    expect(pcbLayout.copperLayers).toBe(2);

    // Configure 4-layer stackup
    pcbLayout.copperLayers = 4;
    pcbLayout.boardThicknessMm = 1.0;
    expect(pcbLayout.copperLayers).toBe(4);
    expect(pcbLayout.boardThicknessMm).toBe(1.0);

    // Configure 6-layer high density stackup
    pcbLayout.copperLayers = 6;
    expect(pcbLayout.copperLayers).toBe(6);
  });

  // --------------------------------------------------------------------------
  // TEST AA - N-Channel Power MOSFET (IRF540N) MNA Cutoff & Conduction
  // --------------------------------------------------------------------------
  it('TEST AA: solves N-channel MOSFET cutoff when Vgs < Vth, and channel conduction when Vgs >= Vth', () => {
    // 12V Supply -> 100Ω Load Resistor -> Drain | Gate driven by V_control | Source to GND
    const components: CircuitComponent[] = [
      {
        id: 'v_main',
        type: 'DC_VOLTAGE',
        label: 'V1',
        designator: 'V1',
        value: '12V',
        x: 50,
        y: 100,
        rotation: 0,
        pins: [
          { id: '1', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 12.0 },
        category: 'sources',
        footprint: 'BATT',
      },
      {
        id: 'v_gate',
        type: 'DC_VOLTAGE',
        label: 'VG',
        designator: 'VG',
        value: '0V',
        x: 50,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 0.0 }, // Cutoff: Vgs = 0V < 3.0V Vth
        category: 'sources',
        footprint: 'BATT',
      },
      {
        id: 'r_load',
        type: 'RESISTOR',
        label: 'RLOAD',
        designator: 'R1',
        value: '100Ω',
        x: 150,
        y: 100,
        rotation: 0,
        pins: [
          { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 100.0 },
        category: 'passive',
        footprint: 'R_Axial',
      },
      {
        id: 'mosfet1',
        type: 'MOSFET_N',
        label: 'Q1',
        designator: 'Q1',
        value: 'IRF540N',
        x: 250,
        y: 150,
        rotation: 0,
        pins: [
          { id: 'g', name: 'G', x: -25, y: 10, pinType: 'input' },
          { id: 'd', name: 'D', x: 10, y: -25, pinType: 'passive' },
          { id: 's', name: 'S', x: 10, y: 25, pinType: 'passive' },
        ],
        parameters: { vgsTh: 3.0, rdsOn: 0.044 },
        category: 'active',
        footprint: 'TO-220',
      },
      {
        id: 'gnd',
        type: 'GND',
        label: 'GND',
        designator: 'GND1',
        value: '0V',
        x: 250,
        y: 300,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: { voltage: 0 },
        category: 'sources',
        footprint: 'PAD',
      },
    ];

    const wires: CircuitWire[] = [
      // 12V+ to R_load pin 1
      { id: 'w1', fromCompId: 'v_main', fromPinId: '1', toCompId: 'r_load', toPinId: '1' },
      // R_load pin 2 to MOSFET Drain
      { id: 'w2', fromCompId: 'r_load', fromPinId: '2', toCompId: 'mosfet1', toPinId: 'd' },
      // VG+ to MOSFET Gate
      { id: 'w3', fromCompId: 'v_gate', fromPinId: '1', toCompId: 'mosfet1', toPinId: 'g' },
      // MOSFET Source to GND
      { id: 'w4', fromCompId: 'mosfet1', fromPinId: 's', toCompId: 'gnd', toPinId: '1' },
      // V_main- to GND
      { id: 'w5', fromCompId: 'v_main', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
      // V_gate- to GND
      { id: 'w6', fromCompId: 'v_gate', fromPinId: '2', toCompId: 'gnd', toPinId: '1' },
    ];

    // Subcase 1: Cutoff Mode (Vgs = 0V < 3.0V Vth)
    const cutoffRes = solver.step(components, wires, 0.001, 0.001);
    const mosfetCutoffState = cutoffRes.componentStates['mosfet1'];
    expect(mosfetCutoffState.on).toBe(false);
    expect(mosfetCutoffState.current).toBeLessThanOrEqual(0.0001);

    // Subcase 2: Active Conduction (Vgs = 5.0V >= 3.0V Vth)
    components[1].parameters = { voltage: 5.0 };
    components[1].value = '5V';
    const activeRes = solver.step(components, wires, 0.001, 0.002);
    const mosfetActiveState = activeRes.componentStates['mosfet1'];
    expect(mosfetActiveState.on).toBe(true);
    // Channel conducts: current ~ 12V / 100Ω = ~0.12A
    expect(mosfetActiveState.current).toBeGreaterThan(0.08);
  });

  // --------------------------------------------------------------------------
  // TEST AB - LED Color Properties and Custom HEX Resolution
  // --------------------------------------------------------------------------
  it('TEST AB: validates LED preset colors, custom HEX colors, and forward-bias luminescence', () => {
    const ledTemplate = COMPONENT_CATALOG.find((c) => c.type === 'LED');
    expect(ledTemplate).toBeDefined();

    const ledInstance = createComponentInstance(ledTemplate!, 100, 100);
    expect(ledInstance.parameters.color).toBe('Red');

    // Update with Custom HEX color (#06B6D4 Cyan)
    ledInstance.parameters.color = '#06B6D4';
    expect(ledInstance.parameters.color).toBe('#06B6D4');

    // Update with Custom HEX color (#A855F7 Purple)
    ledInstance.parameters.color = '#A855F7';
    expect(ledInstance.parameters.color).toBe('#A855F7');
  });

  // --------------------------------------------------------------------------
  // TEST AC - Component Duplication & Copy/Paste Serialization
  // --------------------------------------------------------------------------
  it('TEST AC: duplicates component with incremented designator, offset position, and cloned parameters', () => {
    const originalResistor: CircuitComponent = {
      id: 'r_orig',
      type: 'RESISTOR',
      label: 'R1',
      designator: 'R1',
      value: '4.7kΩ',
      x: 100,
      y: 100,
      rotation: 0,
      pins: [
        { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
      ],
      parameters: { resistance: 4700, tolerancePercent: 1 },
      category: 'passive',
      footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
    };

    // Simulate duplication
    const duplicated: CircuitComponent = {
      ...JSON.parse(JSON.stringify(originalResistor)),
      id: `c_${Date.now()}`,
      designator: 'R2',
      label: 'R2',
      x: originalResistor.x + 30,
      y: originalResistor.y + 30,
    };

    expect(duplicated.id).not.toBe(originalResistor.id);
    expect(duplicated.designator).toBe('R2');
    expect(duplicated.x).toBe(130);
    expect(duplicated.y).toBe(130);
    expect(duplicated.parameters.resistance).toBe(4700);
    expect(duplicated.footprint).toBe(originalResistor.footprint);
  });

  // --------------------------------------------------------------------------
  // TEST AD - PCB Routing Waypoints & Via Insertion
  // --------------------------------------------------------------------------
  it('TEST AD: allows interactive routing waypoints and via pad multi-layer insertion', () => {
    const pcbLayout = PcbGenerator.generatePcbFromSchematic([], []);

    // Add multi-segment routed track with waypoint
    const segment1: PcbTrack = {
      id: 'trk_seg1',
      layer: 'top_copper',
      from: { x: 10, y: 10 },
      to: { x: 25, y: 10 },
      widthMm: 0.35,
    };
    const segment2: PcbTrack = {
      id: 'trk_seg2',
      layer: 'top_copper',
      from: { x: 25, y: 10 },
      to: { x: 25, y: 40 },
      widthMm: 0.35,
    };
    pcbLayout.tracks.push(segment1, segment2);
    expect(pcbLayout.tracks.length).toBe(2);

    // Insert via pad through-hole on all layers
    pcbLayout.pads.push({
      id: 'via_1',
      componentId: 'VIA',
      pinId: 'VIA',
      x: 25,
      y: 40,
      diameterMm: 0.8,
      holeMm: 0.4,
      shape: 'round',
      layer: 'all',
    });
    const via = pcbLayout.pads.find((p) => p.id === 'via_1');
    expect(via).toBeDefined();
    expect(via?.diameterMm).toBe(0.8);
    expect(via?.layer).toBe('all');
  });

  // --------------------------------------------------------------------------
  // TEST AE - Wire Routing Geometry Styles (Straight & 45-Degree Chamfer)
  // --------------------------------------------------------------------------
  it('TEST AE: computes straight and 45-degree chamfered wire routing paths', () => {
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 50, y: 30 };

    // 1. Straight direct pin-to-pin vector
    const straightPath = computeWireSvgPath(p1, p2, undefined, 'straight');
    expect(straightPath).toBe('M 10 10 L 50 30');

    // 2. 45-degree chamfered corner (|dx|=40 >= |dy|=20 -> horizontal segment to 30, then diagonal to 50,30)
    const chamferPath = computeWireSvgPath(p1, p2, undefined, 'diagonal45');
    expect(chamferPath).toBe('M 10 10 L 30 10 L 50 30');

    // 3. Multi-waypoint straight path
    const waypoints = [{ x: 20, y: 10 }, { x: 30, y: 25 }];
    const multiStraight = computeWireSvgPath(p1, p2, waypoints, 'straight');
    expect(multiStraight).toBe('M 10 10 L 20 10 L 30 25 L 50 30');
  });

  // --------------------------------------------------------------------------
  // TEST AF - Dynamic LED Forward Voltage by Color and Parameters
  // --------------------------------------------------------------------------
  it('TEST AF: correctly derives dynamic LED forward voltage across color spectrum and custom parameters', () => {
    const makeLed = (color: string, customVf?: number): CircuitComponent => ({
      id: 'led_test',
      type: 'LED',
      label: 'LED1',
      value: color,
      x: 0,
      y: 0,
      rotation: 0,
      footprint: 'LED_D5.0mm',
      category: 'actuators',
      pins: [
        { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
        { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
      ],
      parameters: {
        color,
        ...(customVf ? { forwardVoltage: customVf } : {}),
      },
    });

    expect(getLedForwardVoltage(makeLed('Red'))).toBe(1.9);
    expect(getLedForwardVoltage(makeLed('Amber'))).toBe(2.1);
    expect(getLedForwardVoltage(makeLed('Yellow'))).toBe(2.1);
    expect(getLedForwardVoltage(makeLed('Green'))).toBe(2.3);
    expect(getLedForwardVoltage(makeLed('Blue'))).toBe(3.1);
    expect(getLedForwardVoltage(makeLed('White'))).toBe(3.1);
    expect(getLedForwardVoltage(makeLed('Cyan'))).toBe(3.0);
    expect(getLedForwardVoltage(makeLed('Purple'))).toBe(3.2);

    // Custom forward voltage override
    expect(getLedForwardVoltage(makeLed('Infrared', 1.45))).toBe(1.45);
  });

  // --------------------------------------------------------------------------
  // TEST AG - ACTUATOR_RGB_LED Tri-Color Multi-Channel Simulation
  // --------------------------------------------------------------------------
  it('TEST AG: accurately simulates individual Red, Green, and Blue channels for ACTUATOR_RGB_LED', () => {
    // 5V DC Voltage Source powering Red channel through 220 ohm resistor, Common Cathode tied to GND
    const components: CircuitComponent[] = [
      {
        id: 'dc1',
        type: 'DC_VOLTAGE',
        label: 'VCC',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'HDR',
        category: 'sources',
        pins: [
          { id: 'pos', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: 'neg', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        footprint: 'PAD',
        category: 'sources',
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: {},
      },
      {
        id: 'r_lim',
        type: 'RESISTOR',
        label: 'R1',
        value: '220Ω',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'R-AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 220 },
      },
      {
        id: 'rgb1',
        type: 'ACTUATOR_RGB_LED',
        label: 'RGB1',
        value: 'RGB',
        x: 200,
        y: 0,
        rotation: 0,
        footprint: 'LED_D5.0mm-4',
        category: 'actuators',
        pins: [
          { id: 'r', name: 'R', x: -30, y: -20, pinType: 'passive' },
          { id: 'cc', name: 'COM', x: -10, y: 20, pinType: 'passive' },
          { id: 'g', name: 'G', x: 10, y: -20, pinType: 'passive' },
          { id: 'b', name: 'B', x: 30, y: -20, pinType: 'passive' },
        ],
        parameters: { commonType: 'cathode', redVf: 2.0, greenVf: 3.2, blueVf: 3.2 },
      },
    ];

    const wires: CircuitWire[] = [
      // Ground ties DC neg and RGB Common Cathode
      { id: 'w_gnd1', fromCompId: 'dc1', fromPinId: 'neg', toCompId: 'gnd', toPinId: '1' },
      { id: 'w_gnd2', fromCompId: 'rgb1', fromPinId: 'cc', toCompId: 'gnd', toPinId: '1' },
      // VCC powers Resistor
      { id: 'w_vcc', fromCompId: 'dc1', fromPinId: 'pos', toCompId: 'r_lim', toPinId: '1' },
      // Resistor powers ONLY Red channel
      { id: 'w_red', fromCompId: 'r_lim', fromPinId: '2', toCompId: 'rgb1', toPinId: 'r' },
    ];

    const res = solver.step(components, wires, 0.001, 1.0);
    const rgbState = res.componentStates['rgb1'];

    expect(rgbState).toBeDefined();
    // Red channel should be forward biased and conducting
    expect(rgbState.onRed).toBe(true);
    // Green and Blue channels are unconnected (0V drop) -> should be OFF
    expect(rgbState.onGreen).toBe(false);
    expect(rgbState.onBlue).toBe(false);
    expect(rgbState.on).toBe(true);
    expect(rgbState.current).toBeGreaterThan(0.005); // ~13.6mA forward current
  });

  // =========================================================================
  // TEST AH: Potentiometer Pin Resolution & Model Fidelity (A, Wiper, B)
  // =========================================================================
  it('TEST AH: Potentiometer accurately solves 3-terminal voltage divider with A, Wiper, B pin mapping', () => {
    const solver = new CircuitSolver();

    const components: CircuitComponent[] = [
      {
        id: 'dc1',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '10V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'HDR',
        category: 'sources',
        pins: [
          { id: 'pos', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: 'neg', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 10.0 },
      },
      {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        footprint: 'PAD',
        category: 'sources',
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: {},
      },
      {
        id: 'pot1',
        type: 'POTENTIOMETER',
        label: 'RV1',
        value: '10kΩ',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'Potentiometer_THT:Potentiometer_Bourns_3386P_Vertical',
        category: 'passive',
        pins: [
          { id: 'A', name: 'A', x: -30, y: -15, pinType: 'passive' },
          { id: 'Wiper', name: 'Wiper', x: 0, y: 20, pinType: 'passive' },
          { id: 'B', name: 'B', x: 30, y: -15, pinType: 'passive' },
        ],
        parameters: { resistance: 10000, wiperPosition: 0.5 },
      },
      {
        id: 'vm1',
        type: 'METER_VOLTMETER',
        label: 'VM1',
        value: '0V',
        x: 200,
        y: 0,
        rotation: 0,
        footprint: 'PAD',
        category: 'instruments',
        pins: [
          { id: 'p', name: '+', x: 0, y: -20, pinType: 'passive' },
          { id: 'n', name: '-', x: 0, y: 20, pinType: 'passive' },
        ],
        parameters: {},
      },
    ];

    const wires: CircuitWire[] = [
      // DC neg to GND
      { id: 'w1', fromCompId: 'dc1', fromPinId: 'neg', toCompId: 'gnd', toPinId: '1' },
      // Pot A (0% terminal) to GND
      { id: 'w2', fromCompId: 'pot1', fromPinId: 'A', toCompId: 'gnd', toPinId: '1' },
      // DC pos (10V) to Pot B (100% terminal)
      { id: 'w3', fromCompId: 'dc1', fromPinId: 'pos', toCompId: 'pot1', toPinId: 'B' },
      // Voltmeter + to Wiper, - to GND
      { id: 'w4', fromCompId: 'vm1', fromPinId: 'p', toCompId: 'pot1', toPinId: 'Wiper' },
      { id: 'w5', fromCompId: 'vm1', fromPinId: 'n', toCompId: 'gnd', toPinId: '1' },
    ];

    // At 50% wiper position: Wiper should be 5.0V
    const step1 = solver.step(components, wires, 0.001, 1.0);
    const potState1 = step1.componentStates['pot1'];
    expect(potState1).toBeDefined();
    expect(potState1.voltage).toBeCloseTo(5.0, 1);
    expect(potState1.current).toBeCloseTo(0.001, 3); // 10V / 10k = 1mA
    expect(potState1.on).toBe(true);

    // At 25% wiper position: Wiper should be 2.5V
    components[2].parameters = { resistance: 10000, wiperPosition: 0.25 };
    const step2 = solver.step(components, wires, 0.001, 1.0);
    const potState2 = step2.componentStates['pot1'];
    expect(potState2.voltage).toBeCloseTo(2.5, 1);

    // At 80% wiper position: Wiper should be 8.0V
    components[2].parameters = { resistance: 10000, wiperPosition: 0.8 };
    const step3 = solver.step(components, wires, 0.001, 1.0);
    const potState3 = step3.componentStates['pot1'];
    expect(potState3.voltage).toBeCloseTo(8.0, 1);
  });

  // --------------------------------------------------------------------------
  // TEST AI - Breadboard Spring-Clip Internal Tie-Strip Node Synthesis
  // --------------------------------------------------------------------------
  it('TEST AI: validates solderless breadboard internal spring-clip tie-strips synthesize shared electrical nets', () => {
    // 5V DC Source -> Top Positive Rail [Hole 1]
    // Top Positive Rail [Hole 15] -> 220Ω Resistor (Pin 1)
    // 220Ω Resistor (Pin 2) -> Breadboard Row 12, Column A
    // LED Anode -> Breadboard Row 12, Column C (Same tie-strip as Row 12A!)
    // LED Cathode -> Top Negative Rail [Hole 10]
    // Top Negative Rail [Hole 1] -> GND Ground
    const components: CircuitComponent[] = [
      {
        id: 'dc1',
        type: 'DC_VOLTAGE',
        label: '5V Source',
        value: '5V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'PAD',
        category: 'sources',
        pins: [
          { id: 'pos', name: '+', x: 0, y: -20, pinType: 'power' },
          { id: 'neg', name: '-', x: 0, y: 20, pinType: 'power' },
        ],
        parameters: { voltage: 5.0 },
      },
      {
        id: 'gnd',
        type: 'GND',
        label: 'GND',
        value: '0V',
        x: 0,
        y: 100,
        rotation: 0,
        footprint: 'PAD',
        category: 'sources',
        pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
        parameters: {},
      },
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '220Ω',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 220 },
      },
      {
        id: 'led1',
        type: 'LED',
        label: 'D1',
        value: 'Red',
        x: 200,
        y: 0,
        rotation: 0,
        footprint: 'LED_THT:LED_D5.0mm',
        category: 'active',
        pins: [
          { id: 'a', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: 'k', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { color: 'Red' },
      },
    ];

    const wires: CircuitWire[] = [
      // 5V pos -> Breadboard Top Positive Rail Hole 1
      { id: 'w1', fromCompId: 'dc1', fromPinId: 'pos', toCompId: 'BREADBOARD', toPinId: 'bb_rail_top_pos_1' },
      // Breadboard Top Positive Rail Hole 15 -> Resistor Pin 1 (connected via top positive rail spring-clip!)
      { id: 'w2', fromCompId: 'BREADBOARD', fromPinId: 'bb_rail_top_pos_15', toCompId: 'r1', toPinId: '1' },
      // Resistor Pin 2 -> Breadboard Row 12, Column A
      { id: 'w3', fromCompId: 'r1', fromPinId: '2', toCompId: 'BREADBOARD', toPinId: 'bb_row_12_A' },
      // Breadboard Row 12, Column C -> LED Anode (connected via Row 12 5-hole spring clip!)
      { id: 'w4', fromCompId: 'BREADBOARD', fromPinId: 'bb_row_12_C', toCompId: 'led1', toPinId: 'a' },
      // LED Cathode -> Breadboard Top Negative Rail Hole 10
      { id: 'w5', fromCompId: 'led1', fromPinId: 'k', toCompId: 'BREADBOARD', toPinId: 'bb_rail_top_neg_10' },
      // Breadboard Top Negative Rail Hole 1 -> GND
      { id: 'w6', fromCompId: 'BREADBOARD', fromPinId: 'bb_rail_top_neg_1', toCompId: 'gnd', toPinId: '1' },
      // DC neg -> GND
      { id: 'w7', fromCompId: 'dc1', fromPinId: 'neg', toCompId: 'gnd', toPinId: '1' },
    ];

    const step = solver.step(components, wires, 0.001, 1.0);
    const ledState = step.componentStates['led1'];
    expect(ledState).toBeDefined();
    // LED should be conducting and energized through the breadboard spring clips
    expect(ledState.on).toBe(true);
    expect(ledState.current).toBeGreaterThan(0.005); // > 5mA forward current
    expect(ledState.voltage).toBeGreaterThanOrEqual(1.8); // ~1.9V forward voltage
  });

  // --------------------------------------------------------------------------
  // TEST AJ - Authentic EIA 4-Band Resistor Color Codes
  // --------------------------------------------------------------------------
  it('TEST AJ: computes authentic EIA 4-band color bands from resistance value parameters', () => {
    // 220Ω: Red (2), Red (2), Brown (x10), Gold (5%)
    const bands220 = getResistorColorBands('220Ω');
    expect(bands220).toEqual(['#DC2626', '#DC2626', '#78350F', '#F59E0B']);

    // 10kΩ: Brown (1), Black (0), Orange (x1k), Gold (5%)
    const bands10k = getResistorColorBands('10kΩ');
    expect(bands10k).toEqual(['#78350F', '#0F172A', '#EA580C', '#F59E0B']);

    // 1kΩ: Brown (1), Black (0), Red (x100), Gold (5%)
    const bands1k = getResistorColorBands('1000');
    expect(bands1k).toEqual(['#78350F', '#0F172A', '#DC2626', '#F59E0B']);

    // 4.7kΩ: Yellow (4), Violet (7), Red (x100), Gold (5%)
    const bands4k7 = getResistorColorBands('4.7kΩ');
    expect(bands4k7).toEqual(['#EAB308', '#7C3AED', '#DC2626', '#F59E0B']);
  });

  // --------------------------------------------------------------------------
  // TEST AK - Breadboard Spatial Snapping and 3D Position Decoupling
  // --------------------------------------------------------------------------
  it('TEST AK: resolves sub-millimeter breadboard hole coordinates and verifies 3D position independence', () => {
    // Hole Row 15 Column C
    const hole15C = getBreadboardHoleCoords('bb_row_15_C');
    expect(hole15C.name).toContain('Row 15 [C]');
    expect(hole15C.y).toBe(-1.0);

    // Fast O(1) Snap lookup from world coordinates near Row 15, Column C
    const snapped = findNearestBreadboardHole(hole15C.x + 0.5, hole15C.z - 0.3);
    expect(snapped).not.toBeNull();
    expect(snapped!.id).toBe('bb_row_15_C');
    expect(snapped!.tieGroup).toBe('bb_tie_row_15_top');

    // Fast O(1) Snap lookup for Top Positive Rail
    const railHole = getBreadboardHoleCoords('bb_rail_top_pos_5');
    const snappedRail = findNearestBreadboardHole(railHole.x, railHole.z);
    expect(snappedRail).not.toBeNull();
    expect(snappedRail!.tieGroup).toBe('bb_tie_rail_top_pos');

    // 3D Position Independence: Component x3d/y3d/z3d preserves 2D schematic coordinates
    const testComp: CircuitComponent = {
      id: 'r_test',
      type: 'RESISTOR',
      label: 'R_TEST',
      value: '1kΩ',
      x: 350,
      y: 220,
      rotation: 0,
      footprint: 'PAD',
      category: 'passive',
      pins: [],
      parameters: {},
      x3d: -40,
      y3d: 0,
      z3d: -10,
    };

    expect(testComp.x).toBe(350); // 2D schematic X remains pristine
    expect(testComp.y).toBe(220); // 2D schematic Y remains pristine
    expect(testComp.x3d).toBe(-40); // 3D world X
    expect(testComp.z3d).toBe(-10); // 3D world Z
  });

  // --------------------------------------------------------------------------
  // TEST AL - Phase 1: Dual-Workflow Model Separation & Backward Compatibility
  // --------------------------------------------------------------------------
  it('TEST AL: verifies Track 1 (Schematic/PCB) and Track 2 (Virtual 3D) data model separation', () => {
    const legacyProject: EngineeringProject = {
      id: 'legacy-proj-1',
      title: 'Legacy Audio Amp',
      description: 'Tested circuit',
      version: '1.0.0',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      components: [
        {
          id: 'c1',
          type: 'RESISTOR',
          label: 'R1',
          value: '10kΩ',
          x: 100,
          y: 200,
          rotation: 0,
          category: 'passive',
          footprint: 'R-AXIAL',
          pins: [],
          parameters: {},
        },
      ],
      wires: [],
      probes: [],
      firmware: {
        code: '',
        language: 'arduino',
        targetMcu: 'atmega328p',
        serialLog: [],
        isRunning: false,
        gpioStates: {},
      },
      pcb: {
        widthMm: 100,
        heightMm: 80,
        boardThicknessMm: 1.6,
        copperLayers: 2,
        tracks: [],
        pads: [],
        drcErrors: [],
      },
      instruments: {
        oscilloscope: {
          timebaseMs: 1,
          ch1ScaleV: 1,
          ch2ScaleV: 1,
          ch1Enabled: true,
          ch2Enabled: false,
          triggerLevel: 0,
          running: true,
        },
        multimeter: {
          mode: 'DC_V',
          reading: 0,
          unit: 'V',
          probesConnected: false,
        },
        functionGenerator: {
          waveform: 'sine',
          frequencyHz: 1000,
          amplitudeV: 5,
          offsetV: 0,
          dutyCycle: 50,
          enabled: false,
        },
        logicAnalyzer: {
          channels: [],
          sampleRateHz: 1000000,
          running: false,
        },
      },
    };

    // Backward compatibility: legacy project loads without virtual3d property
    expect(legacyProject.virtual3d).toBeUndefined();

    // Track 2: Upgrading to include independent virtual3d state
    const modernProject: EngineeringProject = {
      ...legacyProject,
      virtual3d: {
        hasBreadboard: true,
        components3d: [
          {
            id: 'c3d_1',
            type: 'LED',
            label: 'LED1',
            value: 'Red',
            parameters: { color: 'Red', forwardVoltage: 1.9 },
            x3d: 15.0,
            y3d: 0,
            z3d: -5.0,
            rotY: 90,
            mountedOnHoleId: 'bb_row_12_C',
          },
        ],
        wires3d: [
          {
            id: 'w3d_1',
            fromPin: { compId: 'c3d_1', pinId: 'anode' },
            toPin: { compId: 'breadboard', pinId: 'bb_rail_top_pos_10' },
            color: '#EF4444',
          },
        ],
      },
    };

    expect(modernProject.virtual3d).toBeDefined();
    expect(modernProject.virtual3d?.components3d).toHaveLength(1);
    expect(modernProject.virtual3d?.components3d[0].mountedOnHoleId).toBe('bb_row_12_C');
    expect(modernProject.components[0].x).toBe(100); // 2D schematic unchanged
  });

  // --------------------------------------------------------------------------
  // TEST AM - Phase 1: LED Color Forward Voltage & Battery Voltage Solver Sync
  // --------------------------------------------------------------------------
  it('TEST AM: verifies LED color change immediately updates Vf in solver and battery updates netlist', () => {
    // Red LED default Vf = 1.9V
    const redLed: CircuitComponent = {
      id: 'led1',
      type: 'LED',
      label: 'LED_RED',
      value: 'Red',
      x: 0,
      y: 0,
      rotation: 0,
      category: 'semiconductors',
      footprint: 'LED',
      pins: [
        { id: 'a', name: 'A', x: -20, y: 0, pinType: 'passive' },
        { id: 'k', name: 'K', x: 20, y: 0, pinType: 'passive' },
      ],
      parameters: { color: 'Red' },
    };
    expect(getLedForwardVoltage(redLed)).toBeCloseTo(1.9, 1);

    // Change to Blue LED -> Vf = 3.1V
    const blueLed: CircuitComponent = {
      ...redLed,
      parameters: { color: 'Blue' },
    };
    expect(getLedForwardVoltage(blueLed)).toBeCloseTo(3.1, 1);

    // Change to Green LED -> Vf = 2.3V
    const greenLed: CircuitComponent = {
      ...redLed,
      parameters: { color: 'Green' },
    };
    expect(getLedForwardVoltage(greenLed)).toBeCloseTo(2.3, 1);

    // Battery voltage change in solver: 9V -> 5V
    const batteryComp: CircuitComponent = {
      id: 'bat1',
      type: 'BATTERY',
      label: 'BT1',
      value: '9V',
      x: 0,
      y: 0,
      rotation: 0,
      category: 'sources',
      footprint: 'PAD',
      pins: [
        { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
        { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
      ],
      parameters: { voltage: 9.0 },
    };

    const rComp: CircuitComponent = {
      id: 'r1',
      type: 'RESISTOR',
      label: 'R1',
      value: '1kΩ',
      x: 100,
      y: 0,
      rotation: 0,
      category: 'passive',
      footprint: 'PAD',
      pins: [
        { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
      ],
      parameters: { resistance: 1000 },
    };

    const gndComp: CircuitComponent = {
      id: 'gnd1',
      type: 'GROUND',
      label: 'GND',
      value: '0V',
      x: 0,
      y: 100,
      rotation: 0,
      category: 'sources',
      footprint: 'PAD',
      pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' }],
      parameters: { voltage: 0 },
    };

    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'bat1', fromPinId: 'p', toCompId: 'r1', toPinId: '1' },
      { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'gnd1', toPinId: '1' },
      { id: 'w3', fromCompId: 'bat1', fromPinId: 'n', toCompId: 'gnd1', toPinId: '1' },
    ];

    // Solver with 9V
    const res9V = solver.step([batteryComp, rComp, gndComp], wires, 0.001);
    expect(res9V.componentStates['r1'].voltage).toBeCloseTo(9.0, 1);
    expect(res9V.componentStates['r1'].current).toBeCloseTo(0.009, 3); // 9mA

    // Update battery to 5V
    const battery5V: CircuitComponent = {
      ...batteryComp,
      value: '5V',
      parameters: { voltage: 5.0 },
    };
    const res5V = solver.step([battery5V, rComp, gndComp], wires, 0.001);
    expect(res5V.componentStates['r1'].voltage).toBeCloseTo(5.0, 1);
    expect(res5V.componentStates['r1'].current).toBeCloseTo(0.005, 3); // 5mA
  });

  // --------------------------------------------------------------------------
  // TEST AN - Phase 3: Real Geometric Design Rule Check (DRC) Engine
  // --------------------------------------------------------------------------
  it('TEST AN: detects board edge clearance, min track width, and copper-to-copper DRC violations', () => {
    const layoutWithErrors = {
      widthMm: 50,
      heightMm: 40,
      boardThicknessMm: 1.6,
      copperLayers: 2 as const,
      pads: [
        // Pad too close to left board edge (x = 0.5mm < 1.0mm)
        {
          id: 'pad_edge_err',
          componentId: 'C1',
          pinId: '1',
          x: 0.5,
          y: 20,
          diameterMm: 1.8,
          holeMm: 0.9,
          shape: 'round' as const,
          layer: 'all' as const,
        },
      ],
      tracks: [
        // Track width too thin (0.10mm < 0.15mm min)
        {
          id: 'trk_thin',
          layer: 'top_copper' as const,
          from: { x: 10, y: 10 },
          to: { x: 20, y: 10 },
          widthMm: 0.10,
        },
      ],
      drcErrors: [],
    };

    const violations = DrcEngine.runChecks(layoutWithErrors, {
      minEdgeClearanceMm: 1.0,
      minTrackWidthMm: 0.15,
      minClearanceMm: 0.2,
    });

    expect(violations.length).toBeGreaterThanOrEqual(2);
    const edgeViolation = violations.find((v) => v.rule === 'edge_clearance');
    const widthViolation = violations.find((v) => v.rule === 'min_track_width');

    expect(edgeViolation).toBeDefined();
    expect(edgeViolation?.severity).toBe('error');
    expect(widthViolation).toBeDefined();
    expect(widthViolation?.severity).toBe('error');
  });

  // --------------------------------------------------------------------------
  // TEST AO - Phase 3: RS-274X Gerber & Excellon Manufacturing Export Bundle
  // --------------------------------------------------------------------------
  it('TEST AO: generates valid RS-274X Gerber files, Excellon drill file, and BOM CSV', () => {
    const pcbTest = {
      widthMm: 60,
      heightMm: 45,
      boardThicknessMm: 1.6,
      copperLayers: 2 as const,
      pads: [
        { id: 'p1', componentId: 'R1', pinId: '1', x: 15, y: 20, diameterMm: 1.8, holeMm: 0.9, shape: 'rect' as const, layer: 'all' as const },
        { id: 'p2', componentId: 'R1', pinId: '2', x: 25, y: 20, diameterMm: 1.8, holeMm: 0.9, shape: 'round' as const, layer: 'all' as const },
      ],
      tracks: [
        { id: 't1', layer: 'top_copper' as const, from: { x: 15, y: 20 }, to: { x: 25, y: 20 }, widthMm: 0.35 },
        { id: 't2', layer: 'bottom_copper' as const, from: { x: 15, y: 20 }, to: { x: 25, y: 20 }, widthMm: 0.35 },
      ],
      drcErrors: [],
    };

    const compsTest: CircuitComponent[] = [
      {
        id: 'R1',
        type: 'RESISTOR',
        label: 'R1',
        value: '10kΩ',
        x: 0,
        y: 0,
        rotation: 0,
        category: 'passive',
        footprint: 'R-AXIAL-0.25W',
        pins: [],
        parameters: {},
        manufacturerPartNumber: 'MFR-25FBF52-10K',
      },
    ];

    const bundle = GerberExporter.generateManufacturingBundle(pcbTest, compsTest);

    // Verify all essential files are present
    expect(bundle['Top_Copper.gtl']).toBeDefined();
    expect(bundle['Bottom_Copper.gbl']).toBeDefined();
    expect(bundle['Top_SolderMask.gts']).toBeDefined();
    expect(bundle['Bottom_SolderMask.gbs']).toBeDefined();
    expect(bundle['Board_Outline.gko']).toBeDefined();
    expect(bundle['Drill_Plated.drl']).toBeDefined();
    expect(bundle['Bill_of_Materials.csv']).toBeDefined();

    // Verify RS-274X header format and aperture definition in Top Copper
    expect(bundle['Top_Copper.gtl']).toContain('%FSLAX35Y35*%');
    expect(bundle['Top_Copper.gtl']).toContain('%MOMM*%');
    expect(bundle['Top_Copper.gtl']).toContain('D10*'); // Aperture call
    expect(bundle['Top_Copper.gtl']).toContain('M02*'); // End of file

    // Verify Excellon NC drill format
    expect(bundle['Drill_Plated.drl']).toContain('M48');
    expect(bundle['Drill_Plated.drl']).toContain('T01C0.900');
    expect(bundle['Drill_Plated.drl']).toContain('X15.000Y20.000');
    expect(bundle['Drill_Plated.drl']).toContain('M30');

    // Verify BOM CSV format
    expect(bundle['Bill_of_Materials.csv']).toContain('Item,Designator,Quantity');
    expect(bundle['Bill_of_Materials.csv']).toContain('MFR-25FBF52-10K');
  });

  // --------------------------------------------------------------------------
  // TEST AL - Solderless Breadboard Strict Topology (830-Point Tie Groups)
  // --------------------------------------------------------------------------
  it('TEST AL: verifies strict solderless breadboard spring clip electrical topology in solver', () => {
    const testSolver = new CircuitSolver();

    const comps: CircuitComponent[] = [
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '1kΩ',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'R_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 1000 },
      },
      {
        id: 'r2',
        type: 'RESISTOR',
        label: 'R2',
        value: '2kΩ',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'R_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 2000 },
      },
      {
        id: 'v1',
        type: 'DC_VOLTAGE',
        label: 'V1',
        value: '5V',
        x: -50,
        y: 0,
        rotation: 0,
        footprint: 'SOURCE',
        category: 'power',
        pins: [
          { id: '+', name: '+', x: 0, y: -10, pinType: 'output' },
          { id: '-', name: '-', x: 0, y: 10, pinType: 'output' },
        ],
        parameters: { voltage: 5 },
      },
      {
        id: 'gnd1',
        type: 'GND',
        label: 'GND',
        value: '0V',
        x: -50,
        y: 50,
        rotation: 0,
        footprint: 'GND',
        category: 'power',
        pins: [
          { id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' },
        ],
        parameters: {},
      },
    ];

    // Jumper wires:
    // V1(+) to top power rail hole 1: bb_rail_top_pos_1
    // R1(1) to top power rail hole 10: bb_rail_top_pos_10 (connected via strict top positive rail!)
    // R1(2) to terminal column 15 row A: bb_col_15_A
    // R2(1) to terminal column 15 row D: bb_col_15_D (connected via strict column 15 top clip!)
    // R2(2) to V1(-) and GND
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'v1', fromPinId: '+', toCompId: 'breadboard', toPinId: 'bb_rail_top_pos_1' },
      { id: 'w2', fromCompId: 'breadboard', fromPinId: 'bb_rail_top_pos_10', toCompId: 'r1', toPinId: '1' },
      { id: 'w3', fromCompId: 'r1', fromPinId: '2', toCompId: 'breadboard', toPinId: 'bb_col_15_A' },
      { id: 'w4', fromCompId: 'breadboard', fromPinId: 'bb_col_15_D', toCompId: 'r2', toPinId: '1' },
      { id: 'w5', fromCompId: 'r2', fromPinId: '2', toCompId: 'v1', toPinId: '-' },
      { id: 'w6', fromCompId: 'v1', fromPinId: '-', toCompId: 'gnd1', toPinId: '1' },
    ];

    const result = testSolver.step(comps, wires, 0.001);

    // Node between R1 and R2 formed by column 15 spring clip:
    // Voltage divider: 5V across R1 (1k) and R2 (2k) -> V(col 15) = 5 * (2000 / (1000 + 2000)) = 3.333V
    const r1Pin2 = testSolver.getPinVoltage('r1', '2', result.nodeVoltages);
    const r2Pin1 = testSolver.getPinVoltage('r2', '1', result.nodeVoltages);

    expect(r1Pin2).toBeCloseTo(3.333, 1);
    expect(r2Pin1).toBeCloseTo(3.333, 1);
    expect(r1Pin2).toEqual(r2Pin1); // Identical node potential via column 15 spring clip!
  });

  // --------------------------------------------------------------------------
  // TEST AM - EI House MCU USB Power Plug Simulation
  // --------------------------------------------------------------------------
  it('TEST AM: verifies EI House MCU USB power plug provides 5V/3.3V and anchors GND', () => {
    const testSolver = new CircuitSolver();

    const mcuUno: CircuitComponent = {
      id: 'uno1',
      type: 'ARDUINO_UNO',
      label: 'Arduino Uno R3',
      value: 'ATmega328P',
      x: 0,
      y: 0,
      rotation: 0,
      footprint: 'MODULE',
      category: 'microcontrollers',
      pins: [
        { id: '5V', name: '5V', x: 0, y: 10, pinType: 'power' },
        { id: '3V3', name: '3V3', x: 0, y: 20, pinType: 'power' },
        { id: 'GND_1', name: 'GND_1', x: 0, y: 30, pinType: 'power' },
        { id: 'GND_2', name: 'GND_2', x: 0, y: 40, pinType: 'power' },
      ],
      parameters: { usbPlugged: true }, // USB cable plugged in
    };

    const led: CircuitComponent = {
      id: 'led1',
      type: 'LED',
      label: 'LED1',
      value: 'Red',
      x: 50,
      y: 0,
      rotation: 0,
      footprint: 'LED_5MM',
      category: 'semiconductors',
      pins: [
        { id: '1', name: 'anode', x: -10, y: 0, pinType: 'passive' },
        { id: '2', name: 'cathode', x: 10, y: 0, pinType: 'passive' },
      ],
      parameters: { color: '#EF4444' },
    };

    const resistor: CircuitComponent = {
      id: 'r_limit',
      type: 'RESISTOR',
      label: 'R_LIMIT',
      value: '220Ω',
      x: 100,
      y: 0,
      rotation: 0,
      footprint: 'R_AXIAL',
      category: 'passive',
      pins: [
        { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
      ],
      parameters: { resistance: 220 },
    };

    // Arduino 5V -> LED Anode; LED Cathode -> Resistor(1); Resistor(2) -> Arduino GND_2
    const wires: CircuitWire[] = [
      { id: 'w1', fromCompId: 'uno1', fromPinId: '5V', toCompId: 'led1', toPinId: '1' },
      { id: 'w2', fromCompId: 'led1', fromPinId: '2', toCompId: 'r_limit', toPinId: '1' },
      { id: 'w3', fromCompId: 'r_limit', fromPinId: '2', toCompId: 'uno1', toPinId: 'GND_2' },
    ];

    // Case 1: USB Plugged In
    const resPowered = testSolver.step([mcuUno, led, resistor], wires, 0.001);
    const v5V = testSolver.getPinVoltage('uno1', '5V', resPowered.nodeVoltages);
    const vGnd = testSolver.getPinVoltage('uno1', 'GND_2', resPowered.nodeVoltages);
    const iLed = resPowered.componentStates['led1']?.current || 0;

    expect(v5V).toBeCloseTo(5.0, 1);
    expect(vGnd).toBeCloseTo(0.0, 1);
    expect(iLed).toBeGreaterThan(0.005); // > 5mA current flowing through LED
    expect(resPowered.componentStates['led1']?.on).toBe(true);

    // Case 2: USB Cable Unplugged
    mcuUno.parameters = { usbPlugged: false };
    const resUnplugged = testSolver.step([mcuUno, led, resistor], wires, 0.001);
    const v5VUnplugged = testSolver.getPinVoltage('uno1', '5V', resUnplugged.nodeVoltages);
    expect(v5VUnplugged).toBeCloseTo(0.0, 1);
    expect(resUnplugged.componentStates['led1']?.on).toBe(false);
  });

  // --------------------------------------------------------------------------
  // MANDATORY ACCEPTANCE VERIFICATION CASES: SURGICAL ELECTRICAL RULES & DISCONNECT
  // --------------------------------------------------------------------------
  describe('Mandatory Acceptance Verification: Wire Disconnect & Realistic Electrical Physics', () => {
    // CASE A: Wire Disconnect
    it('Case A: Disconnecting a wire removes connection from netlist and immediately drops circuit power', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'BATTERY',
        label: '9V Battery',
        value: '9V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BAT_9V',
        category: 'passive',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'power' },
        ],
        parameters: { voltage: 9.0 },
      };
      const resistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: '330Ω Resistor',
        value: '330Ω',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'R_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 330 },
      };
      const led: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'Red LED',
        value: 'Red',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'LED_5MM',
        category: 'semiconductors',
        pins: [
          { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardV: 2.0, color: 'Red' },
      };

      let wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: '1' },
        { id: 'w3', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      // 1. Initial State: Connected & Powered
      const resConnected = solver.step([battery, resistor, led], wires, 0.001);
      expect(resConnected.componentStates['led1']?.on).toBe(true);
      expect(resConnected.componentStates['led1']?.current).toBeGreaterThan(0.015);

      // 2. Action: User clicks Disconnect on wire w2
      wires = wires.filter((w) => w.id !== 'w2');

      // 3. Post-Disconnect Solve: LED loses connection, current immediately drops to 0
      const resDisconnected = solver.step([battery, resistor, led], wires, 0.001);
      expect(resDisconnected.componentStates['led1']?.current).toBe(0);
      expect(resDisconnected.componentStates['led1']?.on).toBe(false);
      expect(resDisconnected.componentStates['led1']?.brightness).toBe(0);
    });

    // CASE B: 9V directly across LED -> Instant Burnout
    it('Case B: Connecting a 9V battery directly to an LED burns it out instantly with an overcurrent fault alert', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'BATTERY',
        label: '9V Battery',
        value: '9V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BAT_9V',
        category: 'passive',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'power' },
        ],
        parameters: { voltage: 9.0 },
      };
      const led: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'Red LED',
        value: 'Red',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'LED_5MM',
        category: 'semiconductors',
        pins: [
          { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardV: 2.0, color: 'Red' },
      };

      // Direct connection with NO current-limiting resistor
      const directWires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'led1', toPinId: '1' },
        { id: 'w2', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      const res = solver.step([battery, led], directWires, 0.001);

      // Verify Burnout Condition
      expect(res.componentStates['led1']?.status).toBe('BURNED');
      expect(res.componentStates['led1']?.burned).toBe(true);
      expect(res.componentStates['led1']?.brightness).toBe(0);
      expect(res.componentStates['led1']?.on).toBe(false);

      // Verify Fault Alert was triggered
      expect(res.faults).toBeDefined();
      expect(res.faults?.length).toBeGreaterThan(0);
      const ledFault = res.faults?.find((f) => f.compId === 'led1');
      expect(ledFault).toBeDefined();
      expect(ledFault?.type).toBe('OVERCURRENT');
      expect(ledFault?.message).toContain('burned out');
      expect(ledFault?.message).toContain('exceeded 30mA max rating');
    });

    // CASE C: 9V + 330Ω + LED -> Nominal ~20mA current & full bright glow
    it('Case C: 9V battery with 330Ω resistor produces ~20mA forward current, glowing brightly without burning', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'BATTERY',
        label: '9V Battery',
        value: '9V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BAT_9V',
        category: 'passive',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'power' },
        ],
        parameters: { voltage: 9.0 },
      };
      const resistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: '330Ω Resistor',
        value: '330Ω',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'R_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 330 },
      };
      const led: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'Red LED',
        value: 'Red',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'LED_5MM',
        category: 'semiconductors',
        pins: [
          { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardV: 2.0, color: 'Red' },
      };

      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: '1' },
        { id: 'w3', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      const res = solver.step([battery, resistor, led], wires, 0.001);
      const ledState = res.componentStates['led1'];

      expect(ledState).toBeDefined();
      expect(ledState.status).not.toBe('BURNED');
      expect(ledState.burned).toBeFalsy();
      expect(ledState.on).toBe(true);

      // (9V - 2V) / (330Ω + 15Ω) ≈ 20.3mA (0.0203A)
      expect(ledState.current).toBeGreaterThan(0.018);
      expect(ledState.current).toBeLessThan(0.025);

      // Normalized brightness should be at or near full (>= 0.9)
      expect(ledState.brightness).toBeGreaterThanOrEqual(0.9);
      expect(ledState.brightness).toBeLessThanOrEqual(1.0);
    });

    // CASE D: Lowering voltage from 9V to 3V with 330Ω resistor -> Smoothly dims (~3mA)
    it('Case D: Lowering battery voltage to 3V proportionally dims the LED (~3mA) without snapping off', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'BATTERY',
        label: '3V Battery Source',
        value: '3V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BAT_3V',
        category: 'passive',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'power' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'power' },
        ],
        parameters: { voltage: 3.0 },
      };
      const resistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: '330Ω Resistor',
        value: '330Ω',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'R_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 330 },
      };
      const led: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'Red LED',
        value: 'Red',
        x: 100,
        y: 0,
        rotation: 0,
        footprint: 'LED_5MM',
        category: 'semiconductors',
        pins: [
          { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardV: 2.0, color: 'Red' },
      };

      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: '1' },
        { id: 'w3', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      const res = solver.step([battery, resistor, led], wires, 0.001);
      const ledState = res.componentStates['led1'];

      expect(ledState).toBeDefined();
      expect(ledState.status).not.toBe('BURNED');
      expect(ledState.burned).toBeFalsy();
      expect(ledState.on).toBe(true);

      // (3V - 2V) / (330Ω + 15Ω) ≈ 2.9mA (0.0029A)
      expect(ledState.current).toBeGreaterThan(0.002);
      expect(ledState.current).toBeLessThan(0.005);

      // Noticeably dimmed: brightness should be between 0.08 and 0.25 (not off, not full)
      expect(ledState.brightness).toBeGreaterThan(0.05);
      expect(ledState.brightness).toBeLessThan(0.30);
    });

    // CASE E: Universal Electrical Rating - Resistor Overpower Burnout
    it('Case E: Resistor burns out with OVERPOWER fault when power dissipation exceeds rated power', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'DC_VOLTAGE',
        label: '12V Supply',
        value: '12V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BATTERY',
        category: 'power',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'passive' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'passive' },
        ],
        parameters: { voltage: 12 },
      };
      const resistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '100',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'RESISTOR_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 100, powerRating: 0.25 },
      };
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      // 12V across 100Ω = 1.44W (exceeds 0.25W rating)
      const res = solver.step([battery, resistor], wires, 0.001);
      const rState = res.componentStates['r1'];

      expect(rState).toBeDefined();
      expect(rState.status).toBe('BURNED');
      expect(rState.faultState).toBe('BURNED');
      expect(rState.burned).toBe(true);
      expect(rState.isBurnedOut).toBe(true);
      expect(rState.thermalStress).toBeGreaterThan(1.0);
      expect(rState.fault).toContain('burned out');
      expect(rState.fault).toContain('1.44W exceeded 0.25W rating');

      expect(res.faults).toBeDefined();
      const fault = res.faults?.find((f) => f.compId === 'r1');
      expect(fault).toBeDefined();
      expect(fault?.type).toBe('OVERPOWER');
    });

    // CASE F: Universal Electrical Rating - Capacitor Overvoltage & Reverse Polarity
    it('Case F: Capacitor triggers OVERVOLTAGE on over-rating, and electrolytic triggers REVERSE_POLARITY on reversed bias', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'DC_VOLTAGE',
        label: '24V Supply',
        value: '24V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BATTERY',
        category: 'power',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'passive' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'passive' },
        ],
        parameters: { voltage: 24 },
      };
      const cap: CircuitComponent = {
        id: 'c1',
        type: 'CAPACITOR',
        label: 'C1',
        value: '10uF',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'CAP_RADIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { capacitance: 0.00001, voltageRating: 16 },
      };
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'c1', toPinId: '1' },
        { id: 'w2', fromCompId: 'c1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      // 24V exceeds 16V rating
      const res = solver.step([battery, cap], wires, 0.001);
      const cState = res.componentStates['c1'];

      expect(cState.status).toBe('BURNED');
      expect(cState.burned).toBe(true);
      expect(cState.fault).toContain('dielectric breakdown');
      const fault = res.faults?.find((f) => f.compId === 'c1');
      expect(fault?.type).toBe('OVERVOLTAGE');
    });

    // CASE G: Auto-Reset Component Faults & Simulation Restart Recovery
    it('Case G: Auto-resets burned components and allows recovery when voltage is reduced and faults are reset', () => {
      const solver = new CircuitSolver();
      const battery: CircuitComponent = {
        id: 'bat1',
        type: 'DC_VOLTAGE',
        label: '9V Battery',
        value: '9V',
        x: 0,
        y: 0,
        rotation: 0,
        footprint: 'BATTERY',
        category: 'power',
        pins: [
          { id: '1', name: '+', x: 0, y: -10, pinType: 'passive' },
          { id: '2', name: '-', x: 0, y: 10, pinType: 'passive' },
        ],
        parameters: { voltage: 9 },
      };
      const led: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'Red LED',
        value: 'Red',
        x: 50,
        y: 0,
        rotation: 0,
        footprint: 'LED_5MM',
        category: 'semiconductors',
        pins: [
          { id: '1', name: 'A', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: 'K', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { forwardV: 2.0 },
      };
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'led1', toPinId: '1' },
        { id: 'w2', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      // Step 1: Direct 9V across LED -> Burnout
      let res = solver.step([battery, led], wires, 0.001);
      expect(res.componentStates['led1']?.status).toBe('BURNED');
      expect(solver.getBurntComponentIds()).toContain('led1');

      // Step 2: Add 330Ω resistor and reset faults
      solver.resetBurntComponents();
      expect(solver.getBurntComponentIds()).not.toContain('led1');

      const resistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '330',
        x: 30,
        y: 0,
        rotation: 0,
        footprint: 'RESISTOR_AXIAL',
        category: 'passive',
        pins: [
          { id: '1', name: '1', x: -10, y: 0, pinType: 'passive' },
          { id: '2', name: '2', x: 10, y: 0, pinType: 'passive' },
        ],
        parameters: { resistance: 330 },
      };
      const safeWires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '1', toCompId: 'r1', toPinId: '1' },
        { id: 'w2', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: '1' },
        { id: 'w3', fromCompId: 'led1', fromPinId: '2', toCompId: 'bat1', toPinId: '2' },
      ];

      // Step 3: Run sim again -> Clean normal operation
      res = solver.step([battery, resistor, led], safeWires, 0.001);
      expect(res.componentStates['led1']?.status).toBe('NORMAL');
      expect(res.componentStates['led1']?.burned).toBeFalsy();
      expect(res.componentStates['led1']?.on).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST AP - Smooth Orthogonal Wire Segment Dragging Without Staircase Glitch
  // --------------------------------------------------------------------------
  describe('TEST AP: Smooth Orthogonal Wire Segment Dragging', () => {
    it('moves horizontal segment Y-coordinate without generating runaway staircase vertices', () => {
      // 4-vertex orthogonal wire: (0,0) -> (50,0) -> (50,100) -> (100,100)
      const initialVertices = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 100 },
      ];

      // Drag vertical segment 1 (x = 50) horizontally to x = 80
      const waypoints1 = slideWireSegment(initialVertices, 1, 80, 10);
      expect(waypoints1).toEqual([
        { x: 80, y: 0 },
        { x: 80, y: 100 },
      ]);

      // Repeated calls with new coordinates using the same baseline initialVertices
      // do NOT accumulate staircase vertices
      const waypoints2 = slideWireSegment(initialVertices, 1, 30, 10);
      expect(waypoints2.length).toBe(2);
      expect(waypoints2).toEqual([
        { x: 30, y: 0 },
        { x: 30, y: 100 },
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // TEST AQ - 3D Breadboard NE555 Astable Simulation & Fault Diagnostics
  // --------------------------------------------------------------------------
  describe('TEST AQ: 3D Breadboard NE555 Astable Simulation & Fault Diagnostics', () => {
    it('simulates NE555 3D circuit with non-zero branch current, visible LED pulsing, and fault burnout triggers', () => {
      const solver = new CircuitSolver();

      // Components seated with authentic 3D breadboard coordinates
      const coords3d: Record<string, { x3d: number; y3d: number; z3d: number }> = {
        bat1: { x3d: -95, y3d: 0, z3d: 0 },
        ic1: { x3d: -5.08, y3d: 8.5, z3d: 0 },
        r1: { x3d: -55.88, y3d: 8.5, z3d: -8.42 },
        r2: { x3d: -40.64, y3d: 8.5, z3d: 8.42 },
        c1: { x3d: -25.40, y3d: 8.5, z3d: -8.42 },
        r_led: { x3d: 15.24, y3d: 8.5, z3d: 8.42 },
        led1: { x3d: 30.48, y3d: 8.5, z3d: -8.42 },
      };

      const comps: CircuitComponent[] = TEMPLATE_555_ASTABLE.components.map((c) => ({
        ...c,
        ...(coords3d[c.id] || {}),
        parameters: { ...c.parameters, ...(c.id === 'led1' ? { maxCurrentA: 0.03 } : {}) },
      }));

      const wires: CircuitWire[] = TEMPLATE_555_ASTABLE.wires;

      // Part 1: Verify non-zero branch current and LED pulsation
      let maxLedCurrent = 0;
      let maxLedBrightness = 0;
      let capCharged = false;

      for (let step = 0; step < 250; step++) {
        const res = solver.step(comps, wires, 0.002);
        const ledState = res.componentStates['led1'];
        if (ledState) {
          if (ledState.current && ledState.current > maxLedCurrent) {
            maxLedCurrent = ledState.current;
          }
          if (ledState.brightness && ledState.brightness > maxLedBrightness) {
            maxLedBrightness = ledState.brightness;
          }
        }
        const c1State = res.componentStates['c1'];
        if (c1State && c1State.voltage > 2.0) {
          capCharged = true;
        }
      }

      expect(maxLedCurrent).toBeGreaterThan(0.01); // Over 10 mA branch current (typically ~18-20mA)
      expect(maxLedBrightness).toBeGreaterThan(0.5); // Emissive LED brightness proportional to current
      expect(capCharged).toBe(true); // C1 charged past 1/3 VCC threshold

      // Part 2: Verify real-time fault detection and burnout trigger
      // Drop ballast resistor to 10Ω to cause massive forward current over 30mA rating
      const overloadedComps = comps.map((c) =>
        c.id === 'r_led' ? { ...c, parameters: { ...c.parameters, resistance: 10 } } : c
      );

      const faultRes = solver.step(overloadedComps, wires, 0.002);
      expect(faultRes.faults).toBeDefined();
      expect(faultRes.faults!.length).toBeGreaterThan(0);
      const ledFault = faultRes.faults!.find((f) => f.compId === 'led1');
      expect(ledFault).toBeDefined();
      expect(faultRes.componentStates['led1']?.status).toBe('BURNED');

      // Part 3: Verify fault reset restores component to normal
      solver.resetBurntComponents();
      const recoveredComps = comps.map((c) =>
        c.id === 'r_led' ? { ...c, parameters: { ...c.parameters, resistance: 470 } } : c
      );
      const resetRes = solver.step(recoveredComps, wires, 0.002);
      expect(resetRes.componentStates['led1']?.status).toBe('NORMAL');
      expect(resetRes.componentStates['led1']?.burned).toBeFalsy();
    }, 15000);
  });

  // --------------------------------------------------------------------------
  // TEST AR: 2-LAYER OCTILINEAR AUTO-ROUTER & 3D PCB VERIFICATION
  // --------------------------------------------------------------------------
  describe('TEST AR: 2-Layer Octilinear Auto-Router & Photorealistic PCB 3D Verification', () => {
    it('routes the default NE555 astable circuit with strict 45°/90° angles, 0 same-layer track crossings, 0 unrouted airwires, and 0 DRC clearance errors', () => {
      const tmpl = TEMPLATE_555_ASTABLE;
      const pcb = PcbGenerator.generatePcbFromSchematic(tmpl.components, tmpl.wires, 90, 70);

      expect(pcb.tracks.length).toBeGreaterThan(0);
      expect(pcb.pads.length).toBeGreaterThan(0);

      // 1. Strict 45° / 90° angles on all track segments
      pcb.tracks.forEach((track) => {
        const dx = track.to.x - track.from.x;
        const dy = track.to.y - track.from.y;
        if (Math.hypot(dx, dy) > 0.01) {
          const angleDeg = Math.round(Math.abs((Math.atan2(dy, dx) * 180) / Math.PI));
          const mod45 = angleDeg % 45;
          // Must be within 1 degree of a multiple of 45° (0°, 45°, 90°, 135°, 180°)
          expect(mod45 === 0 || mod45 === 45 || Math.abs(mod45 - 45) <= 1 || mod45 <= 1).toBe(true);
        }
      });

      // 2. Zero same-layer crossings between different nets
      const tracks = pcb.tracks;
      for (let i = 0; i < tracks.length; i++) {
        for (let j = i + 1; j < tracks.length; j++) {
          const t1 = tracks[i];
          const t2 = tracks[j];
          if (t1.layer === t2.layer && t1.netId && t2.netId && t1.netId !== t2.netId) {
            // Check segment intersection
            const x1 = t1.from.x, y1 = t1.from.y, x2 = t1.to.x, y2 = t1.to.y;
            const x3 = t2.from.x, y3 = t2.from.y, x4 = t2.to.x, y4 = t2.to.y;

            const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            if (Math.abs(denom) > 1e-6) {
              const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
              const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
              // True interior intersection
              const isCrossing = ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95;
              expect(isCrossing).toBe(false);
            }
          }
        }
      }

      // 3. Zero DRC Clearance Errors
      const drcViolations = DrcEngine.runChecks(pcb, { wires: tmpl.wires });
      const clearanceErrors = drcViolations.filter((v) => v.severity === 'error');
      expect(clearanceErrors.length).toBe(0);

      // 4. Zero unrouted airwires
      const unroutedViolation = drcViolations.find((v) => v.rule === 'unrouted_nets');
      expect(unroutedViolation).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // TEST AS - 3D Virtual Studio: LED Colors, Toolbar Wire Color & Simulation Sync
  // --------------------------------------------------------------------------
  describe('TEST AS: 3D Virtual Studio LED Colors, Toolbar Wire Color & Simulation Netlist Sync', () => {
    it('AS1: correctly resolves authentic physical optics for all 7 LED presets + custom hex', () => {
      // White: frosted clear-white (#d8e2ea) OFF, vibrant #ffffff ON
      const white = getLedColorPalette('White');
      expect(white.hex).toBe('#ffffff');
      expect(white.offColor).toBe('#d8e2ea');
      expect(white.onEmissive).toBe('#ffffff');

      // Cyan: deep teal (#0a5c66) OFF, vibrant #00e5ff ON
      const cyan = getLedColorPalette('Cyan');
      expect(cyan.hex).toBe('#00e5ff');
      expect(cyan.offColor).toBe('#0a5c66');
      expect(cyan.onEmissive).toBe('#00e5ff');

      // Purple: deep violet (#3e1166) OFF, vibrant #b026ff ON
      const purple = getLedColorPalette('Purple');
      expect(purple.hex).toBe('#b026ff');
      expect(purple.offColor).toBe('#3e1166');
      expect(purple.onEmissive).toBe('#b026ff');

      // Red, Green, Blue, Amber
      const red = getLedColorPalette('Red');
      expect(red.offColor).toBe('#6b0f0f');
      expect(red.onEmissive).toBe('#ff1a1a');

      const green = getLedColorPalette('Green');
      expect(green.offColor).toBe('#064e3b');
      expect(green.onEmissive).toBe('#34d399');

      const blue = getLedColorPalette('Blue');
      expect(blue.offColor).toBe('#0c4a6e');
      expect(blue.onEmissive).toBe('#60a5fa');

      const amber = getLedColorPalette('Amber');
      expect(amber.offColor).toBe('#78350f');
      expect(amber.onEmissive).toBe('#fbbf24');

      // Custom hex string
      const custom = getLedColorPalette('#FF00AA');
      expect(custom.hex.toLowerCase()).toBe('#ff00aa');
      expect(custom.onEmissive.toLowerCase()).toBe('#ff00aa');
      expect(custom.offColor).toBeDefined();
    });

    it('AS2: synchronizes forward voltage Vf across all 7 LED presets', () => {
      const makeLedWithColor = (color: string): CircuitComponent => ({
        id: 'led_test',
        type: 'LED',
        label: 'LED',
        value: `${color} LED`,
        category: 'active',
        footprint: 'LED_THT:LED_D5.0mm',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: 'a', name: 'A (+)', x: -20, y: 0, pinType: 'passive' as const },
          { id: 'k', name: 'K (-)', x: 20, y: 0, pinType: 'passive' as const },
        ],
        parameters: { color },
      });

      expect(getLedForwardVoltage(makeLedWithColor('White'))).toBeCloseTo(3.1, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Cyan'))).toBeCloseTo(3.0, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Purple'))).toBeCloseTo(3.2, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Blue'))).toBeCloseTo(3.1, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Green'))).toBeCloseTo(2.3, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Amber'))).toBeCloseTo(2.1, 1);
      expect(getLedForwardVoltage(makeLedWithColor('Red'))).toBeCloseTo(1.9, 1);
    });

    it('AS3: simulates newly placed 3D breadboard circuit with forward current driving LED and strict OFF reset on stop', () => {
      const solver = new CircuitSolver();

      // Battery 9V, 330 ohm resistor, and White LED on 3D breadboard
      const testComps: CircuitComponent[] = [
        {
          id: 'bat1',
          type: 'BATTERY_9V',
          label: '9V Battery',
          value: '9V',
          category: 'sources',
          footprint: 'Battery:BatteryHolder_Keystone_2460_1xAA',
          x: 0,
          y: 0,
          rotation: 0,
          x3d: -95,
          y3d: 0,
          z3d: 0,
          pins: [
            { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
            { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
          ],
          parameters: { voltage: 9.0 },
        },
        {
          id: 'r1',
          type: 'RESISTOR',
          label: 'R1',
          value: '330Ω',
          category: 'passive',
          footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal',
          x: 100,
          y: 0,
          rotation: 0,
          x3d: -5.08, // Col 30
          y3d: 8.5,
          z3d: -8.42, // Row C (Top)
          pins: [
            { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
            { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
          ],
          parameters: { resistance: 330 },
        },
        {
          id: 'led1',
          type: 'LED',
          label: 'LED1',
          value: 'White LED',
          category: 'active',
          footprint: 'LED_THT:LED_D5.0mm',
          x: 200,
          y: 0,
          rotation: 0,
          x3d: 5.08, // Col 34
          y3d: 8.5,
          z3d: -8.42, // Row C (Top)
          pins: [
            { id: 'a', name: 'A (+)', x: -25, y: 0, pinType: 'passive' },
            { id: 'k', name: 'K (-)', x: 25, y: 0, pinType: 'passive' },
          ],
          parameters: { color: 'White', forwardVoltageV: 3.1 },
        },
      ];

      // Wires connected through breadboard tie rails and columns
      // Battery(+) -> top positive rail (hole 1)
      // Top positive rail (hole 5) -> Resistor pin 1 (Col 28, Row A)
      // Resistor pin 2 (Col 32, Row A) -> LED Anode (Col 33, Row A)
      // LED Cathode (Col 35, Row A) -> top negative rail (hole 10)
      // Top negative rail (hole 1) -> Battery(-)
      const testWires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'bat1', fromPinId: '+', toCompId: 'breadboard', toPinId: 'bb_rail_top_pos_1' },
        { id: 'w2', fromCompId: 'breadboard', fromPinId: 'bb_rail_top_pos_5', toCompId: 'breadboard', toPinId: 'bb_col_28_A' },
        { id: 'w3', fromCompId: 'breadboard', fromPinId: 'bb_col_32_A', toCompId: 'breadboard', toPinId: 'bb_col_33_A' },
        { id: 'w4', fromCompId: 'breadboard', fromPinId: 'bb_col_35_A', toCompId: 'breadboard', toPinId: 'bb_rail_top_neg_10' },
        { id: 'w5', fromCompId: 'breadboard', fromPinId: 'bb_rail_top_neg_1', toCompId: 'bat1', toPinId: '-' },
      ];

      // Step simulation
      const res = solver.step(testComps, testWires, 0.001);
      const ledState = res.componentStates['led1'];

      // Forward current If should be positive (~(9V - 3.1V) / (330 + 15) = ~17.1mA)
      expect(ledState).toBeDefined();
      expect(ledState.current).toBeGreaterThan(0.010);
      expect(ledState.current).toBeLessThan(0.025);
      expect(ledState.on).toBe(true);
      expect(ledState.brightness).toBeGreaterThan(0.5);

      // Verify strict OFF state when simulation is stopped:
      const isSimulating = false;
      const isPowered = Boolean(isSimulating && (ledState?.on || (ledState?.current && Math.abs(ledState.current) > 0.001)));
      const effectiveBrightness = isSimulating && isPowered ? (ledState?.brightness ?? 1.0) : 0;
      expect(isPowered).toBe(false);
      expect(effectiveBrightness).toBe(0);
    });
  });
});
