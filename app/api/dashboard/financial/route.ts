import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schoolCode = searchParams.get('school_code');
  const period = searchParams.get('period') || 'monthly'; // monthly or quarterly
  
  try {

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

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

    // Fetch fees data for this school (all fees are paid when recorded)
    const { data: feesData, error: feesError } = await supabase
      .from('fees')
      .select('total_amount, amount, payment_date, created_at')
      .eq('school_code', schoolCode)
      .order('payment_date', { ascending: false });

    if (feesError) {
      console.error('Error fetching fees:', feesError);
    }

    // Calculate monthly or quarterly earnings
    const monthlyEarnings: { month: string; earnings: number }[] = [];
    const now = new Date();
    
    if (period === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        
        // Calculate earnings for this month using payment_date or created_at
        const monthEarnings = (feesData || []).filter(f => {
          const feeDate = f.payment_date ? new Date(f.payment_date) : (f.created_at ? new Date(f.created_at) : null);
          if (!feeDate) return false;
          return feeDate >= monthDate && feeDate < nextMonth;
        }).reduce((sum, f) => {
          const feeAmount = f.total_amount || f.amount || 0;
          return sum + Number(feeAmount);
        }, 0);

        monthlyEarnings.push({
          month: monthName,
          earnings: monthEarnings,
        });
      }
    } else {
      // Last 4 quarters
      for (let i = 3; i >= 0; i--) {
        const quarterStartMonth = Math.floor((now.getMonth() - (i * 3)) / 3) * 3;
        const quarterDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        const nextQuarter = new Date(quarterDate.getFullYear(), quarterDate.getMonth() + 3, 1);
        const quarterName = `Q${Math.floor(quarterDate.getMonth() / 3) + 1} ${quarterDate.getFullYear().toString().slice(-2)}`;
        
        // Calculate earnings for this quarter
        const quarterEarnings = (feesData || []).filter(f => {
          const feeDate = f.payment_date ? new Date(f.payment_date) : (f.created_at ? new Date(f.created_at) : null);
          if (!feeDate) return false;
          return feeDate >= quarterDate && feeDate < nextQuarter;
        }).reduce((sum, f) => {
          const feeAmount = f.total_amount || f.amount || 0;
          return sum + Number(feeAmount);
        }, 0);

        monthlyEarnings.push({
          month: quarterName,
          earnings: quarterEarnings,
        });
      }
    }

    // Calculate total revenue (all fees collected)
    const totalRevenue = (feesData || []).reduce((sum, f) => {
      const feeAmount = f.total_amount || f.amount || 0;
      return sum + Number(feeAmount);
    }, 0);

    // Calculate this month's earnings
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEarnings = (feesData || []).filter(f => {
      const feeDate = f.payment_date ? new Date(f.payment_date) : (f.created_at ? new Date(f.created_at) : null);
      if (!feeDate) return false;
      return feeDate >= startOfMonth;
    }).reduce((sum, f) => {
      const feeAmount = f.total_amount || f.amount || 0;
      return sum + Number(feeAmount);
    }, 0);

    const totalTransactions = feesData?.length || 0;

    return NextResponse.json({
      data: {
        totalRevenue,
        monthlyEarnings,
        thisMonthEarnings,
        totalTransactions,
        period: period,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    
    // Return empty data if error
    const sampleMonths = period === 'monthly' 
      ? ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'];
    const emptyEarnings = sampleMonths.map(month => ({
      month,
      earnings: 0,
    }));

    return NextResponse.json({
      data: {
        totalRevenue: 0,
        monthlyEarnings: emptyEarnings,
        thisMonthEarnings: 0,
        totalTransactions: 0,
        period: period,
      },
    }, { status: 200 });
  }
}
