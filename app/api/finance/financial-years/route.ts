import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/finance/financial-years
 * Get all financial years for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: years, error } = await supabase
      .from('financial_years')
      .select('*')
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch financial years', details: error.message },
        { status: 500 }
      );
    }

    // If no financial years exist, create a default one for the current year
    if (!years || years.length === 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startDate = `${currentYear}-04-01`; // Financial year typically starts April 1
      const endDate = `${currentYear + 1}-03-31`; // Ends March 31

      // Get school ID
      const { data: schoolData, error: schoolError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', schoolCode)
        .single();

      if (schoolError || !schoolData) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }

      const { data: defaultYear, error: createError } = await supabase
        .from('financial_years')
        .insert([{
          school_id: schoolData.id,
          school_code: schoolCode,
          year_name: `${currentYear}-${currentYear + 1}`,
          start_date: startDate,
          end_date: endDate,
          is_current: true,
        }])
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create default financial year', details: createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: [defaultYear] }, { status: 200 });
    }

    return NextResponse.json({ data: years || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching financial years:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/financial-years
 * Create a new financial year
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, year_name, start_date, end_date, is_current } = body;

    if (!school_code || !year_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'School code, year name, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // If setting as current, unset other current years
    if (is_current) {
      await supabase
        .from('financial_years')
        .update({ is_current: false })
        .eq('school_code', school_code);
    }

    const { data: year, error } = await supabase
      .from('financial_years')
      .insert([{
        school_id: schoolData.id,
        school_code,
        year_name,
        start_date,
        end_date,
        is_current: is_current || false,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create financial year', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: year }, { status: 201 });
  } catch (error) {
    console.error('Error creating financial year:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



