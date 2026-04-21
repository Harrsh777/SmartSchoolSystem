import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/exam-terms/for-class?school_code=&structure_id=&class_id=
 * Terms (exam_terms) for a mapped class-section within a term structure.
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

    // Structure mappings are the source of truth for class-section applicability.
    const normalizedSection = String(row.section || '').trim().toLowerCase();
    const { data: mappings, error: mappingErr } = await supabase
      .from('exam_term_structure_mappings')
      .select('id, section, is_active')
      .eq('school_code', schoolCode)
      .eq('structure_id', structureId)
      .eq('class_id', classId)
      .eq('is_active', true);

    if (mappingErr) {
      return NextResponse.json({ error: mappingErr.message }, { status: 500 });
    }

    const hasMapping = (mappings || []).some(
      (m: { section?: string | null }) =>
        String(m.section || '').trim().toLowerCase() === normalizedSection
    );

    if (!hasMapping) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Terms are stored once per structure; do not hard-filter by class_id/section.
    const { data, error } = await supabase
      .from('exam_terms')
      .select('id, name, serial, academic_year, structure_id, class_id, section, is_deleted, is_active')
      .eq('school_code', schoolCode)
      .eq('structure_id', structureId)
      .eq('is_active', true)
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
