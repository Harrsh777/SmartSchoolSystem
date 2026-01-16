import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/finance/salary
 * Get salary records with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const financialYearId = searchParams.get('financial_year_id');
    const staffId = searchParams.get('staff_id');
    const salaryMonth = searchParams.get('salary_month');
    const paymentStatus = searchParams.get('payment_status');
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
      .from('salary_records')
      .select(`
        *,
        staff:staff_id (
          id,
          full_name,
          designation,
          employee_id
        )
      `, { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('salary_month', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (financialYearId) {
      query = query.eq('financial_year_id', financialYearId);
    }
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    if (salaryMonth) {
      query = query.eq('salary_month', salaryMonth);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data: salaryRecords, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch salary records', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: salaryRecords || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching salary records:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/salary
 * Create a new salary record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      financial_year_id,
      staff_id,
      salary_month,
      base_salary,
      bonus,
      deduction,
      notes,
      created_by,
    } = body;

    // Validation
    if (!school_code || !staff_id || !salary_month || base_salary === undefined) {
      return NextResponse.json(
        { error: 'School code, staff ID, salary month, and base salary are required' },
        { status: 400 }
      );
    }

    if (parseFloat(base_salary) < 0) {
      return NextResponse.json(
        { error: 'Base salary cannot be negative' },
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

    // Check if salary already exists for this staff and month
    const { data: existing } = await supabase
      .from('salary_records')
      .select('id')
      .eq('school_code', school_code)
      .eq('staff_id', staff_id)
      .eq('salary_month', salary_month)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Salary record already exists for this staff and month' },
        { status: 400 }
      );
    }

    // Calculate net salary
    const netSalary = parseFloat(base_salary || 0) + parseFloat(bonus || 0) - parseFloat(deduction || 0);

    // Create salary record
    const { data: salaryRecord, error: insertError } = await supabase
      .from('salary_records')
      .insert([{
        school_id: schoolData.id,
        school_code,
        financial_year_id: financial_year_id || null,
        staff_id,
        salary_month,
        base_salary: parseFloat(base_salary),
        bonus: parseFloat(bonus || 0),
        deduction: parseFloat(deduction || 0),
        net_salary: netSalary,
        notes: notes || null,
        created_by: created_by || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create salary record', details: insertError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code,
      table_name: 'salary_records',
      record_id: salaryRecord.id,
      action: 'CREATE',
      new_values: salaryRecord,
      changed_by: created_by || null,
    }]);

    return NextResponse.json({ data: salaryRecord }, { status: 201 });
  } catch (error) {
    console.error('Error creating salary record:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



