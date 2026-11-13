import { describe, it, expect } from 'vitest';
import {
  calculateReadingStats,
  canTransitionPostStatus,
  postEditorSchema,
  sanitizeTiptapDocument,
  sanitizeUrl,
  shouldInvalidateApprovalOnAuthorEdit,
  slugify,
} from '@/lib/validation';

describe('Validation, Sanitization & Publishing Workflow', () => {
  it('generates clean SEO slugs', () => {
    expect(slugify('Designing SiC MOSFET Gate Drivers (2026)!')).toBe(
      'designing-sic-mosfet-gate-drivers-2026'
    );
  });

  it('blocks dangerous javascript: and data: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeUrl('https://eihouseindia.in/articles')).toBe('https://eihouseindia.in/articles');
    expect(sanitizeUrl('/images/hero-semiconductor.jpg')).toBe('/images/hero-semiconductor.jpg');
  });

  it('strips disallowed Tiptap nodes and unsafe link attributes', () => {
    const dirty = {
      type: 'doc',
      content: [
        { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Malicious link',
              marks: [{ type: 'link', attrs: { href: 'javascript:evil()' } }],
            },
            {
              type: 'text',
              text: 'Safe link',
              marks: [{ type: 'link', attrs: { href: 'https://eihouseindia.in' } }],
            },
          ],
        },
      ],
    };

    const clean = sanitizeTiptapDocument(dirty);
    expect(clean.content).toHaveLength(1);
    expect(clean.content[0].type).toBe('paragraph');
    const children = clean.content[0].content || [];
    expect(children[0].marks).toBeUndefined();
    expect(children[1].marks?.[0].type).toBe('link');
  });

  it('calculates accurate word count and reading time', () => {
    const words = Array.from({ length: 440 }, () => 'semiconductor').join(' ');
    const stats = calculateReadingStats({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: words }] }],
    });
    expect(stats.wordCount).toBe(440);
    expect(stats.readingTime).toBe(2);
  });

  it('prevents regular USER from directly publishing or archiving', () => {
    expect(canTransitionPostStatus('DRAFT', 'PENDING', 'USER')).toBe(true);
    expect(canTransitionPostStatus('DRAFT', 'PUBLISHED', 'USER')).toBe(false);
    expect(canTransitionPostStatus('PENDING', 'PUBLISHED', 'USER')).toBe(false);
    expect(canTransitionPostStatus('PENDING', 'PUBLISHED', 'EDITOR')).toBe(true);
    expect(canTransitionPostStatus('PENDING', 'PUBLISHED', 'ADMIN')).toBe(true);
  });

  it('invalidates prior approval when an author edits a published or pending article', () => {
    expect(shouldInvalidateApprovalOnAuthorEdit('PUBLISHED')).toBe(true);
    expect(shouldInvalidateApprovalOnAuthorEdit('PENDING')).toBe(true);
    expect(shouldInvalidateApprovalOnAuthorEdit('DRAFT')).toBe(false);
  });

  it('validates post editor payloads with Zod', () => {
    const result = postEditorSchema.safeParse({
      title: 'STM32 DMA UART Architecture Guide',
      slug: 'stm32-dma-uart-architecture-guide',
      excerpt: 'How to configure circular DMA buffers on STM32 microcontrollers without CPU stalls.',
      categoryId: 'embedded-systems',
      tags: ['STM32', 'DMA'],
      content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    });
    expect(result.success).toBe(true);
  });
});
