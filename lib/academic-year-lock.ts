import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { resolveAcademicYear } from '@/lib/academic-year-id';

type AssertAcademicYearNotLockedParams = {
  schoolCode: string;
  academic_year_id?: string | null;
  academic_year?: string | null;
  /**
   * Admin override to bypass lock enforcement.
   * Intentionally caller-controlled (e.g. only pass when you trust the request).
   */
  adminOverride?: boolean;
};

function isLockedFromRow(row: {
  is_locked?: boolean | null;
  status?: string | null;
  closed_at?: string | null;
}): boolean {
  if (row.is_locked === true) return true;

  const status = (row.status ?? '').toString().toLowerCase();
  if (status === 'closed' || status === 'completed') return true;

  return Boolean(row.closed_at);
}

export async function assertAcademicYearNotLocked(params: AssertAcademicYearNotLockedParams) {
  const { schoolCode, adminOverride = false } = params;
  if (adminOverride) return null;

  const { yearId } = await resolveAcademicYear({
    schoolCode,
    academic_year: params.academic_year,
    academic_year_id: params.academic_year_id,
  });

  const supabase = getServiceRoleClient();

  // Preferred check: is_locked column.
  let { data, error } = await supabase
    .from('academic_years')
    .select('id,is_locked,status,closed_at')
    .eq('school_code', schoolCode.toUpperCase().trim())
    .eq('id', yearId)
    .maybeSingle();

  if (error) {
    // Backward-compatible fallback: treat locked as "closed" if is_locked column is missing.
    if (String(error.message || '').toLowerCase().includes('is_locked')) {
      const retry = await supabase
        .from('academic_years')
        .select('id,status,closed_at')
        .eq('school_code', schoolCode.toUpperCase().trim())
        .eq('id', yearId)
        .maybeSingle();
      error = retry.error;
      data = retry.data
        ? { ...retry.data, is_locked: null as boolean | null }
        : null;
    }
  }

  if (error || !data) {
    return NextResponse.json(
      { error: 'Failed to check academic-year lock state', details: error?.message || 'not found' },
      { status: 500 }
    );
  }

  const locked = isLockedFromRow(data);
  if (locked) {
    return NextResponse.json({ error: 'Academic year is locked' }, { status: 403 });
  }

  return null;
}

