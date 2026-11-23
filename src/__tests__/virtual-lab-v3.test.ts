import { describe, it, expect } from 'vitest';
import { getComponentPinLabels } from '@/modules/engineering-lab/studio-3d/Studio3DCanvas';
import { COMPONENT_CATALOG } from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitSolver } from '@/modules/engineering-lab/circuit-engine/circuit-solver';
import { CircuitComponent, CircuitWire, Component3D } from '@/modules/engineering-lab/types';

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
});
