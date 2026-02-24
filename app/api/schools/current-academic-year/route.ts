import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/schools/current-academic-year?school_code=XXX
 * Returns the current/running academic year for the school.
 * 1. accepted_schools.current_academic_year if set
 * 2. Else academic_years where is_current = true (year_name)
 * 3. Else derive from current date (e.g. 2024-25 for Apr 2024 - Mar 2025)
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

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const fallback = m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
    return NextResponse.json({ data: fallback, current_academic_year: fallback }, { status: 200 });
  } catch (error) {
    console.error('Current academic year error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
