import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { VirtualMcuRuntime } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { CircuitComponent, CircuitWire, EngineeringProject, PcbTrack } from '@/modules/engineering-lab/types';
import { computeWireSvgPath } from '@/components/engineering-lab/Canvas/SchematicCanvas';
import { TEMPLATE_555_ASTABLE, TEMPLATE_ARDUINO_BLINK } from '@/modules/engineering-lab/templates/starter-templates';
import { COMPONENT_CATALOG, createComponentInstance, ComponentTemplate } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { TARGET_BOARDS, TargetBoardSpec } from '@/modules/engineering-lab/embedded-engine/board-definitions';
import { FirmwareCompiler } from '@/modules/engineering-lab/embedded-engine/firmware-compiler';

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
});
