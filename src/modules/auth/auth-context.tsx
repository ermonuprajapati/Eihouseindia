'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

function getCachedProfile(uid: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`eihouse_profile_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedProfile(uid: string, profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`eihouse_profile_${uid}`, JSON.stringify(profile));
  } catch {
    // Ignore quota errors
  }
}

function clearCachedProfile(uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      localStorage.removeItem(`eihouse_profile_${uid}`);
    } else {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('eihouse_profile_')) localStorage.removeItem(k);
      });
    }
  } catch {
    // Ignore
  }
}

const welcomedUsers = new Set<string>();

function sendWelcomeEmailNotice(email: string, displayName: string, uid: string) {
  if (typeof window === 'undefined' || !email) return;

  if (welcomedUsers.has(uid)) return;
  welcomedUsers.add(uid);

  try {
    const storageKey = `eihouse_welcome_sent_${uid}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
  } catch {
    // ignore local storage restrictions in strict/private mode
  }

  fetch('/api/notifications/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      event: 'WELCOME',
      recipientName: displayName,
    }),
  }).catch((err) => {
    console.warn('Welcome email notification dispatch failed:', err);
  });
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
  const cleanUid = uid.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8) || 'user';
  return `eng_${cleanUid}`.slice(0, 24);
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
    console.warn('Could not read user profile from Firestore:', error);
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

  let displayName =
    overrides?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'Engineer';
  if (displayName.length < 2) {
    displayName = `${displayName || 'User'}_`;
  }
  if (displayName.length > 80) {
    displayName = displayName.slice(0, 80);
  }

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
    console.warn('Could not write user profile to Firestore:', error);
  }

  // Send branded welcome email on first time registration / Google sign-in
  if (email) {
    sendWelcomeEmailNotice(email, displayName, user.uid);
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
    // Only query redirect result if a redirect sign-in was actually initiated,
    // avoiding the expensive apis.google.com iframe overhead on standard page views.
    if (typeof window === 'undefined') return;
    const isRedirectPending = sessionStorage.getItem('firebase_auth_redirect');
    if (!isRedirectPending) return;

    sessionStorage.removeItem('firebase_auth_redirect');
    getRedirectResult(auth)
      .then((credential) => {
        if (credential?.user) {
          ensureUserProfileDocument(credential.user).catch((e) =>
            console.warn('Redirect profile sync error:', e)
          );
        }
      })
      .catch((error) => {
        console.warn('Redirect sign-in error:', error);
      });
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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

      // Step 1: INSTANT HYDRATION - Load local cache immediately (0ms delay)
      const cached = getCachedProfile(user.uid);
      if (cached) {
        setProfile(cached);
        setLoading(false);
      }

      // Step 2: Background sync with Firestore
      try {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const updatedProfile: UserProfile = {
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
              setProfile(updatedProfile);
              setCachedProfile(user.uid, updatedProfile);
              setLoading(false);
            } else {
              // Create user profile document if this is a fresh account
              ensureUserProfileDocument(user)
                .then((createdProfile) => {
                  setProfile(createdProfile);
                  setCachedProfile(user.uid, createdProfile);
                  setLoading(false);
                })
                .catch((e) => {
                  console.error('Failed to create user profile:', e);
                  setLoading(false);
                });
            }
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
    try {
      const credential = await signInWithPopup(auth, provider);
      await ensureUserProfileDocument(credential.user).catch((e) =>
        console.warn('Profile sync warning on Google login:', e)
      );
    } catch (popupError: unknown) {
      const code = (popupError as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        console.info('Google sign-in popup blocked; falling back to signInWithRedirect');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('firebase_auth_redirect', '1');
        }
        await signInWithRedirect(auth, provider);
        return;
      }
      throw popupError;
    }
  }, []);

  const logout = useCallback(async () => {
    clearCachedProfile(firebaseUser?.uid);
    await firebaseSignOut(auth);
    setProfile(null);
  }, [firebaseUser?.uid]);

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
      const updatedProfile: UserProfile = {
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
      setProfile(updatedProfile);
      setCachedProfile(auth.currentUser.uid, updatedProfile);
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
