/**
 * Real Standalone Schematic Exports (SVG, PNG, Print/PDF)
 */

export function exportSchematicSvg(svgElement: SVGSVGElement | null, fileName = 'schematic-capture.svg') {
  if (!svgElement) return;

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add XML declaration and SVG namespace if missing
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+xmlns\:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : 'blob:test';
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  if (typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
}

export function exportSchematicPng(
  svgElement: SVGSVGElement | null,
  fileName = 'schematic-capture.png',
  scale = 2
) {
  if (!svgElement) return;

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : 'blob:test';

  const img = new Image();
  img.onload = () => {
    const width = (svgElement.clientWidth || 1400) * scale;
    const height = (svgElement.clientHeight || 950) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#050A14';
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(img, 0, 0, width, height);
    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(pngBlob) : 'blob:test-png';
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(pngUrl);
      }
    }, 'image/png');
  };

  img.src = url;
}

export function printSchematicSheet() {
  window.print();
}
