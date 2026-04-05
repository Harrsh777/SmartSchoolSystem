import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/student/marks
 * Marks visible to the student only after admin locks marks for that exam + class
 * (row in exam_class_marks_lock). Query: school_code, student_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const raw = schoolCode.trim();
    const upper = raw.toUpperCase();

    const { data: byUpper } = await supabase
      .from('students')
      .select('id, school_code, class, section')
      .eq('id', studentId)
      .eq('school_code', upper)
      .maybeSingle();

    const { data: byRaw } =
      !byUpper && raw !== upper
        ? await supabase
            .from('students')
            .select('id, school_code, class, section')
            .eq('id', studentId)
            .eq('school_code', raw)
            .maybeSingle()
        : { data: null };

    const student = byUpper || byRaw;
    if (!student) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const sc = String(student.school_code ?? upper);

    let defaultClassId: string | null = null;
    if (student.class != null && student.section != null) {
      const { data: classRow } = await supabase
        .from('classes')
        .select('id')
        .eq('school_code', sc)
        .eq('class', student.class)
        .eq('section', student.section)
        .maybeSingle();
      defaultClassId = classRow?.id ?? null;
    }

    const { data: marks, error } = await supabase
      .from('marks')
      .select(
        `
        *,
        examinations:exam_id (
          id,
          exam_name,
          academic_year,
          start_date,
          end_date,
          status
        )
      `
      )
      .eq('school_code', sc)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching student marks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: error.message },
        { status: 500 }
      );
    }

    if (!marks?.length) {
      return NextResponse.json({ data: [] });
    }

    const examIds = [...new Set(marks.map((m: { exam_id: string }) => m.exam_id).filter(Boolean))];
    const { data: locks, error: lockErr } = await supabase
      .from('exam_class_marks_lock')
      .select('exam_id, class_id')
      .eq('school_code', sc)
      .in('exam_id', examIds);

    if (lockErr && lockErr.code !== '42P01') {
      console.warn('[student/marks] lock fetch:', lockErr.message);
    }

    const lockSet = new Set(
      (locks || []).map((l: { exam_id: string; class_id: string }) => `${l.exam_id}|${l.class_id}`)
    );

    const visible = marks.filter((m: { exam_id: string; class_id?: string | null }) => {
      const cid = m.class_id || defaultClassId;
      if (!cid) return false;
      return lockSet.has(`${m.exam_id}|${cid}`);
    });

    return NextResponse.json({ data: visible });
  } catch (e) {
    console.error('Error in GET /api/student/marks:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
