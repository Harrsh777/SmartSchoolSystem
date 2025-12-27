import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch total students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    // Fetch fees for current month
    const { data: monthlyFees } = await supabase
      .from('fees')
      .select('amount, payment_date')
      .eq('school_code', schoolCode)
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth);

    // Calculate total fees given this month
    const totalFeesGiven = monthlyFees?.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0) || 0;

    // Calculate pending fees (students who haven't paid this month)
    // This is a simplified calculation - you may need to adjust based on your fee structure
    // For now, we'll calculate pending as students without fees this month
    // This is a simplified approach - you may need to adjust based on your fee structure
    const pendingFeesCount = (totalStudents || 0) - (monthlyFees?.length || 0);

    // Get current date for filtering published notices
    const today = new Date().toISOString().split('T')[0];
    const { data: publishedNotices } = await supabase
      .from('notices')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('status', 'Active')
      .or(`publish_at.is.null,publish_at.lte.${today}`);

    return NextResponse.json({
      data: {
        totalStudents: totalStudents || 0,
        pendingFeesThisMonth: pendingFeesCount,
        totalFeesGiven: totalFeesGiven,
        notices: publishedNotices?.length || 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching accountant stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

