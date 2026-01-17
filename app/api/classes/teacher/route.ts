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
    // Support multiple classes per teacher - check both fields simultaneously using OR
    type ClassData = {
      class: string;
      section: string;
      academic_year: string;
      [key: string]: unknown;
    };
    let classesData: ClassData[] = [];
    let classError = null;

    // Build query with OR condition for both fields
    let query = supabase
      .from('classes')
      .select('*')
      .eq('school_code', schoolCode);

    // Use OR to check both class_teacher_id and class_teacher_staff_id
    const conditions: string[] = [];
    if (teacherId) {
      conditions.push(`class_teacher_id.eq.${teacherId}`);
    }
    if (staffId) {
      conditions.push(`class_teacher_staff_id.eq.${staffId}`);
    }

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    } else {
      // No conditions to check
      return NextResponse.json(
        { error: 'Either teacher_id or staff_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await query;
    
    if (data) {
      classesData = data as ClassData[];
    }
    classError = error;

    if (classError) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classError.message },
        { status: 500 }
      );
    }

    if (!classesData || classesData.length === 0) {
      // No classes found
      return NextResponse.json(
        { error: 'No classes assigned', data: [] },
        { status: 200 }
      );
    }

    // Get student counts for all classes
    const classesWithCounts = await Promise.all(
      classesData.map(async (classData) => {
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_code', schoolCode)
          .eq('class', classData.class)
          .eq('section', classData.section)
          .eq('academic_year', classData.academic_year);

        return {
          ...classData,
          student_count: studentCount || 0,
        };
      })
    );

    // If single class requested (backward compatibility), return single object
    // Otherwise return array
    const returnAsArray = searchParams.get('array') === 'true';
    
    if (returnAsArray || classesWithCounts.length > 1) {
      return NextResponse.json({
        data: classesWithCounts,
      }, { status: 200 });
    }

    // For backward compatibility with single class, return first class
    return NextResponse.json({
      data: classesWithCounts[0] || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
