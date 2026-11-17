import { CircuitComponent, ComponentCategory } from '../types';

export interface ComponentTemplate {
  type: string;
  name: string;
  category: ComponentCategory;
  defaultValue: string;
  defaultParams: Record<string, number | string | boolean>;
  pins: { id: string; name: string; x: number; y: number; pinType: 'input' | 'output' | 'bidirectional' | 'power' | 'passive' }[];
  footprint: string;
  width: number;
  height: number;
  symbolSvg: string;
  description: string;
}

export const COMPONENT_CATALOG: ComponentTemplate[] = [
  // PASSIVE
  {
    type: 'RESISTOR',
    name: 'Resistor',
    category: 'passive',
    defaultValue: '1kΩ',
    defaultParams: { resistance: 1000, powerRatingW: 0.25, tolerancePercent: 5 },
    pins: [
      { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
      { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
    ],
    footprint: 'R_0805_2012Metric',
    width: 60,
    height: 20,
    symbolSvg: 'resistor',
    description: 'Linear 2-terminal passive resistor limiting electric current flow.',
  },
  {
    type: 'CAPACITOR',
    name: 'Capacitor',
    category: 'passive',
    defaultValue: '10µF',
    defaultParams: { capacitance: 0.00001, voltageRatingV: 25 },
    pins: [
      { id: '1', name: '+', x: -25, y: 0, pinType: 'passive' },
      { id: '2', name: '-', x: 25, y: 0, pinType: 'passive' },
    ],
    footprint: 'C_0805_2012Metric',
    width: 50,
    height: 24,
    symbolSvg: 'capacitor',
    description: 'Stores electrical energy electrostatically in an electric field.',
  },
  {
    type: 'INDUCTOR',
    name: 'Inductor',
    category: 'passive',
    defaultValue: '10mH',
    defaultParams: { inductance: 0.01, maxCurrentA: 0.5 },
    pins: [
      { id: '1', name: '1', x: -30, y: 0, pinType: 'passive' },
      { id: '2', name: '2', x: 30, y: 0, pinType: 'passive' },
    ],
    footprint: 'L_0805_2012Metric',
    width: 60,
    height: 20,
    symbolSvg: 'inductor',
    description: 'Stores energy in a magnetic field when electric current flows.',
  },
  {
    type: 'POTENTIOMETER',
    name: 'Potentiometer',
    category: 'passive',
    defaultValue: '10kΩ',
    defaultParams: { resistance: 10000, wiperPosition: 0.5 },
    pins: [
      { id: '1', name: 'A', x: -30, y: -15, pinType: 'passive' },
      { id: '2', name: 'Wiper', x: 0, y: 20, pinType: 'passive' },
      { id: '3', name: 'B', x: 30, y: -15, pinType: 'passive' },
    ],
    footprint: 'Potentiometer_Bourns_3296W',
    width: 60,
    height: 40,
    symbolSvg: 'potentiometer',
    description: 'Three-terminal resistor with a sliding or rotating contact for adjustable division.',
  },

  // SOURCES
  {
    type: 'DC_VOLTAGE',
    name: 'DC Voltage Source',
    category: 'sources',
    defaultValue: '5V',
    defaultParams: { voltage: 5.0 },
    pins: [
      { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
      { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
    ],
    footprint: 'PinHeader_1x02_P2.54mm',
    width: 30,
    height: 50,
    symbolSvg: 'dc_source',
    description: 'Constant DC electromotive force potential difference generator.',
  },
  {
    type: 'BATTERY',
    name: '9V Battery',
    category: 'sources',
    defaultValue: '9V',
    defaultParams: { voltage: 9.0, capacityMah: 500 },
    pins: [
      { id: 'p', name: '+', x: 0, y: -25, pinType: 'power' },
      { id: 'n', name: '-', x: 0, y: 25, pinType: 'power' },
    ],
    footprint: 'BatteryHolder_Keystone_2460_1xAA',
    width: 32,
    height: 50,
    symbolSvg: 'battery',
    description: 'Electrochemical portable cell voltage supply.',
  },
  {
    type: 'GROUND',
    name: 'Ground (GND)',
    category: 'sources',
    defaultValue: '0V',
    defaultParams: { voltage: 0.0 },
    pins: [
      { id: '1', name: 'GND', x: 0, y: -15, pinType: 'power' },
    ],
    footprint: 'TestPoint_Pad_D1.0mm',
    width: 24,
    height: 24,
    symbolSvg: 'gnd',
    description: 'Zero-potential reference return path for electrical circuit nodes.',
  },
  {
    type: 'FUNCTION_GENERATOR',
    name: 'Signal Generator',
    category: 'sources',
    defaultValue: '1kHz 5V',
    defaultParams: { frequency: 1000, amplitude: 5.0, offset: 0, waveform: 'sine' },
    pins: [
      { id: 'p', name: 'OUT', x: 30, y: 0, pinType: 'output' },
      { id: 'n', name: 'COM', x: -30, y: 0, pinType: 'power' },
    ],
    footprint: 'BNC_Amphenol_B6252HB',
    width: 60,
    height: 40,
    symbolSvg: 'func_gen',
    description: 'Synthesizes sine, square, and triangle waves for transient testing.',
  },

  // SEMICONDUCTORS / ACTIVE
  {
    type: 'LED',
    name: 'LED (Light Emitting Diode)',
    category: 'active',
    defaultValue: 'Red LED',
    defaultParams: { color: '#EF4444', forwardVoltage: 2.0, maxCurrentMa: 20 },
    pins: [
      { id: 'a', name: 'Anode (+)', x: -25, y: 0, pinType: 'passive' },
      { id: 'k', name: 'Cathode (-)', x: 25, y: 0, pinType: 'passive' },
    ],
    footprint: 'LED_0805_2012Metric',
    width: 50,
    height: 30,
    symbolSvg: 'led',
    description: 'Semiconductor p-n junction diode emitting photons during electroluminescence.',
  },
  {
    type: 'DIODE',
    name: 'Diode (1N4148 / 1N4007)',
    category: 'active',
    defaultValue: '1N4148',
    defaultParams: { forwardDropV: 0.7, maxCurrentA: 1.0 },
    pins: [
      { id: 'a', name: 'A', x: -25, y: 0, pinType: 'passive' },
      { id: 'k', name: 'K', x: 25, y: 0, pinType: 'passive' },
    ],
    footprint: 'D_SOD-123',
    width: 50,
    height: 24,
    symbolSvg: 'diode',
    description: 'Unidirectional current rectifier blocking reverse polarity potentials.',
  },
  {
    type: 'NPN_TRANSISTOR',
    name: 'NPN Transistor (BC547 / 2N2222)',
    category: 'active',
    defaultValue: '2N2222',
    defaultParams: { beta: 100, vceSat: 0.2 },
    pins: [
      { id: 'b', name: 'Base', x: -25, y: 0, pinType: 'input' },
      { id: 'c', name: 'Collector', x: 15, y: -25, pinType: 'passive' },
      { id: 'e', name: 'Emitter', x: 15, y: 25, pinType: 'passive' },
    ],
    footprint: 'TO-92_Inline',
    width: 50,
    height: 50,
    symbolSvg: 'npn',
    description: 'Bipolar junction transistor current amplifier & high-speed electronic switch.',
  },
  {
    type: 'TIMER_555',
    name: 'NE555 Precision Timer IC',
    category: 'active',
    defaultValue: 'NE555P',
    defaultParams: { vcc: 5.0 },
    pins: [
      { id: '1', name: 'GND', x: -40, y: -30, pinType: 'power' },
      { id: '2', name: 'TRIG', x: -40, y: -10, pinType: 'input' },
      { id: '3', name: 'OUT', x: 40, y: -10, pinType: 'output' },
      { id: '4', name: 'RESET', x: -40, y: 10, pinType: 'input' },
      { id: '5', name: 'CTRL', x: 40, y: 10, pinType: 'passive' },
      { id: '6', name: 'THRESH', x: -40, y: 30, pinType: 'input' },
      { id: '7', name: 'DISCH', x: 40, y: -30, pinType: 'passive' },
      { id: '8', name: 'VCC', x: 40, y: 30, pinType: 'power' },
    ],
    footprint: 'DIP-8_W7.62mm',
    width: 80,
    height: 80,
    symbolSvg: 'ic_dip8',
    description: 'Industry standard timer for pulse generation, oscillation, and delay circuits.',
  },

  // DIGITAL LOGIC
  {
    type: 'LOGIC_AND',
    name: 'AND Gate (74HC08)',
    category: 'logic',
    defaultValue: '74HC08',
    defaultParams: {},
    pins: [
      { id: 'a', name: 'A', x: -30, y: -12, pinType: 'input' },
      { id: 'b', name: 'B', x: -30, y: 12, pinType: 'input' },
      { id: 'out', name: 'Y', x: 30, y: 0, pinType: 'output' },
    ],
    footprint: 'SOIC-14_3.9x8.7mm_P1.27mm',
    width: 60,
    height: 40,
    symbolSvg: 'and_gate',
    description: 'Outputs HIGH only when both input signals are asserted HIGH.',
  },
  {
    type: 'LOGIC_OR',
    name: 'OR Gate (74HC32)',
    category: 'logic',
    defaultValue: '74HC32',
    defaultParams: {},
    pins: [
      { id: 'a', name: 'A', x: -30, y: -12, pinType: 'input' },
      { id: 'b', name: 'B', x: -30, y: 12, pinType: 'input' },
      { id: 'out', name: 'Y', x: 30, y: 0, pinType: 'output' },
    ],
    footprint: 'SOIC-14_3.9x8.7mm_P1.27mm',
    width: 60,
    height: 40,
    symbolSvg: 'or_gate',
    description: 'Outputs HIGH if at least one input is asserted HIGH.',
  },
  {
    type: 'LOGIC_NOT',
    name: 'NOT Inverter Gate (74HC04)',
    category: 'logic',
    defaultValue: '74HC04',
    defaultParams: {},
    pins: [
      { id: 'a', name: 'A', x: -25, y: 0, pinType: 'input' },
      { id: 'out', name: 'Y', x: 25, y: 0, pinType: 'output' },
    ],
    footprint: 'SOIC-14_3.9x8.7mm_P1.27mm',
    width: 50,
    height: 30,
    symbolSvg: 'not_gate',
    description: 'Digital logical inverter negating the incoming binary logic level.',
  },

  // MICROCONTROLLER
  {
    type: 'MCU_ARDUINO_UNO',
    name: 'Virtual Arduino Uno (ATmega328P)',
    category: 'microcontrollers',
    defaultValue: 'ATmega328P 16MHz',
    defaultParams: { clockMhz: 16, flashKb: 32, ramKb: 2 },
    pins: [
      { id: '5V', name: '5V', x: -60, y: -45, pinType: 'power' },
      { id: 'GND', name: 'GND', x: -60, y: -25, pinType: 'power' },
      { id: 'A0', name: 'A0', x: -60, y: 0, pinType: 'input' },
      { id: 'A1', name: 'A1', x: -60, y: 20, pinType: 'input' },
      { id: 'A2', name: 'A2', x: -60, y: 40, pinType: 'input' },
      { id: 'D2', name: 'D2', x: 60, y: -40, pinType: 'bidirectional' },
      { id: 'D3', name: 'D3', x: 60, y: -20, pinType: 'bidirectional' },
      { id: 'D9', name: 'D9', x: 60, y: 0, pinType: 'bidirectional' },
      { id: 'D10', name: 'D10', x: 60, y: 20, pinType: 'bidirectional' },
      { id: 'D13', name: 'D13', x: 60, y: 40, pinType: 'bidirectional' },
    ],
    footprint: 'Module_Arduino_Uno',
    width: 120,
    height: 110,
    symbolSvg: 'arduino_uno',
    description: '16MHz 8-bit AVR microcontroller development board with programmable firmware.',
  },

  // ACTUATORS / OUTPUTS
  {
    type: 'DC_MOTOR',
    name: 'DC Toy Motor',
    category: 'sensors',
    defaultValue: '3-6V DC',
    defaultParams: { nominalVoltage: 5.0, rpm: 3000 },
    pins: [
      { id: '1', name: '+', x: -25, y: 0, pinType: 'passive' },
      { id: '2', name: '-', x: 25, y: 0, pinType: 'passive' },
    ],
    footprint: 'Motor_DC_130_Small',
    width: 50,
    height: 50,
    symbolSvg: 'motor',
    description: 'Electromechanical actuator converting electrical energy into rotational motion.',
  },
  {
    type: 'SPST_SWITCH',
    name: 'Toggle Switch (SPST)',
    category: 'passive',
    defaultValue: 'Closed',
    defaultParams: { closed: true },
    pins: [
      { id: '1', name: '1', x: -25, y: 0, pinType: 'passive' },
      { id: '2', name: '2', x: 25, y: 0, pinType: 'passive' },
    ],
    footprint: 'Switch_SPST_Slide_2.54mm',
    width: 50,
    height: 24,
    symbolSvg: 'switch',
    description: 'Single-pole single-throw mechanical contact circuit breaker.',
  },
];

export function createComponentInstance(template: ComponentTemplate, x: number, y: number): CircuitComponent {
  const uniqueId = `${template.type.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    id: uniqueId,
    type: template.type,
    label: template.name,
    category: template.category,
    x,
    y,
    rotation: 0,
    value: template.defaultValue,
    parameters: { ...template.defaultParams },
    pins: template.pins.map((p) => ({ ...p })),
    footprint: template.footprint,
  };
}
