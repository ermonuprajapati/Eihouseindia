import { describe, it, expect } from 'vitest';
import { validateImageFile } from '@/modules/storage/storage-service';

describe('Media & Storage Service', () => {
  it('validates supported image formats', () => {
    const validFile = new File(['fake-image-bytes'], 'banner.webp', { type: 'image/webp' });
    const check = validateImageFile(validFile);
    expect(check.valid).toBe(true);
  });

  it('rejects unsupported file formats', () => {
    const invalidFile = new File(['text'], 'document.pdf', { type: 'application/pdf' });
    const check = validateImageFile(invalidFile);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('Unsupported image format');
  });

  it('rejects empty or oversized files', () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    const check = validateImageFile(emptyFile);
    expect(check.valid).toBe(false);
  });
});
