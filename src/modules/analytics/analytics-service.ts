import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/types';

export type TimeframeFilter = '24h' | '30d' | '90d';

export interface SiteVisitRecord {
  id: string;
  path: string;
  visitorId: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  device: 'desktop' | 'mobile' | 'tablet';
  timestamp: number;
}

export interface TimeSeriesBucket {
  label: string;
  timestamp: number;
  visits: number;
  uniqueUsers: number;
}

export interface PageStat {
  path: string;
  visits: number;
  percentage: number;
}

export interface TrafficAnalyticsReport {
  timeframe: TimeframeFilter;
  timeframeLabel: string;
  totalVisits: number;
  uniqueVisitors: number;
  newSignups: number;
  registeredVisits: number;
  guestVisits: number;
  memberRatioPercentage: number;
  topPages: PageStat[];
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
    desktopPct: number;
    mobilePct: number;
    tabletPct: number;
  };
  timeSeries: TimeSeriesBucket[];
  recentVisits: SiteVisitRecord[];
}

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'tablet';
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    ) ||
    width < 768
  ) {
    return 'mobile';
  }
  return 'desktop';
}

function getOrSetVisitorId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    const existing = localStorage.getItem('eih_vid');
    if (existing && existing.length >= 10) {
      return existing;
    }
    const created = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('eih_vid', created);
    return created;
  } catch {
    return `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

// In-memory cache to prevent duplicate visit logging within 6 seconds on identical path
let lastLoggedPath = '';
let lastLoggedTime = 0;

export async function recordSiteVisit(
  path: string,
  user?: { uid: string; email?: string | null; displayName?: string | null } | null
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Ignore admin and internal API endpoints
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.includes('.')
  ) {
    return;
  }

  // Throttle duplicate page hit
  const now = Date.now();
  if (path === lastLoggedPath && now - lastLoggedTime < 6000) {
    return;
  }
  lastLoggedPath = path;
  lastLoggedTime = now;

  const visitorId = getOrSetVisitorId();
  const device = detectDevice();
  const visitId = `visit_${now}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await setDoc(doc(db, 'siteVisits', visitId), {
      id: visitId,
      path: path.slice(0, 180),
      visitorId,
      userId: user?.uid || null,
      userEmail: user?.email ? user.email.slice(0, 120) : null,
      userName: user?.displayName ? user.displayName.slice(0, 80) : null,
      device,
      timestamp: now,
      visitedAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function getTrafficAnalytics(
  timeframe: TimeframeFilter,
  allUsers: UserProfile[] = []
): Promise<TrafficAnalyticsReport> {
  const now = Date.now();
  let startTime = now - 24 * 60 * 60 * 1000;
  let timeframeLabel = 'Last 24 Hours';

  if (timeframe === '30d') {
    startTime = now - 30 * 24 * 60 * 60 * 1000;
    timeframeLabel = 'Last 30 Days';
  } else if (timeframe === '90d') {
    startTime = now - 90 * 24 * 60 * 60 * 1000;
    timeframeLabel = 'Last 3 Months (90 Days)';
  }

  const rawVisits: SiteVisitRecord[] = [];

  try {
    // Attempt Firestore index query
    const visitsQuery = query(
      collection(db, 'siteVisits'),
      where('timestamp', '>=', startTime),
      orderBy('timestamp', 'desc'),
      limit(1500)
    );
    const snap = await getDocs(visitsQuery);
    snap.forEach((d) => {
      const data = d.data();
      rawVisits.push({
        id: data.id || d.id,
        path: data.path || '/',
        visitorId: data.visitorId || 'unknown',
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        device: data.device || 'desktop',
        timestamp: Number(data.timestamp || 0),
      });
    });
  } catch {
    // Fallback: query without compound orderBy in case composite index is building
    try {
      const fallbackQuery = query(collection(db, 'siteVisits'), limit(1500));
      const snap = await getDocs(fallbackQuery);
      snap.forEach((d) => {
        const data = d.data();
        const ts = Number(data.timestamp || 0);
        if (ts >= startTime) {
          rawVisits.push({
            id: data.id || d.id,
            path: data.path || '/',
            visitorId: data.visitorId || 'unknown',
            userId: data.userId || null,
            userEmail: data.userEmail || null,
            userName: data.userName || null,
            device: data.device || 'desktop',
            timestamp: ts,
          });
        }
      });
      rawVisits.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      // In case collection is empty
    }
  }

  // Calculate unique visitors
  const uniqueVisitorIds = new Set<string>();
  const pageHits: Record<string, number> = {};
  let registeredVisits = 0;
  let guestVisits = 0;
  let desktopCount = 0;
  let mobileCount = 0;
  let tabletCount = 0;

  for (const v of rawVisits) {
    uniqueVisitorIds.add(v.visitorId || v.userId || v.id);
    pageHits[v.path] = (pageHits[v.path] || 0) + 1;

    if (v.userId) {
      registeredVisits++;
    } else {
      guestVisits++;
    }

    if (v.device === 'mobile') mobileCount++;
    else if (v.device === 'tablet') tabletCount++;
    else desktopCount++;
  }

  const totalVisits = rawVisits.length;
  const uniqueVisitors = uniqueVisitorIds.size;

  // New user registrations in this timeframe
  const newSignups = allUsers.filter((u) => {
    const createdMs = u.createdAt ? new Date(u.createdAt).getTime() : 0;
    return createdMs >= startTime;
  }).length;

  // Top Pages
  const topPages: PageStat[] = Object.entries(pageHits)
    .map(([path, count]) => ({
      path,
      visits: count,
      percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  // Device breakdown
  const deviceTotal = desktopCount + mobileCount + tabletCount || 1;
  const deviceBreakdown = {
    desktop: desktopCount,
    mobile: mobileCount,
    tablet: tabletCount,
    desktopPct: totalVisits > 0 ? Math.round((desktopCount / deviceTotal) * 100) : 0,
    mobilePct: totalVisits > 0 ? Math.round((mobileCount / deviceTotal) * 100) : 0,
    tabletPct: totalVisits > 0 ? Math.round((tabletCount / deviceTotal) * 100) : 0,
  };

  // Time Series Buckets for Bar Chart
  const timeSeries: TimeSeriesBucket[] = [];

  if (timeframe === '24h') {
    // 24 one-hour buckets
    const bucketDuration = 60 * 60 * 1000;
    for (let i = 23; i >= 0; i--) {
      const bucketStart = now - (i + 1) * bucketDuration;
      const bucketEnd = now - i * bucketDuration;
      const bucketDate = new Date(bucketEnd);
      const label = bucketDate.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });

      const inBucket = rawVisits.filter((v) => v.timestamp >= bucketStart && v.timestamp < bucketEnd);
      const bucketUniq = new Set(inBucket.map((v) => v.visitorId)).size;

      timeSeries.push({
        label,
        timestamp: bucketEnd,
        visits: inBucket.length,
        uniqueUsers: bucketUniq,
      });
    }
  } else if (timeframe === '30d') {
    // 30 one-day buckets
    const bucketDuration = 24 * 60 * 60 * 1000;
    for (let i = 29; i >= 0; i--) {
      const bucketStart = now - (i + 1) * bucketDuration;
      const bucketEnd = now - i * bucketDuration;
      const bucketDate = new Date(bucketEnd);
      const label = bucketDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      const inBucket = rawVisits.filter((v) => v.timestamp >= bucketStart && v.timestamp < bucketEnd);
      const bucketUniq = new Set(inBucket.map((v) => v.visitorId)).size;

      timeSeries.push({
        label,
        timestamp: bucketEnd,
        visits: inBucket.length,
        uniqueUsers: bucketUniq,
      });
    }
  } else {
    // 90d: 12 weekly buckets
    const bucketDuration = 7 * 24 * 60 * 60 * 1000;
    for (let i = 12; i >= 0; i--) {
      const bucketStart = now - (i + 1) * bucketDuration;
      const bucketEnd = now - i * bucketDuration;
      const bucketDate = new Date(bucketEnd);
      const label = `Wk ${bucketDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

      const inBucket = rawVisits.filter((v) => v.timestamp >= bucketStart && v.timestamp < bucketEnd);
      const bucketUniq = new Set(inBucket.map((v) => v.visitorId)).size;

      timeSeries.push({
        label,
        timestamp: bucketEnd,
        visits: inBucket.length,
        uniqueUsers: bucketUniq,
      });
    }
  }

  const memberRatioPercentage = totalVisits > 0 ? Math.round((registeredVisits / totalVisits) * 100) : 0;

  return {
    timeframe,
    timeframeLabel,
    totalVisits,
    uniqueVisitors,
    newSignups,
    registeredVisits,
    guestVisits,
    memberRatioPercentage,
    topPages,
    deviceBreakdown,
    timeSeries,
    recentVisits: rawVisits.slice(0, 20),
  };
}
