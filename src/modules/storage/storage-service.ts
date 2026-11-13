import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import type { MediaItem } from '@/types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload JPEG, PNG, WebP, or AVIF.',
    };
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image size must be under 5 MB.',
    };
  }
  return { valid: true };
}

export async function uploadEditorialImage(file: File, userId: string): Promise<MediaItem> {
  const check = validateImageFile(file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const mediaId = `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `uploads/${userId}/${mediaId}-${sanitizedFileName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploaderId: userId,
    },
  });

  const url = await getDownloadURL(storageRef);

  const mediaDoc = {
    id: mediaId,
    uploaderId: userId,
    url,
    storagePath,
    fileName: sanitizedFileName,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'media', mediaId), mediaDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `media/${mediaId}`);
  }

  return {
    id: mediaId,
    uploaderId: userId,
    url,
    storagePath,
    fileName: sanitizedFileName,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteEditorialMedia(media: MediaItem): Promise<void> {
  try {
    const storageRef = ref(storage, media.storagePath);
    await deleteObject(storageRef).catch(() => undefined);
    await deleteDoc(doc(db, 'media', media.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `media/${media.id}`);
  }
}
