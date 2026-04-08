import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import {
  FEE_STRUCTURES_DELETED_AT_SQL,
  isMissingFeeStructuresDeletedAtColumn,
  isSoftDeleteBlockedByMissingDeletedAtColumn,
} from '@/lib/fees/fee-structure-deleted-at-compat';

/**
 * GET /api/v2/fees/fee-structures/[id]
 * Get a specific fee structure with items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get structure first to get school_code for permission check
    const selectOne = () =>
      supabase
        .from('fee_structures')
        .select(`
        *,
        created_by_staff:created_by (id, full_name, staff_id),
        activated_by_staff:activated_by (id, full_name, staff_id)
      `)
        .eq('id', id);

    let { data: structure, error } = await selectOne().is('deleted_at', null).single();
    if (error && isMissingFeeStructuresDeletedAtColumn(error)) {
      ({ data: structure, error } = await selectOne().single());
    }

    if (error || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Now check permissions
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('fee_structure_items')
      .select(`
        *,
        fee_head:fee_head_id (id, name, description, is_optional)
      `)
      .eq('fee_structure_id', id);

    if (itemsError) {
      console.error('Error fetching fee structure items:', itemsError);
    }

    const { data: plans } = await supabase
      .from('fee_structure_frequency_plans')
      .select('id, frequency, start_month, end_month, payment_due_day, is_active')
      .eq('fee_structure_id', id)
      .order('frequency', { ascending: true });

    const { data: studentFeesRows } = await supabase
      .from('student_fees')
      .select('created_at')
      .eq('fee_structure_id', id);

    let fees_generated = false;
    let fees_generated_at: string | null = null;
    (studentFeesRows || []).forEach((row: { created_at?: string }) => {
      fees_generated = true;
      const createdAt = row.created_at ? String(row.created_at) : '';
      if (createdAt && (!fees_generated_at || createdAt > fees_generated_at)) {
        fees_generated_at = createdAt;
      }
    });

    return NextResponse.json({
      data: {
        ...structure,
        items: items || [],
        plans: plans || [],
        fees_generated,
        fees_generated_at,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/fee-structures/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v2/fees/fee-structures/[id]
 * Update a fee structure (only if not active)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Check if structure exists and is active
    let { data: existing, error: fetchError } = await supabase
      .from('fee_structures')
      .select('id, school_id, school_code, class_name, section, academic_year, frequency_mode, is_active, deleted_at')
      .eq('id', id)
      .single();

    if (fetchError && isMissingFeeStructuresDeletedAtColumn(fetchError)) {
      ({ data: existing, error: fetchError } = await supabase
        .from('fee_structures')
        .select('id, school_id, school_code, class_name, section, academic_year, frequency_mode, is_active')
        .eq('id', id)
        .single());
    }

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    if ((existing as { deleted_at?: string | null }).deleted_at) {
      return NextResponse.json(
        { error: 'This fee structure has been removed. It cannot be edited.' },
        { status: 400 }
      );
    }

    const isActive = existing.is_active as boolean;
    const onlyLateFeeUpdate = isActive && [
      'late_fee_type',
      'late_fee_value',
      'grace_period_days',
    ].every((key) => body[key] !== undefined) && [
      'name', 'class_name', 'section', 'academic_year', 'start_month', 'end_month',
      'frequency', 'payment_due_day', 'items',
    ].every((key) => body[key] === undefined);

    if (isActive && !onlyLateFeeUpdate) {
      return NextResponse.json(
        { error: 'Cannot update an active fee structure. Deactivate it first, or update only Late Fee (type, value, grace period).' },
        { status: 400 }
      );
    }

    // Update structure
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.class_name !== undefined) updateData.class_name = body.class_name.trim();
    if (body.section !== undefined) updateData.section = body.section?.trim() || null;
    if (body.academic_year !== undefined) updateData.academic_year = body.academic_year?.trim() || null;
    if (body.start_month !== undefined) updateData.start_month = typeof body.start_month === 'string' ? parseInt(body.start_month) : (Number(body.start_month) || 0);
    if (body.end_month !== undefined) updateData.end_month = typeof body.end_month === 'string' ? parseInt(body.end_month) : (Number(body.end_month) || 0);
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.late_fee_type !== undefined) updateData.late_fee_type = body.late_fee_type || null;
    if (body.late_fee_value !== undefined) updateData.late_fee_value = typeof body.late_fee_value === 'string' ? parseFloat(body.late_fee_value) : (Number(body.late_fee_value) || 0);
    if (body.grace_period_days !== undefined) updateData.grace_period_days = typeof body.grace_period_days === 'string' ? parseInt(body.grace_period_days) : (Number(body.grace_period_days) || 0);
    if (body.payment_due_day !== undefined) {
      const day = typeof body.payment_due_day === 'string' ? parseInt(body.payment_due_day) : Number(body.payment_due_day);
      updateData.payment_due_day = Math.min(31, Math.max(1, day || 15));
    }

    const { data: updated, error: updateError } = await supabase
      .from('fee_structures')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating fee structure:', updateError);
      return NextResponse.json(
        { error: 'Failed to update fee structure', details: updateError.message },
        { status: 500 }
      );
    }

    // Update items if provided
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await supabase.from('fee_structure_items').delete().eq('fee_structure_id', id);

      // Insert new items
      if (body.items.length > 0) {
        const structureItems = body.items.map((item: { fee_head_id: string; amount: number }) => ({
          fee_structure_id: id,
          fee_head_id: item.fee_head_id,
          amount: Number(item.amount),
        }));

        const { error: itemsError } = await supabase
          .from('fee_structure_items')
          .insert(structureItems);

        if (itemsError) {
          console.error('Error updating fee structure items:', itemsError);
          return NextResponse.json(
            { error: 'Failed to update fee structure items', details: itemsError.message },
            { status: 500 }
          );
        }
      }
    }

    // Keep generated student fees in sync after edits without deleting paid history.
    // Behavior:
    // - Upsert missing/new rows for all applicable + already-existing students.
    // - Update unpaid rows with new due_date/base_amount.
    // - Never delete rows and never change rows that have paid_amount > 0.
    const shouldSyncStudentFees = body.sync_student_fees !== false;
    if (shouldSyncStudentFees) {
      const updatedStructure = updated as {
        id: string;
        school_id?: string | null;
        school_code?: string | null;
        class_name?: string | null;
        section?: string | null;
        academic_year?: string | null;
        frequency_mode?: string | null;
      };

      const normalizedSchoolCode = String(updatedStructure.school_code || (existing as { school_code?: string | null }).school_code || '').toUpperCase().trim();
      const normalizedClassName = String(updatedStructure.class_name || '').trim();
      const normalizedSection = updatedStructure.section ? String(updatedStructure.section).trim() : null;
      const normalizedAcademicYear = updatedStructure.academic_year ? String(updatedStructure.academic_year).trim() : null;
      const structureSchoolId = updatedStructure.school_id || (existing as { school_id?: string | null }).school_id || null;
      const frequencyMode = String(updatedStructure.frequency_mode || (existing as { frequency_mode?: string | null }).frequency_mode || 'single').toLowerCase();

      // 1) Load plan periods + derive base amount per due_month from period components.
      const { data: plans } = await supabase
        .from('fee_structure_frequency_plans')
        .select('id')
        .eq('fee_structure_id', id)
        .eq('is_active', true);
      const planIds = (plans || []).map((p) => String(p.id));

      if (planIds.length > 0) {
        const { data: periodRows, error: periodErr } = await supabase
          .from('fee_plan_periods')
          .select('id, fee_plan_id, due_month, due_date, sequence_no')
          .in('fee_plan_id', planIds)
          .order('sequence_no', { ascending: true });
        if (periodErr) {
          return NextResponse.json(
            { error: 'Failed to sync student fees after edit', details: periodErr.message },
            { status: 500 }
          );
        }

        const periodIds = (periodRows || []).map((r) => String(r.id));
        const { data: componentRows, error: componentErr } = periodIds.length
          ? await supabase
              .from('fee_plan_period_components')
              .select('fee_plan_period_id, amount, is_enabled')
              .in('fee_plan_period_id', periodIds)
          : { data: [], error: null };
        if (componentErr) {
          return NextResponse.json(
            { error: 'Failed to sync student fees after edit', details: componentErr.message },
            { status: 500 }
          );
        }

        const amountByPeriodId = new Map<string, number>();
        (componentRows || []).forEach((c: { fee_plan_period_id: string; amount: number; is_enabled?: boolean }) => {
          if (c.is_enabled === false) return;
          const pid = String(c.fee_plan_period_id);
          amountByPeriodId.set(pid, (amountByPeriodId.get(pid) || 0) + Number(c.amount || 0));
        });

        const periodsByPlanId = new Map<
          string,
          Array<{ id: string; due_month: string; due_date: string; base_amount: number }>
        >();
        (periodRows || []).forEach((p: { id: string; fee_plan_id: string; due_month: string; due_date: string }) => {
          const planId = String(p.fee_plan_id);
          const arr = periodsByPlanId.get(planId) || [];
          arr.push({
            id: String(p.id),
            due_month: String(p.due_month),
            due_date: String(p.due_date),
            base_amount: Number(amountByPeriodId.get(String(p.id)) || 0),
          });
          periodsByPlanId.set(planId, arr);
        });

        // 2) Load existing rows so we can preserve paid rows and include already-linked students.
        const { data: existingRows, error: existingRowsErr } = await supabase
          .from('student_fees')
          .select('id, student_id, due_month, paid_amount')
          .eq('fee_structure_id', id);
        if (existingRowsErr) {
          return NextResponse.json(
            { error: 'Failed to sync student fees after edit', details: existingRowsErr.message },
            { status: 500 }
          );
        }

        const paidRowKeys = new Set<string>();
        const existingStudentIds = new Set<string>();
        (existingRows || []).forEach((r: { student_id: string; due_month: string; paid_amount?: number }) => {
          const sid = String(r.student_id || '');
          const dueMonth = String(r.due_month || '');
          if (!sid || !dueMonth) return;
          existingStudentIds.add(sid);
          if (Number(r.paid_amount || 0) > 0) {
            paidRowKeys.add(`${sid}::${dueMonth}`);
          }
        });

        // 3) Fetch currently applicable students from updated scope.
        let studentsQuery = supabase
          .from('students')
          .select('id, school_id, school_code')
          .ilike('class', normalizedClassName);
        if (structureSchoolId) {
          studentsQuery = studentsQuery.eq('school_id', structureSchoolId);
        } else {
          studentsQuery = studentsQuery.ilike('school_code', normalizedSchoolCode);
        }
        if (normalizedSection) studentsQuery = studentsQuery.ilike('section', normalizedSection);
        if (normalizedAcademicYear) studentsQuery = studentsQuery.eq('academic_year', normalizedAcademicYear);

        const { data: matchingStudents, error: matchingStudentsErr } = await studentsQuery;
        if (matchingStudentsErr) {
          return NextResponse.json(
            { error: 'Failed to sync student fees after edit', details: matchingStudentsErr.message },
            { status: 500 }
          );
        }

        const studentMeta = new Map<string, { school_id?: string | null; school_code?: string | null }>();
        (matchingStudents || []).forEach((s: { id: string; school_id?: string | null; school_code?: string | null }) => {
          studentMeta.set(String(s.id), { school_id: s.school_id || null, school_code: s.school_code || null });
        });

        // Add existing students too so edits can be upserted across already-generated rows.
        Array.from(existingStudentIds).forEach((sid) => {
          if (!studentMeta.has(sid)) {
            studentMeta.set(sid, { school_id: structureSchoolId, school_code: normalizedSchoolCode });
          }
        });

        const allStudentIds = Array.from(studentMeta.keys());

        // 4) Determine selected plan per student (multiple mode) or default single plan.
        const selectedPlanByStudent = new Map<string, string>();
        if (frequencyMode === 'multiple') {
          const { data: assignedPlans } = await supabase
            .from('student_payment_plans')
            .select('student_id, fee_plan_id')
            .eq('fee_structure_id', id)
            .in('student_id', allStudentIds);
          (assignedPlans || []).forEach((r: { student_id: string; fee_plan_id: string }) => {
            selectedPlanByStudent.set(String(r.student_id), String(r.fee_plan_id));
          });
        }
        const defaultPlanId = planIds[0] || '';

        // 5) Upsert editable rows only (skip paid rows so history is preserved exactly).
        const upsertRows: Array<Record<string, unknown>> = [];
        allStudentIds.forEach((sid) => {
          const selectedPlanId = frequencyMode === 'multiple'
            ? (selectedPlanByStudent.get(sid) || '')
            : defaultPlanId;
          if (!selectedPlanId) return;
          const periods = periodsByPlanId.get(selectedPlanId) || [];
          const meta = studentMeta.get(sid) || {};
          periods.forEach((period) => {
            const key = `${sid}::${period.due_month}`;
            if (paidRowKeys.has(key)) return;
            upsertRows.push({
              school_id: meta.school_id || structureSchoolId,
              school_code: String(meta.school_code || normalizedSchoolCode || '').toUpperCase(),
              student_id: sid,
              fee_structure_id: id,
              fee_plan_id: selectedPlanId,
              fee_plan_period_id: period.id,
              due_month: period.due_month,
              due_date: period.due_date,
              base_amount: period.base_amount,
            });
          });
        });

        if (upsertRows.length > 0) {
          const { error: upsertErr } = await supabase
            .from('student_fees')
            .upsert(upsertRows, { onConflict: 'student_id,fee_structure_id,due_month' });
          if (upsertErr) {
            return NextResponse.json(
              { error: 'Failed to sync student fees after edit', details: upsertErr.message },
              { status: 500 }
            );
          }
        }
      }
    }

    // Fetch updated structure with items
    const { data: items } = await supabase
      .from('fee_structure_items')
      .select(`
        *,
        fee_head:fee_head_id (id, name, description, is_optional)
      `)
      .eq('fee_structure_id', id);

    return NextResponse.json({
      data: {
        ...updated,
        items: items || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/v2/fees/fee-structures/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/fees/fee-structures/[id]
 * Allowed only when inactive.
 * - Keep only already-paid invoices (paid_amount > 0) so history remains visible in Student-wise.
 * - Remove unpaid generated rows and their line adjustments/allocations.
 * - Soft-delete structure so it disappears from active lists.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const supabase = getServiceRoleClient();

    let { data: existing, error: fetchError } = await supabase
      .from('fee_structures')
      .select('id, is_active, deleted_at')
      .eq('id', id)
      .single();

    if (fetchError && isMissingFeeStructuresDeletedAtColumn(fetchError)) {
      ({ data: existing, error: fetchError } = await supabase
        .from('fee_structures')
        .select('id, is_active')
        .eq('id', id)
        .single());
    }

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    if ((existing as { deleted_at?: string | null }).deleted_at) {
      return NextResponse.json(
        { error: 'This fee structure has already been removed.' },
        { status: 400 }
      );
    }

    if (existing.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete an active fee structure. Deactivate it first so no new fees can be generated.' },
        { status: 400 }
      );
    }

    const { data: paidFees, error: paidFeesErr } = await supabase
      .from('student_fees')
      .select('id')
      .eq('fee_structure_id', id)
      .gt('paid_amount', 0);

    if (paidFeesErr) {
      return NextResponse.json(
        { error: 'Failed to inspect structure invoices', details: paidFeesErr.message },
        { status: 500 }
      );
    }

    const paidFeeIds = (paidFees || []).map((r) => String(r.id));
    const hasPaidInvoices = paidFeeIds.length > 0;
    const { data: allFeeRows, error: allFeesErr } = await supabase
      .from('student_fees')
      .select('id')
      .eq('fee_structure_id', id);
    if (allFeesErr) {
      return NextResponse.json(
        { error: 'Failed to inspect structure invoices', details: allFeesErr.message },
        { status: 500 }
      );
    }
    const allFeeIds = (allFeeRows || []).map((r) => String(r.id));
    const unpaidFeeIds = allFeeIds.filter((fid) => !paidFeeIds.includes(fid));

    if (unpaidFeeIds.length > 0) {
      await supabase
        .from('student_fee_line_adjustments')
        .delete()
        .in('student_fee_id', unpaidFeeIds);
      await supabase
        .from('payment_allocations')
        .delete()
        .in('student_fee_id', unpaidFeeIds);
      await supabase
        .from('student_fees')
        .delete()
        .in('id', unpaidFeeIds);
    }

    if (!hasPaidInvoices) {
      await supabase.from('fee_structure_items').delete().eq('fee_structure_id', id);
      const { error: deleteError } = await supabase
        .from('fee_structures')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting fee structure:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete fee structure', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Fee structure deleted successfully',
        data: { id, soft_deleted: false, kept_paid_invoices: 0 },
      }, { status: 200 });
    }

    const now = new Date().toISOString();
    const { error: softErr } = await supabase
      .from('fee_structures')
      .update({
        deleted_at: now,
        is_active: false,
        activated_at: null,
        activated_by: null,
      })
      .eq('id', id);

    if (softErr) {
      if (isSoftDeleteBlockedByMissingDeletedAtColumn(softErr)) {
        return NextResponse.json(
          {
            error:
              'One-time database update required: add column fee_structures.deleted_at (see SQL below). Then in Supabase: Settings → Data API → Reload schema if the app still errors. After that, remove this structure again.',
            apply_sql: FEE_STRUCTURES_DELETED_AT_SQL,
          },
          { status: 422 }
        );
      }
      console.error('Error soft-deleting fee structure:', softErr);
      return NextResponse.json(
        { error: 'Failed to remove fee structure', details: softErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message:
        'Fee structure removed. Unpaid generated rows were deleted; paid invoices were kept for history.',
      data: { id, soft_deleted: true, kept_paid_invoices: paidFeeIds.length },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/v2/fees/fee-structures/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
