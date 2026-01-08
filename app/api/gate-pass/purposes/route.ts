import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/gate-pass/purposes
 * Get all gate pass purposes for a school
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

    const { data: purposes, error } = await supabase
      .from('gate_pass_purposes')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('purpose_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch gate pass purposes', details: error.message },
        { status: 500 }
      );
    }

    // If no custom purposes exist, return default ones
    if (!purposes || purposes.length === 0) {
      return NextResponse.json({
        data: [
          { id: 'default-1', purpose_name: 'Personal Work' },
          { id: 'default-2', purpose_name: 'Medical Emergency' },
          { id: 'default-3', purpose_name: 'Official Work' },
          { id: 'default-4', purpose_name: 'Leave' },
          { id: 'default-5', purpose_name: 'Other' },
        ],
      }, { status: 200 });
    }

    return NextResponse.json({ data: purposes || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gate pass purposes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



