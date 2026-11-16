import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC2lJt0ATzGnHhA8mPk1Y_sBs6Zob2EsNY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'eihouseindia.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'eihouseindia',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'eihouseindia.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '836043240644',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:836043240644:web:8276e02bcdfdfd63e08591',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-EYDGDV169H',
};

const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;

export const firebaseApp: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

export const db: Firestore = (() => {
  if (typeof window === 'undefined') {
    return firestoreDatabaseId && firestoreDatabaseId !== '(default)'
      ? getFirestore(firebaseApp, firestoreDatabaseId)
      : getFirestore(firebaseApp);
  }
  try {
    return initializeFirestore(
      firebaseApp,
      {
        localCache: persistentLocalCache({}),
      },
      firestoreDatabaseId && firestoreDatabaseId !== '(default)' ? firestoreDatabaseId : undefined
    );
  } catch {
    return firestoreDatabaseId && firestoreDatabaseId !== '(default)'
      ? getFirestore(firebaseApp, firestoreDatabaseId)
      : getFirestore(firebaseApp);
  }
})();

export const storage: FirebaseStorage = getStorage(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}

export async function verifyFirestoreConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await getDocFromServer(doc(db, 'settings', 'site'));
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      return {
        connected: false,
        error: 'Firestore client is offline. Verify your Firebase project configuration and network.',
      };
    }
    return { connected: true };
  }
}
