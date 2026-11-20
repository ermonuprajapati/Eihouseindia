import { EngineeringProject } from '../types';

/**
 * Universal browser file download helper using Blob and URL.createObjectURL
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Create versioned EI House Project Schema (.eihouse.json)
 */
export function createEihouseProjectPayload(project: EngineeringProject) {
  return {
    schemaVersion: '1.0.0',
    generator: 'EI House India Virtual Lab',
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
 * Parse and validate either an .eihouse.json payload or legacy raw EngineeringProject
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
 * Exports an HTML5 Canvas (including WebGL Three.js canvas with preserveDrawingBuffer) as PNG
 */
export function exportCanvasToPng(canvas: HTMLCanvasElement, fileName: string): boolean {
  try {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, fileName);
      }
    }, 'image/png');
    return true;
  } catch (err) {
    console.warn('Could not export canvas to PNG:', err);
    return false;
  }
}

/**
 * Exports an SVG element to high-res PNG using offscreen Canvas
 */
export function exportSvgElementToPng(
  svgEl: SVGElement,
  fileName: string,
  scale = 2
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const serializer = new XMLSerializer();
      let svgStr = serializer.serializeToString(svgEl);

      // Ensure proper xmlns attribute
      if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const bbox = svgEl.getBoundingClientRect();
      const width = Math.max(bbox.width, 800);
      const height = Math.max(bbox.height, 600);

      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.fillStyle = '#070D18';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                downloadBlob(pngBlob, fileName);
                resolve(true);
              } else {
                resolve(false);
              }
            }, 'image/png');
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      img.src = url;
    } catch {
      resolve(false);
    }
  });
}
