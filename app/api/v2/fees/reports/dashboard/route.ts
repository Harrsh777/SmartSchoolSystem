import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/reports/dashboard
 * Get dashboard statistics
 * Query params: school_code
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    // Today's collection
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('school_code', normalizedSchoolCode)
      .eq('is_reversed', false)
      .gte('payment_date', todayStart)
      .lte('payment_date', todayEnd);

    const todayCollection = todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

    // Pending dues
    const { data: pendingFees } = await supabase
      .from('student_fees')
      .select('base_amount, paid_amount, adjustment_amount')
      .eq('school_code', normalizedSchoolCode)
      .in('status', ['pending', 'partial']);

    const pendingDues = pendingFees?.reduce((sum, f) => {
      const balance = f.base_amount + f.adjustment_amount - f.paid_amount;
      return sum + (balance > 0 ? balance : 0);
    }, 0) || 0;

    // Overdue amount
    const { data: overdueFees } = await supabase
      .from('student_fees')
      .select('base_amount, paid_amount, adjustment_amount, due_date')
      .eq('school_code', normalizedSchoolCode)
      .eq('status', 'overdue')
      .lt('due_date', today.toISOString().split('T')[0]);

    const overdueAmount = overdueFees?.reduce((sum, f) => {
      const balance = f.base_amount + f.adjustment_amount - f.paid_amount;
      return sum + (balance > 0 ? balance : 0);
    }, 0) || 0;

    // Counts
    const pendingCount = pendingFees?.length || 0;
    const overdueCount = overdueFees?.length || 0;

    return NextResponse.json({
      data: {
        today_collection: todayCollection,
        pending_dues: pendingDues,
        overdue_amount: overdueAmount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/reports/dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
