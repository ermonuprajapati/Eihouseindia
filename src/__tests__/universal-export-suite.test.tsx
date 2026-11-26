import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GerberExporter } from '../modules/engineering-lab/pcb-engine/gerber-exporter';
import { buildCircuitPdfBlob } from '../modules/engineering-lab/export-engine/pdf-builder';
import { buildStandaloneSchematicSvg, cloneAndSanitizeLiveSvg } from '../modules/engineering-lab/export-engine/schematic-svg-builder';
import {
  resolveProductionPcbForExport,
  createEihouseProjectPayload,
  parseEihouseProject,
  runUniversalExport,
} from '../modules/engineering-lab/export-engine/universal-exporter';
import { TEMPLATE_555_ASTABLE } from '../modules/engineering-lab/templates/starter-templates';
import { PcbGenerator } from '../modules/engineering-lab/pcb-engine/pcb-generator';
import { EngineeringProject, PcbLayout, CircuitComponent } from '../modules/engineering-lab/types';

/**
 * Helper to parse file names and text contents from an uncompressed PKZIP (method 0) Uint8Array
 */
function parsePkzipEntries(buffer: Uint8Array): Map<string, string> {
  const entries = new Map<string, string>();
  let offset = 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset + 30 <= buffer.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) {
      // Reached central directory or end
      break;
    }
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = buffer.subarray(offset + 30, offset + 30 + nameLen);
    const fileName = new TextDecoder('utf-8').decode(nameBytes);

    const dataStart = offset + 30 + nameLen + extraLen;
    const dataBytes = buffer.subarray(dataStart, dataStart + uncompSize);
    const content = new TextDecoder('utf-8').decode(dataBytes);

    entries.set(fileName, content);
    offset = dataStart + compSize;
  }
  return entries;
}

/**
 * Minimal 1x1 valid JPEG image bytes (SOI, SOF0, SOS, EOI)
 */
function createMinimalJpegBytes(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xff, 0xdb, 0x00, 0x43, 0x00,
    ...new Array(64).fill(1),
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, // 1x1 pixel
    0xff, 0xc4, 0x00, 0x1f, 0x00,
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x7f, 0x00,
    0xff, 0xd9, // EOI
  ]);
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const symbols = Object.getOwnPropertySymbols(blob);
  for (const sym of symbols) {
    const val = (blob as unknown as Record<symbol, unknown>)[sym] as { _buffer?: Buffer } | undefined;
    if (val && val._buffer && Buffer.isBuffer(val._buffer)) {
      return new Uint8Array(val._buffer);
    }
  }
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

describe('Universal Export & CAM Manufacturing Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Test 1: JLCPCB & PCBWay RS-274X Gerber ZIP + Excellon Drill + BOM/CPL
  // ============================================================================
  it('Test 1: builds complete production CAM Gerber ZIP package with 100% compliance', async () => {
    // Generate PCB layout from NE555 template
    const pcb = PcbGenerator.generatePcbFromSchematic(
      TEMPLATE_555_ASTABLE.components,
      TEMPLATE_555_ASTABLE.wires,
      80,
      60
    );

    // Ensure mounting holes are present to test NPTH drill export
    pcb.mountingHoles = [
      { id: 'mh1', xMm: 5, yMm: 5, x: 5, y: 5, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
      { id: 'mh2', xMm: 75, yMm: 55, x: 75, y: 55, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
    ];

    const zipBlob = await GerberExporter.buildGerberZipBlob(pcb, TEMPLATE_555_ASTABLE.components, 'NE555_Timer');
    const zipBytes = await blobToUint8Array(zipBlob);

    // 1. Assert PKZIP magic bytes 0x50, 0x4B, 0x03, 0x04
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);

    // 2. Parse PKZIP entries
    const entries = parsePkzipEntries(zipBytes);

    // 3. Assert all required CAM files exist inside ZIP
    const requiredFiles = [
      'F_Cu.GTL',
      'B_Cu.GBL',
      'F_Mask.GTS',
      'B_Mask.GBS',
      'F_SilkS.GTO',
      'B_SilkS.GBO',
      'F_Paste.GTP',
      'B_Paste.GBP',
      'Edge_Cuts.GKO',
      'Drill.DRL',
      'Drill_NPTH.DRL',
      'PickAndPlace.csv',
      'Bill_of_Materials.csv',
      'BOM_JLCPCB.csv',
      'README_MANUFACTURING.txt',
    ];

    for (const reqFile of requiredFiles) {
      expect(entries.has(reqFile), `Missing CAM file in ZIP: ${reqFile}`).toBe(true);
    }

    // 4. Assert Gerber RS-274X header attributes & linear interpolation
    const gtlContent = entries.get('F_Cu.GTL') || '';
    expect(gtlContent).toContain('%TF.Part,Single*%');
    expect(gtlContent).toContain('%TF.CreationDate');
    expect(gtlContent).toContain('M02*');

    // Every draw strobe D01* must be preceded by G01* linear interpolation
    const lines = gtlContent.split('\n');
    let hasD01 = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('D01*')) {
        hasD01 = true;
        // Either line itself has G01 or previous non-empty line has G01
        const windowLines = [lines[i - 1] || '', lines[i]].join(' ');
        expect(windowLines).toContain('G01');
      }
    }
    expect(hasD01).toBe(true);

    // 5. Assert Drill Deduplication and PTH vs NPTH separation
    const pthDrill = entries.get('Drill.DRL') || '';
    const npthDrill = entries.get('Drill_NPTH.DRL') || '';

    expect(pthDrill).toContain('M48');
    expect(pthDrill).toContain('M30');
    expect(npthDrill).toContain('M48');
    expect(npthDrill).toContain('M30');

    // Parse PTH drill coordinates and assert zero duplicates within 0.01mm
    const coordRegex = /X([\d.]+)Y([\d.]+)/g;
    const pthHits: { x: number; y: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = coordRegex.exec(pthDrill)) !== null) {
      pthHits.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    }
    expect(pthHits.length).toBeGreaterThan(0);

    for (let i = 0; i < pthHits.length; i++) {
      for (let j = i + 1; j < pthHits.length; j++) {
        const dist = Math.hypot(pthHits[i].x - pthHits[j].x, pthHits[i].y - pthHits[j].y);
        expect(dist, `Duplicate PTH drill hit found at index ${i} and ${j}`).toBeGreaterThanOrEqual(0.009);
      }
    }

    // 6. Assert Silkscreen vector stroke fonts
    const fSilk = entries.get('F_SilkS.GTO') || '';
    expect(fSilk).toContain('%FSLAX35Y35*%');
    // Must contain draw strokes (D01*) for vector component labels
    expect(fSilk).toContain('D01*');

    // 7. Assert JLCPCB BOM CSV header & structure
    const jlcBom = entries.get('BOM_JLCPCB.csv') || '';
    expect(jlcBom).toContain('Comment,Designator,Footprint,Quantity,LCSC Part #');
    expect(jlcBom).toContain('NE555');

    // 8. Assert Pick and Place Centroid CSV
    const cpl = entries.get('PickAndPlace.csv') || '';
    expect(cpl).toContain('Designator,Val,Package,Mid X,Mid Y,Rotation,Layer');
  });

  // ============================================================================
  // Test 2: In-Memory PCB Resolution & Layout Preservation
  // ============================================================================
  it('Test 2: preserves existing PCB edits and resolves in-memory PCB when empty without state mutation', () => {
    // Case A: Project with populated PCB
    const existingPcb: PcbLayout = {
      widthMm: 100,
      heightMm: 70,
      boardThicknessMm: 1.6,
      copperLayers: 2,
      components: [
        {
          componentId: 'comp_1',
          designator: 'U1',
          type: 'TIMER_555',
          label: 'U1',
          value: 'NE555',
          footprint: 'DIP-8',
          x: 20,
          y: 20,
          rotation: 0,
        },
      ],
      pads: [
        { id: 'p1', componentId: 'comp_1', pinId: '1', x: 20, y: 20, diameterMm: 1.6, shape: 'round', layer: 'all', holeMm: 0.8 },
      ],
      tracks: [
        { id: 't1', from: { x: 20, y: 20 }, to: { x: 30, y: 30 }, layer: 'top_copper', widthMm: 0.35, netId: 'NET1' },
      ],
      drcErrors: [],
    };

    const projectWithPcb: EngineeringProject = {
      ...TEMPLATE_555_ASTABLE,
      components: [
        {
          id: 'comp_1',
          type: 'TIMER_555',
          category: 'analog_ics',
          footprint: 'DIP-8',
          parameters: {},
          label: 'U1',
          designator: 'U1',
          value: 'NE555',
          x: 100,
          y: 100,
          rotation: 0,
          pins: [{ id: '1', name: 'GND', x: 0, y: 0, pinType: 'passive' }],
        },
      ],
      wires: [],
      pcb: existingPcb,
    };

    const resolvedA = resolveProductionPcbForExport(projectWithPcb);
    // Must return exact same PCB layout reference (zero overwrite)
    expect(resolvedA).toBe(existingPcb);
    expect(resolvedA.tracks.length).toBe(1);

    // Case B: Project with undefined/empty PCB
    const projectWithoutPcb: EngineeringProject = {
      ...TEMPLATE_555_ASTABLE,
      pcb: undefined as unknown as PcbLayout,
    };

    const resolvedB = resolveProductionPcbForExport(projectWithoutPcb);
    // Must generate valid PCB in-memory
    expect(resolvedB).toBeDefined();
    expect(resolvedB.widthMm).toBeGreaterThan(0);
    expect(resolvedB.heightMm).toBeGreaterThan(0);
    expect(resolvedB.components?.length).toBeGreaterThan(0);
    expect(resolvedB.pads?.length).toBeGreaterThan(0);
    // Must NOT mutate original project
    expect(projectWithoutPcb.pcb).toBeUndefined();
  });

  // ============================================================================
  // Test 3: Pure TypeScript PDF 1.4 Binary Generator
  // ============================================================================
  it('Test 3: builds byte-exact PDF 1.4 binary with valid xref table and unicode title sanitization', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const jpegBytes = createMinimalJpegBytes();
    const unicodeTitle = '555 Timer - 10kΩ & 100µF';
    const subtitle = 'High Frequency Astable Multivibrator';

    const pdfBlob = buildCircuitPdfBlob(jpegBytes, 800, 600, {
      title: unicodeTitle,
      subtitle,
      viewLabel: 'Schematic Capture',
      projectName: 'EI House India',
    });

    const pdfBuffer = await blobToUint8Array(pdfBlob);
    const pdfString = new TextDecoder('latin1').decode(pdfBuffer);

    // 1. PDF header
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);

    // 2. Document Catalog and Pages
    expect(pdfString).toContain('/Type /Catalog');
    expect(pdfString).toContain('/Type /Pages');
    expect(pdfString).toContain('/Type /Page');

    // 3. JPEG Image XObject
    expect(pdfString).toContain('/Type /XObject');
    expect(pdfString).toContain('/Subtype /Image');
    expect(pdfString).toContain('/Filter /DCTDecode');
    expect(pdfString).toContain('/ColorSpace /DeviceRGB');

    // 4. Sanitized ASCII text (Ω -> Ohm, µ -> u, & -> and, special chars escaped)
    expect(pdfString).toContain('555 Timer - 10kOhm and 100uF');
    expect(pdfString).toContain('EI House');

    // 5. EOF and valid xref offsets
    expect(pdfString).toContain('%%EOF');
    expect(pdfString).toContain('startxref');

    const xrefIdx = pdfString.indexOf('xref');
    expect(xrefIdx).toBeGreaterThan(0);

    // Extract startxref value
    const startXrefMatch = /startxref\s+(\d+)\s+%%EOF/.exec(pdfString);
    expect(startXrefMatch).not.toBeNull();
    const reportedStartXref = parseInt(startXrefMatch![1], 10);
    expect(reportedStartXref).toBe(xrefIdx);

    // Verify xref table byte offsets match actual "N 0 obj" positions in the Uint8Array
    const xrefLines = pdfString.substring(xrefIdx).split('\n').map((l) => l.trim()).filter(Boolean);
    // Find lines of format: 0000000010 00000 n
    const objOffsetRegex = /^(\d{10})\s+(\d{5})\s+n$/;
    let objCount = 0;
    for (const line of xrefLines) {
      const m = objOffsetRegex.exec(line);
      if (m) {
        const offsetVal = parseInt(m[1], 10);
        if (offsetVal > 0) {
          objCount++;
          // Byte at offsetVal should begin with object ID
          const sliceAtOffset = pdfString.substring(offsetVal, offsetVal + 20);
          expect(sliceAtOffset).toMatch(/^\d+\s+0\s+obj/);
        }
      }
    }
    expect(objCount).toBeGreaterThanOrEqual(4);

    // 6. Assert window.print was called 0 times
    expect(printSpy).toHaveBeenCalledTimes(0);
  });

  // ============================================================================
  // Test 4: Standalone Vector Schematic SVG Builder
  // ============================================================================
  it('Test 4: builds standalone vector schematic SVG with IEEE symbols, canonical geometry and XML escaping', () => {
    const testProject: EngineeringProject = {
      ...TEMPLATE_555_ASTABLE,
      title: '555 Timer & LED Pulser <Rev 1.2> "Custom"',
      components: [
        {
          id: 'r1',
          type: 'RESISTOR',
          category: 'passive',
          footprint: 'R_AXIAL-0.4',
          parameters: {},
          label: 'R1',
          designator: 'R1',
          value: '10kΩ & 5% Tol',
          x: 200,
          y: 200,
          rotation: 0,
          pins: [
            { id: '1', name: '1', x: 0, y: 0, pinType: 'passive' },
            { id: '2', name: '2', x: 0, y: 0, pinType: 'passive' },
          ],
        },
        {
          id: 'c1',
          type: 'CAPACITOR_ELECTROLYTIC',
          category: 'passive',
          footprint: 'CP_RADIAL-D8.0',
          parameters: {},
          label: 'C1',
          designator: 'C1',
          value: '100µF 25V',
          x: 350,
          y: 200,
          rotation: 0,
          pins: [
            { id: '+', name: '+', x: 0, y: 0, pinType: 'passive' },
            { id: '-', name: '-', x: 0, y: 0, pinType: 'passive' },
          ],
        },
        {
          id: 'u1',
          type: 'TIMER_555',
          category: 'analog_ics',
          footprint: 'DIP-8',
          parameters: {},
          label: 'U1',
          designator: 'U1',
          value: 'NE555P',
          x: 500,
          y: 200,
          rotation: 0,
          pins: [
            { id: '1', name: 'GND', x: 0, y: 0, pinType: 'power' },
            { id: '2', name: 'TRIG', x: 0, y: 0, pinType: 'input' },
            { id: '3', name: 'OUT', x: 0, y: 0, pinType: 'output' },
            { id: '4', name: 'RESET', x: 0, y: 0, pinType: 'input' },
            { id: '5', name: 'CTRL', x: 0, y: 0, pinType: 'passive' },
            { id: '6', name: 'THRES', x: 0, y: 0, pinType: 'input' },
            { id: '7', name: 'DISCH', x: 0, y: 0, pinType: 'passive' },
            { id: '8', name: 'VCC', x: 0, y: 0, pinType: 'power' },
          ],
        },
      ],
      wires: [
        {
          id: 'w1',
          fromCompId: 'r1',
          fromPinId: '2',
          toCompId: 'c1',
          toPinId: '+',
          color: '#10B981',
        },
      ],
    };

    const svgOutput = buildStandaloneSchematicSvg(testProject, { theme: 'dark', includeTitleBlock: true });

    // 1. XML header & SVG root
    expect(svgOutput.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svgOutput).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svgOutput).toContain('viewBox=');

    // 2. XML escaping verification
    expect(svgOutput).toContain('10kΩ &amp; 5% Tol');
    expect(svgOutput).toContain('&lt;Rev 1.2&gt;');
    expect(svgOutput).toContain('&quot;Custom&quot;');
    // Raw unescaped brackets or naked ampersands should not exist in text
    expect(svgOutput).not.toContain('<Rev 1.2>');

    // 3. Components rendered
    expect(svgOutput).toContain('R1');
    expect(svgOutput).toContain('C1');
    expect(svgOutput).toContain('U1');
    expect(svgOutput).toContain('NE555P');

    // 4. Canonical wire polyline rendered
    expect(svgOutput).toContain('<polyline');

    // 5. Title block rendered
    expect(svgOutput).toContain('EI HOUSE INDIA');
  });

  // ============================================================================
  // Test 5: Live DOM SVG Cloning & Sanitization
  // ============================================================================
  it('Test 5: cloneAndSanitizeLiveSvg removes export-ignore elements and ensures valid standalone XML', () => {
    // Create live SVG in JSDOM
    const liveSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    liveSvg.setAttribute('width', '600');
    liveSvg.setAttribute('height', '400');
    liveSvg.setAttribute('viewBox', '0 0 600 400');

    // Content element
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '50');
    liveSvg.appendChild(rect);

    // Ignored element (e.g. selection marquee or rubberband)
    const ignoreEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ignoreEl.setAttribute('data-export-ignore', 'true');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '20');
    ignoreEl.appendChild(circle);
    liveSvg.appendChild(ignoreEl);

    const sanitized = cloneAndSanitizeLiveSvg(liveSvg, '#09101E');

    // 1. Output must be full valid XML document
    expect(sanitized.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(sanitized).toContain('xmlns="http://www.w3.org/2000/svg"');

    // 2. Background solid rect must be injected
    expect(sanitized).toContain('fill="#09101E"');

    // 3. data-export-ignore element must be stripped
    expect(sanitized).not.toContain('data-export-ignore');
    expect(sanitized).not.toContain('<circle');

    // 4. Original DOM element must remain unmodified
    expect(liveSvg.querySelector('[data-export-ignore="true"]')).not.toBeNull();
  });

  // ============================================================================
  // Test 6: Project Serialization Roundtrip (.eihouse.json)
  // ============================================================================
  it('Test 6: creates valid .eihouse.json schema and parses back with 100% roundtrip fidelity', () => {
    const payload = createEihouseProjectPayload(TEMPLATE_555_ASTABLE);
    expect(payload.schemaVersion).toBe('1.0.0');
    expect(payload.generator).toBe('EI House India Universal Virtual Lab');
    expect(payload.project.title).toBe(TEMPLATE_555_ASTABLE.title);

    const jsonString = JSON.stringify(payload, null, 2);
    const parsed = parseEihouseProject(jsonString);

    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(TEMPLATE_555_ASTABLE.id);
    expect(parsed?.title).toBe(TEMPLATE_555_ASTABLE.title);
    expect(parsed?.components.length).toBe(TEMPLATE_555_ASTABLE.components.length);
    expect(parsed?.wires.length).toBe(TEMPLATE_555_ASTABLE.wires.length);
  });

  // ============================================================================
  // Test 7: Universal Exporter Format Dispatching
  // ============================================================================
  it('Test 7: runUniversalExport dispatches cleanly across BOM, Netlist, and Firmware formats', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    (globalThis as unknown as { URL: { createObjectURL: typeof createObjectURLSpy; revokeObjectURL: typeof revokeObjectURLSpy } }).URL.createObjectURL = createObjectURLSpy;
    (globalThis as unknown as { URL: { createObjectURL: typeof createObjectURLSpy; revokeObjectURL: typeof revokeObjectURLSpy } }).URL.revokeObjectURL = revokeObjectURLSpy;

    // Mock HTMLAnchorElement.prototype.click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // Dispatch BOM
    await runUniversalExport('bom', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'schematic',
    });
    expect(clickSpy).toHaveBeenCalled();

    // Dispatch CPL
    await runUniversalExport('cpl', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'pcb2d',
    });
    expect(clickSpy).toHaveBeenCalled();

    // Dispatch Firmware
    await runUniversalExport('firmware', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'firmware',
    });
    expect(clickSpy).toHaveBeenCalled();

    // Dispatch C++
    await runUniversalExport('cpp', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'firmware',
    });
    expect(clickSpy).toHaveBeenCalled();

    // Dispatch JSON netlist
    await runUniversalExport('netlist-json', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'schematic',
    });
    expect(clickSpy).toHaveBeenCalled();
  });

  // ============================================================================
  // Test 8: Context-Aware SVG Exports in 3D Views (pcb3d & virtual3d)
  // ============================================================================
  it('Test 8: runUniversalExport dispatches SVG cleanly in pcb3d and virtual3d modes', async () => {
    let downloadedFilename = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });

    // pcb3d mode -> exports PCB blueprint SVG
    await runUniversalExport('svg', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'pcb3d',
    });
    expect(downloadedFilename).toContain('_pcb_blueprint.svg');

    // virtual3d mode -> exports schematic vector SVG
    await runUniversalExport('svg', {
      project: TEMPLATE_555_ASTABLE,
      activeMode: 'virtual3d',
    });
    expect(downloadedFilename).toContain('_schematic.svg');
    clickSpy.mockRestore();
  });

  // ============================================================================
  // Test 9: PDF Stream WinAnsi Safety (Zero 0xC2 0xB7 Multi-Byte Glitches)
  // ============================================================================
  it('Test 9: PDF output contains zero non-ASCII 0xC2 0xB7 bytes in Helvetica text stream', async () => {
    const jpegBytes = createMinimalJpegBytes();
    const pdfBlob = buildCircuitPdfBlob(jpegBytes, 800, 600, {
      title: '555 Timer · 10kΩ & 100µF',
      viewLabel: 'Schematic Sheet',
      subtitle: 'Size: 80 x 60 mm · 2-Layer FR-4',
    });

    const pdfBytes = await blobToUint8Array(pdfBlob);

    // Verify PDF header and trailer
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('%%EOF');

    // Search for UTF-8 multi-byte sequence for middle dot: 0xC2, 0xB7
    let hasMiddleDotUtf8 = false;
    for (let i = 0; i < pdfBytes.length - 1; i++) {
      if (pdfBytes[i] === 0xc2 && pdfBytes[i + 1] === 0xb7) {
        hasMiddleDotUtf8 = true;
        break;
      }
    }
    expect(hasMiddleDotUtf8).toBe(false);
  });

  // ============================================================================
  // Test 10: Schematic Editor SVG Light Theme & Style Inlining Stability
  // ============================================================================
  it('Test 10: Schematic editor SVG preserves light background #ECE8DC without style index shifting', () => {
    const liveSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    liveSvg.setAttribute('viewBox', '0 0 1000 700');

    // Ignored element before styled element
    const ignoreEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ignoreEl.setAttribute('data-export-ignore', 'true');
    liveSvg.appendChild(ignoreEl);

    // Styled element
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '50');
    rect.setAttribute('height', '50');
    rect.style.stroke = 'rgb(0, 0, 0)';
    liveSvg.appendChild(rect);

    const sanitized = cloneAndSanitizeLiveSvg(liveSvg, '#ECE8DC');

    expect(sanitized).toContain('fill="#ECE8DC"');
    expect(sanitized).not.toContain('data-export-ignore');
    expect(sanitized).toContain('viewBox="0 0 1000 700"');
  });

  // ============================================================================
  // Test 11: CSV Double-Quote Escaping Standards
  // ============================================================================
  it('Test 11: CSV generation escapes double quotes properly (0.1" Header -> ""0.1"""" Header"")', () => {
    const comp = {
      id: 'c1',
      type: 'HEADER',
      label: '0.1" Header',
      designator: 'J1 "Main"',
      value: '0.1" Header',
      footprint: 'HDR_1X2 "SMD"',
      manufacturerPartNumber: 'PART "ABC"',
      pins: [],
      x: 20,
      y: 20,
      rotation: 0,
    } as unknown as CircuitComponent;

    const bomCsv = GerberExporter.exportBomCsv([comp]);
    expect(bomCsv).toContain('0.1"" Header');
    expect(bomCsv).toContain('J1 ""Main""');
    expect(bomCsv).toContain('PART ""ABC""');

    const pcb = {
      widthMm: 50,
      heightMm: 50,
      components: [
        {
          componentId: 'c1',
          label: '0.1" Header',
          designator: 'J1 "Main"',
          type: 'HEADER',
          value: '0.1" Header',
          footprint: 'HDR_1X2 "SMD"',
          x: 20,
          y: 20,
          rotation: 0,
        },
      ],
      pads: [],
      tracks: [],
    } as unknown as PcbLayout;

    const cplCsv = GerberExporter.exportPickAndPlaceCsv(pcb);
    expect(cplCsv).toContain('J1 ""Main""');
    expect(cplCsv).toContain('0.1"" Header');
  });
});
