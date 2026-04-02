import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * Map academic year string (e.g. "2025-26") -> academic_years.id (UUID).
 *
 * NOTE: academic_years has a uniqueness rule on (school_code, year_name),
 * so we must include school_code to map safely.
 */
export async function mapFromString(params: {
  schoolCode: string;
  academic_year: string;
}): Promise<string | null> {
  const { schoolCode, academic_year } = params;
  const yearName = String(academic_year ?? '').trim();
  const normalizedSchoolCode = String(schoolCode ?? '').trim().toUpperCase();

  if (!normalizedSchoolCode || !yearName) return null;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_code', normalizedSchoolCode)
    .eq('year_name', yearName)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

/**
 * Map academic_years.id (UUID) -> academic_year string (year_name).
 */
export async function mapFromId(params: {
  schoolCode: string;
  academic_year_id: string;
}): Promise<string | null> {
  const { schoolCode, academic_year_id } = params;
  const normalizedSchoolCode = String(schoolCode ?? '').trim().toUpperCase();
  const yearId = String(academic_year_id ?? '').trim();

  if (!normalizedSchoolCode || !yearId) return null;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('academic_years')
    .select('year_name')
    .eq('school_code', normalizedSchoolCode)
    .eq('id', yearId)
    .maybeSingle();

  if (error) return null;
  return data?.year_name ? String(data.year_name).trim() : null;
}

/**
 * Resolve academic year identifiers:
 * - academic_year_id wins if provided
 * - otherwise derive from academic_year string
 */
export async function resolveAcademicYear(params: {
  schoolCode: string;
  academic_year?: string | null;
  academic_year_id?: string | null;
}): Promise<{ yearId: string; yearName: string }> {
  const normalizedSchoolCode = String(params.schoolCode ?? '').trim().toUpperCase();
  const academicYearId = params.academic_year_id
    ? String(params.academic_year_id).trim()
    : params.academic_year
      ? await mapFromString({ schoolCode: normalizedSchoolCode, academic_year: String(params.academic_year) })
      : null;

  if (!academicYearId) {
    throw new Error('Unable to resolve academic year id (missing or unmapped academic_year/academic_year_id)');
  }

  // We must write back both columns during migration, so derive the year_name string.
  const yearName =
    params.academic_year && String(params.academic_year).trim()
      ? String(params.academic_year).trim()
      : await mapFromId({ schoolCode: normalizedSchoolCode, academic_year_id: academicYearId });

  if (!yearName) {
    throw new Error('Unable to resolve academic year name for the given academic_year_id');
  }

  return { yearId: academicYearId, yearName };
}

