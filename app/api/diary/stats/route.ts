import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/diary/stats
 * Get diary statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYearId = searchParams.get('academic_year_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('diaries')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { count, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch diary stats', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        total: count || 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching diary stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



