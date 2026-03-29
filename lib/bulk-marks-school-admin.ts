import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionFromRequest, type SessionData } from '@/lib/session-store';

export function isSchoolAdminSessionForSchool(
  session: SessionData | null,
  schoolCode: string
): boolean {
  if (!session || session.role !== 'school') return false;
  return String(session.school_code || '').toUpperCase() === schoolCode.trim().toUpperCase();
}

/** Cookie-authenticated school admin for this request's school. */
export async function getSchoolAdminSessionForSchool(
  request: NextRequest,
  schoolCode: string
): Promise<SessionData | null> {
  const session = await getSessionFromRequest(request);
  return isSchoolAdminSessionForSchool(session, schoolCode) ? session : null;
}

/** Attribution row for student_subject_marks.entered_by when the actor is school login (not a staff row). */
export async function pickAuditStaffIdForSchool(
  supabase: SupabaseClient,
  schoolCode: string
): Promise<string | null> {
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('school_code', schoolCode)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
