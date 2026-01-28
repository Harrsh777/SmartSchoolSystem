import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TABLE = 'term_co_scholastic';

/**
 * GET /api/co-scholastic?school_code=&term_id=&class_id=
 * List co-scholastic entries (attendance %, discipline, work habits, remarks) for a term and class.
 * Class teacher only; no marks editing.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const termId = searchParams.get('term_id');
    const classId = searchParams.get('class_id');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !termId) {
      return NextResponse.json(
        { error: 'school_code and term_id are required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from(TABLE)
      .select(`
        *,
        student:students(id, student_name, roll_number, admission_no)
      `)
      .eq('school_code', schoolCode)
      .eq('term_id', termId);

    if (classId) query = query.eq('class_id', classId);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query.order('added_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Co-scholastic table not found. Run exam_terms_and_reports_schema.sql to create term_co_scholastic.' },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch co-scholastic data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('Co-scholastic GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/co-scholastic
 * Body: school_code, term_id, student_id, class_id, attendance_percentage?, discipline_grade?, work_habits_grade?, teacher_remarks?, added_by
 * Upsert one row per (term_id, student_id). Class teacher only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      term_id,
      student_id,
      class_id,
      attendance_percentage,
      discipline_grade,
      work_habits_grade,
      teacher_remarks,
      added_by,
    } = body;

    if (!school_code || !term_id || !student_id || !class_id || !added_by) {
      return NextResponse.json(
        { error: 'school_code, term_id, student_id, class_id, and added_by are required' },
        { status: 400 }
      );
    }

    const row = {
      school_code,
      term_id,
      student_id,
      class_id,
      attendance_percentage: attendance_percentage ?? null,
      discipline_grade: discipline_grade ?? null,
      work_habits_grade: work_habits_grade ?? null,
      teacher_remarks: teacher_remarks ?? null,
      added_by,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'term_id,student_id' })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Co-scholastic table not found. Run exam_terms_and_reports_schema.sql to create term_co_scholastic.' },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to save co-scholastic data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    console.error('Co-scholastic POST:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
