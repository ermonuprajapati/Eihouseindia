/**
 * Industrial RS-274X Gerber & Excellon NC Drill Exporter
 * Generates full manufacturing package for JLCPCB, PCBWay, and standard fab houses.
 */

import { PcbLayout, CircuitComponent } from '../types';
import { DrillExporter } from './drill-export';
import { ZipBuilder } from './zip-builder';

export class GerberExporter {
  /**
   * Generates Top Copper (.gtl / F_Cu.GTL)
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
   * Generates Bottom Copper (.gbl / B_Cu.GBL)
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
   * Generates Top Solder Mask (.gts / F_Mask.GTS)
   */
  public static exportTopSolderMask(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Soldermask,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD12C,2.000000*%\n`;
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
   * Generates Bottom Solder Mask (.gbs / B_Mask.GBS)
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
   * Generates Top Silkscreen (.gto / F_SilkS.GTO)
   */
  public static exportTopSilkscreen(pcb: PcbLayout): string {
    let out = `%TF.FileFunction,Legend,Top*%\n`;
    out += `%FSLAX35Y35*%\n%MOMM*%\n%LPD*%\n`;
    out += `%ADD13C,0.150000*%\n`;
    out += `G04 Layer: Top Silkscreen (F.SilkS)*\n`;
    out += `D13*\n`;

    if (pcb.components) {
      pcb.components.forEach((comp) => {
        const cx = Math.round(comp.x * 100000);
        const cy = Math.round(comp.y * 100000);
        const hw = Math.round(5 * 100000);
        const hh = Math.round(4 * 100000);

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
   * Generates Bottom Silkscreen (.gbo / B_SilkS.GBO)
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
    out += `X${w}Y0D01*\n`;
    out += `X${w}Y${h}D01*\n`;
    out += `X0Y${h}D01*\n`;
    out += `X0Y0D01*\n`;
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
   * Generates 2D Print / Blueprint Vector SVG
   */
  public static exportBlueprintSvg(pcb: PcbLayout): string {
    const w = pcb.widthMm;
    const h = pcb.heightMm;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n`;
    svg += `  <rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="#042F2E" stroke="#0D9488" stroke-width="0.5"/>\n`;

    // Bottom copper tracks
    svg += `  <g id="Bottom_Copper" stroke="#3B82F6" stroke-linecap="round" stroke-linejoin="round">\n`;
    pcb.tracks
      .filter((t) => t.layer === 'bottom_copper')
      .forEach((t) => {
        svg += `    <line x1="${t.from.x}" y1="${t.from.y}" x2="${t.to.x}" y2="${t.to.y}" stroke-width="${t.widthMm}"/>\n`;
      });
    svg += `  </g>\n`;

    // Top copper tracks
    svg += `  <g id="Top_Copper" stroke="#EF4444" stroke-linecap="round" stroke-linejoin="round">\n`;
    pcb.tracks
      .filter((t) => t.layer === 'top_copper')
      .forEach((t) => {
        svg += `    <line x1="${t.from.x}" y1="${t.from.y}" x2="${t.to.x}" y2="${t.to.y}" stroke-width="${t.widthMm}"/>\n`;
      });
    svg += `  </g>\n`;

    // Pads
    svg += `  <g id="Pads" fill="#F59E0B" stroke="#D97706" stroke-width="0.1">\n`;
    pcb.pads.forEach((p) => {
      const r = p.diameterMm / 2;
      if (p.shape === 'rect') {
        svg += `    <rect x="${p.x - r}" y="${p.y - r}" width="${p.diameterMm}" height="${p.diameterMm}"/>\n`;
      } else {
        svg += `    <circle cx="${p.x}" cy="${p.y}" r="${r}"/>\n`;
      }
    });
    svg += `  </g>\n`;

    // Drill holes
    svg += `  <g id="Drill_Holes" fill="#020617">\n`;
    pcb.pads.forEach((p) => {
      svg += `    <circle cx="${p.x}" cy="${p.y}" r="${p.holeMm / 2}"/>\n`;
    });
    svg += `  </g>\n`;

    // Silkscreen
    svg += `  <g id="Silkscreen" stroke="#FFFFFF" fill="none" stroke-width="0.15">\n`;
    if (pcb.components) {
      pcb.components.forEach((c) => {
        svg += `    <rect x="${c.x - 5}" y="${c.y - 4}" width="10" height="8" rx="0.5"/>\n`;
        svg += `    <text x="${c.x - 4.5}" y="${c.y - 4.5}" font-family="monospace" font-size="1.2" fill="#FFFFFF" stroke="none">${c.designator} ${c.value || ''}</text>\n`;
      });
    }
    svg += `  </g>\n`;

    svg += `</svg>\n`;
    return svg;
  }

  /**
   * Export all manufacturing files as key-value text record
   */
  public static generateManufacturingBundle(pcb: PcbLayout, components: CircuitComponent[]): Record<string, string> {
    const topCu = this.exportTopCopper(pcb);
    const botCu = this.exportBottomCopper(pcb);
    const topMask = this.exportTopSolderMask(pcb);
    const botMask = this.exportBottomSolderMask(pcb);
    const topSilk = this.exportTopSilkscreen(pcb);
    const botSilk = this.exportBottomSilkscreen(pcb);
    const edgeCuts = this.exportEdgeCuts(pcb);
    const drill = this.exportExcellonDrill(pcb);
    const pnp = this.exportPickAndPlaceCsv(pcb);
    const bom = this.exportBomCsv(components);

    return {
      'Top_Copper.gtl': topCu,
      'Bottom_Copper.gbl': botCu,
      'Top_SolderMask.gts': topMask,
      'Bottom_SolderMask.gbs': botMask,
      'Top_Silkscreen.gto': topSilk,
      'Bottom_Silkscreen.gbo': botSilk,
      'Board_Outline.gko': edgeCuts,
      'Drill_Plated.drl': drill,
      'PickAndPlace.csv': pnp,
      'Bill_of_Materials.csv': bom,
      // KiCad standard naming aliases
      'F_Cu.GTL': topCu,
      'B_Cu.GBL': botCu,
      'F_Mask.GTS': topMask,
      'B_Mask.GBS': botMask,
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
    URL.revokeObjectURL(url);
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

    // Add production files
    zip.addFile('F_Cu.GTL', bundle['F_Cu.GTL']);
    zip.addFile('B_Cu.GBL', bundle['B_Cu.GBL']);
    zip.addFile('F_Mask.GTS', bundle['F_Mask.GTS']);
    zip.addFile('B_Mask.GBS', bundle['B_Mask.GBS']);
    zip.addFile('F_SilkS.GTO', bundle['F_SilkS.GTO']);
    zip.addFile('B_SilkS.GBO', bundle['B_SilkS.GBO']);
    zip.addFile('Edge_Cuts.GKO', bundle['Edge_Cuts.GKO']);
    zip.addFile('Drill.DRL', bundle['Drill.DRL']);
    zip.addFile('PickAndPlace.csv', bundle['PickAndPlace.csv']);
    zip.addFile('Bill_of_Materials.csv', bundle['Bill_of_Materials.csv']);

    const cleanTitle = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    zip.download(`${cleanTitle}_Gerbers.zip`);
  }
}
