import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Approve or reject marks for an examination
 * POST /api/examinations/marks/approve
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      class_id,
      action, // 'approve' or 'reject'
      approved_by,
      remarks,
    } = body;

    if (!school_code || !exam_id || !class_id || !action || !approved_by) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Update all marks for this exam and class
    const status = action === 'approve' ? 'approved' : 'correction_required';
    
    const { data: updatedMarks, error: updateError } = await supabase
      .from('student_subject_marks')
      .update({
        status: status,
        approved_by: approved_by,
        approved_at: new Date().toISOString(),
        approval_remarks: remarks || null,
      })
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id)
      .in('status', ['draft', 'submitted', 'correction_required'])
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update marks status', details: updateError.message },
        { status: 500 }
      );
    }

    // If approved, also update exam summaries
    if (action === 'approve') {
      // Calculate and update ranks for all students in this class
      const { data: summaries } = await supabase
        .from('student_exam_summary')
        .select('*')
        .eq('exam_id', exam_id)
        .eq('class_id', class_id)
        .order('overall_percentage', { ascending: false });

      if (summaries && summaries.length > 0) {
        // Update ranks
        const updates = summaries.map((summary, index) => ({
          id: summary.id,
          rank_in_class: index + 1,
        }));

        for (const update of updates) {
          await supabase
            .from('student_exam_summary')
            .update({ rank_in_class: update.rank_in_class })
            .eq('id', update.id);
        }
      }
    }

    return NextResponse.json({
      message: `Marks ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      updated_count: updatedMarks?.length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error approving marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get marks pending approval
 * GET /api/examinations/marks/approve
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('student_subject_marks')
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color
        ),
        student:students (
          id,
          student_name,
          admission_no,
          roll_number
        ),
        entered_by_staff:entered_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .in('status', ['submitted', 'correction_required']);

    if (examId) {
      query = query.eq('exam_id', examId);
    }

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: marks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pending marks', details: error.message },
        { status: 500 }
      );
    }

    // Group by student
    interface GroupedMark {
      student_id: string;
      student: { id: string; student_name: string; admission_no: string; roll_number?: string };
      exam_id: string;
      class_id: string;
      status: string;
      marks: Array<{ subject_id: string; marks_obtained: number; max_marks: number }>;
      total_marks: number;
      total_max_marks: number;
    }
    const groupedMarks: Record<string, GroupedMark> = {};
    marks?.forEach((mark) => {
      const studentId = mark.student_id;
      if (!groupedMarks[studentId]) {
        groupedMarks[studentId] = {
          student_id: studentId,
          student: mark.student,
          exam_id: mark.exam_id,
          class_id: mark.class_id,
          status: mark.status,
          marks: [],
          total_marks: 0,
          total_max_marks: 0,
        };
      }
      groupedMarks[studentId].marks.push(mark);
      groupedMarks[studentId].total_marks += mark.marks_obtained || 0;
      groupedMarks[studentId].total_max_marks += mark.max_marks || 0;
    });

    return NextResponse.json({
      data: Object.values(groupedMarks),
      total_students: Object.keys(groupedMarks).length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
