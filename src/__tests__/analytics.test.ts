import { describe, it, expect, vi } from 'vitest';
import { getTrafficAnalytics } from '@/modules/analytics/analytics-service';
import type { UserProfile } from '@/types';

// Mock firestore query methods to avoid needing an emulator for unit test
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    getDocs: vi.fn().mockResolvedValue({
      forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
        // Mock 2 sample visit records
        const sampleVisits = [
          {
            id: 'visit_1',
            path: '/learn',
            visitorId: 'vid_user_1',
            userId: 'uid_1',
            userEmail: 'student@example.com',
            userName: 'Aarav Student',
            device: 'desktop',
            timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
          },
          {
            id: 'visit_2',
            path: '/about',
            visitorId: 'vid_guest_2',
            userId: null,
            userEmail: null,
            userName: null,
            device: 'mobile',
            timestamp: Date.now() - 30 * 60 * 1000, // 30m ago
          },
        ];
        sampleVisits.forEach((v) =>
          callback({
            id: v.id,
            data: () => v,
          })
        );
      },
      docs: [],
    }),
  };
});

describe('Traffic Analytics Service', () => {
  const mockUsers: UserProfile[] = [
    {
      uid: 'user_1',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatar: '',
      bio: '',
      website: '',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uid: 'user_old',
      email: 'old@example.com',
      username: 'olduser',
      displayName: 'Old User',
      avatar: '',
      bio: '',
      website: '',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('aggregates 24hr timeframe with 24 hourly time buckets', async () => {
    const report = await getTrafficAnalytics('24h', mockUsers);

    expect(report.timeframe).toBe('24h');
    expect(report.timeframeLabel).toContain('24 Hours');
    expect(report.timeSeries.length).toBe(24);
    expect(report.totalVisits).toBe(2);
    expect(report.uniqueVisitors).toBe(2);
    expect(report.newSignups).toBe(1); // Only user_1 created in last 24h
    expect(report.topPages.length).toBeGreaterThanOrEqual(1);
    expect(report.deviceBreakdown.desktop).toBe(1);
    expect(report.deviceBreakdown.mobile).toBe(1);
  });

  it('aggregates 30d timeframe with 30 daily time buckets', async () => {
    const report = await getTrafficAnalytics('30d', mockUsers);

    expect(report.timeframe).toBe('30d');
    expect(report.timeSeries.length).toBe(30);
    expect(report.newSignups).toBe(1);
  });

  it('aggregates 90d (3 month) timeframe with 13 weekly buckets', async () => {
    const report = await getTrafficAnalytics('90d', mockUsers);

    expect(report.timeframe).toBe('90d');
    expect(report.timeSeries.length).toBe(13);
    expect(report.newSignups).toBe(2); // Both users within 90 days
  });
});
