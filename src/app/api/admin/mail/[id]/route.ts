import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';
import { db } from '@/config/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const allowedFields = ['status', 'isStarred', 'folder', 'tags'];
    const sanitized: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key];
      }
    }

    sanitized.updatedAt = new Date().toISOString();

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('adminEmails').doc(id).update(sanitized);
    } else {
      await updateDoc(doc(db, 'adminEmails', id), sanitized);
    }

    return NextResponse.json({ success: true, id, updates: sanitized });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('adminEmails').doc(id).delete();
    } else {
      await deleteDoc(doc(db, 'adminEmails', id));
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email record' },
      { status: 500 }
    );
  }
}
