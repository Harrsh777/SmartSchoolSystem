import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get academic calendar
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('academic_calendar')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: calendar, error: calendarError } = await query
      .order('event_date', { ascending: true });

    if (calendarError) {
      return NextResponse.json(
        { error: 'Failed to fetch academic calendar', details: calendarError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: calendar || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching academic calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

