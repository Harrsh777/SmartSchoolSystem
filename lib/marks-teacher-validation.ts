import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchTeachingByClass,
  staffTeachesSubject,
  type TeachingByClassMap,
} from '@/lib/teacher-timetable-teaching';

export async function loadTeachingMap(
  supabase: SupabaseClient,
  schoolCode: string,
  staffId: string
): Promise<TeachingByClassMap> {
  return fetchTeachingByClass(supabase, schoolCode, staffId);
}

export function assertTeacherSubjectScope(
  map: TeachingByClassMap,
  classId: string,
  subjectIds: string[]
): { ok: true } | { ok: false; forbidden: string[] } {
  const forbidden = subjectIds.filter((sid) => !staffTeachesSubject(map, classId, sid));
  if (forbidden.length > 0) return { ok: false, forbidden };
  return { ok: true };
}
