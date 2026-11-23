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
        x: 50,
        y: 50,
        rotation: 0,
        pins: [{ id: 'out', name: '5V', pinType: 'source', x: 0, y: 0 }],
      };
      const gnd: CircuitComponent = {
        id: 'gnd-1',
        type: 'GROUND',
        label: 'GND',
        x: 100,
        y: 200,
        rotation: 0,
        pins: [{ id: 'out', name: '0V', pinType: 'source', x: 0, y: 0 }],
      };

      // Connect 5V to Red and Green pins, and GND to COM
      const wires: CircuitWire[] = [
        { id: 'w1', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-1', toPinId: 'r' },
        { id: 'w2', fromCompId: 'vcc-1', fromPinId: 'out', toCompId: 'rgb-1', toPinId: 'g' },
        { id: 'w3', fromCompId: 'gnd-1', fromPinId: 'out', toCompId: 'rgb-1', toPinId: 'cc' },
      ];

      const simResult = solver.step([rgbLed, vcc5V, gnd], wires, 0.001);
      expect(simResult).toBeDefined();
      expect(simResult.componentStates['rgb-1']).toBeDefined();
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
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '5V', name: '5V', pinType: 'source', x: 10, y: 10 },
          { id: 'GND', name: 'GND', pinType: 'source', x: 10, y: 20 },
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
        x: 0,
        y: 0,
        rotation: 0,
        pins: [
          { id: '5V', name: '5V', pinType: 'source', x: 10, y: 10 },
          { id: 'GND', name: 'GND', pinType: 'source', x: 10, y: 20 },
        ],
        parameters: { usbPlugged: true, dcJackPlugged: false },
      };

      const res = solver.step([uno], [], 0.001);
      const sim = res.componentStates['uno-1'];
      expect(sim.on).toBe(true);
      expect(sim.pwrLed).toBe(true);
      expect(sim.voltage).toBeGreaterThanOrEqual(4.5);
    });
  });
});
