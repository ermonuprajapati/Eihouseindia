/**
 * Universal Export Engine & Context-Aware Dispatcher
 * Unifies exports across Schematic, Schematic Editor, 3D Studio, PCB 2D, and PCB 3D.
 * Guarantees zero side-effects, in-memory PCB resolution, and crisp vector/raster outputs.
 */

import { EngineeringProject, PcbLayout, WorkspaceMode } from '../types';
import { GerberExporter } from '../pcb-engine/gerber-exporter';
import { PcbGenerator, isVirtualSchematicSymbol } from '../pcb-engine/pcb-generator';
import { buildStandaloneSchematicSvg, cloneAndSanitizeLiveSvg } from './schematic-svg-builder';
import {
  exportSvgStringAsSvg,
  exportSvgStringAsPng,
  exportSvgStringAsJpg,
  exportSvgStringAsPdf,
  exportCanvasAsPng,
  exportCanvasAsJpg,
  exportCanvasAsPdf,
  resolveLiveCanvasElement,
  triggerDownloadBlob,
} from './raster-export';
import { toast } from 'sonner';

export type UniversalExportFormat =
  | 'gerber-zip'
  | 'gerber'
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'svg'
  | 'bom'
  | 'cpl'
  | 'eihouse'
  | 'json'
  | 'netlist'
  | 'netlist-json'
  | 'firmware'
  | 'cpp';

export interface ExportExecutionContext {
  project: EngineeringProject;
  activeMode: WorkspaceMode | 'schematic_editor' | string;
  schematicEditorSvgEl?: SVGSVGElement | null;
  pcb2dCanvasEl?: HTMLCanvasElement | null;
  virtual3dCanvasEl?: HTMLCanvasElement | null;
  pcb3dCanvasEl?: HTMLCanvasElement | null;
  onSaveProjectLocally?: () => void;
  onTriggerImport?: () => void;
}

/**
 * Helper to check if a color value is a valid solid color string (not transparent, none, or SVG url pattern)
 */
export function isSolidColor(val: string | null | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'none' || lower === 'transparent' || lower === 'rgba(0, 0, 0, 0)') return false;
  if (lower.startsWith('url(')) return false;
  return true;
}

/**
 * Detects the background color of a live SVG element (e.g. from Schematic Editor)
 * Priority order:
 * 1. Explicit background marker: rect[data-bg="true"] -> return fill if isSolidColor
 * 2. Explicit sheet theme class on svgEl.getAttribute('class')
 * 3. Computed CSS background on svgEl
 * 4. Direct-child full-size rect ONLY (width="100%", isSolidColor)
 * 5. Fallback '#09101E'
 */
export function detectLiveSvgBgColor(svgEl: SVGSVGElement | null): string {
  if (!svgEl) return '#09101E';
  try {
    // 1. Explicit background marker: rect[data-bg="true"]
    const bgMarker = svgEl.querySelector('rect[data-bg="true"]');
    if (bgMarker) {
      const fill = bgMarker.getAttribute('fill');
      if (isSolidColor(fill)) return fill;
    }

    // 2. Explicit sheet theme class on svgEl
    const cls = svgEl.getAttribute('class') || '';
    if (/bg-\[#ece8dc\]/i.test(cls)) return '#ECE8DC';
    if (/bg-\[#09101e\]/i.test(cls)) return '#09101E';

    // 3. Computed CSS background on svgEl
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const computed = window.getComputedStyle(svgEl).backgroundColor;
      if (isSolidColor(computed)) return computed;
    }

    // 4. Direct-child full-size rect ONLY (never nested symbol rects, never url(...))
    const directFullRects = Array.from(svgEl.children).filter(
      (el) => el.tagName.toLowerCase() === 'rect' && el.getAttribute('width') === '100%'
    );
    for (const rect of directFullRects) {
      const fill = rect.getAttribute('fill');
      if (isSolidColor(fill)) return fill;
    }
  } catch {}

  // 5. Fallback
  return '#09101E';
}

/**
 * Versioned EI House Project Schema payload generator
 */
export function createEihouseProjectPayload(project: EngineeringProject) {
  return {
    schemaVersion: '1.0.0',
    generator: 'EI House India Universal Virtual Lab',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      components: project.components,
      wires: project.wires,
      pcb: project.pcb,
      firmware: project.firmware,
      instruments: project.instruments,
    },
  };
}

/**
 * Robust JSON parser and schema validator for .eihouse.json and legacy project files
 */
export function parseEihouseProject(jsonText: string): EngineeringProject | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && parsed.project && Array.isArray(parsed.project.components) && Array.isArray(parsed.project.wires)) {
      return parsed.project as EngineeringProject;
    }
    if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
      return parsed as EngineeringProject;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves a production-ready PCB layout for export.
 * If project.pcb exists with all physical component pads -> returns existing PCB (preserving custom edits!).
 * Otherwise -> generates complete routed PCB in-memory without mutating React state.
 */
export function resolveProductionPcbForExport(project: EngineeringProject): PcbLayout {
  const physicalComps = (project.components || []).filter((c) => !isVirtualSchematicSymbol(c.type));
  const existingPcb = project.pcb;

  if (existingPcb && existingPcb.pads && existingPcb.pads.length > 0) {
    // Check if existing PCB covers all physical components
    const pcbCompIds = new Set((existingPcb.components || []).map((c) => c.componentId));
    const allPhysicalPresent = physicalComps.every((c) => pcbCompIds.has(c.id));
    if (allPhysicalPresent) {
      return existingPcb;
    }
  }

  // Generate in-memory fallback without mutating project state
  return PcbGenerator.generatePcbFromSchematic(
    project.components || [],
    project.wires || [],
    existingPcb?.widthMm || 80,
    existingPcb?.heightMm || 60,
    existingPcb
  );
}

/**
 * Universal Export Controller: handles export routing across all formats and modes cleanly.
 */
export async function runUniversalExport(
  format: UniversalExportFormat,
  context: ExportExecutionContext
): Promise<void> {
  try {
    const { project, activeMode } = context;
    const slug = (project.title || 'circuit').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'circuit';
    const cleanTitle = project.title || 'EI House Engineering Circuit';

    // 1. Full Project File Backups
    if (format === 'eihouse') {
      const payload = createEihouseProjectPayload(project);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      triggerDownloadBlob(blob, `${slug}.eihouse.json`);
      toast.success('Exported EI House project file (.eihouse.json)');
      return;
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      triggerDownloadBlob(blob, `${slug}.json`);
      toast.success('Exported standard project JSON');
      return;
    }

    // 2. Manufacturing Files (JLCPCB / PCBWay Gerber ZIP, BOM, CPL)
    if (format === 'gerber-zip' || format === 'gerber') {
      const pcb = resolveProductionPcbForExport(project);
      GerberExporter.exportGerberZip(pcb, project.components || [], project.title);
      toast.success('Downloaded Production Gerber ZIP package (JLCPCB & PCBWay compliant)');
      return;
    }

    if (format === 'bom') {
      const bomCsv = GerberExporter.exportBomCsv(project.components || []);
      const blob = new Blob([bomCsv], { type: 'text/csv;charset=utf-8' });
      triggerDownloadBlob(blob, `${slug}_BOM.csv`);
      toast.success('Downloaded Bill of Materials (BOM.csv)');
      return;
    }

    if (format === 'cpl') {
      const pcb = resolveProductionPcbForExport(project);
      const cplCsv = GerberExporter.exportPickAndPlaceCsv(pcb);
      const blob = new Blob([cplCsv], { type: 'text/csv;charset=utf-8' });
      triggerDownloadBlob(blob, `${slug}_CPL.csv`);
      toast.success('Downloaded Pick and Place Centroids (CPL.csv)');
      return;
    }

    // 3. Firmware Source Files
    if (format === 'firmware') {
      const code = project.firmware?.code || '// EI House Firmware Sketch\nvoid setup() {}\nvoid loop() {}\n';
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      triggerDownloadBlob(blob, `${slug}.ino`);
      toast.success('Arduino firmware exported (.ino)');
      return;
    }

    if (format === 'cpp') {
      const code = project.firmware?.code || '// EI House C++ Source File\n#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}\n';
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      triggerDownloadBlob(blob, `${slug}.cpp`);
      toast.success('C++ source file exported (.cpp)');
      return;
    }

    // 4. Netlist Exports
    if (format === 'netlist') {
      const { generateSpiceNetlist, downloadSpiceNetlist } = await import(
        '@/modules/engineering-lab/circuit-engine/spice-netlist-generator'
      );
      const netlist = generateSpiceNetlist(project.title, project.components || [], project.wires || []);
      downloadSpiceNetlist(project.title, netlist);
      toast.success('SPICE Netlist exported (.cir)');
      return;
    }

    if (format === 'netlist-json') {
      const jsonNetlist = {
        title: project.title,
        exportedAt: new Date().toISOString(),
        components: (project.components || []).map((c) => ({
          id: c.id,
          label: c.label,
          designator: c.designator,
          type: c.type,
          value: c.value,
          pins: c.pins.map((p) => p.id),
        })),
        wires: (project.wires || []).map((w) => ({
          id: w.id,
          from: `${w.fromCompId}:${w.fromPinId}`,
          to: `${w.toCompId}:${w.toPinId}`,
          net: w.netName || 'NET',
        })),
      };
      const blob = new Blob([JSON.stringify(jsonNetlist, null, 2)], { type: 'application/json' });
      triggerDownloadBlob(blob, `${slug}_netlist.json`);
      toast.success('JSON Netlist exported');
      return;
    }

    // 5. Visual Rendering Exports (SVG, PNG, JPG, PDF) — Context-Aware Per Mode
    const isSchematicMode =
      activeMode === 'schematic' ||
      activeMode === 'schematicEditor' ||
      activeMode === 'schematic_editor' ||
      activeMode === 'schematic-editor';
    const isPcb2dMode = activeMode === 'pcb2d' || activeMode === 'pcb-2d';
    const isPcb3dMode = activeMode === 'pcb3d' || activeMode === 'pcb-3d';
    const isVirtual3dMode = activeMode === 'virtual3d' || activeMode === 'studio3d';

    // Mode A: PCB 2D Layout View
    if (isPcb2dMode) {
      const pcb = resolveProductionPcbForExport(project);
      const pcbSvg = GerberExporter.exportBlueprintSvg(pcb);

      if (format === 'svg') {
        exportSvgStringAsSvg(pcbSvg, `${slug}_pcb_blueprint.svg`);
        toast.success('PCB 2D vector blueprint exported (.svg)');
        return;
      }

      const liveCanvas = context.pcb2dCanvasEl || resolveLiveCanvasElement('pcb-2d-canvas') || resolveLiveCanvasElement('canvas');
      if (liveCanvas && liveCanvas.width > 0) {
        if (format === 'png') {
          await exportCanvasAsPng(liveCanvas, `${slug}_pcb2d.png`);
          toast.success('PCB 2D layout exported (.png)');
        } else if (format === 'jpg' || format === 'jpeg') {
          await exportCanvasAsJpg(liveCanvas, `${slug}_pcb2d.jpg`, '#042F2E');
          toast.success('PCB 2D layout exported (.jpg)');
        } else if (format === 'pdf') {
          exportCanvasAsPdf(liveCanvas, `${slug}_pcb2d.pdf`, {
            title: cleanTitle,
            viewLabel: 'PCB 2D Layout & Fabrication Blueprint',
            subtitle: `Size: ${pcb.widthMm} x ${pcb.heightMm} mm · 2-Layer FR-4`,
          }, '#042F2E');
          toast.success('PCB 2D PDF document exported (.pdf)');
        }
        return;
      }

      // Fallback via vector SVG rasterization
      if (format === 'png') {
        await exportSvgStringAsPng(pcbSvg, `${slug}_pcb2d.png`, 3, '#042F2E');
        toast.success('PCB 2D blueprint exported (.png)');
      } else if (format === 'jpg' || format === 'jpeg') {
        await exportSvgStringAsJpg(pcbSvg, `${slug}_pcb2d.jpg`, 3, '#042F2E');
        toast.success('PCB 2D blueprint exported (.jpg)');
      } else if (format === 'pdf') {
        await exportSvgStringAsPdf(pcbSvg, `${slug}_pcb2d.pdf`, {
          title: cleanTitle,
          viewLabel: 'PCB 2D Layout Blueprint',
          subtitle: `Size: ${pcb.widthMm} x ${pcb.heightMm} mm · 2-Layer FR-4`,
        }, 3, '#042F2E');
        toast.success('PCB 2D PDF document exported (.pdf)');
      }
      return;
    }

    // Mode B: PCB 3D Photorealistic WebGL View
    if (isPcb3dMode) {
      if (format === 'svg') {
        const pcb = resolveProductionPcbForExport(project);
        const pcbSvg = GerberExporter.exportBlueprintSvg(pcb);
        exportSvgStringAsSvg(pcbSvg, `${slug}_pcb_blueprint.svg`);
        toast.success('PCB 2D vector blueprint exported (.svg)');
        return;
      }

      const pcb3dCanvas = context.pcb3dCanvasEl || resolveLiveCanvasElement('pcb-3d-webgl-canvas') || resolveLiveCanvasElement('canvas');
      if (pcb3dCanvas && pcb3dCanvas.width > 0) {
        if (format === 'png') {
          await exportCanvasAsPng(pcb3dCanvas, `${slug}_pcb3d.png`);
          toast.success('PCB 3D inspection snapshot exported (.png)');
        } else if (format === 'jpg' || format === 'jpeg') {
          await exportCanvasAsJpg(pcb3dCanvas, `${slug}_pcb3d.jpg`, '#070E1A');
          toast.success('PCB 3D snapshot exported (.jpg)');
        } else if (format === 'pdf') {
          exportCanvasAsPdf(pcb3dCanvas, `${slug}_pcb3d.pdf`, {
            title: cleanTitle,
            viewLabel: '3D Photorealistic PCB Inspection',
            subtitle: 'EI House 3D WebGL PCB Visualizer',
          }, '#070E1A');
          toast.success('PCB 3D inspection PDF document exported (.pdf)');
        }
        return;
      }
      toast.error('PCB 3D WebGL canvas not ready for snapshot.');
      return;
    }

    // Mode C: 3D Virtual Breadboard Studio
    if (isVirtual3dMode) {
      if (format === 'svg') {
        const schematicSvgString = buildStandaloneSchematicSvg(project, { theme: 'light', includeTitleBlock: true });
        exportSvgStringAsSvg(schematicSvgString, `${slug}_schematic.svg`);
        toast.success('Schematic vector drawing exported (.svg)');
        return;
      }

      const v3dCanvas = context.virtual3dCanvasEl || resolveLiveCanvasElement('virtual-3d-webgl-canvas') || resolveLiveCanvasElement('.virtual-3d-canvas canvas') || resolveLiveCanvasElement('canvas');
      if (v3dCanvas && v3dCanvas.width > 0) {
        if (format === 'png') {
          await exportCanvasAsPng(v3dCanvas, `${slug}_3d_studio.png`);
          toast.success('3D Virtual Studio snapshot exported (.png)');
        } else if (format === 'jpg' || format === 'jpeg') {
          await exportCanvasAsJpg(v3dCanvas, `${slug}_3d_studio.jpg`, '#070E1A');
          toast.success('3D Virtual Studio snapshot exported (.jpg)');
        } else if (format === 'pdf') {
          exportCanvasAsPdf(v3dCanvas, `${slug}_3d_studio.pdf`, {
            title: cleanTitle,
            viewLabel: '3D Virtual Breadboard Prototyping Studio',
            subtitle: 'Interactive Three.js Electronics Laboratory',
          }, '#070E1A');
          toast.success('3D Studio PDF document exported (.pdf)');
        }
        return;
      }
      toast.error('3D Studio WebGL canvas not ready for snapshot.');
      return;
    }

    // Mode D: Schematic Modes (Both Schematic Canvas & Schematic Editor)
    const isSchematicEditor =
      activeMode === 'schematicEditor' ||
      activeMode === 'schematic_editor' ||
      activeMode === 'schematic-editor';
    const liveEditorSvg = context.schematicEditorSvgEl || (typeof document !== 'undefined' ? (document.querySelector('[data-testid="sch-sheet-svg"]') as SVGSVGElement | null) : null);

    let schematicSvgString = '';
    let resolvedBgColor = '#070E1A';

    if (liveEditorSvg && (isSchematicEditor || !project.components || project.components.length === 0)) {
      resolvedBgColor = detectLiveSvgBgColor(liveEditorSvg);
      schematicSvgString = cloneAndSanitizeLiveSvg(liveEditorSvg, resolvedBgColor);
    } else {
      resolvedBgColor = '#070E1A';
      schematicSvgString = buildStandaloneSchematicSvg(project, { theme: 'dark', includeTitleBlock: true });
    }

    if (format === 'svg') {
      exportSvgStringAsSvg(schematicSvgString, `${slug}_schematic.svg`);
      toast.success('Schematic vector drawing exported (.svg)');
    } else if (format === 'png') {
      await exportSvgStringAsPng(schematicSvgString, `${slug}_schematic.png`, 2, resolvedBgColor);
      toast.success('Schematic snapshot exported (.png)');
    } else if (format === 'jpg' || format === 'jpeg') {
      await exportSvgStringAsJpg(schematicSvgString, `${slug}_schematic.jpg`, 2, resolvedBgColor);
      toast.success('Schematic image exported (.jpg)');
    } else if (format === 'pdf') {
      await exportSvgStringAsPdf(schematicSvgString, `${slug}_schematic.pdf`, {
        title: cleanTitle,
        viewLabel: 'Schematic Engineering Capture',
        subtitle: `Components: ${project.components?.length || 0} · Wires: ${project.wires?.length || 0}`,
      }, 2, resolvedBgColor);
      toast.success('Schematic circuit PDF document exported (.pdf)');
    }
  } catch (err) {
    console.error('Universal export error:', err);
    toast.error('Export failed. Please try again.');
  }
}
