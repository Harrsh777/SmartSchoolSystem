import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacher_id');
    const schoolCode = searchParams.get('school_code');

    if (!teacherId || !schoolCode) {
      return NextResponse.json(
        { error: 'Teacher ID and school code are required' },
        { status: 400 }
      );
    }

    // Fetch class assigned to this teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('class_teacher_id', teacherId)
      .eq('school_code', schoolCode)
      .single();

    if (classError) {
      if (classError.code === 'PGRST116') {
        // No class found
        return NextResponse.json(
          { error: 'No class assigned to this teacher' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch class', details: classError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: classData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

