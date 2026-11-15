import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/config/firebase-admin';
import { cloudinary, isCloudinaryConfigured } from '@/config/cloudinary';
import type { MediaItem } from '@/types';

const uploadSchema = z.object({
  mediaId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  uploaderId: z.string().min(1).max(128),
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  sizeBytes: z.number().positive().max(10 * 1024 * 1024), // Max 10 MB raw, compressed will be < 800 KB
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

    let url = `/api/media/${mediaId}`;
    let storagePath = `firestore://${mediaId}`;
    let uploadedSizeBytes = sizeBytes;

    // 1. Primary: Upload to Cloudinary if configured
    if (isCloudinaryConfigured()) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${base64}`,
        {
          folder: 'eihouseindia',
          public_id: mediaId,
          resource_type: 'image',
          overwrite: true,
        }
      );

      url = uploadResult.secure_url;
      storagePath = `cloudinary://${uploadResult.public_id}`;
      uploadedSizeBytes = uploadResult.bytes || sizeBytes;
    }

    // 2. Persist metadata in Firestore database
    const db = getAdminDb();
    if (db) {
      // If Cloudinary is NOT configured, store raw base64 payload as fallback in Firestore
      if (!isCloudinaryConfigured()) {
        await db.collection('mediaFiles').doc(mediaId).set({
          id: mediaId,
          uploaderId,
          data: base64,
          mimeType,
          sizeBytes,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await db.collection('media').doc(mediaId).set({
        id: mediaId,
        uploaderId,
        url,
        storagePath,
        fileName,
        mimeType,
        sizeBytes: uploadedSizeBytes,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const mediaItem: MediaItem = {
      id: mediaId,
      uploaderId,
      url,
      storagePath,
      fileName,
      mimeType,
      sizeBytes: uploadedSizeBytes,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ media: mediaItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to save media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media upload failed' },
      { status: 500 }
    );
  }
}
