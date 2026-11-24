import { PhysicalSpec, PcbComponentPlacement } from '../types';
import { resolvePhysicalSpec } from '../circuit-engine/component-physical-registry';

/**
 * Authentic IPC-7351 / KiCad Production PCBA Silkscreen Engine
 * Single unified source of truth for 2D PCB Canvas and 3D High-Res Silkscreen Decal
 */

export interface ComponentFootprintSpec {
  designator: string;
  type: string;
  value: string;
  x: number;
  y: number;
  rotation: number;
  physicalSpec?: PhysicalSpec;
}

export interface SilkscreenLabelLayout {
  designatorText: string;
  valueText: string;
  designatorPos: { x: number; y: number };
  valuePos: { x: number; y: number };
  outlineType:
    | 'box'
    | 'dip'
    | 'axial_resistor'
    | 'electrolytic_cap'
    | 'ceramic_cap'
    | 'led'
    | 'rgb_led'
    | 'transistor'
    | 'transistor_to92'
    | 'transistor_to220'
    | 'header'
    | 'dev_board'
    | 'module'
    | 'diode'
    | 'inductor'
    | 'potentiometer'
    | 'buzzer';
  boxBounds?: { x: number; y: number; width: number; height: number };
  radius?: number;
}

export interface SilkscreenDescriptor {
  family:
    | 'electrolytic_cap'
    | 'ceramic_cap'
    | 'tantalum_cap'
    | 'transistor_to92'
    | 'transistor_to220'
    | 'transistor_smd'
    | 'diode'
    | 'led'
    | 'rgb_led'
    | 'dip_ic'
    | 'resistor'
    | 'inductor'
    | 'potentiometer'
    | 'buzzer'
    | 'battery'
    | 'pushbutton'
    | 'header'
    | 'dev_board'
    | 'module'
    | 'generic';
  outlineType: string;
  hasPolarity: boolean;
  hasPlusMark: boolean;
  hasMinusMark: boolean;
  hasCathodeBand: boolean;
  hasCathodeFlatEdge: boolean;
  hasSquarePad1: boolean;
  hasNotch: boolean;
  hasPin1Dot: boolean;
  hasHeatsinkTab: boolean;
  hasDiodeSymbol: boolean;
  pinLabels: string[];
  headerPinLabels: string[];
  directionalArrow?: string;
  courtyardWidthMm: number;
  courtyardDepthMm: number;
  bodyWidthMm: number;
  bodyDepthMm: number;
  mechanicalOrientation?: 'u-notch' | 'd-flat' | 'tab-bar' | 'cathode-band' | 'none';
  pin1Indicator?: { type: 'dot' | 'triangle'; hasMarker: boolean };
}

export interface SilkscreenRenderOptions {
  scale: number;
  isSelected?: boolean;
  silkColor?: string;
  is3dDecal?: boolean;
}

export class FootprintRenderer {
  /**
   * Generates a comprehensive IPC-7351 silkscreen descriptor for any component
   */
  public static getSilkscreenDescriptor(comp: {
    type?: string;
    value?: string;
    footprint?: string;
    designator?: string;
    parameters?: Record<string, unknown>;
  }): SilkscreenDescriptor {
    const rawType = (comp.type || '').toUpperCase();
    const rawVal = (comp.value || '').toUpperCase();
    const rawFp = (comp.footprint || '').toUpperCase();

    const spec = resolvePhysicalSpec(comp.type || '', comp.footprint);
    const cw = spec.courtyardMm?.width || spec.dimensionsMm?.width || 10;
    const cd = spec.courtyardMm?.depth || spec.dimensionsMm?.depth || 8;
    const bw = spec.bodyDimensionsMm?.width || spec.dimensionsMm?.width || cw;
    const bd = spec.bodyDimensionsMm?.depth || spec.dimensionsMm?.depth || cd;

    // 1. RGB LED (4-Pin Through-Hole)
    if (
      rawType.includes('RGB') ||
      rawType === 'ACTUATOR_RGB_LED' ||
      rawFp.includes('THT-5MM-4PIN') ||
      rawFp.includes('LED_D5.0MM-4')
    ) {
      return {
        family: 'rgb_led',
        outlineType: 'rgb_led',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: true,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['R', 'COM', 'G', 'B'],
        headerPinLabels: [],
        courtyardWidthMm: 11.0,
        courtyardDepthMm: 5.6,
        bodyWidthMm: 5.0,
        bodyDepthMm: 5.0,
      };
    }

    // 2. Standard Single-Color LED (5mm/3mm)
    if (rawType.includes('LED')) {
      return {
        family: 'led',
        outlineType: 'led',
        hasPolarity: true,
        hasPlusMark: true,
        hasMinusMark: true,
        hasCathodeBand: false,
        hasCathodeFlatEdge: true,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['+', '-'],
        headerPinLabels: [],
        courtyardWidthMm: 8.0,
        courtyardDepthMm: 8.0,
        bodyWidthMm: 5.0,
        bodyDepthMm: 5.0,
      };
    }

    // 3. Electrolytic Capacitor (Radial / Polarized)
    const isElectrolytic =
      rawType.includes('ELECTROLYTIC') ||
      rawType.includes('RADIAL') ||
      rawFp.includes('RADIAL') ||
      rawFp.includes('CP_') ||
      Boolean(comp.parameters?.polarized) ||
      (rawType.includes('CAPACITOR') && (rawVal.includes('UF') || rawVal.includes('µF') || rawVal.includes('MF')));

    if (isElectrolytic) {
      return {
        family: 'electrolytic_cap',
        outlineType: 'electrolytic_cap',
        hasPolarity: true,
        hasPlusMark: true,
        hasMinusMark: true,
        hasCathodeBand: true,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['+', '-'],
        headerPinLabels: [],
        courtyardWidthMm: 8.4,
        courtyardDepthMm: 8.4,
        bodyWidthMm: 6.3,
        bodyDepthMm: 6.3,
      };
    }

    // 4. Ceramic Capacitor (Non-Polarized MLCC / Disc)
    if (rawType.includes('CAPACITOR')) {
      return {
        family: 'ceramic_cap',
        outlineType: 'ceramic_cap',
        hasPolarity: false,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: false,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels: [],
        courtyardWidthMm: 7.0,
        courtyardDepthMm: 3.6,
        bodyWidthMm: 5.0,
        bodyDepthMm: 2.5,
      };
    }

    // 5. TO-220 Power Semiconductors (IRLZ44N, L7805CV, TIP122, LM317)
    const isTo220 =
      rawType.includes('TO220') ||
      rawType.includes('TO-220') ||
      rawFp.includes('TO-220') ||
      rawType.includes('IRLZ44N') ||
      rawType.includes('IRF') ||
      rawType.includes('7805') ||
      rawType.includes('LM317') ||
      rawType.includes('TIP122') ||
      spec.packageCode === 'TO-220';

    if (isTo220) {
      let pinLabels = ['1', '2', '3'];
      if (rawType.includes('7805') || rawType.includes('LM317') || rawVal.includes('7805')) {
        pinLabels = ['IN', 'GND', 'OUT'];
      } else if (rawType.includes('MOSFET') || rawType.includes('IRL') || rawType.includes('IRF')) {
        pinLabels = ['G', 'D', 'S'];
      } else {
        pinLabels = ['B', 'C', 'E'];
      }
      return {
        family: 'transistor_to220',
        outlineType: 'transistor_to220',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: true,
        hasDiodeSymbol: false,
        pinLabels,
        headerPinLabels: [],
        courtyardWidthMm: 11.2,
        courtyardDepthMm: 5.5,
        bodyWidthMm: 10.16,
        bodyDepthMm: 4.7,
        mechanicalOrientation: 'tab-bar',
        pin1Indicator: { type: 'triangle', hasMarker: true },
      };
    }

    // 6. TO-92 Transistors (2N2222, BC547, 2N3904, 2N3906)
    const isTo92 =
      rawType.includes('TO92') ||
      rawType.includes('TO-92') ||
      rawFp.includes('TO-92') ||
      rawType.includes('2N2222') ||
      rawType.includes('2N3904') ||
      rawType.includes('2N3906') ||
      rawType.includes('BC547') ||
      rawType.includes('TRANSISTOR') ||
      rawType.includes('BJT');

    if (isTo92) {
      const pinLabels = rawType.includes('BC547') ? ['C', 'B', 'E'] : ['E', 'B', 'C'];
      return {
        family: 'transistor_to92',
        outlineType: 'transistor_to92',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: true,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels,
        headerPinLabels: [],
        courtyardWidthMm: 6.0,
        courtyardDepthMm: 5.0,
        bodyWidthMm: 4.8,
        bodyDepthMm: 3.8,
        mechanicalOrientation: 'd-flat',
        pin1Indicator: { type: 'triangle', hasMarker: true },
      };
    }

    // 7. Diodes (1N4007, 1N4148, Zener, Schottky)
    if (rawType.includes('DIODE') || rawFp.includes('DO-41') || rawType.includes('1N4007') || rawType.includes('1N4148')) {
      return {
        family: 'diode',
        outlineType: 'diode',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: true,
        hasCathodeBand: true,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: true,
        pinLabels: ['K', 'A'],
        headerPinLabels: [],
        courtyardWidthMm: 10.16,
        courtyardDepthMm: 4.0,
        bodyWidthMm: 5.0,
        bodyDepthMm: 2.6,
        mechanicalOrientation: 'cathode-band',
      };
    }

    // 8. DIP Integrated Circuits (NE555, 74HC*, LM358, LM324, ATmega328P)
    const isDip =
      rawType.includes('DIP') ||
      rawFp.includes('DIP') ||
      rawType.includes('555') ||
      rawType.includes('74HC') ||
      rawType.includes('358') ||
      rawType.includes('324') ||
      rawType.includes('ATMEGA') ||
      rawType.includes('IC');

    if (isDip) {
      return {
        family: 'dip_ic',
        outlineType: 'dip',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: true,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['1'],
        headerPinLabels: [],
        courtyardWidthMm: cw,
        courtyardDepthMm: cd,
        bodyWidthMm: bw,
        bodyDepthMm: bd,
        mechanicalOrientation: 'u-notch',
        pin1Indicator: { type: 'dot', hasMarker: true },
      };
    }

    // 9. HC-SR04 Ultrasonic Sensor Module
    if (rawType.includes('SR04') || rawType.includes('ULTRASONIC') || rawFp.includes('HCSR04')) {
      return {
        family: 'module',
        outlineType: 'module',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels: ['VCC', 'TRIG', 'ECHO', 'GND'],
        directionalArrow: 'FRONT ->',
        courtyardWidthMm: 46.0,
        courtyardDepthMm: 21.0,
        bodyWidthMm: 45.0,
        bodyDepthMm: 20.0,
      };
    }

    // 9.1 Bluetooth HC-05 / HC-06 Module
    const isBluetooth =
      rawType.includes('BLUETOOTH') ||
      rawType.includes('HC05') ||
      rawType.includes('HC-05') ||
      rawType.includes('HC06') ||
      rawType.includes('HC-06') ||
      (comp.designator || '').startsWith('BT_MOD') ||
      rawFp.includes('HC05');

    if (isBluetooth) {
      return {
        family: 'module',
        outlineType: 'bluetooth',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels: ['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'],
        courtyardWidthMm: 29.0,
        courtyardDepthMm: 15.0,
        bodyWidthMm: 27.0,
        bodyDepthMm: 13.0,
      };
    }

    // 10. Dev Boards (Arduino Uno, Nano, Mega, ESP32, Pico)
    const isDevBoard =
      rawType.includes('ARDUINO') ||
      rawType.includes('UNO') ||
      rawType.includes('NANO') ||
      rawType.includes('MEGA') ||
      rawType.includes('ESP32') ||
      rawType.includes('PICO') ||
      rawType.includes('DEVBOARD') ||
      spec.placementClass === 'dev-board';

    if (isDevBoard) {
      let headerPinLabels = ['5V', 'GND', 'A0', 'A5', 'D0', 'D13'];
      if (rawType.includes('NANO')) {
        headerPinLabels = ['TX', 'RX', 'RST', 'GND', 'D2', 'D13', '5V', 'A0-A7'];
      } else if (rawType.includes('ESP32')) {
        headerPinLabels = ['EN', 'VP', 'VN', 'GND', 'VIN', '3V3', 'D15', 'D23'];
      } else if (rawType.includes('PICO')) {
        headerPinLabels = ['GP0', 'GP15', 'GP16', 'GP28', 'GND', '3V3', 'VBUS'];
      }
      return {
        family: 'dev_board',
        outlineType: 'dev_board',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels,
        courtyardWidthMm: cw,
        courtyardDepthMm: cd,
        bodyWidthMm: bw,
        bodyDepthMm: bd,
      };
    }

    // 11. Potentiometers / Trimmers
    if (rawType.includes('POTENTIOMETER') || rawType.includes('POT') || rawType.includes('TRIMMER')) {
      return {
        family: 'potentiometer',
        outlineType: 'potentiometer',
        hasPolarity: true,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['1', '2', '3'],
        headerPinLabels: [],
        courtyardWidthMm: 11.0,
        courtyardDepthMm: 10.0,
        bodyWidthMm: 9.5,
        bodyDepthMm: 9.5,
      };
    }

    // 12. Buzzer / Acoustic Transducer
    if (rawType.includes('BUZZER') || rawType.includes('PIEZO') || rawType.includes('SPEAKER')) {
      return {
        family: 'buzzer',
        outlineType: 'buzzer',
        hasPolarity: true,
        hasPlusMark: true,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['+'],
        headerPinLabels: [],
        courtyardWidthMm: 13.0,
        courtyardDepthMm: 13.0,
        bodyWidthMm: 12.0,
        bodyDepthMm: 12.0,
      };
    }

    // 13. Passives: Resistors & Inductors
    if (rawType.includes('INDUCTOR') || rawType.includes('CHOKE') || rawType.includes('COIL')) {
      return {
        family: 'inductor',
        outlineType: 'inductor',
        hasPolarity: false,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: false,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels: [],
        courtyardWidthMm: 10.16,
        courtyardDepthMm: 4.5,
        bodyWidthMm: 8.0,
        bodyDepthMm: 3.5,
      };
    }

    if (rawType.includes('RESISTOR') || rawType.includes('LDR')) {
      return {
        family: 'resistor',
        outlineType: 'axial_resistor',
        hasPolarity: false,
        hasPlusMark: false,
        hasMinusMark: false,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: false,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: [],
        headerPinLabels: [],
        courtyardWidthMm: 10.16,
        courtyardDepthMm: 4.0,
        bodyWidthMm: 6.5,
        bodyDepthMm: 2.5,
      };
    }

    // 14. Batteries & Power Cells (BT1, Coin Cell, 9V Snap, 18650 Holder - excluding Bluetooth modules!)
    if (
      !isBluetooth &&
      (rawType.includes('BATTERY') ||
        rawType.includes('CELL') ||
        /^(BT|BATT?)\d+$/i.test(comp.designator || ''))
    ) {
      return {
        family: 'battery',
        outlineType: 'battery',
        hasPolarity: true,
        hasPlusMark: true,
        hasMinusMark: true,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: false,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['+', '-'],
        headerPinLabels: [],
        courtyardWidthMm: cw,
        courtyardDepthMm: cd,
        bodyWidthMm: bw,
        bodyDepthMm: bd,
      };
    }

    // 15. Headers / Connectors / Terminal Blocks
    if (
      rawType.includes('HEADER') ||
      rawType.includes('CONNECTOR') ||
      rawType.includes('TERMINAL')
    ) {
      return {
        family: 'header',
        outlineType: 'header',
        hasPolarity: true,
        hasPlusMark: true,
        hasMinusMark: true,
        hasCathodeBand: false,
        hasCathodeFlatEdge: false,
        hasSquarePad1: true,
        hasNotch: false,
        hasPin1Dot: true,
        hasHeatsinkTab: false,
        hasDiodeSymbol: false,
        pinLabels: ['1', '2'],
        headerPinLabels: ['1', '2'],
        courtyardWidthMm: cw,
        courtyardDepthMm: cd,
        bodyWidthMm: bw,
        bodyDepthMm: bd,
      };
    }

    // Default / Generic Box
    return {
      family: 'generic',
      outlineType: 'box',
      hasPolarity: false,
      hasPlusMark: false,
      hasMinusMark: false,
      hasCathodeBand: false,
      hasCathodeFlatEdge: false,
      hasSquarePad1: false,
      hasNotch: false,
      hasPin1Dot: false,
      hasHeatsinkTab: false,
      hasDiodeSymbol: false,
      pinLabels: [],
      headerPinLabels: [],
      courtyardWidthMm: cw,
      courtyardDepthMm: cd,
      bodyWidthMm: bw,
      bodyDepthMm: bd,
    };
  }

  /**
   * Backwards-compatible layout calculation for designator and value placements
   */
  public static calculateSilkscreenLayout(spec: ComponentFootprintSpec): SilkscreenLabelLayout {
    const desc = FootprintRenderer.getSilkscreenDescriptor(spec);
    const { designator, value, x, y } = spec;
    const cw = desc.courtyardWidthMm;
    const cd = desc.courtyardDepthMm;

    let outlineType: SilkscreenLabelLayout['outlineType'] = 'box';
    if (desc.family === 'electrolytic_cap') outlineType = 'electrolytic_cap';
    else if (desc.family === 'ceramic_cap') outlineType = 'ceramic_cap';
    else if (desc.family === 'transistor_to220') outlineType = 'transistor_to220';
    else if (desc.family === 'transistor_to92') outlineType = 'transistor';
    else if (desc.family === 'rgb_led') outlineType = 'rgb_led';
    else if (desc.family === 'led') outlineType = 'led';
    else if (desc.family === 'dip_ic') outlineType = 'dip';
    else if (desc.family === 'resistor' || desc.family === 'diode') outlineType = 'axial_resistor';
    else if (desc.family === 'dev_board') outlineType = 'dev_board';
    else if (desc.family === 'module') outlineType = 'module';
    else if (desc.family === 'header') outlineType = 'header';

    return {
      designatorText: designator,
      valueText: '',
      designatorPos: { x: x - cw / 2, y: y - cd / 2 - 1.5 },
      valuePos: { x: x - cw / 2, y: y + cd / 2 + 2.8 },
      outlineType,
      boxBounds: { x: x - cw / 2, y: y - cd / 2, width: cw, height: cd },
      radius: desc.family === 'electrolytic_cap' ? 4.2 : desc.family === 'led' ? 4.0 : undefined,
    };
  }

  /**
   * High-Precision Shared Silkscreen Renderer
   * Renders authentic IPC-7351 EDA silkscreen onto any Canvas 2D Context.
   * Consumed identically by Pcb2dEditor.tsx and Pcb3dViewer.tsx for 100% 2D-3D parity.
   */
  public static renderSilkscreen(
    ctx: CanvasRenderingContext2D,
    comp: PcbComponentPlacement,
    options: SilkscreenRenderOptions
  ): void {
    const { scale, isSelected = false, silkColor = '#F8FAFC', is3dDecal = false } = options;
    const desc = FootprintRenderer.getSilkscreenDescriptor(comp);

    ctx.save();
    ctx.strokeStyle = isSelected ? '#38BDF8' : silkColor;
    ctx.fillStyle = isSelected ? '#38BDF8' : silkColor;
    ctx.lineWidth = Math.max(1, Math.round(0.18 * scale)); // Standard IPC 0.18mm silkscreen stroke

    const bw = desc.bodyWidthMm * scale;
    const bd = desc.bodyDepthMm * scale;
    const cw = desc.courtyardWidthMm * scale;
    const cd = desc.courtyardDepthMm * scale;

    switch (desc.family) {
      case 'electrolytic_cap': {
        const r = (desc.bodyWidthMm / 2) * scale;
        // Circular outer body
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // High-contrast solid/thick white negative crescent segment covering cathode half-arc (+X side)
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.arc(r * 0.35, 0, r * 0.72, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
        ctx.fillStyle = isSelected
          ? 'rgba(56, 189, 248, 0.75)'
          : is3dDecal
          ? 'rgba(248, 250, 252, 0.9)'
          : 'rgba(248, 250, 252, 0.85)';
        ctx.fill();
        ctx.stroke();

        // High-contrast hatch lines across negative crescent band
        const hatchStep = Math.max(2, Math.round(0.8 * scale));
        ctx.lineWidth = Math.max(1, Math.round(0.14 * scale));
        for (let y = -r * 0.65; y <= r * 0.65; y += hatchStep) {
          const x1 = Math.sqrt(Math.max(0, r * r - y * y));
          const x2 = r * 0.42;
          if (x1 > x2) {
            ctx.beginPath();
            ctx.moveTo(x2, y);
            ctx.lineTo(x1, y);
            ctx.stroke();
          }
        }
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));

        // Bold '-' symbol placed cleanly OUTSIDE the circle on the negative pin side (+X)
        const fontPol = Math.max(11, Math.round(2.6 * scale));
        ctx.font = `bold ${fontPol}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isSelected ? '#38BDF8' : silkColor;
        ctx.fillText('-', r + 2.0 * scale, 0);

        // Bold '+' symbol placed cleanly OUTSIDE the circle on the positive pin side (-X)
        ctx.fillText('+', -r - 2.0 * scale, 0);
        break;
      }

      case 'ceramic_cap': {
        // Compact rounded-pill / oval outline between leads, strictly ZERO polarity markings
        const pw = Math.max(5.0 * scale, bw);
        const ph = Math.max(2.4 * scale, bd);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
        } else {
          ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
        }
        ctx.stroke();
        // Lead entry tick marks stop cleanly before pads
        ctx.beginPath();
        ctx.moveTo(-pw / 2, 0);
        ctx.lineTo(-pw / 2 - 1.2 * scale, 0);
        ctx.moveTo(pw / 2, 0);
        ctx.lineTo(pw / 2 + 1.2 * scale, 0);
        ctx.stroke();
        break;
      }

      case 'transistor_to92': {
        // Authentic TO-92 D-shape: curved dome arc + bold straight flat face showing orientation
        const r = (desc.bodyWidthMm / 2) * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.4 * Math.PI, 0.4 * Math.PI);
        ctx.lineTo(-r * 0.72, r * 0.8);
        ctx.lineTo(-r * 0.72, -r * 0.8);
        ctx.closePath();
        ctx.stroke();

        // Single clean external Pin-1 start marker triangle pointing at datasheet Pin 1
        const pin1X = -1.27 * scale;
        const pin1Y = r + 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(pin1X, pin1Y - 0.4 * scale);
        ctx.lineTo(pin1X - 0.5 * scale, pin1Y + 0.5 * scale);
        ctx.lineTo(pin1X + 0.5 * scale, pin1Y + 0.5 * scale);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'transistor_to220': {
        // TO-220 body outline with heavy solid metal heatsink-tab double line along top edge
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        const tabY = -bd / 2 + 1.2 * scale;
        ctx.lineWidth = Math.max(2, Math.round(0.4 * scale));
        ctx.beginPath();
        ctx.moveTo(-bw / 2, tabY);
        ctx.lineTo(bw / 2, tabY);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));

        // Mounting hole ring in tab
        ctx.beginPath();
        ctx.arc(0, tabY, 1.5 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Bold external Pin-1 start triangle pointing at datasheet Pin 1
        const pin1X = -2.54 * scale;
        const pin1Y = bd / 2 + 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(pin1X, pin1Y - 0.4 * scale);
        ctx.lineTo(pin1X - 0.5 * scale, pin1Y + 0.5 * scale);
        ctx.lineTo(pin1X + 0.5 * scale, pin1Y + 0.5 * scale);
        ctx.closePath();
        ctx.fill();

        // External Pin 1 dot on tab side
        ctx.beginPath();
        ctx.arc(-bw / 2 - 1.2 * scale, bd / 2 - 0.8 * scale, 0.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'diode': {
        // Axial body rectangle + bold double-width cathode band on right (+X) side
        const dw = 5.0 * scale;
        const dh = 2.6 * scale;
        ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);
        // Double-width cathode stripe band
        ctx.fillRect(dw / 2 - 1.2 * scale, -dh / 2, 1.2 * scale, dh);

        // Mini diode schematic triangle-bar symbol inside/beside
        ctx.beginPath();
        const symX = -0.5 * scale;
        ctx.moveTo(symX - 1.0 * scale, -0.8 * scale);
        ctx.lineTo(symX + 0.8 * scale, 0);
        ctx.lineTo(symX - 1.0 * scale, 0.8 * scale);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(symX + 0.8 * scale, -0.8 * scale);
        ctx.lineTo(symX + 0.8 * scale, 0.8 * scale);
        ctx.stroke();

        // Lead lines extending toward pads
        ctx.beginPath();
        ctx.moveTo(-dw / 2, 0);
        ctx.lineTo(-dw / 2 - 2.0 * scale, 0);
        ctx.moveTo(dw / 2, 0);
        ctx.lineTo(dw / 2 + 2.0 * scale, 0);
        ctx.stroke();
        break;
      }

      case 'led': {
        // 5mm circular LED with authentic flat chamfered cathode rim
        const r = 4.0 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        // Flat edge on cathode side (+X)
        ctx.beginPath();
        ctx.moveTo(r * Math.cos(0.6 * Math.PI), r * Math.sin(0.6 * Math.PI));
        ctx.lineTo(r * Math.cos(-0.6 * Math.PI), r * Math.sin(-0.6 * Math.PI));
        ctx.stroke();

        // Polarity markings '+' and '-' cleanly outside outline
        const fontPol = Math.max(9, Math.round(1.8 * scale));
        ctx.font = `bold ${fontPol}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', -r - 1.4 * scale, 0);
        ctx.fillText('-', r + 1.4 * scale, 0);
        break;
      }

      case 'rgb_led': {
        // Circular LED rim with flat edge + 4 pin inline silkscreen circles with R, COM, G, B
        const r = 4.0 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Pin labels R, COM, G, B beside pads
        const fontPin = Math.max(8, Math.round(1.1 * scale));
        ctx.font = `bold ${fontPin}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const rgbPins = [-3.81, -1.27, 1.27, 3.81];
        const rgbLabels = ['R', 'C', 'G', 'B'];
        rgbPins.forEach((px, i) => {
          const sx = (px / 2.54) * 2.5 * scale;
          ctx.beginPath();
          ctx.arc(sx, 0, 0.8 * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillText(rgbLabels[i], sx, -2.4 * scale);
        });

        // Pin 1 dot outside Pad 1
        ctx.beginPath();
        ctx.arc(-4.6 * scale, 2.0 * scale, 0.45 * scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'dip_ic': {
        // DIP IC rectangular outline with authentic semi-circular Pin 1 orientation U-notch
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        // Orientation U-notch on left (-X) edge
        const notchR = Math.min(1.8 * scale, bd / 3);
        ctx.beginPath();
        ctx.arc(-bw / 2, 0, notchR, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Single clean filled circular Pin-1 dot placed clearly OUTSIDE the body right next to Pin 1
        const dotX = -bw / 2 - 1.4 * scale;
        const dotY = -bd / 2 + 1.2 * scale;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 0.55 * scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'module': {
        // Sensor Module (HC-SR04, HC-05 Bluetooth, etc.)
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        if (desc.family === 'module' && (comp.type?.includes('SR04') || comp.footprint?.includes('HCSR04'))) {
          // Dual transducer circles T and R
          const trR = 4.2 * scale;
          ctx.beginPath();
          ctx.arc(-7.0 * scale, 0, trR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(7.0 * scale, 0, trR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = `bold ${Math.max(9, Math.round(1.8 * scale))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('T', -7.0 * scale, 0);
          ctx.fillText('R', 7.0 * scale, 0);

          // Directional arrow FRONT ->
          ctx.fillText('FRONT ->', 0, -bd / 2 + 2.5 * scale);

          // Header pin names: VCC, TRIG, ECHO, GND
          const pinFont = Math.max(7, Math.round(1.1 * scale));
          ctx.font = `bold ${pinFont}px monospace`;
          const pXs = [-3.81 * scale, -1.27 * scale, 1.27 * scale, 3.81 * scale];
          desc.headerPinLabels.forEach((label, i) => {
            if (pXs[i]) ctx.fillText(label, pXs[i], bd / 2 - 2.5 * scale);
          });
        } else if (
          desc.outlineType === 'bluetooth' ||
          comp.type?.includes('BLUETOOTH') ||
          comp.type?.includes('HC05') ||
          (comp.designator || '').startsWith('BT_MOD')
        ) {
          // Header pin names: STATE, RXD, TXD, GND, VCC, EN along header edge
          const pinFont = Math.max(6, Math.round(0.9 * scale));
          ctx.font = `bold ${pinFont}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const pXs = [-6.35 * scale, -3.81 * scale, -1.27 * scale, 1.27 * scale, 3.81 * scale, 6.35 * scale];
          desc.headerPinLabels.forEach((label, i) => {
            if (pXs[i] !== undefined) {
              ctx.fillText(label, pXs[i], 2.2 * scale);
            }
          });
          // Carrier label "HC-05 BT" inside module body
          const subFont = Math.max(7, Math.round(1.2 * scale));
          ctx.font = `bold ${subFont}px monospace`;
          ctx.fillText('HC-05 BT', 0, -bd / 2 + 2.5 * scale);
        }
        break;
      }

      case 'dev_board': {
        // Development Board Outer Outline & Pin Headers
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        // USB port bracket indicator along left edge
        ctx.strokeRect(-bw / 2, -5.0 * scale, 8.0 * scale, 10.0 * scale);

        // Mounting holes in 4 corners
        const mOffX = bw / 2 - 3.5 * scale;
        const mOffY = bd / 2 - 3.5 * scale;
        const mR = 1.6 * scale;
        [
          [-mOffX, -mOffY],
          [mOffX, -mOffY],
          [-mOffX, mOffY],
          [mOffX, mOffY],
        ].forEach(([hx, hy]) => {
          ctx.beginPath();
          ctx.arc(hx, hy, mR, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Pin 1 chevron indicator
        ctx.beginPath();
        ctx.arc(-bw / 2 + 3 * scale, -bd / 2 + 3 * scale, 0.7 * scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'potentiometer': {
        // Circular body with wiper arrow indicator and 1 2 3 pin labels
        const r = (bw / 2) * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        // Wiper arrow pointing to middle pin
        ctx.beginPath();
        ctx.moveTo(0, r * 0.4);
        ctx.lineTo(-r * 0.3, -r * 0.3);
        ctx.lineTo(r * 0.3, -r * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'buzzer': {
        const r = (bw / 2) * 0.95;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `bold ${Math.max(12, Math.round(2.6 * scale))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', -r * 0.5, 0);
        break;
      }

      case 'resistor': {
        // Classic KiCad chamfered axial resistor rectangle
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, 0);
        ctx.lineTo(-cw / 2, 0);
        ctx.moveTo(bw / 2, 0);
        ctx.lineTo(cw / 2, 0);
        ctx.stroke();
        break;
      }

      case 'battery': {
        // Battery holder outline: clean rectangle with distinct '+' and '-' polarity marks near pads
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        const fontPol = Math.max(11, Math.round(2.2 * scale));
        ctx.font = `bold ${fontPol}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Bold polarity marks right beside pads (Pin 1 positive +, Pin 2 negative -)
        ctx.fillText('+', -2.54 * scale - 2.2 * scale, 0);
        ctx.fillText('-', 2.54 * scale + 2.2 * scale, 0);
        // Also draw polarity badges on the body outline
        ctx.fillText('+', -bw / 2 + 2.5 * scale, -bd / 2 + 2.5 * scale);
        ctx.fillText('-', bw / 2 - 2.5 * scale, -bd / 2 + 2.5 * scale);
        break;
      }

      case 'header': {
        ctx.strokeRect(-cw / 2, -cd / 2, cw, cd);
        // Pin 1 box
        ctx.strokeRect(-cw / 2 + 0.8 * scale, -cd / 2 + 0.8 * scale, 2.0 * scale, 2.0 * scale);
        break;
      }

      default: {
        ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
        break;
      }
    }

    // Reference Designator ONLY (Clean DFM Courtyard Clearance)
    const fontLabel = Math.max(9, Math.round((is3dDecal ? 1.6 : 1.4) * scale));
    ctx.font = `bold ${fontLabel}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Designator placed cleanly above courtyard
    const desY = -cd / 2 - 1.2 * scale;
    ctx.fillStyle = isSelected ? '#38BDF8' : silkColor;
    ctx.fillText(comp.designator, 0, desY);

    ctx.restore();
  }
}
