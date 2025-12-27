import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const subjectName = searchParams.get('subject');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query to find staff with matching designation (subject)
    let query = supabase
      .from('staff')
      .select('id, staff_id, full_name, designation, role')
      .eq('school_code', schoolCode)
      .eq('role', 'Teacher'); // Only teachers

    // If subject is provided, filter by designation
    if (subjectName) {
      query = query.eq('designation', subjectName);
    }

    const { data: teachers, error } = await query.order('full_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch teachers', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: teachers || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teachers by subject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

