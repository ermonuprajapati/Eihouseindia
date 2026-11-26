/**
 * Byte-Exact Pure TypeScript PDF 1.4 Binary Generator
 * Zero dependencies, strict Uint8Array offsets, printable ASCII sanitization.
 * Compatible with Acrobat Reader, Chrome, Safari, Firefox, and macOS Preview.
 */

export interface CircuitPdfMeta {
  title: string;
  viewLabel: string;
  subtitle?: string;
  dateStr?: string;
  projectName?: string;
}

/**
 * Converts a data URL (e.g. data:image/jpeg;base64,...) to a Uint8Array byte buffer
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf('base64,');
  const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 7) : dataUrl;
  const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sanitizes Unicode and technical symbols to safe, printable PDF ASCII (WinAnsi/StandardEncoding).
 * Escapes parenthesis and backslashes for PDF string literals: (text).
 */
export function sanitizePdfString(input: string): string {
  if (!input) return '';
  const mapped = input
    .replace(/[\u2126\u03A9]/g, 'Ohm') // Ω
    .replace(/[\u00B5\u03BC]/g, 'u')   // µ
    .replace(/[\u00B0]/g, 'deg')        // °
    .replace(/\//g, '-')                // /
    .replace(/&/g, 'and')
    .replace(/[\u2013\u2014]/g, '-')    // en/em dash
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, '');      // strip non-printable/extended ASCII

  // Escape parentheses and backslashes for PDF string literals
  return mapped.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Builds a pristine, uncompressed PDF 1.4 binary containing the rendered circuit image
 * with engineering title block and frame.
 */
export function buildCircuitPdfBlob(
  jpegBytes: Uint8Array,
  imgWidthPx: number,
  imgHeightPx: number,
  meta: CircuitPdfMeta
): Blob {
  // Validate JPEG SOI marker (0xFF, 0xD8)
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error('Invalid JPEG stream: missing SOI marker (0xFF, 0xD8)');
  }

  const isLandscape = imgWidthPx >= imgHeightPx;
  // A4 dimensions in typographic points (72 pt = 1 inch)
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;

  const margin = 28.35; // 10mm margin
  const headerHeight = 42.0;
  const footerHeight = 20.0;

  // Usable area for the circuit image
  const availX = margin + 10;
  const availY = margin + footerHeight + 10;
  const availW = pageWidth - 2 * margin - 20;
  const availH = pageHeight - margin - headerHeight - availY - 10;

  // Maintain aspect ratio
  const imgAspect = imgWidthPx / imgHeightPx;
  const boxAspect = availW / availH;

  let renderW = availW;
  let renderH = availH;
  if (imgAspect > boxAspect) {
    renderH = availW / imgAspect;
  } else {
    renderW = availH * imgAspect;
  }

  const renderX = availX + (availW - renderW) / 2;
  const renderY = availY + (availH - renderH) / 2;

  // Header texts
  const safeTitle = sanitizePdfString(meta.title || 'EI House Engineering Circuit');
  const safeView = sanitizePdfString(meta.viewLabel || 'Circuit Export');
  const safeSub = sanitizePdfString(meta.subtitle || 'Engineering Innovation House · eihouseindia.in');
  const safeDate = sanitizePdfString(meta.dateStr || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));

  // Content Stream PDF commands
  let content = ``;
  // 1. Engineering Border Outer & Inner
  content += `q\n`;
  content += `0.2 0.3 0.5 RG\n`; // Slate blue border color
  content += `1.5 w\n`;
  content += `${margin.toFixed(2)} ${margin.toFixed(2)} ${(pageWidth - 2 * margin).toFixed(2)} ${(pageHeight - 2 * margin).toFixed(2)} re S\n`;
  content += `0.5 w\n`;
  content += `${(margin + 4).toFixed(2)} ${(margin + 4).toFixed(2)} ${(pageWidth - 2 * margin - 8).toFixed(2)} ${(pageHeight - 2 * margin - 8).toFixed(2)} re S\n`;

  // 2. Header Box & Background
  const headerY = pageHeight - margin - headerHeight;
  content += `0.95 0.97 1.0 rg\n`; // Very light blue header background
  content += `${(margin + 4).toFixed(2)} ${headerY.toFixed(2)} ${(pageWidth - 2 * margin - 8).toFixed(2)} ${headerHeight.toFixed(2)} re f\n`;
  content += `0.7 0.8 0.9 RG\n0.75 w\n`;
  content += `${(margin + 4).toFixed(2)} ${headerY.toFixed(2)} m ${(pageWidth - margin - 4).toFixed(2)} ${headerY.toFixed(2)} l S\n`;

  // 3. Header Text Elements
  content += `0.05 0.1 0.2 rg\n`; // Dark text
  content += `BT\n/F1 14 Tf\n${(margin + 12).toFixed(2)} ${(headerY + 24).toFixed(2)} Td (${safeTitle}) Tj\nET\n`;
  content += `0.3 0.4 0.5 rg\n`;
  content += `BT\n/F1 9 Tf\n${(margin + 12).toFixed(2)} ${(headerY + 10).toFixed(2)} Td (${safeSub}) Tj\nET\n`;

  // Right-aligned header info (View & Date)
  const rightTextX = pageWidth - margin - 150;
  content += `0.1 0.4 0.8 rg\n`; // Accent blue badge
  content += `BT\n/F2 10 Tf\n${rightTextX.toFixed(2)} ${(headerY + 24).toFixed(2)} Td (${safeView}) Tj\nET\n`;
  content += `0.4 0.5 0.6 rg\n`;
  content += `BT\n/F1 8 Tf\n${rightTextX.toFixed(2)} ${(headerY + 10).toFixed(2)} Td (Date: ${safeDate}) Tj\nET\n`;

  // 4. Footer Line & Text
  const footerLineY = margin + footerHeight;
  content += `0.8 0.85 0.9 RG\n0.5 w\n`;
  content += `${(margin + 4).toFixed(2)} ${footerLineY.toFixed(2)} m ${(pageWidth - margin - 4).toFixed(2)} ${footerLineY.toFixed(2)} l S\n`;
  content += `0.5 0.6 0.7 rg\n`;
  const safeFooter = sanitizePdfString('Generated by EI House Universal Virtual Lab - ISO 216 A4 - Circuit-Only Export');
  content += `BT\n/F1 8 Tf\n${(margin + 12).toFixed(2)} ${(margin + 8).toFixed(2)} Td (${safeFooter}) Tj\nET\n`;

  // 5. Place Centered Circuit JPEG Image
  content += `q\n`;
  content += `${renderW.toFixed(2)} 0 0 ${renderH.toFixed(2)} ${renderX.toFixed(2)} ${renderY.toFixed(2)} cm\n`;
  content += `/Im1 Do\n`;
  content += `Q\n`;
  content += `Q\n`; // End main graphics state

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);

  // Assemble PDF Objects with Byte-Exact Xref Offsets
  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  function write(bytes: Uint8Array): void {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  function writeAscii(str: string): void {
    write(encoder.encode(str));
  }

  // Header (PDF-1.4 + binary comment)
  writeAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const objOffsets: number[] = [0]; // Object 0 is always 0

  // Obj 1: Catalog
  objOffsets.push(currentOffset);
  writeAscii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  objOffsets.push(currentOffset);
  writeAscii('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page
  objOffsets.push(currentOffset);
  writeAscii(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(
      2
    )}] /Contents 4 0 R /Resources << /Font << /F1 6 0 R /F2 7 0 R >> /XObject << /Im1 5 0 R >> >> >>\nendobj\n`
  );

  // Obj 4: Content Stream
  objOffsets.push(currentOffset);
  writeAscii(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  write(contentBytes);
  writeAscii('\nendstream\nendobj\n');

  // Obj 5: JPEG Image XObject
  objOffsets.push(currentOffset);
  writeAscii(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidthPx} /Height ${imgHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  write(jpegBytes);
  writeAscii('\nendstream\nendobj\n');

  // Obj 6: Font Helvetica
  objOffsets.push(currentOffset);
  writeAscii('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // Obj 7: Font Helvetica-Bold
  objOffsets.push(currentOffset);
  writeAscii('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // XRef Table
  const startXref = currentOffset;
  const numObjects = objOffsets.length; // 1..7 (8 items total)
  let xref = `xref\n0 ${numObjects}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < numObjects; i++) {
    const offStr = String(objOffsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${numObjects} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  writeAscii(xref);

  return new Blob(chunks as unknown as BlobPart[], { type: 'application/pdf' });
}
