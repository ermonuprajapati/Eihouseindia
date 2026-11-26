/**
 * Raster & Binary Export Utilities
 * SVG/Canvas -> High-DPI PNG, crisp JPG, and binary PDF 1.4
 * UTF-8 Blob safe (no btoa Unicode crash), asynchronous delayed ObjectURL release.
 */

import { buildCircuitPdfBlob, dataUrlToUint8Array } from './pdf-builder';

/**
 * Triggers clean browser file download with asynchronous delayed ObjectURL revocation
 */
export function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(blob)
      : 'blob:mock-download';
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function' && url !== 'blob:mock-download') {
        URL.revokeObjectURL(url);
      }
    } catch {}
  }, 2000);
}

/**
 * Resolves a live HTML5 / WebGL canvas from an ID or CSS selector,
 * unwrapping React Three Fiber container <div> elements if necessary.
 */
export function resolveLiveCanvasElement(idOrSelector: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  let el: Element | null = null;
  if (idOrSelector.startsWith('#') || idOrSelector.startsWith('.')) {
    el = document.querySelector(idOrSelector);
  } else {
    el = document.getElementById(idOrSelector) || document.querySelector(idOrSelector);
  }

  if (!el) return null;

  const canvas = el instanceof HTMLCanvasElement ? el : el.querySelector('canvas');
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    return canvas;
  }
  return null;
}

/**
 * Composite a canvas onto a solid background color to eliminate alpha-transparency
 * turning black in JPEG or PDF rendering.
 */
export function canvasToCompositeCanvas(
  sourceCanvas: HTMLCanvasElement,
  bgColor: string = '#070D18'
): HTMLCanvasElement {
  const comp = document.createElement('canvas');
  comp.width = sourceCanvas.width;
  comp.height = sourceCanvas.height;
  const ctx = comp.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, comp.width, comp.height);
    ctx.drawImage(sourceCanvas, 0, 0);
  }
  return comp;
}

/**
 * Renders an SVG string onto an HTML5 Canvas using UTF-8 Blob and Image.
 * Safe from window.btoa Unicode crashes on technical symbols like 'Ω' or 'µ'.
 */
export function renderSvgStringToCanvas(
  svgString: string,
  scale = 2,
  bgColor = '#070E1A'
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    try {
      let cleanSvg = svgString;
      if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Extract width & height or viewBox
      let width = 1200;
      let height = 800;

      const viewBoxMatch = cleanSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/);
      if (viewBoxMatch) {
        width = parseFloat(viewBoxMatch[3]);
        height = parseFloat(viewBoxMatch[4]);
      } else {
        const widthMatch = cleanSvg.match(/width=["']([-\d.]+)px?["']/);
        const heightMatch = cleanSvg.match(/height=["']([-\d.]+)px?["']/);
        if (widthMatch) width = parseFloat(widthMatch[1]);
        if (heightMatch) height = parseFloat(heightMatch[1]);
      }

      // Clamp dimensions to browser max texture safety limit
      width = Math.min(Math.max(width, 100), 4096);
      height = Math.min(Math.max(height, 100), 4096);

      const targetW = Math.min(Math.round(width * scale), 4096);
      const targetH = Math.min(Math.round(height * scale), 4096);

      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Could not get 2D canvas context'));
            return;
          }

          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          URL.revokeObjectURL(url);
          resolve(canvas);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load SVG into Image for canvas rasterization: ${e}`));
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// High-Level Export Helpers
// ---------------------------------------------------------------------------

export function exportSvgStringAsSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownloadBlob(blob, filename.endsWith('.svg') ? filename : `${filename}.svg`);
}

export async function exportSvgStringAsPng(
  svgString: string,
  filename: string,
  scale = 2,
  bgColor = '#070E1A'
): Promise<void> {
  const canvas = await renderSvgStringToCanvas(svgString, scale, bgColor);
  canvas.toBlob((blob) => {
    if (blob) {
      triggerDownloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
    }
  }, 'image/png');
}

export async function exportSvgStringAsJpg(
  svgString: string,
  filename: string,
  scale = 2,
  bgColor = '#070E1A',
  quality = 0.95
): Promise<void> {
  const canvas = await renderSvgStringToCanvas(svgString, scale, bgColor);
  canvas.toBlob((blob) => {
    if (blob) {
      triggerDownloadBlob(blob, filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`);
    }
  }, 'image/jpeg', quality);
}

export async function exportSvgStringAsPdf(
  svgString: string,
  filename: string,
  meta: { title: string; viewLabel: string; subtitle?: string },
  scale = 2,
  bgColor = '#070E1A'
): Promise<void> {
  const canvas = await renderSvgStringToCanvas(svgString, scale, bgColor);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpegBytes = dataUrlToUint8Array(dataUrl);
  const pdfBlob = buildCircuitPdfBlob(jpegBytes, canvas.width, canvas.height, meta);
  triggerDownloadBlob(pdfBlob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export function exportCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (blob) {
      triggerDownloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
    }
  }, 'image/png');
}

export function exportCanvasAsJpg(
  canvas: HTMLCanvasElement,
  filename: string,
  bgColor = '#070D18',
  quality = 0.95
): void {
  const comp = canvasToCompositeCanvas(canvas, bgColor);
  comp.toBlob((blob) => {
    if (blob) {
      triggerDownloadBlob(blob, filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`);
    }
  }, 'image/jpeg', quality);
}

export function exportCanvasAsPdf(
  canvas: HTMLCanvasElement,
  filename: string,
  meta: { title: string; viewLabel: string; subtitle?: string },
  bgColor = '#070D18'
): void {
  const comp = canvasToCompositeCanvas(canvas, bgColor);
  const dataUrl = comp.toDataURL('image/jpeg', 0.95);
  const jpegBytes = dataUrlToUint8Array(dataUrl);
  const pdfBlob = buildCircuitPdfBlob(jpegBytes, comp.width, comp.height, meta);
  triggerDownloadBlob(pdfBlob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
