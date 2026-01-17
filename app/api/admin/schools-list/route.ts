import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// Get list of all accepted schools for filters
export async function GET() {
  try {
    const supabase = getServiceRoleClient();

    const { data: schools, error } = await supabase
      .from('accepted_schools')
      .select('school_code, school_name')
      .order('school_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch schools', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      schools: schools || [],
    });
  } catch (error) {
    console.error('Error fetching schools list:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
