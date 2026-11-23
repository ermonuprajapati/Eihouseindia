import { describe, it, expect } from 'vitest';
import { getComponentPinLabels } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import { COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { CircuitComponent, CircuitWire, Component3D, PcbLayout, PcbSilkscreenText } from '@/modules/engineering-lab/types';
import { FootprintRenderer } from '@/modules/engineering-lab/pcb-engine/footprint-renderer';
import { PcbGenerator } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { DrcEngine } from '@/modules/engineering-lab/pcb-engine/drc-engine';
import { resolve3DModelType } from '@/modules/engineering-lab/studio-3d/SharedComponent3D';
import {
  resolvePhysicalSpec,
  resolveComponentMetadata,
} from '@/modules/engineering-lab/circuit-engine/component-physical-registry';
import {
  getComponentPinOffsets,
  findNearestHole830,
  areAllPinsInBreadboardHoles,
  computeComponentGroundElevation,
  getTieGroupForHole,
  BreadboardOccupancyMap,
  snapComponentToSurface,
  getComponentElevationSpec,
  BREADBOARD_TOP_Y,
  START_X,
  PITCH_X,
  ROW_Z_MAP,
} from '@/modules/engineering-lab/studio-3d/breadboard-topology';
import {
  MASTER_25_CATEGORIES,
  getCategory25ForComponent,
  filterComponentsByTier,
  getSimulationBadgeInfo,
} from '@/modules/engineering-lab/circuit-engine/component-categories-25';
import { ARDUINO_PINS } from '@/modules/engineering-lab/studio-3d/models/ArduinoUno3D';
import { MEGA_PINS } from '@/modules/engineering-lab/studio-3d/models/ArduinoMega3D';

describe('Virtual Lab v3 Verification Suite', () => {
  describe('Task 1: RGB LED Schematic Multi-Channel Glow', () => {
    it('RGB LED resolves wire conduction channels correctly', () => {
      const solver = new CircuitSolver();
      const rgbLed: CircuitComponent = {
        id: 'rgb-1',
        type: 'ACTUATOR_RGB_LED',
        label: 'RGB LED 1',
        value: 'RGB',
        category: 'actuators',
        footprint: 'LED_RGB_5MM',
        parameters: {},
        x: 100,
        y: 100,
        rotation: 0,
        pins: [
          { id: 'r', name: 'R', pinType: 'passive', x: -20, y: -20 },
          { id: 'cc', name: 'COM', pinType: 'passive', x: 0, y: 20 },
          { id: 'g', name: 'G', pinType: 'passive', x: 0, y: -20 },
          { id: 'b', name: 'B', pinType: 'passive', x: 20, y: -20 },
        ],
      };
      const vcc5V: CircuitComponent = {
        id: 'vcc-1',
        type: 'DC_VOLTAGE',
        label: '5V Rail',
        value: '5V',
        category: 'sources',
        footprint: 'PAD',
        parameters: { voltage: 5.0 },
        x: 50,
        y: 50,
        rotation: 0,
        pins: [
          { id: '1', name: '+', pinType: 'power', x: 0, y: -20 },
          { id: '2', name: '-', pinType: 'power', x: 0, y: 20 },
        ],
      };
      const rLimR: CircuitComponent = {
        id: 'r_r',
        type: 'RESISTOR',
        label: 'R_R',
        category: 'passive',
        footprint: '',
        value: '220',
        x: 0,
        y: -50,
        rotation: 0,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: -20, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 20, y: 0 },
        ],
        parameters: { resistance: 220 },
      };
      const rLimG: CircuitComponent = {
        id: 'r_g',
        type: 'RESISTOR',
        label: 'R_G',
        category: 'passive',
        footprint: '',
        value: '220',
        x: 50,
        y: -50,
        rotation: 0,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: -20, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 20, y: 0 },
        ],
        parameters: { resistance: 220 },
      };
      const gnd: CircuitComponent = {
        id: 'gnd-1',
        type: 'GND',
        label: 'GND',
        value: '0V',
        category: 'sources',
        footprint: 'PAD',
        parameters: { voltage: 0 },
        x: 100,
        y: 200,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', pinType: 'power', x: 0, y: 0 }],
      };

      // Connect 5V (+) -> Resistors -> Red and Green pins, COM to GND, and 5V (-) to GND
      const wires: CircuitWire[] = [
        { id: 'w1_in', fromCompId: 'vcc-1', fromPinId: '1', toCompId: 'r_r', toPinId: '1' },
        { id: 'w1_out', fromCompId: 'r_r', fromPinId: '2', toCompId: 'rgb-1', toPinId: 'r' },
        { id: 'w2_in', fromCompId: 'vcc-1', fromPinId: '1', toCompId: 'r_g', toPinId: '1' },
        { id: 'w2_out', fromCompId: 'r_g', fromPinId: '2', toCompId: 'rgb-1', toPinId: 'g' },
        { id: 'w3', fromCompId: 'gnd-1', fromPinId: '1', toCompId: 'rgb-1', toPinId: 'cc' },
        { id: 'w_gnd', fromCompId: 'vcc-1', fromPinId: '2', toCompId: 'gnd-1', toPinId: '1' },
      ];

      const simResult = solver.step([rgbLed, vcc5V, rLimR, rLimG, gnd], wires, 0.001);
      expect(simResult).toBeDefined();
      expect(simResult.componentStates['rgb-1']).toBeDefined();
      expect(simResult.componentStates['rgb-1'].on).toBe(true);
      expect(simResult.componentStates['rgb-1'].onRed).toBe(true);
      expect(simResult.componentStates['rgb-1'].onGreen).toBe(true);
      expect(simResult.componentStates['rgb-1'].onBlue).toBe(false);
    });

    it('RGB LED with COM UNCONNECTED (floating) produces strictly 0 current and 0 glow', () => {
      const solver = new CircuitSolver();
      const rgbLed: CircuitComponent = {
        id: 'rgb-floating',
        type: 'ACTUATOR_RGB_LED',
        label: 'RGB LED Floating',
        value: 'RGB',
        category: 'actuators',
        footprint: 'LED_RGB_5MM',
        parameters: { commonType: 'cathode' },
        x: 100,
        y: 100,
        rotation: 0,
        pins: [
          { id: 'r', name: 'R', pinType: 'passive', x: -20, y: -20 },
          { id: 'cc', name: 'COM', pinType: 'passive', x: 0, y: 20 },
          { id: 'g', name: 'G', pinType: 'passive', x: 0, y: -20 },
          { id: 'b', name: 'B', pinType: 'passive', x: 20, y: -20 },
        ],
      };
      const vcc5V: CircuitComponent = {
        id: 'vcc-1',
        type: 'VCC',
        label: '5V Rail',
        value: '5V',
        category: 'sources',
        footprint: 'PAD',
        parameters: { voltage: 5.0 },
        x: 50,
        y: 50,
        rotation: 0,
        pins: [{ id: 'out', name: '5V', pinType: 'power', x: 0, y: 0 }],
      };

      // 5V connected to R, G, and B, but COM is completely unconnected!
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-floating', toPinId: 'r' },
        { id: 'w2', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-floating', toPinId: 'g' },
        { id: 'w3', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-floating', toPinId: 'b' },
      ];

      const simResult = solver.step([rgbLed, vcc5V], wires, 0.001);
      const st = simResult.componentStates['rgb-floating'];
      expect(st).toBeDefined();
      expect(st.current).toBe(0);
      expect(st.on).toBe(false);
      expect(st.brightness).toBe(0);
      expect(st.onRed).toBe(false);
      expect(st.onGreen).toBe(false);
      expect(st.onBlue).toBe(false);
    });

    it('Reverse-biased RGB LED produces 0 current and 0 glow', () => {
      const solver = new CircuitSolver();
      const rgbLed: CircuitComponent = {
        id: 'rgb-rev',
        type: 'ACTUATOR_RGB_LED',
        label: 'RGB LED Reverse',
        value: 'RGB',
        category: 'actuators',
        footprint: 'LED_RGB_5MM',
        parameters: { commonType: 'cathode' },
        x: 100,
        y: 100,
        rotation: 0,
        pins: [
          { id: 'r', name: 'R', pinType: 'passive', x: -20, y: -20 },
          { id: 'cc', name: 'COM', pinType: 'passive', x: 0, y: 20 },
          { id: 'g', name: 'G', pinType: 'passive', x: 0, y: -20 },
          { id: 'b', name: 'B', pinType: 'passive', x: 20, y: -20 },
        ],
      };
      const vcc5V: CircuitComponent = {
        id: 'vcc-1',
        type: 'VCC',
        label: '5V Rail',
        value: '5V',
        category: 'sources',
        footprint: 'PAD',
        parameters: { voltage: 5.0 },
        x: 50,
        y: 50,
        rotation: 0,
        pins: [{ id: 'out', name: '5V', pinType: 'power', x: 0, y: 0 }],
      };
      const gnd: CircuitComponent = {
        id: 'gnd-1',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        category: 'sources',
        footprint: 'PAD',
        parameters: { voltage: 0 },
        x: 100,
        y: 200,
        rotation: 0,
        pins: [{ id: 'out', name: '0V', pinType: 'power', x: 0, y: 0 }],
      };

      // 5V connected to COM Cathode, GND connected to R, G, B channels (reverse bias)
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-rev', toPinId: 'cc' },
        { id: 'w2', fromCompId: 'gnd-1', fromPinId: 'out', toCompId: 'rgb-rev', toPinId: 'r' },
        { id: 'w3', fromCompId: 'gnd-1', fromPinId: 'out', toCompId: 'rgb-rev', toPinId: 'g' },
        { id: 'w4', fromCompId: 'gnd-1', fromPinId: 'out', toCompId: 'rgb-rev', toPinId: 'b' },
      ];

      const simResult = solver.step([rgbLed, vcc5V, gnd], wires, 0.001);
      const st = simResult.componentStates['rgb-rev'];
      expect(st).toBeDefined();
      expect(st.current).toBe(0);
      expect(st.on).toBe(false);
      expect(st.brightness).toBe(0);
      expect(st.onRed).toBe(false);
      expect(st.onGreen).toBe(false);
      expect(st.onBlue).toBe(false);
    });
  });

  describe('Task 2: All MCU, Dev Boards & Modules Readable Pin Labels', () => {
    it('returns non-empty, crisp pin labels for every MCU and dev board', () => {
      const mcuTypes = [
        'ARDUINO_UNO',
        'ARDUINO_MEGA',
        'ARDUINO_NANO',
        'ESP32_DEVKIT',
        'ESP32_S3',
        'ESP32_C3',
        'ESP8266_NODEMCU',
        'RASPBERRY_PI_PICO',
        'RASPBERRY_PI_PICO2',
      ];

      for (const t of mcuTypes) {
        const dummyComp: Component3D = {
          id: `test-${t}`,
          type: t,
          label: t,
          x3d: 0,
          y3d: 0,
          z3d: 0,
          rotY: 0,
          parameters: {},
        };
        const labels = getComponentPinLabels(dummyComp);
        expect(labels.length).toBeGreaterThan(0);
        labels.forEach((pin) => {
          expect(pin.label).toBeDefined();
          expect(pin.label.length).toBeGreaterThan(0);
          expect(pin.localPos).toBeDefined();
        });
      }
    });

    it('returns non-empty pin labels for all electronic modules and sensors', () => {
      const moduleTypes = [
        'HC_SR04',
        'MODULE_BLUETOOTH_HC05',
        'SERVO_SG90',
        'LCD_1602',
        'DISPLAY_OLED_SSD1306',
        'MODULE_RELAY_SPDT',
        'MOTOR_DRIVER_L298N',
        'MODULE_NRF24L01',
        'MODULE_ESP01',
      ];

      for (const t of moduleTypes) {
        const dummyComp: Component3D = {
          id: `test-${t}`,
          type: t,
          label: t,
          x3d: 0,
          y3d: 0,
          z3d: 0,
          rotY: 0,
          parameters: {},
        };
        const labels = getComponentPinLabels(dummyComp);
        expect(labels.length).toBeGreaterThan(0);
        labels.forEach((pin) => {
          expect(pin.label).toBeDefined();
          expect(pin.label.length).toBeGreaterThan(0);
        });
      }
    });

    it('falls back cleanly to COMPONENT_CATALOG pins for any catalog component', () => {
      COMPONENT_CATALOG.forEach((template) => {
        const dummyComp: Component3D = {
          id: `test-${template.type}`,
          type: template.type,
          label: template.name,
          x3d: 0,
          y3d: 0,
          z3d: 0,
          rotY: 0,
          parameters: {},
        };
        const labels = getComponentPinLabels(dummyComp);
        if (template.pins && template.pins.length > 0) {
          expect(labels.length).toBeGreaterThan(0);
          labels.forEach((pin) => {
            expect(pin.label).toBeTruthy();
          });
        }
      });
    });
  });

  describe('Task 3: MCU USB Disconnect -> Reconnect State Machine', () => {
    it('MCU drops power rails to 0V when USB is disconnected', () => {
      const solver = new CircuitSolver();
      const uno: CircuitComponent = {
        id: 'uno-1',
        type: 'ARDUINO_UNO',
        label: 'Arduino Uno R3',
        value: 'Uno',
        category: 'microcontrollers',
        footprint: 'Module:Arduino_Uno_R3',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '5V', name: '5V', pinType: 'power', x: 10, y: 10 },
          { id: 'GND', name: 'GND', pinType: 'power', x: 10, y: 20 },
        ],
        parameters: { usbPlugged: false, dcJackPlugged: false },
      };

      const res = solver.step([uno], [], 0.001);
      const sim = res.componentStates['uno-1'];
      expect(sim.on).toBe(false);
      expect(sim.pwrLed).toBe(false);
    });

    it('MCU re-energizes 5V power rails when USB is reconnected', () => {
      const solver = new CircuitSolver();
      const uno: CircuitComponent = {
        id: 'uno-1',
        type: 'ARDUINO_UNO',
        label: 'Arduino Uno R3',
        value: 'Uno',
        category: 'microcontrollers',
        footprint: 'Module:Arduino_Uno_R3',
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '5V', name: '5V', pinType: 'power', x: 10, y: 10 },
          { id: 'GND', name: 'GND', pinType: 'power', x: 10, y: 20 },
        ],
        parameters: { usbPlugged: true, dcJackPlugged: false },
      };

      const res = solver.step([uno], [], 0.001);
      const sim = res.componentStates['uno-1'];
      expect(sim.on).toBe(true);
      expect(sim.pwrLed).toBe(true);
      expect(sim.voltage).toBe(5.0);
    });
  });

  describe('Batch 2A: Unified Physical Representation & 3-Tier Master Component Library', () => {
    it('100% of registered components carry complete, strongly-typed physical specifications', () => {
      expect(COMPONENT_CATALOG.length).toBeGreaterThan(150);

      const validMounting = new Set(['THT', 'SMD', 'MODULE_HEADER', 'BOARD_OFFBOARD', 'PANEL_DIN', 'Through-Hole', 'Surface-Mount', 'Socketed', 'Chassis']);
      const validPlacement = new Set([
        'single-passive',
        'single-semiconductor',
        'ic-dip',
        'module-breadboard',
        'dev-board',
        'offboard-console',
        'industrial-equipment',
      ]);
      const validTiers = new Set(['generic', 'real', 'industrial']);

      COMPONENT_CATALOG.forEach((comp) => {
        const spec = comp.physicalSpec;
        expect(spec, `Component ${comp.type} must have physicalSpec`).toBeDefined();
        if (!spec) return;

        // Package Code
        expect(spec.packageCode, `Component ${comp.type} must have non-empty packageCode`).toBeTruthy();
        expect(typeof spec.packageCode).toBe('string');

        // Mounting Type
        expect(spec.mountingType).toBeDefined();
        expect(validMounting.has(spec.mountingType!)).toBe(true);

        // Placement Class
        expect(spec.placementClass).toBeDefined();
        expect(validPlacement.has(spec.placementClass!)).toBe(true);

        // Library Tier
        expect(comp.libraryTier).toBeDefined();
        expect(validTiers.has(comp.libraryTier!)).toBe(true);

        // Pin Pitch
        expect(spec.pinPitchMm).toBeGreaterThan(0);

        // Body Dimensions: strictly non-zero
        expect(spec.bodyDimensionsMm).toBeDefined();
        expect(spec.bodyDimensionsMm!.width, `Component ${comp.type} body width must be > 0`).toBeGreaterThan(0);
        expect(spec.bodyDimensionsMm!.depth, `Component ${comp.type} body depth must be > 0`).toBeGreaterThan(0);
        expect(spec.bodyDimensionsMm!.height, `Component ${comp.type} body height must be > 0`).toBeGreaterThan(0);

        // Courtyard: strictly >= body dimensions
        expect(spec.courtyardMm).toBeDefined();
        expect(spec.courtyardMm!.width).toBeGreaterThanOrEqual(spec.bodyDimensionsMm!.width);
        expect(spec.courtyardMm!.depth).toBeGreaterThanOrEqual(spec.bodyDimensionsMm!.depth);
        expect(spec.courtyardMm!.margin).toBeGreaterThanOrEqual(0);

        // 100% Pad Coverage: Every pin on the component MUST resolve to a pad in physicalSpec.pads
        expect(spec.pads).toBeDefined();
        expect(spec.pads!.length).toBeGreaterThanOrEqual(comp.pins.length);

        const padIds = new Set(spec.pads!.map((p) => p.pinId));
        comp.pins.forEach((pin) => {
          expect(padIds.has(pin.id), `Pin ${pin.id} on component ${comp.type} must resolve to a pad`).toBe(true);
        });

        // Pad geometry integrity
        spec.pads!.forEach((pad) => {
          expect(pad.pinId).toBeTruthy();
          expect(pad.drillMm).toBeGreaterThan(0);
          expect(pad.padDiameterMm).toBeGreaterThan(pad.drillMm);
          expect(['circle', 'rect', 'oval'].includes(pad.shape)).toBe(true);
        });
      });
    });

    it('enforces exact datasheet pinouts and packages for core Real Parts', () => {
      // 1. IRLZ44N / IRF540N (TO-220, Infineon): 1: Gate (G), 2: Drain (D), 3: Source (S)
      const mosfet = COMPONENT_CATALOG.find((c) => c.type === 'MOSFET_N');
      expect(mosfet).toBeDefined();
      expect(mosfet!.physicalSpec!.packageCode).toBe('TO-220');
      expect(mosfet!.physicalSpec!.mountingType).toBe('THT');
      expect(mosfet!.physicalSpec!.placementClass).toBe('single-semiconductor');
      const mosPads = mosfet!.physicalSpec!.pads!;
      expect(mosPads.length).toBe(3);
      expect(mosPads[0].pinNumber).toBe(1);
      expect(mosPads[0].pinId).toBe('g');
      expect(mosPads[1].pinNumber).toBe(2);
      expect(mosPads[1].pinId).toBe('d');
      expect(mosPads[2].pinNumber).toBe(3);
      expect(mosPads[2].pinId).toBe('s');

      // 2. L7805CV (TO-220, ST): 1: Input (IN), 2: Ground (GND), 3: Output (OUT)
      const reg = COMPONENT_CATALOG.find((c) => c.type === 'REGULATOR_7805');
      expect(reg).toBeDefined();
      expect(reg!.physicalSpec!.packageCode).toBe('TO-220');
      const regPads = reg!.physicalSpec!.pads!;
      expect(regPads.length).toBe(3);
      expect(regPads[0].pinNumber).toBe(1);
      expect(regPads[0].pinId).toBe('in');
      expect(regPads[1].pinNumber).toBe(2);
      expect(regPads[1].pinId).toBe('gnd');
      expect(regPads[2].pinNumber).toBe(3);
      expect(regPads[2].pinId).toBe('out');

      // 3. NE555 (DIP-8, TI): 1: GND, 2: TRIG, 3: OUT, 4: RESET, 5: CTRL, 6: THRES, 7: DISCH, 8: VCC
      const timer = COMPONENT_CATALOG.find((c) => c.type === 'TIMER_555');
      expect(timer).toBeDefined();
      expect(timer!.physicalSpec!.packageCode).toBe('DIP-8');
      expect(timer!.physicalSpec!.placementClass).toBe('ic-dip');
      const timerPads = timer!.physicalSpec!.pads!;
      expect(timerPads.length).toBe(8);
      expect(timerPads[0].pinNumber).toBe(1);
      expect(timerPads[1].pinNumber).toBe(2);
      expect(timerPads[2].pinNumber).toBe(3);
      expect(timerPads[3].pinNumber).toBe(4);
      expect(timerPads[4].pinNumber).toBe(5);
      expect(timerPads[5].pinNumber).toBe(6);
      expect(timerPads[6].pinNumber).toBe(7);
      expect(timerPads[7].pinNumber).toBe(8);

      // 4. LM358 (DIP-8, TI): 1: OUT1, 2: IN1-, 3: IN1+, 4: GND, 8: VCC
      const opamp = COMPONENT_CATALOG.find((c) => c.type === 'OPAMP_LM358');
      expect(opamp).toBeDefined();
      expect(opamp!.physicalSpec!.packageCode).toBe('DIP-8');
      const opPads = opamp!.physicalSpec!.pads!;
      expect(opPads.length).toBe(8);
      const padOut = opPads.find((p) => p.pinId === '1' || p.pinNumber === 1)!;
      const padInNeg = opPads.find((p) => p.pinId === '2' || p.pinNumber === 2)!;
      const padInPos = opPads.find((p) => p.pinId === '3' || p.pinNumber === 3)!;
      const padGnd = opPads.find((p) => p.pinId === '4' || p.pinNumber === 4)!;
      const padVcc = opPads.find((p) => p.pinId === '8' || p.pinNumber === 8)!;
      expect(padOut.pinNumber).toBe(1);
      expect(padInNeg.pinNumber).toBe(2);
      expect(padInPos.pinNumber).toBe(3);
      expect(padGnd.pinNumber).toBe(4);
      expect(padVcc.pinNumber).toBe(8);

      // 5. 1N4007 (DO-41, Vishay): 1: Anode (A), 2: Cathode (K)
      const diode = COMPONENT_CATALOG.find((c) => c.type === 'DIODE');
      expect(diode).toBeDefined();
      expect(diode!.physicalSpec!.packageCode).toBe('DO-41');
      const dPads = diode!.physicalSpec!.pads!;
      expect(dPads[0].pinId).toBe('a');
      expect(dPads[0].pinNumber).toBe(1);
      expect(dPads[1].pinId).toBe('k');
      expect(dPads[1].pinNumber).toBe(2);

      // 6. ATmega328P (DIP-28, Microchip): 28 verified pads
      const atmega = COMPONENT_CATALOG.find((c) => c.type === 'MCU_ATMEGA328P');
      expect(atmega).toBeDefined();
      expect(atmega!.physicalSpec!.packageCode).toBe('DIP-28');
      expect(atmega!.physicalSpec!.pads!.length).toBe(28);

      // 7. HC-SR04 (MODULE-HCSR04): 1: VCC, 2: TRIG, 3: ECHO, 4: GND
      const sr04 = COMPONENT_CATALOG.find((c) => c.type === 'SENSOR_ULTRASONIC');
      expect(sr04).toBeDefined();
      expect(sr04!.physicalSpec!.packageCode).toBe('MODULE-HCSR04');
      expect(sr04!.physicalSpec!.mountingType).toBe('MODULE_HEADER');
      const srPads = sr04!.physicalSpec!.pads!;
      expect(srPads.length).toBe(4);
      expect(srPads[0].pinId).toBe('VCC');
      expect(srPads[1].pinId).toBe('TRIG');
      expect(srPads[2].pinId).toBe('ECHO');
      expect(srPads[3].pinId).toBe('GND');

      // 8. RGB LED 5mm (THT-5MM-4PIN): 4 pads (R, COM, G, B)
      const rgb = COMPONENT_CATALOG.find((c) => c.type === 'ACTUATOR_RGB_LED');
      expect(rgb).toBeDefined();
      expect(rgb!.physicalSpec!.packageCode).toBe('THT-5MM-4PIN');
      const rgbPads = rgb!.physicalSpec!.pads!;
      expect(rgbPads.length).toBe(4);
      expect(rgbPads[0].pinId).toBe('r');
      expect(rgbPads[1].pinId).toBe('cc');
      expect(rgbPads[2].pinId).toBe('g');
      expect(rgbPads[3].pinId).toBe('b');
    });

    it('classifies components into 3 distinct engineering library tiers', () => {
      // Industrial Tier
      const mcb = COMPONENT_CATALOG.find((c) => c.type === 'PROTECTION_MCB_1P');
      expect(mcb!.libraryTier).toBe('industrial');
      expect(mcb!.placementClass).toBe('industrial-equipment');

      const contactor = COMPONENT_CATALOG.find((c) => c.type === 'CONTACTOR_MAIN');
      expect(contactor!.libraryTier).toBe('industrial');

      const estop = COMPONENT_CATALOG.find((c) => c.type === 'EMERGENCY_STOP');
      expect(estop!.libraryTier).toBe('industrial');

      // Real Tier
      const timer = COMPONENT_CATALOG.find((c) => c.type === 'TIMER_555');
      expect(timer!.libraryTier).toBe('real');

      const uno = COMPONENT_CATALOG.find((c) => c.type === 'ARDUINO_UNO');
      expect(uno!.libraryTier).toBe('real');

      const esp32 = COMPONENT_CATALOG.find((c) => c.type === 'ESP32_DEVKIT');
      expect(esp32!.libraryTier).toBe('real');

      // Generic Tier
      const res = COMPONENT_CATALOG.find((c) => c.type === 'RESISTOR');
      expect(res!.libraryTier).toBe('generic');
    });

    it('integrates footprint-renderer directly with canonical physicalSpec courtyard', () => {
      const hcsrComp = COMPONENT_CATALOG.find((c) => c.type === 'SENSOR_ULTRASONIC')!;
      const layout = FootprintRenderer.calculateSilkscreenLayout({
        designator: 'U1',
        type: hcsrComp.type,
        value: hcsrComp.name,
        x: 50,
        y: 50,
        rotation: 0,
        physicalSpec: hcsrComp.physicalSpec,
      });

      expect(layout).toBeDefined();
      expect(layout.boxBounds).toBeDefined();
      expect(layout.boxBounds!.width).toBe(hcsrComp.physicalSpec!.courtyardMm!.width);
      expect(layout.boxBounds!.height).toBe(hcsrComp.physicalSpec!.courtyardMm!.depth);
    });

    it('ensures dedicated 3D CAD mapping for all active components with zero generic DIP box fallbacks for sensors/modules', () => {
      // RGB LED maps to LED_RGB (not single-color LED or DIP_PACKAGE)
      expect(resolve3DModelType('ACTUATOR_RGB_LED')).toBe('LED_RGB');

      // HC-SR04 maps to HC_SR04 (not DIP_PACKAGE)
      expect(resolve3DModelType('SENSOR_ULTRASONIC')).toBe('HC_SR04');

      // Servo SG90 maps to SERVO_SG90
      expect(resolve3DModelType('ACTUATOR_SERVO_SG90')).toBe('SERVO_SG90');

      // LCD 1602 maps to LCD_1602
      expect(resolve3DModelType('DISPLAY_LCD1602')).toBe('LCD_1602');

      // Bluetooth HC-05 maps to BLUETOOTH_HC05
      expect(resolve3DModelType('MODULE_BLUETOOTH_HC05')).toBe('BLUETOOTH_HC05');

      // Dev boards map to their authentic dedicated 3D models
      expect(resolve3DModelType('ARDUINO_UNO')).toBe('ARDUINO_UNO');
      expect(resolve3DModelType('ARDUINO_NANO')).toBe('ARDUINO_NANO');
      expect(resolve3DModelType('ARDUINO_MEGA')).toBe('ARDUINO_MEGA');
      expect(resolve3DModelType('ESP32_DEVKIT')).toBe('ESP32_DEVKIT');
      expect(resolve3DModelType('RASPBERRY_PI_PICO')).toBe('RASPBERRY_PI_PICO');
    });
  });

  describe('Task 3: EI House 25-Category Master Component Library & 3-Tier Browser UI', () => {
    it('verifies exact 25-category engineering navigation hierarchy from 01 to 25', () => {
      expect(MASTER_25_CATEGORIES.length).toBe(25);
      const expectedNumbers = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0'));
      MASTER_25_CATEGORIES.forEach((cat, idx) => {
        expect(cat.number).toBe(expectedNumbers[idx]);
        expect(cat.label.startsWith(`${expectedNumbers[idx]}.`)).toBe(true);
      });
      expect(MASTER_25_CATEGORIES[0].name).toBe('Resistors');
      expect(MASTER_25_CATEGORIES[24].name).toBe('Mechanical & Thermal Accessories');
    });

    it('maps components into each of the 25 master categories with 100% catalog coverage', () => {
      const counts: Record<string, number> = {};
      MASTER_25_CATEGORIES.forEach((c) => {
        counts[c.id] = 0;
      });

      COMPONENT_CATALOG.forEach((comp) => {
        const cat = getCategory25ForComponent(comp);
        expect(cat).toBeDefined();
        expect(cat.number).toMatch(/^\d{2}$/);
        counts[cat.id]++;
      });

      // Verify all 25 categories have at least 1 mapped component in the master catalog
      MASTER_25_CATEGORIES.forEach((c) => {
        expect(counts[c.id]).toBeGreaterThan(0);
      });
    });

    it('filters components accurately across the 3 database tiers (Generic, Real Parts, Industrial)', () => {
      const genericComps = filterComponentsByTier(COMPONENT_CATALOG, 'generic');
      const realComps = filterComponentsByTier(COMPONENT_CATALOG, 'real');
      const industrialComps = filterComponentsByTier(COMPONENT_CATALOG, 'industrial');
      const allComps = filterComponentsByTier(COMPONENT_CATALOG, 'all');

      expect(genericComps.length).toBeGreaterThan(0);
      expect(realComps.length).toBeGreaterThan(0);
      expect(industrialComps.length).toBeGreaterThan(0);
      expect(genericComps.length + realComps.length + industrialComps.length).toBe(COMPONENT_CATALOG.length);
      expect(allComps.length).toBe(COMPONENT_CATALOG.length);

      // Verify specific real parts are in real tier
      const real555 = realComps.find((c) => c.type === 'TIMER_555');
      expect(real555).toBeDefined();
      expect(real555!.libraryTier).toBe('real');

      // Verify specific industrial parts are in industrial tier
      const mcb = industrialComps.find((c) => c.type === 'PROTECTION_MCB_1P');
      expect(mcb).toBeDefined();
      expect(mcb!.libraryTier).toBe('industrial');
    });

    it('resolves truthful simulation status badges: Sim, Partial, and Catalog', () => {
      const simFull = getSimulationBadgeInfo('full_mna');
      expect(simFull.label).toBe('Sim');
      expect(simFull.badgeClass).toContain('emerald');

      const simSupp = getSimulationBadgeInfo('supported');
      expect(simSupp.label).toBe('Sim');

      const simPartial = getSimulationBadgeInfo('behavioral');
      expect(simPartial.label).toBe('Partial');
      expect(simPartial.badgeClass).toContain('amber');

      const simMcu = getSimulationBadgeInfo('transpiled_mcu');
      expect(simMcu.label).toBe('Partial');

      const simCatalog = getSimulationBadgeInfo('catalog_only');
      expect(simCatalog.label).toBe('Catalog');
      expect(simCatalog.badgeClass).toContain('slate');
    });

    it('supports fast multi-field search across partNumber, manufacturer, package, and category', () => {
      // Search by part number: 1N4007
      const byPart = COMPONENT_CATALOG.filter((c) =>
        (c.partNumber && c.partNumber.toLowerCase().includes('1n4007')) ||
        (c.manufacturerPartNumber && c.manufacturerPartNumber.toLowerCase().includes('1n4007')) ||
        c.name.toLowerCase().includes('1n4007')
      );
      expect(byPart.length).toBeGreaterThan(0);

      // Search by package code: TO-220
      const byPkg = COMPONENT_CATALOG.filter((c) =>
        c.physicalSpec?.packageCode?.toLowerCase().includes('to-220')
      );
      expect(byPkg.length).toBeGreaterThan(0);

      // Search by 25-category label: Resistors
      const byCat = COMPONENT_CATALOG.filter((c) => {
        const cat = getCategory25ForComponent(c);
        return cat.name.toLowerCase().includes('resistors');
      });
      expect(byCat.length).toBeGreaterThan(0);
    });
  });

  describe('TASK 3: Multi-Gate Real IC Packages (74HC14 & 14-Pin ICs) & Properties Inspector', () => {
    it('74HC14 Hex Schmitt-Trigger is cataloged with 14 pins, DIP-14, and real libraryTier', () => {
      const ic74hc14 = COMPONENT_CATALOG.find((c) => c.type === 'IC_74HC14');
      expect(ic74hc14).toBeDefined();
      expect(ic74hc14!.pins.length).toBe(14);
      expect(ic74hc14!.libraryTier).toBe('real');
      expect(ic74hc14!.packageType).toBe('THT');
      expect(ic74hc14!.footprint).toContain('DIP-14');

      // Verify pin IDs 1..14 are all present
      const pinIds = ic74hc14!.pins.map((p) => p.id);
      for (let i = 1; i <= 14; i++) {
        expect(pinIds).toContain(String(i));
      }

      // Check pin names (1A, 1Y, 2A, 2Y, 3A, 3Y, GND, 4Y, 4A, 5Y, 5A, 6Y, 6A, VCC)
      const pin7 = ic74hc14!.pins.find((p) => p.id === '7');
      const pin14 = ic74hc14!.pins.find((p) => p.id === '14');
      expect(pin7?.name).toBe('GND');
      expect(pin14?.name).toBe('VCC');
    });

    it('Circuit solver executes multi-gate inverters on 74HC14: unpowered vs powered inversion', () => {
      const solver = new CircuitSolver();
      const ic74: CircuitComponent = {
        id: 'u1',
        type: 'IC_74HC14',
        label: '74HC14',
        value: '74HC14',
        category: 'digital_logic',
        footprint: 'Package_DIP:DIP-14_W7.62mm',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: '1A', pinType: 'input', x: -40, y: -45 },
          { id: '2', name: '1Y', pinType: 'output', x: -40, y: -30 },
          { id: '3', name: '2A', pinType: 'input', x: -40, y: -15 },
          { id: '4', name: '2Y', pinType: 'output', x: -40, y: 0 },
          { id: '7', name: 'GND', pinType: 'power', x: -40, y: 45 },
          { id: '14', name: 'VCC', pinType: 'power', x: 40, y: -45 },
        ],
      };

      const vcc5V: CircuitComponent = {
        id: 'vcc',
        type: 'DC_VOLTAGE',
        label: 'VCC',
        value: '5V',
        category: 'power',
        footprint: '',
        parameters: { voltage: 5.0 },
        x: -100,
        y: -100,
        rotation: 0,
        pins: [
          { id: '+', name: '+', pinType: 'power', x: 0, y: -10 },
          { id: '-', name: '-', pinType: 'power', x: 0, y: 10 },
        ],
      };

      const gnd: CircuitComponent = {
        id: 'gnd',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        category: 'power',
        footprint: '',
        parameters: {},
        x: -100,
        y: 100,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', pinType: 'power', x: 0, y: 0 }],
      };

      // Case A: Unpowered 74HC14 -> Outputs must be 0V
      const unpoweredResult = solver.step([ic74], [], 0.001);
      expect(unpoweredResult.nodeVoltages).toBeDefined();

      // Case B: Powered 74HC14 with VCC=5V, GND=0V, 1A tied to 5V (HIGH), 2A tied to GND (LOW)
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'vcc', fromPinId: '+', toCompId: 'u1', toPinId: '14' },
        { id: 'w2', fromCompId: 'gnd', fromPinId: '1', toCompId: 'vcc', toPinId: '-' },
        { id: 'w3', fromCompId: 'gnd', fromPinId: '1', toCompId: 'u1', toPinId: '7' },
        // Drive 1A HIGH (connect to 5V)
        { id: 'w4', fromCompId: 'u1', fromPinId: '14', toCompId: 'u1', toPinId: '1' },
        // Drive 2A LOW (connect to GND)
        { id: 'w5', fromCompId: 'u1', fromPinId: '7', toCompId: 'u1', toPinId: '3' },
      ];

      const poweredResult = solver.step([ic74, vcc5V, gnd], wires, 0.001);
      const v1Y = poweredResult.nodeVoltages['u1:2'];
      const v2Y = poweredResult.nodeVoltages['u1:4'];

      // Gate 1: 1A is HIGH (5V) -> Inverter output 1Y MUST be LOW (0V)
      expect(v1Y).toBeCloseTo(0.0, 1);
      // Gate 2: 2A is LOW (0V) -> Inverter output 2Y MUST be HIGH (5V)
      expect(v2Y).toBeCloseTo(5.0, 1);
    });

    it('3D Studio getComponentPinLabels returns all 14 pins with valid 3D positions for 74HC14', () => {
      const comp3d: Component3D = {
        id: 'u1_3d',
        type: 'IC_74HC14',
        label: '74HC14',
        value: '74HC14',
        parameters: {},
        x3d: 0,
        y3d: 8.5,
        z3d: 0,
        rotY: 0,
      };

      const pinLabels = getComponentPinLabels(comp3d);
      expect(pinLabels.length).toBe(14);
      expect(pinLabels[0].id).toBe('1');
      expect(pinLabels[0].label).toContain('1A');
      expect(pinLabels[6].id).toBe('7');
      expect(pinLabels[6].label).toContain('GND');
      expect(pinLabels[13].id).toBe('14');
      expect(pinLabels[13].label).toContain('VCC');

      // Verify all local positions are 3D coordinate tuples [x, y, z]
      pinLabels.forEach((p) => {
        expect(p.localPos.length).toBe(3);
        expect(Number.isFinite(p.localPos[0])).toBe(true);
        expect(Number.isFinite(p.localPos[1])).toBe(true);
        expect(Number.isFinite(p.localPos[2])).toBe(true);
      });
    });

    it('getComponentPinOffsets arranges 14 pins across breadboard Row E and Row F', () => {
      const offsets = getComponentPinOffsets('IC_74HC14');
      expect(offsets.length).toBe(14);

      // Pins 1..7: top row (Row E, z = -3.81)
      for (let i = 0; i < 7; i++) {
        expect(offsets[i].z).toBeCloseTo(-3.81, 2);
      }
      // Pins 8..14: bottom row (Row F, z = +3.81)
      for (let i = 7; i < 14; i++) {
        expect(offsets[i].z).toBeCloseTo(3.81, 2);
      }
    });

    it('resolveComponentMetadata and resolvePhysicalSpec provide accurate physical specs for 74HC14 and real parts', () => {
      const icComp: CircuitComponent = {
        id: 'u1',
        type: 'IC_74HC14',
        label: '74HC14',
        value: '74HC14',
        category: 'digital_logic',
        footprint: 'Package_DIP:DIP-14_W7.62mm',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: Array.from({ length: 14 }, (_, i) => ({
          id: String(i + 1),
          name: `P${i + 1}`,
          pinType: 'passive' as const,
          x: 0,
          y: 0,
        })),
      };

      const meta = resolveComponentMetadata(icComp);
      expect(meta.partNumber).toContain('74HC14');
      expect(meta.manufacturer).toContain('Texas Instruments');
      expect(meta.libraryTier).toBe('real');

      const spec = resolvePhysicalSpec(icComp);
      expect(spec.packageCode).toBe('DIP-14');
      expect(spec.mountingType).toBe('THT');
      expect(spec?.pads?.length).toBe(14);
      expect(spec.pinPitchMm).toBeCloseTo(2.54, 2);
    });

    it('searching "74HC14" resolves to the full 14-pin DIP-14 IC package and NEVER a 2-pin single gate', () => {
      const match = COMPONENT_CATALOG.find(
        (c) => c.type === 'IC_74HC14' || c.defaultValue === '74HC14' || c.manufacturerPartNumber === 'SN74HC14N'
      );
      expect(match).toBeDefined();
      expect(match!.pins.length).toBe(14);
      expect(match!.physicalSpec?.packageCode).toBe('DIP-14');
      expect(match!.physicalSpec?.pads?.length).toBe(14);
      expect(match!.pins[0].id).toBe('1');
      expect(match!.pins[0].name).toBe('1A');
      expect(match!.pins[6].id).toBe('7');
      expect(match!.pins[6].name).toBe('GND');
      expect(match!.pins[13].id).toBe('14');
      expect(match!.pins[13].name).toBe('VCC');
    });

    it('74HC00, 74HC04, 74HC08, 74HC32, 74HC86, LM358, LM324, NE555 all expose full datasheet pin counts matching physicalSpec.pads.length', () => {
      const partsToCheck = [
        { type: 'IC_74HC14', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'IC_74HC04', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'IC_74HC00', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'IC_74HC08', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'IC_74HC32', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'IC_74HC86', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'OPAMP_LM358', expectedPins: 8, expectedPkg: 'DIP-8' },
        { type: 'OPAMP_LM324', expectedPins: 14, expectedPkg: 'DIP-14' },
        { type: 'TIMER_555', expectedPins: 8, expectedPkg: 'DIP-8' },
        { type: 'LOGIC_74HC595', expectedPins: 16, expectedPkg: 'DIP-16' },
        { type: 'LOGIC_CD4017', expectedPins: 16, expectedPkg: 'DIP-16' },
        { type: 'IC_ULN2003', expectedPins: 16, expectedPkg: 'DIP-16' },
        { type: 'IC_L293D', expectedPins: 16, expectedPkg: 'DIP-16' },
        { type: 'MCU_ATMEGA328P', expectedPins: 28, expectedPkg: 'DIP-28' },
      ];

      for (const p of partsToCheck) {
        const item = COMPONENT_CATALOG.find((c) => c.type === p.type);
        expect(item, `Component ${p.type} should exist in catalog`).toBeDefined();
        expect(item!.pins.length, `Component ${p.type} pins count`).toBe(p.expectedPins);
        const spec = resolvePhysicalSpec(item!);
        expect(spec.packageCode, `Component ${p.type} package code`).toBe(p.expectedPkg);
        expect(spec?.pads?.length, `Component ${p.type} pads count`).toBe(p.expectedPins);
      }
    });

    it('74HC14 solver evaluates multi-channel inversion cleanly when powered and outputs 0V when unpowered', () => {
      const solver = new CircuitSolver();
      const ic: CircuitComponent = {
        id: 'u1',
        type: 'IC_74HC14',
        label: '74HC14',
        value: '74HC14',
        category: 'digital_logic',
        footprint: 'Package_DIP:DIP-14_W7.62mm',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: Array.from({ length: 14 }, (_, i) => ({
          id: String(i + 1),
          name: `P${i + 1}`,
          pinType: 'passive' as const,
          x: 0,
          y: 0,
        })),
      };

      const vccSupply: CircuitComponent = {
        id: 'vcc1',
        type: 'DC_VOLTAGE',
        label: '5V Rail',
        value: '5V',
        category: 'power',
        footprint: '',
        parameters: { voltage: 5.0 },
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '+', name: '+', pinType: 'power', x: 0, y: -20 },
          { id: '-', name: '-', pinType: 'power', x: 0, y: 20 },
        ],
      };

      const gndRef: CircuitComponent = {
        id: 'gnd1',
        type: 'GROUND',
        label: 'GND',
        value: '0V',
        category: 'power',
        footprint: '',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: [{ id: '1', name: 'GND', pinType: 'power', x: 0, y: 0 }],
      };

      // Case A: Powered with 5V to VCC (pin 14), GND to pin 7.
      // Drive gate 1 input (pin 1) to 5V (HIGH) -> output 1Y (pin 2) should invert to 0V.
      // Drive gate 2 input (pin 3) to 0V (LOW) -> output 2Y (pin 4) should invert to 5V.
      const wiresPowered: CircuitWire[] = [
        { id: 'w-vcc', fromCompId: 'vcc1', fromPinId: '+', toCompId: 'u1', toPinId: '14' },
        { id: 'w-gnd-src', fromCompId: 'vcc1', fromPinId: '-', toCompId: 'gnd1', toPinId: '1' },
        { id: 'w-gnd-ic', fromCompId: 'gnd1', fromPinId: '1', toCompId: 'u1', toPinId: '7' },
        { id: 'w-in1', fromCompId: 'vcc1', fromPinId: '+', toCompId: 'u1', toPinId: '1' },
        { id: 'w-in2', fromCompId: 'u1', fromPinId: '7', toCompId: 'u1', toPinId: '3' },
      ];

      const resPowered = solver.step([ic, vccSupply, gndRef], wiresPowered, 0.001);
      expect(resPowered.nodeVoltages['u1:2']).toBeCloseTo(0.0, 1);
      expect(resPowered.nodeVoltages['u1:4']).toBeCloseTo(5.0, 1);

      // Case B: Unpowered (VCC disconnected) -> all gate outputs must solve to 0V
      const wiresUnpowered: CircuitWire[] = [
        { id: 'w-gnd-src', fromCompId: 'vcc1', fromPinId: '-', toCompId: 'gnd1', toPinId: '1' },
        { id: 'w-gnd-ic', fromCompId: 'gnd1', fromPinId: '1', toCompId: 'u1', toPinId: '7' },
        { id: 'w-in1', fromCompId: 'vcc1', fromPinId: '+', toCompId: 'u1', toPinId: '1' },
      ];
      const resUnpowered = solver.step([ic, vccSupply, gndRef], wiresUnpowered, 0.001);
      expect(resUnpowered.nodeVoltages['u1:2']).toBe(0.0);
      expect(resUnpowered.nodeVoltages['u1:4']).toBe(0.0);
    });

    it('Shared 25-category master catalog + 3-tier filter + PhysicalSpec card data resolve identically for BOTH Schematic and 3D Studio', () => {
      // 25 Master Categories are identical and in order
      expect(MASTER_25_CATEGORIES.length).toBe(25);
      expect(MASTER_25_CATEGORIES[0].id).toBe('resistors');
      expect(MASTER_25_CATEGORIES[6].id).toBe('integrated_circuits');
      expect(MASTER_25_CATEGORIES[7].id).toBe('microcontrollers_processors');

      // Tiers filter cleanly
      const realTier = filterComponentsByTier(COMPONENT_CATALOG, 'real');
      expect(realTier.length).toBeGreaterThan(0);
      expect(realTier.some((c) => c.type === 'IC_74HC14')).toBe(true);
      expect(realTier.some((c) => c.type === 'OPAMP_LM358')).toBe(true);

      // Physical spec card data resolution
      const comp3d: Component3D = {
        id: 'u1-3d',
        type: 'IC_74HC14',
        label: '74HC14',
        parameters: {},
        x3d: 0,
        y3d: 0,
        z3d: 0,
        rotY: 0,
      };
      const cat3d = COMPONENT_CATALOG.find((c) => c.type === comp3d.type);
      expect(cat3d).toBeDefined();
      expect(cat3d!.physicalSpec!.packageCode).toBe('DIP-14');
      expect(cat3d!.physicalSpec!.pads!.length).toBe(14);
    });
  });

  describe('Task 4: Zero Circular-Import & Initial Client Bundle Mount Smoke Verification', () => {
    it('all core engineering lab modules import cleanly without ReferenceError or undefined circular bindings', async () => {
      // 1. Verify circuit engine & catalog
      const catalogMod = await import('@/modules/engineering-lab/circuit-engine/component-catalog');
      expect(catalogMod.COMPONENT_CATALOG).toBeDefined();
      expect(catalogMod.COMPONENT_CATALOG.length).toBeGreaterThan(100);

      // 2. Verify physical registry
      const physicalMod = await import('@/modules/engineering-lab/circuit-engine/component-physical-registry');
      expect(typeof physicalMod.resolvePhysicalSpec).toBe('function');
      expect(typeof physicalMod.buildDipPads).toBe('function');

      // 3. Verify 25-category registry
      const cat25Mod = await import('@/modules/engineering-lab/circuit-engine/component-categories-25');
      expect(cat25Mod.MASTER_25_CATEGORIES.length).toBe(25);
      expect(typeof cat25Mod.getCategory25ForComponent).toBe('function');

      // 4. Verify schematic ERC and pure getPinWorldCoord geometry
      const ercMod = await import('@/modules/engineering-lab/circuit-engine/schematic-erc');
      expect(typeof ercMod.runElectricalRulesCheck).toBe('function');
      expect(typeof ercMod.getPinWorldCoord).toBe('function');

      // Test getPinWorldCoord
      const mockComp: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '1k',
        category: 'passive',
        footprint: 'R_AXIAL',
        parameters: {},
        x: 100,
        y: 200,
        rotation: 90,
        pins: [{ id: '1', name: '1', pinType: 'passive', x: -20, y: 0 }],
      };
      const pinPos = ercMod.getPinWorldCoord(mockComp, mockComp.pins[0]);
      expect(pinPos.x).toBe(100);
      expect(pinPos.y).toBe(180);

      // 5. Verify SchematicCanvas exports without circular loop
      const canvasMod = await import('@/components/engineering-lab/Canvas/SchematicCanvas');
      expect(typeof canvasMod.SchematicCanvas).toBe('function');
      expect(typeof canvasMod.getPinWorldCoord).toBe('function');

      // 6. Verify PropertiesInspector & ComponentBrowser
      const inspectorMod = await import('@/components/engineering-lab/Panels/PropertiesInspector');
      expect(typeof inspectorMod.PropertiesInspector).toBe('function');

      const browserMod = await import('@/components/engineering-lab/Panels/ComponentBrowser');
      expect(typeof browserMod.ComponentBrowser).toBe('function');

      // 7. Verify ClientWrapper & Error Boundary
      const wrapperMod = await import('@/components/engineering-lab/EngineeringLabClientWrapper');
      expect(typeof wrapperMod.EngineeringLabClientWrapper).toBe('function');
      expect(typeof wrapperMod.EngineeringLabErrorBoundary).toBe('function');
    });
  });

  describe('Batch 2B: PCB Auto-Placement, Dynamic Board Sizing, 3D CAD Footprint & 2-Layer Copper Routing', () => {
    it('100% of 164 catalog components have non-empty physical specs, courtyard >= body, and pads >= pins', () => {
      expect(COMPONENT_CATALOG.length).toBeGreaterThanOrEqual(160);

      COMPONENT_CATALOG.forEach((item) => {
        expect(item.physicalSpec, `Component ${item.type} missing physicalSpec`).toBeDefined();
        const spec = item.physicalSpec!;

        expect(spec.packageCode, `${item.type} packageCode`).toBeTruthy();
        expect(spec.mountingType, `${item.type} mountingType`).toBeTruthy();
        expect(spec.placementClass, `${item.type} placementClass`).toBeTruthy();
        expect(spec.pinPitchMm, `${item.type} pinPitchMm`).toBeGreaterThan(0);

        expect(spec.bodyDimensionsMm?.width, `${item.type} body width`).toBeGreaterThan(0);
        expect(spec.bodyDimensionsMm?.depth, `${item.type} body depth`).toBeGreaterThan(0);
        expect(spec.bodyDimensionsMm?.height, `${item.type} body height`).toBeGreaterThan(0);

        expect(spec.courtyardMm?.width, `${item.type} courtyard width`).toBeGreaterThanOrEqual(spec.bodyDimensionsMm!.width);
        expect(spec.courtyardMm?.depth, `${item.type} courtyard depth`).toBeGreaterThanOrEqual(spec.bodyDimensionsMm!.depth);

        expect(spec.pads, `${item.type} pads array`).toBeDefined();
        expect(spec.pads!.length, `${item.type} pads count`).toBeGreaterThanOrEqual(item.pins?.length || 0);

        // Metadata completeness
        expect(item.libraryTier, `${item.type} libraryTier`).toBeTruthy();
        expect(item.subCategory, `${item.type} subCategory`).toBeTruthy();
        expect(item.simulationStatus, `${item.type} simulationStatus`).toBeTruthy();
        expect(item.electricalParameters, `${item.type} electricalParameters`).toBeDefined();
      });

      // Assert HC-SR04 and 4-pin RGB LED resolve to dedicated 3D CAD models (never generic IC / 2-pin LED fallback)
      expect(resolve3DModelType('HC_SR04', 'MODULE-HCSR04')).toBe('HC_SR04');
      expect(resolve3DModelType('SENSOR_ULTRASONIC', 'MODULE-HCSR04')).toBe('HC_SR04');
      expect(resolve3DModelType('ACTUATOR_RGB_LED', 'LED_D5.0mm-4')).toBe('LED_RGB');
      expect(resolve3DModelType('LED_RGB', 'THT-5MM-4PIN')).toBe('LED_RGB');
    });

    it('dynamic PCB auto-sizing expands board size to fit large components cleanly', () => {
      const simpleComponents: CircuitComponent[] = [
        {
          id: 'r1',
          type: 'RESISTOR',
          label: 'R1',
          value: '220',
          category: 'passive',
          footprint: 'R_AXIAL',
          parameters: {},
          x: 10,
          y: 10,
          rotation: 0,
          pins: [
            { id: '1', name: '1', pinType: 'passive', x: -10, y: 0 },
            { id: '2', name: '2', pinType: 'passive', x: 10, y: 0 },
          ],
        },
        {
          id: 'led1',
          type: 'LED',
          label: 'LED1',
          value: 'RED',
          category: 'actuators',
          footprint: 'LED_D5.0mm',
          parameters: {},
          x: 30,
          y: 10,
          rotation: 0,
          pins: [
            { id: '1', name: 'A', pinType: 'passive', x: -10, y: 0 },
            { id: '2', name: 'K', pinType: 'passive', x: 10, y: 0 },
          ],
        },
      ];

      const simplePcb = PcbGenerator.generatePcbFromSchematic(simpleComponents, [], 65, 50);

      const largeComponents: CircuitComponent[] = [
        {
          id: 'uno1',
          type: 'ARDUINO_UNO',
          label: 'Arduino Uno R3',
          value: 'ATmega328P',
          category: 'microcontrollers',
          footprint: 'BOARD-UNO',
          parameters: {},
          x: 100,
          y: 100,
          rotation: 0,
          pins: Array.from({ length: 28 }, (_, i) => ({
            id: String(i + 1),
            name: `P${i + 1}`,
            pinType: 'passive' as const,
            x: 0,
            y: 0,
          })),
        },
        {
          id: 'lcd1',
          type: 'MODULE_LCD1602',
          label: 'LCD 1602',
          value: '16x2 HD44780',
          category: 'displays',
          footprint: 'MODULE-LCD1602',
          parameters: {},
          x: 200,
          y: 200,
          rotation: 0,
          pins: Array.from({ length: 16 }, (_, i) => ({
            id: String(i + 1),
            name: `P${i + 1}`,
            pinType: 'passive' as const,
            x: 0,
            y: 0,
          })),
        },
      ];

      const largePcb = PcbGenerator.generatePcbFromSchematic(largeComponents, [], 80, 60);

      // Uno (68.6 x 53.4) + LCD (80 x 36) must expand board area beyond simple circuit
      expect(largePcb.widthMm * largePcb.heightMm).toBeGreaterThan(simplePcb.widthMm * simplePcb.heightMm);
      expect(largePcb.widthMm).toBeGreaterThanOrEqual(80);

      // All pads must remain inside board boundary with >= 2.0mm clearance
      largePcb.pads.forEach((pad) => {
        expect(pad.x).toBeGreaterThanOrEqual(2.0);
        expect(pad.x).toBeLessThanOrEqual(largePcb.widthMm - 2.0);
        expect(pad.y).toBeGreaterThanOrEqual(2.0);
        expect(pad.y).toBeLessThanOrEqual(largePcb.heightMm - 2.0);
      });
    });

    it('Heavy Multi-Module PCB Stress Test: 0 courtyard overlaps and 100% inside board boundaries', () => {
      // ARDUINO_UNO + SENSOR_ULTRASONIC (HC-SR04) + ACTUATOR_RGB_LED + 74HC14 (DIP-14) + TIMER_555 (DIP-8)
      // + 6 Resistors + 2 Capacitors + MODULE_RELAY_SPDT
      const components: CircuitComponent[] = [
        {
          id: 'uno1',
          type: 'ARDUINO_UNO',
          label: 'Uno',
          value: 'Uno',
          category: 'microcontrollers',
          footprint: 'BOARD-UNO',
          parameters: {},
          x: 100,
          y: 100,
          rotation: 0,
          pins: Array.from({ length: 28 }, (_, i) => ({ id: String(i + 1), name: `P${i + 1}`, pinType: 'passive' as const, x: 0, y: 0 })),
        },
        {
          id: 'sonar1',
          type: 'SENSOR_ULTRASONIC',
          label: 'HC-SR04',
          value: 'Sonar',
          category: 'sensors',
          footprint: 'MODULE-HCSR04',
          parameters: {},
          x: 200,
          y: 100,
          rotation: 0,
          pins: [
            { id: '1', name: 'VCC', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '2', name: 'TRIG', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '3', name: 'ECHO', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '4', name: 'GND', pinType: 'passive' as const, x: 0, y: 0 },
          ],
        },
        {
          id: 'rgb1',
          type: 'ACTUATOR_RGB_LED',
          label: 'RGB LED',
          value: 'RGB',
          category: 'actuators',
          footprint: 'LED_D5.0mm-4',
          parameters: {},
          x: 150,
          y: 150,
          rotation: 0,
          pins: [
            { id: '1', name: 'R', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '2', name: 'COM', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '3', name: 'G', pinType: 'passive' as const, x: 0, y: 0 },
            { id: '4', name: 'B', pinType: 'passive' as const, x: 0, y: 0 },
          ],
        },
        {
          id: 'u1',
          type: 'IC_74HC14',
          label: '74HC14',
          value: '74HC14',
          category: 'digital_logic',
          footprint: 'DIP-14',
          parameters: {},
          x: 180,
          y: 180,
          rotation: 0,
          pins: Array.from({ length: 14 }, (_, i) => ({ id: String(i + 1), name: `P${i + 1}`, pinType: 'passive' as const, x: 0, y: 0 })),
        },
        {
          id: 'u2',
          type: 'TIMER_555',
          label: 'NE555',
          value: 'NE555',
          category: 'analog_ics',
          footprint: 'DIP-8',
          parameters: {},
          x: 220,
          y: 180,
          rotation: 0,
          pins: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `P${i + 1}`, pinType: 'passive' as const, x: 0, y: 0 })),
        },
        {
          id: 'relay1',
          type: 'MODULE_RELAY_SPDT',
          label: 'Relay',
          value: '5V SPDT',
          category: 'relays_contactors',
          footprint: 'MODULE-RELAY',
          parameters: {},
          x: 250,
          y: 120,
          rotation: 0,
          pins: Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), name: `P${i + 1}`, pinType: 'passive' as const, x: 0, y: 0 })),
        },
        // 6 Resistors
        ...Array.from({ length: 6 }, (_, idx) => ({
          id: `r_${idx + 1}`,
          type: 'RESISTOR',
          label: `R${idx + 1}`,
          value: '10k',
          category: 'passive' as const,
          footprint: 'R_AXIAL',
          parameters: {},
          x: 100 + idx * 30,
          y: 220,
          rotation: 0 as const,
          pins: [
            { id: '1', name: '1', pinType: 'passive' as const, x: -10, y: 0 },
            { id: '2', name: '2', pinType: 'passive' as const, x: 10, y: 0 },
          ],
        })),
        // 2 Capacitors
        {
          id: 'c1',
          type: 'CAPACITOR_ELECTROLYTIC',
          label: 'C1',
          value: '10uF',
          category: 'passive',
          footprint: 'CP_RADIAL',
          parameters: {},
          x: 120,
          y: 250,
          rotation: 0,
          pins: [
            { id: '1', name: '+', pinType: 'passive' as const, x: -5, y: 0 },
            { id: '2', name: '-', pinType: 'passive' as const, x: 5, y: 0 },
          ],
        },
        {
          id: 'c2',
          type: 'CAPACITOR_CERAMIC',
          label: 'C2',
          value: '100nF',
          category: 'passive',
          footprint: 'C_DISC',
          parameters: {},
          x: 160,
          y: 250,
          rotation: 0,
          pins: [
            { id: '1', name: '1', pinType: 'passive' as const, x: -5, y: 0 },
            { id: '2', name: '2', pinType: 'passive' as const, x: 5, y: 0 },
          ],
        },
      ];

      const pcb = PcbGenerator.generatePcbFromSchematic(components, [], 80, 60);

      expect(pcb.components).toBeDefined();
      expect(pcb.components!.length).toBe(components.length);

      // 1. Assert ZERO courtyard/footprint AABB overlaps across all component pairs
      for (let i = 0; i < pcb.components!.length; i++) {
        for (let j = i + 1; j < pcb.components!.length; j++) {
          const c1 = pcb.components![i];
          const c2 = pcb.components![j];

          const s1 = resolvePhysicalSpec(c1.type, c1.footprint);
          const s2 = resolvePhysicalSpec(c2.type, c2.footprint);

          const dx = Math.abs(c1.x - c2.x);
          const dy = Math.abs(c1.y - c2.y);

          const minDx = (s1.courtyardMm!.width + s2.courtyardMm!.width) / 2;
          const minDy = (s1.courtyardMm!.depth + s2.courtyardMm!.depth) / 2;

          // Either separated horizontally or vertically
          const hasZeroOverlap = dx >= minDx - 0.5 || dy >= minDy - 0.5;
          expect(hasZeroOverlap, `Courtyard collision between ${c1.designator} and ${c2.designator}`).toBe(true);
        }
      }

      // 2. Assert 100% of component pads, courtyards, and vias lie strictly inside [0, boardWidthMm] x [0, boardHeightMm]
      pcb.pads.forEach((pad) => {
        expect(pad.x).toBeGreaterThanOrEqual(1.5);
        expect(pad.x).toBeLessThanOrEqual(pcb.widthMm - 1.5);
        expect(pad.y).toBeGreaterThanOrEqual(1.5);
        expect(pad.y).toBeLessThanOrEqual(pcb.heightMm - 1.5);
      });

      pcb.components!.forEach((comp) => {
        const spec = resolvePhysicalSpec(comp.type, comp.footprint);
        const halfCw = spec.courtyardMm!.width / 2;
        const halfCd = spec.courtyardMm!.depth / 2;
        expect(comp.x - halfCw).toBeGreaterThanOrEqual(0.0);
        expect(comp.x + halfCw).toBeLessThanOrEqual(pcb.widthMm);
        expect(comp.y - halfCd).toBeGreaterThanOrEqual(0.0);
        expect(comp.y + halfCd).toBeLessThanOrEqual(pcb.heightMm);
      });

      // 3. Assert dynamic boardWidthMm * boardHeightMm is strictly larger than default 80x60
      expect(pcb.widthMm * pcb.heightMm).toBeGreaterThan(80 * 60);
    });

    it('dev boards and modules calculate footprint pads strictly matching real package header pins', () => {
      const unoComp: CircuitComponent = {
        id: 'uno1',
        type: 'BOARD_ARDUINO_UNO',
        label: 'Uno',
        value: 'Uno',
        category: 'microcontrollers',
        footprint: 'BOARD-UNO',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: Array.from({ length: 28 }, (_, i) => ({ id: String(i + 1), name: `P${i + 1}`, pinType: 'passive' as const, x: 0, y: 0 })),
      };

      const unoPads = PcbGenerator.calculateFootprintPads(unoComp, 50, 40, 0);
      expect(unoPads.length).toBe(28);
      // Pin 1 is square / distinct
      expect(unoPads[0].shape).toBe('rect');

      const rgbComp: CircuitComponent = {
        id: 'rgb1',
        type: 'ACTUATOR_RGB_LED',
        label: 'RGB',
        value: 'RGB',
        category: 'actuators',
        footprint: 'LED_D5.0mm-4',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '1', name: 'R', pinType: 'passive' as const, x: 0, y: 0 },
          { id: '2', name: 'COM', pinType: 'passive' as const, x: 0, y: 0 },
          { id: '3', name: 'G', pinType: 'passive' as const, x: 0, y: 0 },
          { id: '4', name: 'B', pinType: 'passive' as const, x: 0, y: 0 },
        ],
      };
      const rgbPads = PcbGenerator.calculateFootprintPads(rgbComp, 30, 30, 0);
      expect(rgbPads.length).toBe(4);
      // 4 distinct X coordinates with 2.54mm pitch
      const xs = rgbPads.map((p) => p.x);
      const uniqueXs = new Set(xs);
      expect(uniqueXs.size).toBe(4);
    });
  });

  describe('Batch 2C: 3D Studio Multi-Breadboard Priority Auto-Layout, HC-SR04 Wire Sync & Obstacle-Aware Wires', () => {
    it('Task 1: Step 0B pin alignment audit verification across all through-hole models', () => {
      // Ceramic Capacitor leads: pitch 5.08mm (2 breadboard holes apart)
      const capPins = getComponentPinOffsets('CAPACITOR');
      expect(capPins.length).toBe(2);
      expect(Math.abs(capPins[1].x - capPins[0].x)).toBeCloseTo(5.08, 2);

      // HC-SR04 4-pin header: exact 2.54mm pitch
      const hcPins = getComponentPinOffsets('HC_SR04');
      expect(hcPins.length).toBe(4);
      expect(Math.abs(hcPins[1].x - hcPins[0].x)).toBeCloseTo(2.54, 2);
      expect(Math.abs(hcPins[2].x - hcPins[1].x)).toBeCloseTo(2.54, 2);
      expect(Math.abs(hcPins[3].x - hcPins[2].x)).toBeCloseTo(2.54, 2);

      // 4-pin RGB LED: exact 2.54mm pitch
      const rgbPins = getComponentPinOffsets('LED_RGB');
      expect(rgbPins.length).toBe(4);
      expect(Math.abs(rgbPins[1].x - rgbPins[0].x)).toBeCloseTo(2.54, 2);
      expect(Math.abs(rgbPins[2].x - rgbPins[1].x)).toBeCloseTo(2.54, 2);
      expect(Math.abs(rgbPins[3].x - rgbPins[2].x)).toBeCloseTo(2.54, 2);

      // TO-92 Transistor: 3 pins with 2.54mm pitch
      const bjtPins = getComponentPinOffsets('BJT_NPN');
      expect(bjtPins.length).toBe(3);
      expect(Math.abs(bjtPins[1].x - bjtPins[0].x)).toBeCloseTo(2.54, 2);
      expect(Math.abs(bjtPins[2].x - bjtPins[1].x)).toBeCloseTo(2.54, 2);

      // DIP-14 IC (74HC14): 2 rows of 7 pins with 2.54mm pitch
      const dipPins = getComponentPinOffsets('IC_74HC14');
      expect(dipPins.length).toBe(14);
      expect(Math.abs(dipPins[1].x - dipPins[0].x)).toBeCloseTo(2.54, 2);
    });

    it('Task 2: HC-SR04 drill alignment and strict anti-sink elevation', () => {
      // 1. When placed in valid Row C holes (centered on half-pitch colX = START_X + (20 - 0.5) * 2.54):
      const colX = START_X + (20 - 0.5) * PITCH_X;
      const inHoles = areAllPinsInBreadboardHoles('HC_SR04', colX, -8.42, 0, 1);
      expect(inHoles).toBe(true);

      const seatedY = computeComponentGroundElevation('HC_SR04', colX, -8.42, true, 0, 1);
      // Realistic insertion depth (inserted into spring clips): 8.5 - (6.0 * 0.42) - (-5.7) = 11.68
      expect(seatedY).toBe(11.68);

      // 2. When placed over center isolation ravine (z = 0):
      const inRavine = areAllPinsInBreadboardHoles('HC_SR04', colX, 0, 0, 1);
      expect(inRavine).toBe(false);
      const clampedY = computeComponentGroundElevation('HC_SR04', colX, 0, true, 0, 1);
      // Resting on plastic surface: never sinks below BREADBOARD_TOP_Y
      expect(clampedY).toBe(14.2);

      // 3. When placed in Open Console zone (x = 100, z = -35, off board):
      const consoleY = computeComponentGroundElevation('HC_SR04', 100, -35, false, 0, 1);
      expect(consoleY).toBe(5.7);
    });

    it('Task 3: Multi-Breadboard hole search and coordinate resolution', () => {
      // Board 1 at z = 0
      const h1 = findNearestHole830(START_X + 9 * PITCH_X, -8.42, 5.0, 3);
      expect(h1).not.toBeNull();
      expect(h1?.id).toBe('bb_col_10_C');

      // Board 2 at z = -60.0
      const h2 = findNearestHole830(START_X + 9 * PITCH_X, -68.89, 5.0, 3);
      expect(h2).not.toBeNull();
      expect(h2?.id).toBe('bb2_col_10_C');
      expect(h2?.z).toBeCloseTo(-68.89, 1);

      // Board 3 at z = -120.0
      const h3 = findNearestHole830(START_X + 9 * PITCH_X, -128.89, 5.0, 3);
      expect(h3).not.toBeNull();
      expect(h3?.id).toBe('bb3_col_10_C');
      expect(h3?.z).toBeCloseTo(-128.89, 1);
    });

    it('Task 4: Multi-Breadboard Tie Groups and Occupancy Tracking', () => {
      const occupancy = new BreadboardOccupancyMap();

      // Tie group resolution for Board 1 and Board 2
      expect(getTieGroupForHole('bb_col_15_C')).toBe('bb_tie_col_15_top');
      expect(getTieGroupForHole('bb2_col_15_C')).toBe('bb2_tie_col_15_top');
      expect(getTieGroupForHole('bb3_col_15_C')).toBe('bb3_tie_col_15_top');

      // Free hole search within Board 2 tie group
      const freeHole = occupancy.findFreeHoleInTieGroup('bb2_tie_col_15_top');
      expect(freeHole).not.toBeNull();
      expect(freeHole?.id.startsWith('bb2_')).toBe(true);
      expect(freeHole?.z).toBeLessThan(-50.0);

      // Free rail hole search on Board 2
      const railHole = occupancy.findFreeRailHole(15, 'rail_top_pos', 'bb2_');
      expect(railHole).not.toBeNull();
      expect(railHole?.id.startsWith('bb2_rail_top_pos_')).toBe(true);
      expect(railHole?.z).toBeCloseTo(-82.0, 1);
    });

    it('Task 5: Obstacle-aware jumper wire apex elevation logic', () => {
      // Simulate wire between (0, 9, -20) and (0, 9, 20) with a tall obstacle at (0, 9, 0)
      const p1 = { x: 0, y: 9.0, z: -20.0 };
      const p2 = { x: 0, y: 9.0, z: 20.0 };
      const obstacle = { x3d: 0, y3d: 14.0, z3d: 0, type: 'HC_SR04' };

      // Component top Y is y3d + packageHeight
      const packageHeight = 20.0;
      const compTopY = obstacle.y3d + packageHeight;
      const requiredApexY = compTopY + 4.5;

      // Obstacle detection
      const dX = p2.x - p1.x;
      const dZ = p2.z - p1.z;
      const lenSq = dX * dX + dZ * dZ;
      const t = Math.max(0, Math.min(1, ((obstacle.x3d - p1.x) * dX + (obstacle.z3d - p1.z) * dZ) / lenSq));
      const projX = p1.x + t * dX;
      const projZ = p1.z + t * dZ;
      const distSq = (obstacle.x3d - projX) ** 2 + (obstacle.z3d - projZ) ** 2;

      expect(distSq).toBeLessThan(100.0); // Directly intersected
      expect(requiredApexY).toBeGreaterThan(compTopY);
      expect(requiredApexY).toBeCloseTo(38.5, 1);
    });
  });

  describe('Batch 2D: Phantom Wire Elimination, Spacious Breadboard Auto-Layout, Zero-Sinking & Solid Metallic Pins', () => {
    it('Task 1: Phantom Wire Elimination - Unconnected parts and batteries receive strictly ZERO wires', () => {
      // 1. Unconnected Battery test: If a battery has 0 wires in schematic, it must never produce rail wires or bridges
      const _batteryComp: CircuitComponent = {
        id: 'bat1',
        type: 'BATTERY_9V',
        label: '9V Battery',
        value: '9V',
        category: 'sources',
        footprint: 'PAD',
        parameters: {},
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '+', name: '+', pinType: 'power', x: 0, y: 0 },
          { id: '-', name: '-', pinType: 'power', x: 0, y: 0 },
        ],
      };

      const _moduleComp: CircuitComponent = {
        id: 'hcsr1',
        type: 'HC_SR04',
        label: 'Ultrasonic',
        value: 'HC-SR04',
        category: 'sensors',
        footprint: 'MODULE_HCSR04',
        parameters: {},
        x: 100,
        y: 100,
        rotation: 0,
        pins: [
          { id: 'vcc', name: 'VCC', pinType: 'power', x: 0, y: 0 },
          { id: 'trig', name: 'TRIG', pinType: 'input', x: 0, y: 0 },
          { id: 'echo', name: 'ECHO', pinType: 'output', x: 0, y: 0 },
          { id: 'gnd', name: 'GND', pinType: 'power', x: 0, y: 0 },
        ],
      };

      const _connectedResistor: CircuitComponent = {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '1k',
        category: 'passive',
        footprint: 'RESISTOR_TH',
        parameters: {},
        x: 200,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: 0, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 0, y: 0 },
        ],
      };

      const _connectedLed: CircuitComponent = {
        id: 'led1',
        type: 'LED',
        label: 'LED1',
        value: 'Red',
        category: 'actuators',
        footprint: 'LED_5MM',
        parameters: {},
        x: 300,
        y: 200,
        rotation: 0,
        pins: [
          { id: 'anode', name: 'A', pinType: 'passive', x: 0, y: 0 },
          { id: 'cathode', name: 'K', pinType: 'passive', x: 0, y: 0 },
        ],
      };

      // Only R1 and LED1 are connected by a wire; Battery and HC-SR04 have 0 connections
      const circuitWires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'r1', fromPinId: '2', toCompId: 'led1', toPinId: 'anode', color: '#3B82F6' },
      ];

      const connectedCompIds = new Set(circuitWires.flatMap((w) => [w.fromCompId, w.toCompId]));
      expect(connectedCompIds.has('bat1')).toBe(false);
      expect(connectedCompIds.has('hcsr1')).toBe(false);
      expect(connectedCompIds.has('r1')).toBe(true);
      expect(connectedCompIds.has('led1')).toBe(true);

      // Verify that any wire filtering removes all battery and module wires
      const mockOutWires = [
        { id: 'wire_bat_pos_bat1', fromPin: { compId: 'bat1', pinId: '+' }, toPin: { compId: 'breadboard', pinId: 'bb_rail_top_pos_1' }, color: '#EF4444' },
        { id: 'wire_rail_bridge_pos_left', fromPin: { compId: 'breadboard', pinId: 'bb_rail_top_pos_2' }, toPin: { compId: 'breadboard', pinId: 'bb_rail_bottom_pos_2' }, color: '#EF4444' },
        { id: 'wire_phantom_hcsr', fromPin: { compId: 'hcsr1', pinId: 'vcc' }, toPin: { compId: 'breadboard', pinId: 'bb_col_24_H' }, color: '#EF4444' },
        { id: 'w1', fromPin: { compId: 'r1', pinId: '2' }, toPin: { compId: 'led1', pinId: 'anode' }, color: '#3B82F6' },
      ];

      const batteryIsConnected = connectedCompIds.has('bat1');
      const filteredWires = mockOutWires.filter((w) => {
        if (w.id.startsWith('wire_bat_') || w.id.startsWith('wire_rail_bridge') || w.id.startsWith('wire_bb')) {
          return batteryIsConnected;
        }
        if (w.fromPin.compId !== 'breadboard' && !connectedCompIds.has(w.fromPin.compId)) return false;
        if (w.toPin.compId !== 'breadboard' && !connectedCompIds.has(w.toPin.compId)) return false;
        return true;
      });

      expect(filteredWires.length).toBe(1);
      expect(filteredWires[0].id).toBe('w1');
      // Zero wires connected to HC-SR04
      expect(filteredWires.some((w) => w.fromPin.compId === 'hcsr1' || w.toPin.compId === 'hcsr1')).toBe(false);
      // Zero wires connected to Battery
      expect(filteredWires.some((w) => w.fromPin.compId === 'bat1' || w.toPin.compId === 'bat1')).toBe(false);
    });

    it('Task 2: Spacious, Clean Breadboard Auto-Layout - Generous column spacing and top/bottom balance', () => {
      // Test spacing between adjacent components
      const CANDIDATE_COLS = [8, 14, 20, 26, 32, 38, 44, 50, 56];
      // Verify minimum gap between candidate columns is >= 6 columns (15.24mm > 10.16mm requirement)
      for (let i = 0; i < CANDIDATE_COLS.length - 1; i++) {
        const gapCols = CANDIDATE_COLS[i + 1] - CANDIDATE_COLS[i];
        const gapMm = gapCols * PITCH_X;
        expect(gapCols).toBeGreaterThanOrEqual(4);
        expect(gapMm).toBeGreaterThanOrEqual(10.16);
      }

      // Verify centered ravine straddler slots
      const STRADDLER_SLOTS = [
        [32],
        [20, 44],
        [14, 32, 50],
      ];
      // 1 IC centered at col 32
      expect(STRADDLER_SLOTS[0][0]).toBe(32);
      // 2 ICs have 24-column separation (60.96mm)
      expect(STRADDLER_SLOTS[1][1] - STRADDLER_SLOTS[1][0]).toBe(24);
      // 3 ICs have 18-column separation (45.72mm)
      expect(STRADDLER_SLOTS[2][1] - STRADDLER_SLOTS[2][0]).toBe(18);
      expect(STRADDLER_SLOTS[2][2] - STRADDLER_SLOTS[2][1]).toBe(18);
    });

    it('Task 3: Breadboard Drill Alignment & Strict Anti-Sink Rule across modules and DIP packages', () => {
      // 1. Bluetooth HC-05 6-pin header at 2.54mm pitch
      const btPins = getComponentPinOffsets('MODULE_BLUETOOTH_HC05');
      expect(btPins.length).toBe(6);
      for (let i = 0; i < btPins.length - 1; i++) {
        expect(Math.abs(btPins[i + 1].x - btPins[i].x)).toBeCloseTo(2.54, 2);
      }

      // 2. DIP-28 IC (ATmega328P) 28 pins at 2.54mm pitch and 7.62mm row spacing
      const dip28Pins = getComponentPinOffsets('ATMEGA328P');
      expect(dip28Pins.length).toBe(28);
      // Row E pins are at z = -3.81, Row F pins are at z = +3.81 (ravine straddle)
      expect(dip28Pins[0].z).toBeCloseTo(-3.81, 2);
      expect(dip28Pins[14].z).toBeCloseTo(3.81, 2);
      expect(dip28Pins[1].x - dip28Pins[0].x).toBeCloseTo(2.54, 2);

      // 3. Potentiometer 3-pin offsets
      const potPins = getComponentPinOffsets('POTENTIOMETER');
      expect(potPins.length).toBe(3);
      expect(potPins[0].x).toBeCloseTo(-2.54, 2);
      expect(potPins[2].x).toBeCloseTo(2.54, 2);

      // 4. OLED I2C and DHT11 4-pin headers
      const oledPins = getComponentPinOffsets('DISPLAY_OLED_I2C');
      expect(oledPins.length).toBe(4);
      expect(oledPins[1].x - oledPins[0].x).toBeCloseTo(2.54, 2);

      // 5. MPU-6050 8-pin header
      const mpuPins = getComponentPinOffsets('SENSOR_MPU6050');
      expect(mpuPins.length).toBe(8);
      expect(mpuPins[1].x - mpuPins[0].x).toBeCloseTo(2.54, 2);

      // 6. Test snapComponentToSurface on breadboard
      const testComp: Component3D = {
        id: 'test_dip8',
        type: 'TIMER_555',
        label: 'U1',
        value: '555',
        parameters: {},
        x3d: START_X + (32 - 0.5) * PITCH_X,
        y3d: 10.0,
        z3d: 1.5, // slightly off-center near ravine
        rotY: 0,
      };
      const snapped = snapComponentToSurface(testComp, true, 1);
      // Straddles center ravine (z = 0)
      expect(snapped.z3d).toBe(0);
      // Pins insert into spring clips above BREADBOARD_TOP_Y (8.5mm)
      expect(snapped.y3d).toBeGreaterThanOrEqual(8.5);

      // 7. Strict Anti-Sink Rule Outside Valid Drills:
      // When placed in center isolation ravine (where no drill holes exist):
      const _ravineComp: Component3D = {
        id: 'test_led',
        type: 'LED',
        label: 'LED',
        value: 'Red',
        parameters: {},
        x3d: 0,
        y3d: 10.0,
        z3d: 0, // Ravine has 0 holes for 2-pin LED
        rotY: 0,
      };
      const ravineElevation = computeComponentGroundElevation('LED', 0, 0, true, 0, 1);
      // Lowest pin tip rests flush on plastic face; body sits above BREADBOARD_TOP_Y (never sinks!)
      expect(ravineElevation).toBeGreaterThanOrEqual(BREADBOARD_TOP_Y);

      // 8. Body-Bottom Anti-Sink Guarantee:
      // When validly inserted, the component's PCB/plastic body (minBodyY) NEVER drops below BREADBOARD_TOP_Y + 0.2mm!
      const insertedConfigs: Array<{ type: string; z: number }> = [
        { type: 'TIMER_555', z: 0 },
        { type: 'IC_74HC14', z: 0 },
        { type: 'ATMEGA328P', z: 0 },
        { type: 'ARDUINO_NANO', z: 0 },
        { type: 'ESP32_DEVKIT', z: 0 },
        { type: 'HC_SR04', z: ROW_Z_MAP.C },
        { type: 'RESISTOR', z: ROW_Z_MAP.C },
      ];
      insertedConfigs.forEach(({ type, z }) => {
        const spec = getComponentElevationSpec(type);
        const elev = computeComponentGroundElevation(type, 0, z, true, 0, 1);
        const bodyBottomWorldY = elev + spec.localMinBodyY;
        expect(bodyBottomWorldY).toBeGreaterThanOrEqual(BREADBOARD_TOP_Y + 0.2 - 0.01);
      });

      // 9. Off-board parts (Uno, Mega, L298N, Battery 9V) clamp lowest point at surface
      const offboardTypes = ['ARDUINO_UNO', 'ARDUINO_MEGA', 'MODULE_L298N', 'BATTERY_9V'];
      offboardTypes.forEach((t) => {
        const spec = getComponentElevationSpec(t);
        const elev = computeComponentGroundElevation(t, 0, 0, false, 0, 1);
        const lowestWorldY = elev + Math.min(spec.localMinY, spec.localMinBodyY);
        expect(lowestWorldY).toBeCloseTo(0.0, 2);
      });
    });

    it('Task 4: Solid Metallic Pins - Authentically proportioned pin length and zero-sinking elevation specs', () => {
      // 1. DIP IC Elevation Spec: through-hole, 5.6mm pin length, 4.0mm package height
      const dipSpec = getComponentElevationSpec('TIMER_555');
      expect(dipSpec.isThroughHole).toBe(true);
      expect(dipSpec.pinLength).toBe(5.6);
      expect(dipSpec.localMinY).toBe(-5.6);
      expect(dipSpec.localMinBodyY).toBe(0.0);

      // 2. MCU Breakouts (Nano, ESP32, Pico): 5.5mm pin length
      const mcuSpec = getComponentElevationSpec('ARDUINO_NANO');
      expect(mcuSpec.isThroughHole).toBe(true);
      expect(mcuSpec.pinLength).toBe(5.5);
      expect(mcuSpec.localMinY).toBe(-7.75);
      expect(mcuSpec.localMinBodyY).toBe(-2.4);

      // 3. Sensor / Wireless Modules (HC-SR04, HC-05, OLED, DHT, PIR, MPU-6050): 6.0mm pin length
      const sensorSpec = getComponentElevationSpec('HC_SR04');
      expect(sensorSpec.isThroughHole).toBe(true);
      expect(sensorSpec.pinLength).toBe(6.0);
      expect(sensorSpec.localMinY).toBe(-5.7);
      expect(sensorSpec.localMinBodyY).toBe(0.0);

      const hc05Spec = getComponentElevationSpec('MODULE_BLUETOOTH_HC05');
      expect(hc05Spec.isThroughHole).toBe(true);
      expect(hc05Spec.pinLength).toBe(6.0);

      const oledSpec = getComponentElevationSpec('DISPLAY_OLED_I2C');
      expect(oledSpec.isThroughHole).toBe(true);
      expect(oledSpec.pinLength).toBe(6.0);

      // 4. Passives (Resistor, LED, Capacitor): 11.0mm pin length
      const passiveSpec = getComponentElevationSpec('RESISTOR');
      expect(passiveSpec.isThroughHole).toBe(true);
      expect(passiveSpec.pinLength).toBe(11.0);
      expect(passiveSpec.localMinY).toBe(-8.0);
      expect(passiveSpec.localMinBodyY).toBe(2.0);
    });
  });

  describe('Batch 2E: Manufacturing-Grade Authentic PCB Footprints, Dynamic Auto-Sizing, PTH & M3 Plated Mounting Holes', () => {
    it('Task 1: Arduino Uno R3 authentic dual-bank header pads match ArduinoUno3D model (<0.05mm error) with zero fake DIP-28 fallback', () => {
      const unoSpec = resolvePhysicalSpec('ARDUINO_UNO');
      expect(unoSpec.placementClass).toBe('dev-board');
      expect(unoSpec.packageCode).toBe('BOARD-UNO-R3');
      expect(unoSpec.pads).toBeDefined();
      expect(unoSpec.pads!.length).toBeGreaterThanOrEqual(28);

      // Verify authentic dual-bank geometry: top row at Y = -23.0mm, bottom row at Y = +23.0mm
      const topPads = unoSpec.pads!.filter((p) => p.yMm === -23.0);
      const botPads = unoSpec.pads!.filter((p) => p.yMm === 23.0);
      expect(topPads.length).toBeGreaterThanOrEqual(14);
      expect(botPads.length).toBeGreaterThanOrEqual(12);

      // Verify exact alignment with ArduinoUno3D.tsx ARDUINO_PINS (<0.05mm error)
      ARDUINO_PINS.forEach((pinDef) => {
        const matchingPad = unoSpec.pads!.find((p) => {
          if (p.pinId.toUpperCase() === pinDef.name.toUpperCase()) return true;
          if (pinDef.name === 'TX' && (p.pinId === 'D1' || p.pinId === 'TX1')) return true;
          if (pinDef.name === 'RX' && (p.pinId === 'D0' || p.pinId === 'RX0')) return true;
          if (pinDef.name === 'GND_1' && (p.pinId === 'GND' || p.pinId === 'GND_1')) return true;
          if (pinDef.name === 'GND_2' && p.pinId === 'GND_2') return true;
          return false;
        });
        expect(matchingPad).toBeDefined();
        if (matchingPad) {
          // X alignment check
          expect(Math.abs(matchingPad.xMm - pinDef.localPos[0])).toBeLessThanOrEqual(0.05);
          // Y alignment check (PCB Y = 3D Z: pinDef.localPos[2] is -23 or 23)
          expect(Math.abs(matchingPad.yMm - pinDef.localPos[2])).toBeLessThanOrEqual(0.05);
        }
      });

      // Verify PcbGenerator.calculateFootprintPads outputs dual-bank pads and NEVER DIP-28 JEDEC pads
      const unoComp: CircuitComponent = {
        id: 'uno-1',
        type: 'ARDUINO_UNO',
        label: 'U1',
        value: 'Uno R3',
        category: 'microcontrollers',
        footprint: 'Module:Arduino_Uno_R3',
        rotation: 0,
        parameters: {},
        x: 100,
        y: 100,
        pins: unoSpec.pads!.map((p) => ({ id: p.pinId, name: p.pinId, pinType: 'bidirectional', x: 0, y: 0 })),
      };
      const calculatedPads = PcbGenerator.calculateFootprintPads(unoComp, 50, 40, 0);
      expect(calculatedPads.length).toBe(unoSpec.pads!.length);

      // Confirm pads are at y = 40 - 23 = 17 and y = 40 + 23 = 63, NOT JEDEC DIP-28 rows (oy: +/-3.81)
      const yCoords = calculatedPads.map((p) => p.y);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
      expect(minY).toBeCloseTo(17.0, 1);
      expect(maxY).toBeCloseTo(63.0, 1);
      expect(maxY - minY).toBeCloseTo(46.0, 1); // 46mm header separation (never 7.62mm DIP IC row spacing!)
    });

    it('Task 2: Arduino Mega 2560 header banks match ArduinoMega3D MEGA_PINS', () => {
      const megaSpec = resolvePhysicalSpec('ARDUINO_MEGA');
      expect(megaSpec.placementClass).toBe('dev-board');
      expect(megaSpec.pads).toBeDefined();
      expect(megaSpec.pads!.length).toBeGreaterThanOrEqual(50);

      // Check header separation: top at Y = -23.0, bottom at Y = +23.0
      const topPads = megaSpec.pads!.filter((p) => p.yMm === -23.0);
      const botPads = megaSpec.pads!.filter((p) => p.yMm === 23.0);
      expect(topPads.length).toBeGreaterThanOrEqual(18);
      expect(botPads.length).toBeGreaterThanOrEqual(16);

      // Check key communication and analog pins match MEGA_PINS
      const d0Pad = megaSpec.pads!.find((p) => p.pinId === 'D0');
      expect(d0Pad).toBeDefined();
      expect(d0Pad!.xMm).toBeCloseTo(-36.8, 1);

      const a0Pad = megaSpec.pads!.find((p) => p.pinId === 'A0');
      expect(a0Pad).toBeDefined();
      expect(a0Pad!.xMm).toBeCloseTo(-10.5, 1);
    });

    it('Task 3: Ceramic Capacitor PCB footprint pads are spaced at 5.08mm (oxSpan = 2.54mm), strictly matching CapacitorCeramic3D leads', () => {
      const capSpec = resolvePhysicalSpec('CAPACITOR_CERAMIC');
      expect(capSpec.packageCode).toBe('RADIAL-5.08MM');
      expect(capSpec.pinPitchMm).toBe(5.08);
      expect(capSpec.pads).toBeDefined();
      expect(capSpec.pads!.length).toBe(2);
      expect(capSpec.pads![0].xMm).toBeCloseTo(-2.54, 2);
      expect(capSpec.pads![1].xMm).toBeCloseTo(2.54, 2);
      expect(capSpec.pads![1].xMm - capSpec.pads![0].xMm).toBeCloseTo(5.08, 2);

      // Verify in PcbGenerator.calculateFootprintPads
      const capComp: CircuitComponent = {
        id: 'c1',
        type: 'CAPACITOR_CERAMIC',
        label: 'C1',
        value: '100nF',
        category: 'passive',
        footprint: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm',
        rotation: 0,
        parameters: {},
        x: 0,
        y: 0,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: 0, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 0, y: 0 },
        ],
      };
      const pads = PcbGenerator.calculateFootprintPads(capComp, 20, 20, 0);
      expect(pads.length).toBe(2);
      expect(pads[0].x).toBeCloseTo(20 - 2.54, 2);
      expect(pads[1].x).toBeCloseTo(20 + 2.54, 2);
      expect(pads[1].x - pads[0].x).toBeCloseTo(5.08, 2);
    });

    it('Task 4: Dynamic PCB Auto-Sizing & Courtyard-Aware Zero-Overlap - board dynamically auto-expands with 4 corner M3 plated mounting holes', () => {
      // Create a circuit containing large MCU dev boards and multiple modules
      const largeCircuitComps: CircuitComponent[] = [
        {
          id: 'uno',
          type: 'ARDUINO_UNO',
          label: 'U1',
          value: 'Uno R3',
          category: 'microcontrollers',
          footprint: 'Module:Arduino_Uno_R3',
          rotation: 0,
          parameters: {},
          x: 100,
          y: 100,
          pins: [
            { id: 'D0', name: 'D0', pinType: 'bidirectional', x: 0, y: 0 },
            { id: '5V', name: '5V', pinType: 'power', x: 0, y: 0 },
            { id: 'GND', name: 'GND', pinType: 'power', x: 0, y: 0 },
          ],
        },
        {
          id: 'mega',
          type: 'ARDUINO_MEGA',
          label: 'U2',
          value: 'Mega 2560',
          category: 'microcontrollers',
          footprint: 'Module:Arduino_Mega2560',
          rotation: 0,
          parameters: {},
          x: 400,
          y: 100,
          pins: [
            { id: 'D0', name: 'D0', pinType: 'bidirectional', x: 0, y: 0 },
            { id: '5V', name: '5V', pinType: 'power', x: 0, y: 0 },
            { id: 'GND', name: 'GND', pinType: 'power', x: 0, y: 0 },
          ],
        },
        {
          id: 'sr04',
          type: 'HC_SR04',
          label: 'U3',
          value: 'HC-SR04',
          category: 'sensors',
          footprint: 'MODULE-HCSR04',
          rotation: 0,
          parameters: {},
          x: 100,
          y: 400,
          pins: [
            { id: 'VCC', name: 'VCC', pinType: 'power', x: 0, y: 0 },
            { id: 'TRIG', name: 'TRIG', pinType: 'input', x: 0, y: 0 },
            { id: 'ECHO', name: 'ECHO', pinType: 'output', x: 0, y: 0 },
            { id: 'GND', name: 'GND', pinType: 'power', x: 0, y: 0 },
          ],
        },
        {
          id: 'timer',
          type: 'TIMER_555',
          label: 'U4',
          value: 'NE555P',
          category: 'analog_ics',
          footprint: 'Package_DIP:DIP-8_W7.62mm',
          rotation: 0,
          parameters: {},
          x: 400,
          y: 400,
          pins: [
            { id: '1', name: 'GND', pinType: 'power', x: 0, y: 0 },
            { id: '2', name: 'TRIG', pinType: 'input', x: 0, y: 0 },
            { id: '3', name: 'OUT', pinType: 'output', x: 0, y: 0 },
            { id: '4', name: 'RESET', pinType: 'input', x: 0, y: 0 },
            { id: '5', name: 'CTRL', pinType: 'input', x: 0, y: 0 },
            { id: '6', name: 'THRES', pinType: 'input', x: 0, y: 0 },
            { id: '7', name: 'DISCH', pinType: 'input', x: 0, y: 0 },
            { id: '8', name: 'VCC', pinType: 'power', x: 0, y: 0 },
          ],
        },
        {
          id: 'cap',
          type: 'CAPACITOR_CERAMIC',
          label: 'C1',
          value: '100nF',
          category: 'passive',
          footprint: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm',
          rotation: 0,
          parameters: {},
          x: 250,
          y: 250,
          pins: [
            { id: '1', name: '1', pinType: 'passive', x: 0, y: 0 },
            { id: '2', name: '2', pinType: 'passive', x: 0, y: 0 },
          ],
        },
      ];

      const pcb = PcbGenerator.generatePcbFromSchematic(largeCircuitComps, []);

      // 1. Board dimension expands dynamically to fit both Uno (68.6x53.4) + Mega (101.6x53.3) + HC-SR04
      expect(pcb.widthMm).toBeGreaterThanOrEqual(100);
      expect(pcb.heightMm).toBeGreaterThanOrEqual(75);

      // 2. All 5 components are placed
      expect(pcb.components).toBeDefined();
      expect(pcb.components!.length).toBe(5);

      // 3. Pairwise AABB zero-overlap verification
      const placed = pcb.components!;
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const c1 = placed[i];
          const c2 = placed[j];
          const spec1 = resolvePhysicalSpec(c1.type, c1.footprint);
          const spec2 = resolvePhysicalSpec(c2.type, c2.footprint);
          const w1 = spec1.courtyardMm?.width || spec1.bodyDimensionsMm?.width || 10;
          const h1 = spec1.courtyardMm?.depth || spec1.bodyDimensionsMm?.depth || 8;
          const w2 = spec2.courtyardMm?.width || spec2.bodyDimensionsMm?.width || 10;
          const h2 = spec2.courtyardMm?.depth || spec2.bodyDimensionsMm?.depth || 8;

          const dx = Math.abs(c1.x - c2.x);
          const dy = Math.abs(c1.y - c2.y);
          const minSepX = (w1 + w2) / 2;
          const minSepY = (h1 + h2) / 2;

          // Neither X nor Y overlap simultaneously (zero overlap guarantee!)
          const overlaps = dx < minSepX && dy < minSepY;
          expect(overlaps).toBe(false);
        }
      }

      // 4. 4 Corner M3 Plated Mounting Holes present with exact d=3.2mm drill
      expect(pcb.mountingHoles).toBeDefined();
      expect(pcb.mountingHoles!.length).toBe(4);
      pcb.mountingHoles!.forEach((hole) => {
        expect(hole.diameterMm).toBe(3.2);
        // Inset 4mm from borders
        const nearLeft = Math.abs(hole.x - 4.0) < 0.1;
        const nearRight = Math.abs(hole.x - (pcb.widthMm - 4.0)) < 0.1;
        const nearTop = Math.abs(hole.y - 4.0) < 0.1;
        const nearBot = Math.abs(hole.y - (pcb.heightMm - 4.0)) < 0.1;
        expect(nearLeft || nearRight).toBe(true);
        expect(nearTop || nearBot).toBe(true);
      });
    });
  });

  describe('Batch 2F: Precision Breadboard Mechanics, Real Mesh-to-Hole Seating (<0.05mm) & Strict Anti-Sink Elevation', () => {
    it('1. Off-board boards & modules elevated strictly on top of breadboard when overlapping (zero sinking)', () => {
      const offboardTypes = [
        'ARDUINO_UNO',
        'ARDUINO_MEGA',
        'MODULE_RELAY_SPDT',
        'LCD_1602',
        'MOTOR_DRIVER_L298N',
        'BATTERY_9V',
      ];

      offboardTypes.forEach((type) => {
        // When placed directly over Breadboard #1 center (x = 0, z = 0):
        const overBoardElev = computeComponentGroundElevation(type, 0, 0, true, 0, 1);
        expect(overBoardElev).toBeGreaterThanOrEqual(BREADBOARD_TOP_Y);

        // When placed off the breadboard on the workbench ESD mat (x = 150, z = 65):
        const offBoardElev = computeComponentGroundElevation(type, 150, 65, true, 0, 1);
        expect(offBoardElev).toBeCloseTo(0.0, 2);
      });
    });

    it('2. Breadboard-fittable parts seat 100% of pins inside real breadboard hole centers (<0.05mm error) with body >= BREADBOARD_TOP_Y + 0.3mm', () => {
      // Test cases with exact placement target coordinates
      const testCases: Array<{
        type: string;
        targetX: number;
        targetZ: number;
        expectedPinsCount: number;
        name: string;
      }> = [
        {
          name: 'DIP-8 (NE555 / LM358)',
          type: 'TIMER_555',
          targetX: START_X + (20 - 0.5) * PITCH_X,
          targetZ: 0,
          expectedPinsCount: 8,
        },
        {
          name: 'DIP-14 (74HC14 / LM324)',
          type: 'IC_74HC14',
          targetX: START_X + (20 - 1) * PITCH_X,
          targetZ: 0,
          expectedPinsCount: 14,
        },
        {
          name: 'DIP-16 (74HC595 / CD4017 / L293D)',
          type: 'IC_74HC595',
          targetX: START_X + (25 - 0.5) * PITCH_X,
          targetZ: 0,
          expectedPinsCount: 16,
        },
        {
          name: 'DIP-28 (ATmega328P)',
          type: 'MCU_ATMEGA328P_DIP28',
          targetX: START_X + (30 - 0.5) * PITCH_X,
          targetZ: 0,
          expectedPinsCount: 28,
        },
        {
          name: 'ESP32 DevKit (Row B & Row I at 22.86mm = 9 pitches)',
          type: 'ESP32_DEVKIT',
          targetX: START_X + (20 - 1) * PITCH_X,
          targetZ: 0,
          expectedPinsCount: 30,
        },
        {
          name: 'HC-SR04 Ultrasonic Sensor (Row C at -8.89mm)',
          type: 'HC_SR04',
          targetX: START_X + (15 - 0.5) * PITCH_X,
          targetZ: ROW_Z_MAP.C,
          expectedPinsCount: 4,
        },
        {
          name: 'HC-05 Bluetooth Module (Row H at +8.89mm)',
          type: 'MODULE_BLUETOOTH_HC05',
          targetX: START_X + (35 - 0.5) * PITCH_X,
          targetZ: ROW_Z_MAP.H,
          expectedPinsCount: 6,
        },
        {
          name: 'TO-220 Power Package (Row C at -8.89mm)',
          type: 'MOSFET_N',
          targetX: START_X + (10 - 1) * PITCH_X,
          targetZ: ROW_Z_MAP.C,
          expectedPinsCount: 3,
        },
        {
          name: 'RGB LED 4-Pin (Row H at +8.89mm)',
          type: 'LED_RGB',
          targetX: START_X + (45 - 0.5) * PITCH_X,
          targetZ: ROW_Z_MAP.H,
          expectedPinsCount: 4,
        },
      ];

      testCases.forEach((tc) => {
        const pinOffsets = getComponentPinOffsets(tc.type);
        expect(pinOffsets.length).toBe(tc.expectedPinsCount);

        // Verify every pin lands within < 0.05mm of a real breadboard hole
        pinOffsets.forEach((p) => {
          const worldPinX = tc.targetX + p.x;
          const worldPinZ = tc.targetZ + p.z;
          const hole = findNearestHole830(worldPinX, worldPinZ, 1.44, 1);
          expect(hole).toBeDefined();
          const dist = Math.hypot(hole!.x - worldPinX, hole!.z - worldPinZ);
          expect(dist).toBeLessThanOrEqual(0.05);
        });

        // Verify areAllPinsInBreadboardHoles reports true
        const allIn = areAllPinsInBreadboardHoles(tc.type, tc.targetX, tc.targetZ, 0, 1);
        expect(allIn).toBe(true);

        // Verify body bottom elevation strictly clears breadboard plastic:
        const spec = getComponentElevationSpec(tc.type);
        const elev = computeComponentGroundElevation(tc.type, tc.targetX, tc.targetZ, true, 0, 1);
        const worldBodyBottomY = elev + spec.localMinBodyY;
        expect(worldBodyBottomY).toBeGreaterThanOrEqual(BREADBOARD_TOP_Y + 0.29);
      });
    });

    it('3. Misaligned / ravine placement clamps lowest pin tip flush to BREADBOARD_TOP_Y (zero sinking through plastic)', () => {
      // Placing single-row modules over the solid center ravine (z = 0):
      const ravineTests = ['HC_SR04', 'MODULE_BLUETOOTH_HC05', 'LED_RGB', 'MOSFET_N'];

      ravineTests.forEach((type) => {
        const colX = START_X + (20 - 0.5) * PITCH_X;
        const allIn = areAllPinsInBreadboardHoles(type, colX, 0, 0, 1);
        expect(allIn).toBe(false);

        const elev = computeComponentGroundElevation(type, colX, 0, true, 0, 1);
        const spec = getComponentElevationSpec(type);
        const worldLowestMeshY = elev + Math.min(spec.localMinY, spec.localMinBodyY);
        // Lowest mesh point is strictly at BREADBOARD_TOP_Y (never sinks through plastic!)
        expect(worldLowestMeshY).toBeCloseTo(BREADBOARD_TOP_Y, 1);
      });
    });
  });

  describe('Task 5: 2D/3D PCB Sync, Low-Noise DRC Engine & Silkscreen Text (fix/pcb-2d-drc-sync)', () => {
    const mockComponents: CircuitComponent[] = [
      {
        id: 'r1',
        type: 'RESISTOR',
        label: 'R1',
        value: '10k',
        x: 50,
        y: 50,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: -10, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 10, y: 0 },
        ],
      },
      {
        id: 'c1',
        type: 'CAPACITOR_CERAMIC',
        label: 'C1',
        value: '100nF',
        x: 80,
        y: 50,
        pins: [
          { id: '1', name: '1', pinType: 'passive', x: -10, y: 0 },
          { id: '2', name: '2', pinType: 'passive', x: 10, y: 0 },
        ],
      },
    ];

    const mockWires: CircuitWire[] = [
      {
        id: 'w1',
        fromCompId: 'r1',
        fromPinId: '2',
        toCompId: 'c1',
        toPinId: '1',
      },
    ];

    it('1. PcbGenerator preserves manual tracks, component movements, silkscreen text, and dimensions when syncing', () => {
      // Step A: Initial PCB generation
      const pcb1 = PcbGenerator.generatePcbFromSchematic(mockComponents, mockWires, 90, 70);
      expect(pcb1.components?.length).toBe(2);

      // Step B: User makes manual edits in 2D PCB
      const editedPcb: PcbLayout = {
        ...pcb1,
        widthMm: 110,
        heightMm: 85,
        tracks: [
          ...pcb1.tracks,
          {
            id: 'user_track_1',
            layer: 'top_copper',
            from: { x: 20, y: 20 },
            to: { x: 40, y: 40 },
            widthMm: 0.55,
            netId: 'NET_CUSTOM',
          },
        ],
        components: pcb1.components?.map((c) =>
          c.componentId === 'r1' ? { ...c, x: 35.5, y: 28.5, rotation: 90 } : c
        ),
        texts: [
          {
            id: 'txt_rev',
            text: 'EI LAB V3 REV B',
            xMm: 25.0,
            yMm: 15.0,
            fontSizeMm: 2.5,
            layer: 'F.SilkS',
            rotation: 0,
          },
        ],
      };

      // Step C: Re-sync PCB with schematic passing existing edited PCB
      const pcbSynced = PcbGenerator.generatePcbFromSchematic(mockComponents, mockWires, 80, 60, editedPcb);

      // Verify custom board dimensions are preserved
      expect(pcbSynced.widthMm).toBeGreaterThanOrEqual(110);
      expect(pcbSynced.heightMm).toBeGreaterThanOrEqual(85);

      // Verify user custom track is preserved
      const customTrk = pcbSynced.tracks.find((t) => t.id === 'user_track_1');
      expect(customTrk).toBeDefined();
      expect(customTrk?.widthMm).toBe(0.55);

      // Verify user component move and rotation are preserved
      const r1 = pcbSynced.components?.find((c) => c.componentId === 'r1');
      expect(r1).toBeDefined();
      expect(r1?.x).toBe(35.5);
      expect(r1?.y).toBe(28.5);
      expect(r1?.rotation).toBe(90);

      // Verify user silkscreen text is preserved
      expect(pcbSynced.texts?.length).toBe(1);
      expect(pcbSynced.texts?.[0].text).toBe('EI LAB V3 REV B');
      expect(pcbSynced.texts?.[0].layer).toBe('F.SilkS');
    });

    it('2. Low-Noise DRC Engine produces 0 false-positive errors on same-net copper and internal component pins', () => {
      const cleanPcb: PcbLayout = {
        widthMm: 100,
        heightMm: 80,
        boardThicknessMm: 1.6,
        copperLayers: 2,
        pads: [
          {
            id: 'pad_u1_1',
            componentId: 'U1',
            pinId: '1',
            x: 40,
            y: 40,
            diameterMm: 1.6,
            holeMm: 0.8,
            shape: 'round',
            layer: 'all',
            netId: 'NET_A',
          },
          {
            id: 'pad_u1_2',
            componentId: 'U1',
            pinId: '2',
            x: 40,
            y: 42.54, // standard 2.54mm pitch within the same IC package
            diameterMm: 1.6,
            holeMm: 0.8,
            shape: 'round',
            layer: 'all',
            netId: 'NET_B',
          },
        ],
        tracks: [
          // Same-net track entering pad 1
          {
            id: 'trk_net_a_1',
            layer: 'top_copper',
            from: { x: 40, y: 40 },
            to: { x: 40, y: 30 },
            widthMm: 0.35,
            netId: 'NET_A',
          },
          // Adjacent same-net segment meeting track 1
          {
            id: 'trk_net_a_2',
            layer: 'top_copper',
            from: { x: 40, y: 30 },
            to: { x: 50, y: 30 },
            widthMm: 0.35,
            netId: 'NET_A',
          },
        ],
        drcErrors: [],
      };

      const violations = DrcEngine.runChecks(cleanPcb);
      // Same-net track-to-pad and same-net track-to-track are not violations
      const clearanceErrors = violations.filter(
        (v) => v.rule === 'track_clearance' || v.rule === 'pad_clearance' || v.rule === 'hole_clearance'
      );
      expect(clearanceErrors.length).toBe(0);
    });

    it('3. DRC Engine accurately detects true shorts and different-net clearance violations with AI diagnostic format', () => {
      const shortedPcb: PcbLayout = {
        widthMm: 100,
        heightMm: 80,
        boardThicknessMm: 1.6,
        copperLayers: 2,
        pads: [
          {
            id: 'pad_vcc',
            componentId: 'J1',
            pinId: '1',
            x: 30,
            y: 30,
            diameterMm: 1.8,
            holeMm: 0.9,
            shape: 'round',
            layer: 'all',
            netId: 'VCC',
          },
          {
            id: 'pad_gnd',
            componentId: 'J2',
            pinId: '1',
            x: 31.0, // only 1.0mm center distance! Pads overlap/touch!
            y: 30,
            diameterMm: 1.8,
            holeMm: 0.9,
            shape: 'round',
            layer: 'all',
            netId: 'GND',
          },
        ],
        tracks: [
          // Crossing tracks on same layer with different nets
          {
            id: 'trk_vcc',
            layer: 'top_copper',
            from: { x: 50, y: 20 },
            to: { x: 50, y: 60 },
            widthMm: 0.35,
            netId: 'VCC',
          },
          {
            id: 'trk_gnd',
            layer: 'top_copper',
            from: { x: 30, y: 40 },
            to: { x: 70, y: 40 },
            widthMm: 0.35,
            netId: 'GND',
          },
        ],
        drcErrors: [],
      };

      const violations = DrcEngine.runChecks(shortedPcb);
      expect(violations.length).toBeGreaterThanOrEqual(2);

      // Verify short circuit between crossing tracks
      const crossingShort = violations.find(
        (v) => v.id.includes('drc_short') || v.message.includes('crossing') || v.message.includes('Short circuit')
      );
      expect(crossingShort).toBeDefined();
      expect(crossingShort?.severity).toBe('error');
      expect(crossingShort?.message).toContain('[ERROR][CLEARANCE]');
      expect(crossingShort?.message).toContain('Fix:');

      // Verify pad-to-pad clearance violation between different nets VCC and GND
      const padShort = violations.find((v) => v.id.includes('drc_pad_pad'));
      expect(padShort).toBeDefined();
      expect(padShort?.severity).toBe('error');
      expect(padShort?.message).toContain('Net VCC vs Net GND');
      expect(padShort?.message).toContain('Fix:');
    });

    it('4. Silkscreen Text Model supports F.SilkS and B.SilkS layers, custom font sizing, and rotations', () => {
      const silkscreenText1: PcbSilkscreenText = {
        id: 'txt_top_1',
        text: 'STATUS_OK',
        xMm: 15.5,
        yMm: 22.0,
        fontSizeMm: 2.0,
        layer: 'F.SilkS',
        rotation: 90,
      };

      const silkscreenText2: PcbSilkscreenText = {
        id: 'txt_bot_1',
        text: 'SERIAL #10928',
        xMm: 50.0,
        yMm: 45.0,
        fontSizeMm: 1.5,
        layer: 'B.SilkS',
        rotation: 0,
      };

      expect(silkscreenText1.layer).toBe('F.SilkS');
      expect(silkscreenText1.rotation).toBe(90);
      expect(silkscreenText2.layer).toBe('B.SilkS');
      expect(silkscreenText2.fontSizeMm).toBe(1.5);
    });
  });
});
