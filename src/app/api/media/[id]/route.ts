import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';
import { cloudinary, isCloudinaryConfigured } from '@/config/cloudinary';

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

    // 1. Check legacy mediaFiles collection first
    const docSnap = await db.collection('mediaFiles').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data?.data) {
        const mimeType = (data.mimeType as string) || 'image/jpeg';
        const buffer = Buffer.from(data.data as string, 'base64');

        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 2. Check media metadata collection to redirect to Cloudinary if available
    const metaSnap = await db.collection('media').doc(id).get();
    if (metaSnap.exists) {
      const metaData = metaSnap.data();
      if (metaData?.url && typeof metaData.url === 'string' && metaData.url.startsWith('http')) {
        return NextResponse.redirect(metaData.url, { status: 307 });
      }
    }

    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to serve media:', error);
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

    // Remove from Cloudinary if stored there
    if (isCloudinaryConfigured()) {
      let cloudinaryPublicId = `eihouseindia/${id}`;
      if (db) {
        const metaDoc = await db.collection('media').doc(id).get().catch(() => null);
        if (metaDoc?.exists) {
          const storagePath = metaDoc.data()?.storagePath;
          if (typeof storagePath === 'string' && storagePath.startsWith('cloudinary://')) {
            cloudinaryPublicId = storagePath.replace('cloudinary://', '');
          }
        }
      }
      await cloudinary.uploader.destroy(cloudinaryPublicId).catch(() => undefined);
    }

    if (db) {
      await Promise.all([
        db.collection('mediaFiles').doc(id).delete().catch(() => undefined),
        db.collection('media').doc(id).delete().catch(() => undefined),
      ]);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error deleting media' },
      { status: 500 }
    );
  }
}
