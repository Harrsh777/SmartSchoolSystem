import { getServiceRoleClient } from '@/lib/supabase-admin';

export async function getRequiredCurrentAcademicYear(schoolCode: string): Promise<{ id: string; year_name: string }> {
  const normalizedCode = String(schoolCode ?? '').trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('School code is required');
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, year_name')
    .eq('school_code', normalizedCode)
    .eq('is_current', true)
    .maybeSingle();

  if (error || !data?.id || !data?.year_name) {
    throw new Error('ACADEMIC_YEAR_NOT_CONFIGURED');
  }

  return { id: String(data.id), year_name: String(data.year_name).trim() };
}
