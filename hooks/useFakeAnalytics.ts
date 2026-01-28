'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/** Clamp value to range [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Small random delta: -1, 0, or +1 for smooth changes */
function smoothDelta(): number {
  return Math.floor(Math.random() * 3) - 1;
}

export interface FakeKpis {
  activeUsersNow: number;
  sessionsToday: number;
  pageViewsToday: number;
  avgSessionDuration: number; // minutes 1-9
  bounceRate: number; // 5-40%
  trends: {
    activeUsersNow: 'up' | 'down' | 'stable';
    sessionsToday: 'up' | 'down' | 'stable';
    pageViewsToday: 'up' | 'down' | 'stable';
    avgSessionDuration: 'up' | 'down' | 'stable';
    bounceRate: 'up' | 'down' | 'stable';
  };
}

export interface UsersOnline {
  total: number;
  students: number;
  staff: number;
  admins: number;
}

export interface PageAnalyticsRow {
  pageName: string;
  path: string;
  activeUsers: number;
  sessionsToday: number;
  avgTimeMin: number;
}

export interface DeviceUsage {
  mobile: number;
  desktop: number;
}

export interface LocationItem {
  name: string;
  value: number;
}

export interface BrowserItem {
  name: string;
  value: number;
}

// Initial seed values (single/double digit, realistic)
const INITIAL_KPIS: FakeKpis = {
  activeUsersNow: 12,
  sessionsToday: 47,
  pageViewsToday: 68,
  avgSessionDuration: 4,
  bounceRate: 22,
  trends: { activeUsersNow: 'stable', sessionsToday: 'stable', pageViewsToday: 'stable', avgSessionDuration: 'stable', bounceRate: 'stable' },
};

const INITIAL_USERS_ONLINE: UsersOnline = { total: 8, students: 4, staff: 3, admins: 1 };

const PAGE_PATHS = [
  { pageName: 'Login', path: '/login' },
  { pageName: 'Dashboard', path: '/dashboard' },
  { pageName: 'Students', path: '/students' },
  { pageName: 'Staff', path: '/staff' },
  { pageName: 'Fees', path: '/fees' },
  { pageName: 'Reports', path: '/reports' },
  { pageName: 'Settings', path: '/settings' },
] as const;

function initialPageAnalytics(): PageAnalyticsRow[] {
  return PAGE_PATHS.map((p, i) => ({
    ...p,
    activeUsers: clamp(2 + (i % 5), 1, 9),
    sessionsToday: clamp(8 + i * 4 + (i % 3), 5, 40),
    avgTimeMin: clamp(2 + (i % 5), 1, 8),
  }));
}

const INITIAL_DEVICE: DeviceUsage = { mobile: 58, desktop: 42 };
const INITIAL_LOCATIONS: LocationItem[] = [
  { name: 'India', value: 78 },
  { name: 'United States', value: 9 },
  { name: 'United Kingdom', value: 6 },
  { name: 'UAE', value: 4 },
];
const INITIAL_BROWSERS: BrowserItem[] = [
  { name: 'Chrome', value: 62 },
  { name: 'Safari', value: 18 },
  { name: 'Edge', value: 12 },
  { name: 'Firefox', value: 8 },
];

export function useFakeAnalytics() {
  const [kpis, setKpis] = useState<FakeKpis>(INITIAL_KPIS);
  const [usersOnline, setUsersOnline] = useState<UsersOnline>(INITIAL_USERS_ONLINE);
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsRow[]>(initialPageAnalytics());
  const [deviceUsage, setDeviceUsage] = useState<DeviceUsage>(INITIAL_DEVICE);
  const [locations, setLocations] = useState<LocationItem[]>(INITIAL_LOCATIONS);
  const [browsers, setBrowsers] = useState<BrowserItem[]>(INITIAL_BROWSERS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setKpis((prev) => {
      const d = smoothDelta();
      const activeUsersNow = clamp(prev.activeUsersNow + d, 1, 25);
      const d2 = smoothDelta();
      const sessionsToday = clamp(prev.sessionsToday + d2, 10, 99);
      const d3 = smoothDelta();
      const pageViewsToday = clamp(prev.pageViewsToday + d3, 20, 99);
      const d4 = smoothDelta();
      const avgSessionDuration = clamp(prev.avgSessionDuration + d4, 1, 9);
      const d5 = smoothDelta();
      const bounceRate = clamp(prev.bounceRate + d5, 5, 40);
      return {
        activeUsersNow,
        sessionsToday,
        pageViewsToday,
        avgSessionDuration,
        bounceRate,
        trends: {
          activeUsersNow: d > 0 ? 'up' : d < 0 ? 'down' : 'stable',
          sessionsToday: d2 > 0 ? 'up' : d2 < 0 ? 'down' : 'stable',
          pageViewsToday: d3 > 0 ? 'up' : d3 < 0 ? 'down' : 'stable',
          avgSessionDuration: d4 > 0 ? 'up' : d4 < 0 ? 'down' : 'stable',
          bounceRate: d5 > 0 ? 'up' : d5 < 0 ? 'down' : 'stable',
        },
      };
    });

    setUsersOnline((prev) => {
      const total = clamp(prev.total + smoothDelta(), 1, 15);
      // Breakdown that sums to total: students 1–9, staff 1–6, admins 1–3
      const students = clamp(Math.min(total - 2, Math.round(total * 0.55)), 1, 9);
      const staff = clamp(Math.min(total - students - 1, Math.round((total - students) * 0.65)), 1, 6);
      const admins = clamp(total - students - staff, 1, 3);
      return { total, students, staff, admins };
    });

    setPageAnalytics((prev) =>
      prev.map((row) => ({
        ...row,
        activeUsers: clamp(row.activeUsers + smoothDelta(), 1, 9),
        sessionsToday: clamp(row.sessionsToday + smoothDelta(), 5, 40),
        avgTimeMin: clamp(row.avgTimeMin + smoothDelta(), 1, 8),
      }))
    );

    setDeviceUsage((prev) => {
      const d = smoothDelta();
      const mobile = clamp(prev.mobile + d, 40, 70);
      const desktop = 100 - mobile;
      return { mobile, desktop: clamp(desktop, 30, 60) };
    });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [tick]);

  return {
    kpis,
    usersOnline,
    pageAnalytics,
    deviceUsage,
    locations,
    browsers,
  };
}
