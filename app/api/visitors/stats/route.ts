import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

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

    const supabase = getServiceRoleClient();

    const { count, error } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    if (error) {
      console.error('Error fetching visitor stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total_visitors: count || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

