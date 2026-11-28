import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminAppInstance: App | null = null;

export function isFirebaseAdminConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return true;
  }
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function getOrInitAdminApp(): App | null {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK must only be used on the server.');
  }
  if (adminAppInstance) {
    return adminAppInstance;
  }

  const existing = getApps();
  if (existing.length > 0) {
    adminAppInstance = existing[0];
    return adminAppInstance;
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminAppInstance = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || 'eihouseindia',
      });
      return adminAppInstance;
    }

    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    adminAppInstance = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'eihouseindia',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID || 'eihouseindia',
    });
    return adminAppInstance;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getOrInitAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getOrInitAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already set or cannot be set again
  }
  return db;
}
