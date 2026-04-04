import type { TeachingByClassMap } from '@/lib/teacher-timetable-teaching';
import { staffTeachesSubject } from '@/lib/teacher-timetable-teaching';

/**
 * One row per (class_id bucket, subject_id). First occurrence wins — removes JOIN/DB duplicates.
 * class_id null/empty uses key "__all__" (applies to all sections in the exam).
 */
export function dedupeExamSubjectMappings<T extends Record<string, unknown>>(
  mappings: T[] | null | undefined
): T[] {
  if (!mappings?.length) return [];
  const seen = new Map<string, T>();
  for (const m of mappings) {
    const raw = m.class_id;
    const cid =
      raw != null && String(raw).trim() !== '' ? String(raw) : '__all__';
    const sid = String(m.subject_id ?? '').trim();
    if (!sid) continue;
    const key = `${cid}|${sid}`;
    if (!seen.has(key)) seen.set(key, m);
  }
  return Array.from(seen.values());
}

function mappingAppliesToClass(m: Record<string, unknown>, classId: string): boolean {
  const raw = m.class_id;
  if (raw == null || String(raw).trim() === '') return true;
  return String(raw) === classId;
}

/**
 * Mappings the staff may enter: timetable subject for that section, OR any subject if they are class teacher for that section.
 */
export function filterSubjectMappingsForStaff<T extends Record<string, unknown>>(
  mappings: T[],
  teaching: TeachingByClassMap,
  examClassIds: string[],
  classTeacherClassIds: Set<string>
): T[] {
  const classSet = new Set(examClassIds.filter(Boolean));
  return mappings.filter((m) => {
    const sid = String(m.subject_id ?? '').trim();
    if (!sid) return false;
    for (const cid of classSet) {
      if (!mappingAppliesToClass(m, cid)) continue;
      if (staffTeachesSubject(teaching, cid, sid)) return true;
      if (classTeacherClassIds.has(cid)) return true;
    }
    return false;
  });
}
