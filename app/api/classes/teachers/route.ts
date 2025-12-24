import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch teachers (staff with role containing "Teacher" or "Principal")
    const { data: teachers, error: teachersError } = await supabase
      .from('staff')
      .select('id, full_name, role, department')
      .eq('school_code', schoolCode)
      .or('role.ilike.%Teacher%,role.ilike.%Principal%')
      .order('full_name', { ascending: true });

    if (teachersError) {
      return NextResponse.json(
        { error: 'Failed to fetch teachers', details: teachersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: teachers || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

