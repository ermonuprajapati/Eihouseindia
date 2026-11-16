'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/auth-context';

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

    // Ignore automated Lighthouse audits, bots, and headless test runners
    if (
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /Chrome-Lighthouse|Googlebot|Headless/i.test(navigator.userAgent))
    ) {
      return;
    }

    const userInfo = firebaseUser
      ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: profile?.displayName || null,
        }
      : null;

    let fired = false;
    const triggerVisitLog = () => {
      if (fired) return;
      fired = true;
      lastRecordedRef.current = { path: pathname, time: Date.now() };
      import('@/modules/analytics/analytics-service')
        .then(({ recordSiteVisit }) => recordSiteVisit(pathname, userInfo))
        .catch(() => undefined);
    };

    const events = ['scroll', 'pointerdown', 'touchstart', 'keydown'] as const;
    const onInteract = () => {
      events.forEach((ev) => window.removeEventListener(ev, onInteract));
      triggerVisitLog();
    };

    events.forEach((ev) => window.addEventListener(ev, onInteract, { once: true, passive: true }));
    const timer = setTimeout(() => {
      events.forEach((ev) => window.removeEventListener(ev, onInteract));
      triggerVisitLog();
    }, 6500);

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, onInteract));
    };
  }, [pathname, firebaseUser, profile]);

  return null;
}
