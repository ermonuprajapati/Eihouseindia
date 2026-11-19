/**
 * Industrial RS-274X Gerber & Excellon NC Drill Exporter
 * Generates full manufacturing package for JLCPCB, PCBWay, and standard fab houses.
 */

import { PcbLayout, CircuitComponent } from '../types';
import { DrillExporter } from './drill-export';
import { ZipBuilder } from './zip-builder';

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
   * Generates Top Silkscreen (.gto) with designator and outline vectors
   */
  public static exportTopSilkscreen(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Legend,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD13C,0.150000*%\n`; // 0.15mm silkscreen stroke
    out += `G04 Layer: Top Silkscreen (F.SilkS)*\n`;
    out += `D13*\n`;

    if (pcb.components) {
      pcb.components.forEach((comp) => {
        const cx = Math.round(comp.x * 100000);
        const cy = Math.round(comp.y * 100000);
        const hw = Math.round(5 * 100000);
        const hh = Math.round(4 * 100000);

        // Component boundary box
        out += `X${cx - hw}Y${cy - hh}D02*\n`;
        out += `X${cx + hw}Y${cy - hh}D01*\n`;
        out += `X${cx + hw}Y${cy + hh}D01*\n`;
        out += `X${cx - hw}Y${cy + hh}D01*\n`;
        out += `X${cx - hw}Y${cy - hh}D01*\n`;
      });
    }

    out += `M02*\n`;
    return out;
  }

  /**
   * Generates Bottom Silkscreen (.gbo)
   */
  public static exportBottomSilkscreen(_pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Legend,Bot*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD13C,0.150000*%\n`;
    out += `G04 Layer: Bottom Silkscreen (B.SilkS)*\n`;
    out += `D13*\n`;
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
    return DrillExporter.exportExcellonDrill(pcb);
  }

  /**
   * Generates Pick and Place Centroid CSV file (SMT Assembly)
   */
  public static exportPickAndPlaceCsv(pcb: PcbLayout): string {
    let csv = `Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n`;
    if (pcb.components) {
      pcb.components.forEach((c) => {
        const des = c.designator || c.label;
        const val = c.value || '-';
        const pkg = c.footprint || c.type;
        const rot = c.rotation || 0;
        csv += `"${des}","${val}","${pkg}",${c.x.toFixed(3)},${c.y.toFixed(3)},${rot},"Top"\n`;
      });
    }
    return csv;
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
      'Top_Silkscreen.gto': this.exportTopSilkscreen(pcb),
      'Bottom_Silkscreen.gbo': this.exportBottomSilkscreen(pcb),
      'Board_Outline.gko': this.exportEdgeCuts(pcb),
      'Drill_Plated.drl': this.exportExcellonDrill(pcb),
      'PickAndPlace.csv': this.exportPickAndPlaceCsv(pcb),
      'Bill_of_Materials.csv': this.exportBomCsv(components),
    };
  }

  /**
   * Exports full Gerber & Drill bundle as standard .ZIP archive and triggers download
   */
  public static exportGerberZip(
    pcb: PcbLayout,
    components: CircuitComponent[],
    projectTitle: string = 'EI_House_PCB'
  ): void {
    const bundle = this.generateManufacturingBundle(pcb, components);
    const zip = new ZipBuilder();
    for (const [filename, content] of Object.entries(bundle)) {
      zip.addFile(filename, content);
    }
    const cleanTitle = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    zip.download(`${cleanTitle}_Gerbers.zip`);
  }
}
