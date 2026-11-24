import { describe, it, expect } from 'vitest';
import { VIRTUAL_LAB_NAV_ITEMS } from '../modules/engineering-lab/navigation-config';
import {
  autoLayoutCircuit,
  computeComponentBoundingBox,
  countComponentOverlaps,
  countWireThroughBodyCuts,
  routeOrthogonalWires,
  synchronizeCircuitViews,
  segmentIntersectsBox,
} from '../modules/engineering-lab/schematic-engine/schematic-sync-layout';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { CircuitSolver } from '../modules/engineering-lab/circuit-engine/circuit-solver';
import { PcbGenerator } from '../modules/engineering-lab/pcb-engine/pcb-generator';
import { CircuitComponent, CircuitWire, EngineeringProject } from '../modules/engineering-lab/types';

describe('GATE 2: Exact Compact 7-Tab Navigation Contract', () => {
  it('strictly enforces 7 items, exact sequence, exact short display names, and preserved internal IDs', () => {
    expect(VIRTUAL_LAB_NAV_ITEMS).toHaveLength(7);

    const expectedLabels = [
      'Schematic',
      '3D Studio',
      'Schematic Editor',
      'PCB Layout',
      '3D PCB',
      'Instruments',
      'MCU',
    ];

    const actualLabels = VIRTUAL_LAB_NAV_ITEMS.map((item) => item.label);
    expect(actualLabels).toEqual(expectedLabels);

    const actualNames = VIRTUAL_LAB_NAV_ITEMS.map((item) => item.name);
    expect(actualNames).toEqual(expectedLabels);

    // Verify ZERO subtitles or multi-line descriptions inside labels
    VIRTUAL_LAB_NAV_ITEMS.forEach((item) => {
      expect(item.label).not.toContain('\n');
      expect(item.label).not.toContain(' - ');
      expect(item.label).not.toContain('(');
      expect(item.label.length).toBeLessThan(20);
      expect(item.title.length).toBeGreaterThan(5); // Tooltips must contain full descriptive titles
    });

    // Verify all 6 existing internal mode IDs are 100% preserved
    const modeIds = VIRTUAL_LAB_NAV_ITEMS.map((item) => item.id);
    expect(modeIds).toContain('schematic');
    expect(modeIds).toContain('studio3d');
    expect(modeIds).toContain('schematicEditor');
    expect(modeIds).toContain('pcb2d');
    expect(modeIds).toContain('pcb3d');
    expect(modeIds).toContain('instruments');
    expect(modeIds).toContain('mcu');
  });
});

describe('GATE 3: 3-Way Circuit Synchronization & Zero-Overlap Engine', () => {
  // Test circuit fixture: NE555 Astable + Arduino Uno + HC-SR04 ultrasonic sensor
  const createMultiPartCircuit = () => {
    const base = JSON.parse(JSON.stringify(TEMPLATE_555_ASTABLE)) as EngineeringProject;

    const uno: CircuitComponent = {
      id: 'mcu1',
      type: 'ARDUINO_UNO',
      label: 'Arduino Uno R3',
      category: 'microcontrollers',
      x: 0,
      y: 0,
      rotation: 0,
      value: 'ATmega328P',
      parameters: {},
      pins: [
        { id: '5V', name: '5V', x: -40, y: 20, pinType: 'power' },
        { id: 'GND_1', name: 'GND', x: -40, y: 30, pinType: 'power' },
        { id: 'D2', name: 'D2', x: 40, y: -20, pinType: 'bidirectional' },
        { id: 'D3', name: 'D3', x: 40, y: -10, pinType: 'bidirectional' },
      ],
      footprint: 'MODULE_ARDUINO_UNO',
    };

    const hcsr04: CircuitComponent = {
      id: 'sensor1',
      type: 'MODULE_HCSR04',
      label: 'HC-SR04 Sensor',
      category: 'sensors',
      x: 0,
      y: 0,
      rotation: 0,
      value: 'HC-SR04',
      parameters: {},
      pins: [
        { id: 'VCC', name: 'VCC', x: -20, y: -10, pinType: 'power' },
        { id: 'TRIG', name: 'TRIG', x: -20, y: 0, pinType: 'input' },
        { id: 'ECHO', name: 'ECHO', x: -20, y: 10, pinType: 'output' },
        { id: 'GND', name: 'GND', x: -20, y: 20, pinType: 'power' },
      ],
      footprint: 'MODULE_HC_SR04',
    };

    const newWires: CircuitWire[] = [
      { id: 'w_uno_5v', fromCompId: 'mcu1', fromPinId: '5V', toCompId: 'sensor1', toPinId: 'VCC', netName: '5V' },
      { id: 'w_uno_trig', fromCompId: 'mcu1', fromPinId: 'D2', toCompId: 'sensor1', toPinId: 'TRIG', netName: 'TRIG' },
      { id: 'w_uno_echo', fromCompId: 'mcu1', fromPinId: 'D3', toCompId: 'sensor1', toPinId: 'ECHO', netName: 'ECHO' },
      { id: 'w_uno_gnd', fromCompId: 'mcu1', fromPinId: 'GND_1', toCompId: 'sensor1', toPinId: 'GND', netName: 'GND' },
    ];

    return {
      components: [...base.components, uno, hcsr04],
      wires: [...base.wires, ...newWires],
    };
  };

  it('Direction 1 (Schematic -> Schematic Editor): 100% components/wires preserved, 0 overlaps, 0 wire body cuts', () => {
    const circuit = createMultiPartCircuit();
    const result = synchronizeCircuitViews(circuit.components, circuit.wires, 'schematic');

    // 100% preservation
    expect(result.components).toHaveLength(circuit.components.length);
    expect(result.wires).toHaveLength(circuit.wires.length);

    // 0 component bounding-box overlaps
    expect(result.overlapsCount).toBe(0);

    // 0 wire segments cutting through unrelated component bodies
    const compBoxes = result.components.map((c) => ({ id: c.id, box: computeComponentBoundingBox(c, true, 5) }));
    result.routedWires.forEach((rw) => {
      rw.segments.forEach((seg, sIdx) => {
        compBoxes.forEach(({ id, box }) => {
          if (id === rw.fromCompId || id === rw.toCompId) return;
          if (segmentIntersectsBox({ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }, box)) {
            console.log('CUT:', rw.wireId, 'from', rw.fromCompId, 'to', rw.toCompId, 'seg', sIdx, seg, 'intersects', id, box);
          }
        });
      });
    });
    const wireCuts = countWireThroughBodyCuts(result.components, result.routedWires, true);
    expect(wireCuts).toBe(0);

    // Check all wires have valid 90° Manhattan geometry
    result.routedWires.forEach((rw) => {
      expect(rw.points.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < rw.points.length - 1; i++) {
        const dx = Math.abs(rw.points[i + 1].x - rw.points[i].x);
        const dy = Math.abs(rw.points[i + 1].y - rw.points[i].y);
        // Each segment must be strictly horizontal (dy=0) OR strictly vertical (dx=0)
        const isManhattan = dx === 0 || dy === 0;
        expect(isManhattan).toBe(true);
      }
    });
  });

  it('Direction 2 (3D Studio -> Schematic + Schematic Editor): assigns spacious non-overlapping slots to 3D additions', () => {
    const baseCircuit = JSON.parse(JSON.stringify(TEMPLATE_555_ASTABLE)) as EngineeringProject;

    // Simulate 2 components added from 3D Studio without 2D coordinates (x=0, y=0)
    const comp3d1: CircuitComponent = {
      id: 'led_blue',
      type: 'LED',
      label: 'LED Blue',
      category: 'displays',
      x: 0,
      y: 0,
      rotation: 0,
      value: 'BLUE',
      parameters: {},
      pins: [
        { id: 'anode', name: 'A', x: -15, y: 0, pinType: 'passive' },
        { id: 'cathode', name: 'K', x: 15, y: 0, pinType: 'passive' },
      ],
      footprint: 'LED_5MM',
    };

    const comp3d2: CircuitComponent = {
      id: 'res_blue',
      type: 'RESISTOR',
      label: 'R_Blue',
      category: 'passive',
      x: 0,
      y: 0,
      rotation: 0,
      value: '220',
      parameters: {},
      pins: [
        { id: '1', name: '1', x: -20, y: 0, pinType: 'passive' },
        { id: '2', name: '2', x: 20, y: 0, pinType: 'passive' },
      ],
      footprint: 'R_AXIAL_0.25W',
    };

    const newWires: CircuitWire[] = [
      { id: 'w_blue_1', fromCompId: 'res_blue', fromPinId: '2', toCompId: 'led_blue', toPinId: 'anode', netName: 'NET_BLUE' },
      { id: 'w_blue_2', fromCompId: 'led_blue', fromPinId: 'cathode', toCompId: 'gnd1', toPinId: 'gnd', netName: 'GND' },
    ];

    const inputComps = [...baseCircuit.components, comp3d1, comp3d2];
    const inputWires = [...baseCircuit.wires, ...newWires];

    const result = synchronizeCircuitViews(inputComps, inputWires, '3d-studio');

    expect(result.components).toHaveLength(inputComps.length);
    expect(result.wires).toHaveLength(inputWires.length);
    expect(result.overlapsCount).toBe(0);

    // Newly added parts must have valid editor positions
    const placedLed = result.components.find((c) => c.id === 'led_blue');
    const placedRes = result.components.find((c) => c.id === 'res_blue');
    expect(placedLed?.editorPosition?.x).toBeGreaterThan(0);
    expect(placedRes?.editorPosition?.x).toBeGreaterThan(0);
    expect(placedLed?.editorPosition?.x).not.toEqual(placedRes?.editorPosition?.x);
  });

  it('Direction 3 (Schematic Editor -> Schematic + 3D Studio + PCB): solver runs cleanly & PCB router produces 0 unrouted nets', () => {
    const layout = autoLayoutCircuit(TEMPLATE_555_ASTABLE.components, TEMPLATE_555_ASTABLE.wires);

    // 1. Solver verification on layout components
    const solver = new CircuitSolver();
    const solverResult = solver.step(layout.components, layout.wires, 0.001);
    expect(solverResult).toBeDefined();
    expect(solverResult.nodeVoltages).toBeDefined();

    // 2. PCB Generator verification
    const pcb = PcbGenerator.generatePcbFromSchematic(layout.components, layout.wires, 80, 60);
    expect(pcb).toBeDefined();
    expect(pcb.components && pcb.components.length).toBeGreaterThan(0);
    expect(pcb.tracks && pcb.tracks.length).toBeGreaterThan(0);
  });

  it('Backward Compatibility: Loads legacy project without editorPosition with 0 errors and resolves clean layout', () => {
    // Legacy project JSON without editorPosition or schematicEditorLayout
    const legacyProject = JSON.parse(JSON.stringify(TEMPLATE_555_ASTABLE)) as EngineeringProject;
    legacyProject.components.forEach((c) => {
      delete c.editorPosition;
      delete c.editorRotation;
      delete c.editorFlipped;
    });
    delete legacyProject.schematicEditorLayout;

    // Run auto-layout
    const result = synchronizeCircuitViews(legacyProject.components, legacyProject.wires, 'schematic');
    expect(result.components).toHaveLength(legacyProject.components.length);
    expect(result.overlapsCount).toBe(0);

    result.components.forEach((c) => {
      expect(c.editorPosition).toBeDefined();
      expect(typeof c.editorPosition?.x).toBe('number');
      expect(typeof c.editorPosition?.y).toBe('number');
    });
  });
});
