import { cache } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAdminDb } from '@/config/firebase-admin';
import type { QueryDocumentSnapshot, Query as AdminQuery } from 'firebase-admin/firestore';
import { INITIAL_CATEGORIES } from '@/config/categories';
import { SITE_CONFIG } from '@/config/site';
import type { Category, Comment, Post, PublicAuthorProfile, SiteSettings } from '@/types';

interface CacheEntry<T> {
  data: T;
  expires: number;
}
const serverQueryCache = new Map<string, CacheEntry<unknown>>();

function getFromQueryCache<T>(key: string): T | null {
  const entry = serverQueryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    serverQueryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInQueryCache<T>(key: string, data: T, ttlMs = 60_000): void {
  if (serverQueryCache.size > 250) {
    serverQueryCache.clear();
  }
  serverQueryCache.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateServerQueryCache(prefix?: string): void {
  if (!prefix) {
    serverQueryCache.clear();
    return;
  }
  for (const key of serverQueryCache.keys()) {
    if (key.startsWith(prefix)) {
      serverQueryCache.delete(key);
    }
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
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
    status: (data.status as Post['status']) || 'DRAFT',
    metaTitle: String(data.metaTitle || ''),
    metaDescription: String(data.metaDescription || ''),
    canonicalUrl: String(data.canonicalUrl || ''),
    locale: String(data.locale || 'en-IN'),
    readingTime: Number(data.readingTime || 1),
    wordCount: Number(data.wordCount || 0),
    featured: Boolean(data.featured),
    viewCount: Number(data.viewCount || 0),
    reviewerId: data.reviewerId ? String(data.reviewerId) : null,
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    submittedAt: toIsoOrNull(data.submittedAt),
    publishedAt: toIsoOrNull(data.publishedAt),
  };
}

export async function getPublicCategories(): Promise<Category[]> {
  const cached = getFromQueryCache<Category[]>('public_categories');
  if (cached) return cached;

  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection('categories').orderBy('order', 'asc').get();
      if (!snap.empty) {
        const categories = snap.docs.map((d: QueryDocumentSnapshot) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            slug: String(data.slug || d.id),
            description: String(data.description || ''),
            order: Number(data.order || 99),
          };
        });
        setInQueryCache('public_categories', categories, 300_000);
        return categories;
      }
      return INITIAL_CATEGORIES;
    }

    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) return INITIAL_CATEGORIES;
    const categories = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || d.id),
        description: String(data.description || ''),
        order: Number(data.order || 99),
      };
    });
    setInQueryCache('public_categories', categories, 300_000);
    return categories;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function sortPostsDescending(posts: Post[]): Post[] {
  return posts.sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt).getTime();
    const timeB = new Date(b.publishedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

export async function getPublishedPosts(options?: {
  limitCount?: number;
  offset?: number;
  categoryId?: string;
  featuredOnly?: boolean;
}): Promise<Post[]> {
  const limitCount = options?.limitCount ?? 12;
  const offset = options?.offset ?? 0;
  const cacheKey = `posts_${offset}_${limitCount}_${options?.categoryId || 'all'}_${options?.featuredOnly ? 'feat' : 'all'}`;
  const cached = getFromQueryCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      let ref: AdminQuery = adminDb
        .collection('posts')
        .where('status', '==', 'PUBLISHED');
      if (options?.categoryId) {
        ref = ref.where('categoryId', '==', options.categoryId);
      }
      if (options?.featuredOnly) {
        ref = ref.where('featured', '==', true);
      }
      const snap = await ref.get();
      const posts = snap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
      const sorted = sortPostsDescending(posts).slice(offset, offset + limitCount);
      setInQueryCache(cacheKey, sorted, 60_000);
      return sorted;
    }

    // Client SDK fallback
    const fallbackSnap = await getDocs(
      query(collection(db, 'posts'), where('status', '==', 'PUBLISHED'))
    );
    let posts = fallbackSnap.docs.map((d) => mapDocToPost(d.id, d.data()));
    if (options?.categoryId) {
      posts = posts.filter((p) => p.categoryId === options.categoryId);
    }
    if (options?.featuredOnly) {
      posts = posts.filter((p) => p.featured);
    }
    const sorted = sortPostsDescending(posts).slice(offset, offset + limitCount);
    setInQueryCache(cacheKey, sorted, 60_000);
    return sorted;
  } catch (err) {
    console.error('getPublishedPosts failed completely:', err);
    return [];
  }
}

export async function getPublishedPostsFeed(options?: {
  offset?: number;
  limit?: number;
  categoryId?: string;
}): Promise<{ posts: Post[]; hasMore: boolean; total: number }> {
  const offset = Math.max(0, options?.offset ?? 0);
  const limitCount = Math.max(1, options?.limit ?? 9);
  const cacheKey = `posts_feed_${options?.categoryId || 'all'}`;
  let allPosts = getFromQueryCache<Post[]>(cacheKey);

  if (!allPosts) {
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        let ref: AdminQuery = adminDb
          .collection('posts')
          .where('status', '==', 'PUBLISHED');
        if (options?.categoryId) {
          ref = ref.where('categoryId', '==', options.categoryId);
        }
        const snap = await ref.get();
        const posts = snap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
        allPosts = sortPostsDescending(posts);
      } else {
        const fallbackSnap = await getDocs(
          query(collection(db, 'posts'), where('status', '==', 'PUBLISHED'))
        );
        let posts = fallbackSnap.docs.map((d) => mapDocToPost(d.id, d.data()));
        if (options?.categoryId) {
          posts = posts.filter((p) => p.categoryId === options.categoryId);
        }
        allPosts = sortPostsDescending(posts);
      }
      setInQueryCache(cacheKey, allPosts, 60_000);
    } catch (err) {
      console.error('getPublishedPostsFeed failed:', err);
      allPosts = [];
    }
  }

  const total = allPosts.length;
  const sliced = allPosts.slice(offset, offset + limitCount);
  const hasMore = total > offset + limitCount;

  return {
    posts: sliced,
    hasMore,
    total,
  };
}

export const getPublishedPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const cacheKey = `post_slug_${slug}`;
  const cached = getFromQueryCache<Post>(cacheKey);
  if (cached) return cached;

  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('posts')
        .where('status', '==', 'PUBLISHED')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      const post = mapDocToPost(d.id, d.data());
      setInQueryCache(cacheKey, post, 60_000);
      return post;
    }

    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'PUBLISHED'),
      where('slug', '==', slug),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const post = mapDocToPost(d.id, d.data());
    setInQueryCache(cacheKey, post, 60_000);
    return post;
  } catch {
    return null;
  }
});

export async function getRelatedPublishedPosts(
  postId: string,
  categoryId: string,
  limitCount = 3
): Promise<Post[]> {
  try {
    const posts = await getPublishedPosts({ categoryId, limitCount: limitCount + 1 });
    return posts.filter((p) => p.id !== postId).slice(0, limitCount);
  } catch {
    return [];
  }
}

export const getPublicAuthorByUsername = cache(async (
  username: string
): Promise<PublicAuthorProfile | null> => {
  const cleanUsername = username.toLowerCase().trim();
  const cacheKey = `author_${cleanUsername}`;
  const cached = getFromQueryCache<PublicAuthorProfile>(cacheKey);
  if (cached) return cached;

  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('publicProfiles')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      const author: PublicAuthorProfile = {
        uid: String(data.uid || snap.docs[0].id),
        username: String(data.username || ''),
        displayName: String(data.displayName || ''),
        avatar: String(data.avatar || ''),
        bio: String(data.bio || ''),
        website: String(data.website || ''),
        role: (data.role as PublicAuthorProfile['role']) || 'USER',
        status: (data.status as PublicAuthorProfile['status']) || 'ACTIVE',
        createdAt: toIso(data.createdAt),
      };
      setInQueryCache(cacheKey, author, 120_000);
      return author;
    }

    const q = query(
      collection(db, 'publicProfiles'),
      where('username', '==', cleanUsername),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const author: PublicAuthorProfile = {
      uid: String(data.uid || snap.docs[0].id),
      username: String(data.username || ''),
      displayName: String(data.displayName || ''),
      avatar: String(data.avatar || ''),
      bio: String(data.bio || ''),
      website: String(data.website || ''),
      role: (data.role as PublicAuthorProfile['role']) || 'USER',
      status: (data.status as PublicAuthorProfile['status']) || 'ACTIVE',
      createdAt: toIso(data.createdAt),
    };
    setInQueryCache(cacheKey, author, 120_000);
    return author;
  } catch {
    return null;
  }
});

export async function getPublishedPostsByAuthorId(
  authorId: string,
  limitCount = 20
): Promise<Post[]> {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      try {
        const snap = await adminDb
          .collection('posts')
          .where('status', '==', 'PUBLISHED')
          .where('authorId', '==', authorId)
          .orderBy('publishedAt', 'desc')
          .limit(limitCount)
          .get();
        if (!snap.empty) {
          return snap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
        }
      } catch (err) {
        console.warn('Fallback getPublishedPostsByAuthorId admin:', err);
      }
      const fallbackSnap = await adminDb
        .collection('posts')
        .where('status', '==', 'PUBLISHED')
        .where('authorId', '==', authorId)
        .get();
      const posts = fallbackSnap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
      return sortPostsDescending(posts).slice(0, limitCount);
    }

    try {
      const q = query(
        collection(db, 'posts'),
        where('status', '==', 'PUBLISHED'),
        where('authorId', '==', authorId),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => mapDocToPost(d.id, d.data()));
      }
    } catch (err) {
      console.warn('Fallback getPublishedPostsByAuthorId client:', err);
    }

    const fallbackSnap = await getDocs(
      query(
        collection(db, 'posts'),
        where('status', '==', 'PUBLISHED'),
        where('authorId', '==', authorId)
      )
    );
    const posts = fallbackSnap.docs.map((d) => mapDocToPost(d.id, d.data()));
    return sortPostsDescending(posts).slice(0, limitCount);
  } catch {
    return [];
  }
}

export async function getFeaturedAuthors(limitCount = 6): Promise<PublicAuthorProfile[]> {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('publicProfiles')
        .where('status', '==', 'ACTIVE')
        .limit(limitCount)
        .get();
      return snap.docs.map((d: QueryDocumentSnapshot) => {
        const data = d.data();
        return {
          uid: String(data.uid || d.id),
          username: String(data.username || ''),
          displayName: String(data.displayName || ''),
          avatar: String(data.avatar || ''),
          bio: String(data.bio || ''),
          website: String(data.website || ''),
          role: (data.role as PublicAuthorProfile['role']) || 'USER',
          status: (data.status as PublicAuthorProfile['status']) || 'ACTIVE',
          createdAt: toIso(data.createdAt),
        };
      });
    }

    const q = query(
      collection(db, 'publicProfiles'),
      where('status', '==', 'ACTIVE'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        username: String(data.username || ''),
        displayName: String(data.displayName || ''),
        avatar: String(data.avatar || ''),
        bio: String(data.bio || ''),
        website: String(data.website || ''),
        role: (data.role as PublicAuthorProfile['role']) || 'USER',
        status: (data.status as PublicAuthorProfile['status']) || 'ACTIVE',
        createdAt: toIso(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}

export async function getVisibleCommentsForPost(postId: string): Promise<Comment[]> {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('comments')
        .where('postId', '==', postId)
        .where('status', '==', 'VISIBLE')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return snap.docs.map((d: QueryDocumentSnapshot) => {
        const data = d.data();
        return {
          id: d.id,
          postId: String(data.postId || ''),
          authorId: String(data.authorId || ''),
          authorName: String(data.authorName || ''),
          authorUsername: String(data.authorUsername || ''),
          authorAvatar: String(data.authorAvatar || ''),
          content: String(data.content || ''),
          status: (data.status as Comment['status']) || 'VISIBLE',
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
        };
      });
    }

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('status', '==', 'VISIBLE'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        postId: String(data.postId || ''),
        authorId: String(data.authorId || ''),
        authorName: String(data.authorName || ''),
        authorUsername: String(data.authorUsername || ''),
        authorAvatar: String(data.authorAvatar || ''),
        content: String(data.content || ''),
        status: (data.status as Comment['status']) || 'VISIBLE',
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch {
    return [];
  }
}

export async function getPublicSiteSettings(): Promise<SiteSettings> {
  const defaults: SiteSettings = {
    id: 'site',
    siteName: SITE_CONFIG.name,
    tagline: SITE_CONFIG.tagline,
    description: SITE_CONFIG.description,
    contactEmail: SITE_CONFIG.contactEmail,
    allowRegistrations: true,
    requireEmailVerification: false,
    maintenanceMode: false,
    updatedAt: new Date().toISOString(),
  };

  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection('settings').doc('site').get();
      if (!snap.exists) return defaults;
      const data = snap.data()!;
      return {
        id: snap.id,
        siteName: String(data.siteName || defaults.siteName),
        tagline: String(data.tagline || defaults.tagline),
        description: String(data.description || defaults.description),
        contactEmail: String(data.contactEmail || defaults.contactEmail),
        allowRegistrations: Boolean(data.allowRegistrations ?? true),
        requireEmailVerification: Boolean(data.requireEmailVerification ?? false),
        maintenanceMode: Boolean(data.maintenanceMode ?? false),
        updatedAt: toIso(data.updatedAt),
      };
    }

    const snap = await getDoc(doc(db, 'settings', 'site'));
    if (!snap.exists()) return defaults;
    const data = snap.data();
    return {
      id: snap.id,
      siteName: String(data.siteName || defaults.siteName),
      tagline: String(data.tagline || defaults.tagline),
      description: String(data.description || defaults.description),
      contactEmail: String(data.contactEmail || defaults.contactEmail),
      allowRegistrations: Boolean(data.allowRegistrations ?? true),
      requireEmailVerification: Boolean(data.requireEmailVerification ?? false),
      maintenanceMode: Boolean(data.maintenanceMode ?? false),
      updatedAt: toIso(data.updatedAt),
    };
  } catch {
    return defaults;
  }
}
