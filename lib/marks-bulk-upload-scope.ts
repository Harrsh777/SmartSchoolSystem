import type { SupabaseClient } from '@supabase/supabase-js';
import { checkStaffPermission } from '@/lib/permission-middleware';
import { assertTeacherSubjectScope, loadTeachingMap } from '@/lib/marks-teacher-validation';

async function hasExamManagementEdit(staffId: string): Promise<boolean> {
  for (const subKey of ['manage_exams', 'examinations'] as const) {
    const p = await checkStaffPermission(staffId, subKey, 'edit', 'edit');
    if (p.allowed) return true;
  }
  const v = await checkStaffPermission(staffId, 'view_exams', 'edit', 'edit');
  return v.allowed;
}

function isPrincipalishStaff(role: string | null, designation: string | null): boolean {
  const rn = `${role || ''} ${designation || ''}`.toLowerCase();
  return rn.includes('principal') || rn.includes('admin');
}

/**
 * Bulk template/upload: allow if staff belongs to school and either has exam edit RBAC,
 * matches principal-style role text, or teaches the class/subject on the timetable.
 */
export async function assertBulkMarksEntryAllowed(
  supabase: SupabaseClient,
  schoolCode: string,
  enteredBy: string,
  classId: string,
  subjectIds: string[]
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id, school_code, role, designation')
    .eq('id', enteredBy)
    .maybeSingle();

  if (staffErr || !staff || String(staff.school_code) !== schoolCode) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Invalid staff for this school.', code: 'STAFF_MISMATCH' },
    };
  }

  if (await hasExamManagementEdit(enteredBy)) {
    return { ok: true };
  }

  if (isPrincipalishStaff(staff.role as string | null, staff.designation as string | null)) {
    return { ok: true };
  }

  const teachingMap = await loadTeachingMap(supabase, schoolCode, enteredBy);
  const gate = assertTeacherSubjectScope(teachingMap, classId, subjectIds);
  if (!gate.ok) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'You cannot upload marks for this subject/class (not on your timetable).',
        forbidden_subjects: gate.forbidden,
        code: 'FORBIDDEN_SCOPE',
      },
    };
  }

  return { ok: true };
}
