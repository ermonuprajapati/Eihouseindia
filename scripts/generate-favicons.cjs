const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const entries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0); // Width
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset from start of file
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(item => item.buffer)]);
}

async function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const logoPath = path.join(rootDir, 'public', 'images', 'logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }

  console.log('Loading logo from:', logoPath);

  // 1. Trim transparency to find exact logo mark
  const trimmedBuffer = await sharp(logoPath).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log('Trimmed dimensions:', trimmedMeta.width, 'x', trimmedMeta.height);

  // 2. Put trimmed logo onto a balanced square canvas with 5% padding
  const maxDim = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padding = Math.round(maxDim * 0.06);
  const targetCanvasSize = maxDim + padding * 2;

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

  // Also maskable icons with 18% safe-zone padding
  const maskablePadding = Math.round(512 * 0.18);
  const maskableMaster = await sharp(centeredMaster)
    .resize(512 - maskablePadding * 2, 512 - maskablePadding * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: maskablePadding,
      bottom: maskablePadding,
      left: maskablePadding,
      right: maskablePadding,
      background: { r: 11, g: 21, b: 40, alpha: 1 } // #0B1528 navy brand background for maskable PWA
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

  // 4. Generate multi-resolution ICO file
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoBuffers = [];

  for (const size of icoSizes) {
    const buf = await sharp(centeredMaster)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    icoBuffers.push({ width: size, height: size, buffer: buf });
  }

  const icoFileBuffer = createIco(icoBuffers);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoFileBuffer);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), icoFileBuffer);
  console.log('Generated multi-resolution favicon.ico in public/ and src/app/ (sizes: 16, 32, 48, 64, 128, 256)');

  // 5. Generate src/app/icon.png & src/app/apple-icon.png
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.png'), centeredMaster);
  const appleTouchBuf = await sharp(centeredMaster).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'apple-icon.png'), appleTouchBuf);
  console.log('Updated src/app/icon.png and src/app/apple-icon.png');

  console.log('ALL FAVICONS & ICONS SUCCESSFULLY GENERATED FROM LOGO.PNG!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
