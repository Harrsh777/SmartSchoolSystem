import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/schools/current-academic-year?school_code=XXX
 * Returns the current/running academic year for the school.
 * 1. accepted_schools.current_academic_year if set
 * 2. Else academic_years where is_current = true (year_name)
 * 3. Else return setup-required error.
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedCode = schoolCode.toString().trim().toUpperCase();

    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('current_academic_year')
      .eq('school_code', normalizedCode)
      .single();

    if (!schoolError && school && (school as { current_academic_year?: string }).current_academic_year) {
      const year = (school as { current_academic_year: string }).current_academic_year.trim();
      return NextResponse.json({ data: year, current_academic_year: year }, { status: 200 });
    }

    const { data: ayRow, error: ayError } = await supabase
      .from('academic_years')
      .select('year_name')
      .eq('school_code', normalizedCode)
      .eq('is_current', true)
      .maybeSingle();

    if (!ayError && ayRow && (ayRow as { year_name?: string }).year_name) {
      const year = (ayRow as { year_name: string }).year_name.trim();
      return NextResponse.json({ data: year, current_academic_year: year }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Setup academic year first from Academic Year Management module.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Current academic year error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
