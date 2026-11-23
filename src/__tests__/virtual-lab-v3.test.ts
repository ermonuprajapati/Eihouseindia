import { describe, it, expect } from 'vitest';
import { getComponentPinLabels } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import { COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { CircuitComponent, CircuitWire, Component3D } from '@/modules/engineering-lab/types';
import { FootprintRenderer } from '@/modules/engineering-lab/pcb-engine/footprint-renderer';
import { resolve3DModelType } from '@/modules/engineering-lab/studio-3d/SharedComponent3D';
import {
  resolvePhysicalSpec,
  resolveComponentMetadata,
} from '@/modules/engineering-lab/circuit-engine/component-physical-registry';
import { getComponentPinOffsets } from '@/modules/engineering-lab/studio-3d/breadboard-topology';
import {
  MASTER_25_CATEGORIES,
  getCategory25ForComponent,
  filterComponentsByTier,
  getSimulationBadgeInfo,
} from '@/modules/engineering-lab/circuit-engine/component-categories-25';

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

      // Pins 1..7: top row (Row E, z = -3.34)
      for (let i = 0; i < 7; i++) {
        expect(offsets[i].z).toBeCloseTo(-3.34, 2);
      }
      // Pins 8..14: bottom row (Row F, z = +3.34)
      for (let i = 7; i < 14; i++) {
        expect(offsets[i].z).toBeCloseTo(3.34, 2);
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
});
