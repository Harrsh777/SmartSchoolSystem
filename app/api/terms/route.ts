import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TABLE = 'exam_terms';

const norm = (v: unknown) => String(v ?? '').trim();
const slugify = (v: unknown) =>
  norm(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * GET /api/terms?school_code=
 * List exam terms for the school. Uses exam_terms table if it exists.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const section = searchParams.get('section');
    const includeDeleted = searchParams.get('include_deleted') === 'true';

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
      .order('serial', { ascending: true });

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

    let rows = data ?? [];
    if (!includeDeleted) {
      rows = rows.filter((r) => !r.is_deleted);
    }
    if (classId) {
      rows = rows.filter((r) => String(r.class_id ?? '') === String(classId));
    }
    if (section) {
      rows = rows.filter((r) => norm(r.section).toLowerCase() === norm(section).toLowerCase());
    }

    return NextResponse.json({ data: rows }, { status: 200 });
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
      class_id,
      section,
      name,
      serial,
      academic_year,
      start_date,
      end_date,
      created_by,
      apply_to_all_sections,
      section_ids,
    } = body;

    if (!school_code || !class_id || !section || !name || !serial) {
      return NextResponse.json(
        { error: 'school_code, class_id, section, name, and serial are required' },
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

    const baseRow = {
      school_id: schoolRow.id,
      school_code,
      class_id: String(class_id),
      section: norm(section),
      name: norm(name),
      normalized_name: norm(name).toLowerCase(),
      slug: slugify(name),
      serial: Number(serial),
      academic_year: academic_year ?? null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      is_active: true,
      is_deleted: false,
      created_by: created_by ?? null,
    };

    const targetSections = apply_to_all_sections
      ? (Array.isArray(section_ids) ? section_ids.map((s: unknown) => norm(s)).filter(Boolean) : [norm(section)])
      : [norm(section)];

    const rowsToInsert = targetSections.map((sec) => ({ ...baseRow, section: sec }));

    // Duplicate guard (case-insensitive by normalized_name)
    const existingQuery = supabase
      .from(TABLE)
      .select('id,class_id,section,normalized_name,is_deleted')
      .eq('school_code', school_code)
      .eq('class_id', class_id)
      .in('section', targetSections)
      .eq('is_deleted', false);
    const { data: existingRows, error: existingErr } = await existingQuery;
    if (existingErr && existingErr.code !== '42P01') {
      return NextResponse.json({ error: 'Failed to validate term uniqueness', details: existingErr.message }, { status: 500 });
    }
    const existingSet = new Set(
      (existingRows || []).map((r: Record<string, unknown>) => `${String(r.class_id)}|${norm(r.section).toLowerCase()}|${norm(r.normalized_name).toLowerCase()}`)
    );
    const dup = rowsToInsert.find((r) => existingSet.has(`${String(r.class_id)}|${norm(r.section).toLowerCase()}|${norm(r.normalized_name).toLowerCase()}`));
    if (dup) {
      return NextResponse.json(
        { error: `Term "${dup.name}" already exists for class-section ${dup.class_id}-${dup.section}` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert(rowsToInsert)
      .select();

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

    return NextResponse.json({ data: data ?? [] }, { status: 201 });
  } catch (e) {
    console.error('Terms POST:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
