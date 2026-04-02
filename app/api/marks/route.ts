import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveAcademicYear } from '@/lib/academic-year-id';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const studentId = searchParams.get('student_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('marks')
      .select(`
        *,
        students:student_id (
          id,
          admission_no,
          student_name,
          class,
          section,
          roll_number
        ),
        examinations:exam_id (
          id,
          exam_name,
          academic_year,
          start_date,
          end_date,
          status
        )
      `)
      .eq('school_code', schoolCode);

    // Apply filters
    if (examId) {
      query = query.eq('exam_id', examId);
    }

    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: marks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: marks || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      exam_id,
      student_id,
      class_id,
      school_code,
      admission_no,
      max_marks,
      marks_obtained,
      remarks,
      entered_by,
      academic_year,
      academic_year_id,
    } = body;

    // Validation
    if (!exam_id || !student_id || !class_id || !school_code || !admission_no || 
        max_marks === undefined || marks_obtained === undefined || !entered_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate marks
    if (max_marks <= 0) {
      return NextResponse.json(
        { error: 'Max marks must be greater than 0' },
        { status: 400 }
      );
    }

    if (marks_obtained < 0) {
      return NextResponse.json(
        { error: 'Marks obtained cannot be negative' },
        { status: 400 }
      );
    }

    if (marks_obtained > max_marks) {
      return NextResponse.json(
        { error: 'Marks obtained cannot exceed max marks' },
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

    // Check if exam exists and is ongoing
    const { data: examData, error: examError } = await supabase
      .from('examinations')
      .select('status, academic_year, academic_year_id')
      .eq('id', exam_id)
      .single();

    if (examError || !examData) {
      return NextResponse.json(
        { error: 'Examination not found' },
        { status: 404 }
      );
    }

    // Resolve academic year id/name for marks row.
    const { yearId: resolvedAcademicYearId, yearName: resolvedAcademicYearName } = await resolveAcademicYear({
      schoolCode: school_code,
      academic_year,
      academic_year_id,
    }).catch(async () => {
      // Fallback to the exam's academic year if caller didn't provide it.
      if (examData?.academic_year_id) {
        const { yearId, yearName } = await resolveAcademicYear({
          schoolCode: school_code,
          academic_year_id: examData.academic_year_id,
        });
        return { yearId, yearName };
      }
      if (examData?.academic_year) {
        const { yearId, yearName } = await resolveAcademicYear({
          schoolCode: school_code,
          academic_year: examData.academic_year,
        });
        return { yearId, yearName };
      }
      throw new Error('Unable to resolve academic year for marks insert');
    });

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    const lockCheck = await assertAcademicYearNotLocked({
      schoolCode: school_code,
      academic_year_id: resolvedAcademicYearId,
      adminOverride,
    });
    if (lockCheck) return lockCheck;

    // Insert or update mark (upsert)
    // NOTE: During migration we also try to store legacy `academic_year` if the column exists.
    const payloadWithLegacy: Record<string, unknown> = {
      exam_id,
      student_id,
      class_id,
      school_id: schoolData.id,
      school_code,
      admission_no,
      academic_year_id: resolvedAcademicYearId,
      academic_year: resolvedAcademicYearName,
      max_marks,
      marks_obtained,
      remarks: remarks || null,
      entered_by,
    };

    const upsertMarks = async (payload: Record<string, unknown>) => {
      return supabase
        .from('marks')
        .upsert(payload, { onConflict: 'exam_id,student_id' })
        .select()
        .single();
    };

    const { data: mark, error: insertError } = await upsertMarks(payloadWithLegacy).catch(() => ({ data: null, error: { message: 'Upsert failed' } }));

    if (insertError) {
      // Safe fallback: if legacy academic_year column doesn't exist yet, retry without it.
      const missingAcademicYearCol =
        insertError?.message?.includes('academic_year') &&
        (insertError?.message?.includes('does not exist') || insertError?.message?.includes('column'));

      if (missingAcademicYearCol) {
        const { data: mark2, error: insertError2 } = await upsertMarks({
          ...payloadWithLegacy,
          academic_year: undefined,
        });
        if (insertError2) {
          return NextResponse.json(
            { error: 'Failed to save marks', details: insertError2.message },
            { status: 500 }
          );
        }
        return NextResponse.json({ data: mark2 }, { status: 201 });
      }

      return NextResponse.json(
        { error: 'Failed to save marks', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: mark }, { status: 201 });
  } catch (error) {
    console.error('Error saving marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

