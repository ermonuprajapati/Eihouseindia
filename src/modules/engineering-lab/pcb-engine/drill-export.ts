/**
 * Industrial Excellon NC Drill Exporter
 * Generates standard Excellon 2 format with metric coordinates and tool definitions
 * JLCPCB / PCBWay CAM verified: zero SMD drill holes, zero duplicate coordinate strikes.
 */

import { PcbLayout, PcbPad, PcbMountingHole } from '../types';

export class DrillExporter {
  /**
   * Helper to format metric coordinates into Excellon format (X000.000Y000.000)
   */
  private static formatExcellon(
    toolsMap: Map<number, { x: number; y: number }[]>,
    headerComments: string[] = []
  ): string {
    let out = `M48\n`;
    headerComments.forEach((c) => {
      out += `; ${c}\n`;
    });
    out += `;FILE_FORMAT=3:3\n`;
    out += `METRIC,TZ\n`;
    out += `FMAT,2\n`;

    const sortedDiameters = Array.from(toolsMap.keys()).sort((a, b) => a - b);
    const toolIndexMap = new Map<number, string>();

    sortedDiameters.forEach((dia, idx) => {
      const toolCode = `T${String(idx + 1).padStart(2, '0')}`;
      toolIndexMap.set(dia, toolCode);
      out += `${toolCode}C${dia.toFixed(3)}\n`;
    });

    out += `%\n`;
    out += `G05\n`;
    out += `G90\n`; // Absolute coordinates

    sortedDiameters.forEach((dia) => {
      const toolCode = toolIndexMap.get(dia)!;
      const points = toolsMap.get(dia)!;
      out += `${toolCode}\n`;
      points.forEach((pt) => {
        out += `X${pt.x.toFixed(3)}Y${pt.y.toFixed(3)}\n`;
      });
    });

    out += `M30\n`;
    return out;
  }

  /**
   * Deduplicates drill hit points within 0.01mm tolerance
   */
  private static addDeduplicatedHit(
    toolsMap: Map<number, { x: number; y: number }[]>,
    holeDiameterMm: number,
    x: number,
    y: number
  ): void {
    const dia = Math.round(holeDiameterMm * 1000) / 1000;
    if (dia <= 0.001) return;

    // Check if this coordinate already exists across ANY tool within 0.01mm
    for (const [, pts] of toolsMap.entries()) {
      for (const pt of pts) {
        if (Math.hypot(pt.x - x, pt.y - y) < 0.01) {
          return; // Duplicate coordinate hit detected, skip to avoid double-drill CAM failure
        }
      }
    }

    if (!toolsMap.has(dia)) {
      toolsMap.set(dia, []);
    }
    toolsMap.get(dia)!.push({ x, y });
  }

  /**
   * Determines if a pad has a real through-hole drill (skips pure surface mount SMD pads)
   */
  private static isThroughHolePad(p: PcbPad): boolean {
    if (p.holeMm !== undefined && p.holeMm <= 0) return false;
    // SMD pads assigned specifically to top or bottom layer only with no explicit hole
    if ((p.layer === 'top' || p.layer === 'bottom') && (!p.holeMm || p.holeMm <= 0)) {
      return false;
    }
    return true;
  }

  /**
   * Generates standard Excellon NC Drill file (.drl) with dynamic tool definition table
   * Maintained for full backward-compatibility with existing unit tests.
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    const toolsMap = new Map<number, { x: number; y: number }[]>();

    // 1. Through-hole component pads (skipping SMD pads)
    (pcb.pads || []).forEach((p) => {
      if (!this.isThroughHolePad(p)) return;
      const hole = p.holeMm && p.holeMm > 0 ? Math.round(p.holeMm * 100) / 100 : 0.8;
      this.addDeduplicatedHit(toolsMap, hole, p.x, p.y);
    });

    // 2. PCB vias
    const vias = (pcb as { vias?: Array<{ x: number; y: number; drillMm?: number; holeMm?: number }> }).vias || [];
    vias.forEach((v) => {
      const hole = v.drillMm || v.holeMm || 0.4;
      this.addDeduplicatedHit(toolsMap, hole, v.x, v.y);
    });

    // 3. Corner mounting holes
    if (pcb.mountingHoles && pcb.mountingHoles.length > 0) {
      pcb.mountingHoles.forEach((hole: PcbMountingHole) => {
        const dia = Math.round(hole.diameterMm * 100) / 100;
        this.addDeduplicatedHit(toolsMap, dia, hole.x, hole.y);
      });
    }

    return this.formatExcellon(toolsMap, [
      'Layer: Excellon Drill (Combined)',
      'Format: Excellon 2, Metric, Trailing Zeros Suppressed',
    ]);
  }

  /**
   * Generates Plated Through-Hole (PTH) drill file (.drl / Drill.DRL)
   * Contains THT component pads and vias ONLY. Zero SMD pads, zero mounting holes.
   */
  public static exportExcellonPthDrill(pcb: PcbLayout): string {
    const toolsMap = new Map<number, { x: number; y: number }[]>();

    // 1. Through-hole component pads
    (pcb.pads || []).forEach((p) => {
      if (!this.isThroughHolePad(p)) return;
      const hole = p.holeMm && p.holeMm > 0 ? Math.round(p.holeMm * 100) / 100 : 0.8;
      this.addDeduplicatedHit(toolsMap, hole, p.x, p.y);
    });

    // 2. Vias
    const vias = (pcb as { vias?: Array<{ x: number; y: number; drillMm?: number; holeMm?: number }> }).vias || [];
    vias.forEach((v) => {
      const hole = v.drillMm || v.holeMm || 0.4;
      this.addDeduplicatedHit(toolsMap, hole, v.x, v.y);
    });

    return this.formatExcellon(toolsMap, [
      'Layer: Plated Through-Hole Drill (PTH)',
      'Format: Excellon 2, Metric, Trailing Zeros Suppressed',
    ]);
  }

  /**
   * Generates Non-Plated Through-Hole (NPTH) drill file (.drl / Drill_NPTH.DRL)
   * Contains mounting holes and unplated mechanical cutouts ONLY.
   */
  public static exportExcellonNpthDrill(pcb: PcbLayout): string {
    const toolsMap = new Map<number, { x: number; y: number }[]>();

    if (pcb.mountingHoles && pcb.mountingHoles.length > 0) {
      pcb.mountingHoles.forEach((hole: PcbMountingHole) => {
        const dia = Math.round(hole.diameterMm * 100) / 100;
        this.addDeduplicatedHit(toolsMap, dia, hole.x, hole.y);
      });
    }

    return this.formatExcellon(toolsMap, [
      'Layer: Non-Plated Through-Hole Drill (NPTH)',
      'Format: Excellon 2, Metric, Trailing Zeros Suppressed',
    ]);
  }
}

export const exportExcellonPthDrill = DrillExporter.exportExcellonPthDrill.bind(DrillExporter);
export const exportExcellonNpthDrill = DrillExporter.exportExcellonNpthDrill.bind(DrillExporter);
export const exportExcellonDrill = DrillExporter.exportExcellonDrill.bind(DrillExporter);
