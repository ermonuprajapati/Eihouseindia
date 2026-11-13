import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    const docSnap = await db.collection('mediaFiles').doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const data = docSnap.data();
    if (!data?.data) {
      return NextResponse.json({ error: 'Media payload missing' }, { status: 404 });
    }

    const mimeType = (data.mimeType as string) || 'image/jpeg';
    const buffer = Buffer.from(data.data as string, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        // 1-year immutable cache header for optimal performance & zero repeated Firestore reads
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve media from Firestore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error retrieving media' },
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
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    await Promise.all([
      db.collection('mediaFiles').doc(id).delete().catch(() => undefined),
      db.collection('media').doc(id).delete().catch(() => undefined),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete media from Firestore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error deleting media' },
      { status: 500 }
    );
  }
}
