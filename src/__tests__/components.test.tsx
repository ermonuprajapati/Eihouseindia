import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { TiptapArticleRenderer } from '@/lib/tiptap-renderer';
import type { Post } from '@/types';

describe('Editorial UI Components', () => {
  const post: Post = {
    id: 'post_1',
    authorId: 'u_1',
    authorName: 'Dr. Kavita Rao',
    authorUsername: 'kavita_rao',
    authorAvatar: '',
    title: 'RISC-V Vector Extensions for Edge Neural Inference',
    slug: 'riscv-vector-extensions-edge-ai',
    excerpt: 'Benchmarking RVV 1.0 matrix kernels on low-power embedded SoCs.',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Vector Pipelines' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'RVV 1.0 decouples vector length from ISA.' }] },
      ],
    },
    coverImage: '/images/embedded-sensors.jpg',
    categoryId: 'artificial-intelligence',
    categoryName: 'Artificial Intelligence',
    categorySlug: 'artificial-intelligence',
    tags: ['RISC-V', 'Edge AI'],
    status: 'PUBLISHED',
    metaTitle: 'RISC-V Vector Extensions',
    metaDescription: 'Benchmarking RVV 1.0',
    canonicalUrl: 'https://eihouseindia.in/blog/riscv-vector-extensions-edge-ai',
    locale: 'en-IN',
    readingTime: 5,
    wordCount: 980,
    featured: false,
    viewCount: 12,
    reviewerId: 'admin_1',
    rejectionReason: null,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    submittedAt: '2026-11-10T00:00:00.000Z',
    publishedAt: '2026-11-10T00:00:00.000Z',
  };

  it('renders ArticleCard with title, category, read time, and author', () => {
    render(<ArticleCard post={post} />);
    expect(screen.getByText('RISC-V Vector Extensions for Edge Neural Inference')).toBeInTheDocument();
    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
    expect(screen.getByText('5 min read')).toBeInTheDocument();
    expect(screen.getByText('Dr. Kavita Rao')).toBeInTheDocument();
  });

  it('renders sanitized TiptapArticleRenderer headings and paragraphs', () => {
    render(<TiptapArticleRenderer document={post.content} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Vector Pipelines' })).toBeInTheDocument();
    expect(screen.getByText('RVV 1.0 decouples vector length from ISA.')).toBeInTheDocument();
  });

  it('renders mathematical formulas and sigma symbols using KaTeX without mangling characters', () => {
    const mathDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The variance formula is $$ \\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^N (x_i - \\mu)^2} $$ and inline symbol $\\sigma$.',
            },
          ],
        },
      ],
    };

    const { container } = render(<TiptapArticleRenderer document={mathDoc} />);
    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(container.querySelector('.block-math')).toBeInTheDocument();
    expect(container.querySelector('.inline-math')).toBeInTheDocument();
  });
});
