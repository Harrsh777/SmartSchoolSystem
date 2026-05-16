import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiaryTargetRow } from '@/lib/digital-diary-access';

export type DiaryStudentRow = {
  id: string;
  class?: string | null;
  section?: string | null;
  student_name?: string | null;
  admission_no?: string | null;
  roll_number?: string | null;
};

const STUDENT_SELECT = 'id, class, section, student_name, admission_no, roll_number';

function studentMatchesTarget(student: DiaryStudentRow, target: DiaryTargetRow): boolean {
  if (student.class !== target.class_name) return false;
  if (!target.section_name) return true;
  return student.section === target.section_name;
}

/**
 * Load active students for diary class/section targets.
 * Uses students.class + students.section (this project has no students.class_id / is_active).
 */
export async function fetchStudentsForDiaryTargets(
  supabase: SupabaseClient,
  schoolCode: string,
  targets: DiaryTargetRow[]
): Promise<{ students: DiaryStudentRow[]; error: string | null }> {
  if (targets.length === 0) return { students: [], error: null };

  const seen = new Set<string>();
  const students: DiaryStudentRow[] = [];

  const keys = new Map<string, DiaryTargetRow>();
  for (const target of targets) {
    const key = `${target.class_name}::${target.section_name ?? ''}`;
    if (!keys.has(key)) keys.set(key, target);
  }

  for (const target of keys.values()) {
    let q = supabase
      .from('students')
      .select(STUDENT_SELECT)
      .eq('school_code', schoolCode)
      .eq('status', 'active')
      .eq('class', target.class_name);

    if (target.section_name) {
      q = q.eq('section', target.section_name);
    }

    const { data, error } = await q;
    if (error) {
      return { students: [], error: error.message };
    }

    for (const row of (data || []) as DiaryStudentRow[]) {
      if (studentMatchesTarget(row, target) && !seen.has(row.id)) {
        seen.add(row.id);
        students.push(row);
      }
    }
  }

  return { students, error: null };
}

export function studentsForSingleDiaryTargets(
  allByKey: Map<string, DiaryStudentRow[]>,
  targets: DiaryTargetRow[]
): DiaryStudentRow[] {
  const seen = new Set<string>();
  const out: DiaryStudentRow[] = [];

  for (const target of targets) {
    const key = `${target.class_name}::${target.section_name ?? ''}`;
    const pool = allByKey.get(key) || [];
    for (const student of pool) {
      if (studentMatchesTarget(student, target) && !seen.has(student.id)) {
        seen.add(student.id);
        out.push(student);
      }
    }
  }

  return out;
}

/**
 * Batch-load students for many diaries (unique class/section per school).
 */
export async function fetchStudentsByClassSectionKeys(
  supabase: SupabaseClient,
  schoolCode: string,
  targets: DiaryTargetRow[]
): Promise<{ byKey: Map<string, DiaryStudentRow[]>; error: string | null }> {
  const byKey = new Map<string, DiaryStudentRow[]>();
  const keys = new Map<string, DiaryTargetRow>();
  for (const target of targets) {
    const key = `${target.class_name}::${target.section_name ?? ''}`;
    if (!keys.has(key)) keys.set(key, target);
  }

  for (const [key, target] of keys) {
    let q = supabase
      .from('students')
      .select(STUDENT_SELECT)
      .eq('school_code', schoolCode)
      .eq('status', 'active')
      .eq('class', target.class_name);

    if (target.section_name) {
      q = q.eq('section', target.section_name);
    }

    const { data, error } = await q;
    if (error) {
      return { byKey, error: error.message };
    }

    byKey.set(key, (data || []) as DiaryStudentRow[]);
  }

  return { byKey, error: null };
}
