/**
 * Standalone XML Vector Schematic SVG Builder
 * Synthesizes pure IEEE vector symbols for all components + canonical 90-deg routed wires,
 * solid junction dots, bridge crossing arcs, and title block.
 * Zero DOM dependencies — captures complete circuit even when live UI uses HTML <div> overlays.
 */

import { EngineeringProject, CircuitComponent } from '../types';
import { computeCanonicalSchematicGeometry } from '@/components/engineering-lab/Panels/schematic-editor/canonical-geometry';

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Pure SVG IEEE symbol path generators for electronic components
 */
function renderComponentSvgSymbol(comp: CircuitComponent, strokeColor: string, accentColor: string): string {
  const t = (comp.type || '').toUpperCase();
  const rot = comp.rotation || 0;
  const cx = comp.x;
  const cy = comp.y;

  let symbolSvg = ``;

  if (t === 'RESISTOR') {
    // US IEEE Zig-Zag resistor
    symbolSvg = `
      <line x1="-30" y1="0" x2="-20" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <polyline points="-20,0 -16,-8 -8,8 0,-8 8,8 16,-8 20,0" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="20" y1="0" x2="30" y2="0" stroke="${strokeColor}" stroke-width="2"/>
    `;
  } else if (t === 'CAPACITOR' || t === 'CAPACITOR_CERAMIC') {
    // Parallel plates
    symbolSvg = `
      <line x1="-25" y1="0" x2="-6" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-6" y1="-14" x2="-6" y2="14" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="-14" x2="6" y2="14" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
    `;
  } else if (t === 'CAPACITOR_ELECTROLYTIC') {
    // Polarized capacitor (flat anode, curved cathode)
    symbolSvg = `
      <line x1="-25" y1="0" x2="-6" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-6" y1="-14" x2="-6" y2="14" stroke="${strokeColor}" stroke-width="2.5"/>
      <path d="M 6,-14 Q 10,0 6,14" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <text x="-14" y="-8" fill="${accentColor}" font-size="9" font-family="monospace" font-weight="bold">+</text>
    `;
  } else if (t.includes('LED')) {
    // Diode triangle + bar + emission rays
    symbolSvg = `
      <line x1="-25" y1="0" x2="-10" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <polygon points="-10,-10 -10,10 6,0" fill="${accentColor}" stroke="${strokeColor}" stroke-width="1.5"/>
      <line x1="6" y1="-10" x2="6" y2="10" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-2" y1="-12" x2="6" y2="-20" stroke="${accentColor}" stroke-width="1.5"/>
      <polygon points="6,-20 3,-18 5,-16" fill="${accentColor}"/>
      <line x1="4" y1="-10" x2="12" y2="-18" stroke="${accentColor}" stroke-width="1.5"/>
      <polygon points="12,-18 9,-16 11,-14" fill="${accentColor}"/>
    `;
  } else if (t === 'DIODE' || t.includes('DIODE')) {
    // Standard PN Diode
    symbolSvg = `
      <line x1="-25" y1="0" x2="-10" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <polygon points="-10,-10 -10,10 6,0" fill="${strokeColor}" stroke="${strokeColor}" stroke-width="1.5"/>
      <line x1="6" y1="-10" x2="6" y2="10" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
    `;
  } else if (t.includes('BATTERY') || t === 'DC_POWER') {
    // DC Battery / Power source
    symbolSvg = `
      <line x1="-20" y1="0" x2="-6" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-6" y1="-16" x2="-6" y2="16" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="0" y1="-8" x2="0" y2="8" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="6" y1="-16" x2="6" y2="16" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="12" y1="-8" x2="12" y2="8" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="12" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <text x="-16" y="-8" fill="${accentColor}" font-size="9" font-family="monospace" font-weight="bold">+</text>
    `;
  } else if (t.startsWith('GND') || t === 'GROUND') {
    // Ground reference symbol
    symbolSvg = `
      <line x1="0" y1="-15" x2="0" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-12" y1="0" x2="12" y2="0" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="-8" y1="4" x2="8" y2="4" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-4" y1="8" x2="4" y2="8" stroke="${strokeColor}" stroke-width="1.5"/>
    `;
  } else if (t.startsWith('VCC') || t === 'POWER_FLAG') {
    // Power supply flag
    symbolSvg = `
      <line x1="0" y1="15" x2="0" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <polygon points="0,-8 -8,0 8,0" fill="${accentColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    `;
  } else if (t.includes('TRANSISTOR') || t === 'NPN' || t === 'PNP' || t === 'BJT_NPN') {
    // BJT NPN Transistor
    symbolSvg = `
      <line x1="-25" y1="0" x2="-8" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-8" y1="-14" x2="-8" y2="14" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="-8" y1="-6" x2="12" y2="-18" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="12" y1="-18" x2="12" y2="-25" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-8" y1="6" x2="12" y2="18" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="12" y1="18" x2="12" y2="25" stroke="${strokeColor}" stroke-width="2"/>
      <polygon points="12,18 7,12 11,9" fill="${strokeColor}"/>
      <circle cx="2" cy="0" r="22" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2,2"/>
    `;
  } else if (t.includes('SWITCH') || t.includes('BUTTON')) {
    // Pushbutton / Switch
    symbolSvg = `
      <line x1="-25" y1="0" x2="-12" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <circle cx="-10" cy="0" r="2.5" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
      <line x1="-8" y1="-1" x2="8" y2="-10" stroke="${strokeColor}" stroke-width="2"/>
      <circle cx="10" cy="0" r="2.5" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
      <line x1="12" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2"/>
    `;
  } else if (t.includes('POTENTIOMETER')) {
    // Potentiometer with wiper arrow
    symbolSvg = `
      <line x1="-30" y1="0" x2="-20" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <polyline points="-20,0 -16,-8 -8,8 0,-8 8,8 16,-8 20,0" fill="none" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="20" y1="0" x2="30" y2="0" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="0" y1="-18" x2="0" y2="-6" stroke="${accentColor}" stroke-width="2"/>
      <polygon points="0,-6 -3,-10 3,-10" fill="${accentColor}"/>
    `;
  } else if (t.includes('BUZZER')) {
    // Piezo Buzzer
    symbolSvg = `
      <line x1="-20" y1="-10" x2="-8" y2="-10" stroke="${strokeColor}" stroke-width="2"/>
      <line x1="-20" y1="10" x2="-8" y2="10" stroke="${strokeColor}" stroke-width="2"/>
      <path d="M -8,-16 L 8,-16 A 16,16 0 0,1 8,16 L -8,16 Z" fill="none" stroke="${strokeColor}" stroke-width="2"/>
    `;
  } else {
    // IC / MCU / General Package Box
    const numPins = comp.pins?.length || 8;
    const boxW = numPins > 16 ? 120 : (numPins > 8 ? 80 : 54);
    const boxH = Math.max(50, Math.ceil(numPins / 2) * 14 + 14);
    const halfW = boxW / 2;
    const halfH = boxH / 2;

    let pinsSvg = '';
    if (comp.pins) {
      comp.pins.forEach((p) => {
        pinsSvg += `
          <line x1="${p.x}" y1="${p.y}" x2="${p.x > 0 ? halfW : -halfW}" y2="${p.y}" stroke="${strokeColor}" stroke-width="1.5"/>
          <circle cx="${p.x}" cy="${p.y}" r="2" fill="${accentColor}"/>
          <text x="${p.x > 0 ? p.x - 4 : p.x + 4}" y="${p.y + 3}" fill="${strokeColor}" font-size="7" font-family="monospace" text-anchor="${p.x > 0 ? 'end' : 'start'}">${escapeXml(p.name || p.id)}</text>
        `;
      });
    }

    symbolSvg = `
      <rect x="-${halfW}" y="-${halfH}" width="${boxW}" height="${boxH}" rx="3" fill="#0A1628" stroke="${strokeColor}" stroke-width="2"/>
      <circle cx="-${halfW - 6}" cy="-${halfH - 6}" r="2.5" fill="${accentColor}"/>
      <text x="0" y="3" fill="${strokeColor}" font-size="9" font-family="monospace" font-weight="bold" text-anchor="middle">${escapeXml(comp.label || comp.type)}</text>
      ${pinsSvg}
    `;
  }

  const des = escapeXml(comp.designator || comp.id);
  const val = escapeXml(comp.value || '');

  return `
    <g id="comp-${comp.id}" transform="translate(${cx}, ${cy}) rotate(${rot})">
      ${symbolSvg}
      <!-- Designator & Value Labels -->
      <text x="0" y="-18" fill="${strokeColor}" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${des}</text>
      <text x="0" y="24" fill="${accentColor}" font-size="8.5" font-family="monospace" text-anchor="middle">${val}</text>
    </g>
  `;
}

/**
 * Builds a 100% valid standalone XML SVG containing the full circuit diagram.
 */
export function buildStandaloneSchematicSvg(
  project: EngineeringProject,
  options?: { theme?: 'light' | 'dark'; includeTitleBlock?: boolean }
): string {
  const isDark = options?.theme !== 'light';
  const bgColor = isDark ? '#070E1A' : '#F8FAFC';
  const wireColor = isDark ? '#38BDF8' : '#0284C7';
  const strokeColor = isDark ? '#E2E8F0' : '#0F172A';
  const accentColor = isDark ? '#38BDF8' : '#0284C7';
  const junctionColor = isDark ? '#38BDF8' : '#0369A1';

  // Compute canonical geometry: 90-degree orthogonal trunks, bridge crossing arcs, junctions
  const geom = computeCanonicalSchematicGeometry(project.wires || [], project.components || [], [], 10);

  // Calculate circuit tight bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  (project.components || []).forEach((c) => {
    minX = Math.min(minX, c.x - 40);
    maxX = Math.max(maxX, c.x + 40);
    minY = Math.min(minY, c.y - 40);
    maxY = Math.max(maxY, c.y + 40);
  });

  geom.routedWires.forEach((w) => {
    w.points.forEach((pt) => {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    });
  });

  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const padding = 50;
  const viewBoxX = Math.floor(minX - padding);
  const viewBoxY = Math.floor(minY - padding);
  const viewBoxW = Math.ceil(maxX - minX + padding * 2);
  const viewBoxH = Math.ceil(maxY - minY + padding * 2 + (options?.includeTitleBlock !== false ? 60 : 0));

  let out = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  out += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="${viewBoxW}" height="${viewBoxH}">\n`;
  out += `  <!-- Background -->\n`;
  out += `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="${bgColor}"/>\n`;

  // Grid Dots
  out += `  <defs>\n`;
  out += `    <pattern id="sch-grid" width="20" height="20" patternUnits="userSpaceOnUse">\n`;
  out += `      <circle cx="10" cy="10" r="0.75" fill="${isDark ? '#1E293B' : '#CBD5E1'}"/>\n`;
  out += `    </pattern>\n`;
  out += `  </defs>\n`;
  out += `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="url(#sch-grid)"/>\n`;

  // 1. Routed Wires Layer
  out += `  <!-- Wires & Bridges Layer -->\n`;
  out += `  <g id="schematic-wires" stroke="${wireColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">\n`;
  geom.routedWires.forEach((w) => {
    out += `    <path d="${w.svgPath}" id="wire-${w.wireId}"/>\n`;
  });
  out += `  </g>\n`;

  // 2. Junction Dots Layer
  out += `  <!-- Electrical Junction Dots Layer -->\n`;
  out += `  <g id="schematic-junctions" fill="${junctionColor}">\n`;
  geom.junctionDots.forEach((j, idx) => {
    out += `    <circle cx="${j.x}" cy="${j.y}" r="3.5" id="junction-${idx}"/>\n`;
  });
  out += `  </g>\n`;

  // 3. Components Layer
  out += `  <!-- Components Layer -->\n`;
  out += `  <g id="schematic-components">\n`;
  (project.components || []).forEach((c) => {
    out += renderComponentSvgSymbol(c, strokeColor, accentColor);
  });
  out += `  </g>\n`;

  // 4. Engineering Title Block
  if (options?.includeTitleBlock !== false) {
    const tbX = viewBoxX + 20;
    const tbY = viewBoxY + viewBoxH - 55;
    const tbW = Math.min(360, viewBoxW - 40);
    out += `  <!-- Title Block -->\n`;
    out += `  <g id="schematic-titleblock">\n`;
    out += `    <rect x="${tbX}" y="${tbY}" width="${tbW}" height="45" rx="3" fill="${isDark ? '#0F172A' : '#FFFFFF'}" stroke="${isDark ? '#334155' : '#CBD5E1'}" stroke-width="1"/>\n`;
    out += `    <text x="${tbX + 12}" y="${tbY + 18}" fill="${strokeColor}" font-size="11" font-family="sans-serif" font-weight="bold">${escapeXml(project.title || 'EI House Circuit')}</text>\n`;
    out += `    <text x="${tbX + 12}" y="${tbY + 33}" fill="${isDark ? '#94A3B8' : '#64748B'}" font-size="8.5" font-family="monospace">Components: ${project.components?.length || 0} | Wires: ${project.wires?.length || 0} | Date: ${new Date().toISOString().slice(0, 10)}</text>\n`;
    out += `    <text x="${tbX + tbW - 12}" y="${tbY + 25}" fill="${accentColor}" font-size="9" font-family="sans-serif" font-weight="bold" text-anchor="end">EI HOUSE INDIA</text>\n`;
    out += `  </g>\n`;
  }

  out += `</svg>\n`;
  return out;
}

/**
 * Clones a live <svg> element, removes unwanted interactive overlay elements,
 * injects namespaces and background rect, and returns valid XML source.
 */
export function cloneAndSanitizeLiveSvg(svgEl: SVGSVGElement, bgColor = '#09101E'): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Remove elements flagged to ignore in export
  const ignoreElements = clone.querySelectorAll('[data-export-ignore="true"], .marquee-selection, .rubberband');
  ignoreElements.forEach((el) => el.remove());

  // Guarantee XML namespaces
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Prepend solid background rectangle if not present
  const firstChild = clone.firstChild;
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const w = clone.getAttribute('width') || '100%';
  const h = clone.getAttribute('height') || '100%';
  bgRect.setAttribute('width', w);
  bgRect.setAttribute('height', h);
  bgRect.setAttribute('fill', bgColor);
  clone.insertBefore(bgRect, firstChild);

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clone);

  if (!source.startsWith('<?xml')) {
    source = `<?xml version="1.0" encoding="UTF-8"?>\n` + source;
  }

  return source;
}
