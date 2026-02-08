import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/schools/info?school_code=XXX
 * Returns school display name and logo URL for the sidebar/header.
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('accepted_schools')
      .select('school_name, logo_url')
      .eq('school_code', schoolCode)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'School not found', details: error?.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        school_name: data.school_name || '',
        logo_url: data.logo_url || null,
      },
    });
  } catch (err) {
    console.error('Error fetching school info:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
