/**
 * Industrial RS-274X Gerber & Excellon NC Drill Exporter
 */

import { PcbLayout, CircuitComponent } from '../types';

export class GerberExporter {
  /**
   * Generates Top Copper (.gtl)
   */
  public static exportTopCopper(pcb: PcbLayout): string {
    let out = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,2.0*%\n`;
    out += `%TF.FileFunction,Copper,L1,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD10C,0.250000*%\n`; // 0.25mm standard track aperture
    out += `%ADD11C,1.800000*%\n`; // 1.8mm pad aperture
    out += `G04 Layer: Top Copper (F.Cu)*\n`;
    out += `D10*\n`;

    pcb.tracks
      .filter((t) => t.layer === 'top_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        out += `X${x1}Y${y1}D02*\n`;
        out += `X${x2}Y${y2}D01*\n`;
      });

    out += `D11*\n`;
    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'top')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        out += `X${px}Y${py}D03*\n`;
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Copper (.gbl)
   */
  public static exportBottomCopper(pcb: PcbLayout): string {
    let out = `%TF.GenerationSoftware,EI-House-Universal-Engineering-Lab,2.0*%\n`;
    out += `%TF.FileFunction,Copper,L2,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD10C,0.250000*%\n`;
    out += `%ADD11C,1.800000*%\n`;
    out += `G04 Layer: Bottom Copper (B.Cu)*\n`;
    out += `D10*\n`;

    pcb.tracks
      .filter((t) => t.layer === 'bottom_copper')
      .forEach((t) => {
        const x1 = Math.round(t.from.x * 100000);
        const y1 = Math.round(t.from.y * 100000);
        const x2 = Math.round(t.to.x * 100000);
        const y2 = Math.round(t.to.y * 100000);
        out += `X${x1}Y${y1}D02*\n`;
        out += `X${x2}Y${y2}D01*\n`;
      });

    out += `D11*\n`;
    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'bottom')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        out += `X${px}Y${py}D03*\n`;
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Top Solder Mask (.gts) with standard 0.1mm clearance expansion
   */
  public static exportTopSolderMask(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Soldermask,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD12C,2.000000*%\n`; // 2.0mm aperture (1.8mm pad + 0.1mm expansion on each side)
    out += `G04 Layer: Top Solder Mask (F.Mask)*\n`;
    out += `D12*\n`;

    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'top')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        out += `X${px}Y${py}D03*\n`;
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Solder Mask (.gbs)
   */
  public static exportBottomSolderMask(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Soldermask,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD12C,2.000000*%\n`;
    out += `G04 Layer: Bottom Solder Mask (B.Mask)*\n`;
    out += `D12*\n`;

    pcb.pads
      .filter((p) => p.layer === 'all' || p.layer === 'bottom')
      .forEach((p) => {
        const px = Math.round(p.x * 100000);
        const py = Math.round(p.y * 100000);
        out += `X${px}Y${py}D03*\n`;
      });

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Board Outline Edge.Cuts (.gko)
   */
  public static exportEdgeCuts(pcb: PcbLayout): string {
    const w = Math.round(pcb.widthMm * 100000);
    const h = Math.round(pcb.heightMm * 100000);

    let out = `%TF.FileFunction,Profile,NP*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD10C,0.150000*%\n`; // 0.15mm line width for board contour
    out += `G04 Layer: Edge.Cuts (Board Outline)*\n`;
    out += `D10*\n`;
    out += `X0Y0D02*\n`;
    out += `X${w}Y0D01*\n`;
    out += `X${w}Y${h}D01*\n`;
    out += `X0Y${h}D01*\n`;
    out += `X0Y0D01*\n`;
    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Excellon NC Drill file (.drl)
   */
  public static exportExcellonDrill(pcb: PcbLayout): string {
    let drill = `M48\nMETRIC,TZ\nFMAT,2\nT01C0.900\n%\nG05\nG90\nT01\n`;

    pcb.pads.forEach((p) => {
      drill += `X${p.x.toFixed(3)}Y${p.y.toFixed(3)}\n`;
    });

    drill += `M30\n`;
    return drill;
  }

  /**
   * Generates Bill of Materials (BOM) in CSV format
   */
  public static exportBomCsv(components: CircuitComponent[]): string {
    let csv = `Item,Designator,Quantity,Component Type,Value,Footprint,Manufacturer Part No\n`;

    const map = new Map<string, { type: string; value: string; footprint: string; des: string[]; mpn: string }>();

    components.forEach((c) => {
      const key = `${c.type}__${c.value}__${c.footprint}`;
      const d = c.designator || c.label;
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
      csv += `${itemIdx++},"${item.des.join(', ')}",${item.des.length},"${item.type}","${item.value}","${item.footprint}","${item.mpn}"\n`;
    });

    return csv;
  }

  /**
   * Export all manufacturing files as key-value text record
   */
  public static generateManufacturingBundle(pcb: PcbLayout, components: CircuitComponent[]): Record<string, string> {
    return {
      'Top_Copper.gtl': this.exportTopCopper(pcb),
      'Bottom_Copper.gbl': this.exportBottomCopper(pcb),
      'Top_SolderMask.gts': this.exportTopSolderMask(pcb),
      'Bottom_SolderMask.gbs': this.exportBottomSolderMask(pcb),
      'Board_Outline.gko': this.exportEdgeCuts(pcb),
      'Drill_Plated.drl': this.exportExcellonDrill(pcb),
      'Bill_of_Materials.csv': this.exportBomCsv(components),
    };
  }
}
