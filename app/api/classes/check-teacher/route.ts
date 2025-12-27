import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacher_id');
    const staffId = searchParams.get('staff_id');

    if (!teacherId && !staffId) {
      return NextResponse.json(
        { error: 'Either teacher_id or staff_id is required' },
        { status: 400 }
      );
    }

    // Check if this teacher is assigned as a class teacher
    // Check by both class_teacher_id (UUID) and class_teacher_staff_id (text)
    let query = supabase
      .from('classes')
      .select('id');

    if (teacherId) {
      query = query.eq('class_teacher_id', teacherId);
    } else if (staffId) {
      query = query.eq('class_teacher_staff_id', staffId);
    }

    const { data: classes, error } = await query.limit(1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check class teacher status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { isClassTeacher: classes && classes.length > 0 },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking class teacher:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

