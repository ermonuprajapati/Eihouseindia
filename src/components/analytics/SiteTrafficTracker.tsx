'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/auth-context';
import { recordSiteVisit } from '@/modules/analytics/analytics-service';

export function SiteTrafficTracker() {
  const pathname = usePathname();
  const { firebaseUser, profile } = useAuth();
  const lastRecordedRef = useRef<{ path: string; time: number }>({ path: '', time: 0 });

  useEffect(() => {
    if (!pathname) return;

    // Ignore internal admin, auth transitions, or static assets
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next')
    ) {
      return;
    }

    const now = Date.now();
    // Debounce identical navigation within 4 seconds
    if (
      lastRecordedRef.current.path === pathname &&
      now - lastRecordedRef.current.time < 4000
    ) {
      return;
    }

    lastRecordedRef.current = { path: pathname, time: now };

    const userInfo = firebaseUser
      ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: profile?.displayName || null,
        }
      : null;

    recordSiteVisit(pathname, userInfo).catch(() => undefined);
  }, [pathname, firebaseUser, profile]);

  return null;
}
