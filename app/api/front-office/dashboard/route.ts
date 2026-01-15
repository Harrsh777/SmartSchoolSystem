import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * GET /api/front-office/dashboard
 * Get dashboard data for Front Office (gate passes and visitors)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Calculate date range for last week (7 days)
    const selectedDateObj = new Date(date);
    const weekAgoDate = new Date(selectedDateObj);
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgoDateStr = weekAgoDate.toISOString().split('T')[0];

    // Get pending gate passes (awaiting approval)
    const { data: pendingGatePasses, error: pendingError } = await supabase
      .from('gate_passes')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .eq('date', date)
      .order('created_at', { ascending: false });

    // Get active gate passes (approved/active for today)
    const { data: activeGatePasses, error: activeError } = await supabase
      .from('gate_passes')
      .select('*')
      .eq('school_code', schoolCode)
      .in('status', ['approved', 'active'])
      .eq('date', date)
      .order('time_out', { ascending: false });

    // Get closed gate passes (for history/logs - last 7 days)
    const { data: closedGatePasses, error: closedError } = await supabase
      .from('gate_passes')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('status', 'closed')
      .gte('date', weekAgoDateStr)
      .lte('date', date)
      .order('marked_returned_at', { ascending: false })
      .limit(50); // Limit to last 50 closed passes

    // Get visitors IN (currently on campus)
    const { data: visitorsIn, error: visitorsError } = await supabase
      .from('visitors')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('status', 'IN')
      .eq('visit_date', date)
      .order('time_in', { ascending: false });

    // Get closed visitors (marked OUT - for history/logs - last 7 days)
    const { data: visitorsOut, error: visitorsOutError } = await supabase
      .from('visitors')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('status', 'OUT')
      .gte('visit_date', weekAgoDateStr)
      .lte('visit_date', date)
      .order('marked_out_at', { ascending: false })
      .limit(50); // Limit to last 50 closed visitors

    // Get statistics
    const { count: totalPending } = await supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .eq('date', date);

    const { count: totalActive } = await supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .in('status', ['approved', 'active'])
      .eq('date', date);

    const { count: totalVisitorsIn } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'IN')
      .eq('visit_date', date);

    const { count: totalClosed } = await supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'closed')
      .gte('date', weekAgoDateStr)
      .lte('date', date);

    const { count: totalVisitorsOut } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'OUT')
      .gte('visit_date', weekAgoDateStr)
      .lte('visit_date', date);

    if (pendingError || activeError || visitorsError || closedError || visitorsOutError) {
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data', details: pendingError?.message || activeError?.message || visitorsError?.message || closedError?.message || visitorsOutError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        pending_gate_passes: pendingGatePasses || [],
        active_gate_passes: activeGatePasses || [],
        closed_gate_passes: closedGatePasses || [],
        visitors_in: visitorsIn || [],
        visitors_out: visitorsOut || [],
        statistics: {
          pending_count: totalPending || 0,
          active_count: totalActive || 0,
          visitors_in_count: totalVisitorsIn || 0,
          closed_count: totalClosed || 0,
          visitors_out_count: totalVisitorsOut || 0,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching front office dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
