'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { SITE_CONFIG } from '@/config/site';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  effectiveRole: UserRole;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    displayName: string;
    username: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function serializeTimestamp(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function deriveSafeUsername(raw: string, uid: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 24);
  }
  return `eng_${uid.slice(0, 8).toLowerCase()}`;
}

async function ensureUserProfileDocument(
  user: User,
  overrides?: { displayName?: string; username?: string }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const publicRef = doc(db, 'publicProfiles', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data();
    return {
      uid: data.uid,
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      avatar: data.avatar || '',
      bio: data.bio || '',
      website: data.website || '',
      role: data.role || 'USER',
      status: data.status || 'ACTIVE',
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    };
  }

  const displayName =
    overrides?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'Engineer';
  const username = deriveSafeUsername(
    overrides?.username || user.email?.split('@')[0] || displayName,
    user.uid
  );
  const avatar = user.photoURL || '';
  const email = user.email || '';

  const batch = writeBatch(db);
  batch.set(userRef, {
    uid: user.uid,
    email,
    username,
    displayName,
    avatar,
    bio: '',
    website: '',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(publicRef, {
    uid: user.uid,
    username,
    displayName,
    avatar,
    bio: '',
    website: '',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
  }

  return {
    uid: user.uid,
    email,
    username,
    displayName,
    avatar,
    bio: '',
    website: '',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserProfileDocument(user);
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setProfile({
                uid: data.uid,
                email: data.email,
                username: data.username,
                displayName: data.displayName,
                avatar: data.avatar || '',
                bio: data.bio || '',
                website: data.website || '',
                role: data.role || 'USER',
                status: data.status || 'ACTIVE',
                createdAt: serializeTimestamp(data.createdAt),
                updatedAt: serializeTimestamp(data.updatedAt),
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('Profile listener error:', error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Failed to sync user profile:', error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isBootstrapAdmin =
    Boolean(firebaseUser?.emailVerified) &&
    firebaseUser?.email === SITE_CONFIG.bootstrapAdminEmail;

  const effectiveRole: UserRole = isBootstrapAdmin
    ? 'ADMIN'
    : profile?.role || 'USER';

  const isAdmin = effectiveRole === 'ADMIN';
  const isEditor = effectiveRole === 'ADMIN' || effectiveRole === 'EDITOR';

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserProfileDocument(credential.user);
  }, []);

  const registerWithEmail = useCallback(
    async ({
      email,
      password,
      displayName,
      username,
    }: {
      email: string;
      password: string;
      displayName: string;
      username: string;
    }) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      await ensureUserProfileDocument(credential.user, {
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
      });
      await sendEmailVerification(credential.user).catch(() => undefined);
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    await ensureUserProfileDocument(credential.user);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('You must be signed in to verify your email.');
    }
    await sendEmailVerification(auth.currentUser);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setFirebaseUser({ ...auth.currentUser } as User);
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      setProfile({
        uid: data.uid,
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar || '',
        bio: data.bio || '',
        website: data.website || '',
        role: data.role || 'USER',
        status: data.status || 'ACTIVE',
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      });
    }
  }, []);

  // Ensure bootstrap admin marker document exists if verified bootstrap admin logs in
  useEffect(() => {
    if (isBootstrapAdmin && firebaseUser) {
      setDoc(
        doc(db, 'admins', firebaseUser.uid),
        { uid: firebaseUser.uid, email: firebaseUser.email, grantedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => undefined);
    }
  }, [isBootstrapAdmin, firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin,
        isEditor,
        effectiveRole,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resendVerificationEmail,
        sendPasswordReset,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
