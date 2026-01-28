import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/classmates
 * Returns classmates for a given class + section + academic_year.
 *
 * Security note:
 * This endpoint only returns non-sensitive fields suitable for student view.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classValue = searchParams.get('class');
    const section = searchParams.get('section');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode || !classValue || !section || !academicYear) {
      return NextResponse.json(
        { error: 'school_code, class, section, and academic_year are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('students')
      .select('id, student_name, admission_no, class, section, academic_year, photo_url')
      .eq('school_code', schoolCode)
      .eq('class', classValue)
      .eq('section', section)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (error) {
      console.error('Error fetching classmates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch classmates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classmates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

