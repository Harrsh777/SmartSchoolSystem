import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    // studentId kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const studentId = searchParams.get('student_id');
    const classValue = searchParams.get('class');
    const section = searchParams.get('section');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode || !classValue || !section) {
      return NextResponse.json(
        { error: 'School code, class, and section are required' },
        { status: 400 }
      );
    }

    // Find the class row (prefer matching academic year when provided)
    let classQuery = supabase
      .from('classes')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('class', classValue)
      .eq('section', section);

    if (academicYear) {
      classQuery = classQuery.eq('academic_year', academicYear);
    }

    const { data: classRows, error: classError } = await classQuery
      .order('academic_year', { ascending: false })
      .limit(1);

    const classData = classRows?.[0];

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Fetch class teacher if assigned
    let classTeacher = null;
    if (classData.class_teacher_id) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('staff')
        .select('id, full_name, staff_id, email, phone, department, designation')
        .eq('id', classData.class_teacher_id)
        .single();

      if (!teacherError && teacherData) {
        classTeacher = teacherData;
      }
    }

    return NextResponse.json({ 
      data: {
        class: classData,
        class_teacher: classTeacher
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class teacher:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

