import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/exam-terms/for-class?school_code=&structure_id=&class_id=
 * Terms (exam_terms) for a class-section within a term structure.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    const structureId = sp.get('structure_id');
    const classId = sp.get('class_id');

    if (!schoolCode || !structureId || !classId) {
      return NextResponse.json(
        { error: 'school_code, structure_id, and class_id are required' },
        { status: 400 }
      );
    }

    const { data: row, error: classErr } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classErr || !row) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('exam_terms')
      .select('id, name, serial, academic_year, structure_id, class_id, section')
      .eq('school_code', schoolCode)
      .eq('structure_id', structureId)
      .eq('class_id', classId)
      .eq('section', String(row.section || ''))
      .order('serial', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ data: [], message: 'exam_terms table not found' }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (data || []).filter((t: Record<string, unknown>) => t.is_deleted !== true);
    return NextResponse.json({ data: filtered }, { status: 200 });
  } catch (e) {
    console.error('exam-terms/for-class:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
