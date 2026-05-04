import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * Returns the school's running academic year label (e.g. "2025-26"), or null if not configured.
 * Order: accepted_schools.current_academic_year, then academic_years.is_current.
 */
export async function getOptionalCurrentAcademicYear(schoolCode: string): Promise<string | null> {
  const normalizedCode = String(schoolCode ?? '').trim().toUpperCase();
  if (!normalizedCode) return null;

  const supabase = getServiceRoleClient();

  const { data: school, error: schoolError } = await supabase
    .from('accepted_schools')
    .select('current_academic_year')
    .eq('school_code', normalizedCode)
    .single();

  if (!schoolError && school && (school as { current_academic_year?: string }).current_academic_year) {
    const year = String((school as { current_academic_year: string }).current_academic_year).trim();
    if (year) return year;
  }

  const { data: ayRow, error: ayError } = await supabase
    .from('academic_years')
    .select('year_name')
    .eq('school_code', normalizedCode)
    .eq('is_current', true)
    .maybeSingle();

  if (!ayError && ayRow && (ayRow as { year_name?: string }).year_name) {
    const year = String((ayRow as { year_name: string }).year_name).trim();
    if (year) return year;
  }

  return null;
}
