/**
 * Client-side image compression and resizing utility.
 * Optimizes images to fit cleanly within Firestore document limits (< 800 KB)
 * and reduces user upload bandwidth.
 */

export interface OptimizedImageResult {
  base64: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export async function compressAndOptimizeImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<OptimizedImageResult> {
  // If not in a browser environment, return raw file as base64
  if (typeof window === 'undefined') {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      base64,
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      fileName: file.name,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to reading file directly
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || res;
          resolve({
            base64: base64Data,
            mimeType: file.type,
            sizeBytes: file.size,
            fileName: file.name,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // Fill white background for transparent PNG/WebP conversions
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for optimal compression ratio, fallback to JPEG
      const outputMime = 'image/webp';
      let dataUrl = canvas.toDataURL(outputMime, quality);

      // If browser doesn't support WebP export, canvas returns image/png
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      const [header, base64Data] = dataUrl.split(',');
      const actualMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const sizeBytes = Math.round((base64Data.length * 3) / 4);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const ext = actualMime === 'image/webp' ? 'webp' : 'jpg';

      resolve({
        base64: base64Data,
        mimeType: actualMime,
        sizeBytes,
        fileName: `${baseName}.${ext}`,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization.'));
    };

    img.src = objectUrl;
  });
}
