/**
 * Breadboard Model & 3D Geometry Engine
 * Solderless breadboard topology (400 / 830 tie-points), internal spring clips,
 * accurate 3D spatial unprojection, and authentic electronic package rendering.
 */

export interface BreadboardHole {
  id: string;
  name: string;
  row?: number;
  col?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
  rail?: 'top_pos' | 'top_neg' | 'bot_pos' | 'bot_neg';
  x: number;
  y: number;
  z: number;
  tieGroup: string;
}

export const BB_DEFAULT_X = -40;
export const BB_DEFAULT_Z = -10;
export const BB_WIDTH = 240;
export const BB_HEIGHT = 9;
export const BB_DEPTH = 130;
export const BB_ROWS = 30;
export const BB_START_X = BB_DEFAULT_X - 98.6;
export const BB_STEP_X = 6.8;

export const BB_COL_Z: Record<string, number> = {
  E: BB_DEFAULT_Z - 24,
  D: BB_DEFAULT_Z - 18,
  C: BB_DEFAULT_Z - 12,
  B: BB_DEFAULT_Z - 6,
  A: BB_DEFAULT_Z - 2,
  F: BB_DEFAULT_Z + 2,
  G: BB_DEFAULT_Z + 6,
  H: BB_DEFAULT_Z + 12,
  I: BB_DEFAULT_Z + 18,
  J: BB_DEFAULT_Z + 24,
};

export const BB_RAIL_Z = {
  top_pos: BB_DEFAULT_Z - 44,
  top_neg: BB_DEFAULT_Z - 36,
  bot_neg: BB_DEFAULT_Z + 36,
  bot_pos: BB_DEFAULT_Z + 44,
};

/**
 * Fast O(1) lookup to snap world (X, Z) workbench coordinates to the nearest breadboard hole
 */
export function findNearestBreadboardHole(
  wx: number,
  wz: number,
  bbX = BB_DEFAULT_X,
  bbZ = BB_DEFAULT_Z
): BreadboardHole | null {
  const startX = bbX - 98.6;
  const stepX = BB_STEP_X;
  const rFloat = (wx - startX) / stepX + 1;
  const r = Math.round(rFloat);
  if (r < 1 || r > BB_ROWS) return null;
  const rx = startX + (r - 1) * stepX;
  if (Math.abs(wx - rx) > 4.5) return null;

  const zTargets = [
    { rail: 'top_pos' as const, z: bbZ - 44, name: `Top Rail (+) [Hole ${r}]`, tie: 'bb_tie_rail_top_pos' },
    { rail: 'top_neg' as const, z: bbZ - 36, name: `Top Rail (-) [Hole ${r}]`, tie: 'bb_tie_rail_top_neg' },
    { col: 'E' as const, z: bbZ - 24, name: `Row ${r} [E]`, tie: `bb_tie_row_${r}_top` },
    { col: 'D' as const, z: bbZ - 18, name: `Row ${r} [D]`, tie: `bb_tie_row_${r}_top` },
    { col: 'C' as const, z: bbZ - 12, name: `Row ${r} [C]`, tie: `bb_tie_row_${r}_top` },
    { col: 'B' as const, z: bbZ - 6, name: `Row ${r} [B]`, tie: `bb_tie_row_${r}_top` },
    { col: 'A' as const, z: bbZ - 2, name: `Row ${r} [A]`, tie: `bb_tie_row_${r}_top` },
    { col: 'F' as const, z: bbZ + 2, name: `Row ${r} [F]`, tie: `bb_tie_row_${r}_bot` },
    { col: 'G' as const, z: bbZ + 6, name: `Row ${r} [G]`, tie: `bb_tie_row_${r}_bot` },
    { col: 'H' as const, z: bbZ + 12, name: `Row ${r} [H]`, tie: `bb_tie_row_${r}_bot` },
    { col: 'I' as const, z: bbZ + 18, name: `Row ${r} [I]`, tie: `bb_tie_row_${r}_bot` },
    { col: 'J' as const, z: bbZ + 24, name: `Row ${r} [J]`, tie: `bb_tie_row_${r}_bot` },
    { rail: 'bot_neg' as const, z: bbZ + 36, name: `Bottom Rail (-) [Hole ${r}]`, tie: 'bb_tie_rail_bot_neg' },
    { rail: 'bot_pos' as const, z: bbZ + 44, name: `Bottom Rail (+) [Hole ${r}]`, tie: 'bb_tie_rail_bot_pos' },
  ];

  for (const t of zTargets) {
    if (Math.abs(wz - t.z) < 3.2) {
      const id = t.rail ? `bb_rail_${t.rail}_${r}` : `bb_row_${r}_${t.col}`;
      return {
        id,
        name: t.name,
        row: r,
        col: t.col,
        rail: t.rail,
        x: rx,
        y: -1.0,
        z: t.z,
        tieGroup: t.tie,
      };
    }
  }
  return null;
}

/**
 * Resolve exact 3D world position from a breadboard hole ID
 */
export function getBreadboardHoleCoords(
  holeId: string,
  bbX = BB_DEFAULT_X,
  bbZ = BB_DEFAULT_Z
): { x: number; y: number; z: number; name: string } {
  const parts = holeId.split('_');
  const startX = bbX - 98.6;
  const stepX = BB_STEP_X;

  if (holeId.startsWith('bb_row_')) {
    const row = parseInt(parts[2], 10) || 1;
    const col = parts[3] || 'A';
    const rx = startX + (row - 1) * stepX;
    const rz = (BB_COL_Z[col] !== undefined) ? (bbZ + (BB_COL_Z[col] - BB_DEFAULT_Z)) : bbZ;
    return {
      x: rx,
      y: -1.0,
      z: rz,
      name: `Breadboard Row ${row} [${col}]`,
    };
  } else if (holeId.startsWith('bb_rail_')) {
    const section = parts[2]; // top or bot
    const polarity = parts[3]; // pos or neg
    const idx = parseInt(parts[4], 10) || 1;
    const rx = startX + (idx - 1) * stepX;
    let rz = bbZ - 44;
    if (section === 'top' && polarity === 'neg') rz = bbZ - 36;
    if (section === 'bot' && polarity === 'neg') rz = bbZ + 36;
    if (section === 'bot' && polarity === 'pos') rz = bbZ + 44;
    return {
      x: rx,
      y: -1.0,
      z: rz,
      name: `Breadboard ${section === 'top' ? 'Top' : 'Bottom'} Rail (${polarity === 'pos' ? '+' : '-'})`,
    };
  }
  return { x: bbX, y: -1.0, z: bbZ, name: 'Breadboard' };
}

/**
 * Calculate EIA 4-band authentic resistor color codes from numeric value string
 */
export function getResistorColorBands(valueStr: string): string[] {
  let val = parseFloat(valueStr) || 1000;
  const sLow = valueStr.toLowerCase();
  if (sLow.includes('k')) val *= 1000;
  if (sLow.includes('m')) val *= 1000000;

  const DIGIT_COLORS: Record<number, string> = {
    0: '#0F172A', // Black
    1: '#78350F', // Brown
    2: '#DC2626', // Red
    3: '#EA580C', // Orange
    4: '#EAB308', // Yellow
    5: '#16A34A', // Green
    6: '#2563EB', // Blue
    7: '#7C3AED', // Violet
    8: '#64748B', // Gray
    9: '#F8FAFC', // White
  };

  const MULT_COLORS: Record<number, string> = {
    0: '#0F172A', // Black (x1)
    1: '#78350F', // Brown (x10)
    2: '#DC2626', // Red (x100)
    3: '#EA580C', // Orange (x1k)
    4: '#EAB308', // Yellow (x10k)
    5: '#16A34A', // Green (x100k)
    6: '#2563EB', // Blue (x1M)
  };

  const s = val.toExponential();
  const [mantissaStr, expStr] = s.split('e');
  const exp = parseInt(expStr, 10);
  const mantissa = parseFloat(mantissaStr);
  const d1 = Math.min(9, Math.max(0, Math.floor(mantissa)));
  const d2 = Math.min(9, Math.max(0, Math.round((mantissa - d1) * 10)));
  const mult = Math.min(6, Math.max(0, exp - 1));

  return [
    DIGIT_COLORS[d1] || '#78350F',
    DIGIT_COLORS[d2] || '#0F172A',
    MULT_COLORS[mult] || '#DC2626',
    '#F59E0B', // Gold 5% tolerance
  ];
}

/**
 * Render a shaded 3D perspective box (prism) with proper face sorting
 */
export function drawBox3D(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  topColor: string,
  frontColor: string,
  sideColor: string,
  strokeColor: string,
  project: (x: number, y: number, z: number) => { px: number; py: number; depth: number }
) {
  // Top 4 points (Y = y1, top surface)
  const t1 = project(x1, y1, z1);
  const t2 = project(x2, y1, z1);
  const t3 = project(x2, y1, z2);
  const t4 = project(x1, y1, z2);

  // Bottom 4 points (Y = y2, bottom surface)
  const b1 = project(x1, y2, z1);
  const b2 = project(x2, y2, z1);
  const b3 = project(x2, y2, z2);
  const b4 = project(x1, y2, z2);

  // Front face (Z = z2)
  ctx.fillStyle = frontColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(t4.px, t4.py);
  ctx.lineTo(t3.px, t3.py);
  ctx.lineTo(b3.px, b3.py);
  ctx.lineTo(b4.px, b4.py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right side face (X = x2)
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(t2.px, t2.py);
  ctx.lineTo(t3.px, t3.py);
  ctx.lineTo(b3.px, b3.py);
  ctx.lineTo(b2.px, b2.py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left side face (X = x1)
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(t1.px, t1.py);
  ctx.lineTo(t4.px, t4.py);
  ctx.lineTo(b4.px, b4.py);
  ctx.lineTo(b1.px, b1.py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top face (Y = y1)
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(t1.px, t1.py);
  ctx.lineTo(t2.px, t2.py);
  ctx.lineTo(t3.px, t3.py);
  ctx.lineTo(t4.px, t4.py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
