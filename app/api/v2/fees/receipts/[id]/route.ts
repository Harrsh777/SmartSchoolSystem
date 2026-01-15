import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/receipts/[id]
 * Get a specific receipt
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select(`
        *,
        student:student_id (id, admission_no, student_name, class, section),
        payment:payment_id (
          id,
          amount,
          payment_mode,
          payment_date,
          reference_no,
          allocations:payment_allocations (
            *,
            student_fee:student_fee_id (
              id,
              due_month,
              due_date,
              base_amount,
              fee_structure:fee_structure_id (name)
            )
          )
        ),
        issuer:issued_by (id, full_name, staff_id)
      `)
      .eq('id', id)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: receipt }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/receipts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
