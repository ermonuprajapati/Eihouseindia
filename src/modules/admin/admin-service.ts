import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  deleteDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { INITIAL_CATEGORIES } from '@/config/categories';
import { SITE_CONFIG } from '@/config/site';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { mapSnapshotToPost } from '@/modules/posts/post-service';
import type {
  Category,
  Comment,
  MediaItem,
  ModerationLog,
  Post,
  PostStatus,
  ReportItem,
  SiteSettings,
  Tag,
  UserProfile,
  UserRole,
  UserStatus,
} from '@/types';

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  rejectedArticles: number;
  totalComments: number;
  openReports: number;
  recentSubmissions: Post[];
  popularArticles: Post[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const fetchRecentPending = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'posts'),
            where('status', '==', 'PENDING'),
            orderBy('submittedAt', 'desc'),
            limit(5)
          )
        );
        return snap.docs.map((d) => mapSnapshotToPost(d));
      } catch {
        const snap = await getDocs(
          query(collection(db, 'posts'), where('status', '==', 'PENDING'))
        );
        return snap.docs
          .map((d) => mapSnapshotToPost(d))
          .sort(
            (a, b) =>
              new Date(b.submittedAt || b.createdAt).getTime() -
              new Date(a.submittedAt || a.createdAt).getTime()
          )
          .slice(0, 5);
      }
    };

    const fetchPublishedPopular = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'posts'),
            where('status', '==', 'PUBLISHED'),
            orderBy('publishedAt', 'desc'),
            limit(10)
          )
        );
        return snap.docs.map((d) => mapSnapshotToPost(d));
      } catch {
        const snap = await getDocs(
          query(collection(db, 'posts'), where('status', '==', 'PUBLISHED'))
        );
        return snap.docs.map((d) => mapSnapshotToPost(d));
      }
    };

    const [
      usersCountSnap,
      totalPostsSnap,
      publishedPostsSnap,
      pendingPostsSnap,
      rejectedPostsSnap,
      commentsCountSnap,
      openReportsSnap,
      recentPendingPosts,
      publishedPostsList,
    ] = await Promise.all([
      getCountFromServer(collection(db, 'publicProfiles')),
      getCountFromServer(collection(db, 'posts')),
      getCountFromServer(query(collection(db, 'posts'), where('status', '==', 'PUBLISHED'))),
      getCountFromServer(query(collection(db, 'posts'), where('status', '==', 'PENDING'))),
      getCountFromServer(query(collection(db, 'posts'), where('status', '==', 'REJECTED'))),
      getCountFromServer(collection(db, 'comments')),
      getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'OPEN'))),
      fetchRecentPending(),
      fetchPublishedPopular(),
    ]);

    const popularSorted = publishedPostsList
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);

    return {
      totalUsers: usersCountSnap.data().count,
      totalArticles: totalPostsSnap.data().count,
      publishedArticles: publishedPostsSnap.data().count,
      pendingArticles: pendingPostsSnap.data().count,
      rejectedArticles: rejectedPostsSnap.data().count,
      totalComments: commentsCountSnap.data().count,
      openReports: openReportsSnap.data().count,
      recentSubmissions: recentPendingPosts,
      popularArticles: popularSorted,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin-stats');
  }
}

export async function getPostsForAdmin(statusFilter?: PostStatus): Promise<Post[]> {
  try {
    const q = statusFilter
      ? query(
          collection(db, 'posts'),
          where('status', '==', statusFilter),
          orderBy('updatedAt', 'desc'),
          limit(50)
        )
      : query(collection(db, 'posts'), orderBy('updatedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapSnapshotToPost(d));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
  }
}

export async function moderatePostDecision(params: {
  post: Post;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'ARCHIVE';
  reason?: string;
  actor: UserProfile;
  actorRole: UserRole;
}): Promise<void> {
  const { post, decision, reason, actor, actorRole } = params;
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized moderation attempt.');
  }
  if ((decision === 'REJECT' || decision === 'REQUEST_CHANGES') && (!reason || reason.trim().length < 5)) {
    throw new Error('Please provide a clear moderation reason (at least 5 characters).');
  }

  const batch = writeBatch(db);
  const postRef = doc(db, 'posts', post.id);
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let nextStatus: PostStatus = post.status;
  let logAction: ModerationLog['action'] = 'APPROVE_POST';
  let notifType: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SYSTEM' = 'SYSTEM';
  let notifTitle = '';
  let notifMessage = '';

  if (decision === 'APPROVE') {
    nextStatus = 'PUBLISHED';
    logAction = 'APPROVE_POST';
    notifType = 'APPROVED';
    notifTitle = 'Article Published';
    notifMessage = `Your article "${post.title}" has been approved and is now live.`;
    batch.update(postRef, {
      status: 'PUBLISHED',
      reviewerId: actor.uid,
      rejectionReason: null,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (decision === 'REJECT') {
    nextStatus = 'REJECTED';
    logAction = 'REJECT_POST';
    notifType = 'REJECTED';
    notifTitle = 'Article Submission Rejected';
    notifMessage = `Your article "${post.title}" was rejected: ${reason}`;
    batch.update(postRef, {
      status: 'REJECTED',
      reviewerId: actor.uid,
      rejectionReason: reason?.trim() || 'Rejected by editorial board.',
      publishedAt: null,
      updatedAt: serverTimestamp(),
    });
  } else if (decision === 'REQUEST_CHANGES') {
    nextStatus = 'DRAFT';
    logAction = 'REQUEST_CHANGES';
    notifType = 'CHANGES_REQUESTED';
    notifTitle = 'Editorial Revisions Requested';
    notifMessage = `Changes requested on "${post.title}": ${reason}`;
    batch.update(postRef, {
      status: 'DRAFT',
      reviewerId: actor.uid,
      rejectionReason: reason?.trim() || 'Please revise and resubmit.',
      updatedAt: serverTimestamp(),
    });
  } else {
    nextStatus = 'ARCHIVED';
    logAction = 'ARCHIVE_POST';
    notifType = 'SYSTEM';
    notifTitle = 'Article Archived';
    notifMessage = `Your article "${post.title}" has been archived.`;
    batch.update(postRef, {
      status: 'ARCHIVED',
      reviewerId: actor.uid,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: logAction,
    targetType: 'POST',
    targetId: post.id,
    reason: reason?.trim() || `Transitioned to ${nextStatus}`,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: post.authorId,
    title: notifTitle,
    message: notifMessage.slice(0, 500),
    type: notifType,
    postId: post.id,
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
  }
}

export async function deletePostAdmin(params: {
  post: Post;
  actor: UserProfile;
  actorRole: UserRole;
  reason?: string;
}): Promise<void> {
  const { post, actor, actorRole, reason } = params;
  if (actorRole !== 'ADMIN' && actorRole !== 'EDITOR') {
    throw new Error('Unauthorized: Admin or Editor role required to delete articles.');
  }

  const batch = writeBatch(db);
  const postRef = doc(db, 'posts', post.id);
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Delete the post document
  batch.delete(postRef);

  // Write moderation log for audit tracking
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'DELETE_POST',
    targetType: 'POST',
    targetId: post.id,
    reason: reason?.trim() || 'Deleted article via Admin Console.',
    createdAt: serverTimestamp(),
  });

  // Notify the author if another administrator performed the deletion
  if (post.authorId && post.authorId !== actor.uid) {
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: post.authorId,
      title: 'Article Deleted',
      message: `Your article "${post.title}" was deleted by editorial moderation.${reason ? ` Reason: ${reason}` : ''}`.slice(0, 500),
      type: 'REJECTED',
      postId: post.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();

    // Trigger on-demand cache revalidation
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: post.slug }),
    }).catch(() => undefined);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
  }
}

export async function togglePostFeatured(
  post: Post,
  featured: boolean,
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  batch.update(doc(db, 'posts', post.id), {
    featured,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'TOGGLE_FEATURED',
    targetType: 'POST',
    targetId: post.id,
    reason: featured ? 'Marked as featured story' : 'Removed from featured stories',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
  }
}

export async function getAllUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        email: String(data.email || ''),
        username: String(data.username || ''),
        displayName: String(data.displayName || ''),
        avatar: String(data.avatar || ''),
        bio: String(data.bio || ''),
        website: String(data.website || ''),
        role: (data.role as UserRole) || 'USER',
        status: (data.status as UserStatus) || 'ACTIVE',
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function updateUserRoleAndStatus(params: {
  targetUser: UserProfile;
  role: UserRole;
  status: UserStatus;
  actor: UserProfile;
}): Promise<void> {
  const { targetUser, role, status, actor } = params;
  const batch = writeBatch(db);
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  batch.update(doc(db, 'users', targetUser.uid), {
    role,
    status,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'publicProfiles', targetUser.uid), {
    role,
    status,
    updatedAt: serverTimestamp(),
  });

  if (role === 'ADMIN') {
    batch.set(doc(db, 'admins', targetUser.uid), {
      uid: targetUser.uid,
      grantedBy: actor.uid,
      grantedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'editors', targetUser.uid));
  } else if (role === 'EDITOR') {
    batch.set(doc(db, 'editors', targetUser.uid), {
      uid: targetUser.uid,
      grantedBy: actor.uid,
      grantedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'admins', targetUser.uid));
  } else {
    batch.delete(doc(db, 'admins', targetUser.uid));
    batch.delete(doc(db, 'editors', targetUser.uid));
  }

  const action: ModerationLog['action'] =
    status !== targetUser.status
      ? status === 'SUSPENDED'
        ? 'SUSPEND_USER'
        : 'RESTORE_USER'
      : 'ASSIGN_ROLE';

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: 'ADMIN',
    action,
    targetType: 'USER',
    targetId: targetUser.uid,
    reason: `Role=${role}, Status=${status}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function seedInitialCategories(actor: UserProfile): Promise<void> {
  const batch = writeBatch(db);
  for (const cat of INITIAL_CATEGORIES) {
    batch.set(doc(db, 'categories', cat.id), {
      ...cat,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  const logId = `log_${Date.now()}_seedcat`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: 'ADMIN',
    action: 'MANAGE_CATEGORY',
    targetType: 'CATEGORY',
    targetId: 'initial-seed',
    reason: 'Seeded 10 initial editorial categories',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'categories');
  }
}

export async function saveCategoryAdmin(
  category: Category,
  isNew: boolean,
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  const catRef = doc(db, 'categories', category.id);
  const logId = `log_${Date.now()}_cat`;

  if (isNew) {
    batch.set(catRef, {
      id: category.id,
      name: category.name.trim(),
      slug: category.slug.trim(),
      description: category.description.trim(),
      order: Number(category.order),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(catRef, {
      name: category.name.trim(),
      slug: category.slug.trim(),
      description: category.description.trim(),
      order: Number(category.order),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: 'ADMIN',
    action: 'MANAGE_CATEGORY',
    targetType: 'CATEGORY',
    targetId: category.id,
    reason: `${isNew ? 'Created' : 'Updated'} category ${category.name}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `categories/${category.id}`);
  }
}

export async function deleteCategoryAdmin(categoryId: string, actor: UserProfile): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'categories', categoryId));
  const logId = `log_${Date.now()}_delcat`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: 'ADMIN',
    action: 'MANAGE_CATEGORY',
    targetType: 'CATEGORY',
    targetId: categoryId,
    reason: 'Deleted category',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export async function getAllTagsAdmin(): Promise<Tag[]> {
  try {
    const snap = await getDocs(query(collection(db, 'tags'), orderBy('name', 'asc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || d.id),
        postCount: Number(data.postCount || 0),
        createdAt: toIso(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tags');
  }
}

export async function deleteTagAdmin(tagId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tags', tagId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tags/${tagId}`);
  }
}

export async function getCommentsForAdmin(): Promise<Comment[]> {
  try {
    const snap = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(50)));
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
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'comments');
  }
}

export async function moderateCommentAdmin(
  commentId: string,
  status: Comment['status'],
  actor: UserProfile,
  actorRole: UserRole
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'comments', commentId), {
    status,
    updatedAt: serverTimestamp(),
  });
  const logId = `log_${Date.now()}_cmt`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole,
    action: 'MODERATE_COMMENT',
    targetType: 'COMMENT',
    targetId: commentId,
    reason: `Comment status changed to ${status}`,
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
  }
}

export async function getReportsForAdmin(): Promise<ReportItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        targetType: (data.targetType as ReportItem['targetType']) || 'POST',
        targetId: String(data.targetId || ''),
        targetTitle: data.targetTitle ? String(data.targetTitle) : undefined,
        reporterId: String(data.reporterId || ''),
        reason: String(data.reason || ''),
        status: (data.status as ReportItem['status']) || 'OPEN',
        resolvedBy: data.resolvedBy ? String(data.resolvedBy) : null,
        resolutionNote: data.resolutionNote ? String(data.resolutionNote) : null,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function resolveReportAdmin(params: {
  reportId: string;
  status: 'RESOLVED' | 'DISMISSED';
  resolutionNote: string;
  actor: UserProfile;
  actorRole: UserRole;
}): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'reports', params.reportId), {
    status: params.status,
    resolvedBy: params.actor.uid,
    resolutionNote: params.resolutionNote.trim(),
    updatedAt: serverTimestamp(),
  });
  const logId = `log_${Date.now()}_rep`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: params.actor.uid,
    actorEmail: params.actor.email,
    actorRole: params.actorRole,
    action: 'RESOLVE_REPORT',
    targetType: 'REPORT',
    targetId: params.reportId,
    reason: `${params.status}: ${params.resolutionNote}`,
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${params.reportId}`);
  }
}

export async function getModerationLogsAdmin(): Promise<ModerationLog[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'moderationLogs'), orderBy('createdAt', 'desc'), limit(50))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        actorId: String(data.actorId || ''),
        actorEmail: data.actorEmail ? String(data.actorEmail) : undefined,
        actorRole: (data.actorRole as UserRole) || 'ADMIN',
        action: data.action as ModerationLog['action'],
        targetType: data.targetType as ModerationLog['targetType'],
        targetId: String(data.targetId || ''),
        reason: data.reason ? String(data.reason) : undefined,
        createdAt: toIso(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'moderationLogs');
  }
}

export async function getMediaLibraryAdmin(): Promise<MediaItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(60)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uploaderId: String(data.uploaderId || ''),
        url: String(data.url || ''),
        storagePath: String(data.storagePath || ''),
        fileName: String(data.fileName || ''),
        mimeType: String(data.mimeType || ''),
        sizeBytes: Number(data.sizeBytes || 0),
        createdAt: toIso(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'media');
  }
}

export async function getSiteSettingsClient(): Promise<SiteSettings> {
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

export async function saveSiteSettingsAdmin(
  settings: Omit<SiteSettings, 'id' | 'updatedAt'>,
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'settings', 'site'), {
    siteName: settings.siteName.trim(),
    tagline: settings.tagline.trim(),
    description: settings.description.trim(),
    contactEmail: settings.contactEmail.trim(),
    allowRegistrations: settings.allowRegistrations,
    requireEmailVerification: settings.requireEmailVerification,
    maintenanceMode: settings.maintenanceMode,
    updatedAt: serverTimestamp(),
  });
  const logId = `log_${Date.now()}_settings`;
  batch.set(doc(db, 'moderationLogs', logId), {
    id: logId,
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: 'ADMIN',
    action: 'UPDATE_SETTINGS',
    targetType: 'SETTINGS',
    targetId: 'site',
    reason: 'Updated global website settings',
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/site');
  }
}
