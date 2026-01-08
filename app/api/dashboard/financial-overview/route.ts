import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const period = searchParams.get('period') || 'till_date'; // till_date or annual

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get current financial year (April to March)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const financialYearStart = currentMonth >= 3 ? currentYear : currentYear - 1; // April = month 3
    const financialYearEnd = financialYearStart + 1;
    
    const startOfFinancialYear = new Date(financialYearStart, 3, 1); // April 1
    const endOfFinancialYear = new Date(financialYearEnd, 2, 31); // March 31
    
    // For "till_date", use from start of financial year to today
    // For "annual", use full financial year
    const endDate = period === 'annual' 
      ? endOfFinancialYear.toISOString().split('T')[0]
      : now.toISOString().split('T')[0];
    
    const startDate = startOfFinancialYear.toISOString().split('T')[0];

    // Fetch income entries
    const { data: incomeEntries } = await supabase
      .from('income_entries')
      .select('amount, entry_date')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    // Fetch expense entries
    const { data: expenseEntries } = await supabase
      .from('expense_entries')
      .select('amount, entry_date')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    // Calculate totals
    const totalIncome = (incomeEntries || []).reduce((sum, entry) => sum + parseFloat(entry.amount?.toString() || '0'), 0);
    const totalExpense = (expenseEntries || []).reduce((sum, entry) => sum + parseFloat(entry.amount?.toString() || '0'), 0);

    // Calculate monthly breakdown (April to March)
    const monthlyData: Array<{ month: string; income: number; expense: number }> = [];
    const monthNames = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (3 + i) % 12; // Start from April (3)
      const year = monthIndex >= 3 ? financialYearStart : financialYearEnd;
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0);
      
      const monthIncome = (incomeEntries || []).filter(entry => {
        if (!entry.entry_date) return false;
        const entryDate = new Date(entry.entry_date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      }).reduce((sum, entry) => sum + parseFloat(entry.amount?.toString() || '0'), 0);
      
      const monthExpense = (expenseEntries || []).filter(entry => {
        if (!entry.entry_date) return false;
        const entryDate = new Date(entry.entry_date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      }).reduce((sum, entry) => sum + parseFloat(entry.amount?.toString() || '0'), 0);
      
      monthlyData.push({
        month: monthNames[i],
        income: monthIncome,
        expense: monthExpense,
      });
    }

    // Fetch fee data
    const { data: feesData } = await supabase
      .from('fees')
      .select('total_amount, amount, payment_date, student_id')
      .eq('school_code', schoolCode);

    const today = new Date().toISOString().split('T')[0];
    const todayCollection = (feesData || [])
      .filter(f => f.payment_date === today)
      .reduce((sum, f) => sum + Number(f.total_amount || f.amount || 0), 0);

    // Calculate collected amount
    const totalCollected = (feesData || []).reduce((sum, f) => sum + Number(f.total_amount || f.amount || 0), 0);
    
    // Get all active students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    // Fetch fee schedules to calculate expected fees
    const { data: feeSchedules } = await supabase
      .from('fee_schedules')
      .select('amount, class, academic_year')
      .eq('school_code', schoolCode)
      .eq('is_active', true);

    // Calculate total expected fees based on fee schedules
    let totalExpectedFees = 0;
    if (feeSchedules && feeSchedules.length > 0) {
      // Get students by class to match with fee schedules
      const { data: students } = await supabase
        .from('students')
        .select('id, class, academic_year')
        .eq('school_code', schoolCode)
        .eq('status', 'active');

      if (students) {
        students.forEach(student => {
          const matchingSchedule = feeSchedules.find(
            schedule => schedule.class === student.class && 
            schedule.academic_year === student.academic_year
          );
          if (matchingSchedule) {
            totalExpectedFees += Number(matchingSchedule.amount || 0);
          }
        });
      }
    } else {
      // Fallback: estimate based on average fee per student
      const studentsWithFees = new Set((feesData || []).map(f => f.student_id));
      const avgFeePerStudent = studentsWithFees.size > 0 
        ? totalCollected / studentsWithFees.size 
        : 0;
      totalExpectedFees = avgFeePerStudent * (totalStudents || 0);
    }

    const totalDueAmount = totalExpectedFees > totalCollected ? totalExpectedFees - totalCollected : 0;

    // Calculate percentages
    const totalFeeAmount = totalCollected + totalDueAmount;
    const collectedPercent = totalFeeAmount > 0 ? (totalCollected / totalFeeAmount) * 100 : 0;
    const duePercent = totalFeeAmount > 0 ? (totalDueAmount / totalFeeAmount) * 100 : 0;

    // Count students with pending fees
    const studentsWithFees = new Set((feesData || []).map(f => f.student_id));
    const pendingStudents = (totalStudents || 0) - studentsWithFees.size;

    return NextResponse.json({
      data: {
        incomeAndExpense: {
          totalIncome,
          totalExpense,
          monthlyData,
        },
        feeManagement: {
          todayCollection,
          totalCollected,
          totalDue: totalDueAmount,
          collectedPercent,
          duePercent,
          totalStudents: totalStudents || 0,
          pendingStudents: pendingStudents > 0 ? pendingStudents : 0,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

