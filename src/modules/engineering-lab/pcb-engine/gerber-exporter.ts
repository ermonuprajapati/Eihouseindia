/**
 * Industrial RS-274X Gerber & Excellon NC Drill Exporter
 * Generates full manufacturing package for JLCPCB, PCBWay, and standard fab houses.
 * Upgraded to CAM rejection-proof standards with pad-accurate silkscreen, solder paste,
 * non-overlapping PTH/NPTH drill separation, vector stroke silkscreen font, and JLCPCB BOM format.
 */

import { PcbLayout, CircuitComponent, PcbPad, PcbTrack, PcbComponentPlacement } from '../types';
import { DrillExporter } from './drill-export';
import { ZipBuilder } from './zip-builder';

// ---------------------------------------------------------------------------
// XML and String Escaping Helper
// ---------------------------------------------------------------------------
export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/"/g, '""');
}

// ---------------------------------------------------------------------------
// 5x7 Stroke Font Engine for RS-274X Vector Silkscreen
// ---------------------------------------------------------------------------
type StrokeLine = [number, number, number, number]; // [x1, y1, x2, y2] normalized 0..1

const CHAR_STROKES: Record<string, StrokeLine[]> = {
  ' ': [],
  '-': [[0.2, 0.5, 0.8, 0.5]],
  '+': [[0.2, 0.5, 0.8, 0.5], [0.5, 0.2, 0.5, 0.8]],
  '.': [[0.4, 0.1, 0.6, 0.1]],
  '/': [[0.2, 0.1, 0.8, 0.9]],
  ':': [[0.5, 0.3, 0.5, 0.35], [0.5, 0.65, 0.5, 0.7]],
  '_': [[0.1, 0.05, 0.9, 0.05]],
  '0': [[0.2, 0.1, 0.8, 0.1], [0.8, 0.1, 0.8, 0.9], [0.8, 0.9, 0.2, 0.9], [0.2, 0.9, 0.2, 0.1], [0.2, 0.1, 0.8, 0.9]],
  '1': [[0.3, 0.7, 0.5, 0.9], [0.5, 0.9, 0.5, 0.1], [0.2, 0.1, 0.8, 0.1]],
  '2': [[0.2, 0.8, 0.5, 0.9], [0.5, 0.9, 0.8, 0.8], [0.8, 0.8, 0.8, 0.6], [0.8, 0.6, 0.2, 0.1], [0.2, 0.1, 0.8, 0.1]],
  '3': [[0.2, 0.9, 0.8, 0.9], [0.8, 0.9, 0.4, 0.55], [0.4, 0.55, 0.8, 0.55], [0.8, 0.55, 0.8, 0.2], [0.8, 0.2, 0.2, 0.1]],
  '4': [[0.7, 0.1, 0.7, 0.9], [0.7, 0.9, 0.2, 0.4], [0.2, 0.4, 0.9, 0.4]],
  '5': [[0.8, 0.9, 0.2, 0.9], [0.2, 0.9, 0.2, 0.55], [0.2, 0.55, 0.7, 0.55], [0.7, 0.55, 0.8, 0.35], [0.8, 0.35, 0.6, 0.1], [0.6, 0.1, 0.2, 0.1]],
  '6': [[0.7, 0.9, 0.3, 0.6], [0.3, 0.6, 0.2, 0.3], [0.2, 0.3, 0.4, 0.1], [0.4, 0.1, 0.7, 0.1], [0.7, 0.1, 0.8, 0.3], [0.8, 0.3, 0.7, 0.5], [0.7, 0.5, 0.3, 0.5]],
  '7': [[0.2, 0.9, 0.8, 0.9], [0.8, 0.9, 0.4, 0.1]],
  '8': [[0.3, 0.5, 0.7, 0.5], [0.3, 0.5, 0.2, 0.7], [0.2, 0.7, 0.4, 0.9], [0.4, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.7, 0.5], [0.3, 0.5, 0.2, 0.3], [0.2, 0.3, 0.4, 0.1], [0.4, 0.1, 0.6, 0.1], [0.6, 0.1, 0.8, 0.3], [0.8, 0.3, 0.7, 0.5]],
  '9': [[0.7, 0.5, 0.3, 0.5], [0.3, 0.5, 0.2, 0.7], [0.2, 0.7, 0.3, 0.9], [0.3, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.7, 0.4], [0.7, 0.4, 0.3, 0.1]],
  'A': [[0.2, 0.1, 0.5, 0.9], [0.5, 0.9, 0.8, 0.1], [0.3, 0.4, 0.7, 0.4]],
  'B': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.6, 0.5], [0.2, 0.5, 0.6, 0.5], [0.6, 0.5, 0.8, 0.3], [0.8, 0.3, 0.6, 0.1], [0.6, 0.1, 0.2, 0.1]],
  'C': [[0.8, 0.8, 0.4, 0.9], [0.4, 0.9, 0.2, 0.5], [0.2, 0.5, 0.4, 0.1], [0.4, 0.1, 0.8, 0.2]],
  'D': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.5, 0.9], [0.5, 0.9, 0.8, 0.6], [0.8, 0.6, 0.8, 0.4], [0.8, 0.4, 0.5, 0.1], [0.5, 0.1, 0.2, 0.1]],
  'E': [[0.8, 0.9, 0.2, 0.9], [0.2, 0.9, 0.2, 0.1], [0.2, 0.1, 0.8, 0.1], [0.2, 0.5, 0.6, 0.5]],
  'F': [[0.8, 0.9, 0.2, 0.9], [0.2, 0.9, 0.2, 0.1], [0.2, 0.5, 0.6, 0.5]],
  'G': [[0.8, 0.8, 0.4, 0.9], [0.4, 0.9, 0.2, 0.5], [0.2, 0.5, 0.4, 0.1], [0.4, 0.1, 0.8, 0.1], [0.8, 0.1, 0.8, 0.5], [0.8, 0.5, 0.5, 0.5]],
  'H': [[0.2, 0.1, 0.2, 0.9], [0.8, 0.1, 0.8, 0.9], [0.2, 0.5, 0.8, 0.5]],
  'I': [[0.3, 0.9, 0.7, 0.9], [0.5, 0.9, 0.5, 0.1], [0.3, 0.1, 0.7, 0.1]],
  'J': [[0.8, 0.9, 0.8, 0.3], [0.8, 0.3, 0.6, 0.1], [0.6, 0.1, 0.3, 0.1], [0.3, 0.1, 0.2, 0.3]],
  'K': [[0.2, 0.1, 0.2, 0.9], [0.8, 0.9, 0.2, 0.4], [0.4, 0.55, 0.8, 0.1]],
  'L': [[0.2, 0.9, 0.2, 0.1], [0.2, 0.1, 0.8, 0.1]],
  'M': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.5, 0.4], [0.5, 0.4, 0.8, 0.9], [0.8, 0.9, 0.8, 0.1]],
  'N': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.8, 0.1], [0.8, 0.1, 0.8, 0.9]],
  'O': [[0.4, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.8, 0.3], [0.8, 0.3, 0.6, 0.1], [0.6, 0.1, 0.4, 0.1], [0.4, 0.1, 0.2, 0.3], [0.2, 0.3, 0.2, 0.7], [0.2, 0.7, 0.4, 0.9]],
  'P': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.6, 0.5], [0.6, 0.5, 0.2, 0.5]],
  'Q': [[0.4, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.8, 0.3], [0.8, 0.3, 0.6, 0.1], [0.6, 0.1, 0.4, 0.1], [0.4, 0.1, 0.2, 0.3], [0.2, 0.3, 0.2, 0.7], [0.2, 0.7, 0.4, 0.9], [0.5, 0.3, 0.8, 0.05]],
  'R': [[0.2, 0.1, 0.2, 0.9], [0.2, 0.9, 0.6, 0.9], [0.6, 0.9, 0.8, 0.7], [0.8, 0.7, 0.6, 0.5], [0.6, 0.5, 0.2, 0.5], [0.5, 0.5, 0.8, 0.1]],
  'S': [[0.8, 0.8, 0.5, 0.9], [0.5, 0.9, 0.2, 0.7], [0.2, 0.7, 0.5, 0.5], [0.5, 0.5, 0.8, 0.3], [0.8, 0.3, 0.5, 0.1], [0.5, 0.1, 0.2, 0.2]],
  'T': [[0.2, 0.9, 0.8, 0.9], [0.5, 0.9, 0.5, 0.1]],
  'U': [[0.2, 0.9, 0.2, 0.3], [0.2, 0.3, 0.4, 0.1], [0.4, 0.1, 0.6, 0.1], [0.6, 0.1, 0.8, 0.3], [0.8, 0.3, 0.8, 0.9]],
  'V': [[0.2, 0.9, 0.5, 0.1], [0.5, 0.1, 0.8, 0.9]],
  'W': [[0.2, 0.9, 0.3, 0.1], [0.3, 0.1, 0.5, 0.6], [0.5, 0.6, 0.7, 0.1], [0.7, 0.1, 0.8, 0.9]],
  'X': [[0.2, 0.1, 0.8, 0.9], [0.2, 0.9, 0.8, 0.1]],
  'Y': [[0.2, 0.9, 0.5, 0.5], [0.8, 0.9, 0.5, 0.5], [0.5, 0.5, 0.5, 0.1]],
  'Z': [[0.2, 0.9, 0.8, 0.9], [0.8, 0.9, 0.2, 0.1], [0.2, 0.1, 0.8, 0.1]],
};

function renderVectorTextToGerber(
  text: string,
  originX: number,
  originY: number,
  charWidth = 1.0,
  charHeight = 1.5,
  spacing = 0.3
): string {
  let out = ``;
  const clean = text.toUpperCase();
  let currentX = originX;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const strokes = CHAR_STROKES[ch] || CHAR_STROKES['-'] || [];
    for (const [x1, y1, x2, y2] of strokes) {
      const px1 = Math.round((currentX + x1 * charWidth) * 100000);
      const py1 = Math.round((originY + y1 * charHeight) * 100000);
      const px2 = Math.round((currentX + x2 * charWidth) * 100000);
      const py2 = Math.round((originY + y2 * charHeight) * 100000);
      out += `X${px1}Y${py1}D02*\n`;
      out += `G01*\nX${px2}Y${py2}D01*\n`;
    }
    currentX += charWidth + spacing;
  }
  return out;
}

class ApertureTable {
  private nextCode = 10;
  private defs: string[] = [];
  private map = new Map<string, string>();

  constructor() {
    // D10 is always registered first: 0.250000mm circle (standard signal track)
    this.register('C,0.250000');
  }

  public register(spec: string): string {
    if (this.map.has(spec)) {
      return this.map.get(spec)!;
    }
    const code = `D${this.nextCode++}`;
    this.map.set(spec, code);
    this.defs.push(`%AD${code}${spec}*%`);
    return code;
  }

  public getCode(spec: string): string {
    return this.map.get(spec) || this.register(spec);
  }

  public getDefinitions(): string {
    return this.defs.join('\n') + (this.defs.length > 0 ? '\n' : '');
  }
}

export class GerberExporter {
  /**
   * Generates Top Copper (.gtl / F_Cu.GTL) with dynamic track/pad/via apertures
   */
  public static exportTopCopper(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const tracks = (pcb.tracks || []).filter((t) => t.layer === 'top_copper');
    const pads = (pcb.pads || []).filter((p) => p.layer === 'all' || p.layer === 'top');

    // Register track apertures
    tracks.forEach((t) => {
      const width = t.widthMm || 0.25;
      apertures.register(`C,${width.toFixed(6)}`);
    });

    // Register pad apertures
    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    // Register extra via apertures
    const extraVias = ((pcb as { vias?: { x: number; y: number; diameterMm?: number }[] }).vias || []).filter(
      (v) => !pcb.pads?.some((p) => Math.hypot(p.x - v.x, p.y - v.y) < 0.01)
    );
    extraVias.forEach((v) => {
      const dia = v.diameterMm || 0.8;
      apertures.register(`C,${dia.toFixed(6)}`);
    });

    let out = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,2.0*%\n`;
    out += `%TF.CreationDate,${new Date().toISOString()}*%\n`;
    out += `%TF.Part,Single*%\n`;
    out += `%TF.FileFunction,Copper,L1,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Top Copper (F.Cu)*\n`;
    out += `D10*\n`;

    let currentAp = 'D10';

    tracks.forEach((t) => {
      const width = t.widthMm || 0.25;
      const ap = apertures.getCode(`C,${width.toFixed(6)}`);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const x1 = Math.round(t.from.x * 100000);
      const y1 = Math.round(t.from.y * 100000);
      const x2 = Math.round(t.to.x * 100000);
      const y2 = Math.round(t.to.y * 100000);
      out += `X${x1}Y${y1}D02*\n`;
      out += `G01*\nX${x2}Y${y2}D01*\n`;
    });

    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    extraVias.forEach((v) => {
      const dia = v.diameterMm || 0.8;
      const ap = apertures.getCode(`C,${dia.toFixed(6)}`);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(v.x * 100000);
      const py = Math.round(v.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Copper (.gbl / B_Cu.GBL) with dynamic track/pad/via apertures
   */
  public static exportBottomCopper(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const tracks = (pcb.tracks || []).filter((t) => t.layer === 'bottom_copper');
    const pads = (pcb.pads || []).filter((p) => p.layer === 'all' || p.layer === 'bottom');

    tracks.forEach((t) => {
      const width = t.widthMm || 0.25;
      apertures.register(`C,${width.toFixed(6)}`);
    });

    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    const extraVias = ((pcb as { vias?: { x: number; y: number; diameterMm?: number }[] }).vias || []).filter(
      (v) => !pcb.pads?.some((p) => Math.hypot(p.x - v.x, p.y - v.y) < 0.01)
    );
    extraVias.forEach((v) => {
      const dia = v.diameterMm || 0.8;
      apertures.register(`C,${dia.toFixed(6)}`);
    });

    let out = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,2.0*%\n`;
    out += `%TF.CreationDate,${new Date().toISOString()}*%\n`;
    out += `%TF.Part,Single*%\n`;
    out += `%TF.FileFunction,Copper,L2,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Bottom Copper (B.Cu)*\n`;
    out += `D10*\n`;

    let currentAp = 'D10';

    tracks.forEach((t) => {
      const width = t.widthMm || 0.25;
      const ap = apertures.getCode(`C,${width.toFixed(6)}`);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const x1 = Math.round(t.from.x * 100000);
      const y1 = Math.round(t.from.y * 100000);
      const x2 = Math.round(t.to.x * 100000);
      const y2 = Math.round(t.to.y * 100000);
      out += `X${x1}Y${y1}D02*\n`;
      out += `G01*\nX${x2}Y${y2}D01*\n`;
    });

    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    extraVias.forEach((v) => {
      const dia = v.diameterMm || 0.8;
      const ap = apertures.getCode(`C,${dia.toFixed(6)}`);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(v.x * 100000);
      const py = Math.round(v.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Top Solder Mask (.gts / F_Mask.GTS) with +0.10mm pad mask expansion
   */
  public static exportTopSolderMask(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const pads = (pcb.pads || []).filter((p) => p.layer === 'all' || p.layer === 'top');

    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = (((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const h = (((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    let out = `%TF.FileFunction,Soldermask,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Top Solder Mask (F.Mask)*\n`;

    let currentAp = '';
    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = (((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const h = (((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Solder Mask (.gbs / B_Mask.GBS) with +0.10mm pad mask expansion
   */
  public static exportBottomSolderMask(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const pads = (pcb.pads || []).filter((p) => p.layer === 'all' || p.layer === 'bottom');

    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = (((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const h = (((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    let out = `%TF.FileFunction,Soldermask,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Bottom Solder Mask (B.Mask)*\n`;

    let currentAp = '';
    pads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = (((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const h = (((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8) + 0.10).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Top Solder Paste Mask (.gtp / F_Paste.GTP) for SMD Stencils
   */
  public static exportTopPaste(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const smdPads = (pcb.pads || []).filter(
      (p) => p.layer === 'top' && (!p.holeMm || p.holeMm <= 0)
    );

    smdPads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    let out = `%TF.FileFunction,Paste,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Top Solder Paste (F.Paste)*\n`;

    let currentAp = '';
    smdPads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Solder Paste Mask (.gbp / B_Paste.GBP) for SMD Stencils
   */
  public static exportBottomPaste(pcb: PcbLayout): string {
    const apertures = new ApertureTable();
    const smdPads = (pcb.pads || []).filter(
      (p) => p.layer === 'bottom' && (!p.holeMm || p.holeMm <= 0)
    );

    smdPads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      apertures.register(spec);
    });

    let out = `%TF.FileFunction,Paste,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += apertures.getDefinitions();
    out += `G04 Layer: Bottom Solder Paste (B.Paste)*\n`;

    let currentAp = '';
    smdPads.forEach((p) => {
      const isRect = p.shape === 'rect';
      const w = ((p as { widthMm?: number }).widthMm || p.diameterMm || 1.8).toFixed(6);
      const h = ((p as { heightMm?: number }).heightMm || p.diameterMm || 1.8).toFixed(6);
      const spec = isRect ? `R,${w}X${h}` : `C,${w}`;
      const ap = apertures.getCode(spec);
      if (ap !== currentAp) {
        out += `${ap}*\n`;
        currentAp = ap;
      }
      const px = Math.round(p.x * 100000);
      const py = Math.round(p.y * 100000);
      out += `X${px}Y${py}D03*\n`;
    });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Top Silkscreen (.gto / F_SilkS.GTO) with pad-derived component bounds,
   * Pin-1 cues, vector stroke font for designators, and user silkscreen texts.
   */
  public static exportTopSilkscreen(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Legend,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD13C,0.150000*%\n`; // 0.15mm standard silkscreen stroke
    out += `%ADD14C,0.400000*%\n`; // Pin-1 marker dot aperture
    out += `G04 Layer: Top Silkscreen (F.SilkS)*\n`;
    out += `D13*\n`;

    // Map component pads to determine realistic body envelopes
    const compPadsMap = new Map<string, PcbPad[]>();
    (pcb.pads || []).forEach((p) => {
      if (!p.componentId) return;
      if (!compPadsMap.has(p.componentId)) compPadsMap.set(p.componentId, []);
      compPadsMap.get(p.componentId)!.push(p);
    });

    if (pcb.components) {
      pcb.components.forEach((comp: PcbComponentPlacement) => {
        const cPads = compPadsMap.get(comp.componentId) || [];
        let minX = comp.x - 3;
        let maxX = comp.x + 3;
        let minY = comp.y - 2.5;
        let maxY = comp.y + 2.5;

        if (cPads.length > 0) {
          minX = Math.min(...cPads.map((p) => p.x - (p.diameterMm || 1.8) / 2)) - 0.5;
          maxX = Math.max(...cPads.map((p) => p.x + (p.diameterMm || 1.8) / 2)) + 0.5;
          minY = Math.min(...cPads.map((p) => p.y - (p.diameterMm || 1.8) / 2)) - 0.5;
          maxY = Math.max(...cPads.map((p) => p.y + (p.diameterMm || 1.8) / 2)) + 0.5;
        }

        // Silkscreen component envelope boundary
        const x1 = Math.round(minX * 100000);
        const y1 = Math.round(minY * 100000);
        const x2 = Math.round(maxX * 100000);
        const y2 = Math.round(maxY * 100000);

        out += `X${x1}Y${y1}D02*\n`;
        out += `G01*\nX${x2}Y${y1}D01*\n`;
        out += `G01*\nX${x2}Y${y2}D01*\n`;
        out += `G01*\nX${x1}Y${y2}D01*\n`;
        out += `G01*\nX${x1}Y${y1}D01*\n`;

        // Pin-1 Cue Dot
        if (cPads.length > 1) {
          const pin1 = cPads[0];
          const dotX = Math.round((pin1.x - 1.2) * 100000);
          const dotY = Math.round(pin1.y * 100000);
          out += `D14*\nX${dotX}Y${dotY}D03*\nD13*\n`;
        }

        // Vector Stroke Font Designator Label placed above or inside component boundary
        const des = comp.designator || comp.componentId || 'U?';
        const labelX = Math.max(0.5, minX);
        const labelY = Math.min(pcb.heightMm - 2, maxY + 0.4);
        out += renderVectorTextToGerber(des, labelX, labelY, 0.8, 1.2, 0.2);
      });
    }

    // User Silkscreen Texts
    const userTexts = (pcb as { silkscreenTexts?: Array<{ text: string; x: number; y: number; layer?: string }> }).silkscreenTexts || [];
    userTexts
      .filter((t) => !t.layer || t.layer === 'top')
      .forEach((t) => {
        out += renderVectorTextToGerber(t.text, t.x, t.y, 1.0, 1.5, 0.3);
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Silkscreen (.gbo / B_SilkS.GBO)
   */
  public static exportBottomSilkscreen(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Legend,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD13C,0.150000*%\n`;
    out += `G04 Layer: Bottom Silkscreen (B.SilkS)*\n`;
    out += `D13*\n`;

    const userTexts = (pcb as { silkscreenTexts?: Array<{ text: string; x: number; y: number; layer?: string }> }).silkscreenTexts || [];
    userTexts
      .filter((t) => t.layer === 'bottom')
      .forEach((t) => {
        out += renderVectorTextToGerber(t.text, t.x, t.y, 1.0, 1.5, 0.3);
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Board Outline Edge.Cuts (.gko / Edge_Cuts.GKO)
   */
  public static exportEdgeCuts(pcb: PcbLayout): string {
    const w = Math.round(pcb.widthMm * 100000);
    const h = Math.round(pcb.heightMm * 100000);

    let out = `%TF.FileFunction,Profile,NP*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD10C,0.150000*%\n`;
    out += `G04 Layer: Edge.Cuts (Board Outline)*\n`;
    out += `D10*\n`;
    out += `X0Y0D02*\n`;
    out += `G01*\nX${w}Y0D01*\n`;
    out += `G01*\nX${w}Y${h}D01*\n`;
    out += `G01*\nX0Y${h}D01*\n`;
    out += `G01*\nX0Y0D01*\n`;
    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Excellon NC Drill file (.drl / Drill.DRL)
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    return DrillExporter.exportExcellonDrill(pcb);
  }

  /**
   * Generates Pick and Place Centroid CSV file (SMT Assembly)
   */
  public static exportPickAndPlaceCsv(pcb: PcbLayout): string {
    let csv = `Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n`;
    if (pcb.components) {
      pcb.components.forEach((c) => {
        const des = csvEscape(c.designator || c.label || c.componentId);
        const val = csvEscape(c.value || '-');
        const pkg = csvEscape(c.footprint || c.type || 'Generic');
        const rot = c.rotation || 0;
        csv += `"${des}","${val}","${pkg}",${c.x.toFixed(3)},${c.y.toFixed(3)},${rot},"Top"\n`;
      });
    }
    return csv;
  }

  /**
   * Generates Bill of Materials (BOM) in standard CSV format
   */
  public static exportBomCsv(components: CircuitComponent[]): string {
    let csv = `Item,Designator,Quantity,Component Type,Value,Footprint,Manufacturer Part No\n`;

    const map = new Map<string, { type: string; value: string; footprint: string; des: string[]; mpn: string }>();

    components.forEach((c) => {
      const key = `${c.type}__${c.value}__${c.footprint}`;
      const d = c.designator || c.label || c.id;
      const mpn = c.manufacturerPartNumber || '-';
      const existing = map.get(key);
      if (existing) {
        existing.des.push(d);
      } else {
        map.set(key, { type: c.type, value: c.value, footprint: c.footprint, des: [d], mpn });
      }
    });

    let itemIdx = 1;
    map.forEach((item) => {
      const desEscaped = csvEscape(item.des.join(', '));
      const typeEscaped = csvEscape(item.type);
      const valEscaped = csvEscape(item.value);
      const pkgEscaped = csvEscape(item.footprint);
      const mpnEscaped = csvEscape(item.mpn);
      csv += `${itemIdx++},"${desEscaped}",${item.des.length},"${typeEscaped}","${valEscaped}","${pkgEscaped}","${mpnEscaped}"\n`;
    });

    return csv;
  }

  /**
   * Generates JLCPCB SMT Assembly compliant BOM format
   * Excludes virtual GROUND/VCC schematic symbols
   */
  public static exportJlcpcbBomCsv(components: CircuitComponent[]): string {
    let csv = `Comment,Designator,Footprint,Quantity,LCSC Part #\n`;

    const nonVirtual = components.filter((c) => {
      const t = (c.type || '').toUpperCase();
      return !t.startsWith('GND') && !t.startsWith('VCC') && t !== 'GROUND' && t !== 'NET_FLAG';
    });

    const map = new Map<string, { comment: string; footprint: string; des: string[]; lcsc: string }>();

    nonVirtual.forEach((c) => {
      const comment = c.value || c.type;
      const footprint = c.footprint || 'Generic';
      const key = `${comment}__${footprint}`;
      const des = c.designator || c.label || c.id;
      const lcsc = c.parameters?.lcscPartNumber ? String(c.parameters.lcscPartNumber) : '-';

      const existing = map.get(key);
      if (existing) {
        existing.des.push(des);
      } else {
        map.set(key, { comment, footprint, des: [des], lcsc });
      }
    });

    map.forEach((item) => {
      const commentEscaped = csvEscape(item.comment);
      const desEscaped = csvEscape(item.des.join(','));
      const pkgEscaped = csvEscape(item.footprint);
      const lcscEscaped = csvEscape(item.lcsc);
      csv += `"${commentEscaped}","${desEscaped}","${pkgEscaped}",${item.des.length},"${lcscEscaped}"\n`;
    });

    return csv;
  }

  /**
   * Generates 2D Print / Blueprint Vector SVG with strict XML character escaping
   */
  public static exportBlueprintSvg(pcb: PcbLayout): string {
    const w = pcb.widthMm;
    const h = pcb.heightMm;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n`;
    svg += `  <rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="#042F2E" stroke="#0D9488" stroke-width="0.5"/>\n`;

    // Bottom copper tracks
    svg += `  <g id="Bottom_Copper" stroke="#3B82F6" stroke-linecap="round" stroke-linejoin="round">\n`;
    (pcb.tracks || [])
      .filter((t) => t.layer === 'bottom_copper')
      .forEach((t) => {
        svg += `    <line x1="${t.from.x}" y1="${t.from.y}" x2="${t.to.x}" y2="${t.to.y}" stroke-width="${t.widthMm}"/>\n`;
      });
    svg += `  </g>\n`;

    // Top copper tracks
    svg += `  <g id="Top_Copper" stroke="#EF4444" stroke-linecap="round" stroke-linejoin="round">\n`;
    (pcb.tracks || [])
      .filter((t) => t.layer === 'top_copper')
      .forEach((t) => {
        svg += `    <line x1="${t.from.x}" y1="${t.from.y}" x2="${t.to.x}" y2="${t.to.y}" stroke-width="${t.widthMm}"/>\n`;
      });
    svg += `  </g>\n`;

    // Pads
    svg += `  <g id="Pads" fill="#F59E0B" stroke="#D97706" stroke-width="0.1">\n`;
    (pcb.pads || []).forEach((p) => {
      const dia = p.diameterMm || 1.8;
      const r = dia / 2;
      if (p.shape === 'rect') {
        svg += `    <rect x="${p.x - r}" y="${p.y - r}" width="${dia}" height="${dia}"/>\n`;
      } else {
        svg += `    <circle cx="${p.x}" cy="${p.y}" r="${r}"/>\n`;
      }
    });
    svg += `  </g>\n`;

    // Vias
    const extraVias = ((pcb as { vias?: { x: number; y: number; diameterMm?: number; drillMm?: number }[] }).vias || []).filter(
      (v) => !pcb.pads?.some((p) => Math.hypot(p.x - v.x, p.y - v.y) < 0.01)
    );
    const viaPads = (pcb.pads || []).filter((p) => p.componentId === 'VIA');
    const allVias = [
      ...viaPads.map((p) => ({ x: p.x, y: p.y, diameterMm: p.diameterMm || 0.6, drillMm: p.holeMm || 0.3 })),
      ...extraVias,
    ];
    if (allVias.length > 0) {
      svg += `  <g id="Vias" fill="#10B981" stroke="#059669" stroke-width="0.05">\n`;
      allVias.forEach((v) => {
        const r = (v.diameterMm || 0.6) / 2;
        svg += `    <circle cx="${v.x}" cy="${v.y}" r="${r}"/>\n`;
      });
      svg += `  </g>\n`;
      svg += `  <g id="Via_Holes" fill="#020617">\n`;
      allVias.forEach((v) => {
        const hr = (v.drillMm || 0.3) / 2;
        svg += `    <circle cx="${v.x}" cy="${v.y}" r="${hr}"/>\n`;
      });
      svg += `  </g>\n`;
    }

    // Drill holes
    svg += `  <g id="Drill_Holes" fill="#020617">\n`;
    (pcb.pads || []).forEach((p) => {
      if (p.holeMm && p.holeMm > 0) {
        svg += `    <circle cx="${p.x}" cy="${p.y}" r="${p.holeMm / 2}"/>\n`;
      }
    });
    svg += `  </g>\n`;

    // Corner Mounting Holes (M3)
    if (pcb.mountingHoles && pcb.mountingHoles.length > 0) {
      svg += `  <g id="Mounting_Holes" fill="#020617" stroke="#64748B" stroke-width="0.3">\n`;
      pcb.mountingHoles.forEach((hole) => {
        svg += `    <circle cx="${hole.x}" cy="${hole.y}" r="${hole.diameterMm / 2}"/>\n`;
      });
      svg += `  </g>\n`;
    }

    // Silkscreen
    svg += `  <g id="Silkscreen" stroke="#FFFFFF" fill="none" stroke-width="0.15">\n`;
    const compPadsMap = new Map<string, PcbPad[]>();
    (pcb.pads || []).forEach((p) => {
      if (!p.componentId) return;
      if (!compPadsMap.has(p.componentId)) compPadsMap.set(p.componentId, []);
      compPadsMap.get(p.componentId)!.push(p);
    });

    if (pcb.components) {
      pcb.components.forEach((c) => {
        const cPads = compPadsMap.get(c.componentId) || [];
        let minX = c.x - 3;
        let maxX = c.x + 3;
        let minY = c.y - 2.5;
        let maxY = c.y + 2.5;

        if (cPads.length > 0) {
          minX = Math.min(...cPads.map((p) => p.x - (p.diameterMm || 1.8) / 2)) - 0.5;
          maxX = Math.max(...cPads.map((p) => p.x + (p.diameterMm || 1.8) / 2)) + 0.5;
          minY = Math.min(...cPads.map((p) => p.y - (p.diameterMm || 1.8) / 2)) - 0.5;
          maxY = Math.max(...cPads.map((p) => p.y + (p.diameterMm || 1.8) / 2)) + 0.5;
        }

        const bw = Math.max(1, maxX - minX);
        const bh = Math.max(1, maxY - minY);
        svg += `    <rect x="${minX.toFixed(3)}" y="${minY.toFixed(3)}" width="${bw.toFixed(3)}" height="${bh.toFixed(3)}" rx="0.5"/>\n`;
        const desEscaped = escapeXml(c.designator || c.label || c.componentId);
        const valEscaped = escapeXml(c.value || '');
        svg += `    <text x="${(minX + 0.5).toFixed(3)}" y="${Math.max(1, minY - 0.5).toFixed(3)}" font-family="monospace" font-size="1.2" fill="#FFFFFF" stroke="none">${desEscaped} ${valEscaped}</text>\n`;
      });
    }

    // User silkscreen texts
    const userTexts = (pcb as { silkscreenTexts?: Array<{ text: string; x: number; y: number }> }).silkscreenTexts || [];
    userTexts.forEach((t) => {
      svg += `    <text x="${t.x}" y="${t.y}" font-family="monospace" font-size="1.4" fill="#FFFFFF" stroke="none">${escapeXml(t.text)}</text>\n`;
    });

    svg += `  </g>\n`;
    svg += `</svg>\n`;
    return svg;
  }

  /**
   * Generates README_MANUFACTURING.txt containing complete PCB specs
   */
  public static generateReadme(pcb: PcbLayout, projectTitle: string): string {
    const trackCount = (pcb.tracks || []).length;
    const padCount = (pcb.pads || []).length;
    const viaCount = ((pcb as { vias?: unknown[] }).vias || []).length;
    const compCount = (pcb.components || []).length;
    const hasMountingHoles = Boolean(pcb.mountingHoles && pcb.mountingHoles.length > 0);

    return `========================================================================
EI HOUSE INDIA — MANUFACTURING SPECIFICATION & GERBER PACKAGE
Project: ${projectTitle}
Generated: ${new Date().toUTCString()}
Standard: RS-274X Extended Gerber & Excellon NC Drill (Metric Format)
Compatible with: JLCPCB, PCBWay, OSH Park, PCBTrain
========================================================================

BOARD FABRICATION SPECIFICATIONS:
- Board Size: ${pcb.widthMm.toFixed(2)} mm x ${pcb.heightMm.toFixed(2)} mm
- Layer Count: 2 Layers (FR-4 Double Sided)
- Board Thickness: ${pcb.boardThicknessMm || 1.6} mm
- Finished Copper: 1 oz (35 um)
- Solder Mask: Top & Bottom (+0.10 mm expansion)
- Silkscreen: Top (pad-derived component outlines & vector text)
- Surface Finish: Lead-Free HASL / ENIG Compatible
- Routing Statistics:
    * Total Signal/Power Tracks: ${trackCount}
    * Component Pads: ${padCount}
    * Vias: ${viaCount}
    * Physical Components: ${compCount}
    * M3 Mounting Holes: ${hasMountingHoles ? pcb.mountingHoles!.length : 0}

INCLUDED MANUFACTURING FILES:
1. F_Cu.GTL          - Top Copper Layer (RS-274X)
2. B_Cu.GBL          - Bottom Copper Layer (RS-274X)
3. F_Mask.GTS        - Top Solder Mask Layer (RS-274X)
4. B_Mask.GBS        - Bottom Solder Mask Layer (RS-274X)
5. F_SilkS.GTO       - Top Silkscreen Legend (RS-274X)
6. B_SilkS.GBO       - Bottom Silkscreen Legend (RS-274X)
7. F_Paste.GTP       - Top Solder Paste Mask (SMD Stencil)
8. B_Paste.GBP       - Bottom Solder Paste Mask (SMD Stencil)
9. Edge_Cuts.GKO     - Mechanical Board Outline (RS-274X)
10. Drill.DRL        - Plated Through-Hole Drill (Excellon 2, 0 duplicate hits)
${hasMountingHoles ? '11. Drill_NPTH.DRL   - Non-Plated Mounting Holes Drill (Excellon 2)\n' : ''}12. PickAndPlace.csv - SMT Centroid Coordinates (CPL)
13. Bill_of_Materials.csv - Engineering Bill of Materials (BOM)
14. BOM_JLCPCB.csv   - JLCPCB SMT Assembly Formatted BOM
========================================================================
`;
  }

  /**
   * Export all manufacturing files as key-value text record
   */
  public static generateManufacturingBundle(pcb: PcbLayout, components: CircuitComponent[]): Record<string, string> {
    const topCu = this.exportTopCopper(pcb);
    const botCu = this.exportBottomCopper(pcb);
    const topMask = this.exportTopSolderMask(pcb);
    const botMask = this.exportBottomSolderMask(pcb);
    const topPaste = this.exportTopPaste(pcb);
    const botPaste = this.exportBottomPaste(pcb);
    const topSilk = this.exportTopSilkscreen(pcb);
    const botSilk = this.exportBottomSilkscreen(pcb);
    const edgeCuts = this.exportEdgeCuts(pcb);
    const drill = DrillExporter.exportExcellonPthDrill(pcb);
    const drillNpth = DrillExporter.exportExcellonNpthDrill(pcb);
    const pnp = this.exportPickAndPlaceCsv(pcb);
    const bom = this.exportBomCsv(components);
    const jlcBom = this.exportJlcpcbBomCsv(components);
    const readme = this.generateReadme(pcb, 'EI_House_PCB');

    return {
      'Top_Copper.gtl': topCu,
      'Bottom_Copper.gbl': botCu,
      'Top_SolderMask.gts': topMask,
      'Bottom_SolderMask.gbs': botMask,
      'Top_Silkscreen.gto': topSilk,
      'Bottom_Silkscreen.gbo': botSilk,
      'Top_Paste.gtp': topPaste,
      'Bottom_Paste.gbp': botPaste,
      'Board_Outline.gko': edgeCuts,
      'Drill_Plated.drl': drill,
      'Drill_NPTH.drl': drillNpth,
      'PickAndPlace.csv': pnp,
      'Bill_of_Materials.csv': bom,
      'BOM_JLCPCB.csv': jlcBom,
      'README_MANUFACTURING.txt': readme,
      // KiCad standard naming aliases
      'F_Cu.GTL': topCu,
      'B_Cu.GBL': botCu,
      'F_Mask.GTS': topMask,
      'B_Mask.GBS': botMask,
      'F_Paste.GTP': topPaste,
      'B_Paste.GBP': botPaste,
      'F_SilkS.GTO': topSilk,
      'B_SilkS.GBO': botSilk,
      'Edge_Cuts.GKO': edgeCuts,
      'Drill.DRL': drill,
    };
  }

  /**
   * Helper to download single file directly
   */
  public static downloadFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Builds the pure binary Blob of the JLCPCB/PCBWay compliant Gerber ZIP archive
   */
  public static buildGerberZipBlob(
    pcb: PcbLayout,
    components: CircuitComponent[],
    projectTitle: string = 'EI_House_PCB'
  ): Blob {
    const bundle = this.generateManufacturingBundle(pcb, components);
    const zip = new ZipBuilder();

    // Add production files
    zip.addFile('F_Cu.GTL', bundle['F_Cu.GTL']);
    zip.addFile('B_Cu.GBL', bundle['B_Cu.GBL']);
    zip.addFile('F_Mask.GTS', bundle['F_Mask.GTS']);
    zip.addFile('B_Mask.GBS', bundle['B_Mask.GBS']);
    zip.addFile('F_SilkS.GTO', bundle['F_SilkS.GTO']);
    zip.addFile('B_SilkS.GBO', bundle['B_SilkS.GBO']);
    zip.addFile('F_Paste.GTP', bundle['F_Paste.GTP']);
    zip.addFile('B_Paste.GBP', bundle['B_Paste.GBP']);
    zip.addFile('Edge_Cuts.GKO', bundle['Edge_Cuts.GKO']);
    zip.addFile('Drill.DRL', bundle['Drill.DRL']); // PTH ONLY - 0 duplicate drill hits

    // Add NPTH drill file if mounting holes exist
    if (pcb.mountingHoles && pcb.mountingHoles.length > 0) {
      zip.addFile('Drill_NPTH.DRL', bundle['Drill_NPTH.drl']);
    }

    zip.addFile('PickAndPlace.csv', bundle['PickAndPlace.csv']);
    zip.addFile('Bill_of_Materials.csv', bundle['Bill_of_Materials.csv']);
    zip.addFile('BOM_JLCPCB.csv', bundle['BOM_JLCPCB.csv']);
    zip.addFile('README_MANUFACTURING.txt', this.generateReadme(pcb, projectTitle));

    return zip.generateBlob();
  }

  /**
   * Exports full Gerber & Drill bundle as standard .ZIP archive and triggers download
   */
  public static exportGerberZip(
    pcb: PcbLayout,
    components: CircuitComponent[],
    projectTitle: string = 'EI_House_PCB'
  ): void {
    const blob = this.buildGerberZipBlob(pcb, components, projectTitle);
    const cleanTitle = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_Gerbers.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }
}
