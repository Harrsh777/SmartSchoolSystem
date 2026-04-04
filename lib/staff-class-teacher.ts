import type { SupabaseClient } from '@supabase/supabase-js';

/** True if this staff member is the assigned class teacher for the section (by UUID or employee staff_id). */
export async function isStaffClassTeacherForClass(
  supabase: SupabaseClient,
  schoolCode: string,
  staffRowId: string,
  classId: string
): Promise<boolean> {
  const { data: staffRow } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('id', staffRowId)
    .eq('school_code', schoolCode)
    .maybeSingle();

  const parts: string[] = [`class_teacher_id.eq.${staffRowId}`];
  const empId = staffRow?.staff_id != null ? String(staffRow.staff_id).trim() : '';
  if (empId) parts.push(`class_teacher_staff_id.eq.${empId}`);

  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('school_code', schoolCode)
    .eq('id', classId)
    .or(parts.join(','))
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
