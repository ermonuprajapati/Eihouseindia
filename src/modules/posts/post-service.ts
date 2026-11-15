import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  increment,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SITE_CONFIG } from '@/config/site';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import {
  calculateReadingStats,
  extractPlainTextFromTiptap,
  postEditorSchema,
  sanitizeTiptapDocument,
  shouldInvalidateApprovalOnAuthorEdit,
  slugify,
} from '@/lib/validation';
import type {
  Category,
  NotificationItem,
  Post,
  PostStatus,
  TiptapDocument,
  UserProfile,
} from '@/types';

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function mapSnapshotToPost(docSnap: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): Post {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    authorId: String(data.authorId || ''),
    authorName: String(data.authorName || ''),
    authorUsername: String(data.authorUsername || ''),
    authorAvatar: String(data.authorAvatar || ''),
    title: String(data.title || ''),
    slug: String(data.slug || ''),
    excerpt: String(data.excerpt || ''),
    content: (data.content as TiptapDocument) || { type: 'doc', content: [] },
    coverImage: String(data.coverImage || ''),
    categoryId: String(data.categoryId || ''),
    categoryName: String(data.categoryName || ''),
    categorySlug: String(data.categorySlug || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: (data.status as PostStatus) || 'DRAFT',
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
    submittedAt: data.submittedAt ? toIso(data.submittedAt) : null,
    publishedAt: data.publishedAt ? toIso(data.publishedAt) : null,
  };
}

export interface SavePostInput {
  postId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: TiptapDocument;
  coverImage: string;
  category: Category;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  intent: 'SAVE_DRAFT' | 'SUBMIT_REVIEW' | 'PUBLISH_DIRECT';
}

export async function saveOrSubmitAuthorPost(
  input: SavePostInput,
  author: UserProfile,
  canPublishDirectly: boolean
): Promise<{ postId: string; status: PostStatus; slug: string }> {
  if (author.status === 'SUSPENDED') {
    throw new Error('Your account is currently suspended from submitting articles.');
  }

  const sanitizedContent = sanitizeTiptapDocument(input.content);

  // Auto-generate excerpt from content if left empty or shorter than 20 characters
  let cleanExcerpt = input.excerpt?.trim() || '';
  if (cleanExcerpt.length < 20) {
    const plainText = extractPlainTextFromTiptap(sanitizedContent).trim();
    if (plainText.length >= 20) {
      cleanExcerpt = plainText.slice(0, 300).trim();
    } else {
      const fallback = `${input.title.trim()} — Technical article published on ${SITE_CONFIG.name}.`;
      cleanExcerpt = fallback.slice(0, 300);
    }
  }
  if (cleanExcerpt.length < 20) {
    cleanExcerpt = cleanExcerpt.padEnd(20, '.');
  }
  if (cleanExcerpt.length > 400) {
    cleanExcerpt = cleanExcerpt.slice(0, 400);
  }

  let parsed;
  try {
    parsed = postEditorSchema.parse({
      title: input.title,
      slug: slugify(input.slug || input.title),
      excerpt: cleanExcerpt,
      coverImage: input.coverImage || '',
      categoryId: input.category.id,
      tags: input.tags.slice(0, 10),
      metaTitle: input.metaTitle || input.title.slice(0, 120),
      metaDescription: input.metaDescription || cleanExcerpt.slice(0, 200),
      content: sanitizedContent,
    });
  } catch (zodError: unknown) {
    const issues = (zodError as { issues?: { message?: string }[] })?.issues;
    if (Array.isArray(issues) && issues.length > 0 && issues[0]?.message) {
      throw new Error(issues[0].message);
    }
    throw zodError;
  }

  const { wordCount, readingTime } = calculateReadingStats(sanitizedContent);
  const postId = input.postId || `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const postRef = doc(db, 'posts', postId);

  let existingPost: Post | null = null;
  if (input.postId) {
    try {
      const snap = await getDoc(postRef);
      if (snap.exists()) {
        existingPost = mapSnapshotToPost(snap);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
    }
  }

  if (existingPost && existingPost.authorId !== author.uid && !canPublishDirectly) {
    throw new Error('You do not have permission to edit this article.');
  }

  let nextStatus: PostStatus = 'DRAFT';
  if (input.intent === 'PUBLISH_DIRECT') {
    if (!canPublishDirectly) {
      throw new Error('Only editors and admins can publish directly.');
    }
    nextStatus = 'PUBLISHED';
  } else if (input.intent === 'SUBMIT_REVIEW') {
    nextStatus = 'PENDING';
  } else {
    // SAVE_DRAFT: If an already published or pending post is edited by a regular author, invalidate prior approval
    if (existingPost && !canPublishDirectly && shouldInvalidateApprovalOnAuthorEdit(existingPost.status)) {
      nextStatus = 'PENDING';
    } else {
      nextStatus = 'DRAFT';
    }
  }

  const canonicalUrl = `${SITE_CONFIG.url}/blog/${parsed.slug}`;

  const batch = writeBatch(db);

  if (!existingPost) {
    batch.set(postRef, {
      id: postId,
      authorId: author.uid,
      authorName: author.displayName,
      authorUsername: author.username,
      authorAvatar: author.avatar || '',
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      content: sanitizedContent,
      coverImage: parsed.coverImage,
      categoryId: input.category.id,
      categoryName: input.category.name,
      categorySlug: input.category.slug,
      tags: parsed.tags,
      status: nextStatus,
      metaTitle: parsed.metaTitle || parsed.title.slice(0, 120),
      metaDescription: parsed.metaDescription || parsed.excerpt.slice(0, 200),
      canonicalUrl,
      locale: 'en-IN',
      readingTime,
      wordCount,
      featured: false,
      viewCount: 0,
      reviewerId: nextStatus === 'PUBLISHED' ? author.uid : null,
      rejectionReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: nextStatus === 'PENDING' || nextStatus === 'PUBLISHED' ? serverTimestamp() : null,
      publishedAt: nextStatus === 'PUBLISHED' ? serverTimestamp() : null,
    });
  } else {
    batch.update(postRef, {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      content: sanitizedContent,
      coverImage: parsed.coverImage,
      categoryId: input.category.id,
      categoryName: input.category.name,
      categorySlug: input.category.slug,
      tags: parsed.tags,
      status: nextStatus,
      metaTitle: parsed.metaTitle || parsed.title.slice(0, 120),
      metaDescription: parsed.metaDescription || parsed.excerpt.slice(0, 200),
      canonicalUrl,
      readingTime,
      wordCount,
      reviewerId: nextStatus === 'PUBLISHED' ? author.uid : null,
      rejectionReason: nextStatus === 'PENDING' || nextStatus === 'DRAFT' ? null : existingPost.rejectionReason,
      updatedAt: serverTimestamp(),
      submittedAt: nextStatus === 'PENDING' ? serverTimestamp() : existingPost.submittedAt ? serverTimestamp() : null,
      publishedAt: nextStatus === 'PUBLISHED' ? serverTimestamp() : null,
    });
  }

  // Register tags safely
  for (const tagName of parsed.tags.slice(0, 10)) {
    const tagSlug = slugify(tagName);
    if (!tagSlug) continue;
    const tagRef = doc(db, 'tags', tagSlug);
    batch.set(
      tagRef,
      {
        id: tagSlug,
        name: tagName.slice(0, 40),
        slug: tagSlug,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Create notification on submission
  if (nextStatus === 'PENDING') {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: author.uid,
      title: 'Submission Received',
      message: `"${parsed.title}" has been queued for editorial review.`,
      type: 'SUBMISSION',
      postId,
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, existingPost ? OperationType.UPDATE : OperationType.CREATE, `posts/${postId}`);
  }

  return { postId, status: nextStatus, slug: parsed.slug };
}

export async function getAuthorPostById(postId: string): Promise<Post | null> {
  try {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) return null;
    return mapSnapshotToPost(snap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
  }
}

export async function getAuthorPostsPaginated(params: {
  authorId: string;
  statusFilter?: PostStatus;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<{
  posts: Post[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const pageSize = params.pageSize ?? 10;
  try {
    const constraints = [where('authorId', '==', params.authorId)];
    if (params.statusFilter) {
      constraints.push(where('status', '==', params.statusFilter));
    }
    // Query directly with equality filter and sort in-memory to prevent missing composite index failures
    const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
    const list = snap.docs.map((d) => mapSnapshotToPost(d));
    list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
    const hasMore = list.length > pageSize;
    const sliced = hasMore ? list.slice(0, pageSize) : list;
    return {
      posts: sliced,
      lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
      hasMore,
    };
  } catch (error) {
    console.error('getAuthorPostsPaginated failed:', error);
    return { posts: [], lastDoc: null, hasMore: false };
  }
}

export async function getPublishedPostsPaginated(params: {
  categoryId?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  offset?: number;
}): Promise<{
  posts: Post[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const pageSize = params.pageSize ?? 9;
  const offset = Math.max(0, params.offset ?? 0);
  try {
    // If an offset is requested without a Firestore document snapshot cursor,
    // jump straight to the in-memory fetch so client-side pagination works seamlessly.
    if (offset > 0 && !params.cursor) {
      throw new Error('Using offset-based pagination');
    }

    const constraints = [where('status', '==', 'PUBLISHED')];
    if (params.categoryId) {
      constraints.push(where('categoryId', '==', params.categoryId));
    }
    const q = params.cursor
      ? query(
          collection(db, 'posts'),
          ...constraints,
          orderBy('publishedAt', 'desc'),
          startAfter(params.cursor),
          limit(pageSize + 1)
        )
      : query(
          collection(db, 'posts'),
          ...constraints,
          orderBy('publishedAt', 'desc'),
          limit(pageSize + 1)
        );
    const snap = await getDocs(q);
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const sliced = hasMore ? docs.slice(0, pageSize) : docs;
    return {
      posts: sliced.map((d) => mapSnapshotToPost(d)),
      lastDoc: sliced.length > 0 ? sliced[sliced.length - 1] : null,
      hasMore,
    };
  } catch {
    try {
      const fallbackSnap = await getDocs(
        query(collection(db, 'posts'), where('status', '==', 'PUBLISHED'))
      );
      let list = fallbackSnap.docs.map((d) => mapSnapshotToPost(d));
      if (params.categoryId) {
        list = list.filter((p) => p.categoryId === params.categoryId);
      }
      list.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      const hasMore = list.length > offset + pageSize;
      const sliced = list.slice(offset, offset + pageSize);
      return {
        posts: sliced,
        lastDoc: null,
        hasMore,
      };
    } catch (fallbackError) {
      console.error('getPublishedPostsPaginated completely failed:', fallbackError);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  }
}

export async function deleteAuthorDraft(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function recordPostView(postId: string, viewerId?: string): Promise<void> {
  const viewId = `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'postViews', viewId), {
      postId,
      ...(viewerId ? { viewerId } : {}),
      viewedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', postId), {
      viewCount: increment(1),
    });
    await batch.commit();
  } catch {
    // Non-critical telemetry; never break article reading experience
  }
}

export async function createArticleComment(params: {
  postId: string;
  author: UserProfile;
  content: string;
}) {
  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(db, 'comments', commentId), {
      id: commentId,
      postId: params.postId,
      authorId: params.author.uid,
      authorName: params.author.displayName,
      authorUsername: params.author.username,
      authorAvatar: params.author.avatar || '',
      content: params.content.trim(),
      status: 'VISIBLE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${commentId}`);
  }
  return commentId;
}

export async function createContentReport(params: {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reason: string;
}) {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(db, 'reports', reportId), {
      id: reportId,
      targetType: params.targetType,
      targetId: params.targetId,
      targetTitle: params.targetTitle || '',
      reporterId: params.reporterId,
      reason: params.reason.trim(),
      status: 'OPEN',
      resolvedBy: null,
      resolutionNote: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportId}`);
  }
  return reportId;
}

export async function subscribeToNewsletter(email: string, source = 'website') {
  const subId = `sub_${email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 80)}`;
  try {
    await setDoc(doc(db, 'newsletterSubscribers', subId), {
      email: email.trim().toLowerCase(),
      subscribedAt: serverTimestamp(),
      source,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `newsletterSubscribers/${subId}`);
  }
}

export async function submitContactInquiry(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(db, 'contactMessages', msgId), {
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      subject: params.subject.trim(),
      message: params.message.trim(),
      status: 'PENDING',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `contactMessages/${msgId}`);
  }
}

export async function updateAuthorProfile(
  uid: string,
  data: {
    displayName: string;
    username: string;
    bio: string;
    website: string;
    avatar: string;
  }
) {
  const batch = writeBatch(db);
  const payload = {
    displayName: data.displayName.trim(),
    username: data.username.trim().toLowerCase(),
    bio: data.bio.trim(),
    website: data.website.trim(),
    avatar: data.avatar.trim(),
    updatedAt: serverTimestamp(),
  };
  batch.update(doc(db, 'users', uid), payload);
  batch.update(doc(db, 'publicProfiles', uid), payload);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('userId', '==', userId))
    );
    const list: NotificationItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || ''),
        title: String(data.title || ''),
        message: String(data.message || ''),
        type: (data.type as NotificationItem['type']) || 'SYSTEM',
        postId: data.postId ? String(data.postId) : undefined,
        read: Boolean(data.read),
        createdAt: toIso(data.createdAt),
      };
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, 30);
  } catch (error) {
    console.warn('getUserNotifications fallback to empty on error:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}
