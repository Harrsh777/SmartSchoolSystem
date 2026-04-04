import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/examinations/[examId]/class-mappings?school_code=&class_id=
 * All exam_subject_mappings for this exam that apply to the given class row
 * (class_id matches OR class_id is null = all sections on this exam).
 * Used for class-teacher marks entry so all configured subjects show, not a trimmed embed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code')?.trim();
    const classId = request.nextUrl.searchParams.get('class_id')?.trim();

    if (!schoolCode || !classId) {
      return NextResponse.json(
        { error: 'school_code and class_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: examRow, error: examErr } = await supabase
      .from('examinations')
      .select('id')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .maybeSingle();

    if (examErr || !examRow) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from('exam_subject_mappings')
      .select(
        `
        id,
        class_id,
        subject_id,
        max_marks,
        pass_marks,
        weightage,
        subject:subjects (
          id,
          name
        )
      `
      )
      .eq('exam_id', examId)
      .eq('school_code', schoolCode)
      .or(`class_id.eq.${classId},class_id.is.null`);

    if (error) {
      console.error('class-mappings query:', error);
      return NextResponse.json(
        { error: 'Failed to load mappings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: rows || [] }, { status: 200 });
  } catch (e) {
    console.error('class-mappings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
