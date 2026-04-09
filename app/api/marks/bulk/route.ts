import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit-logger';
import { resolveStaffForAudit } from '@/lib/audit-staff';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';

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

    // Resolve academic year from the exam (marks table is academic-year scoped).
    const { data: examData, error: examError } = await supabase
      .from('examinations')
      .select('academic_year_id, academic_year')
      .eq('id', exam_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (examError || !examData) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    const lockCheck = await assertAcademicYearNotLocked({
      schoolCode: school_code,
      academic_year_id: examData.academic_year_id,
      adminOverride,
    });
    if (lockCheck) return lockCheck;

    // Validate all marks
    const errors: Array<{ student_id: string; error: string }> = [];
    const validMarks: any[] = [];

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
        academic_year_id: examData.academic_year_id,
        academic_year: examData.academic_year,
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
    const upsertWithLegacy = async (rows: typeof validMarks) =>
      supabase
        .from('marks')
        .upsert(rows, {
          onConflict: 'exam_id,student_id',
        })
        .select();

    const { data: savedMarks, error: insertError } = await upsertWithLegacy(validMarks);

    if (insertError) {
      const missingAcademicYearCol =
        insertError?.message?.includes('academic_year') &&
        (insertError?.message?.includes('does not exist') || insertError?.message?.includes('column'));

      if (missingAcademicYearCol) {
        // Retry without legacy `academic_year` column.
        const stripped = validMarks.map(({ academic_year, ...rest }) => rest);
        const { data: savedMarks2, error: insertError2 } = await upsertWithLegacy(stripped as any);
        if (insertError2) {
          return NextResponse.json(
            { error: 'Failed to save marks', details: insertError2.message },
            { status: 500 }
          );
        }
        const actorRetry = await resolveStaffForAudit(supabase, school_code, entered_by);
        logAudit(request, {
          userId: actorRetry.userId,
          userName: actorRetry.userName,
          role: actorRetry.role,
          actionType: 'MARKS_UPDATED',
          entityType: 'MARKS',
          entityId: exam_id,
          severity: 'CRITICAL',
          metadata: { class_id, count: validMarks.length },
        });
        return NextResponse.json({
          data: savedMarks2,
          summary: {
            total: marksArray.length,
            saved: savedMarks2?.length || 0,
            errors: errors.length,
          },
          errors: errors.length > 0 ? errors : undefined,
        }, { status: 201 });
      }

      return NextResponse.json(
        { error: 'Failed to save marks', details: insertError.message },
        { status: 500 }
      );
    }

    const actor = await resolveStaffForAudit(supabase, school_code, entered_by);
    logAudit(request, {
      userId: actor.userId,
      userName: actor.userName,
      role: actor.role,
      actionType: 'MARKS_UPDATED',
      entityType: 'MARKS',
      entityId: exam_id,
      severity: 'CRITICAL',
      metadata: { class_id, count: validMarks.length },
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

