/**
 * Authentic PCB Footprint & Silkscreen Geometry Engine
 * Computes standard IPC-7351 footprint outlines, pads, and tight non-overlapping silkscreen labels
 */

export interface ComponentFootprintSpec {
  designator: string;
  type: string;
  value: string;
  x: number;
  y: number;
  rotation: number;
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
    | 'transistor'
    | 'header';
  boxBounds?: { x: number; y: number; width: number; height: number };
  radius?: number;
}

export class FootprintRenderer {
  /**
   * Calculates tight, legible silkscreen label positions positioned right beside its courtyard
   * and identifies authentic IPC-7351 footprint outlines.
   */
  public static calculateSilkscreenLayout(spec: ComponentFootprintSpec): SilkscreenLabelLayout {
    const { designator, type, value, x, y } = spec;
    const upperType = type.toUpperCase();
    const upperVal = (value || '').toUpperCase();

    // 1. DIP ICs (NE555, ATmega328P, Op-Amps, etc.)
    if (
      upperType.includes('555') ||
      upperType.includes('IC') ||
      upperType.includes('DIP') ||
      upperType.includes('ATMEGA') ||
      upperType.includes('OPAMP')
    ) {
      const isLargeDip = upperType.includes('ATMEGA') || upperType.includes('DIP-28') || upperType.includes('DIP-16');
      const w = isLargeDip ? 24 : 11;
      const h = isLargeDip ? 9.5 : 8.5;
      return {
        designatorText: designator,
        valueText: value || (isLargeDip ? 'ATmega328P' : 'NE555P'),
        designatorPos: { x: x - w / 2, y: y - h / 2 - 1.5 },
        valuePos: { x: x - w / 2, y: y + h / 2 + 2.8 },
        outlineType: 'dip',
        boxBounds: { x: x - w / 2, y: y - h / 2, width: w, height: h },
      };
    }

    // 2. HC-SR04 Ultrasonic Sensor Module
    if (upperType.includes('SR04') || upperType.includes('ULTRASONIC')) {
      return {
        designatorText: designator,
        valueText: value || 'HC-SR04',
        designatorPos: { x: x - 22.0, y: y - 11.5 },
        valuePos: { x: x - 22.0, y: y + 13.0 },
        outlineType: 'box',
        boxBounds: { x: x - 22.5, y: y - 10.0, width: 45.0, height: 20.0 },
      };
    }

    // 3. Bluetooth HC-05 / HC-06 Module
    if (upperType.includes('BLUETOOTH') || upperType.includes('HC05') || upperType.includes('HC06')) {
      return {
        designatorText: designator,
        valueText: value || 'HC-05 BT',
        designatorPos: { x: x - 13.0, y: y - 4.5 },
        valuePos: { x: x - 13.0, y: y + 14.5 },
        outlineType: 'header',
        boxBounds: { x: x - 13.5, y: y - 3.0, width: 27.0, height: 13.0 },
      };
    }

    // 4. RGB LED (4-Pin Through-Hole)
    if (upperType.includes('RGB')) {
      return {
        designatorText: designator,
        valueText: value || 'RGB LED',
        designatorPos: { x: x - 5.5, y: y - 4.2 },
        valuePos: { x: x - 5.5, y: y + 5.5 },
        outlineType: 'header',
        boxBounds: { x: x - 5.5, y: y - 2.8, width: 11.0, height: 5.6 },
      };
    }

    // 5. Electrolytic Capacitors (Polarized: Aluminum Can)
    const isElectrolytic =
      upperType.includes('ELECTROLYTIC') ||
      upperType.includes('RADIAL') ||
      (upperType.includes('CAPACITOR') && (upperVal.includes('UF') || upperVal.includes('µF') || upperVal.includes('MF')));

    if (isElectrolytic) {
      return {
        designatorText: designator,
        valueText: value || '10µF',
        designatorPos: { x: x - 4.5, y: y - 5.5 },
        valuePos: { x: x - 4.5, y: y + 6.8 },
        outlineType: 'electrolytic_cap',
        radius: 4.2,
        boxBounds: { x: x - 4.2, y: y - 4.2, width: 8.4, height: 8.4 },
      };
    }

    // 6. Ceramic Capacitors (Non-polarized: Compact rounded pill)
    if (upperType.includes('CAPACITOR')) {
      return {
        designatorText: designator,
        valueText: value || '100nF',
        designatorPos: { x: x - 4.0, y: y - 4.2 },
        valuePos: { x: x - 4.0, y: y + 5.2 },
        outlineType: 'ceramic_cap',
        boxBounds: { x: x - 3.5, y: y - 1.8, width: 7.0, height: 3.6 },
      };
    }

    // 7. Axial Resistors, Potentiometers, LDRs, Diodes, Inductors (10.16mm courtyard)
    if (
      upperType.includes('RESISTOR') ||
      upperType.includes('DIODE') ||
      upperType.includes('INDUCTOR') ||
      upperType.includes('POTENTIOMETER') ||
      upperType.includes('LDR')
    ) {
      return {
        designatorText: designator,
        valueText: value || (upperType.includes('DIODE') ? '1N4007' : '10kΩ'),
        designatorPos: { x: x - 5.5, y: y - 3.8 },
        valuePos: { x: x - 5.5, y: y + 5.2 },
        outlineType: 'axial_resistor',
        boxBounds: { x: x - 5.08, y: y - 2.0, width: 10.16, height: 4.0 },
      };
    }

    // 8. LEDs (Circular with flat cathode edge)
    if (upperType.includes('LED')) {
      return {
        designatorText: designator,
        valueText: value || 'Red LED',
        designatorPos: { x: x - 4.5, y: y - 5.2 },
        valuePos: { x: x - 4.5, y: y + 6.4 },
        outlineType: 'led',
        radius: 4.0,
        boxBounds: { x: x - 4.0, y: y - 4.0, width: 8.0, height: 8.0 },
      };
    }

    // 7. Transistors (TO-92 D-shape)
    if (upperType.includes('TRANSISTOR') || upperType.includes('BJT') || upperType.includes('MOSFET')) {
      return {
        designatorText: designator,
        valueText: value || '2N2222',
        designatorPos: { x: x - 4.5, y: y - 4.8 },
        valuePos: { x: x - 4.5, y: y + 5.8 },
        outlineType: 'transistor',
        boxBounds: { x: x - 3.5, y: y - 2.5, width: 7.0, height: 5.0 },
      };
    }

    // 8. Headers / Connectors / Batteries
    if (
      upperType.includes('HEADER') ||
      upperType.includes('CONNECTOR') ||
      upperType.includes('TERMINAL') ||
      upperType.includes('BATTERY')
    ) {
      return {
        designatorText: designator,
        valueText: value || (upperType.includes('BATTERY') ? '9V' : 'HDR'),
        designatorPos: { x: x - 6.0, y: y - 5.5 },
        valuePos: { x: x - 6.0, y: y + 6.8 },
        outlineType: 'header',
        boxBounds: { x: x - 6.0, y: y - 3.5, width: 12.0, height: 7.0 },
      };
    }

    // Generic IC / Module outline
    return {
      designatorText: designator,
      valueText: value || '',
      designatorPos: { x: x - 5.0, y: y - 5.5 },
      valuePos: { x: x - 5.0, y: y + 6.8 },
      outlineType: 'box',
      boxBounds: { x: x - 4.5, y: y - 4.5, width: 9.0, height: 9.0 },
    };
  }
}
