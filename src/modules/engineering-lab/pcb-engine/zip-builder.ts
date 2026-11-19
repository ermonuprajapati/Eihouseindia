/**
 * Pure TypeScript Client-Side ZIP Archive Generator
 * Standard PKZIP 2.0 format (STORE / uncompressed with CRC-32)
 * Compatible with Windows Explorer, macOS Archive Utility, Linux unzip, JLCPCB, PCBWay
 */

export class ZipBuilder {
  private files: { name: string; data: Uint8Array; crc32: number }[] = [];

  /**
   * Calculate standard IEEE 802.3 CRC-32 checksum
   */
  public static crc32(data: Uint8Array): number {
    let crc = 0 ^ -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ ZipBuilder.crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  private static crcTable: number[] = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  /**
   * Add a text file or binary file to the ZIP archive
   */
  public addFile(name: string, content: string | Uint8Array): void {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const crc = ZipBuilder.crc32(data);
    this.files.push({ name, data, crc32: crc });
  }

  /**
   * Generate the binary ZIP archive Blob
   */
  public generateBlob(): Blob {
    const chunks: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    const now = new Date();
    const dosTime =
      ((now.getHours() & 0x1f) << 11) |
      ((now.getMinutes() & 0x3f) << 5) |
      Math.floor(now.getSeconds() / 2);
    const dosDate =
      (((now.getFullYear() - 1980) & 0x7f) << 9) |
      (((now.getMonth() + 1) & 0xf) << 5) |
      (now.getDate() & 0x1f);

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(localHeader.buffer);

      // Local file header signature: 0x04034b50
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true); // Version needed to extract: 2.0
      view.setUint16(6, 0, true); // General purpose bit flag
      view.setUint16(8, 0, true); // Compression method: 0 = Store (no compression)
      view.setUint16(10, dosTime, true);
      view.setUint16(12, dosDate, true);
      view.setUint32(14, file.crc32, true);
      view.setUint32(18, file.data.length, true); // Compressed size
      view.setUint32(22, file.data.length, true); // Uncompressed size
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true); // Extra field length
      localHeader.set(nameBytes, 30);

      chunks.push(localHeader);
      chunks.push(file.data);

      // Central directory header: 0x02014b50
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdHeader.buffer);
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true); // Version made by: 2.0
      cdView.setUint16(6, 20, true); // Version needed: 2.0
      cdView.setUint16(8, 0, true); // Flag
      cdView.setUint16(10, 0, true); // Compression: Store
      cdView.setUint16(12, dosTime, true);
      cdView.setUint16(14, dosDate, true);
      cdView.setUint32(16, file.crc32, true);
      cdView.setUint32(20, file.data.length, true);
      cdView.setUint32(24, file.data.length, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true); // Extra field length
      cdView.setUint16(32, 0, true); // Comment length
      cdView.setUint16(34, 0, true); // Disk start
      cdView.setUint16(36, 0, true); // Internal attributes
      cdView.setUint32(38, 0, true); // External attributes
      cdView.setUint32(42, offset, true); // Relative offset of local header
      cdHeader.set(nameBytes, 46);

      centralDirectory.push(cdHeader);
      offset += localHeader.length + file.data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDirectory) {
      chunks.push(cd);
      cdSize += cd.length;
    }

    // End of Central Directory Record: 0x06054b50
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Disk with central directory
    eocdView.setUint16(8, this.files.length, true); // Total entries on this disk
    eocdView.setUint16(10, this.files.length, true); // Total entries overall
    eocdView.setUint32(12, cdSize, true); // Size of central directory
    eocdView.setUint32(16, cdOffset, true); // Offset of start of central directory
    eocdView.setUint16(20, 0, true); // Comment length
    chunks.push(eocd);

    return new Blob(chunks as unknown as BlobPart[], { type: 'application/zip' });
  }

  /**
   * Helper to trigger immediate browser download
   */
  public download(filename: string): void {
    const blob = this.generateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
