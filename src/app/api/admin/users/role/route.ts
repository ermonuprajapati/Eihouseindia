import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/config/firebase-admin';
import { SITE_CONFIG } from '@/config/site';

const updateRoleSchema = z.object({
  targetUid: z.string().min(1).max(128),
  role: z.enum(['USER', 'EDITOR', 'ADMIN']),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const actorDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const isBootstrapAdmin =
      decoded.email_verified === true && decoded.email === SITE_CONFIG.bootstrapAdminEmail;
    const isAdmin = isBootstrapAdmin || (actorDoc.exists && actorDoc.data()?.role === 'ADMIN');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role assignment payload' }, { status: 400 });
    }

    const { targetUid, role, status } = parsed.data;
    await adminAuth.setCustomUserClaims(targetUid, { role, suspended: status === 'SUSPENDED' });

    const batch = adminDb.batch();
    batch.update(adminDb.collection('users').doc(targetUid), {
      role,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection('publicProfiles').doc(targetUid), {
      role,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (role === 'ADMIN') {
      batch.set(adminDb.collection('admins').doc(targetUid), {
        uid: targetUid,
        grantedBy: decoded.uid,
        grantedAt: FieldValue.serverTimestamp(),
      });
      batch.delete(adminDb.collection('editors').doc(targetUid));
    } else if (role === 'EDITOR') {
      batch.set(adminDb.collection('editors').doc(targetUid), {
        uid: targetUid,
        grantedBy: decoded.uid,
        grantedAt: FieldValue.serverTimestamp(),
      });
      batch.delete(adminDb.collection('admins').doc(targetUid));
    } else {
      batch.delete(adminDb.collection('admins').doc(targetUid));
      batch.delete(adminDb.collection('editors').doc(targetUid));
    }

    const logId = `log_${Date.now()}_role`;
    batch.set(adminDb.collection('moderationLogs').doc(logId), {
      id: logId,
      actorId: decoded.uid,
      actorEmail: decoded.email || '',
      actorRole: 'ADMIN',
      action: 'ASSIGN_ROLE',
      targetType: 'USER',
      targetId: targetUid,
      reason: `Assigned role=${role}, status=${status}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return NextResponse.json({ ok: true, targetUid, role, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Role update failed' },
      { status: 500 }
    );
  }
}
