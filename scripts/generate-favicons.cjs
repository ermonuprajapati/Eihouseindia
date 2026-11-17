const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Creates a standard Windows ICO file containing uncompressed 32-bit DIB bitmaps
 * for maximum compatibility with all browsers (Chrome, Edge, Firefox, Safari)
 * and Windows desktop shells.
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

        if (a < 128) {
          xorData[dstIdx + 0] = 0;
          xorData[dstIdx + 1] = 0;
          xorData[dstIdx + 2] = 0;
          xorData[dstIdx + 3] = 0;
          const byteIdx = y * andRowBytes + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          andMask[byteIdx] |= (1 << bitIdx);
        } else {
          // Composite semi-transparent edge pixels over white so ICO never has dark fringes
          const alphaNorm = a / 255;
          const outR = Math.round(r * alphaNorm + 255 * (1 - alphaNorm));
          const outG = Math.round(g * alphaNorm + 255 * (1 - alphaNorm));
          const outB = Math.round(b * alphaNorm + 255 * (1 - alphaNorm));
          xorData[dstIdx + 0] = outB; // Blue
          xorData[dstIdx + 1] = outG; // Green
          xorData[dstIdx + 2] = outR; // Red
          xorData[dstIdx + 3] = 255; // Solid alpha inside the squircle
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

  // 1. Clean low-alpha background noise (< 45 alpha) and find exact true bounding box
  const { data: rawLogo, info: logoInfo } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleanedRgba = Buffer.from(rawLogo);
  let minX = logoInfo.width;
  let minY = logoInfo.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < logoInfo.height; y++) {
    for (let x = 0; x < logoInfo.width; x++) {
      const idx = (y * logoInfo.width + x) * 4;
      const a = cleanedRgba[idx + 3];
      if (a < 45) {
        cleanedRgba[idx + 0] = 0;
        cleanedRgba[idx + 1] = 0;
        cleanedRgba[idx + 2] = 0;
        cleanedRgba[idx + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  console.log(`Cleaned noise and cropped to true bounds: ${cropWidth}x${cropHeight} (from ${minX},${minY})`);

  const croppedLogoPng = await sharp(cleanedRgba, {
    raw: { width: logoInfo.width, height: logoInfo.height, channels: 4 },
  })
    .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  // 2. Create high-contrast 512x512 rounded squircle badge master
  // Pure white rounded squircle background ensures 100% visibility on both Dark Mode and Light Mode browser tabs
  const badgeSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="512" height="512" rx="108" ry="108" fill="#FFFFFF"/>
    </svg>
  `);

  const innerLogoSize = 444; // ~87% of 512x512 inside the squircle for maximum legibility at 16x16 & 32x32
  const resizedLogo = await sharp(croppedLogoPng)
    .resize(innerLogoSize, innerLogoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .modulate({ saturation: 1.12 })
    .sharpen()
    .png()
    .toBuffer();

  const centeredMaster = await sharp(badgeSvg)
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer();

  console.log('Created high-contrast 512x512 squircle favicon master');

  // 3. Generate PNG sizes in public/
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'icon-512.png', size: 512 },
    { name: 'favicon.png', size: 512 },
  ];

  for (const s of sizes) {
    let pipeline = sharp(centeredMaster).resize(s.size, s.size, {
      fit: 'contain',
      kernel: sharp.kernel.lanczos3,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    });
    if (s.size <= 48) {
      pipeline = pipeline.sharpen({ sigma: 0.8 });
    }
    const { data: rawData, info: rawInfo } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Un-premultiply dark SVG corner fringe so rounded corners stay pure white + alpha
    const fixedBuf = Buffer.from(rawData);
    for (let i = 0; i < fixedBuf.length; i += 4) {
      const a = fixedBuf[i + 3];
      if (a === 0) {
        fixedBuf[i] = 255;
        fixedBuf[i + 1] = 255;
        fixedBuf[i + 2] = 255;
      } else if (a < 255 && fixedBuf[i] === fixedBuf[i + 1] && fixedBuf[i + 1] === fixedBuf[i + 2]) {
        fixedBuf[i] = 255;
        fixedBuf[i + 1] = 255;
        fixedBuf[i + 2] = 255;
      }
    }

    const outBuf = await sharp(fixedBuf, {
      raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 },
    })
      .png()
      .toBuffer();
    const destPath = path.join(rootDir, 'public', s.name);
    fs.writeFileSync(destPath, outBuf);
    console.log(`Generated public/${s.name} (${s.size}x${s.size})`);
  }

  // 4. Maskable icons for PWA (full-bleed white background with safe-zone centered logo)
  const maskableLogoSize = 370;
  const maskableLogo = await sharp(croppedLogoPng)
    .resize(maskableLogoSize, maskableLogoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .modulate({ saturation: 1.12 })
    .png()
    .toBuffer();

  const maskableMaster = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: maskableLogo, gravity: 'center' }])
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
  console.log('Generated clean maskable PWA icons');

  // 5. Generate standard uncompressed DIB ICO file (48, 32, 16px — 48px first so browsers/Next.js see high-res)
  const icoSizes = [48, 32, 16];
  const frames = [];

  for (const size of icoSizes) {
    const rawResult = await sharp(centeredMaster)
      .resize(size, size, {
        fit: 'contain',
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .sharpen({ sigma: 0.8 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    frames.push({ width: size, height: size, rawRgba: rawResult.data });
  }

  const icoBuffer = createDibIco(frames);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), icoBuffer);
  console.log('Generated standard DIB favicon.ico in public/ and src/app/ (sizes: 48, 32, 16)');

  // 6. Generate src/app/icon.png & src/app/apple-icon.png
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.png'), centeredMaster);
  const appleTouchBuf = await sharp(maskableMaster).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'apple-icon.png'), appleTouchBuf);
  fs.writeFileSync(path.join(rootDir, 'public', 'apple-touch-icon.png'), appleTouchBuf);
  console.log('Updated src/app/icon.png and src/app/apple-icon.png');

  console.log('ALL FAVICONS & ICONS SUCCESSFULLY REGENERATED!');
}

generate().catch((err) => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
