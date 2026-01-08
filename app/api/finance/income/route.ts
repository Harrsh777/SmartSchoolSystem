import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/finance/income
 * Get income entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const financialYearId = searchParams.get('financial_year_id');
    const source = searchParams.get('source');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('income_entries')
      .select('*', { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (financialYearId) {
      query = query.eq('financial_year_id', financialYearId);
    }
    if (source) {
      query = query.eq('source', source);
    }
    if (startDate) {
      query = query.gte('entry_date', startDate);
    }
    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    const { data: incomeEntries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch income entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: incomeEntries || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching income entries:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/income
 * Create a new income entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      financial_year_id,
      source,
      amount,
      entry_date,
      reference_number,
      notes,
      created_by,
    } = body;

    // Validation
    if (!school_code || !source || !amount || !entry_date) {
      return NextResponse.json(
        { error: 'School code, source, amount, and entry date are required' },
        { status: 400 }
      );
    }

    if (!['Fees', 'Donation', 'Grant', 'Other'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be one of: Fees, Donation, Grant, Other' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
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

    // Create income entry
    const { data: incomeEntry, error: insertError } = await supabase
      .from('income_entries')
      .insert([{
        school_id: schoolData.id,
        school_code,
        financial_year_id: financial_year_id || null,
        source,
        amount: parseFloat(amount),
        entry_date,
        reference_number: reference_number || null,
        notes: notes || null,
        created_by: created_by || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create income entry', details: insertError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code,
      table_name: 'income_entries',
      record_id: incomeEntry.id,
      action: 'CREATE',
      new_values: incomeEntry,
      changed_by: created_by || null,
    }]);

    return NextResponse.json({ data: incomeEntry }, { status: 201 });
  } catch (error) {
    console.error('Error creating income entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



