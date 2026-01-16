import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/simple/student
 * Get all certificates for a specific student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch certificates for the student
    const { data: certificates, error } = await supabase
      .from('simple_certificates')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching student certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: certificates || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/simple/student:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
