import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cacheKeys, DASHBOARD_REDIS_TTL, getCached } from '@/lib/cache';

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

    const key = cacheKeys.studentsCounts(schoolCode, academicYearFilter || null);
    const counts = await getCached(
      key,
      async () => {
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
        return {
          active: active ?? 0,
          deactivated: deactivated ?? 0,
          transferred: transferred ?? 0,
          alumni: alumni ?? 0,
        };
      },
      { ttlSeconds: DASHBOARD_REDIS_TTL.studentsCounts }
    );

    return NextResponse.json({
      data: counts,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
