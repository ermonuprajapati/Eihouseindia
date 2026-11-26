/**
 * Standalone Schematic Exports (SVG, PNG, JPG, PDF)
 * Circuit-only exports with zero browser chrome or sidebar buttons.
 * Backward-compatible with existing test suites.
 */

import { cloneAndSanitizeLiveSvg } from '@/modules/engineering-lab/export-engine/schematic-svg-builder';
import {
  exportSvgStringAsSvg,
  exportSvgStringAsPng,
  exportSvgStringAsJpg,
  exportSvgStringAsPdf,
} from '@/modules/engineering-lab/export-engine/raster-export';

export function exportSchematicSvg(
  svgElement: SVGSVGElement | null,
  fileName = 'schematic-capture.svg',
  bgColor = '#09101E'
): void {
  if (!svgElement) return;
  const svgStr = cloneAndSanitizeLiveSvg(svgElement, bgColor);
  exportSvgStringAsSvg(svgStr, fileName);
}

export async function exportSchematicPng(
  svgElement: SVGSVGElement | null,
  fileName = 'schematic-capture.png',
  scale = 2,
  bgColor = '#09101E'
): Promise<void> {
  if (!svgElement) return;
  const svgStr = cloneAndSanitizeLiveSvg(svgElement, bgColor);
  await exportSvgStringAsPng(svgStr, fileName, scale, bgColor);
}

export async function exportSchematicJpg(
  svgElement: SVGSVGElement | null,
  fileName = 'schematic-capture.jpg',
  scale = 2,
  bgColor = '#09101E'
): Promise<void> {
  if (!svgElement) return;
  const svgStr = cloneAndSanitizeLiveSvg(svgElement, bgColor);
  await exportSvgStringAsJpg(svgStr, fileName, scale, bgColor);
}

export async function exportSchematicPdf(
  svgElement: SVGSVGElement | null,
  fileName = 'schematic-capture.pdf',
  title = 'Schematic Capture',
  subtitle = 'EI House Engineering Schematic Sheet',
  bgColor = '#09101E'
): Promise<void> {
  if (!svgElement) return;
  const svgStr = cloneAndSanitizeLiveSvg(svgElement, bgColor);
  await exportSvgStringAsPdf(svgStr, fileName, {
    title,
    viewLabel: 'Schematic Sheet',
    subtitle,
  }, 2, bgColor);
}

export function printSchematicSheet(
  svgElement?: SVGSVGElement | null,
  title?: string,
  theme?: 'dark' | 'light'
): void {
  if (svgElement) {
    const isDark = theme !== 'light';
    const bgColor = isDark ? '#09101E' : '#ECE8DC';
    exportSchematicPdf(svgElement, `${title || 'schematic'}.pdf`, title || 'Schematic Capture', 'EI House Engineering Sheet', bgColor);
    return;
  }
  // Native print fallback
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}
