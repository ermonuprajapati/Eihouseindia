/**
 * Authentic 830-Point Solderless Breadboard (MB-102 Standard) Topology
 * 
 * Dimensions: 165mm x 55mm x 8.5mm
 * Pitch: 2.54mm (0.1 in standard pitch)
 * Total tie points: 830
 * - 63 Columns (1..63)
 * - Rows A, B, C, D, E (Terminal Strip Top) -> 315 holes
 * - Rows F, G, H, I, J (Terminal Strip Bottom) -> 315 holes
 * - Top Power Rails: Positive (+, Red) and Negative (-, Blue) -> 100 holes
 * - Bottom Power Rails: Positive (+, Red) and Negative (-, Blue) -> 100 holes
 */

import type { Component3D } from '../types';

export interface BreadboardHole3D {
  id: string;
  name: string;
  x: number;
  y: number; // surface elevation (y = BB830_HEIGHT = 8.5mm when resting on y = 0 floor)
  z: number;
  section: 'terminal_top' | 'terminal_bottom' | 'rail_top_pos' | 'rail_top_neg' | 'rail_bottom_pos' | 'rail_bottom_neg';
  tieGroup: string;
  column?: number;
  row?: string;
}

export const BB830_WIDTH = 165; // mm along X
export const BB830_DEPTH = 55;  // mm along Z
export const BB830_HEIGHT = 8.5; // mm along Y

// =========================================================================
// Grounding & Surface Elevation Physics Constants
// =========================================================================
export const WORKBENCH_TOP_Y = 0.0; // Grounded antistatic ESD mat top surface
export const BREADBOARD_TOP_Y = BB830_HEIGHT; // Top plastic face of 830-point solderless breadboard (8.5mm)
export const BREADBOARD_INSERTION_DEPTH = 3.6; // Realistic pin insertion into internal spring clips (3.6mm, approx 35-42% of 9-11mm pins)

export interface Component3DElevationSpec {
  isThroughHole: boolean;
  pinLength: number;
  localMinY: number; // lowest point (usually pin tip) in local group coordinates
  localMinBodyY: number; // base of component body / package in local group coordinates
  packageHeight?: number;
}

export function getComponentElevationSpec(type: string): Component3DElevationSpec {
  const t = (type || '').toUpperCase();

  // 1. SMD / Flat Boards / Console-mount parts (No protruding bottom pins)
  if (
    t.includes('MEGA') ||
    t === 'ARDUINO_UNO' ||
    t.includes('BATTERY') ||
    t === 'DC_VOLTAGE' ||
    t.includes('LCD') ||
    t.includes('SERVO')
  ) {
    return {
      isThroughHole: false,
      pinLength: 0,
      localMinY: 0.0,
      localMinBodyY: 0.0,
      packageHeight: t.includes('BATTERY') ? 48.0 : t.includes('LCD') ? 10.0 : 15.0,
    };
  }

  // 2. DIP ICs & Compact MCU Breakouts (NE555, LM358, LM741, Nano, ESP32, Pico)
  if (t === 'TIMER_555' || t === 'DIP_IC' || t.includes('OPAMP') || t.includes('COMPARATOR') || t.includes('DIP')) {
    return {
      isThroughHole: true,
      pinLength: 5.2,
      localMinY: -5.0,
      localMinBodyY: 0.2,
      packageHeight: 4.0,
    };
  }

  if (t.includes('NANO') || t.includes('ESP32') || t.includes('PICO')) {
    return {
      isThroughHole: true,
      pinLength: 6.5,
      localMinY: -5.5,
      localMinBodyY: 0.8,
      packageHeight: 7.0,
    };
  }

  // 3. Sensor & Wireless Modules (HC-SR04 Ultrasonic, HC-05 Bluetooth)
  if (t.includes('SR04') || t.includes('ULTRASONIC') || t.includes('BLUETOOTH') || t.includes('HC05') || t.includes('HC06')) {
    return {
      isThroughHole: true,
      pinLength: 6.0,
      localMinY: -5.7,
      localMinBodyY: 1.0,
      packageHeight: 20.0,
    };
  }

  // 4. Through-Hole 3-pin Transistors (TO-92, TO-220, Regulators)
  if (t.includes('TRANSISTOR') || t.includes('BJT') || t.includes('MOSFET') || t.includes('REGULATOR') || t.includes('7805') || t.includes('LM317')) {
    const isTo220 = t.includes('REGULATOR') || t.includes('MOSFET') || t.includes('TO220');
    return {
      isThroughHole: true,
      pinLength: 8.5,
      localMinY: -7.0,
      localMinBodyY: 1.0,
      packageHeight: isTo220 ? 15.0 : 6.0,
    };
  }

  // 5. Switches & Trimmers (Pushbutton, Slide Switch, Potentiometer)
  if (t.includes('BUTTON') || t.includes('SWITCH') || t.includes('POTENTIOMETER')) {
    const isButton = t.includes('BUTTON');
    return {
      isThroughHole: true,
      pinLength: isButton ? 5.0 : 6.0,
      localMinY: isButton ? -4.5 : -4.0,
      localMinBodyY: 0.5,
      packageHeight: isButton ? 5.0 : 12.0,
    };
  }

  // 6. RGB LED 5mm 4-Pin Through-Hole
  if (t.includes('RGB') || t === 'ACTUATOR_RGB_LED') {
    return {
      isThroughHole: true,
      pinLength: 11.0,
      localMinY: -9.8,
      localMinBodyY: 1.8,
      packageHeight: 9.0,
    };
  }

  // 7. Axial & Radial 2-Pin / 4-Pin Passives (Resistor, LED, Capacitor, Diode, Inductor, Buzzer, LDR)
  return {
    isThroughHole: true,
    pinLength: 11.0,
    localMinY: -8.0,
    localMinBodyY: 2.0,
    packageHeight: t.includes('BUZZER') ? 10.0 : t.includes('LED') ? 9.0 : 5.0,
  };
}

export function getComponentPinOffsets(type: string): Array<{ x: number; z: number }> {
  const t = (type || '').toUpperCase();
  if (t === 'RESISTOR' || t === 'DIODE' || t === 'DIODE_1N4007' || t === 'INDUCTOR') {
    return [{ x: -5.08, z: 0 }, { x: 5.08, z: 0 }];
  }
  if (t === 'LED' || t === 'SENSOR_LDR' || t === 'CAPACITOR' || t === 'CAPACITOR_ELECTROLYTIC') {
    return [{ x: -2.54, z: 0 }, { x: 2.54, z: 0 }];
  }
  if (t === 'BUZZER' || t === 'BUZZER_ACTIVE' || t === 'ACTUATOR_BUZZER_ACTIVE') {
    return [{ x: -2.54, z: 0 }, { x: 2.54, z: 0 }];
  }
  if (t === 'SLIDE_SWITCH' || t === 'SWITCH_SLIDE_SPDT') {
    return [{ x: -2.54, z: 0 }, { x: 0, z: 0 }, { x: 2.54, z: 0 }];
  }
  if (t === 'POTENTIOMETER' || t === 'POTENTIOMETER_ROTARY') {
    return [{ x: -2.54, z: 0 }, { x: 0, z: 2.54 }, { x: 2.54, z: 0 }];
  }
  if (t.includes('TRANSISTOR') || t.includes('BJT') || t.includes('MOSFET') || t.includes('TO92') || t.includes('TO220') || t.includes('REGULATOR')) {
    return [{ x: -2.54, z: 0 }, { x: 0, z: 0 }, { x: 2.54, z: 0 }];
  }
  if (t === 'PUSHBUTTON' || t === 'PUSHBUTTON_TACTILE') {
    return [
      { x: -2.54, z: -2.54 },
      { x: 2.54, z: -2.54 },
      { x: -2.54, z: 2.54 },
      { x: 2.54, z: 2.54 },
    ];
  }
  if (t === 'LED_RGB' || t === 'ACTUATOR_RGB_LED') {
    return [
      { x: -3.81, z: 0 },
      { x: -1.27, z: 0 },
      { x: 1.27, z: 0 },
      { x: 3.81, z: 0 },
    ];
  }
  if (t === 'HC_SR04' || t === 'SENSOR_ULTRASONIC') {
    return [
      { x: -3.81, z: 0 },
      { x: -1.27, z: 0 },
      { x: 1.27, z: 0 },
      { x: 3.81, z: 0 },
    ];
  }
  if (
    t.includes('BLUETOOTH') ||
    t === 'HC05' ||
    t === 'HC06' ||
    t === 'MODULE_BLUETOOTH_HC05' ||
    t === 'RF_BLUETOOTH'
  ) {
    return [
      { x: -6.35, z: 0 },
      { x: -3.81, z: 0 },
      { x: -1.27, z: 0 },
      { x: 1.27, z: 0 },
      { x: 3.81, z: 0 },
      { x: 6.35, z: 0 },
    ];
  }
  if (t.includes('OLED') || t.includes('DHT11') || t.includes('DHT22')) {
    return [
      { x: -3.81, z: 0 },
      { x: -1.27, z: 0 },
      { x: 1.27, z: 0 },
      { x: 3.81, z: 0 },
    ];
  }
  if (t.includes('PIR') || t.includes('RELAY')) {
    return [
      { x: -2.54, z: 0 },
      { x: 0, z: 0 },
      { x: 2.54, z: 0 },
    ];
  }
  if (t.includes('MPU6050') || t.includes('GY521')) {
    return [
      { x: -8.89, z: 0 },
      { x: -6.35, z: 0 },
      { x: -3.81, z: 0 },
      { x: -1.27, z: 0 },
      { x: 1.27, z: 0 },
      { x: 3.81, z: 0 },
      { x: 6.35, z: 0 },
      { x: 8.89, z: 0 },
    ];
  }
  if (t === 'TIMER_555' || t === 'DIP_IC' || t.includes('OPAMP') || t.includes('COMPARATOR')) {
    return [
      { x: -3.81, z: -3.34 },
      { x: -1.27, z: -3.34 },
      { x: 1.27, z: -3.34 },
      { x: 3.81, z: -3.34 },
      { x: 3.81, z: 3.34 },
      { x: 1.27, z: 3.34 },
      { x: -1.27, z: 3.34 },
      { x: -3.81, z: 3.34 },
    ];
  }
  if (t === 'IC_74HC14' || t.includes('74HC') || t.includes('DIP_14') || t.includes('DIP14') || t.includes('LM324')) {
    return [
      { x: -7.62, z: -3.34 },
      { x: -5.08, z: -3.34 },
      { x: -2.54, z: -3.34 },
      { x: 0, z: -3.34 },
      { x: 2.54, z: -3.34 },
      { x: 5.08, z: -3.34 },
      { x: 7.62, z: -3.34 },
      { x: 7.62, z: 3.34 },
      { x: 5.08, z: 3.34 },
      { x: 2.54, z: 3.34 },
      { x: 0, z: 3.34 },
      { x: -2.54, z: 3.34 },
      { x: -5.08, z: 3.34 },
      { x: -7.62, z: 3.34 },
    ];
  }
  if (t.includes('595') || t.includes('4017') || t.includes('2003') || t.includes('293') || t.includes('DIP_16') || t.includes('DIP16')) {
    return [
      { x: -8.89, z: -3.34 },
      { x: -6.35, z: -3.34 },
      { x: -3.81, z: -3.34 },
      { x: -1.27, z: -3.34 },
      { x: 1.27, z: -3.34 },
      { x: 3.81, z: -3.34 },
      { x: 6.35, z: -3.34 },
      { x: 8.89, z: -3.34 },
      { x: 8.89, z: 3.34 },
      { x: 6.35, z: 3.34 },
      { x: 3.81, z: 3.34 },
      { x: 1.27, z: 3.34 },
      { x: -1.27, z: 3.34 },
      { x: -3.81, z: 3.34 },
      { x: -6.35, z: 3.34 },
      { x: -8.89, z: 3.34 },
    ];
  }
  if (t.includes('ATMEGA328P') || t.includes('DIP_28') || t.includes('DIP28')) {
    const pins: Array<{ x: number; z: number }> = [];
    const startX = -((14 - 1) * 2.54) / 2;
    for (let i = 0; i < 14; i++) {
      pins.push({ x: startX + i * 2.54, z: -3.34 });
    }
    for (let i = 0; i < 14; i++) {
      pins.push({ x: startX + (13 - i) * 2.54, z: 3.34 });
    }
    return pins;
  }
  if (t === 'ARDUINO_NANO') {
    const pins: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 15; i++) {
      pins.push({ x: -17.78 + i * 2.54, z: -7.62 });
      pins.push({ x: 17.78 - i * 2.54, z: 7.62 });
    }
    return pins;
  }
  if (t === 'ESP32_DEVKIT') {
    const pins: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 15; i++) {
      pins.push({ x: -17.78 + i * 2.54, z: -11.43 });
      pins.push({ x: 17.78 - i * 2.54, z: 11.43 });
    }
    return pins;
  }
  if (t === 'RASPBERRY_PI_PICO') {
    const pins: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 20; i++) {
      pins.push({ x: -8.89, z: -24.13 + i * 2.54 });
      pins.push({ x: 8.89, z: -24.13 + i * 2.54 });
    }
    return pins;
  }
  return [];
}

export const BREADBOARD_SPACING_Z = 60.0;

export function areAllPinsInBreadboardHoles(
  type: string,
  targetX: number,
  targetZ: number,
  rotationYRad: number = 0,
  breadboardCount: number = 1
): boolean {
  const pinOffsets = getComponentPinOffsets(type);
  if (!pinOffsets || pinOffsets.length === 0) return false;

  const cos = Math.cos(rotationYRad);
  const sin = Math.sin(rotationYRad);

  for (const p of pinOffsets) {
    const rx = p.x * cos - p.z * sin;
    const rz = p.x * sin + p.z * cos;
    const wx = targetX + rx;
    const wz = targetZ + rz;

    const hole = findNearestHole830(wx, wz, 1.44, breadboardCount);
    if (!hole) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates exact zero-sinking elevation Y for any component based on its location:
 * - On Workbench (table surface): minY === WORKBENCH_TOP_Y (lowest pin tip rests on table sheet; never sinks).
 * - On Breadboard (Holes): lower 35-42% of pins inserted into holes; body sits cleanly ABOVE BREADBOARD_TOP_Y.
 * - On Breadboard (Solid Plastic/Margin/Ravine): clamped flush to BREADBOARD_TOP_Y; never sinks into plastic!
 */
export function computeComponentGroundElevation(
  type: string,
  targetX: number,
  targetZ: number,
  hasBreadboard: boolean,
  rotationYRad: number = 0,
  breadboardCount: number = 1
): number {
  const spec = getComponentElevationSpec(type);

  if (!spec.isThroughHole || !hasBreadboard) {
    const benchY = WORKBENCH_TOP_Y - spec.localMinY;
    return Math.round(benchY * 100) / 100;
  }

  const isOverBoard = Array.from({ length: breadboardCount }).some((_, b) => {
    const bZ = -b * BREADBOARD_SPACING_Z;
    return (
      Math.abs(targetX) <= (BB830_WIDTH / 2) &&
      Math.abs(targetZ - bZ) <= (BB830_DEPTH / 2)
    );
  });

  const allPinsInHoles = areAllPinsInBreadboardHoles(type, targetX, targetZ, rotationYRad, breadboardCount);

  if (allPinsInHoles) {
    const insertionDepth = Math.min(BREADBOARD_INSERTION_DEPTH, spec.pinLength * 0.42);
    const elevatedY = BREADBOARD_TOP_Y - insertionDepth - spec.localMinY;
    return Math.round(elevatedY * 100) / 100;
  }

  // Off-hole placement: clamp lowest pin tip flush at surface top (BREADBOARD_TOP_Y if over board, else WORKBENCH_TOP_Y)
  const surfaceTopY = isOverBoard ? BREADBOARD_TOP_Y : WORKBENCH_TOP_Y;
  const clampedY = surfaceTopY - spec.localMinY;
  return Math.round(clampedY * 100) / 100;
}

export const BREADBOARD_PITCH = 2.54;
export const PITCH_X = 2.54;
export const PITCH_Z = 2.54;

export const START_X = -((63 - 1) * PITCH_X) / 2; // -78.74 mm
export const ROW_Z_MAP: Record<string, number> = {
  // Upper terminal rows A..E (above trough)
  A: -13.5,
  B: -10.96,
  C: -8.42,
  D: -5.88,
  E: -3.34,
  // Lower terminal rows F..J (below trough)
  F: 3.34,
  G: 5.88,
  H: 8.42,
  I: 10.96,
  J: 13.5,
};

export const RAIL_Z_MAP = {
  top_pos: -22.0,
  top_neg: -18.5,
  bottom_pos: 18.5,
  bottom_neg: 22.0,
};

// Generate full 830 holes list
export function generate830BreadboardHoles(): BreadboardHole3D[] {
  const holes: BreadboardHole3D[] = [];

  // 1. Terminal Rows A..E and F..J for 63 Columns (630 holes)
  for (let col = 1; col <= 63; col++) {
    const x = START_X + (col - 1) * PITCH_X;

    // Rows A..E (Top terminal strip)
    ['A', 'B', 'C', 'D', 'E'].forEach((row) => {
      const z = ROW_Z_MAP[row];
      holes.push({
        id: `bb_col_${col}_${row}`,
        name: `Col ${col}, Row ${row}`,
        x,
        y: BB830_HEIGHT,
        z,
        section: 'terminal_top',
        tieGroup: `bb_tie_col_${col}_top`,
        column: col,
        row,
      });
    });

    // Rows F..J (Bottom terminal strip)
    ['F', 'G', 'H', 'I', 'J'].forEach((row) => {
      const z = ROW_Z_MAP[row];
      holes.push({
        id: `bb_col_${col}_${row}`,
        name: `Col ${col}, Row ${row}`,
        x,
        y: BB830_HEIGHT,
        z,
        section: 'terminal_bottom',
        tieGroup: `bb_tie_col_${col}_bottom`,
        column: col,
        row,
      });
    });
  }

  // 2. Power Rails (50 holes each rail: 5 groups of 5 holes with 1-pitch gaps)
  // Top Rails
  for (let i = 0; i < 50; i++) {
    // 5 blocks of 5 pairs, standard MB-102 spacing
    const block = Math.floor(i / 10);
    const inBlock = i % 10;
    const x = START_X + (block * 12 + inBlock) * PITCH_X;

    holes.push({
      id: `bb_rail_top_pos_${i + 1}`,
      name: `Top Rail [+] Hole ${i + 1}`,
      x,
      y: BB830_HEIGHT,
      z: RAIL_Z_MAP.top_pos,
      section: 'rail_top_pos',
      tieGroup: 'bb_tie_rail_top_pos',
    });

    holes.push({
      id: `bb_rail_top_neg_${i + 1}`,
      name: `Top Rail [-] Hole ${i + 1}`,
      x,
      y: BB830_HEIGHT,
      z: RAIL_Z_MAP.top_neg,
      section: 'rail_top_neg',
      tieGroup: 'bb_tie_rail_top_neg',
    });

    // Bottom Rails
    holes.push({
      id: `bb_rail_bottom_pos_${i + 1}`,
      name: `Bottom Rail [+] Hole ${i + 1}`,
      x,
      y: BB830_HEIGHT,
      z: RAIL_Z_MAP.bottom_pos,
      section: 'rail_bottom_pos',
      tieGroup: 'bb_tie_rail_bottom_pos',
    });

    holes.push({
      id: `bb_rail_bottom_neg_${i + 1}`,
      name: `Bottom Rail [-] Hole ${i + 1}`,
      x,
      y: BB830_HEIGHT,
      z: RAIL_Z_MAP.bottom_neg,
      section: 'rail_bottom_neg',
      tieGroup: 'bb_tie_rail_bottom_neg',
    });
  }

  return holes;
}

export const ALL_830_HOLES = generate830BreadboardHoles();

/**
 * Finds the nearest local power/ground rail hole directly in or closest to a specific breadboard column.
 * Guarantees zero wire stacking: never selects an already occupied rail hole.
 */
export function findNearestRailHoleForColumn(
  col: number,
  railType: 'rail_top_pos' | 'rail_top_neg' | 'rail_bottom_pos' | 'rail_bottom_neg',
  occupiedHoleIds?: Set<string>
): string {
  const targetX = START_X + (Math.max(1, Math.min(63, col)) - 1) * PITCH_X;
  const candidateHoles = ALL_830_HOLES.filter(
    (h) => h.section === railType && (!occupiedHoleIds || !occupiedHoleIds.has(h.id))
  );

  if (candidateHoles.length === 0) {
    // Fallback if all holes in this rail section are currently occupied
    return ALL_830_HOLES.find((h) => h.section === railType)?.id || `bb_${railType}_1`;
  }

  let bestHole = candidateHoles[0].id;
  let minDx = Infinity;

  for (const h of candidateHoles) {
    const dx = Math.abs(h.x - targetX);
    if (dx < minDx) {
      minDx = dx;
      bestHole = h.id;
    }
  }

  return bestHole;
}

/**
 * Finds the nearest unoccupied hole in the same tieGroup, or in the same rail section.
 * Prevents multiple jumper wires from stacking into the same hole.
 */
export function findNearestUnoccupiedHole(
  holeId: string,
  occupiedHoleIds: Set<string>
): string {
  const targetHole = HOLE_BY_ID.get(holeId);
  if (!targetHole) return holeId;
  if (!occupiedHoleIds.has(holeId)) return holeId;

  // 1. Try other holes in the exact same tieGroup (e.g. adjacent holes in same column or tie segment)
  const tieGroupHoles = HOLES_BY_TIE_GROUP.get(targetHole.tieGroup) || [];
  const freeInTieGroup = tieGroupHoles.filter((h) => !occupiedHoleIds.has(h.id));
  if (freeInTieGroup.length > 0) {
    let best = freeInTieGroup[0];
    let minD = Math.hypot(best.x - targetHole.x, best.z - targetHole.z);
    for (const h of freeInTieGroup) {
      const d = Math.hypot(h.x - targetHole.x, h.z - targetHole.z);
      if (d < minD) {
        minD = d;
        best = h;
      }
    }
    return best.id;
  }

  // 2. If it's a rail and tieGroup is full, check the entire rail section
  if (targetHole.section.startsWith('rail_')) {
    const railHoles = ALL_830_HOLES.filter(
      (h) => h.section === targetHole.section && !occupiedHoleIds.has(h.id)
    );
    if (railHoles.length > 0) {
      let best = railHoles[0];
      let minD = Math.abs(best.x - targetHole.x);
      for (const h of railHoles) {
        const d = Math.abs(h.x - targetHole.x);
        if (d < minD) {
          minD = d;
          best = h;
        }
      }
      return best.id;
    }
  }

  return holeId;
}

// Fast O(1) Map for lookup
export const HOLE_BY_ID = new Map<string, BreadboardHole3D>(
  ALL_830_HOLES.map((h) => [h.id, h])
);

// Map of holes grouped by strict internal spring-clip tieGroup
export const HOLES_BY_TIE_GROUP = new Map<string, BreadboardHole3D[]>();
ALL_830_HOLES.forEach((h) => {
  const existing = HOLES_BY_TIE_GROUP.get(h.tieGroup);
  if (existing) {
    existing.push(h);
  } else {
    HOLES_BY_TIE_GROUP.set(h.tieGroup, [h]);
  }
});

/**
 * Fast spatial snap lookup for breadboard holes within snap radius
 */
export function findNearestHole830(
  wx: number,
  wz: number,
  maxDistSq = 9.0, // 3.0mm radius squared
  breadboardCount = 1
): BreadboardHole3D | null {
  let nearest: BreadboardHole3D | null = null;
  let minDistSq = maxDistSq;

  for (let b = 0; b < breadboardCount; b++) {
    const boardZ = -b * BREADBOARD_SPACING_Z;
    if (
      wx < -BB830_WIDTH / 2 - 3 ||
      wx > BB830_WIDTH / 2 + 3 ||
      wz < boardZ - BB830_DEPTH / 2 - 3 ||
      wz > boardZ + BB830_DEPTH / 2 + 3
    ) {
      continue;
    }

    // Narrow down candidate column
    const approxCol = Math.round((wx - START_X) / PITCH_X) + 1;
    const minCol = Math.max(1, approxCol - 2);
    const maxCol = Math.min(63, approxCol + 2);

    for (let c = minCol; c <= maxCol; c++) {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      for (const r of rows) {
        const baseH = HOLE_BY_ID.get(`bb_col_${c}_${r}`);
        if (baseH) {
          const actualZ = baseH.z + boardZ;
          const dx = baseH.x - wx;
          const dz = actualZ - wz;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearest = b === 0 ? baseH : {
              ...baseH,
              id: `bb${b + 1}_col_${c}_${r}`,
              name: `Board ${b + 1} Col ${c}, Row ${r}`,
              z: actualZ,
              tieGroup: `bb${b + 1}_tie_col_${c}_${r <= 'E' ? 'top' : 'bottom'}`,
            };
          }
        }
      }
    }

    // Check rails on this board
    for (let i = 0; i < 50; i++) {
      const rails = [
        `bb_rail_top_pos_${i + 1}`,
        `bb_rail_top_neg_${i + 1}`,
        `bb_rail_bottom_pos_${i + 1}`,
        `bb_rail_bottom_neg_${i + 1}`,
      ];
      for (const rId of rails) {
        const baseH = HOLE_BY_ID.get(rId);
        if (baseH) {
          const actualZ = baseH.z + boardZ;
          const dx = baseH.x - wx;
          const dz = actualZ - wz;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearest = b === 0 ? baseH : {
              ...baseH,
              id: `bb${b + 1}_` + rId.replace(/^bb_/, ''),
              z: actualZ,
              tieGroup: `bb${b + 1}_` + baseH.tieGroup.replace(/^bb_/, ''),
            };
          }
        }
      }
    }
  }

  return nearest;
}

/**
 * Finds an unoccupied adjacent hole in the exact same 5-hole vertical terminal strip (tieGroup)
 * Strict Rule: 1 hole = 1 pin! Never insert multiple pins/wires into the same hole.
 */
export function findFreeAdjacentHoleInTieGroup(
  tieGroup: string,
  occupiedHoleIds: Set<string>
): BreadboardHole3D | null {
  const holes = HOLES_BY_TIE_GROUP.get(tieGroup);
  if (!holes || holes.length === 0) return null;
  // Return the first hole that is not currently occupied
  for (const h of holes) {
    if (!occupiedHoleIds.has(h.id)) {
      return h;
    }
  }
  return null;
}

/**
 * Find nearest unoccupied hole on breadboard to avoid collisions
 */
export function findNearestFreeHole830(
  wx: number,
  wz: number,
  occupiedHoleIds: Set<string>,
  maxDistSq = 25.0
): BreadboardHole3D | null {
  const nearest = findNearestHole830(wx, wz, maxDistSq);
  if (nearest && !occupiedHoleIds.has(nearest.id)) {
    return nearest;
  }
  // If nearest is occupied, find free adjacent hole in same tieGroup
  if (nearest) {
    const freeInGroup = findFreeAdjacentHoleInTieGroup(nearest.tieGroup, occupiedHoleIds);
    if (freeInGroup) return freeInGroup;
  }
  return null;
}

export interface OccupantRecord {
  type: 'component_pin' | 'wire_end';
  ownerId: string;
  pinId?: string;
  label?: string;
}

/**
 * Deterministic 830-Point Breadboard Occupancy Map
 * Enforces the strict Zero-Shared-Holes & One-Wire-Per-Hole Rule:
 * Phase 1 reserves exact hole coordinates for all component pins.
 * Phase 2 routes wires exclusively to unoccupied holes in the corresponding tie group or power rail.
 */
export class BreadboardOccupancyMap {
  private occupancy = new Map<string, OccupantRecord>();

  public get(holeId: string): OccupantRecord | undefined {
    return this.occupancy.get(holeId);
  }

  public isOccupied(holeId: string): boolean {
    return this.occupancy.has(holeId);
  }

  public occupy(holeId: string, record: OccupantRecord): boolean {
    if (this.occupancy.has(holeId)) return false;
    this.occupancy.set(holeId, record);
    return true;
  }

  public forceOccupy(holeId: string, record: OccupantRecord): void {
    this.occupancy.set(holeId, record);
  }

  public release(holeId: string): boolean {
    return this.occupancy.delete(holeId);
  }

  public releaseOwner(ownerId: string): void {
    for (const [id, rec] of this.occupancy.entries()) {
      if (rec.ownerId === ownerId) {
        this.occupancy.delete(id);
      }
    }
  }

  public getOccupiedIds(): Set<string> {
    return new Set(this.occupancy.keys());
  }

  public clear(): void {
    this.occupancy.clear();
  }

  /**
   * Find an unoccupied hole in the given tie group (e.g. bb_tie_col_31_top, or bb2_tie_col_31_top).
   * Preference is given to holes adjacent to the component lead to keep jumper lengths clean.
   */
  public findFreeHoleInTieGroup(tieGroup: string): BreadboardHole3D | null {
    const isBoard2 = tieGroup.startsWith('bb2_');
    const isBoard3 = tieGroup.startsWith('bb3_');
    const baseGroup = (isBoard2 || isBoard3) ? 'bb_' + tieGroup.slice(4) : tieGroup;
    const offsetZ = isBoard3 ? -120.0 : isBoard2 ? -60.0 : 0.0;
    const idPrefix = isBoard3 ? 'bb3_' : isBoard2 ? 'bb2_' : '';

    const holes = HOLES_BY_TIE_GROUP.get(baseGroup);
    if (!holes || holes.length === 0) return null;
    for (const h of holes) {
      const fullId = (isBoard2 || isBoard3) ? idPrefix + h.id.slice(3) : h.id;
      if (!this.occupancy.has(fullId)) {
        return (isBoard2 || isBoard3)
          ? { ...h, id: fullId, z: h.z + offsetZ, tieGroup }
          : h;
      }
    }
    return null;
  }

  /**
   * Find an unoccupied hole in the given power/ground rail section closest to the specified column.
   * Supports multi-breadboard search via boardPrefix ('bb_', 'bb2_', 'bb3_').
   */
  public findFreeRailHole(
    col: number,
    railType: 'rail_top_pos' | 'rail_top_neg' | 'rail_bottom_pos' | 'rail_bottom_neg',
    boardPrefix: string = 'bb_'
  ): BreadboardHole3D | null {
    const targetX = START_X + (Math.max(1, Math.min(63, col)) - 1) * PITCH_X;
    const isBoard2 = boardPrefix === 'bb2_';
    const isBoard3 = boardPrefix === 'bb3_';
    const offsetZ = isBoard3 ? -120.0 : isBoard2 ? -60.0 : 0.0;
    const idPrefix = isBoard3 ? 'bb3_' : isBoard2 ? 'bb2_' : 'bb_';

    const candidates = ALL_830_HOLES.filter(
      (h) => h.section === railType && !this.occupancy.has(idPrefix + h.id.slice(3))
    );
    if (candidates.length === 0) return null;
    let best = candidates[0];
    let minDx = Math.abs(best.x - targetX);
    for (const h of candidates) {
      const dx = Math.abs(h.x - targetX);
      if (dx < minDx) {
        minDx = dx;
        best = h;
      }
    }
    return (isBoard2 || isBoard3)
      ? { ...best, id: idPrefix + best.id.slice(3), z: best.z + offsetZ }
      : best;
  }
}

export function getTieGroupForHole(holeId: string): string | undefined {
  if (holeId.startsWith('bb2_')) {
    const baseId = 'bb_' + holeId.slice(4);
    const baseGroup = HOLE_BY_ID.get(baseId)?.tieGroup;
    return baseGroup ? 'bb2_' + baseGroup.slice(3) : undefined;
  }
  if (holeId.startsWith('bb3_')) {
    const baseId = 'bb_' + holeId.slice(4);
    const baseGroup = HOLE_BY_ID.get(baseId)?.tieGroup;
    return baseGroup ? 'bb3_' + baseGroup.slice(3) : undefined;
  }
  return HOLE_BY_ID.get(holeId)?.tieGroup;
}

export function getAllHolesInTieGroup(tieGroup: string): BreadboardHole3D[] {
  if (tieGroup.startsWith('bb2_')) {
    const baseGroup = 'bb_' + tieGroup.slice(4);
    const baseHoles = HOLES_BY_TIE_GROUP.get(baseGroup) || [];
    return baseHoles.map((h) => ({
      ...h,
      id: 'bb2_' + h.id.slice(3),
      z: h.z - 60.0,
      tieGroup,
    }));
  }
  if (tieGroup.startsWith('bb3_')) {
    const baseGroup = 'bb_' + tieGroup.slice(4);
    const baseHoles = HOLES_BY_TIE_GROUP.get(baseGroup) || [];
    return baseHoles.map((h) => ({
      ...h,
      id: 'bb3_' + h.id.slice(3),
      z: h.z - 120.0,
      tieGroup,
    }));
  }
  return HOLES_BY_TIE_GROUP.get(tieGroup) || [];
}

/**
 * Normalizes an angle in degrees after applying a delta in 45-degree increments.
 * Result stays within [-180, 180].
 */
export function stepAngle45(current: number, delta: number): number {
  let next = Math.round((current + delta) / 45) * 45;
  next = ((next % 360) + 360) % 360;
  if (next > 180) next -= 360;
  return next;
}

/**
 * Nudges a 3D component along a distinct world axis (X, Y, or Z).
 * Y translation is clamped at minGroundY (or WORKBENCH_TOP_Y) to prevent sinking below sheet.
 */
export function nudgeComponent3D(
  comp: Component3D,
  axis: 'x' | 'y' | 'z',
  delta: number,
  minGroundY?: number
): Component3D {
  if (axis === 'x') {
    return { ...comp, x3d: Math.round((comp.x3d + delta) * 100) / 100 };
  }
  if (axis === 'z') {
    return { ...comp, z3d: Math.round((comp.z3d + delta) * 100) / 100 };
  }
  // Y axis
  const floorY = minGroundY !== undefined ? minGroundY : computeComponentGroundElevation(comp.type, comp.x3d, comp.z3d, false);
  const nextY = Math.max(floorY, Math.round((comp.y3d + delta) * 100) / 100);
  return { ...comp, y3d: nextY };
}

/**
 * Rotates a 3D component by 45 degrees along a distinct axis (yaw=Y, pitch=X, roll=Z).
 */
export function rotateComponent45(
  comp: Component3D,
  axis: 'yaw' | 'pitch' | 'roll',
  direction: 1 | -1
): Component3D {
  const delta = direction * 45;
  if (axis === 'yaw') {
    return { ...comp, rotY: stepAngle45(comp.rotY || 0, delta) };
  }
  if (axis === 'pitch') {
    return { ...comp, rotX: stepAngle45(comp.rotX || 0, delta) };
  }
  // roll
  return { ...comp, rotZ: stepAngle45(comp.rotZ || 0, delta) };
}

/**
 * Resets a 3D component orientation back to 0 degrees for all 3 axes.
 */
export function resetComponentOrientation(comp: Component3D): Component3D {
  return { ...comp, rotX: 0, rotY: 0, rotZ: 0 };
}

/**
 * Drops / snaps a 3D component:
 * 1. Immediately aligns X and Z cleanly to the nearest 2.54mm breadboard/grid point.
 * 2. Snaps Y cleanly onto BREADBOARD_TOP_Y (if over breadboard) or WORKBENCH_TOP_Y (if on sheet) with zero sinking.
 */
export function snapComponentToSurface(
  comp: Component3D,
  hasBreadboard: boolean = true,
  breadboardCount: number = 1
): Component3D {
  if (!hasBreadboard) {
    const snappedX = Math.round(comp.x3d / PITCH_X) * PITCH_X;
    const snappedZ = Math.round(comp.z3d / PITCH_Z) * PITCH_Z;
    const rotYRad = ((comp.rotY || 0) * Math.PI) / 180;
    const groundY = computeComponentGroundElevation(comp.type, snappedX, snappedZ, false, rotYRad, 1);
    return {
      ...comp,
      x3d: Math.round(snappedX * 100) / 100,
      y3d: Math.round(groundY * 100) / 100,
      z3d: Math.round(snappedZ * 100) / 100,
    };
  }

  // Find closest breadboard index (0..breadboardCount-1)
  let bestBoard = 0;
  let minBoardDist = Infinity;
  for (let b = 0; b < breadboardCount; b++) {
    const bZ = -b * BREADBOARD_SPACING_Z;
    const dist = Math.abs(comp.z3d - bZ);
    if (dist < minBoardDist) {
      minBoardDist = dist;
      bestBoard = b;
    }
  }
  const boardCenterZ = -bestBoard * BREADBOARD_SPACING_Z;

  const isOverBoard =
    Math.abs(comp.x3d) <= (BB830_WIDTH / 2) &&
    minBoardDist <= (BB830_DEPTH / 2);

  const isEvenPinPart = [
    'LED_RGB',
    'ACTUATOR_RGB_LED',
    'HC_SR04',
    'SENSOR_ULTRASONIC',
    'TIMER_555',
    'DIP_IC',
    'OPAMP_LM358',
    'MODULE_BLUETOOTH_HC05',
    'BLUETOOTH',
    'HC05',
    'DHT11',
    'DHT22',
    'OLED',
  ].some((k) => comp.type.toUpperCase().includes(k)) || (comp.type.includes('DIP') && !comp.type.includes('14') && !comp.type.includes('74HC'));

  let snappedX: number;
  let snappedZ: number;

  if (isOverBoard) {
    if (isEvenPinPart) {
      const nearestCol = Math.max(2, Math.min(61, Math.round((comp.x3d - START_X) / PITCH_X - 0.5) + 1));
      snappedX = START_X + (nearestCol - 0.5) * PITCH_X;
    } else {
      const nearestCol = Math.max(1, Math.min(63, Math.round((comp.x3d - START_X) / PITCH_X) + 1));
      snappedX = START_X + (nearestCol - 1) * PITCH_X;
    }

    const isDip = comp.type.includes('DIP') || comp.type === 'TIMER_555' || comp.type.includes('OPAMP') || comp.type.includes('74HC') || comp.type.includes('NANO') || comp.type.includes('ESP32') || comp.type.includes('PICO');
    const relZ = comp.z3d - boardCenterZ;
    if (isDip && Math.abs(relZ) <= 4.0) {
      snappedZ = boardCenterZ; // Straddle center ravine
    } else {
      snappedZ = boardCenterZ + Math.round(relZ / PITCH_Z) * PITCH_Z;
    }
  } else {
    snappedX = Math.round(comp.x3d / PITCH_X) * PITCH_X;
    snappedZ = Math.round(comp.z3d / PITCH_Z) * PITCH_Z;
  }

  const rotYRad = ((comp.rotY || 0) * Math.PI) / 180;
  const groundY = computeComponentGroundElevation(comp.type, snappedX, snappedZ, hasBreadboard, rotYRad, breadboardCount);

  return {
    ...comp,
    x3d: (Math.round(snappedX * 100) / 100) || 0,
    y3d: (Math.round(groundY * 100) / 100) || 0,
    z3d: (Math.round(snappedZ * 100) / 100) || 0,
  };
}

/**
 * Visibly flips/mirrors a 3D component orientation by 180 degrees around its vertical Yaw axis (Y-axis),
 * cleanly reversing pin order and updating both the 3D transform and pin coordinates used by wires.
 */
export function flipComponent3D(comp: Component3D): Component3D {
  const nextRotY = stepAngle45(comp.rotY || 0, 180);
  const nextMirrored = !comp.parameters?.mirrored;
  return {
    ...comp,
    rotY: nextRotY,
    parameters: {
      ...comp.parameters,
      mirrored: nextMirrored,
      rotY: nextRotY,
    },
  };
}


