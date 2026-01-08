import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/finance/expense
 * Get expense entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const financialYearId = searchParams.get('financial_year_id');
    const category = searchParams.get('category');
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
      .from('expense_entries')
      .select('*', { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (financialYearId) {
      query = query.eq('financial_year_id', financialYearId);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('entry_date', startDate);
    }
    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    const { data: expenseEntries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch expense entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: expenseEntries || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expense entries:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/expense
 * Create a new expense entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      financial_year_id,
      category,
      amount,
      entry_date,
      paid_to,
      payment_mode,
      notes,
      salary_record_id,
      created_by,
    } = body;

    // Validation
    if (!school_code || !category || !amount || !entry_date || !paid_to || !payment_mode) {
      return NextResponse.json(
        { error: 'School code, category, amount, entry date, paid to, and payment mode are required' },
        { status: 400 }
      );
    }

    if (!['Salary', 'Utility', 'Maintenance', 'Vendor', 'Other'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: Salary, Utility, Maintenance, Vendor, Other' },
        { status: 400 }
      );
    }

    if (!['Cash', 'Bank', 'UPI'].includes(payment_mode)) {
      return NextResponse.json(
        { error: 'Invalid payment mode. Must be one of: Cash, Bank, UPI' },
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

    // Create expense entry
    const { data: expenseEntry, error: insertError } = await supabase
      .from('expense_entries')
      .insert([{
        school_id: schoolData.id,
        school_code,
        financial_year_id: financial_year_id || null,
        category,
        amount: parseFloat(amount),
        entry_date,
        paid_to,
        payment_mode,
        notes: notes || null,
        salary_record_id: salary_record_id || null,
        created_by: created_by || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create expense entry', details: insertError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code,
      table_name: 'expense_entries',
      record_id: expenseEntry.id,
      action: 'CREATE',
      new_values: expenseEntry,
      changed_by: created_by || null,
    }]);

    return NextResponse.json({ data: expenseEntry }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



