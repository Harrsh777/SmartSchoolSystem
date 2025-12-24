import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    // Build query - fetch all classes or filter by school
    let query = supabase
      .from('classes')
      .select(`
        *,
        accepted_schools:school_id (
          school_name,
          school_code
        ),
        staff:class_teacher_id (
          full_name,
          staff_id
        )
      `)
      .order('class', { ascending: true })
      .order('section', { ascending: true });

    // Apply filters
    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    const { data: classes, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: error.message },
        { status: 500 }
      );
    }

    // Get student counts for each class
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (cls: any) => {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', cls.school_id)
          .eq('class', cls.class)
          .eq('section', cls.section)
          .eq('academic_year', cls.academic_year);

        return {
          ...cls,
          student_count: count || 0,
        };
      })
    );

    return NextResponse.json({ data: classesWithCounts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

