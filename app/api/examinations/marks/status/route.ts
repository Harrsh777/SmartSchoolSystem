import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const schoolCode = searchParams.get('school_code');

    // Class+subject scoped status (used by marks-entry page banner)
    if (examId && classId && subjectId && schoolCode) {
      const adminSupabase = getServiceRoleClient();
      const { data: latestSubmitted, error: submittedError } = await adminSupabase
        .from('student_subject_marks')
        .select('entered_by, updated_at, created_at')
        .eq('exam_id', examId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('school_code', schoolCode)
        .eq('status', 'submitted')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (submittedError) {
        return NextResponse.json(
          { error: 'Failed to check submitted status', details: submittedError.message },
          { status: 500 }
        );
      }

      if (!latestSubmitted) {
        return NextResponse.json(
          {
            data: {
              submitted: false,
              submitted_at: null,
              submitted_by_name: null,
            },
          },
          { status: 200 }
        );
      }

      let submittedByName = 'Admin';
      if (latestSubmitted.entered_by) {
        const { data: staffRow } = await adminSupabase
          .from('staff')
          .select('full_name')
          .eq('id', String(latestSubmitted.entered_by))
          .maybeSingle();
        if (staffRow?.full_name) {
          submittedByName = String(staffRow.full_name);
        }
      }

      return NextResponse.json(
        {
          data: {
            submitted: true,
            submitted_at: latestSubmitted.updated_at || latestSubmitted.created_at || null,
            submitted_by_name: submittedByName,
          },
        },
        { status: 200 }
      );
    }

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
