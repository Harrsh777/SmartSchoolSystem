import { getServiceRoleClient } from '@/lib/supabase-admin';
import { assertTeacherSubjectScope, loadTeachingMap } from '@/lib/marks-teacher-validation';
import { isStaffClassTeacherForClass } from '@/lib/staff-class-teacher';

function isElevatedSchoolStaff(role: string | null, designation: string | null): boolean {
  const r = (role || '').toLowerCase();
  const d = (designation || '').toLowerCase();
  return (
    r.includes('principal') ||
    r.includes('vice principal') ||
    r.includes('admin') ||
    d.includes('principal') ||
    d.includes('admin')
  );
}

/**
 * When teacher_copy_scoped is true (teacher portal), require class teacher, timetable subject, or elevated role.
 * When false (admin dashboard), only staff must belong to the school.
 */
export async function assertCopyCheckingWriteAllowed(
  schoolCode: string,
  staffId: string,
  classId: string,
  subjectId: string,
  teacherCopyScoped: boolean
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = getServiceRoleClient();
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, school_code, role, designation')
    .eq('id', staffId)
    .maybeSingle();

  if (error || !staff || String(staff.school_code) !== schoolCode) {
    return { ok: false, status: 403, error: 'Invalid staff for this school.' };
  }

  if (!teacherCopyScoped) {
    return { ok: true };
  }

  if (isElevatedSchoolStaff(staff.role as string | null, staff.designation as string | null)) {
    return { ok: true };
  }

  const isCt = await isStaffClassTeacherForClass(supabase, schoolCode, staffId, classId);
  if (isCt) {
    return { ok: true };
  }

  const map = await loadTeachingMap(supabase, schoolCode, staffId);
  const gate = assertTeacherSubjectScope(map, classId, [subjectId]);
  if (!gate.ok) {
    return {
      ok: false,
      status: 403,
      error:
        'You can only record copy checking for your assigned class (as class teacher) or for subjects you teach on the timetable.',
    };
  }

  return { ok: true };
}
