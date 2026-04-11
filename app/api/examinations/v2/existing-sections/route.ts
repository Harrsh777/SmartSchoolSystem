import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Returns class-section IDs (classes.id) that already have an examination
 * for the given term + template exam (exam_term_exams row).
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    const termId = sp.get('term_id');
    const examTermExamId = sp.get('exam_term_exam_id');
    const excludeExamId = sp.get('exclude_exam_id')?.trim() || '';

    if (!schoolCode || !termId || !examTermExamId) {
      return NextResponse.json(
        { error: 'school_code, term_id, and exam_term_exam_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('exam_class_mappings')
      .select('class_id, exam_id')
      .eq('school_code', schoolCode)
      .eq('term_id', termId)
      .eq('exam_term_exam_id', examTermExamId);

    if (error) {
      console.error('existing-sections query error:', error);
      return NextResponse.json(
        { error: 'Failed to load coverage', details: error.message },
        { status: 500 }
      );
    }

    const sectionIds = Array.from(
      new Set(
        (data || [])
          .filter((r) => {
            if (!excludeExamId) return true;
            return String((r as { exam_id?: string }).exam_id || '') !== excludeExamId;
          })
          .map((r) => String((r as { class_id: string }).class_id))
      )
    );

    return NextResponse.json({ data: { section_ids: sectionIds } }, { status: 200 });
  } catch (e) {
    console.error('existing-sections error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
