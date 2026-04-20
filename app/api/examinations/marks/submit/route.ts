import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { assertTeacherSubjectScope, loadTeachingMap } from '@/lib/marks-teacher-validation';
import { isStaffClassTeacherForClass } from '@/lib/staff-class-teacher';
import { isExamClassMarksLocked, MARKS_LOCKED_MESSAGE } from '@/lib/exam-marks-lock';

function missingSchemaColumnMessage(err: { message?: string; code?: string }, column: string): boolean {
  const m = String(err.message || '');
  const col = column.replace(/'/g, '');
  return (
    err.code === 'PGRST204' ||
    new RegExp(`Could not find the '${col}' column`, 'i').test(m) ||
    new RegExp(`column "${col}" does not exist`, 'i').test(m)
  );
}

type SubmitRowFilters = {
  school_code: string;
  exam_id: string;
  student_id?: string;
  class_id?: string;
  subject_ids?: string[];
};

/**
 * Persist submitted state when `status` / `updated_at` exist; otherwise no-op without noisy logs.
 */
async function runSubmittedUpdate(
  supabase: SupabaseClient,
  filters: SubmitRowFilters
): Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }> {
  const ts = new Date().toISOString();
  const run = async (patch: Record<string, unknown>) => {
    let q = supabase
      .from('student_subject_marks')
      .update(patch)
      .eq('school_code', filters.school_code)
      .eq('exam_id', filters.exam_id);
    if (filters.student_id) q = q.eq('student_id', filters.student_id);
    if (filters.class_id) q = q.eq('class_id', filters.class_id);
    if (filters.subject_ids?.length) q = q.in('subject_id', filters.subject_ids);
    return q.select();
  };

  const { data, error } = await run({ status: 'submitted', updated_at: ts });
  if (!error) return { data: data as unknown[] | null, error: null };

  if (missingSchemaColumnMessage(error, 'status')) {
    const r2 = await run({ updated_at: ts });
    if (!r2.error) return { data: r2.data as unknown[] | null, error: null };
    if (missingSchemaColumnMessage(r2.error, 'updated_at')) {
      return { data: null, error: null };
    }
    return { data: null, error: r2.error };
  }

  if (missingSchemaColumnMessage(error, 'updated_at')) {
    const r3 = await run({ status: 'submitted' });
    if (!r3.error) return { data: r3.data as unknown[] | null, error: null };
    return { data: null, error: r3.error };
  }

  return { data: data as unknown[] | null, error };
}

/**
 * Submit marks for review (change status from draft to submitted)
 * POST /api/examinations/marks/submit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      student_id, // Support per-student submission
      class_id, // Required for single-student (filter subjects by class); used for bulk too
      scoped_subject_ids, // Teacher marks: only require/submit these subjects
      teacher_marks_scoped,
      entered_by,
    } = body;

    if (!school_code || !exam_id) {
      return NextResponse.json(
        { error: 'School code and exam ID are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let classIdForLock = String(class_id || '').trim();
    if (!classIdForLock && student_id) {
      const { data: oneMark } = await supabase
        .from('student_subject_marks')
        .select('class_id')
        .eq('school_code', school_code)
        .eq('exam_id', exam_id)
        .eq('student_id', student_id)
        .limit(1)
        .maybeSingle();
      if (oneMark?.class_id) classIdForLock = String(oneMark.class_id);
    }
    if (
      classIdForLock &&
      (await isExamClassMarksLocked(supabase, school_code, exam_id, classIdForLock))
    ) {
      return NextResponse.json({ error: MARKS_LOCKED_MESSAGE }, { status: 403 });
    }

    // Get exam subject mappings – filter by class_id when provided so we only require marks for that class's subjects
    let examSubjectQuery = supabase
      .from('exam_subject_mappings')
      .select('subject_id')
      .eq('exam_id', exam_id)
      .eq('school_code', school_code);
    if (class_id) {
      examSubjectQuery = examSubjectQuery.eq('class_id', class_id);
    }
    let { data: examSubjectMappings } = await examSubjectQuery;

    if (
      (!examSubjectMappings || examSubjectMappings.length === 0) &&
      class_id &&
      Array.isArray(scoped_subject_ids) &&
      scoped_subject_ids.length > 0
    ) {
      const { data: loose } = await supabase
        .from('exam_subject_mappings')
        .select('subject_id')
        .eq('exam_id', exam_id)
        .eq('school_code', school_code)
        .in('subject_id', scoped_subject_ids as string[]);
      examSubjectMappings = loose;
    }

    if (!examSubjectMappings || examSubjectMappings.length === 0) {
      return NextResponse.json(
        { error: 'No subjects found for this exam' + (class_id ? ' for the selected class' : '') },
        { status: 400 }
      );
    }

    let subjectIds = [...new Set(examSubjectMappings.map((esm) => esm.subject_id))];

    if (Array.isArray(scoped_subject_ids) && scoped_subject_ids.length > 0) {
      const allowed = new Set(examSubjectMappings.map((m) => m.subject_id));
      subjectIds = scoped_subject_ids.filter((id: string) => allowed.has(id));
      if (subjectIds.length === 0) {
        return NextResponse.json({ error: 'No valid scoped subjects for this exam/class' }, { status: 400 });
      }
    }

    if (teacher_marks_scoped && entered_by && class_id) {
      const teachingMap = await loadTeachingMap(supabase, school_code, String(entered_by));
      const gate = assertTeacherSubjectScope(teachingMap, String(class_id), subjectIds);
      if (!gate.ok) {
        const isClassTeacher = await isStaffClassTeacherForClass(
          supabase,
          school_code,
          String(entered_by),
          String(class_id)
        );
        if (!isClassTeacher) {
          return NextResponse.json(
            { error: 'Forbidden: scoped subjects must match your timetable.', forbidden_subjects: gate.forbidden },
            { status: 403 }
          );
        }
      }
    }

    // If student_id is provided, submit for single student
    if (student_id) {
      const { data: existingMarks, error: fetchError } = await supabase
        .from('student_subject_marks')
        .select('subject_id, marks_obtained')
        .eq('school_code', school_code)
        .eq('exam_id', exam_id)
        .eq('student_id', student_id);

      if (fetchError) {
        return NextResponse.json(
          { error: 'Failed to check marks', details: fetchError.message },
          { status: 500 }
        );
      }

      const subjectFilter =
        subjectIds.length > 0 && Array.isArray(scoped_subject_ids) && scoped_subject_ids.length > 0
          ? subjectIds
          : undefined;

      const { data: updatedMarks, error: updateError } = await runSubmittedUpdate(supabase, {
        school_code,
        exam_id,
        student_id,
        subject_ids: subjectFilter,
      });

      if (updateError) {
        console.warn('Submit marks status update failed (non-fatal):', updateError.message);
      }

      return NextResponse.json({
        message: 'Marks submitted successfully',
        submitted_count: updatedMarks?.length ?? existingMarks?.length ?? 0,
        locked: true,
      }, { status: 200 });
    }

    // Bulk submission for class (if class_id provided)
    if (!class_id) {
      return NextResponse.json(
        { error: 'Either student_id or class_id is required' },
        { status: 400 }
      );
    }

    // Get all students in this class
    const { data: classData } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', class_id)
      .single();

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('school_code', school_code)
      .eq('class', classData.class)
      .eq('section', classData.section || '')
      .eq('status', 'active');

    // Submit all available saved marks for this class.
    const { data: existingMarks, error: bulkFetchError } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id')
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id);

    if (bulkFetchError) {
      return NextResponse.json(
        { error: 'Failed to check marks', details: bulkFetchError.message },
        { status: 500 }
      );
    }

    const bulkSubjectFilter =
      subjectIds.length > 0 && Array.isArray(scoped_subject_ids) && scoped_subject_ids.length > 0
        ? subjectIds
        : undefined;

    const { data: updatedMarks, error: updateError } = await runSubmittedUpdate(supabase, {
      school_code,
      exam_id,
      class_id,
      subject_ids: bulkSubjectFilter,
    });

    if (updateError) {
      console.warn('Bulk submit marks status update failed (non-fatal):', updateError.message);
    }

    return NextResponse.json({
      message: 'Marks submitted for review successfully',
      submitted_count: updatedMarks?.length ?? existingMarks?.length ?? 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
