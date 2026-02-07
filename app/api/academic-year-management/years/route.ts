import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/academic-year-management/years?school_code=XXX
 * List academic years from BOTH academic_years table and classes table (merged, deduplicated).
 * - academic_years: full rows (start_date, end_date, status, is_current).
 * - classes: unique academic_year values that don't exist in academic_years appear as rows with source: 'classes'.
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const [ayResult, classesResult] = await Promise.all([
      supabase
        .from('academic_years')
        .select('*')
        .eq('school_code', schoolCode)
        .order('start_date', { ascending: false }),
      supabase
        .from('classes')
        .select('academic_year')
        .eq('school_code', schoolCode),
    ]);

    const ayData = ayResult.data || [];
    const classes = classesResult.data || [];

    const yearsFromAy = new Map(
      ayData.map((row) => [
        String((row as { year_name?: string }).year_name || '').trim(),
        { ...row, source: 'academic_years' as const },
      ])
    );

    const uniqueFromClasses = Array.from(
      new Set(classes.map((c) => String(c.academic_year || '').trim()).filter(Boolean))
    );

    for (const yearName of uniqueFromClasses) {
      if (!yearsFromAy.has(yearName)) {
        yearsFromAy.set(yearName, {
          id: yearName,
          year_name: yearName,
          school_code: schoolCode,
          start_date: null,
          end_date: null,
          status: 'active',
          is_current: false,
          source: 'classes' as const,
        });
      }
    }

    const merged = Array.from(yearsFromAy.values()).sort((a, b) => {
      const yearA = parseInt(String((a as { year_name?: string }).year_name).split('-')[0] || '0', 10);
      const yearB = parseInt(String((b as { year_name?: string }).year_name).split('-')[0] || '0', 10);
      return yearB - yearA;
    });

    return NextResponse.json({ data: merged }, { status: 200 });
  } catch (error) {
    console.error('Academic year list error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/academic-year-management/years
 * Create a new academic year. Body: school_code, year_name, start_date?, end_date?, status?
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, year_name, start_date, end_date, status } = body;

    if (!school_code || !year_name) {
      return NextResponse.json(
        { error: 'School code and year_name are required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const insertPayload: Record<string, unknown> = {
      school_id: schoolData.id,
      school_code,
      year_name: String(year_name).trim(),
      start_date: start_date || new Date().toISOString().slice(0, 10),
      end_date: end_date || new Date().toISOString().slice(0, 10),
      is_current: false,
    };
    if (status) insertPayload.status = status;

    const { data: created, error: insertError } = await supabase
      .from('academic_years')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Academic year already exists for this school' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Failed to create academic year', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Create academic year error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
