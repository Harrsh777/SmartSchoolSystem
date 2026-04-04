import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns true when marks for this exam + class-section are locked (row present).
 * On query errors (e.g. table not migrated yet), returns false so writes keep working.
 */
export async function isExamClassMarksLocked(
  supabase: SupabaseClient,
  schoolCode: string,
  examId: string,
  classId: string
): Promise<boolean> {
  const sc = String(schoolCode || '').trim();
  const ex = String(examId || '').trim();
  const cl = String(classId || '').trim();
  if (!sc || !ex || !cl) return false;

  const { data, error } = await supabase
    .from('exam_class_marks_lock')
    .select('id')
    .eq('school_code', sc)
    .eq('exam_id', ex)
    .eq('class_id', cl)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[exam-marks-lock] lookup failed:', error.message);
    }
    return false;
  }
  return Boolean(data?.id);
}

export const MARKS_LOCKED_MESSAGE =
  'Marks for this examination and class are locked. Ask your school admin to unlock them from Marks Management.';
