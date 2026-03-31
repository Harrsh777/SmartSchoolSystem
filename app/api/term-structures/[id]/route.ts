import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) return NextResponse.json({ error: 'school_code is required' }, { status: 400 });

    const { data: structure, error: structureErr } = await supabase
      .from('exam_term_structures')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .single();
    if (structureErr || !structure) return NextResponse.json({ error: 'Structure not found' }, { status: 404 });

    const { data: mappings } = await supabase
      .from('exam_term_structure_mappings')
      .select('*')
      .eq('structure_id', id)
      .eq('is_active', true);

    const { data: terms } = await supabase
      .from('exam_terms')
      .select('*')
      .eq('structure_id', id)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('serial', { ascending: true });

    const termIds = (terms || []).map((t) => t.id);
    let examsByTerm: Record<string, Array<{ id: string; exam_name: string; serial: number; weightage: number }>> = {};
    if (termIds.length > 0) {
      const { data: termExams } = await supabase
        .from('exam_term_exams')
        .select('*')
        .in('term_id', termIds)
        .eq('is_active', true)
        .order('serial', { ascending: true });
      examsByTerm = (termExams || []).reduce((acc, row) => {
        const key = String(row.term_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          id: row.id,
          exam_name: row.exam_name,
          serial: row.serial,
          weightage: Number(row.weightage || 0),
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; exam_name: string; serial: number; weightage: number }>>);
    }

    return NextResponse.json(
      {
        data: {
          structure,
          mappings: mappings || [],
          terms: (terms || []).map((t) => ({ ...t, exams: examsByTerm[String(t.id)] || [] })),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('term-structures PUT error:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim();
    const fallbackAcademicYear = String(body.academic_year || '').trim();
    const mappings = (body.mappings || []) as Array<{ class_id: string; section: string }>;
    const terms = (body.terms || []) as Array<{
      name: string;
      serial: number;
      academic_year?: string;
      exams: Array<{ exam_name: string; serial: number; weightage?: number }>;
    }>;

    if (!schoolCode) return NextResponse.json({ error: 'school_code is required' }, { status: 400 });

    const { data: structure, error: structureErr } = await supabase
      .from('exam_term_structures')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .single();
    if (structureErr || !structure) return NextResponse.json({ error: 'Structure not found' }, { status: 404 });

    if (terms.length > 0 && mappings.length === 0) {
      return NextResponse.json({ error: 'Map at least one class-section before adding terms' }, { status: 400 });
    }
    const totalWeightage = terms.reduce(
      (acc, t) =>
        acc +
        (t.exams || []).reduce(
          (sum, ex) => sum + (String(ex.exam_name || '').trim() ? Number(ex.weightage || 0) : 0),
          0
        ),
      0
    );
    // Weightage is optional: allow sums other than 100.

    // Replace mappings
    const { error: deleteMappingsErr } = await supabase
      .from('exam_term_structure_mappings')
      .delete()
      .eq('structure_id', id);
    if (deleteMappingsErr) {
      return NextResponse.json(
        { error: 'Failed to reset structure mappings', details: deleteMappingsErr.message },
        { status: 500 }
      );
    }
    if (mappings.length > 0) {
      const rows = mappings.map((m) => ({
        structure_id: id,
        school_code: schoolCode,
        class_id: m.class_id,
        section: String(m.section || '').trim(),
        is_active: true,
      }));
      const { error: insertMappingsErr } = await supabase
        .from('exam_term_structure_mappings')
        .insert(rows);
      if (insertMappingsErr) {
        return NextResponse.json(
          { error: 'Failed to save structure mappings', details: insertMappingsErr.message },
          { status: 500 }
        );
      }
    }

    // Replace terms and term exams
    const { data: existingTerms } = await supabase.from('exam_terms').select('id').eq('structure_id', id);
    const existingTermIds = (existingTerms || []).map((t) => t.id);
    if (existingTermIds.length > 0) {
      const { data: linkedExams } = await supabase
        .from('examinations')
        .select('id, term_id')
        .in('term_id', existingTermIds)
        .limit(1);
      if (linkedExams && linkedExams.length > 0) {
        return NextResponse.json(
          { error: 'Cannot modify this structure because examinations are already linked to its terms.' },
          { status: 400 }
        );
      }
      const { error: deleteTermExamsErr } = await supabase
        .from('exam_term_exams')
        .delete()
        .in('term_id', existingTermIds);
      if (deleteTermExamsErr) {
        return NextResponse.json(
          { error: 'Failed to reset existing term examinations', details: deleteTermExamsErr.message },
          { status: 500 }
        );
      }
    }
    const { error: deleteTermsErr } = await supabase
      .from('exam_terms')
      .delete()
      .eq('structure_id', id);
    if (deleteTermsErr) {
      return NextResponse.json(
        { error: 'Failed to reset existing terms', details: deleteTermsErr.message },
        { status: 500 }
      );
    }

    if (terms.length > 0 && mappings.length > 0) {
      const representativeMapping = mappings[0];
      const termRowMetas: Array<{ sourceIndex: number; row: Record<string, unknown> }> = terms.map((t, idx) => ({
        sourceIndex: idx,
        row: {
          school_id: structure.school_id,
          school_code: schoolCode,
          class_id: representativeMapping.class_id,
          section: String(representativeMapping.section || '').trim(),
          structure_id: id,
          // Legacy compatibility: some DBs still enforce not-null on old columns.
          term_name: String(t.name || '').trim(),
          term_order: Number(t.serial || 1),
          name: String(t.name || '').trim(),
          normalized_name: String(t.name || '').trim().toLowerCase(),
          slug: String(t.name || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          serial: Number(t.serial || 1),
          academic_year: String(t.academic_year || fallbackAcademicYear || '')
            .trim() || null,
          is_active: true,
          is_deleted: false,
        },
      }));

      const { data: insertedTerms, error: insertTermsErr } = await supabase
        .from('exam_terms')
        .insert(termRowMetas.map((t) => t.row))
        .select();
      if (insertTermsErr || !insertedTerms) {
        return NextResponse.json(
          { error: 'Failed to save terms', details: insertTermsErr?.message || 'No terms inserted' },
          { status: 500 }
        );
      }
      const examRows: Array<{ term_id: string; exam_name: string; serial: number; weightage: number; is_active: boolean }> = [];
      (insertedTerms || []).forEach((term, idx) => {
        const sourceIndex = termRowMetas[idx]?.sourceIndex ?? 0;
        const original = terms[sourceIndex];
        (original.exams || []).forEach((ex) => {
          if (String(ex.exam_name || '').trim()) {
            examRows.push({
              term_id: term.id,
              exam_name: String(ex.exam_name).trim(),
              serial: Number(ex.serial || 1),
              weightage: Number(ex.weightage || 0),
              is_active: true,
            });
          }
        });
      });
      if (examRows.length > 0) {
        const { error: insertTermExamsErr } = await supabase
          .from('exam_term_exams')
          .insert(examRows);
        if (insertTermExamsErr) {
          return NextResponse.json(
            { error: 'Failed to save examinations under terms', details: insertTermExamsErr.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (e) {
    console.error('term-structures DELETE error:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) return NextResponse.json({ error: 'school_code is required' }, { status: 400 });

    const { data: structure, error: structureErr } = await supabase
      .from('exam_term_structures')
      .select('id,school_code,is_deleted')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .single();

    if (structureErr || !structure) {
      return NextResponse.json({ error: 'Structure not found' }, { status: 404 });
    }

    // Prevent deletion when any examination is already linked to structure terms.
    const { data: terms } = await supabase
      .from('exam_terms')
      .select('id')
      .eq('structure_id', id)
      .eq('is_deleted', false);
    const termIds = (terms || []).map((t) => t.id);
    if (termIds.length > 0) {
      const { data: linkedExams } = await supabase
        .from('examinations')
        .select('id')
        .in('term_id', termIds)
        .limit(1);
      if (linkedExams && linkedExams.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete this structure because examinations are already linked to its terms.' },
          { status: 400 }
        );
      }
    }

    // Soft-delete structure and linked term hierarchy.
    await supabase
      .from('exam_term_structures')
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    await supabase
      .from('exam_term_structure_mappings')
      .update({ is_active: false })
      .eq('structure_id', id);

    await supabase
      .from('exam_terms')
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('structure_id', id);

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

