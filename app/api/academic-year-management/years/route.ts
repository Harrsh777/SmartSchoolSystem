import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseAcademicYearName } from '@/lib/academic-year-name';

/**
 * GET /api/academic-year-management/years?school_code=XXX
 * List academic years from academic_years table only.
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

    const { data: ayData } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: false });

    const merged = Array.from((ayData || []).map((row) => ({ ...row, source: 'academic_years' as const }))).sort((a, b) => {
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

    const parsed = parseAcademicYearName(String(year_name));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const startYear = parseInt(parsed.year_name.split('-')[0] || '', 10);
    const defaultStart = Number.isFinite(startYear) ? `${startYear}-04-01` : new Date().toISOString().slice(0, 10);
    const defaultEnd = Number.isFinite(startYear) ? `${startYear + 1}-03-31` : new Date().toISOString().slice(0, 10);
    const resolvedStartDate = String(start_date || defaultStart);
    const resolvedEndDate = String(end_date || defaultEnd);
    if (new Date(resolvedStartDate).getTime() >= new Date(resolvedEndDate).getTime()) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
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
      year_name: parsed.year_name,
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      // Mark the first created year as current (onboarding / middleware enforcement).
      // If a current year already exists, the new year stays non-current by default.
      is_current: false,
    };
    if (status) insertPayload.status = status;

    // If this is the first "current" year for the school, auto-activate it.
    const { data: currentRow } = await supabase
      .from('academic_years')
      .select('id')
      .eq('school_code', school_code)
      .eq('is_current', true)
      .maybeSingle();

    if (!currentRow) {
      insertPayload.is_current = true;
    }

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
