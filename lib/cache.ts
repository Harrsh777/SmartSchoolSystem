/**
 * Cache-first helper for School ERP.
 * Pattern: Redis read → on miss, fetch from Supabase (via fetcher) → set in Redis with TTL → return.
 * All writes to persisted data must invalidate cache (see invalidateCache).
 *
 * Key format: <domain>:<entity>:<identifier>  e.g. dashboard:student:123, auth:role:teacher_99
 */

import { redisGet, redisSet, redisDel, redisDelByPattern } from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/** Hard cap on cache read wait so API routes always return even if Redis hangs. */
const REDIS_READ_BUDGET_MS = 3500;

async function redisGetBudgeted(key: string): Promise<string | null> {
  return Promise.race([
    redisGet(key),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), REDIS_READ_BUDGET_MS)),
  ]);
}

/**
 * Cache-first get. Returns cached value or calls fetcher and caches result.
 * If Redis is down or slow, always calls fetcher and returns (cache write is best-effort).
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlSeconds?: number; serialize?: (v: T) => string; deserialize?: (s: string) => T } = {}
): Promise<T> {
  const { ttlSeconds = DEFAULT_TTL_SECONDS, serialize = JSON.stringify, deserialize = JSON.parse } = options;

  const raw = await redisGetBudgeted(key);
  if (raw !== null) {
    try {
      return deserialize(raw) as T;
    } catch {
      // Invalid cached value; fall through to fetcher
    }
  }

  const data = await fetcher();
  const toStore = serialize(data);
  /** Never block the HTTP response on Redis SET (flaky connections caused infinite “loading”). */
  void redisSet(key, toStore, ttlSeconds);
  return data;
}

/**
 * Invalidate a single key. Call after any write that affects that resource.
 */
export async function invalidateCache(key: string): Promise<void> {
  await redisDel(key);
}

/**
 * Invalidate by pattern. E.g. invalidateCachePattern('dashboard:student:*') after student update.
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  return redisDelByPattern(pattern);
}

/**
 * Predefined key builders (follows <domain>:<entity>:<identifier>).
 */
/** TTL (seconds) for school dashboard API read-through cache (Redis off → ignored). */
export const DASHBOARD_REDIS_TTL = {
  stats: 90,
  statsDetailed: 120,
  financialOverview: 90,
  administrative: 60,
  classes: 180,
  timetableList: 180,
  calendarAcademic: 240,
  studentsDirectory: 75,
  feesV2Dashboard: 90,
  /** Class or teacher timetable payload (heavy joins). */
  timetableSlots: 120,
  /** Today’s agenda includes todos — keep short. */
  timetableDailyAgenda: 45,
  dashboardTerms: 300,
  dashboardExaminations: 120,
  academicYearsList: 300,
  feesClassWiseReport: 120,
  studentPortalStats: 90,
  studentsCounts: 75,
  transportStudents: 120,
  financeOverview: 90,
} as const;

export const cacheKeys = {
  dashboard: (role: string, userId: string) => `dashboard:${role}:${userId}`,
  authRole: (userId: string) => `auth:role:${userId}`,
  attendance: (date: string, classId: string) => `attendance:${date}:${classId}`,
  feesSummary: (studentId: string) => `fees:summary:${studentId}`,
  notificationsCount: (userId: string) => `notifications:count:${userId}`,
  rate: (ip: string, route: string) => `rate:${ip}:${route}`,
  /** Main dashboard KPIs; `day` = YYYY-MM-DD (attendance / fee “today” slice). */
  dashboardStats: (schoolCode: string, academicYear: string | null, day: string) =>
    `dash:stats:v1:${schoolCode}:${academicYear ?? '_'}:${day}`,
  dashboardStatsDetailed: (schoolCode: string, academicYear: string | null, day: string) =>
    `dash:detailed:v1:${schoolCode}:${academicYear ?? '_'}:${day}`,
  /** `day` = end-date string so till_date refreshes daily. */
  dashboardFinancial: (schoolCode: string, period: string, day: string) =>
    `dash:fin:v1:${schoolCode}:${period}:${day}`,
  dashboardAdministrative: (schoolCode: string, day: string) => `dash:admin:v1:${schoolCode}:${day}`,
  schoolClasses: (schoolCode: string) => `dash:classes:v1:${schoolCode}`,
  timetableList: (schoolCode: string) => `dash:ttlist:v1:${schoolCode}`,
  calendarAcademic: (schoolCode: string, academicYear: string | null, includeEvents: boolean) =>
    `dash:cal:v1:${schoolCode}:${academicYear ?? '_'}:e${includeEvents ? 1 : 0}`,
  studentsList: (schoolCode: string, fingerprint: string) =>
    `dash:students:v1:${schoolCode}:${fingerprint}`,
  studentsCounts: (schoolCode: string, academicYear: string | null) =>
    `students:counts:v1:${schoolCode}:${academicYear ?? '_'}`,
  /** Invalidate all cached student-directory pages for a school (after create/update). */
  studentsListPattern: (schoolCode: string) => `dash:students:v1:${schoolCode}:*`,
  studentsCountsPattern: (schoolCode: string) => `students:counts:v1:${schoolCode}:*`,
  transportStudents: (schoolCode: string, routeId: string | null) =>
    `transport:students:v1:${schoolCode}:${routeId ?? '_'}`,
  transportStudentsPattern: (schoolCode: string) => `transport:students:v1:${schoolCode}:*`,
  financeOverview: (
    schoolCode: string,
    financialYearId: string | null,
    month: string | null
  ) => `finance:overview:v1:${schoolCode}:${financialYearId ?? '_'}:${month ?? '_'}`,
  feesV2Dashboard: (schoolCode: string, day: string) => `dash:fees2:v1:${schoolCode}:${day}`,
  /** Timetable slots: by class_id, teacher_id, or school-wide empty-class query. */
  timetableSlots: (schoolCode: string, classId: string | null, teacherId: string | null) =>
    `tt:slots:v1:${schoolCode}:${
      classId ? `c:${classId}` : teacherId ? `t:${teacherId}` : 'wide'
    }`,
  timetableDailyAgenda: (schoolCode: string, teacherId: string, day: string) =>
    `tt:agenda:v1:${schoolCode}:${teacherId}:${day}`,
  dashboardTerms: (
    schoolCode: string,
    classId: string | null,
    section: string | null,
    includeDeleted: boolean
  ) =>
    `dash:terms:v1:${schoolCode}:${classId ?? '_'}:${section ?? '_'}:${includeDeleted ? 1 : 0}`,
  /** `dayBucket` = YYYY-MM-DD when `status === 'upcoming'`, else `all`. */
  dashboardExaminations: (
    schoolCode: string,
    classId: string | null,
    status: string | null,
    dayBucket: string
  ) => `dash:exams:v1:${schoolCode}:${classId ?? '_'}:${status ?? '_'}:${dayBucket}`,
  academicYearsSchool: (schoolCode: string) => `dash:ayears:v1:${schoolCode}`,
  feesClassWise: (schoolCode: string, endDay: string) => `dash:feescls:v1:${schoolCode}:${endDay}`,
  /** Student home stats; `monthKey` = YYYY-MM (rolling month boundaries). */
  studentStats: (schoolCode: string, studentId: string, monthKey: string) =>
    `stu:stats:v1:${schoolCode}:${studentId}:${monthKey}`,
};

/** After any timetable slot write, drop slots/agenda/list cache for that school. */
export async function invalidateTimetableSchoolCaches(schoolCode: string): Promise<void> {
  await Promise.all([
    invalidateCachePattern(`tt:slots:v1:${schoolCode}:*`),
    invalidateCachePattern(`tt:agenda:v1:${schoolCode}:*`),
    invalidateCache(cacheKeys.timetableList(schoolCode)),
  ]);
}
