import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TABLE = 'exam_terms';

/**
 * GET /api/terms?school_code=
 * List exam terms for the school. Uses exam_terms table if it exists.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('term_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { data: [], message: 'exam_terms table not found. Run exam_terms_and_reports_schema.sql to enable term config.' },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch terms', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('Terms GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terms
 * Body: school_code, term_name, term_order, academic_year?, start_date?, end_date?, created_by?
 * Create an exam term. Requires exam_terms table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      term_name,
      term_order,
      academic_year,
      start_date,
      end_date,
      created_by,
    } = body;

    if (!school_code || !term_name) {
      return NextResponse.json(
        { error: 'school_code and term_name are required' },
        { status: 400 }
      );
    }

    const { data: schoolRow } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (!schoolRow) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const row = {
      school_id: schoolRow.id,
      school_code,
      term_name: String(term_name).trim(),
      term_order: typeof term_order === 'number' ? term_order : 1,
      academic_year: academic_year ?? null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      is_active: true,
      created_by: created_by ?? null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'exam_terms table not found. Run exam_terms_and_reports_schema.sql.' },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create term', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error('Terms POST:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
