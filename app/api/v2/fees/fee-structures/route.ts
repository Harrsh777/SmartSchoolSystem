import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { isMissingFeeStructuresDeletedAtColumn } from '@/lib/fees/fee-structure-deleted-at-compat';

/**
 * GET /api/v2/fees/fee-structures
 * Get all fee structures for a school
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

    const selectStructures = () =>
      supabase
        .from('fee_structures')
        .select(`
        *,
        created_by_staff:created_by (id, full_name, staff_id),
        activated_by_staff:activated_by (id, full_name, staff_id)
      `)
        .eq('school_code', schoolCode.toUpperCase())
        .order('created_at', { ascending: false });

    let { data: structures, error } = await selectStructures().is('deleted_at', null);
    if (error && isMissingFeeStructuresDeletedAtColumn(error)) {
      ({ data: structures, error } = await selectStructures());
    }

    if (error) {
      console.error('Error fetching fee structures:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee structures', details: error.message },
        { status: 500 }
      );
    }

    // Fetch items for each structure
    if (structures && structures.length > 0) {
      const structureIds = structures.map(s => s.id);
      const { data: items, error: itemsError } = await supabase
        .from('fee_structure_items')
        .select(`
          *,
          fee_head:fee_head_id (id, name, description, is_optional)
        `)
        .in('fee_structure_id', structureIds);

      if (itemsError) {
        console.error('Error fetching fee structure items:', itemsError);
      } else {
        // Attach items to structures
        structures.forEach(structure => {
          structure.items = items?.filter(item => item.fee_structure_id === structure.id) || [];
        });
      }
    }

    // Add "fees generated" metadata for UI.
    // We treat "generated" as: at least 1 row exists in `student_fees` for that structure.
    const structuresWithMeta = (structures || []).map((s) => ({
      ...s,
      fees_generated: false,
      fees_generated_at: null as string | null,
    }));

    if (structuresWithMeta.length > 0) {
      const structureIds = structuresWithMeta.map(s => s.id);

      const { data: studentFeesRows } = await supabase
        .from('student_fees')
        .select('fee_structure_id, created_at')
        .in('fee_structure_id', structureIds);

      const metaById = new Map<string, { count: number; maxCreatedAt: string }>();
      (studentFeesRows || []).forEach((row: any) => {
        const sid = String(row.fee_structure_id);
        const createdAt = row.created_at ? String(row.created_at) : '';
        if (!sid) return;
        const existing = metaById.get(sid) || { count: 0, maxCreatedAt: '' };
        existing.count += 1;
        if (createdAt && (!existing.maxCreatedAt || createdAt > existing.maxCreatedAt)) {
          existing.maxCreatedAt = createdAt;
        }
        metaById.set(sid, existing);
      });

      structuresWithMeta.forEach((s) => {
        const m = metaById.get(s.id);
        if (!m) return;
        s.fees_generated = m.count > 0;
        s.fees_generated_at = m.maxCreatedAt || null;
      });
    }

    return NextResponse.json({ data: structuresWithMeta }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/fee-structures:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/fees/fee-structures
 * Create a new fee structure
 * Body: { school_code, name, class_name, section, academic_year, start_month, end_month, frequency, payment_due_day?, late_fee_type, late_fee_value, grace_period_days, items: [{ fee_head_id, amount }] }
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
      name,
      class_name,
      section,
      academic_year,
      start_month,
      end_month,
      frequency,
      payment_due_day,
      late_fee_type,
      late_fee_value,
      grace_period_days,
      items,
    } = body;

    // Validation
    if (!school_code || !name || !class_name || !start_month || !end_month || !frequency) {
      return NextResponse.json(
        { error: 'School code, name, class_name, start_month, end_month, and frequency are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one fee head item is required' },
        { status: 400 }
      );
    }

    if (start_month < 1 || start_month > 12 || end_month < 1 || end_month > 12) {
      return NextResponse.json(
        { error: 'Start month and end month must be between 1 and 12' },
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

    // Get staff_id from headers
    const staffId = request.headers.get('x-staff-id');
    let createdBy: string | null = null;
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', normalizedSchoolCode)
        .eq('staff_id', staffId)
        .single();
      createdBy = staff?.id || null;
    }

    // Create fee structure
    const dueDay = payment_due_day != null ? Math.min(31, Math.max(1, Number(payment_due_day))) : 15;
    const { data: feeStructure, error: insertError } = await supabase
      .from('fee_structures')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        name: name.trim(),
        class_name: class_name.trim(),
        section: section?.trim() || null,
        academic_year: academic_year?.trim() || null,
        start_month: typeof start_month === 'string' ? parseInt(start_month) : (Number(start_month) || 0),
        end_month: typeof end_month === 'string' ? parseInt(end_month) : (Number(end_month) || 0),
        frequency,
        payment_due_day: dueDay,
        late_fee_type: late_fee_type || null,
        late_fee_value: late_fee_value ? (typeof late_fee_value === 'string' ? parseFloat(late_fee_value) : Number(late_fee_value)) : 0,
        grace_period_days: grace_period_days ? (typeof grace_period_days === 'string' ? parseInt(grace_period_days) : Number(grace_period_days)) : 0,
        is_active: false, // Not active until explicitly activated
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating fee structure:', insertError);
      return NextResponse.json(
        { error: 'Failed to create fee structure', details: insertError.message },
        { status: 500 }
      );
    }

    // Create fee structure items
    const structureItems = items.map((item: { fee_head_id: string; amount: number }) => ({
      fee_structure_id: feeStructure.id,
      fee_head_id: item.fee_head_id,
      amount: Number(item.amount),
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('fee_structure_items')
      .insert(structureItems)
      .select(`
        *,
        fee_head:fee_head_id (id, name, description, is_optional)
      `);

    if (itemsError) {
      // Rollback: delete the structure
      await supabase.from('fee_structures').delete().eq('id', feeStructure.id);
      console.error('Error creating fee structure items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to create fee structure items', details: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...feeStructure,
        items: createdItems || [],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/fee-structures:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
