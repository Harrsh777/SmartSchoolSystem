import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/academic-year-management/closure
 * Body: { school_code, previous_year, new_year, performed_by? }
 * Sets previous_year status to 'closed' and closed_at; sets new_year status to 'active' and is_current.
 * Updates accepted_schools.current_academic_year to new_year.
 * Writes audit log. Admin-only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, previous_year, new_year, performed_by } = body;

    if (!school_code || !previous_year || !new_year) {
      return NextResponse.json(
        { error: 'school_code, previous_year, and new_year are required' },
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

    await supabase
      .from('academic_years')
      .update({ status: 'closed', closed_at: new Date().toISOString(), is_current: false })
      .eq('school_code', school_code)
      .eq('year_name', previous_year);

    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('school_code', school_code);

    await supabase
      .from('academic_years')
      .update({ status: 'active', is_current: true })
      .eq('school_code', school_code)
      .eq('year_name', new_year);

    await supabase
      .from('accepted_schools')
      .update({ current_academic_year: new_year })
      .eq('school_code', school_code);

    await supabase.from('academic_year_audit_log').insert([
      {
        school_code,
        action: 'year_closure',
        academic_year_from: previous_year,
        academic_year_to: new_year,
        performed_by: performed_by || null,
        details: {},
      },
    ]);

    return NextResponse.json({
      data: {
        previous_year,
        new_year,
        current_academic_year: new_year,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Closure error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
