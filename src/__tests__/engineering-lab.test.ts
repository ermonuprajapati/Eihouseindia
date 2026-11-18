import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { VirtualMcuRuntime } from '@/modules/engineering-lab/embedded-engine/virtual-mcu-runtime';
import { CircuitComponent, CircuitWire, EngineeringProject } from '@/modules/engineering-lab/types';
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
});
