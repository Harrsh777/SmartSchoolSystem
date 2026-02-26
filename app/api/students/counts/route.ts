import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/students/counts?school_code=XXX&academic_year=YYY
 * Returns counts per status for the directory tabs.
 * Uses same academic_year filter as the list API (optional).
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    const academicYearFilter = request.nextUrl.searchParams.get('academic_year') || '';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    const base = () => {
      let q = supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode);
      if (academicYearFilter) {
        q = q.or(`academic_year.eq.${academicYearFilter},academic_year.is.null`);
      }
      return q;
    };

    const [
      { count: active },
      { count: deactivated },
      { count: transferred },
      { count: alumni },
    ] = await Promise.all([
      base().eq('status', 'active'),
      base().in('status', ['deactivated', 'inactive']),
      base().eq('status', 'transferred'),
      base().in('status', ['alumni', 'graduated']),
    ]);

    return NextResponse.json({
      data: {
        active: active ?? 0,
        deactivated: deactivated ?? 0,
        transferred: transferred ?? 0,
        alumni: alumni ?? 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
