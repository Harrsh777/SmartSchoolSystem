import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit-logger';

/**
 * Bulk insert/update marks for multiple students
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exam_id, class_id, school_code, entered_by, marks: marksArray } = body;

    // Validation
    if (!exam_id || !class_id || !school_code || !entered_by || !marksArray || !Array.isArray(marksArray)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get school_id
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

    // Validate all marks
    const errors: Array<{ student_id: string; error: string }> = [];
    const validMarks = [];

    for (const mark of marksArray) {
      const { student_id, admission_no, max_marks, marks_obtained, remarks } = mark;

      if (!student_id || !admission_no || max_marks === undefined || marks_obtained === undefined) {
        errors.push({
          student_id: student_id || 'unknown',
          error: 'Missing required fields',
        });
        continue;
      }

      if (max_marks <= 0) {
        errors.push({
          student_id,
          error: 'Max marks must be greater than 0',
        });
        continue;
      }

      if (marks_obtained < 0) {
        errors.push({
          student_id,
          error: 'Marks obtained cannot be negative',
        });
        continue;
      }

      if (marks_obtained > max_marks) {
        errors.push({
          student_id,
          error: 'Marks obtained cannot exceed max marks',
        });
        continue;
      }

      validMarks.push({
        exam_id,
        student_id,
        class_id,
        school_id: schoolData.id,
        school_code,
        admission_no,
        max_marks,
        marks_obtained,
        remarks: remarks || null,
        entered_by,
      });
    }

    if (validMarks.length === 0) {
      return NextResponse.json(
        { error: 'No valid marks to save', errors },
        { status: 400 }
      );
    }

    // Bulk upsert marks
    const { data: savedMarks, error: insertError } = await supabase
      .from('marks')
      .upsert(validMarks, {
        onConflict: 'exam_id,student_id',
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save marks', details: insertError.message },
        { status: 500 }
      );
    }

    logAudit(request, {
      userId: entered_by,
      userName: 'Staff',
      role: 'Teacher',
      actionType: 'MARKS_UPDATED',
      entityType: 'EXAM',
      entityId: exam_id,
      severity: 'CRITICAL',
      metadata: { exam_id, class_id, count: validMarks.length },
    });

    return NextResponse.json({
      data: savedMarks,
      summary: {
        total: marksArray.length,
        saved: savedMarks?.length || 0,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving bulk marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

