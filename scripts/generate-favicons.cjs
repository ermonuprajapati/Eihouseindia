const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Creates a standard Windows ICO file containing uncompressed 32-bit DIB bitmaps
 * for maximum compatibility with all browsers (Chrome, Edge, Firefox, Safari)
 * and Windows desktop shells without relying on PNG-in-ICO decompression.
 */
function createDibIco(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Resource type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of icon frames

  let offset = 6 + count * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const f of frames) {
    const { width, height, rawRgba } = f;

    // BITMAPINFOHEADER (40 bytes)
    const bih = Buffer.alloc(40);
    bih.writeUInt32LE(40, 0); // Header size
    bih.writeInt32LE(width, 4); // Width
    bih.writeInt32LE(height * 2, 8); // Height is DOUBLED in ICO to account for XOR + AND masks
    bih.writeUInt16LE(1, 12); // Color planes
    bih.writeUInt16LE(32, 14); // 32 bits per pixel (BGRA)
    bih.writeUInt32LE(0, 16); // Compression: BI_RGB (uncompressed)
    bih.writeUInt32LE(width * height * 4, 20); // Image data size
    bih.writeInt32LE(0, 24); // Horizontal resolution
    bih.writeInt32LE(0, 28); // Vertical resolution
    bih.writeUInt32LE(0, 32); // Palette colors
    bih.writeUInt32LE(0, 36); // Important colors

    // XOR bitmap data: bottom-up BGRA
    const xorData = Buffer.alloc(width * height * 4);
    // 1-bit AND mask: bottom-up 1 bit per pixel, padded to 32-bit DWORD boundary
    const andRowBytes = Math.ceil(width / 32) * 4;
    const andMask = Buffer.alloc(andRowBytes * height, 0);

    for (let y = 0; y < height; y++) {
      const srcRow = height - 1 - y; // Bottom-up row
      for (let x = 0; x < width; x++) {
        const srcIdx = (srcRow * width + x) * 4;
        const dstIdx = (y * width + x) * 4;
        const r = rawRgba[srcIdx + 0];
        const g = rawRgba[srcIdx + 1];
        const b = rawRgba[srcIdx + 2];
        const a = rawRgba[srcIdx + 3];

        xorData[dstIdx + 0] = b; // Blue
        xorData[dstIdx + 1] = g; // Green
        xorData[dstIdx + 2] = r; // Red
        xorData[dstIdx + 3] = a; // Alpha

        if (a === 0) {
          const byteIdx = y * andRowBytes + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          andMask[byteIdx] |= (1 << bitIdx);
        }
      }
    }

    const imageData = Buffer.concat([bih, xorData, andMask]);
    imageBuffers.push(imageData);

    // Directory entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0); // Width
    entry.writeUInt8(height >= 256 ? 0 : height, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(imageData.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // File offset
    dirEntries.push(entry);

    offset += imageData.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const logoPath = path.join(rootDir, 'public', 'images', 'logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }

  console.log('Loading logo from:', logoPath);

  // 1. Trim transparency to extract exact bounding box
  const trimmedBuffer = await sharp(logoPath).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log('Trimmed dimensions:', trimmedMeta.width, 'x', trimmedMeta.height);

  // 2. Put trimmed logo onto a balanced square canvas with 6% optical padding
  const maxDim = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padding = Math.round(maxDim * 0.06);

  const centeredMaster = await sharp(trimmedBuffer)
    .resize(maxDim, maxDim, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  console.log('Created centered master 512x512');

  // 3. Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'favicon.png', size: 512 },
  ];

  for (const s of sizes) {
    const outBuf = await sharp(centeredMaster)
      .resize(s.size, s.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const destPath = path.join(rootDir, 'public', s.name);
    fs.writeFileSync(destPath, outBuf);
    console.log(`Generated public/${s.name} (${s.size}x${s.size})`);
  }

  // 4. Maskable icons for PWA with brand navy background (#0B1528)
  const maskablePadding = Math.round(512 * 0.18);
  const maskableMaster = await sharp(centeredMaster)
    .resize(512 - maskablePadding * 2, 512 - maskablePadding * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: maskablePadding,
      bottom: maskablePadding,
      left: maskablePadding,
      right: maskablePadding,
      background: { r: 11, g: 21, b: 40, alpha: 1 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(
    path.join(rootDir, 'public', 'icon-maskable-192x192.png'),
    await sharp(maskableMaster).resize(192, 192).png().toBuffer()
  );
  fs.writeFileSync(
    path.join(rootDir, 'public', 'icon-maskable-512x512.png'),
    await sharp(maskableMaster).resize(512, 512).png().toBuffer()
  );
  console.log('Generated maskable icons with brand navy background');

  // 5. Generate standard uncompressed DIB ICO file (16, 32, 48px)
  const icoSizes = [16, 32, 48];
  const frames = [];

  for (const size of icoSizes) {
    const rawResult = await sharp(centeredMaster)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    frames.push({ width: size, height: size, rawRgba: rawResult.data });
  }

  const icoBuffer = createDibIco(frames);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), icoBuffer);
  console.log('Generated standard DIB favicon.ico in public/ and src/app/ (sizes: 16, 32, 48)');

  // 6. Generate src/app/icon.png & src/app/apple-icon.png
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.png'), centeredMaster);
  const appleTouchBuf = await sharp(centeredMaster).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'apple-icon.png'), appleTouchBuf);
  console.log('Updated src/app/icon.png and src/app/apple-icon.png');

  console.log('ALL FAVICONS & ICONS SUCCESSFULLY REGENERATED FROM LOGO.PNG!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
