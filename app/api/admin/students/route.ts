import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');
    const classFilter = searchParams.get('class');

    // Build query - fetch all students or filter by school
    let query = supabase
      .from('students')
      .select(`
        *,
        accepted_schools:school_id (
          school_name,
          school_code
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    if (classFilter && classFilter !== 'all') {
      query = query.eq('class', classFilter);
    }

    const { data: students, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      );
    }

    // Apply search filter if provided
    let filteredStudents = students || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = filteredStudents.filter((s: any) =>
        s.student_name?.toLowerCase().includes(searchLower) ||
        s.admission_no?.toLowerCase().includes(searchLower) ||
        s.class?.toLowerCase().includes(searchLower) ||
        s.school_code?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ data: filteredStudents }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

