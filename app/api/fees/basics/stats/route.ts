import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/basics/stats
 * Get summary statistics for fee basics page
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

    // Get counts for all fee-related tables
    const [
      { count: scheduleCount },
      { count: componentCount },
      { count: discountCount },
      { count: miscFeeCount },
      { count: fineCount },
    ] = await Promise.all([
      supabase.from('fee_schedules').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode),
      supabase.from('fee_components').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode),
      supabase.from('fee_discounts').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode),
      supabase.from('misc_fees').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode),
      supabase.from('fee_fines').select('*', { count: 'exact', head: true }).eq('school_code', schoolCode),
    ]);

    return NextResponse.json({
      data: {
        fee_schedules: scheduleCount || 0,
        fee_components: componentCount || 0,
        fee_discounts: discountCount || 0,
        misc_fees: miscFeeCount || 0,
        fee_fines: fineCount || 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee basics stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

