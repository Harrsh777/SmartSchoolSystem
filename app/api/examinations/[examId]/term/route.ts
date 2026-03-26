import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const termId = body.term_id ? String(body.term_id) : null;

    const { data: exam, error: examErr } = await supabase
      .from('examinations')
      .select('id, school_code, class_id, exam_name')
      .eq('id', examId)
      .single();
    if (examErr || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (termId) {
      const { data: term, error: termErr } = await supabase
        .from('exam_terms')
        .select('id, school_code, class_id, section, is_deleted, is_active')
        .eq('id', termId)
        .single();
      if (termErr || !term || term.is_deleted || !term.is_active) {
        return NextResponse.json({ error: 'Invalid term selected' }, { status: 400 });
      }
      if (String(term.school_code) !== String(exam.school_code)) {
        return NextResponse.json({ error: 'Term does not belong to this school' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('examinations')
      .update({ term_id: termId })
      .eq('id', examId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update exam term', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

