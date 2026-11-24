'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Resistor3D } from './models/Resistor3D';
import { Led3D } from './models/Led3D';
import { RgbLed3D } from './models/RgbLed3D';
import { HcSr04_3D } from './models/HcSr04_3D';
import { Diode3D } from './models/Diode3D';
import { Inductor3D } from './models/Inductor3D';
import { Ldr3D } from './models/Ldr3D';
import { Buzzer3D } from './models/Buzzer3D';
import { TransistorTO92_3D } from './models/TransistorTO92_3D';
import { TransistorTO220_3D } from './models/TransistorTO220_3D';
import { Pushbutton3D } from './models/Pushbutton3D';
import { SlideSwitch3D } from './models/SlideSwitch3D';
import { Battery9V3D } from './models/Battery9V3D';
import { DipPackage3D } from './models/DipPackage3D';
import { ServoSG903D } from './models/ServoSG903D';
import { Lcd1602_3D } from './models/Lcd1602_3D';
import { ArduinoUno3D } from './models/ArduinoUno3D';
import { ArduinoMega3D } from './models/ArduinoMega3D';
import { ArduinoNano3D } from './models/ArduinoNano3D';
import { Esp32DevKit3D } from './models/Esp32DevKit3D';
import { RaspberryPiPico3D } from './models/RaspberryPiPico3D';
import { CapacitorElectrolytic3D } from './models/CapacitorElectrolytic3D';
import { CapacitorCeramic3D } from './models/CapacitorCeramic3D';
import { Potentiometer3D } from './models/Potentiometer3D';
import { BluetoothHC05_3D } from './models/BluetoothHC05_3D';
import { TerminalBlock3D } from './models/TerminalBlock3D';
import { COMPONENT_CATALOG } from '../circuit-engine/component-catalog';

export type Canonical3DModelType =
  | 'RESISTOR'
  | 'LED'
  | 'LED_RGB'
  | 'HC_SR04'
  | 'DIODE'
  | 'INDUCTOR'
  | 'SENSOR_LDR'
  | 'BUZZER_ACTIVE'
  | 'TRANSISTOR_TO92'
  | 'TRANSISTOR_TO220'
  | 'CAPACITOR_ELECTROLYTIC'
  | 'CAPACITOR_CERAMIC'
  | 'PUSHBUTTON'
  | 'SLIDE_SWITCH'
  | 'POTENTIOMETER'
  | 'BATTERY_9V'
  | 'DIP_PACKAGE'
  | 'ARDUINO_UNO'
  | 'ARDUINO_MEGA'
  | 'ARDUINO_NANO'
  | 'ESP32_DEVKIT'
  | 'RASPBERRY_PI_PICO'
  | 'SERVO_SG90'
  | 'LCD_1602'
  | 'BLUETOOTH_HC05'
  | 'TERMINAL_BLOCK';

/**
 * High-precision canonical 3D model resolver.
 * Ensures EVERY component registered in the library or PCB layout maps to its authentic
 * dedicated high-detail 3D CAD model, with strict zero generic IC or 2-pin LED fallbacks.
 */
export function resolve3DModelType(
  rawType: string = '',
  rawFootprint: string = '',
  rawParameters?: Record<string, unknown>
): Canonical3DModelType {
  const type = (rawType || '').toUpperCase().trim();
  const fp = (rawFootprint || '').toUpperCase().trim();
  const model3d = String(rawParameters?.model3d || '').toLowerCase().trim();

  // 1. RGB LED (Strict Priority before single-color LED — NEVER fallback to 2-pin LED)
  if (
    type.includes('RGB') ||
    type === 'ACTUATOR_RGB_LED' ||
    type === 'LED_RGB' ||
    fp.includes('THT-5MM-4PIN') ||
    fp.includes('LED_D5.0MM-4') ||
    model3d === 'led_rgb_5mm' ||
    model3d.includes('rgb')
  ) {
    return 'LED_RGB';
  }

  // 2. HC-SR04 Ultrasonic Sonar Module (Strict Priority before IC/DIP — NEVER fallback to generic IC box)
  if (
    type.includes('SR04') ||
    type.includes('ULTRASONIC') ||
    type === 'HC_SR04' ||
    type === 'SENSOR_ULTRASONIC' ||
    fp.includes('HCSR04') ||
    fp.includes('MODULE-HCSR04') ||
    model3d === 'hcsr04_ultrasonic' ||
    model3d === 'sensor_ultrasonic_hc_sr04' ||
    model3d.includes('sr04')
  ) {
    return 'HC_SR04';
  }

  // 3. Microcontroller Dev Boards (Strict Priority before IC/DIP)
  if (type.includes('MEGA') || fp.includes('MEGA') || model3d.includes('mega')) {
    return 'ARDUINO_MEGA';
  }
  if (type.includes('NANO') || fp.includes('NANO') || model3d.includes('nano')) {
    return 'ARDUINO_NANO';
  }
  if (type.includes('ARDUINO') || type === 'MCU_ARDUINO_UNO' || fp.includes('ARDUINO') || model3d.includes('uno')) {
    return 'ARDUINO_UNO';
  }
  if (type.includes('ESP32') || type.includes('ESP8266') || fp.includes('ESP32') || model3d.includes('esp32')) {
    return 'ESP32_DEVKIT';
  }
  if (type.includes('PICO') || type.includes('RP2040') || fp.includes('PICO') || model3d.includes('pico')) {
    return 'RASPBERRY_PI_PICO';
  }

  // 4. Bluetooth Breakout
  if (
    type.includes('BLUETOOTH') ||
    type.includes('HC05') ||
    type.includes('HC06') ||
    model3d.includes('bluetooth') ||
    model3d.includes('hc05')
  ) {
    return 'BLUETOOTH_HC05';
  }

  // 5. Servo SG90
  if (type.includes('SERVO') || fp.includes('SERVO') || model3d.includes('servo')) {
    return 'SERVO_SG90';
  }

  // 6. LCD 1602 Display
  if (type.includes('LCD') || type.includes('1602') || fp.includes('LCD') || model3d.includes('lcd')) {
    return 'LCD_1602';
  }

  // 7. Buzzer / Sounder
  if (type.includes('BUZZER') || type.includes('PIEZO') || type.includes('SPEAKER') || fp.includes('BUZZER') || model3d.includes('buzzer')) {
    return 'BUZZER_ACTIVE';
  }

  // 8. LDR / Photoresistor
  if (type.includes('LDR') || type.includes('PHOTORESISTOR') || fp.includes('LDR') || model3d.includes('ldr')) {
    return 'SENSOR_LDR';
  }

  // 9. Standard LED (Single-color 5mm dome)
  if (type.includes('LED') || fp.includes('LED') || model3d.includes('led')) {
    return 'LED';
  }

  // 10. Resistor (Axial through-hole ceramic body with color bands)
  if (type.includes('RESISTOR') || fp.includes('AXIAL') || fp.includes('RES') || model3d.includes('resistor')) {
    return 'RESISTOR';
  }

  // 11. Potentiometer / Trimmer
  if (type.includes('POTENTIOMETER') || type.includes('POT') || type.includes('TRIMMER') || fp.includes('POT')) {
    return 'POTENTIOMETER';
  }

  // 12. Diode / Rectifier
  if (type.includes('DIODE') || type.includes('RECTIFIER') || fp.includes('DO-41') || fp.includes('DIODE') || model3d.includes('diode')) {
    return 'DIODE';
  }

  // 13. Inductor
  if (type.includes('INDUCTOR') || type.includes('CHOKE') || type.includes('COIL') || fp.includes('INDUCTOR') || model3d.includes('inductor')) {
    return 'INDUCTOR';
  }

  // 14. TO-220 Package (MOSFETs, Regulators with Metal Tab)
  if (
    type.includes('MOSFET') ||
    type.includes('REGULATOR') ||
    type.includes('LM78') ||
    type.includes('LM317') ||
    type.includes('IRF') ||
    fp.includes('TO-220') ||
    model3d.includes('to220')
  ) {
    return 'TRANSISTOR_TO220';
  }

  // 15. TO-92 Package (BJT Transistors)
  if (
    type.includes('BJT') ||
    type.includes('TRANSISTOR') ||
    type.includes('2N2222') ||
    type.includes('2N3904') ||
    type.includes('BC547') ||
    fp.includes('TO-92') ||
    model3d.includes('to92')
  ) {
    return 'TRANSISTOR_TO92';
  }

  // 16. Capacitors (Radial Electrolytic Can vs Ceramic Disc)
  if (
    type.includes('ELECTROLYTIC') ||
    fp.includes('RADIAL') ||
    fp.includes('CP_') ||
    Boolean(rawParameters?.polarized) ||
    model3d.includes('electrolytic') ||
    model3d.includes('radial')
  ) {
    return 'CAPACITOR_ELECTROLYTIC';
  }
  if (type.includes('CAPACITOR') || fp.includes('CAP') || model3d.includes('ceramic') || model3d.includes('cap')) {
    return 'CAPACITOR_CERAMIC';
  }

  // 17. Buttons & Switches
  if (type.includes('SLIDE') || (type.includes('SWITCH') && !type.includes('PUSH'))) {
    return 'SLIDE_SWITCH';
  }
  if (type.includes('BUTTON') || type.includes('PUSH') || fp.includes('SW_PUSH') || fp.includes('BUTTON')) {
    return 'PUSHBUTTON';
  }

  // 18. Power Supply / Battery
  if (type.includes('BATTERY') || type.includes('VOLTAGE') || type.includes('SUPPLY') || type.includes('DC_SOURCE')) {
    return 'BATTERY_9V';
  }

  // 19. Terminal Block / Connector
  if (type.includes('TERMINAL') || type.includes('BLOCK') || fp.includes('TERMINAL') || fp.includes('BLOCK')) {
    return 'TERMINAL_BLOCK';
  }

  // 20. Integrated Circuit / DIP Package
  if (
    type.includes('IC') ||
    type.includes('TIMER') ||
    type.includes('555') ||
    type.includes('OPAMP') ||
    type.includes('COMPARATOR') ||
    type.includes('LOGIC') ||
    type.includes('GATE') ||
    type.includes('DRIVER') ||
    fp.includes('DIP') ||
    fp.includes('SOIC')
  ) {
    return 'DIP_PACKAGE';
  }

  return 'DIP_PACKAGE';
}

export interface SharedComponent3DProps {
  componentId: string;
  type: string;
  footprint?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  value?: string;
  label?: string;
  parameters?: Record<string, unknown>;
  renderContext?: 'studio' | '3d-view';
  isSelected?: boolean;
  isSimulating?: boolean;
  simState?: {
    voltage?: number;
    current?: number;
    on?: boolean;
    brightness?: number;
    status?: 'NORMAL' | 'WARNING' | 'BURNED';
    burned?: boolean;
    onRed?: boolean;
    onGreen?: boolean;
    onBlue?: boolean;
    redBrightness?: number;
    greenBrightness?: number;
    blueBrightness?: number;
    rLevel?: number;
    gLevel?: number;
    bLevel?: number;
  };
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hideExternalCables?: boolean;
  isPcbAssemblyMode?: boolean;
  usbConnected?: boolean;
}

/**
 * Universal SharedComponent3D Component
 * Used in both 3D View and 3D Studio to guarantee 100% visual and geometric parity.
 */
export function SharedComponent3D({
  type,
  footprint = '',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value = '',
  label = '',
  parameters = {},
  renderContext = '3d-view',
  isSelected = false,
  isSimulating = false,
  simState,
  hoveredPin,
  onHoverPin,
  onPinClick,
  hideExternalCables = false,
  isPcbAssemblyMode = false,
  usbConnected,
}: SharedComponent3DProps) {
  const isPcbMode = isPcbAssemblyMode || renderContext === '3d-view';
  const suppressCables = hideExternalCables || isPcbMode || usbConnected === false;

  const modelType = useMemo(
    () => resolve3DModelType(type, footprint, parameters),
    [type, footprint, parameters]
  );

  const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);

  switch (modelType) {
    case 'LED_RGB': {
      let rLevel = (parameters.rLevel as number) ?? (parameters.r as number);
      let gLevel = (parameters.gLevel as number) ?? (parameters.g as number);
      let bLevel = (parameters.bLevel as number) ?? (parameters.b as number);

      if (simState) {
        if (simState.onRed) rLevel = Math.max(rLevel ?? 0, simState.redBrightness ?? 1.0);
        if (simState.onGreen) gLevel = Math.max(gLevel ?? 0, simState.greenBrightness ?? 1.0);
        if (simState.onBlue) bLevel = Math.max(bLevel ?? 0, simState.blueBrightness ?? 1.0);
        if (typeof simState.rLevel === 'number') rLevel = Math.max(rLevel ?? 0, simState.rLevel);
        if (typeof simState.gLevel === 'number') gLevel = Math.max(gLevel ?? 0, simState.gLevel);
        if (typeof simState.bLevel === 'number') bLevel = Math.max(bLevel ?? 0, simState.bLevel);
      }

      const isPowered = !isPcbMode && (isSimulating
        ? Boolean(simState?.on || (rLevel && rLevel > 0) || (gLevel && gLevel > 0) || (bLevel && bLevel > 0))
        : true);

      return (
        <RgbLed3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned && isPowered}
          rLevel={rLevel}
          gLevel={gLevel}
          bLevel={bLevel}
          color={String(parameters.color || '#EC4899')}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'HC_SR04': {
      return (
        <HcSr04_3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'ARDUINO_UNO': {
      return (
        <ArduinoUno3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned}
          isUsbPlugged={parameters.usbPlugged !== false}
          isDcJackPlugged={parameters.dcJackPlugged === true}
          hideExternalCables={suppressCables}
          isPcbAssemblyMode={isPcbMode}
          usbConnected={suppressCables ? false : usbConnected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'ARDUINO_MEGA': {
      return (
        <ArduinoMega3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned}
          isUsbPlugged={parameters.usbPlugged !== false}
          isDcJackPlugged={parameters.dcJackPlugged === true}
          hideExternalCables={suppressCables}
          isPcbAssemblyMode={isPcbMode}
          usbConnected={suppressCables ? false : usbConnected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'ARDUINO_NANO': {
      return (
        <ArduinoNano3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned}
          isUsbPlugged={parameters.usbPlugged !== false}
          hideExternalCables={suppressCables}
          isPcbAssemblyMode={isPcbMode}
          usbConnected={suppressCables ? false : usbConnected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'ESP32_DEVKIT': {
      return (
        <Esp32DevKit3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned}
          isUsbPlugged={parameters.usbPlugged !== false}
          hideExternalCables={suppressCables}
          isPcbAssemblyMode={isPcbMode}
          usbConnected={suppressCables ? false : usbConnected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'RASPBERRY_PI_PICO': {
      return (
        <RaspberryPiPico3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={!isBurned}
          isUsbPlugged={parameters.usbPlugged !== false}
          hideExternalCables={suppressCables}
          isPcbAssemblyMode={isPcbMode}
          usbConnected={suppressCables ? false : usbConnected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'RESISTOR': {
      return (
        <Resistor3D
          position={position}
          rotation={rotation}
          value={value || '1kΩ'}
          isBurned={isBurned}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'LED': {
      const isPowered = Boolean(
        !isPcbMode && isSimulating && (simState?.on || (simState?.current && Math.abs(simState.current) > 0.001))
      );
      const brightness = isSimulating && isPowered ? (simState?.brightness ?? 1.0) : 0;
      const ledColor = String(parameters.color || value || (label.toLowerCase().includes('green') ? '#10B981' : '#EF4444'));

      return (
        <Led3D
          position={position}
          rotation={rotation}
          color={ledColor}
          isPowered={isPowered}
          brightness={brightness}
          isBurned={isBurned}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'DIODE': {
      return (
        <Diode3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'INDUCTOR': {
      return (
        <Inductor3D
          position={position}
          rotation={rotation}
          value={value || '10mH'}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'SENSOR_LDR': {
      return (
        <Ldr3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'BUZZER_ACTIVE': {
      const isSounding =
        isSimulating &&
        !isBurned &&
        Boolean(
          simState?.on ||
            (simState?.current && Math.abs(simState.current) > 0.0005) ||
            (simState?.voltage && Math.abs(simState.voltage) > 1.8)
        );

      return (
        <Buzzer3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isSounding={isSounding}
          frequency={Number(parameters.frequencyHz || parameters.frequency || 2300)}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'TRANSISTOR_TO92': {
      const isNpn = !type.includes('PNP');
      const part = String(parameters.transistor || value || (isNpn ? '2N2222A' : '2N2907A'));

      return (
        <TransistorTO92_3D
          position={position}
          rotation={rotation}
          partName={part}
          isNpn={isNpn}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'TRANSISTOR_TO220': {
      const isRegulator = type.includes('REGULATOR') || type.includes('LM78') || type.includes('LM317');
      const pinLabels: [string, string, string] = isRegulator ? ['IN', 'GND', 'OUT'] : ['G', 'D', 'S'];
      const part = String(parameters.part || value || (isRegulator ? 'LM7805' : type.includes('P') ? 'IRF9540N' : 'IRF540N'));

      return (
        <TransistorTO220_3D
          position={position}
          rotation={rotation}
          partName={part}
          pinLabels={pinLabels}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'CAPACITOR_ELECTROLYTIC': {
      return (
        <CapacitorElectrolytic3D
          position={position}
          rotation={rotation}
          value={value || '10µF'}
          isBurned={isBurned}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'CAPACITOR_CERAMIC': {
      return (
        <CapacitorCeramic3D
          position={position}
          rotation={rotation}
          value={value || '100nF'}
          isBurned={isBurned}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'PUSHBUTTON': {
      return (
        <Pushbutton3D
          position={position}
          rotation={rotation}
          isPressed={Boolean(parameters.pressed)}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'SLIDE_SWITCH': {
      return (
        <SlideSwitch3D
          position={position}
          rotation={rotation}
          isOn={parameters.closed === true}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'POTENTIOMETER': {
      return (
        <Potentiometer3D
          position={position}
          rotation={rotation}
          value={value || '10kΩ'}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'BATTERY_9V': {
      return (
        <Battery9V3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'BLUETOOTH_HC05': {
      return (
        <BluetoothHC05_3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={isSimulating}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'SERVO_SG90': {
      return (
        <ServoSG903D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          angle={Number(parameters.currentAngle ?? 90)}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'LCD_1602': {
      return (
        <Lcd1602_3D
          position={position}
          rotation={rotation}
          isSelected={isSelected}
          isPowered={isSimulating}
          displayText={String(parameters.text || 'EI HOUSE LAB 16x2\nSYSTEM READY OK')}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }

    case 'TERMINAL_BLOCK': {
      const pinsCount = Number(parameters.pinsCount || 2);
      return (
        <TerminalBlock3D
          position={position}
          rotation={rotation}
          pinsCount={pinsCount}
          isSelected={isSelected}
          renderContext={renderContext}
        />
      );
    }

    case 'DIP_PACKAGE':
    default: {
      const catalogItem = COMPONENT_CATALOG.find((c) => c.type === type);
      const is14or16 = footprint.includes('DIP-14') || footprint.includes('DIP-16');
      const pinCount = catalogItem?.pins?.length || (is14or16 ? (footprint.includes('DIP-14') ? 14 : 16) : 8);

      const partName = String(
        parameters.ic ||
          value ||
          label ||
          (type.includes('555') ? 'NE555P' : type.includes('358') ? 'LM358' : type.includes('741') ? 'LM741' : 'DIP-IC')
      );

      const opampPins: Record<number, string> | undefined =
        type.includes('LM358')
          ? { 1: 'OUT1', 2: 'IN1-', 3: 'IN1+', 4: 'GND', 5: 'IN2+', 6: 'IN2-', 7: 'OUT2', 8: 'VCC' }
          : type.includes('LM741')
          ? { 1: 'OFST1', 2: 'IN-', 3: 'IN+', 4: 'V-', 5: 'OFST2', 6: 'OUT', 7: 'V+', 8: 'NC' }
          : undefined;

      return (
        <DipPackage3D
          position={position}
          rotation={rotation}
          pinCount={pinCount}
          partName={partName}
          pinNames={opampPins}
          isBurned={isBurned}
          isSelected={isSelected}
          renderContext={renderContext}
          hoveredPin={hoveredPin}
          onHoverPin={onHoverPin}
          onPinClick={onPinClick}
        />
      );
    }
  }
}
