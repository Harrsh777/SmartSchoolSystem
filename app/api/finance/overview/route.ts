import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/finance/overview
 * Get financial overview statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const financialYearId = searchParams.get('financial_year_id');
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build date filters
    let incomeDateFilter = supabase.from('income_entries').select('amount').eq('school_code', schoolCode).eq('is_active', true);
    let expenseDateFilter = supabase.from('expense_entries').select('amount').eq('school_code', schoolCode).eq('is_active', true);
    let salaryDateFilter = supabase.from('salary_records').select('net_salary, payment_status').eq('school_code', schoolCode).eq('is_active', true);

    if (financialYearId) {
      incomeDateFilter = incomeDateFilter.eq('financial_year_id', financialYearId);
      expenseDateFilter = expenseDateFilter.eq('financial_year_id', financialYearId);
      salaryDateFilter = salaryDateFilter.eq('financial_year_id', financialYearId);
    }

    // Current month filter
    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1) - 1).toISOString().split('T')[0];
      incomeDateFilter = incomeDateFilter.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth);
      expenseDateFilter = expenseDateFilter.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth);
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      incomeDateFilter = incomeDateFilter.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth);
      expenseDateFilter = expenseDateFilter.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth);
    }

    // Current year filter - use financial year if provided, otherwise calendar year
    let startOfYear: string;
    let endOfYear: string;
    
    if (financialYearId) {
      // Get financial year dates
      const { data: fyData } = await supabase
        .from('financial_years')
        .select('start_date, end_date')
        .eq('id', financialYearId)
        .single();
      
      if (fyData) {
        startOfYear = fyData.start_date;
        endOfYear = fyData.end_date;
      } else {
        const now = new Date();
        startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      }
    } else {
      const now = new Date();
      startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }

    let incomeYearFilter = supabase.from('income_entries').select('amount').eq('school_code', schoolCode).eq('is_active', true).gte('entry_date', startOfYear).lte('entry_date', endOfYear);
    let expenseYearFilter = supabase.from('expense_entries').select('amount').eq('school_code', schoolCode).eq('is_active', true).gte('entry_date', startOfYear).lte('entry_date', endOfYear);
    let salaryYearFilter = supabase.from('salary_records').select('net_salary, payment_status').eq('school_code', schoolCode).eq('is_active', true).gte('salary_month', startOfYear).lte('salary_month', endOfYear);

    if (financialYearId) {
      incomeYearFilter = incomeYearFilter.eq('financial_year_id', financialYearId);
      expenseYearFilter = expenseYearFilter.eq('financial_year_id', financialYearId);
      salaryYearFilter = salaryYearFilter.eq('financial_year_id', financialYearId);
    }

    // Fetch all data
    const [
      { data: incomeMonth, error: incomeMonthError },
      { data: expenseMonth, error: expenseMonthError },
      { data: incomeYear, error: incomeYearError },
      { data: expenseYear, error: expenseYearError },
      { error: salaryMonthError },
      { data: salariesYear, error: salaryYearError },
    ] = await Promise.all([
      incomeDateFilter,
      expenseDateFilter,
      incomeYearFilter,
      expenseYearFilter,
      salaryDateFilter,
      salaryYearFilter,
    ]);

    if (incomeMonthError || expenseMonthError || incomeYearError || expenseYearError || salaryMonthError || salaryYearError) {
      return NextResponse.json(
        { error: 'Failed to fetch overview data' },
        { status: 500 }
      );
    }

    // Calculate totals
    const totalIncomeMonth = (incomeMonth || []).reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
    const totalExpenseMonth = (expenseMonth || []).reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
    const totalIncomeYear = (incomeYear || []).reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
    const totalExpenseYear = (expenseYear || []).reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    // Calculate salary stats - use year data for totals
    const salaryPaid = (salariesYear || []).filter((s) => s.payment_status === 'PAID').reduce((sum, s) => sum + parseFloat(s.net_salary.toString()), 0);
    const salaryPending = (salariesYear || []).filter((s) => s.payment_status === 'UNPAID').reduce((sum, s) => sum + parseFloat(s.net_salary.toString()), 0);

    return NextResponse.json({
      data: {
        income: {
          month: totalIncomeMonth,
          year: totalIncomeYear,
        },
        expense: {
          month: totalExpenseMonth,
          year: totalExpenseYear,
        },
        netBalance: {
          month: totalIncomeMonth - totalExpenseMonth,
          year: totalIncomeYear - totalExpenseYear,
        },
        salary: {
          paid: salaryPaid,
          pending: salaryPending,
          total: salaryPaid + salaryPending,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching overview:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



