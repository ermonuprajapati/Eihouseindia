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

export interface BreadboardHole3D {
  id: string;
  name: string;
  x: number;
  y: number; // surface elevation (y = 0.5)
  z: number;
  section: 'terminal_top' | 'terminal_bottom' | 'rail_top_pos' | 'rail_top_neg' | 'rail_bottom_pos' | 'rail_bottom_neg';
  tieGroup: string;
  column?: number;
  row?: string;
}

export const BB830_WIDTH = 165; // mm along X
export const BB830_DEPTH = 55;  // mm along Z
export const BB830_HEIGHT = 8.5; // mm along Y

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
        y: 0.5,
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
        y: 0.5,
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
      y: 0.5,
      z: RAIL_Z_MAP.top_pos,
      section: 'rail_top_pos',
      tieGroup: 'bb_tie_rail_top_pos',
    });

    holes.push({
      id: `bb_rail_top_neg_${i + 1}`,
      name: `Top Rail [-] Hole ${i + 1}`,
      x,
      y: 0.5,
      z: RAIL_Z_MAP.top_neg,
      section: 'rail_top_neg',
      tieGroup: 'bb_tie_rail_top_neg',
    });

    // Bottom Rails
    holes.push({
      id: `bb_rail_bottom_pos_${i + 1}`,
      name: `Bottom Rail [+] Hole ${i + 1}`,
      x,
      y: 0.5,
      z: RAIL_Z_MAP.bottom_pos,
      section: 'rail_bottom_pos',
      tieGroup: 'bb_tie_rail_bottom_pos',
    });

    holes.push({
      id: `bb_rail_bottom_neg_${i + 1}`,
      name: `Bottom Rail [-] Hole ${i + 1}`,
      x,
      y: 0.5,
      z: RAIL_Z_MAP.bottom_neg,
      section: 'rail_bottom_neg',
      tieGroup: 'bb_tie_rail_bottom_neg',
    });
  }

  return holes;
}

export const ALL_830_HOLES = generate830BreadboardHoles();

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
  maxDistSq = 9.0 // 3.0mm radius squared
): BreadboardHole3D | null {
  // Bounding box pre-check
  if (
    wx < -BB830_WIDTH / 2 - 3 ||
    wx > BB830_WIDTH / 2 + 3 ||
    wz < -BB830_DEPTH / 2 - 3 ||
    wz > BB830_DEPTH / 2 + 3
  ) {
    return null;
  }

  let nearest: BreadboardHole3D | null = null;
  let minDistSq = maxDistSq;

  // Narrow down candidate column
  const approxCol = Math.round((wx - START_X) / PITCH_X) + 1;
  const minCol = Math.max(1, approxCol - 2);
  const maxCol = Math.min(63, approxCol + 2);

  for (let c = minCol; c <= maxCol; c++) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const r of rows) {
      const h = HOLE_BY_ID.get(`bb_col_${c}_${r}`);
      if (h) {
        const dx = h.x - wx;
        const dz = h.z - wz;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearest = h;
        }
      }
    }
  }

  // Check rails
  for (let i = 0; i < 50; i++) {
    const rails = [
      `bb_rail_top_pos_${i + 1}`,
      `bb_rail_top_neg_${i + 1}`,
      `bb_rail_bottom_pos_${i + 1}`,
      `bb_rail_bottom_neg_${i + 1}`,
    ];
    for (const rId of rails) {
      const rh = HOLE_BY_ID.get(rId);
      if (rh) {
        const dx = rh.x - wx;
        const dz = rh.z - wz;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearest = rh;
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

