import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/gate-pass/stats
 * Get gate pass statistics for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { count, error } = await supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch gate pass stats', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        total: count || 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gate pass stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



