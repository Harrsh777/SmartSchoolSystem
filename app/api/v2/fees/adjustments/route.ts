import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';

/**
 * GET /api/v2/fees/adjustments
 * Get all adjustments
 * Query params: school_code, student_id (optional), status (optional)
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
    const status = searchParams.get('status');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('fee_adjustments')
      .select(`
        *,
        student_fee:student_fee_id (
          id,
          student_id,
          due_month,
          due_date,
          student:student_id (admission_no, student_name)
        ),
        created_by_staff:created_by (id, full_name, staff_id),
        approved_by_staff:approved_by (id, full_name, staff_id)
      `)
      .eq('school_code', schoolCode.toUpperCase())
      .order('created_at', { ascending: false });

    if (studentId) {
      // Filter by student_id through student_fees
      const { data: studentFees } = await supabase
        .from('student_fees')
        .select('id')
        .eq('student_id', studentId);
      
      if (studentFees && studentFees.length > 0) {
        query = query.in('student_fee_id', studentFees.map(f => f.id));
      } else {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: adjustments, error } = await query;

    if (error) {
      console.error('Error fetching adjustments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch adjustments', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: adjustments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/adjustments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/fees/adjustments
 * Create a new adjustment (requires approval)
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const body = await request.json();
    const {
      school_code,
      student_fee_id,
      amount,
      adjustment_type,
      reason,
    } = body;

    if (!school_code || !student_fee_id || !amount || !adjustment_type || !reason) {
      return NextResponse.json(
        { error: 'School code, student fee ID, amount, adjustment type, and reason are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = school_code.toUpperCase();

    // Get school_id
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify student_fee exists
    const { data: studentFee, error: feeError } = await supabase
      .from('student_fees')
      .select('id, student_id, school_code')
      .eq('id', student_fee_id)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (feeError || !studentFee) {
      return NextResponse.json(
        { error: 'Student fee not found' },
        { status: 404 }
      );
    }

    // Get creator info
    const staffId = request.headers.get('x-staff-id');
    let createdBy: string | null = null;
    let creatorName = 'Staff';
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('school_code', normalizedSchoolCode)
        .eq('staff_id', staffId)
        .single();
      createdBy = staff?.id || null;
      creatorName = (staff as { full_name?: string } | null)?.full_name || staffId || 'Staff';
    }

    // Create adjustment
    const { data: adjustment, error: insertError } = await supabase
      .from('fee_adjustments')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        student_fee_id: student_fee_id,
        amount: typeof amount === 'string' ? parseFloat(amount) : Number(amount),
        adjustment_type,
        reason: reason.trim(),
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating adjustment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create adjustment', details: insertError.message },
        { status: 500 }
      );
    }

    // Audit log (Security & Action Audit dashboard)
    logAudit(request, {
      userId: createdBy ?? undefined,
      userName: creatorName,
      role: 'Accountant',
      actionType: 'DISCOUNT_APPLIED',
      entityType: 'FEE',
      entityId: adjustment.id,
      severity: 'MEDIUM',
      metadata: { amount, adjustment_type, reason: reason?.slice(0, 200) },
    });

    return NextResponse.json({ data: adjustment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/adjustments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
