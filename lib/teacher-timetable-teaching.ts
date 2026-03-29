import type { SupabaseClient } from '@supabase/supabase-js';

/** class_id → subject_ids the staff teaches on the class timetable */
export type TeachingByClassMap = Map<string, Set<string>>;

function staffAssignedToSlot(
  slot: { teacher_id?: string | null; teacher_ids?: string[] | null },
  staffId: string
): boolean {
  if (slot.teacher_id === staffId) return true;
  const arr = slot.teacher_ids;
  return Array.isArray(arr) && arr.includes(staffId);
}

function resolveSlotClassId(slot: {
  class_id?: string | null;
  class_reference?: { class_id?: string } | Record<string, unknown> | null;
}): string | null {
  if (slot.class_id) return String(slot.class_id);
  const ref = slot.class_reference;
  if (ref && typeof ref === 'object' && ref !== null && 'class_id' in ref && ref.class_id) {
    return String((ref as { class_id: string }).class_id);
  }
  return null;
}

/**
 * Resolve teaching assignments from timetable_slots (class + subject + teacher).
 * Reassignment: only current timetable rows count — old teacher loses access once removed from slots.
 */
export async function fetchTeachingByClass(
  supabase: SupabaseClient,
  schoolCode: string,
  staffId: string
): Promise<TeachingByClassMap> {
  const map: TeachingByClassMap = new Map();
  const { data: slots, error } = await supabase
    .from('timetable_slots')
    .select('class_id, subject_id, teacher_id, teacher_ids, class_reference')
    .eq('school_code', schoolCode)
    .not('subject_id', 'is', null);

  if (error || !slots?.length) return map;

  for (const raw of slots) {
    const slot = raw as Record<string, unknown>;
    if (
      !staffAssignedToSlot(
        {
          teacher_id: slot.teacher_id as string | null,
          teacher_ids: slot.teacher_ids as string[] | null,
        },
        staffId
      )
    ) {
      continue;
    }
    const classId = resolveSlotClassId({
      class_id: slot.class_id as string | null,
      class_reference: slot.class_reference as { class_id?: string } | null,
    });
    const subjectId = slot.subject_id ? String(slot.subject_id) : null;
    if (!classId || !subjectId) continue;
    if (!map.has(classId)) map.set(classId, new Set());
    map.get(classId)!.add(subjectId);
  }
  return map;
}

export function teachingMapToRecord(m: TeachingByClassMap): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of m) {
    out[k] = Array.from(v);
  }
  return out;
}

export function staffTeachesSubject(
  m: TeachingByClassMap,
  classId: string,
  subjectId: string
): boolean {
  return m.get(classId)?.has(subjectId) ?? false;
}
