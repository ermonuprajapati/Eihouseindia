import { ref, deleteObject } from 'firebase/storage';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { compressAndOptimizeImage } from '@/lib/image-compression';
import type { MediaItem } from '@/types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

// Allow up to 10 MB raw files from high-res phone cameras
const MAX_RAW_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload JPEG, PNG, WebP, or AVIF.',
    };
  }
  if (file.size <= 0 || file.size > MAX_RAW_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file size must be under 10 MB.',
    };
  }
  return { valid: true };
}

/**
 * Optimizes and uploads images via Cloudinary CDN,
 * recording metadata in Firestore.
 */
export async function uploadEditorialImage(file: File, userId: string): Promise<MediaItem> {
  const check = validateImageFile(file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  // 1. Client-side compression & resizing to < 800 KB WebP/JPEG
  const optimized = await compressAndOptimizeImage(file);
  const mediaId = `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sanitizedFileName = optimized.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

  // 2. Persist directly into Firestore through the Next.js media API
  const response = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId,
      uploaderId: userId,
      fileName: sanitizedFileName,
      mimeType: optimized.mimeType,
      sizeBytes: optimized.sizeBytes,
      base64: optimized.base64,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save media in Firestore.');
  }

  const result = await response.json();
  return result.media as MediaItem;
}

export async function deleteEditorialMedia(media: MediaItem): Promise<void> {
  try {
    if (
      media.storagePath.startsWith('firestore://') ||
      media.storagePath.startsWith('cloudinary://') ||
      media.url.startsWith('/api/media/') ||
      media.url.includes('cloudinary.com')
    ) {
      await fetch(`/api/media/${media.id}`, { method: 'DELETE' }).catch(() => undefined);
      return;
    }

    // Legacy fallback for any legacy Firebase Storage paths
    const storageRef = ref(storage, media.storagePath);
    await deleteObject(storageRef).catch(() => undefined);
    await deleteDoc(doc(db, 'media', media.id)).catch(() => undefined);
  } catch (error) {
    console.warn('Failed to delete media item:', error);
  }
}
