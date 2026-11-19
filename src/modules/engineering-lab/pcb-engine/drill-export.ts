/**
 * Industrial Excellon NC Drill Exporter
 * Generates standard Excellon 2 format with metric coordinates and tool definitions
 */

import { PcbLayout } from '../types';

export class DrillExporter {
  /**
   * Generates standard Excellon NC Drill file (.drl) with dynamic tool definition table
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    // Group hole coordinates by hole diameter
    const toolsMap = new Map<number, { x: number; y: number }[]>();

    // 1. Through-hole component pads and vias
    pcb.pads.forEach((p) => {
      const hole = p.holeMm && p.holeMm > 0 ? Math.round(p.holeMm * 100) / 100 : 0.8;
      if (!toolsMap.has(hole)) {
        toolsMap.set(hole, []);
      }
      toolsMap.get(hole)!.push({ x: p.x, y: p.y });
    });

    // 2. Corner mounting holes
    if (pcb.mountingHoles && pcb.mountingHoles.length > 0) {
      pcb.mountingHoles.forEach((hole) => {
        const dia = Math.round(hole.diameterMm * 100) / 100;
        if (!toolsMap.has(dia)) {
          toolsMap.set(dia, []);
        }
        toolsMap.get(dia)!.push({ x: hole.x, y: hole.y });
      });
    }

    let out = `M48\n`;
    out += `; Layer: Excellon Plated Through-Hole Drill\n`;
    out += `; Format: Excellon 2, Metric, Trailing Zeros Suppressed\n`;
    out += `METRIC,TZ\n`;
    out += `FMAT,2\n`;

    // Tool header definitions: T01C0.800, T02C1.000, etc.
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

    // Drill coordinate blocks
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
}
