import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/config/firebase-admin';
import type { MediaItem } from '@/types';

const uploadSchema = z.object({
  mediaId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  uploaderId: z.string().min(1).max(128),
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  sizeBytes: z.number().positive().max(5 * 1024 * 1024), // Max 5 MB raw, compressed will be < 800 KB
  base64: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid upload payload' },
        { status: 400 }
      );
    }

    const { mediaId, uploaderId, fileName, mimeType, sizeBytes, base64 } = parsed.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase Admin Database not initialized on server' },
        { status: 500 }
      );
    }

    const storagePath = `firestore://${mediaId}`;
    const url = `/api/media/${mediaId}`;

    // 1. Store the image payload in the dedicated mediaFiles collection
    await db.collection('mediaFiles').doc(mediaId).set({
      id: mediaId,
      uploaderId,
      data: base64,
      mimeType,
      sizeBytes,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Store metadata in the media library collection
    await db.collection('media').doc(mediaId).set({
      id: mediaId,
      uploaderId,
      url,
      storagePath,
      fileName,
      mimeType,
      sizeBytes,
      createdAt: FieldValue.serverTimestamp(),
    });

    const mediaItem: MediaItem = {
      id: mediaId,
      uploaderId,
      url,
      storagePath,
      fileName,
      mimeType,
      sizeBytes,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ media: mediaItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to save media in Firestore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media upload failed' },
      { status: 500 }
    );
  }
}
