'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { SITE_CONFIG } from '@/config/site';
import { isPhoneIdentifier, normalizePhoneNumber } from '@/lib/phone';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  effectiveRole: UserRole;
  loginWithEmail: (identifier: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    phone?: string;
    displayName?: string;
    username?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

type FirebaseDeps = {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  firebaseAuth: typeof import('firebase/auth');
  firebaseFirestore: typeof import('firebase/firestore');
};

let depsPromise: Promise<FirebaseDeps> | null = null;

function loadFirebaseDeps(): Promise<FirebaseDeps> {
  if (!depsPromise) {
    depsPromise = Promise.all([
      import('@/config/firebase'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([fbConfig, firebaseAuth, firebaseFirestore]) => ({
      auth: fbConfig.auth,
      db: fbConfig.db,
      firebaseAuth,
      firebaseFirestore,
    }));
  }
  return depsPromise;
}

function hasLikelyAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('firebase_auth_redirect')) return true;
    const path = window.location.pathname;
    if (path.startsWith('/auth') || path.startsWith('/dashboard') || path.startsWith('/admin')) {
      return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('eihouse_profile_') ||
          k.startsWith('firebase:') ||
          k === 'eihouse_has_auth')
      ) {
        return true;
      }
    }
  } catch {
    return true;
  }
  return false;
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
    localStorage.setItem('eihouse_has_auth', '1');
  } catch {
    // Ignore quota errors
  }
}

function clearCachedProfile(uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('eihouse_has_auth');
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
  overrides?: { displayName?: string; username?: string; phone?: string; phoneNormalized?: string }
): Promise<UserProfile> {
  const { db, firebaseFirestore } = await loadFirebaseDeps();
  const { doc, getDoc, writeBatch, serverTimestamp } = firebaseFirestore;

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
      phone: data.phone || '',
      phoneNormalized: data.phoneNormalized || '',
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
  const phone = overrides?.phone || '';
  const phoneNormalized = overrides?.phoneNormalized || '';

  const batch = writeBatch(db);
  batch.set(userRef, {
    uid: user.uid,
    email,
    phone,
    phoneNormalized,
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

  if (email) {
    sendWelcomeEmailNotice(email, displayName, user.uid);
  }

  return {
    uid: user.uid,
    email,
    phone,
    phoneNormalized,
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
    if (typeof window === 'undefined') return;
    const isRedirectPending = sessionStorage.getItem('firebase_auth_redirect');
    if (!isRedirectPending) return;

    sessionStorage.removeItem('firebase_auth_redirect');
    loadFirebaseDeps()
      .then(({ auth, firebaseAuth }) =>
        firebaseAuth.getRedirectResult(auth, firebaseAuth.browserPopupRedirectResolver)
      )
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
    let unsubscribeAuth: (() => void) | undefined;
    let cancelled = false;

    const startAuthListener = async () => {
      try {
        const { auth, db, firebaseAuth, firebaseFirestore } = await loadFirebaseDeps();
        if (cancelled) return;

        unsubscribeAuth = firebaseAuth.onAuthStateChanged(auth, (user) => {
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
            localStorage.setItem('eihouse_has_auth', '1');
          } catch {
            // ignore
          }

          // Step 1: INSTANT HYDRATION - Load local cache immediately
          const cached = getCachedProfile(user.uid);
          if (cached) {
            setProfile(cached);
            setLoading(false);
          }

          // Step 2: Background sync with Firestore
          try {
            const userRef = firebaseFirestore.doc(db, 'users', user.uid);
            unsubscribeProfile = firebaseFirestore.onSnapshot(
              userRef,
              (snapshot) => {
                if (snapshot.exists()) {
                  const data = snapshot.data();
                  const updatedProfile: UserProfile = {
                    uid: data.uid,
                    email: data.email,
                    phone: data.phone || '',
                    phoneNormalized: data.phoneNormalized || '',
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
      } catch {
        setLoading(false);
      }
    };

    if (hasLikelyAuthSession()) {
      startAuthListener();
      return () => {
        cancelled = true;
        if (unsubscribeAuth) unsubscribeAuth();
        if (unsubscribeProfile) unsubscribeProfile();
      };
    }

    // First-time anonymous visitor on a public route: unblock UI immediately
    // and only load Firebase Auth SDK upon user interaction.
    setLoading(false);

    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const onFirstInteract = () => {
      events.forEach((ev) => window.removeEventListener(ev, onFirstInteract));
      startAuthListener();
    };
    events.forEach((ev) =>
      window.addEventListener(ev, onFirstInteract, { once: true, passive: true })
    );

    return () => {
      cancelled = true;
      events.forEach((ev) => window.removeEventListener(ev, onFirstInteract));
      if (unsubscribeAuth) unsubscribeAuth();
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

  const loginWithEmail = useCallback(async (identifier: string, password: string) => {
    const { auth, firebaseAuth } = await loadFirebaseDeps();
    const rawIdentifier = identifier.trim();
    let targetEmail = rawIdentifier;

    if (isPhoneIdentifier(rawIdentifier)) {
      const res = await fetch('/api/auth/resolve-identifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: rawIdentifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.email) {
        throw new Error(data?.error || 'No account found with this mobile number.');
      }
      targetEmail = data.email;
    }

    const credential = await firebaseAuth.signInWithEmailAndPassword(auth, targetEmail, password);
    await ensureUserProfileDocument(credential.user);
  }, []);

  const registerWithEmail = useCallback(
    async ({
      email,
      password,
      phone,
      displayName,
      username,
    }: {
      email: string;
      password: string;
      phone?: string;
      displayName?: string;
      username?: string;
    }) => {
      let cleanPhone = '';
      let cleanNormalized = '';

      if (phone && phone.trim()) {
        const parsedPhone = normalizePhoneNumber(phone);
        if (!parsedPhone.valid) {
          throw new Error(parsedPhone.error || 'Please enter a valid mobile number.');
        }
        cleanPhone = parsedPhone.e164;
        cleanNormalized = parsedPhone.normalized;

        // Check if phone number is already registered before creating Firebase Auth account
        const checkRes = await fetch('/api/auth/check-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone }),
        });
        const checkData = await checkRes.json().catch(() => ({ available: true }));
        if (checkRes.status === 409 || checkData?.available === false) {
          throw new Error(checkData?.error || 'An account with this mobile number already exists.');
        }
      }

      const { auth, firebaseAuth } = await loadFirebaseDeps();
      const cleanEmail = email.trim().toLowerCase();
      const resolvedDisplayName = displayName?.trim() || cleanEmail.split('@')[0] || 'Engineer';

      const credential = await firebaseAuth.createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );
      await firebaseAuth.updateProfile(credential.user, { displayName: resolvedDisplayName });
      await ensureUserProfileDocument(credential.user, {
        displayName: resolvedDisplayName,
        username: username?.trim().toLowerCase(),
        phone: cleanPhone,
        phoneNormalized: cleanNormalized,
      });
      await firebaseAuth.sendEmailVerification(credential.user).catch(() => undefined);
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const { auth, firebaseAuth } = await loadFirebaseDeps();
    const provider = new firebaseAuth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const credential = await firebaseAuth.signInWithPopup(
        auth,
        provider,
        firebaseAuth.browserPopupRedirectResolver
      );
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
        await firebaseAuth.signInWithRedirect(
          auth,
          provider,
          firebaseAuth.browserPopupRedirectResolver
        );
        return;
      }
      throw popupError;
    }
  }, []);

  const logout = useCallback(async () => {
    const { auth, firebaseAuth } = await loadFirebaseDeps();
    clearCachedProfile(firebaseUser?.uid);
    await firebaseAuth.signOut(auth);
    setProfile(null);
  }, [firebaseUser?.uid]);

  const resendVerificationEmail = useCallback(async () => {
    const { auth, firebaseAuth } = await loadFirebaseDeps();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to verify your email.');
    }
    await firebaseAuth.sendEmailVerification(auth.currentUser);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { auth, firebaseAuth } = await loadFirebaseDeps();
    await firebaseAuth.sendPasswordResetEmail(auth, email.trim());
  }, []);

  const refreshProfile = useCallback(async () => {
    const { auth, db, firebaseFirestore } = await loadFirebaseDeps();
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setFirebaseUser({ ...auth.currentUser } as User);
    const snap = await firebaseFirestore.getDoc(
      firebaseFirestore.doc(db, 'users', auth.currentUser.uid)
    );
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

  useEffect(() => {
    if (isBootstrapAdmin && firebaseUser) {
      loadFirebaseDeps()
        .then(({ db, firebaseFirestore }) =>
          firebaseFirestore.setDoc(
            firebaseFirestore.doc(db, 'admins', firebaseUser.uid),
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              grantedAt: firebaseFirestore.serverTimestamp(),
            },
            { merge: true }
          )
        )
        .catch(() => undefined);
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

export function useOptionalAuth() {
  return useContext(AuthContext);
}
