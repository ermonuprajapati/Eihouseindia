'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CircuitComponent, CircuitWire, WireRoutingStyle } from '@/modules/engineering-lab/types';
import { Sliders, RotateCw, Trash2, Zap, X, FlipHorizontal, ChevronLeft, ChevronRight, Copy, Cable, Check, Unplug, Cpu } from 'lucide-react';

interface PropertiesInspectorProps {
  component: CircuitComponent | null;
  selectedWire?: CircuitWire | null;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  onUpdateComponent: (updated: CircuitComponent) => void;
  onUpdateWire?: (updated: CircuitWire) => void;
  onRotateComponent: (id: string) => void;
  onMirrorComponent?: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onDisconnectWire?: (wireId: string) => void;
  onDisconnectWireEndpoint?: (wireId: string, endpoint: 'start' | 'end') => void;
  onDuplicateComponent?: (id: string) => void;
  onClose: () => void;
  simState?: {
    voltage: number;
    current: number;
    on?: boolean;
    brightness?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    faultState?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    isBurnedOut?: boolean;
    thermalStress?: number;
    fault?: string;
    onRed?: boolean;
    onGreen?: boolean;
    onBlue?: boolean;
  };
  wireCurrent?: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export interface FootprintOption {
  value: string;
  label: string;
  categories: string[];
}

export interface Model3DOption {
  value: string;
  label: string;
  categories: string[];
}

export interface PhysicalPackagePreset {
  id: string;
  label: string;
  category: string;
  packageType: 'THT' | 'SMD' | 'Module' | 'Chassis';
  footprint: string;
  model3d: string;
}

const FOOTPRINT_OPTIONS: FootprintOption[] = [
  // Resistors
  { value: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal', label: 'Through-Hole Axial Resistor (1/4W, 7.62mm)', categories: ['resistor'] },
  { value: 'Resistor_SMD:R_0805_2012Metric', label: 'Resistor SMD 0805 (2012 Metric)', categories: ['resistor'] },
  { value: 'Resistor_SMD:R_1206_3216Metric', label: 'Resistor SMD 1206 (3216 Metric)', categories: ['resistor'] },
  { value: 'Potentiometer_THT:Potentiometer_Bourns_3386P_Vertical', label: 'Bourns 3386P 3-Pin Trimmer', categories: ['resistor'] },
  { value: 'Inductor_THT:L_Axial_L7.0mm_D3.3mm_P10.16mm_Horizontal', label: 'Through-Hole Axial Inductor (10.16mm)', categories: ['resistor', 'inductor'] },

  // Capacitors
  { value: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm', label: 'Capacitor Disc Ceramic (5.0mm)', categories: ['capacitor'] },
  { value: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', label: 'Capacitor Radial Can Electrolytic (6.3mm)', categories: ['capacitor'] },
  { value: 'Capacitor_SMD:C_0805_2012Metric', label: 'Capacitor SMD 0805 (2012 Metric)', categories: ['capacitor'] },

  // Diodes
  { value: 'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal', label: 'Through-Hole Diode DO-41 (1N4007)', categories: ['diode'] },
  { value: 'Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal', label: 'Through-Hole Diode DO-35 (1N4148)', categories: ['diode'] },
  { value: 'Diode_SMD:D_SOD-123', label: 'Surface Mount Diode SOD-123', categories: ['diode'] },

  // LEDs
  { value: 'LED_THT:LED_D5.0mm', label: 'LED 5mm Through-Hole (Round Diffused)', categories: ['led'] },
  { value: 'LED_THT:LED_D3.0mm', label: 'LED 3mm Through-Hole (Compact)', categories: ['led'] },
  { value: 'LED_THT:LED_D5.0mm-4', label: 'RGB LED 4-Pin Common Cathode (5mm)', categories: ['led'] },
  { value: 'LED_SMD:LED_0805_2012Metric', label: 'SMD 0805 Chip LED (2012 Metric)', categories: ['led'] },

  // Transistors
  { value: 'Package_TO_SOT_THT:TO-92_Inline', label: 'TO-92 Transistor Package (BJT/Small Signal)', categories: ['transistor'] },
  { value: 'Package_TO_SOT_THT:TO-220-3_Vertical', label: 'TO-220 Power Package (MOSFET/7805)', categories: ['transistor'] },
  { value: 'Package_TO_SOT_SMD:SOT-23', label: 'SOT-23 Surface Mount Transistor', categories: ['transistor'] },

  // ICs / Logic / DIP
  { value: 'Package_DIP:DIP-8_W7.62mm', label: 'DIP-8 (Through-Hole, 7.62mm pitch)', categories: ['ic'] },
  { value: 'Package_DIP:DIP-14_W7.62mm', label: 'DIP-14 Logic IC (74HC/CD4000)', categories: ['ic'] },
  { value: 'Package_DIP:DIP-16_W7.62mm', label: 'DIP-16 Driver/Logic IC', categories: ['ic'] },
  { value: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', label: 'SOIC-8 SMD Package (1.27mm pitch)', categories: ['ic'] },

  // Switches & Buttons
  { value: 'Button_Switch_THT:SW_PUSH_6mm_H5mm', label: 'Tactile Pushbutton 6mm', categories: ['switch'] },
  { value: 'Button_Switch_THT:SW_Slide_1P2T_Straight', label: 'Mini Slide Switch SPDT (2.54mm)', categories: ['switch'] },

  // Audio / Sound
  { value: 'Buzzer_Beeper:Buzzer_12x9.5RM7.6', label: 'Active Piezo Buzzer 12mm THT', categories: ['buzzer'] },
  { value: 'Buzzer_Beeper:Buzzer_CUI_CPE-122', label: 'Compact Radial Piezo Beeper', categories: ['buzzer'] },

  // Sensors
  { value: 'Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical', label: 'Pin Header 1x04 (2.54mm, HC-SR04/Sensors)', categories: ['sensor'] },
  { value: 'Sensor_Optical:LDR_5mm_Radial', label: 'LDR Photoresistor 5mm Radial', categories: ['sensor'] },

  // Displays
  { value: 'Connector_PinHeader_2.54mm:PinHeader_1x16_P2.54mm_Vertical', label: 'Pin Header 1x16 (2.54mm, LCD 16x2)', categories: ['display'] },
  { value: 'Display:OLED_0.96_I2C_4Pin', label: 'OLED 0.96" 4-Pin I2C Header', categories: ['display'] },

  // RF & Wireless / Bluetooth
  { value: 'Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical', label: 'Pin Header 1x06 (2.54mm, HC-05 Bluetooth)', categories: ['bluetooth'] },
  { value: 'Connector_PinHeader_2.54mm:PinHeader_2x04_P2.54mm_Vertical', label: 'Pin Header 2x04 (2.54mm, nRF24L01 Module)', categories: ['bluetooth'] },

  // Power / Batteries
  { value: 'BatteryHolder_Keystone_2460_1xAA', label: 'Battery Clip / Holder 9V Block', categories: ['battery'] },

  // Microcontrollers
  { value: 'Module:Arduino_Uno_R3', label: 'Arduino Uno R3 Dev Board', categories: ['mcu'] },
  { value: 'Module:Arduino_Mega_2560', label: 'Arduino Mega 2560 R3 Board', categories: ['mcu'] },
  { value: 'Module:Arduino_Nano', label: 'Arduino Nano V3 DIP-30', categories: ['mcu'] },
  { value: 'Module:ESP32-WROOM-32', label: 'ESP32-WROOM-32 DevKit', categories: ['mcu'] },
  { value: 'Module:RP2040_Pico', label: 'Raspberry Pi Pico (RP2040)', categories: ['mcu'] },

  // Connectors & Relay
  { value: 'TerminalBlock:TerminalBlock_bornier-2_P5.08mm', label: 'Screw Terminal Block 2-Pin 5.08mm', categories: ['connector'] },
  { value: 'Relay_THT:Relay_SPDT_Songle_SRD-Series', label: 'Songle SRD SPDT Relay 5V', categories: ['relay'] },
];

const MODEL_3D_OPTIONS: Model3DOption[] = [
  // Resistors
  { value: 'resistor_axial_horiz', label: 'Resistor Axial 1/4W (Horizontal)', categories: ['resistor'] },
  { value: 'resistor_smd_0805', label: 'Resistor SMD 0805 (Surface Mount)', categories: ['resistor'] },
  { value: 'inductor_axial_0912', label: 'Inductor Axial 0912 Coiled', categories: ['resistor', 'inductor'] },

  // Capacitors
  { value: 'capacitor_disc_ceramic', label: 'Capacitor Ceramic Disc 5.0mm', categories: ['capacitor'] },
  { value: 'capacitor_radial_can', label: 'Capacitor Radial Aluminum Can', categories: ['capacitor'] },

  // Diodes
  { value: 'diode_axial_do41', label: 'Diode DO-41 Axial Rectifier', categories: ['diode'] },

  // LEDs
  { value: 'led_5mm_diffused', label: 'LED 5mm Diffused Round Dome', categories: ['led'] },
  { value: 'led_rgb_5mm', label: 'LED 5mm RGB (4-Pin Common Cathode)', categories: ['led'] },

  // Transistors
  { value: 'to92_transistor', label: 'TO-92 Small Signal Transistor', categories: ['transistor'] },
  { value: 'to220_mosfet', label: 'TO-220 Power Package (Metal Tab)', categories: ['transistor'] },

  // ICs
  { value: 'dip8_integrated_circuit', label: 'DIP-8 Integrated Circuit (NE555/Op-Amp)', categories: ['ic'] },
  { value: 'dip14_logic_ic', label: 'DIP-14 Logic IC Package', categories: ['ic'] },
  { value: 'dip16_logic_ic', label: 'DIP-16 Integrated Circuit Package', categories: ['ic'] },
  { value: 'soic8_smd_ic', label: 'SOIC-8 Surface Mount IC', categories: ['ic'] },

  // Switches
  { value: 'pushbutton_tactile_6mm', label: 'Tactile Pushbutton 6mm', categories: ['switch'] },
  { value: 'switch_slide_spdt', label: 'Mini Slide Switch SPDT', categories: ['switch'] },

  // Audio / Buzzers
  { value: 'buzzer_active_piezo', label: 'Active Piezo Buzzer 5V Housing', categories: ['buzzer'] },

  // Sensors
  { value: 'hcsr04_ultrasonic', label: 'HC-SR04 Dual Transducer Sonar Module', categories: ['sensor'] },
  { value: 'sensor_ldr_5mm', label: 'LDR Photoresistor 5mm Face', categories: ['sensor'] },

  // Displays
  { value: 'lcd1602_hd44780', label: 'LCD 16x2 Flat Face-Up Character Display', categories: ['display'] },
  { value: 'oled_ssd1306', label: 'OLED 0.96" Graphic Screen (SSD1306)', categories: ['display'] },

  // Bluetooth / RF
  { value: 'module_bluetooth_hc05', label: 'HC-05 Bluetooth SPP Breakout PCB with Antenna', categories: ['bluetooth'] },

  // MCUs
  { value: 'arduino_uno_r3', label: 'Arduino Uno R3 (3D Board)', categories: ['mcu'] },
  { value: 'arduino_mega_2560', label: 'Arduino Mega 2560 (3D Board)', categories: ['mcu'] },
  { value: 'arduino_nano_v3', label: 'Arduino Nano V3 (3D Module)', categories: ['mcu'] },
  { value: 'esp32_wroom_32', label: 'ESP32-WROOM-32 (3D Module)', categories: ['mcu'] },
  { value: 'raspberry_pi_pico', label: 'Raspberry Pi Pico (3D Board)', categories: ['mcu'] },

  // Power
  { value: 'battery_9v_block', label: 'Battery 9V Alkaline Block', categories: ['battery'] },

  // Relays & Connectors
  { value: 'relay_songle_srd', label: 'Songle SRD Relay 5V Module', categories: ['relay'] },
  { value: 'header_2pin_2.54mm', label: 'Screw Terminal / Pin Header Strip', categories: ['connector'] },
];

const PHYSICAL_PACKAGES: PhysicalPackagePreset[] = [
  // Bluetooth / RF
  { id: 'bt_hc05_module', label: 'HC-05 Bluetooth 6-Pin Breakout PCB (Antenna)', category: 'bluetooth', packageType: 'Module', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical', model3d: 'module_bluetooth_hc05' },
  { id: 'rf_nrf24_module', label: 'nRF24L01+ 2.4GHz RF Transceiver 8-Pin', category: 'bluetooth', packageType: 'Module', footprint: 'Connector_PinHeader_2.54mm:PinHeader_2x04_P2.54mm_Vertical', model3d: 'module_bluetooth_hc05' },

  // Sensors
  { id: 'sen_hcsr04', label: 'HC-SR04 Ultrasonic Sonar Module (4-Pin)', category: 'sensor', packageType: 'Module', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical', model3d: 'hcsr04_ultrasonic' },
  { id: 'sen_ldr', label: 'LDR Photoresistor 5mm (Radial Leads)', category: 'sensor', packageType: 'THT', footprint: 'Sensor_Optical:LDR_5mm_Radial', model3d: 'sensor_ldr_5mm' },

  // Displays
  { id: 'disp_lcd1602', label: 'LCD 1602 HD44780 16-Pin Flat Face-Up', category: 'display', packageType: 'Module', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x16_P2.54mm_Vertical', model3d: 'lcd1602_hd44780' },
  { id: 'disp_oled_i2c', label: 'OLED 0.96" 128x64 I2C Display (4-Pin)', category: 'display', packageType: 'Module', footprint: 'Display:OLED_0.96_I2C_4Pin', model3d: 'oled_ssd1306' },

  // Audio / Sound
  { id: 'buzzer_active_5v', label: 'Active Piezo Buzzer 5V Through-Hole', category: 'buzzer', packageType: 'THT', footprint: 'Buzzer_Beeper:Buzzer_12x9.5RM7.6', model3d: 'buzzer_active_piezo' },

  // LEDs
  { id: 'led_tht_5mm', label: '5mm THT LED Round (Diffused)', category: 'led', packageType: 'THT', footprint: 'LED_THT:LED_D5.0mm', model3d: 'led_5mm_diffused' },
  { id: 'led_tht_3mm', label: '3mm THT LED Round Compact', category: 'led', packageType: 'THT', footprint: 'LED_THT:LED_D3.0mm', model3d: 'led_5mm_diffused' },
  { id: 'led_rgb_5mm', label: '5mm RGB LED (4-Pin Common Cathode)', category: 'led', packageType: 'THT', footprint: 'LED_THT:LED_D5.0mm-4', model3d: 'led_rgb_5mm' },
  { id: 'led_smd_0805', label: 'SMD 0805 Chip LED (2012 Metric)', category: 'led', packageType: 'SMD', footprint: 'LED_SMD:LED_0805_2012Metric', model3d: 'led_5mm_diffused' },

  // Resistors
  { id: 'res_tht_axial', label: 'Through-Hole Axial (1/4W 7.62mm)', category: 'resistor', packageType: 'THT', footprint: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal', model3d: 'resistor_axial_horiz' },
  { id: 'res_smd_0805', label: 'Surface Mount SMD 0805 (2012 Metric)', category: 'resistor', packageType: 'SMD', footprint: 'Resistor_SMD:R_0805_2012Metric', model3d: 'resistor_smd_0805' },
  { id: 'res_smd_1206', label: 'Surface Mount SMD 1206 (3216 Metric)', category: 'resistor', packageType: 'SMD', footprint: 'Resistor_SMD:R_1206_3216Metric', model3d: 'resistor_smd_0805' },

  // Capacitors
  { id: 'cap_tht_disc', label: 'Through-Hole Ceramic Disc (5.0mm)', category: 'capacitor', packageType: 'THT', footprint: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm', model3d: 'capacitor_disc_ceramic' },
  { id: 'cap_tht_radial', label: 'Through-Hole Radial Can (Electrolytic)', category: 'capacitor', packageType: 'THT', footprint: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', model3d: 'capacitor_radial_can' },
  { id: 'cap_smd_0805', label: 'Surface Mount SMD 0805 Capacitor', category: 'capacitor', packageType: 'SMD', footprint: 'Capacitor_SMD:C_0805_2012Metric', model3d: 'capacitor_disc_ceramic' },

  // Diodes
  { id: 'diode_do41', label: 'DO-41 Through-Hole Axial (1N4007)', category: 'diode', packageType: 'THT', footprint: 'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal', model3d: 'diode_axial_do41' },
  { id: 'diode_do35', label: 'DO-35 Glass Axial (1N4148)', category: 'diode', packageType: 'THT', footprint: 'Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal', model3d: 'diode_axial_do41' },

  // ICs / Timers
  { id: 'ic_dip8', label: 'Through-Hole DIP-8 (7.62mm pitch)', category: 'ic', packageType: 'THT', footprint: 'Package_DIP:DIP-8_W7.62mm', model3d: 'dip8_integrated_circuit' },
  { id: 'ic_soic8', label: 'Surface Mount SOIC-8 (1.27mm pitch)', category: 'ic', packageType: 'SMD', footprint: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', model3d: 'soic8_smd_ic' },
  { id: 'ic_dip14', label: 'Through-Hole DIP-14 Logic (7.62mm)', category: 'ic', packageType: 'THT', footprint: 'Package_DIP:DIP-14_W7.62mm', model3d: 'dip14_logic_ic' },
  { id: 'ic_dip16', label: 'Through-Hole DIP-16 Driver (7.62mm)', category: 'ic', packageType: 'THT', footprint: 'Package_DIP:DIP-16_W7.62mm', model3d: 'dip16_logic_ic' },

  // Transistors
  { id: 'to92_inline', label: 'Through-Hole TO-92 Transistor Inline', category: 'transistor', packageType: 'THT', footprint: 'Package_TO_SOT_THT:TO-92_Inline', model3d: 'to92_transistor' },
  { id: 'to220_power', label: 'Through-Hole TO-220 Power Package', category: 'transistor', packageType: 'THT', footprint: 'Package_TO_SOT_THT:TO-220-3_Vertical', model3d: 'to220_mosfet' },

  // Switches
  { id: 'sw_push_6mm', label: 'Tactile Pushbutton 6mm', category: 'switch', packageType: 'THT', footprint: 'Button_Switch_THT:SW_PUSH_6mm_H5mm', model3d: 'pushbutton_tactile_6mm' },
  { id: 'sw_slide_spdt', label: 'Mini Slide Switch SPDT (2.54mm)', category: 'switch', packageType: 'THT', footprint: 'Button_Switch_THT:SW_Slide_1P2T_Straight', model3d: 'switch_slide_spdt' },

  // Power / Batteries
  { id: 'battery_9v', label: '9V Alkaline Block Battery Clip', category: 'battery', packageType: 'Chassis', footprint: 'BatteryHolder_Keystone_2460_1xAA', model3d: 'battery_9v_block' },

  // MCUs
  { id: 'mcu_uno', label: 'Arduino Uno R3 Dev Board', category: 'mcu', packageType: 'Module', footprint: 'Module:Arduino_Uno_R3', model3d: 'arduino_uno_r3' },
  { id: 'mcu_nano', label: 'Arduino Nano V3 Compact DIP-30', category: 'mcu', packageType: 'Module', footprint: 'Module:Arduino_Nano', model3d: 'arduino_nano_v3' },
  { id: 'mcu_mega', label: 'Arduino Mega 2560 R3 Board', category: 'mcu', packageType: 'Module', footprint: 'Module:Arduino_Mega_2560', model3d: 'arduino_mega_2560' },
  { id: 'mcu_esp32', label: 'ESP32-WROOM-32 DevKit Board', category: 'mcu', packageType: 'Module', footprint: 'Module:ESP32-WROOM-32', model3d: 'esp32_wroom_32' },
  { id: 'mcu_pico', label: 'Raspberry Pi Pico RP2040 Board', category: 'mcu', packageType: 'Module', footprint: 'Module:RP2040_Pico', model3d: 'raspberry_pi_pico' },
];

function getCategoryForComponent(type: string, category?: string, subCategory?: string): string {
  const t = (type || '').toUpperCase();
  const cat = (category || '').toLowerCase();
  const sub = (subCategory || '').toLowerCase();

  if (t.includes('BLUETOOTH') || t.includes('HC05') || t.includes('HC06') || t.includes('NRF24') || t.includes('WIRELESS') || t.includes('LORA') || sub.includes('wireless') || sub.includes('rf')) return 'bluetooth';
  if (t.includes('ULTRASONIC') || t.includes('SR04') || t.includes('DHT11') || t.includes('LDR') || cat.includes('sensor')) return 'sensor';
  if (t.includes('LCD') || t.includes('OLED') || t.includes('DISPLAY') || sub.includes('display')) return 'display';
  if (t.includes('BUZZER') || sub.includes('sound') || sub.includes('audio')) return 'buzzer';
  if (t.includes('LED') || sub.includes('led')) return 'led';
  if (t.includes('RESISTOR') || t.includes('POTENTIOMETER') || sub.includes('resistor')) return 'resistor';
  if (t.includes('CAPACITOR') || sub.includes('capacitor')) return 'capacitor';
  if (t.includes('DIODE') || sub.includes('diode')) return 'diode';
  if (t.includes('TRANSISTOR') || t.includes('BJT') || t.includes('MOSFET') || t.includes('TO92') || t.includes('TO220') || sub.includes('transistor')) return 'transistor';
  if (t.includes('RELAY') || sub.includes('relay')) return 'relay';
  if (t.includes('CONNECTOR') || t.includes('TERMINAL') || t.includes('HEADER') || cat.includes('connector')) return 'connector';
  if (t.includes('555') || t.includes('TIMER') || t.includes('DIP') || t.includes('IC_') || t.includes('LOGIC') || cat.includes('integrated_circuits')) return 'ic';
  if (t.includes('ARDUINO') || t.includes('ESP32') || t.includes('PICO') || t.includes('STM32') || t.includes('MCU') || cat.includes('microcontroller')) return 'mcu';
  if (t.includes('BATTERY') || t.includes('DC_VOLTAGE') || t.includes('SOURCE') || cat.includes('power')) return 'battery';
  if (t.includes('BUTTON') || t.includes('SWITCH')) return 'switch';
  return 'general';
}

const LED_COLOR_PRESETS: Array<{ name: string; hex: string; vf: number; wavelength: string }> = [
  { name: 'Red', hex: '#EF4444', vf: 2.0, wavelength: '630nm' },
  { name: 'Green', hex: '#10B981', vf: 2.2, wavelength: '525nm' },
  { name: 'Blue', hex: '#3B82F6', vf: 3.1, wavelength: '470nm' },
  { name: 'Amber', hex: '#F59E0B', vf: 2.1, wavelength: '590nm' },
  { name: 'White', hex: '#FFFFFF', vf: 3.1, wavelength: 'Warm' },
  { name: 'Cyan', hex: '#00E5FF', vf: 3.0, wavelength: '505nm' },
  { name: 'Purple', hex: '#B026FF', vf: 3.2, wavelength: '405nm' },
];

function resolveLedColor(val?: string | number | boolean): { name: string; hex: string; vf: number } {
  const str = String(val || 'Red').trim().toLowerCase();
  if (str === 'white' || str.includes('white') || str === '#ffffff' || str === '#f8fafc') {
    return { name: 'White', hex: '#FFFFFF', vf: 3.1 };
  }
  if (str === 'cyan' || str.includes('cyan') || str === '#00e5ff' || str === '#06b6d4') {
    return { name: 'Cyan', hex: '#00E5FF', vf: 3.0 };
  }
  if (str === 'purple' || str.includes('purple') || str.includes('violet') || str === '#b026ff' || str === '#a855f7') {
    return { name: 'Purple', hex: '#B026FF', vf: 3.2 };
  }
  if (str === 'green' || str.includes('green') || str === '#10b981') {
    return { name: 'Green', hex: '#10B981', vf: 2.2 };
  }
  if (str === 'blue' || str.includes('blue') || str === '#3b82f6') {
    return { name: 'Blue', hex: '#3B82F6', vf: 3.1 };
  }
  if (str === 'amber' || str === 'yellow' || str.includes('amber') || str.includes('yellow') || str === '#f59e0b') {
    return { name: 'Amber', hex: '#F59E0B', vf: 2.1 };
  }
  if (str === 'red' || str.includes('red') || str === '#ef4444' || str === '#ff1a1a') {
    return { name: 'Red', hex: '#EF4444', vf: 2.0 };
  }
  if (str.startsWith('#')) {
    return { name: 'Custom', hex: String(val).toUpperCase(), vf: 2.5 };
  }
  return { name: 'Red', hex: '#EF4444', vf: 2.0 };
}

export function PropertiesInspector({
  component,
  selectedWire,
  components,
  wires,
  onUpdateComponent,
  onUpdateWire,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onDeleteWire,
  onDisconnectWire,
  onDuplicateComponent,
  onClose,
  simState,
  wireCurrent,
  isOpen = true,
  onToggleOpen,
  width = 320,
  onWidthChange,
}: PropertiesInspectorProps) {
  const isResizingRef = useRef(false);
  const [pinFilterMode, setPinFilterMode] = useState<'all' | 'connected'>('all');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !onWidthChange) return;
      const newWidth = Math.max(240, Math.min(550, window.innerWidth - e.clientX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onWidthChange]);

  // PERSISTENT COLLAPSED TAB ON RIGHT EDGE
  if (!isOpen) {
    return (
      <div className="relative z-30 shrink-0">
        <button
          onClick={onToggleOpen || onClose}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0B1528] hover:bg-slate-800 border-y border-l border-slate-700 text-slate-300 hover:text-white py-3 px-2 rounded-l-lg shadow-2xl transition-all flex flex-col items-center gap-2 group cursor-pointer"
          title="Open Properties Inspector (Shortcut: I)"
        >
          <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:scale-125 transition-transform" />
          <span className="[writing-mode:vertical-lr] font-mono tracking-widest text-[11px] font-bold uppercase text-slate-300 group-hover:text-sky-400">
            Inspector [I]
          </span>
          <Sliders className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
        </button>
      </div>
    );
  }

  // DEDICATED WIRE CONNECTION INSPECTOR VIEW
  if (!component && selectedWire) {
    const fromComp = components?.find((c) => c.id === selectedWire.fromCompId);
    const toComp = components?.find((c) => c.id === selectedWire.toCompId);
    const fromPin = fromComp?.pins.find((p) => p.id === selectedWire.fromPinId);
    const toPin = toComp?.pins.find((p) => p.id === selectedWire.toPinId);

    const wireColors = [
      { name: 'Red (+5V / VCC)', hex: '#EF4444' },
      { name: 'Black (GND / 0V)', hex: '#1E293B' },
      { name: 'Blue (Signal / Net)', hex: '#3B82F6' },
      { name: 'Green (Data)', hex: '#10B981' },
      { name: 'Yellow (Clock / PWM)', hex: '#F59E0B' },
      { name: 'Orange (Analog)', hex: '#F97316' },
      { name: 'Purple (Digital)', hex: '#A855F7' },
      { name: 'White (Neutral)', hex: '#F8FAFC' },
    ];

    const currentAmps = wireCurrent ?? 0;
    const currentMa = Math.abs(currentAmps) * 1000;

    return (
      <aside
        style={{ width: `${width}px` }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-[#0B1528] border-l border-slate-800 flex flex-col h-full text-slate-200 text-xs select-none fixed lg:relative inset-y-0 right-0 z-40 lg:z-20 shrink-0 overflow-y-auto max-w-[85vw] shadow-2xl lg:shadow-none"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRef.current = true;
          }}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
          title="Drag to resize inspector"
        />

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cable className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Wire Connection</h3>
              <span className="text-[10px] text-slate-400 font-mono">Net ID: {selectedWire.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse Inspector (I)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 flex-1">
          {/* Terminals Connection Card */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Connected Terminals</span>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">From Source</span>
                <strong className="text-emerald-400">{fromComp?.label || selectedWire.fromCompId}</strong>
                <span className="text-[11px] text-slate-300">Pin: {fromPin?.name || selectedWire.fromPinId}</span>
              </div>
              <span className="text-slate-600 text-base">➔</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500">To Destination</span>
                <strong className="text-sky-400">{toComp?.label || selectedWire.toCompId}</strong>
                <span className="text-[11px] text-slate-300">Pin: {toPin?.name || selectedWire.toPinId}</span>
              </div>
            </div>
          </div>

          {/* Real-time Wire Telemetry */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Net Telemetry</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Conduction Current</span>
                <span className="text-amber-400 font-bold text-sm">
                  {currentMa < 1 && currentMa > 0.001 ? `${(currentMa * 1000).toFixed(1)} µA` : `${currentMa.toFixed(3)} mA`}
                </span>
              </div>
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Current Direction</span>
                <span className={`font-bold text-sm ${currentAmps >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.abs(currentAmps) < 0.000001 ? 'Idle (0 A)' : currentAmps >= 0 ? 'Forward (➔)' : 'Reverse (⬅)'}
                </span>
              </div>
            </div>
          </div>

          {/* Wire Routing Style */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Routing Style</span>
              <span className="font-mono text-[10px] text-amber-400 font-bold">
                {selectedWire.style === 'diagonal45' ? '45° Chamfer' : selectedWire.style === 'straight' ? 'Straight Direct' : '90° Orthogonal'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'orthogonal', label: '90° Ortho' },
                { id: 'diagonal45', label: '45° Chamfer' },
                { id: 'straight', label: 'Straight' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onUpdateWire?.({ ...selectedWire, style: st.id as WireRoutingStyle })}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                    (selectedWire.style || 'orthogonal') === st.id
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Net Name / Label */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Net Name / Label</span>
              <span className="text-[10px] text-slate-500">e.g. VCC, GND, CLK</span>
            </label>
            <input
              type="text"
              value={selectedWire.netName || ''}
              onChange={(e) => onUpdateWire?.({ ...selectedWire, netName: e.target.value })}
              placeholder="Assign Net Label (optional)"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 uppercase"
            />
          </div>

          {/* Wire Color Chooser */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Wire Insulation Color</span>
              <span className="font-mono text-[10px] text-slate-400">{selectedWire.color || '#10B981'}</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {wireColors.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => onUpdateWire?.({ ...selectedWire, color: col.hex })}
                  className={`h-7 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    (selectedWire.color || '#10B981') === col.hex ? 'border-white ring-2 ring-white/50 scale-105' : 'border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {(selectedWire.color || '#10B981') === col.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Operations: Delete and Disconnect */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Wire Actions</span>

            {/* Single Disconnect Wire Button */}
            {(onDisconnectWire || onDeleteWire) && (
              <button
                type="button"
                onClick={() => {
                  if (onDisconnectWire) onDisconnectWire(selectedWire.id);
                  else if (onDeleteWire) onDeleteWire(selectedWire.id);
                }}
                className="w-full py-2 px-3 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Disconnect wire completely from both terminal pins"
              >
                <Unplug className="w-3.5 h-3.5 text-amber-400" />
                <span>Disconnect Wire</span>
              </button>
            )}

            {/* Delete Wire Button */}
            {onDeleteWire && (
              <button
                type="button"
                onClick={() => onDeleteWire(selectedWire.id)}
                className="w-full py-2 px-3 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-600/80 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Wire [Delete Key]</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  if (!component) {
    return (
      <aside
        style={{ width: `${width}px` }}
        className="bg-[#0B1528] border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs select-none fixed lg:relative inset-y-0 right-0 z-40 lg:z-20 shrink-0 max-w-[85vw] shadow-2xl lg:shadow-none"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRef.current = true;
          }}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
          title="Drag to resize inspector"
        />
        <div className="absolute top-3 right-3">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Collapse Inspector (I)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Sliders className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
        <p className="font-semibold text-slate-400">No Component Selected</p>
        <p className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
          Click any placed component on the schematic to inspect and edit its physical, electrical, and simulation properties.
        </p>
      </aside>
    );
  }

  const { type, designator, parameters } = component;
  const currentDesignator = designator || component.label.split(' ')[0] || type.slice(0, 3);

  // Helper to update specific parameter and value
  const updateParameter = (key: string, val: number | string | boolean, formattedValue?: string) => {
    const updatedParams = { ...component.parameters, [key]: val };
    if (key === 'color' && component.type === 'LED') {
      const resolved = resolveLedColor(val);
      updatedParams.forwardVoltage = resolved.vf;
      updatedParams.forwardVoltageV = resolved.vf;
    }
    const nextComp: CircuitComponent = {
      ...component,
      parameters: updatedParams,
    };
    if (formattedValue !== undefined) {
      nextComp.value = formattedValue;
    }
    onUpdateComponent(nextComp);
  };

  const powerMw = simState ? Math.abs(simState.voltage * simState.current * 1000) : 0;

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-[#0B1528] border-l border-slate-800 flex flex-col h-full z-40 lg:z-20 select-none shadow-2xl lg:shadow-none text-slate-200 fixed lg:relative inset-y-0 right-0 shrink-0 transition-[width] duration-75 max-w-[85vw]"
    >
      {/* Draggable Resize Handle on Left Edge */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
        }}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
        title="Drag to resize inspector"
      />
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-xs tracking-wider text-slate-100 uppercase font-mono">
              Inspector: {currentDesignator}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">{type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* SECTION 1: REFERENCE DESIGNATOR & LABEL */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold tracking-wider flex items-center justify-between">
            <span>Reference &amp; Identity</span>
            <span className="text-slate-500 font-normal">IEEE 315</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Designator</label>
              <input
                type="text"
                value={currentDesignator}
                onChange={(e) =>
                  onUpdateComponent({
                    ...component,
                    designator: e.target.value.toUpperCase().trim(),
                    label: e.target.value.toUpperCase().trim(),
                  })
                }
                placeholder="e.g. R1, C1, BT1"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">User Note</label>
              <input
                type="text"
                value={component.label}
                onChange={(e) => onUpdateComponent({ ...component, label: e.target.value })}
                placeholder="e.g. Pullup"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: ELECTRICAL & SIMULATION PARAMETERS */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-wider flex items-center justify-between">
            <span>Electrical Parameters</span>
            <span className="text-slate-500 font-normal">MNA Solver</span>
          </div>

          {/* VOLTAGE SOURCES / BATTERY */}
          {(type === 'DC_VOLTAGE' || type === 'BATTERY') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Nominal Source Voltage</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Number(parameters.voltage ?? 9.0).toFixed(1)} V
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={Number(parameters.voltage ?? 9.0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      const safeV = isNaN(v) ? 0 : v;
                      updateParameter('voltage', safeV, `${safeV}V`);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 font-mono text-xs px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
                    Volts
                  </span>
                </div>
              </div>

              {/* Internal Resistance */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                  Internal Resistance (Rint)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={Number(parameters.internalResistance ?? 0.1)}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value);
                      updateParameter('internalResistance', isNaN(r) ? 0.1 : r);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 font-mono text-xs px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
                    Ω
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* RESISTOR & POTENTIOMETER */}
          {(type === 'RESISTOR' || type === 'POTENTIOMETER') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Resistance Value</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={
                      Number(parameters.resistance ?? 1000) >= 1000000
                        ? Number(parameters.resistance ?? 1000) / 1000000
                        : Number(parameters.resistance ?? 1000) >= 1000
                        ? Number(parameters.resistance ?? 1000) / 1000
                        : Number(parameters.resistance ?? 1000)
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const unitMult = component.value.includes('M')
                        ? 1000000
                        : component.value.includes('k') || component.value.includes('K')
                        ? 1000
                        : 1;
                      const finalOhms = raw * unitMult;
                      const fmt =
                        unitMult === 1000000
                          ? `${raw}MΩ`
                          : unitMult === 1000
                          ? `${raw}kΩ`
                          : `${raw}Ω`;
                      updateParameter('resistance', finalOhms, fmt);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('M')
                        ? 'M'
                        : component.value.includes('k') || component.value.includes('K')
                        ? 'k'
                        : 'ohm'
                    }
                    onChange={(e) => {
                      const currentOhms = Number(parameters.resistance ?? 1000);
                      let baseVal = currentOhms;
                      if (component.value.includes('M')) baseVal = currentOhms / 1000000;
                      else if (component.value.includes('k') || component.value.includes('K')) baseVal = currentOhms / 1000;

                      let newOhms = baseVal;
                      let unitStr = 'Ω';
                      if (e.target.value === 'k') {
                        newOhms = baseVal * 1000;
                        unitStr = 'kΩ';
                      } else if (e.target.value === 'M') {
                        newOhms = baseVal * 1000000;
                        unitStr = 'MΩ';
                      }
                      updateParameter('resistance', newOhms, `${baseVal}${unitStr}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ohm">Ω</option>
                    <option value="k">kΩ</option>
                    <option value="M">MΩ</option>
                  </select>
                </div>
              </div>

              {/* Power Rating & Tolerance */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Tolerance</label>
                  <select
                    value={Number(parameters.tolerancePercent ?? 5)}
                    onChange={(e) => updateParameter('tolerancePercent', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={1}>±1% (Metal)</option>
                    <option value={2}>±2%</option>
                    <option value={5}>±5% (Carbon)</option>
                    <option value={10}>±10%</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Power Rating</label>
                  <select
                    value={Number(parameters.powerRatingW ?? 0.25)}
                    onChange={(e) => updateParameter('powerRatingW', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={0.125}>0.125 W (1/8W)</option>
                    <option value={0.25}>0.25 W (1/4W)</option>
                    <option value={0.5}>0.5 W (1/2W)</option>
                    <option value={1.0}>1.0 W</option>
                    <option value={2.0}>2.0 W</option>
                  </select>
                </div>
              </div>

              {type === 'POTENTIOMETER' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase font-mono">Wiper Division (Terminal A ↔ B)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round(Number(parameters.wiperPosition ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={Number(parameters.wiperPosition ?? 0.5)}
                    onChange={(e) => updateParameter('wiperPosition', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Pin 1 (A: 0%)</span>
                    <span>Wiper (Mid)</span>
                    <span>Pin 3 (B: 100%)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAPACITOR */}
          {type === 'CAPACITOR' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Capacitance</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={
                      Number(parameters.capacitance ?? 0.00001) >= 0.001
                        ? Number(parameters.capacitance ?? 0.00001) * 1000
                        : Number(parameters.capacitance ?? 0.00001) >= 0.000000001
                        ? Number(parameters.capacitance ?? 0.00001) * 1000000
                        : Number(parameters.capacitance ?? 0.00001) * 1000000000000
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const isUf = component.value.includes('µ') || component.value.includes('u');
                      const isNf = component.value.includes('n');
                      const isPf = component.value.includes('p');
                      const mult = isUf ? 1e-6 : isNf ? 1e-9 : isPf ? 1e-12 : 1e-6;
                      const finalF = raw * mult;
                      const unitStr = isUf ? 'µF' : isNf ? 'nF' : isPf ? 'pF' : 'µF';
                      updateParameter('capacitance', finalF, `${raw}${unitStr}`);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('p')
                        ? 'pF'
                        : component.value.includes('n')
                        ? 'nF'
                        : 'uF'
                    }
                    onChange={(e) => {
                      const cur = Number(parameters.capacitance ?? 0.00001);
                      let base = cur * 1e6;
                      if (e.target.value === 'pF') base = cur * 1e12;
                      else if (e.target.value === 'nF') base = cur * 1e9;
                      const mult = e.target.value === 'pF' ? 1e-12 : e.target.value === 'nF' ? 1e-9 : 1e-6;
                      const raw = parseFloat((base).toFixed(1));
                      updateParameter('capacitance', raw * mult, `${raw}${e.target.value.replace('u', 'µ')}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pF">pF</option>
                    <option value="nF">nF</option>
                    <option value="uF">µF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Voltage Rating</label>
                  <select
                    value={Number(parameters.voltageRatingV ?? 25)}
                    onChange={(e) => updateParameter('voltageRatingV', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={16}>16 V</option>
                    <option value={25}>25 V</option>
                    <option value={50}>50 V</option>
                    <option value={100}>100 V</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Polarity</label>
                  <select
                    value={parameters.polarized ? 'yes' : 'no'}
                    onChange={(e) => updateParameter('polarized', e.target.value === 'yes')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value="no">Non-Polarized</option>
                    <option value="yes">Polarized (+/-)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* LED / DIODE */}
          {(type === 'LED' || type === 'DIODE') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                    Forward Drop (Vf)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5.0"
                    value={Number(parameters.forwardVoltageV ?? (type === 'LED' ? 2.0 : 0.7))}
                    onChange={(e) => updateParameter('forwardVoltageV', parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs"
                  />
                </div>

                {type === 'LED' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Preset Color</label>
                    <select
                      value={resolveLedColor(parameters.color).name}
                      onChange={(e) => {
                        const target = LED_COLOR_PRESETS.find((p) => p.name === e.target.value) || LED_COLOR_PRESETS[0];
                        updateParameter('color', target.name, `${target.name} LED`);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                    >
                      {LED_COLOR_PRESETS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} ({p.wavelength})
                        </option>
                      ))}
                      {resolveLedColor(parameters.color).name === 'Custom' && (
                        <option value="Custom">Custom Hex</option>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {type === 'LED' && (() => {
                const currentLed = resolveLedColor(parameters.color);
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
                      <span>RGB & Custom HEX Color</span>
                      <span className="text-cyan-400 font-mono text-[11px] font-bold">
                        {currentLed.name !== 'Custom' ? `${currentLed.name} LED` : `Custom ${currentLed.hex}`}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentLed.hex.length === 7 ? currentLed.hex : '#EF4444'}
                        onChange={(e) => updateParameter('color', e.target.value, `Custom ${e.target.value}`)}
                        className="w-9 h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer p-0.5 shrink-0"
                        title="Pick Custom RGB Color"
                      />
                      <input
                        type="text"
                        placeholder="#RRGGBB"
                        value={String(parameters.color ?? currentLed.name)}
                        onChange={(e) => updateParameter('color', e.target.value, `LED ${e.target.value}`)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 uppercase"
                      />
                    </div>
                    {/* Preset Quick Chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {LED_COLOR_PRESETS.map((chip) => {
                        const isChipActive = currentLed.name === chip.name;
                        return (
                          <button
                            key={chip.name}
                            type="button"
                            onClick={() => updateParameter('color', chip.name, `${chip.name} LED`)}
                            className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                              isChipActive
                                ? 'ring-2 ring-cyan-400 scale-125 border-white shadow-lg'
                                : 'border-slate-600 hover:scale-125'
                            }`}
                            style={{ backgroundColor: chip.hex }}
                            title={`Select ${chip.name} (${chip.hex}, ${chip.vf}V)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ACTUATOR_RGB_LED */}
          {type === 'ACTUATOR_RGB_LED' && (
            <div className="space-y-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">RGB LED Parameters</span>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Polarity Configuration</label>
                <select
                  value={String(parameters.commonType ?? 'cathode')}
                  onChange={(e) => updateParameter('commonType', e.target.value, `RGB ${e.target.value === 'cathode' ? 'CC' : 'CA'}`)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs"
                >
                  <option value="cathode">Common Cathode (GND common terminal)</option>
                  <option value="anode">Common Anode (+VCC common terminal)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-rose-400 font-bold">Red Vf (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="4.0"
                    value={Number(parameters.redVf ?? 2.0)}
                    onChange={(e) => updateParameter('redVf', parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-emerald-400 font-bold">Green Vf (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="4.0"
                    value={Number(parameters.greenVf ?? 3.2)}
                    onChange={(e) => updateParameter('greenVf', parseFloat(e.target.value) || 3.2)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-sky-400 font-bold">Blue Vf (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="4.0"
                    value={Number(parameters.blueVf ?? 3.2)}
                    onChange={(e) => updateParameter('blueVf', parseFloat(e.target.value) || 3.2)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Real-time channel telemetry */}
              {simState && (
                <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-center">
                  <div className={`p-1 rounded border ${simState.onRed ? 'bg-rose-950 border-rose-600 text-rose-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    R: {simState.onRed ? 'ON' : 'OFF'}
                  </div>
                  <div className={`p-1 rounded border ${simState.onGreen ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    G: {simState.onGreen ? 'ON' : 'OFF'}
                  </div>
                  <div className={`p-1 rounded border ${simState.onBlue ? 'bg-sky-950 border-sky-600 text-sky-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    B: {simState.onBlue ? 'ON' : 'OFF'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NE555 TIMER */}
          {type === 'TIMER_555' && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Operating IC Model</label>
              <select
                value={String(component.value || 'NE555P')}
                onChange={(e) => onUpdateComponent({ ...component, value: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs"
              >
                <option value="NE555P">NE555P (Bipolar Standard, 4.5V-16V)</option>
                <option value="TLC555">TLC555 (CMOS Low-Power, 2V-15V)</option>
                <option value="LM555CN">LM555CN (National Semi)</option>
              </select>
            </div>
          )}

          {/* INDUCTOR */}
          {type === 'INDUCTOR' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Inductance</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={
                      Number(parameters.inductance ?? 0.01) >= 1
                        ? Number(parameters.inductance ?? 0.01)
                        : Number(parameters.inductance ?? 0.01) >= 0.001
                        ? Number(parameters.inductance ?? 0.01) * 1000
                        : Number(parameters.inductance ?? 0.01) * 1000000
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const isUh = component.value.includes('µ') || component.value.includes('u');
                      const isMh = component.value.includes('m') || (!component.value.includes('µ') && !component.value.includes('H'));
                      const mult = isUh ? 1e-6 : isMh ? 1e-3 : 1;
                      const unitStr = isUh ? 'µH' : isMh ? 'mH' : 'H';
                      updateParameter('inductance', raw * mult, `${raw}${unitStr}`);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('µ') || component.value.includes('u')
                        ? 'uH'
                        : component.value.endsWith('H') && !component.value.includes('m')
                        ? 'H'
                        : 'mH'
                    }
                    onChange={(e) => {
                      const cur = Number(parameters.inductance ?? 0.01);
                      let base = cur * 1000;
                      if (e.target.value === 'uH') base = cur * 1e6;
                      else if (e.target.value === 'H') base = cur;
                      const mult = e.target.value === 'uH' ? 1e-6 : e.target.value === 'H' ? 1 : 1e-3;
                      const raw = parseFloat(base.toFixed(1));
                      const unitStr = e.target.value === 'uH' ? 'µH' : e.target.value;
                      updateParameter('inductance', raw * mult, `${raw}${unitStr}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="uH">µH</option>
                    <option value="mH">mH</option>
                    <option value="H">H</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SWITCHES & BUTTONS */}
          {(type.startsWith('SWITCH_') || type.startsWith('PUSHBUTTON_') || type === 'EMERGENCY_STOP') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Contact State</span>
                <span className={`font-mono font-bold ${
                  type === 'PUSHBUTTON_NO'
                    ? (parameters.closed ? 'text-emerald-400' : 'text-amber-400')
                    : (parameters.closed !== false ? 'text-emerald-400' : 'text-amber-400')
                }`}>
                  {type === 'PUSHBUTTON_NO'
                    ? (parameters.closed ? 'PRESSED (Conducting)' : 'RELEASED (Open NO)')
                    : (parameters.closed !== false ? 'CLOSED (Conducting)' : 'OPEN (Interrupted)')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = type === 'PUSHBUTTON_NO' ? !parameters.closed : !(parameters.closed !== false);
                  updateParameter('closed', nextState, nextState ? 'Closed' : 'Open');
                }}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  (type === 'PUSHBUTTON_NO' ? parameters.closed : parameters.closed !== false)
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                    : 'bg-amber-950/60 border-amber-600 text-amber-300 hover:bg-amber-900/80'
                }`}
              >
                {type === 'PUSHBUTTON_NO'
                  ? (parameters.closed ? 'Button is PRESSED (Click to Release)' : 'Button is RELEASED (Click to Press)')
                  : type === 'EMERGENCY_STOP'
                  ? (parameters.closed !== false ? 'ESTOP Armed (Click to Trigger Emergency Stop)' : 'ESTOP TRIGGERED (Click to Twist Reset)')
                  : (parameters.closed !== false ? 'Contact CLOSED (Click to Open)' : 'Contact OPEN (Click to Close)')}
              </button>
            </div>
          )}

          {/* CIRCUIT BREAKERS & PROTECTION */}
          {type.startsWith('PROTECTION_') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Rated Breaker Current</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.ratedCurrentA ?? 16)} A</span>
                </div>
                <select
                  value={Number(parameters.ratedCurrentA ?? 16)}
                  onChange={(e) => updateParameter('ratedCurrentA', Number(e.target.value), `${e.target.value}A`)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  <option value={6}>6 A (Lighting / Low-Power)</option>
                  <option value={10}>10 A (General Control)</option>
                  <option value={16}>16 A (Standard Branch)</option>
                  <option value={25}>25 A (Small Motors)</option>
                  <option value={32}>32 A (Main Feed / 3-Phase)</option>
                  <option value={63}>63 A (Distribution Panel)</option>
                  <option value={100}>100 A (Main MCCB Incomer)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Breaker Mechanism</span>
                <span className={`font-mono font-bold ${parameters.tripped ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {parameters.tripped ? 'TRIPPED (Fault)' : 'ENGAGED (Armed)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('tripped', !parameters.tripped, parameters.tripped ? 'Normal' : 'Tripped')}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  parameters.tripped
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900'
                    : 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                }`}
              >
                {parameters.tripped ? 'Breaker Tripped (Click to Reset Lever)' : 'Breaker Normal (Click to Test Trip)'}
              </button>
            </div>
          )}

          {/* VFD DRIVE */}
          {type === 'VFD_DRIVE' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Output Frequency</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.targetFreqHz ?? 50.0).toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={Number(parameters.targetFreqHz ?? 50.0)}
                  onChange={(e) => updateParameter('targetFreqHz', parseFloat(e.target.value), `${e.target.value} Hz`)}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Estimated Motor Speed</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round((Number(parameters.targetFreqHz ?? 50.0) / 50.0) * 1440)} RPM
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* BJT TRANSISTOR */}
          {(type === 'BJT_NPN' || type === 'TRANSISTOR_BJT_NPN') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Current Gain (β / hFE)</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.beta ?? 100)}</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={Number(parameters.beta ?? 100)}
                  onChange={(e) => updateParameter('beta', Math.max(10, parseInt(e.target.value) || 100))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* VOLTAGE REGULATORS */}
          {type.startsWith('REGULATOR_') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Regulated VOUT</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Number(parameters.vOut ?? (type.includes('7805') ? 5.0 : type.includes('7812') ? 12.0 : 3.3)).toFixed(1)} V
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={Number(parameters.vOut ?? (type.includes('7805') ? 5.0 : type.includes('7812') ? 12.0 : 3.3))}
                  onChange={(e) => updateParameter('vOut', parseFloat(e.target.value) || 5.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* RELAY ACTUATOR & INDUSTRIAL RELAY */}
          {(type.includes('RELAY') || type.includes('CONTACTOR')) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Coil Excitation</span>
                <span className={`font-mono font-bold ${parameters.energized ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {parameters.energized ? 'ENERGIZED (Active)' : 'DE-ENERGIZED (Relaxed)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('energized', !parameters.energized)}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  parameters.energized
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {parameters.energized ? 'Coil Active (Click to De-energize)' : 'Coil Relaxed (Click to Energize)'}
              </button>
            </div>
          )}

          {/* HARDWARE SPECIFICATION CARD FOR MICROCONTROLLERS */}
          {(type.startsWith('ARDUINO_') || type.startsWith('ESP32') || type.startsWith('STM32') || type.startsWith('RASPBERRY_PI') || component.category === 'microcontrollers') && (() => {
            const getSpecs = () => {
              if (type === 'ARDUINO_UNO') {
                return {
                  chip: 'ATmega328P (8-bit AVR RISC)',
                  clock: '16.0 MHz (Crystal)',
                  memory: '32 KB Flash, 2 KB SRAM, 1 KB EEPROM',
                  voltage: '5.0V Logic (7–12V VIN Barrel)',
                  pinout: '14 Digital I/O (6 PWM ~), 6 Analog (10-bit ADC), 1 UART, 1 I2C, 1 SPI',
                };
              }
              if (type === 'ARDUINO_NANO') {
                return {
                  chip: 'ATmega328P (8-bit AVR RISC, TQFP-32)',
                  clock: '16.0 MHz (Crystal)',
                  memory: '32 KB Flash, 2 KB SRAM, 1 KB EEPROM',
                  voltage: '5.0V Logic (7–12V VIN)',
                  pinout: '14 Digital I/O (6 PWM ~), 8 Analog (A0–A7), 1 UART, 1 I2C, 1 SPI (30 DIP)',
                };
              }
              if (type === 'ARDUINO_MEGA') {
                return {
                  chip: 'ATmega2560 (8-bit AVR RISC, TQFP-100)',
                  clock: '16.0 MHz (Crystal)',
                  memory: '256 KB Flash, 8 KB SRAM, 4 KB EEPROM',
                  voltage: '5.0V Logic (7–12V VIN)',
                  pinout: '54 Digital I/O (15 PWM ~), 16 Analog (A0–A15), 4 UARTs, 1 I2C, 1 SPI',
                };
              }
              if (type.startsWith('ESP32')) {
                return {
                  chip: 'ESP32-WROOM-32 (Tensilica 32-bit Dual Xtensa LX6)',
                  clock: '240.0 MHz',
                  memory: '4 MB SPI Flash, 520 KB SRAM, Wi-Fi 802.11 b/g/n + BLE 4.2',
                  voltage: '3.3V Logic (5V VBUS/VIN via AMS1117-3.3)',
                  pinout: '30 Pins: 18 ADC channels (12-bit), 2 DAC, 3 UART, 2 I2C, 3 SPI, capacitive touch',
                };
              }
              if (type.startsWith('RASPBERRY_PI')) {
                return {
                  chip: 'RP2040 (Dual-Core ARM Cortex-M0+)',
                  clock: '133.0 MHz (Overclockable to 250MHz)',
                  memory: '2 MB QSPI Flash, 264 KB on-chip SRAM in 6 banks',
                  voltage: '3.3V Logic (1.8–5.5V VSYS via buck-boost)',
                  pinout: '40 Pins: 26 Multi-function GPIO, 3 Analog ADC (12-bit), 2 UART, 2 I2C, 2 SPI, 8 PIO State Machines',
                };
              }
              if (type.startsWith('STM32')) {
                return {
                  chip: 'STM32F103C8T6 (ARM 32-bit Cortex-M3)',
                  clock: '72.0 MHz',
                  memory: '64 KB Flash, 20 KB SRAM',
                  voltage: '3.3V Logic (5V Tolerant I/O, 5V VIN)',
                  pinout: '40 DIP Pins: 32 GPIO, 2x 12-bit ADC (10 ch), 3 USART, 2 I2C, 2 SPI, USB 2.0 FS',
                };
              }
              return {
                chip: 'Custom Microcontroller SoC',
                clock: '16.0 MHz',
                memory: 'Integrated Flash / SRAM',
                voltage: '5.0V / 3.3V',
                pinout: 'Configurable General Purpose I/O Headers',
              };
            };
            const specs = getSpecs();
            return (
              <div className="space-y-2.5 p-3 rounded-lg bg-slate-950/90 border border-cyan-800/60 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Hardware Spec</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold border border-cyan-700/50">
                    {type.replace('ARDUINO_', '').replace('RASPBERRY_PI_', '')}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Processor:</span>
                    <span className="text-slate-200 text-right font-semibold">{specs.chip}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Clock Speed:</span>
                    <span className="text-amber-400 font-bold">{specs.clock}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Memory:</span>
                    <span className="text-slate-300 text-right">{specs.memory}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Logic Voltage:</span>
                    <span className="text-emerald-400 font-bold">{specs.voltage}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Pinout Summary:</div>
                    <div className="text-[10px] text-slate-300 leading-relaxed bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      {specs.pinout}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* BOARD POWER SUPPLY (USB CABLE & DC JACK) */}
          {(type.startsWith('ARDUINO_') || type.startsWith('ESP32') || type.startsWith('STM32') || type.startsWith('RASPBERRY_PI') || type.includes('MCU')) && (
            <div className="space-y-3 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold uppercase">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Board Power Supply</span>
                </span>
                <span className={parameters.dcJackPlugged ? 'text-emerald-400 font-bold' : parameters.usbPlugged !== false ? 'text-cyan-400 font-bold' : 'text-slate-500 font-semibold'}>
                  {parameters.dcJackPlugged ? 'DC 9.0V Active' : parameters.usbPlugged !== false ? 'USB 5.0V Active' : 'Power: OFF (0V)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 rounded border border-slate-800 font-mono text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateComponent({
                      ...component,
                      parameters: {
                        ...parameters,
                        usbPlugged: false,
                        dcJackPlugged: false,
                      },
                    });
                  }}
                  className={`py-1.5 rounded transition-all cursor-pointer ${
                    parameters.usbPlugged === false && !parameters.dcJackPlugged
                      ? 'bg-rose-950 border border-rose-600 text-rose-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Disconnect all power supplies from board"
                >
                  OFF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateComponent({
                      ...component,
                      parameters: {
                        ...parameters,
                        usbPlugged: true,
                        dcJackPlugged: false,
                      },
                    });
                  }}
                  className={`py-1.5 rounded transition-all cursor-pointer ${
                    parameters.usbPlugged !== false && !parameters.dcJackPlugged
                      ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Connect USB 5.0V Power Cable"
                >
                  USB (5V)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateComponent({
                      ...component,
                      parameters: {
                        ...parameters,
                        usbPlugged: false,
                        dcJackPlugged: true,
                      },
                    });
                  }}
                  className={`py-1.5 rounded transition-all cursor-pointer ${
                    parameters.dcJackPlugged
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Connect 9V/12V DC Barrel Jack Adapter"
                >
                  DC (9V)
                </button>
              </div>
            </div>
          )}

          {/* SENSORS INTERACTIVE SIMULATION SLIDERS */}
          {/* HC-SR04 Ultrasonic Sensor */}
          {(type === 'SENSOR_ULTRASONIC' || type === 'HC_SR04') && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Obstacle Distance</span>
                <span className="text-cyan-400 font-bold">{Number(parameters.distanceCm ?? 50)} cm</span>
              </div>
              <input
                type="range"
                min="2"
                max="400"
                value={Number(parameters.distanceCm ?? 50)}
                onChange={(e) => updateParameter('distanceCm', Number(e.target.value), `${e.target.value} cm`)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>2 cm</span>
                <span>Echo: {Math.round(Number(parameters.distanceCm ?? 50) * 58.82)} µs</span>
                <span>400 cm</span>
              </div>
            </div>
          )}

          {/* DHT11 / DHT22 Temp & Humidity Sensor */}
          {(type === 'SENSOR_DHT11' || type.includes('DHT')) && (
            <div className="space-y-3 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span className="font-semibold uppercase">Temperature</span>
                  <span className="text-amber-400 font-bold">{Number(parameters.temperatureC ?? 25)} °C</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="60"
                  value={Number(parameters.temperatureC ?? 25)}
                  onChange={(e) => updateParameter('temperatureC', Number(e.target.value), `${e.target.value}°C`)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span className="font-semibold uppercase">Relative Humidity</span>
                  <span className="text-cyan-400 font-bold">{Number(parameters.humidityPercent ?? 50)} %</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={Number(parameters.humidityPercent ?? 50)}
                  onChange={(e) => updateParameter('humidityPercent', Number(e.target.value), `${e.target.value}%`)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* PIR Motion Sensor */}
          {type === 'SENSOR_PIR' && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Motion Event</span>
                <span className={parameters.motionDetected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {parameters.motionDetected ? 'MOTION DETECTED (HIGH)' : 'IDLE (LOW)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('motionDetected', !parameters.motionDetected)}
                className={`w-full py-1.5 px-3 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                  parameters.motionDetected
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {parameters.motionDetected ? 'Trigger: Motion Active' : 'Click to Simulate Motion'}
              </button>
            </div>
          )}

          {/* LDR Photoresistor */}
          {type === 'SENSOR_LDR' && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Ambient Light Level</span>
                <span className="text-amber-400 font-bold">{Number(parameters.lux ?? 500)} Lux</span>
              </div>
              <input
                type="range"
                min="10"
                max="5000"
                value={Number(parameters.lux ?? 500)}
                onChange={(e) => {
                  const lux = Number(e.target.value);
                  // R_ldr approx 500k at 10 lux, down to 1k at 5000 lux
                  const r = Math.round(500000 / Math.pow(lux / 10, 0.7));
                  updateParameter('lux', lux);
                  updateParameter('resistance', r, `${r >= 1000 ? (r / 1000).toFixed(1) + 'kΩ' : r + 'Ω'}`);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Dark (10 Lux)</span>
                <span>Direct Sun (5000 Lux)</span>
              </div>
            </div>
          )}

          {/* MQ-2 Gas Sensor */}
          {(type === 'SENSOR_MQ2' || type.includes('GAS')) && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Gas Concentration</span>
                <span className="text-rose-400 font-bold">{Number(parameters.gasPpm ?? 300)} PPM</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                value={Number(parameters.gasPpm ?? 300)}
                onChange={(e) => updateParameter('gasPpm', Number(e.target.value), `${e.target.value} PPM`)}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          )}

          {/* IR Obstacle Sensor */}
          {type === 'SENSOR_IR_OBSTACLE' && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Obstacle Detection</span>
                <span className={parameters.obstacleDetected ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                  {parameters.obstacleDetected ? 'OBSTACLE DETECTED (LOW)' : 'CLEAR (HIGH)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('obstacleDetected', !parameters.obstacleDetected)}
                className={`w-full py-1.5 px-3 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                  parameters.obstacleDetected
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {parameters.obstacleDetected ? 'Obstacle In Front' : 'Click to Block IR Beam'}
              </button>
            </div>
          )}

          {/* Soil Moisture Sensor */}
          {type === 'SENSOR_SOIL' && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Soil Moisture</span>
                <span className="text-cyan-400 font-bold">{Number(parameters.moisturePercent ?? 45)} %</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Number(parameters.moisturePercent ?? 45)}
                onChange={(e) => updateParameter('moisturePercent', Number(e.target.value), `${e.target.value}%`)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Bone Dry (0%)</span>
                <span>Waterlogged (100%)</span>
              </div>
            </div>
          )}

          {/* SG90 Servo Horn Angle Control */}
          {(type === 'ACTUATOR_SERVO_SG90' || type === 'SERVO_SG90' || type.includes('SERVO')) && (
            <div className="space-y-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="font-semibold uppercase">Servo Horn Angle</span>
                <span className="text-amber-400 font-bold">{Number(parameters.currentAngle ?? 90)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={Number(parameters.currentAngle ?? 90)}
                onChange={(e) => updateParameter('currentAngle', Number(e.target.value), `${e.target.value}°`)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0°</span>
                <span>Center (90°)</span>
                <span>180°</span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: REAL-TIME ELECTRICAL TELEMETRY */}
        {simState && (() => {
          const isBurned = Boolean(simState.status === 'BURNED' || simState.burned || simState.isBurnedOut);
          return (
            <div className={`rounded-lg border p-3 space-y-2.5 ${
              isBurned
                ? 'border-rose-700 bg-rose-950/40 text-rose-200'
                : 'border-cyan-900/60 bg-cyan-950/20'
            }`}>
              <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                <div className={`flex items-center gap-1.5 ${isBurned ? 'text-rose-400' : 'text-cyan-400'}`}>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isBurned ? 'CIRCUIT FAULT / DAMAGE TELEMETRY' : 'Real-Time In-Circuit Telemetry'}</span>
                </div>
                {isBurned && (
                  <span className="px-2 py-0.5 rounded bg-rose-900/90 border border-rose-500 text-rose-200 text-[10px] font-bold animate-pulse">
                    BURNED OUT
                  </span>
                )}
              </div>

              {isBurned && simState.fault && (
                <div className="p-2 rounded bg-rose-950 border border-rose-800 text-rose-200 text-[11px] font-mono leading-relaxed">
                  {simState.fault}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-950/90 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[9px] font-semibold">VOLTAGE DROP</div>
                  <div className={`font-bold text-sm mt-0.5 ${isBurned ? 'text-rose-300' : 'text-cyan-300'}`}>
                    {isBurned ? '0.000 V' : `${simState.voltage.toFixed(3)} V`}
                  </div>
                </div>
                <div className="bg-slate-950/90 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 text-[9px] font-semibold">BRANCH CURRENT</div>
                  <div className={`font-bold text-sm mt-0.5 ${isBurned ? 'text-rose-400' : 'text-amber-400'}`}>
                    {isBurned ? '0.00 mA' : `${(simState.current * 1000).toFixed(2)} mA`}
                  </div>
                </div>
              </div>
              <div className="bg-slate-950/90 p-2 rounded border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                <span className="text-slate-500 text-[9px] font-semibold">POWER DISSIPATION</span>
                <span className={`font-bold ${isBurned ? 'text-rose-300 line-through' : 'text-purple-300'}`}>
                  {isBurned ? '0.00 mW' : `${powerMw.toFixed(2)} mW`}
                </span>
              </div>
            </div>
          );
        })()}

        {/* SECTION 4: PCB FOOTPRINT & 3D CAD MODEL MAPPING */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider flex items-center justify-between">
            <span>Physical Representation</span>
            <span className="text-slate-500 font-normal">IPC-7351 Standard</span>
          </div>

          {(() => {
            const compCategory = getCategoryForComponent(component.type, component.category, component.subCategory);
            const availablePackages = PHYSICAL_PACKAGES.filter((p) => p.category === compCategory);
            const currentPresetId = availablePackages.find(
              (p) => p.footprint === component.footprint && p.model3d === component.model3d
            )?.id || 'custom';

            const filteredFootprints = FOOTPRINT_OPTIONS.filter(
              (f) => f.categories.includes(compCategory) || f.categories.includes('all')
            );
            const hasCurrentFp = filteredFootprints.some((f) => f.value === component.footprint);

            const filteredModels = MODEL_3D_OPTIONS.filter(
              (m) => m.categories.includes(compCategory) || m.categories.includes('all')
            );
            const hasCurrentModel = filteredModels.some((m) => m.value === (component.model3d || ''));

            return (
              <div className="space-y-3">
                {/* 1. Package Preset (Context Filtered) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-300 font-semibold flex items-center justify-between">
                    <span>Physical Package Preset</span>
                    <span className="text-purple-400 font-bold">Auto 2D &amp; 3D Sync</span>
                  </label>
                  <select
                    value={currentPresetId}
                    onChange={(e) => {
                      const pkg = availablePackages.find((p) => p.id === e.target.value);
                      if (pkg) {
                        let mappedType = component.type;
                        if (pkg.id === 'mcu_mega') mappedType = 'ARDUINO_MEGA';
                        else if (pkg.id === 'mcu_uno') mappedType = 'ARDUINO_UNO';
                        else if (pkg.id === 'mcu_nano') mappedType = 'ARDUINO_NANO';
                        else if (pkg.id === 'mcu_esp32') mappedType = 'ESP32_DEVKIT';
                        else if (pkg.id === 'mcu_pico') mappedType = 'RASPBERRY_PI_PICO';
                        else if (pkg.id === 'bt_hc05_module') mappedType = 'MODULE_BLUETOOTH_HC05';
                        else if (pkg.id === 'buzzer_active_5v') mappedType = 'ACTUATOR_BUZZER_ACTIVE';
                        else if (pkg.id === 'led_rgb_5mm') mappedType = 'ACTUATOR_RGB_LED';
                        else if (pkg.id === 'sen_hcsr04') mappedType = 'HC_SR04';
                        else if (pkg.id === 'disp_lcd1602') mappedType = 'DISPLAY_LCD1602';

                        onUpdateComponent({
                          ...component,
                          type: mappedType,
                          packageType: pkg.packageType,
                          footprint: pkg.footprint,
                          model3d: pkg.model3d,
                          parameters: {
                            ...component.parameters,
                            packageType: pkg.packageType,
                            footprint: pkg.footprint,
                            model3d: pkg.model3d,
                          },
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-purple-200 font-mono text-[11px] font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="custom">-- Custom / Manual Configuration --</option>
                    {availablePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Package Mounting Technology (THT / SMD / Module / Chassis) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
                    <span>Package Mounting Type</span>
                    <span className="text-slate-500">Assembly</span>
                  </label>
                  <select
                    value={component.packageType || 'THT'}
                    onChange={(e) => {
                      const newPkgType = e.target.value as 'THT' | 'SMD' | 'Module' | 'Chassis';
                      onUpdateComponent({
                        ...component,
                        packageType: newPkgType,
                        parameters: {
                          ...component.parameters,
                          packageType: newPkgType,
                        },
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="THT">Through-Hole Technology (THT / DIP)</option>
                    <option value="SMD">Surface Mount Device (SMD / SMT)</option>
                    <option value="Module">Breakout PCB Module (Header Pins)</option>
                    <option value="Chassis">Chassis / Enclosure Mount</option>
                  </select>
                </div>

                {/* 3. PCB Footprint Selection (Strictly Context-Filtered) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
                    <span>PCB Footprint Package</span>
                    <span className="text-slate-500">2D Layout</span>
                  </label>
                  <select
                    value={component.footprint}
                    onChange={(e) => {
                      const newFp = e.target.value;
                      onUpdateComponent({
                        ...component,
                        footprint: newFp,
                        parameters: {
                          ...component.parameters,
                          footprint: newFp,
                        },
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {!hasCurrentFp && component.footprint && (
                      <option value={component.footprint}>
                        Current: {component.footprint}
                      </option>
                    )}
                    {filteredFootprints.map((fp) => (
                      <option key={fp.value} value={fp.value}>
                        {fp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. 3D CAD Model Mapping (Strictly Context-Filtered) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
                    <span>3D CAD Model Mapping</span>
                    <span className="text-slate-500">WebGL 3D Live</span>
                  </label>
                  <select
                    value={component.model3d || ''}
                    onChange={(e) => {
                      const m3dVal = e.target.value;
                      let mappedType = component.type;
                      if (m3dVal === 'arduino_mega_2560') mappedType = 'ARDUINO_MEGA';
                      else if (m3dVal === 'arduino_uno_r3') mappedType = 'ARDUINO_UNO';
                      else if (m3dVal === 'arduino_nano_v3') mappedType = 'ARDUINO_NANO';
                      else if (m3dVal.startsWith('esp32')) mappedType = 'ESP32_DEVKIT';
                      else if (m3dVal === 'raspberry_pi_pico') mappedType = 'RASPBERRY_PI_PICO';
                      else if (m3dVal === 'module_bluetooth_hc05') mappedType = 'MODULE_BLUETOOTH_HC05';
                      else if (m3dVal === 'buzzer_active_piezo') mappedType = 'ACTUATOR_BUZZER_ACTIVE';
                      else if (m3dVal === 'led_rgb_5mm') mappedType = 'ACTUATOR_RGB_LED';
                      else if (m3dVal === 'hcsr04_ultrasonic') mappedType = 'HC_SR04';
                      else if (m3dVal === 'lcd1602_hd44780') mappedType = 'DISPLAY_LCD1602';

                      onUpdateComponent({
                        ...component,
                        type: mappedType,
                        model3d: m3dVal,
                        parameters: {
                          ...component.parameters,
                          model3d: m3dVal,
                        },
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {!hasCurrentModel && component.model3d && (
                      <option value={component.model3d}>
                        Current: {component.model3d}
                      </option>
                    )}
                    {filteredModels.map((m3d) => (
                      <option key={m3d.value} value={m3d.value}>
                        {m3d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })()}
        </div>

        {/* SECTION 5: ELECTRICAL PIN CONNECTIONS & NETLIST MAP */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminal Pins &amp; Netlist ({component.pins.length})</span>
            </label>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setPinFilterMode('all')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  pinFilterMode === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({component.pins.length})
              </button>
              <button
                type="button"
                onClick={() => setPinFilterMode('connected')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  pinFilterMode === 'connected'
                    ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Connected
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/80 font-mono text-[10px] max-h-56 overflow-y-auto">
            {component.pins
              .map((pin) => {
                const connectedWire = wires?.find(
                  (w) =>
                    (w.fromCompId === component.id && w.fromPinId === pin.id) ||
                    (w.toCompId === component.id && w.toPinId === pin.id)
                );
                let targetDesc = 'NC (Floating)';
                let netLabel = 'Unconnected';
                let isConnected = false;

                if (connectedWire) {
                  isConnected = true;
                  const isFrom = connectedWire.fromCompId === component.id && connectedWire.fromPinId === pin.id;
                  const otherCompId = isFrom ? connectedWire.toCompId : connectedWire.fromCompId;
                  const otherPinId = isFrom ? connectedWire.toPinId : connectedWire.fromPinId;
                  const otherComp = components?.find((c) => c.id === otherCompId);
                  const otherPin = otherComp?.pins.find((p) => p.id === otherPinId);
                  targetDesc = `${otherComp?.designator || otherComp?.label || otherCompId} (${otherPin?.name || otherPinId})`;
                  netLabel = connectedWire.netName || `Net_${connectedWire.id.slice(0, 5)}`;
                }

                return { pin, connectedWire, targetDesc, netLabel, isConnected };
              })
              .filter((item) => (pinFilterMode === 'connected' ? item.isConnected : true))
              .map(({ pin, isConnected, netLabel, targetDesc }) => (
                <div key={pin.id} className="p-2 flex items-center justify-between text-slate-300 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-bold text-slate-200 shrink-0">{pin.name}</span>
                    <span className="text-slate-500 text-[9px] shrink-0">[{pin.id}]</span>
                  </div>

                  {isConnected ? (
                    <div className="flex items-center gap-1 text-[9px] truncate text-right">
                      <span className="text-amber-400 font-bold bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/40 shrink-0">
                        {netLabel}
                      </span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-emerald-300 font-semibold truncate">{targetDesc}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[9px] italic">NC (Floating)</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
        <button
          onClick={() => onRotateComponent(component.id)}
          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
          title="Rotate 90 degrees clockwise (R key)"
        >
          <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rotate 90°</span>
        </button>

        {onDuplicateComponent && (
          <button
            onClick={() => onDuplicateComponent(component.id)}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
            title="Duplicate component (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>
        )}

        {onMirrorComponent && (
          <button
            onClick={() => onMirrorComponent(component.id)}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
            title="Mirror horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mirror</span>
          </button>
        )}

        <button
          onClick={() => onDeleteComponent(component.id)}
          className="py-1.5 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/60 transition-colors text-xs"
          title="Delete Component (Del key)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
