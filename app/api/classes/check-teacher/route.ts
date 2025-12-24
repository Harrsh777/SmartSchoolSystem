import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Check if this teacher is assigned as a class teacher
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id')
      .eq('class_teacher_id', teacherId)
      .limit(1);

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

