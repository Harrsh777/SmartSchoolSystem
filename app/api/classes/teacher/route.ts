import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacher_id');
    const staffId = searchParams.get('staff_id');
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    if (!teacherId && !staffId) {
      return NextResponse.json(
        { error: 'Either teacher_id or staff_id is required' },
        { status: 400 }
      );
    }

    // Build query - check by both class_teacher_id (UUID) and class_teacher_staff_id (text)
    let classData = null;
    let classError = null;

    // First try by class_teacher_id (primary method) if provided
    if (teacherId) {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_code', schoolCode)
        .eq('class_teacher_id', teacherId)
        .maybeSingle();
      
      classData = data;
      classError = error;
    }

    // If not found by class_teacher_id and staff_id is provided, try by class_teacher_staff_id
    if (!classData && staffId) {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_code', schoolCode)
        .eq('class_teacher_staff_id', staffId)
        .maybeSingle();
      
      if (data) {
        classData = data;
        classError = error;
      }
    }

    if (classError) {
      return NextResponse.json(
        { error: 'Failed to fetch class', details: classError.message },
        { status: 500 }
      );
    }

    if (!classData) {
      // No class found
      return NextResponse.json(
        { error: 'No class assigned', data: null },
        { status: 404 }
      );
    }

    // Get student count for this class
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('class', classData.class)
      .eq('section', classData.section)
      .eq('academic_year', classData.academic_year);

    return NextResponse.json({
      data: {
        ...classData,
        student_count: studentCount || 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
