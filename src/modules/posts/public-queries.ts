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
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection('categories').orderBy('order', 'asc').get();
      if (!snap.empty) {
        return snap.docs.map((d: QueryDocumentSnapshot) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            slug: String(data.slug || d.id),
            description: String(data.description || ''),
            order: Number(data.order || 99),
          };
        });
      }
      return INITIAL_CATEGORIES;
    }

    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) return INITIAL_CATEGORIES;
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || d.id),
        description: String(data.description || ''),
        order: Number(data.order || 99),
      };
    });
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export async function getPublishedPosts(options?: {
  limitCount?: number;
  categoryId?: string;
  featuredOnly?: boolean;
}): Promise<Post[]> {
  const limitCount = options?.limitCount ?? 12;
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
      const snap = await ref.orderBy('publishedAt', 'desc').limit(limitCount).get();
      return snap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
    }

    const constraints = [where('status', '==', 'PUBLISHED')];
    if (options?.categoryId) {
      constraints.push(where('categoryId', '==', options.categoryId));
    }
    if (options?.featuredOnly) {
      constraints.push(where('featured', '==', true));
    }
    const q = query(
      collection(db, 'posts'),
      ...constraints,
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToPost(d.id, d.data()));
  } catch {
    return [];
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
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
      return mapDocToPost(d.id, d.data());
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
    return mapDocToPost(d.id, d.data());
  } catch {
    return null;
  }
}

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

export async function getPublicAuthorByUsername(
  username: string
): Promise<PublicAuthorProfile | null> {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('publicProfiles')
        .where('username', '==', username.toLowerCase())
        .limit(1)
        .get();
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return {
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
    }

    const q = query(
      collection(db, 'publicProfiles'),
      where('username', '==', username.toLowerCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
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
  } catch {
    return null;
  }
}

export async function getPublishedPostsByAuthorId(
  authorId: string,
  limitCount = 20
): Promise<Post[]> {
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection('posts')
        .where('status', '==', 'PUBLISHED')
        .where('authorId', '==', authorId)
        .orderBy('publishedAt', 'desc')
        .limit(limitCount)
        .get();
      return snap.docs.map((d: QueryDocumentSnapshot) => mapDocToPost(d.id, d.data()));
    }

    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'PUBLISHED'),
      where('authorId', '==', authorId),
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToPost(d.id, d.data()));
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
