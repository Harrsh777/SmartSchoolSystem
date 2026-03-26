import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch examinations with all related data
    const { data: examinations, error } = await supabase
      .from('examinations')
      .select(`
        *,
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings (
          class_id,
          subject_id,
          max_marks,
          pass_marks,
          weightage,
          subject:subjects (
            id,
            name,
            color
          )
        ),
        exam_schedules:exam_schedules (
          exam_date,
          start_time,
          end_time
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching examinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: error.message },
        { status: 500 }
      );
    }

    const examRows = examinations || [];
    const termIds = Array.from(
      new Set(
        examRows
          .map((e) => (e as Record<string, unknown>).term_id)
          .filter((id) => Boolean(id))
          .map((id) => String(id))
      )
    );

    let termMap = new Map<string, { id: string; name?: string; serial?: number; class_id?: string; section?: string }>();
    if (termIds.length > 0) {
      const { data: terms } = await supabase
        .from('exam_terms')
        .select('id,name,serial,class_id,section')
        .in('id', termIds);
      termMap = new Map((terms || []).map((t) => [String(t.id), t]));
    }

    const withTerms = examRows.map((exam) => {
      const termId = (exam as Record<string, unknown>).term_id;
      return {
        ...exam,
        term: termId ? termMap.get(String(termId)) || null : null,
      };
    });

    return NextResponse.json({ data: withTerms }, { status: 200 });
  } catch (error) {
    console.error('Error fetching examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
