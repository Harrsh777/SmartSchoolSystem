import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get exam summary for a student
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get('exam_id');
    const studentId = searchParams.get('student_id');
    const schoolCode = searchParams.get('school_code');

    if (!examId || !studentId || !schoolCode) {
      return NextResponse.json(
        { error: 'Exam ID, Student ID, and School code are required' },
        { status: 400 }
      );
    }

    const { data: summary, error } = await supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('school_code', schoolCode)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch summary', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: summary || null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

