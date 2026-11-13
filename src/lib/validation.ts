import { z } from 'zod';
import type { TiptapDocument, TiptapNode, PostStatus, UserRole } from '@/types';

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'image',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);

const ALLOWED_MARK_TYPES = new Set(['bold', 'italic', 'underline', 'code', 'link']);

export function sanitizeTiptapNode(node: TiptapNode): TiptapNode | null {
  if (!node || typeof node !== 'object' || !ALLOWED_NODE_TYPES.has(node.type)) {
    return null;
  }

  const sanitized: TiptapNode = { type: node.type };

  if (typeof node.text === 'string') {
    sanitized.text = node.text;
  }

  if (node.attrs && typeof node.attrs === 'object') {
    const cleanAttrs: Record<string, unknown> = {};
    if (node.type === 'heading') {
      const level = Number(node.attrs.level);
      cleanAttrs.level = level >= 1 && level <= 4 ? level : 2;
    } else if (node.type === 'image') {
      const safeSrc = typeof node.attrs.src === 'string' ? sanitizeUrl(node.attrs.src) : null;
      if (!safeSrc) return null;
      cleanAttrs.src = safeSrc;
      if (typeof node.attrs.alt === 'string') {
        cleanAttrs.alt = node.attrs.alt.slice(0, 300);
      }
      if (typeof node.attrs.title === 'string') {
        cleanAttrs.title = node.attrs.title.slice(0, 300);
      }
    } else if (node.type === 'codeBlock' && typeof node.attrs.language === 'string') {
      cleanAttrs.language = node.attrs.language.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    } else if (node.type === 'tableCell' || node.type === 'tableHeader') {
      if (typeof node.attrs.colspan === 'number') cleanAttrs.colspan = Math.min(12, Math.max(1, node.attrs.colspan));
      if (typeof node.attrs.rowspan === 'number') cleanAttrs.rowspan = Math.min(20, Math.max(1, node.attrs.rowspan));
    }
    if (Object.keys(cleanAttrs).length > 0) {
      sanitized.attrs = cleanAttrs;
    }
  }

  if (Array.isArray(node.marks)) {
    const cleanMarks = node.marks
      .filter((mark) => mark && ALLOWED_MARK_TYPES.has(mark.type))
      .map((mark) => {
        if (mark.type === 'link') {
          const href = typeof mark.attrs?.href === 'string' ? sanitizeUrl(mark.attrs.href) : null;
          if (!href) return null;
          return {
            type: 'link',
            attrs: {
              href,
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            },
          };
        }
        return { type: mark.type };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (cleanMarks.length > 0) {
      sanitized.marks = cleanMarks;
    }
  }

  if (Array.isArray(node.content)) {
    const cleanChildren = node.content
      .map(sanitizeTiptapNode)
      .filter((n): n is TiptapNode => n !== null);
    if (cleanChildren.length > 0) {
      sanitized.content = cleanChildren;
    }
  }

  return sanitized;
}

export function sanitizeTiptapDocument(input: unknown): TiptapDocument {
  const fallback: TiptapDocument = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };

  if (!input || typeof input !== 'object') return fallback;
  const candidate = input as TiptapNode;
  if (candidate.type !== 'doc' || !Array.isArray(candidate.content)) return fallback;

  const cleanContent = candidate.content
    .map(sanitizeTiptapNode)
    .filter((n): n is TiptapNode => n !== null);

  return {
    type: 'doc',
    content: cleanContent.length > 0 ? cleanContent : fallback.content,
  };
}

export function extractPlainTextFromTiptap(doc: TiptapDocument): string {
  const chunks: string[] = [];
  const walk = (node: TiptapNode) => {
    if (typeof node.text === 'string') {
      chunks.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
      if (['paragraph', 'heading', 'blockquote', 'listItem', 'codeBlock'].includes(node.type)) {
        chunks.push(' ');
      }
    }
  };
  walk(doc);
  return chunks.join('').replace(/\s+/g, ' ').trim();
}

export function calculateReadingStats(doc: TiptapDocument): {
  wordCount: number;
  readingTime: number;
} {
  const text = extractPlainTextFromTiptap(doc);
  if (!text) return { wordCount: 0, readingTime: 1 };
  const words = text.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 220));
  return { wordCount: words, readingTime };
}

export const tiptapDocSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).min(1, 'Article body cannot be empty'),
});

export const postEditorSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(160, 'Title cannot exceed 160 characters'),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters')
    .max(140, 'Slug cannot exceed 140 characters')
    .regex(SLUG_PATTERN, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  excerpt: z
    .string()
    .trim()
    .min(20, 'Excerpt must be at least 20 characters')
    .max(400, 'Excerpt cannot exceed 400 characters'),
  coverImage: z
    .string()
    .trim()
    .max(1000)
    .refine((val) => val === '' || sanitizeUrl(val) !== null, 'Cover image must be a valid http(s) or relative path')
    .optional()
    .default(''),
  categoryId: z.string().trim().min(1, 'Please select a category').max(128).regex(ID_PATTERN),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
  metaTitle: z.string().trim().max(120, 'SEO title must be 120 characters or less').optional().default(''),
  metaDescription: z.string().trim().max(200, 'SEO description must be 200 characters or less').optional().default(''),
  content: tiptapDocSchema,
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, 'Username must be 3-30 lowercase characters, numbers, or underscores'),
  bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').default(''),
  website: z
    .string()
    .trim()
    .max(250)
    .refine((v) => v === '' || sanitizeUrl(v) !== null, 'Website must be a valid URL')
    .default(''),
  avatar: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === '' || sanitizeUrl(v) !== null, 'Avatar URL must be valid')
    .default(''),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required').max(80),
  slug: z.string().trim().min(2).max(80).regex(SLUG_PATTERN, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(300),
  order: z.number().int().min(1).max(100),
});

export const commentSchema = z.object({
  postId: z.string().trim().min(1).max(128).regex(ID_PATTERN),
  content: z.string().trim().min(3, 'Comment is too short').max(2000, 'Comment cannot exceed 2000 characters'),
});

export const reportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.string().trim().min(1).max(128).regex(ID_PATTERN),
  reason: z.string().trim().min(10, 'Please describe the issue (at least 10 characters)').max(500),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(160),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Please enter a valid email').max(160),
  subject: z.string().trim().min(4, 'Subject is required').max(150),
  message: z.string().trim().min(20, 'Message must be at least 20 characters').max(3000),
});

export const moderationDecisionSchema = z.object({
  postId: z.string().trim().min(1).max(128).regex(ID_PATTERN),
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'ARCHIVE']),
  reason: z.string().trim().max(500).optional(),
});

export function canTransitionPostStatus(
  from: PostStatus,
  to: PostStatus,
  actorRole: UserRole
): boolean {
  if (actorRole === 'ADMIN') {
    return true;
  }
  if (actorRole === 'EDITOR') {
    if (to === 'PUBLISHED' || to === 'REJECTED' || to === 'DRAFT' || to === 'ARCHIVED') {
      return from === 'PENDING' || from === 'PUBLISHED';
    }
    return false;
  }
  // Author ('USER') transitions: can never directly publish
  if (to === 'PUBLISHED' || to === 'ARCHIVED') {
    return false;
  }
  if (from === 'DRAFT' && (to === 'DRAFT' || to === 'PENDING')) return true;
  if (from === 'PENDING' && to === 'DRAFT') return true;
  if (from === 'REJECTED' && (to === 'DRAFT' || to === 'PENDING')) return true;
  if (from === 'PUBLISHED' && to === 'PENDING') return true; // Editing an approved post requires re-review
  return false;
}

export function shouldInvalidateApprovalOnAuthorEdit(currentStatus: PostStatus): boolean {
  return currentStatus === 'PUBLISHED' || currentStatus === 'PENDING';
}
