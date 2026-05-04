import { NextRequest, NextResponse } from 'next/server';
import { getOptionalCurrentAcademicYear } from '@/lib/school-current-academic-year';

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

    const year = await getOptionalCurrentAcademicYear(schoolCode);
    if (year) {
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
