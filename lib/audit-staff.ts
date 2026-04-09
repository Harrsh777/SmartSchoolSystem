import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve display name and role for Security & Action Audit rows. */
export async function resolveStaffForAudit(
  supabase: SupabaseClient,
  schoolCode: string,
  staffRowId: string | null | undefined
): Promise<{ userId: string | null; userName: string; role: string }> {
  const id = staffRowId != null ? String(staffRowId).trim() : '';
  if (!id) {
    return { userId: null, userName: 'Unknown', role: 'School Admin' };
  }
  const { data } = await supabase
    .from('staff')
    .select('full_name, role, designation')
    .eq('id', id)
    .eq('school_code', schoolCode)
    .maybeSingle();
  const row = data as { full_name?: string | null; role?: string | null; designation?: string | null } | null;
  const userName = row?.full_name?.trim() || 'Staff';
  const role = row?.role?.trim() || row?.designation?.trim() || 'Teacher';
  return { userId: id, userName, role };
}
