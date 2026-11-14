import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/config/firebase-admin';
import { SITE_CONFIG } from '@/config/site';
import { moderationDecisionSchema } from '@/lib/validation';
import { sendEditorialEmail } from '@/modules/email/email-service';

export async function POST(request: Request) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      {
        error:
          'Firebase Admin SDK credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not configured on the server.',
      },
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

    // Verify ADMIN or EDITOR role strictly on the server
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : 'USER';
    const isBootstrapAdmin =
      decoded.email_verified === true && decoded.email === SITE_CONFIG.bootstrapAdminEmail;

    if (!isBootstrapAdmin && role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.json({ error: 'Forbidden: Editor or Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = moderationDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid moderation request' },
        { status: 400 }
      );
    }

    const { postId, decision, reason } = parsed.data;
    const postRef = adminDb.collection('posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postSnap.data()!;
    const batch = adminDb.batch();

    if (decision === 'APPROVE') {
      batch.update(postRef, {
        status: 'PUBLISHED',
        reviewerId: decoded.uid,
        rejectionReason: null,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (decision === 'REJECT') {
      batch.update(postRef, {
        status: 'REJECTED',
        reviewerId: decoded.uid,
        rejectionReason: reason || 'Rejected by editorial board.',
        publishedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (decision === 'REQUEST_CHANGES') {
      batch.update(postRef, {
        status: 'DRAFT',
        reviewerId: decoded.uid,
        rejectionReason: reason || 'Please revise and resubmit.',
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      batch.update(postRef, {
        status: 'ARCHIVED',
        reviewerId: decoded.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(adminDb.collection('moderationLogs').doc(logId), {
      id: logId,
      actorId: decoded.uid,
      actorEmail: decoded.email || '',
      actorRole: isBootstrapAdmin ? 'ADMIN' : role,
      action:
        decision === 'APPROVE'
          ? 'APPROVE_POST'
          : decision === 'REJECT'
          ? 'REJECT_POST'
          : decision === 'REQUEST_CHANGES'
          ? 'REQUEST_CHANGES'
          : 'ARCHIVE_POST',
      targetType: 'POST',
      targetId: postId,
      reason: reason || decision,
      createdAt: FieldValue.serverTimestamp(),
    });

    // In-app notification for author
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notifTitle =
      decision === 'APPROVE'
        ? 'Article Approved & Published 🎉'
        : decision === 'REJECT'
        ? 'Article Rejected'
        : decision === 'REQUEST_CHANGES'
        ? 'Changes Requested on Article'
        : 'Article Archived';
    const notifMsg =
      decision === 'APPROVE'
        ? `Congratulations! Your article "${postData.title}" has been approved by the editorial team and is now live.`
        : decision === 'REJECT'
        ? `Your article "${postData.title}" was not approved. ${reason ? `Reason: ${reason}` : ''}`
        : decision === 'REQUEST_CHANGES'
        ? `Reviewers requested revisions on "${postData.title}". ${reason ? `Note: ${reason}` : ''}`
        : `Your article "${postData.title}" was archived.`;

    batch.set(adminDb.collection('notifications').doc(notifId), {
      id: notifId,
      userId: postData.authorId,
      title: notifTitle,
      message: notifMsg,
      type: decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'SYSTEM',
      postId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Trigger author email if author record exists
    const authorSnap = await adminDb.collection('users').doc(postData.authorId).get();
    if (authorSnap.exists) {
      const author = authorSnap.data()!;
      if (author.email) {
        const emailEvent =
          decision === 'APPROVE'
            ? 'ARTICLE_APPROVED'
            : decision === 'REJECT'
            ? 'ARTICLE_REJECTED'
            : decision === 'REQUEST_CHANGES'
            ? 'CHANGES_REQUESTED'
            : null;
        if (emailEvent) {
          await sendEditorialEmail({
            to: author.email,
            event: emailEvent,
            recipientName: author.displayName || 'Contributor',
            articleTitle: postData.title,
            articleSlug: postData.slug,
            reason,
          });
        }
      }
    }

    revalidatePath('/');
    revalidatePath('/articles');
    revalidatePath(`/blog/${postData.slug}`);

    return NextResponse.json({ ok: true, postId, decision });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Moderation failed' },
      { status: 500 }
    );
  }
}
