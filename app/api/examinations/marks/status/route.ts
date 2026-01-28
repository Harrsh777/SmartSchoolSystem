import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/examinations/marks/status
 * Check if marks are locked/submitted for a student
 * Query params: exam_id, student_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get('exam_id');
    const studentId = searchParams.get('student_id');

    if (!examId || !studentId) {
      return NextResponse.json(
        { error: 'Exam ID and Student ID are required' },
        { status: 400 }
      );
    }

    // Check if any marks are submitted (locked)
    const { data: marks, error } = await supabase
      .from('student_subject_marks')
      .select('status')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check marks status', details: error.message },
        { status: 500 }
      );
    }

    const isLocked = marks && marks.length > 0 && marks[0].status === 'submitted';

    return NextResponse.json({
      data: {
        locked: isLocked,
        status: marks && marks.length > 0 ? marks[0].status : 'draft',
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking marks status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
