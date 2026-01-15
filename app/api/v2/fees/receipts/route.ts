import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/receipts
 * Get all receipts for a school or student
 * Query params: school_code, student_id (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('receipts')
      .select(`
        *,
        student:student_id (id, admission_no, student_name, class, section),
        payment:payment_id (id, amount, payment_mode, payment_date, reference_no),
        issuer:issued_by (id, full_name, staff_id)
      `)
      .eq('school_code', schoolCode.toUpperCase())
      .eq('is_cancelled', false)
      .order('issued_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: receipts, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: receipts || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
