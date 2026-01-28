import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/terms/[termId]/exams?school_code=
 * List exams and their weightages for a term. Uses exam_term_mappings if it exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');

    if (!schoolCode || !termId) {
      return NextResponse.json(
        { error: 'school_code and termId are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('exam_term_mappings')
      .select(`
        id, exam_id, term_id, weightage, is_active,
        exam:examinations(id, exam_name, academic_year, start_date, end_date)
      `)
      .eq('term_id', termId)
      .eq('is_active', true);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { data: [], message: 'exam_term_mappings not found. Run exam_terms_and_reports_schema.sql.' },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch term exams', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('Term exams GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terms/[termId]/exams
 * Body: school_code, exams: [{ exam_id, weightage }]
 * Add or update exam weightages for the term.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const body = await request.json();
    const { school_code, exams } = body;

    if (!school_code || !termId || !Array.isArray(exams) || exams.length === 0) {
      return NextResponse.json(
        { error: 'school_code, termId, and exams (array of { exam_id, weightage }) are required' },
        { status: 400 }
      );
    }

    const totalWeight = exams.reduce((s: number, e: { weightage?: number }) => s + (e.weightage ?? 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Sum of weightages must be 100' },
        { status: 400 }
      );
    }

    const rows = exams.map((e: { exam_id: string; weightage: number }) => ({
      exam_id: e.exam_id,
      term_id: termId,
      weightage: Number(e.weightage),
      is_active: true,
    }));

    const { data, error } = await supabase
      .from('exam_term_mappings')
      .upsert(rows, { onConflict: 'exam_id,term_id' })
      .select();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'exam_term_mappings table not found. Run exam_terms_and_reports_schema.sql.' },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to save term exams', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('Term exams POST:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
