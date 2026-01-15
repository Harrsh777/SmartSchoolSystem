import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!schoolCode || !month) {
      return NextResponse.json(
        { error: 'School code and month (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    // Parse month and get start/end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch collections for the month
    const { data: collections, error } = await supabase
      .from('fee_collections')
      .select('*')
      .eq('school_code', schoolCode)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .eq('cancelled', false)
      .order('payment_date', { ascending: true });

    if (error) {
      console.error('Error fetching monthly collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch monthly collections', details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary by day
    const dailyBreakdown: Record<string, { total: number; count: number }> = {};
    let totalCollected = 0;
    let totalTransactions = 0;

    collections?.forEach(collection => {
      const date = collection.payment_date;
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { total: 0, count: 0 };
      }
      const amount = parseFloat(collection.total_amount?.toString() || '0');
      dailyBreakdown[date].total += amount;
      dailyBreakdown[date].count += 1;
      totalCollected += amount;
      totalTransactions += 1;
    });

    return NextResponse.json({
      data: {
        month,
        start_date: startDate,
        end_date: endDate,
        total_collected: totalCollected,
        total_transactions: totalTransactions,
        daily_breakdown: dailyBreakdown,
        collections: collections || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
