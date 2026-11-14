import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/config/firebase-admin';
import type { NotificationItem, Post, PostStatus } from '@/types';

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  return toIso(value);
}

function mapDocToPost(id: string, data: Record<string, unknown>): Post {
  return {
    id,
    authorId: String(data.authorId || ''),
    authorName: String(data.authorName || 'Contributor'),
    authorUsername: String(data.authorUsername || 'contributor'),
    authorAvatar: String(data.authorAvatar || ''),
    title: String(data.title || ''),
    slug: String(data.slug || ''),
    excerpt: String(data.excerpt || ''),
    content: (data.content as Post['content']) || { type: 'doc', content: [] },
    coverImage: String(data.coverImage || ''),
    categoryId: String(data.categoryId || ''),
    categoryName: String(data.categoryName || ''),
    categorySlug: String(data.categorySlug || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: (data.status as PostStatus) || 'DRAFT',
    metaTitle: String(data.metaTitle || ''),
    metaDescription: String(data.metaDescription || ''),
    canonicalUrl: String(data.canonicalUrl || ''),
    locale: String(data.locale || 'en'),
    readingTime: typeof data.readingTime === 'number' ? data.readingTime : 1,
    wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
    featured: Boolean(data.featured),
    viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
    reviewerId: data.reviewerId ? String(data.reviewerId) : null,
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt || data.createdAt),
    submittedAt: toIsoOrNull(data.submittedAt),
    publishedAt: toIsoOrNull(data.publishedAt),
  };
}

export async function GET(request: Request) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: 'Firebase Admin SDK is not configured on the server.' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase().trim();

    // Link Pawan Prajapati's accounts so articles are visible under both logins
    const isPawan =
      email === 'diplomawithbtech@gmail.com' ||
      email === 'pavnkumarprajapati2000@gmail.com';

    const authorIds = isPawan
      ? ['mat5qVV4pdOeYOs3RDRApQuHLfL2', 'NibyHXBy1iUtMNBxxbkpb69TFE32', decoded.uid]
      : [decoded.uid];

    // Fetch posts for target author UIDs
    const postMap = new Map<string, Post>();
    for (const uid of authorIds) {
      const snap = await adminDb.collection('posts').where('authorId', '==', uid).get();
      snap.forEach((d) => {
        postMap.set(d.id, mapDocToPost(d.id, d.data() as Record<string, unknown>));
      });
    }

    const posts = Array.from(postMap.values()).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    // Fetch notifications for target author UIDs
    const notifMap = new Map<string, NotificationItem>();
    for (const uid of authorIds) {
      const snap = await adminDb.collection('notifications').where('userId', '==', uid).get();
      snap.forEach((d) => {
        const data = d.data();
        notifMap.set(d.id, {
          id: d.id,
          userId: String(data.userId || uid),
          title: String(data.title || ''),
          message: String(data.message || ''),
          type: (data.type as NotificationItem['type']) || 'SYSTEM',
          postId: data.postId ? String(data.postId) : undefined,
          read: Boolean(data.read),
          createdAt: toIso(data.createdAt),
        });
      });
    }

    const notifications = Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      ok: true,
      authorEmail: email,
      posts,
      notifications,
    });
  } catch (error) {
    console.error('Author workspace API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve workspace data' },
      { status: 500 }
    );
  }
}
