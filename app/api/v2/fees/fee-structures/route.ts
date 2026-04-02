import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { isMissingFeeStructuresDeletedAtColumn } from '@/lib/fees/fee-structure-deleted-at-compat';
import { getRequiredCurrentAcademicYear } from '@/lib/current-academic-year';
import {
  anchorYearFromAcademicYearLabel,
  computeInstallmentMonthsFromStructure,
} from '@/lib/fees/structure-installment-months';

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

    const structuresVisible = (structures || []).filter(
      (s: { is_system?: boolean }) => !s.is_system
    );

    // Fetch items for each structure
    if (structuresVisible.length > 0) {
      const structureIds = structuresVisible.map(s => s.id);
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
        structuresVisible.forEach(structure => {
          structure.items = items?.filter(item => item.fee_structure_id === structure.id) || [];
        });
      }
    }

    // Add "fees generated" metadata for UI.
    // We treat "generated" as: at least 1 row exists in `student_fees` for that structure.
    const structuresWithMeta = structuresVisible.map((s) => ({
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
      class_id,
      class_name,
      section,
      start_month,
      end_month,
      frequency,
      frequency_mode,
      plans,
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
    const currentYear = await getRequiredCurrentAcademicYear(normalizedSchoolCode);
    const normalizedAcademicYear = currentYear.year_name;
    const normalizedSection = section?.trim() || null;
    const normalizedClassName = class_name?.trim();
    const normalizedClassId = class_id ? String(class_id).trim() : null;

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

    // HARD CONSTRAINT: one fee structure per class-section-session for active session.
    // Soft-deleted rows also block (unless fully deleted) because we intentionally do NOT filter deleted_at.
    const existingQuery = supabase
      .from('fee_structures')
      .select('id, name')
      .eq('school_code', normalizedSchoolCode)
      .eq('class_name', normalizedClassName)
      .is('session_archived', false)
      .limit(1);
    const existingWithSection = normalizedSection
      ? existingQuery.eq('section', normalizedSection)
      : existingQuery.is('section', null);
    const existingWithYear = normalizedAcademicYear
      ? existingWithSection.eq('academic_year', normalizedAcademicYear)
      : existingWithSection.is('academic_year', null);
    const { data: existingRows, error: existingErr } = await existingWithYear;
    if (existingErr) {
      return NextResponse.json(
        { error: 'Failed to check existing structure', details: existingErr.message },
        { status: 500 }
      );
    }
    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
    if (existing) {
      return NextResponse.json(
        {
          error: 'Fee structure already exists for this class & section.',
          code: 'FEE_STRUCTURE_EXISTS',
          existing_structure_id: String(existing.id),
          existing_structure_name: String(existing.name || ''),
        },
        { status: 409 }
      );
    }

    // Create fee structure
    const dueDay = payment_due_day != null ? Math.min(31, Math.max(1, Number(payment_due_day))) : 15;
    const { data: feeStructure, error: insertError } = await supabase
      .from('fee_structures')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        name: name.trim(),
        class_id: normalizedClassId,
        class_name: normalizedClassName,
        section: normalizedSection,
        academic_year: normalizedAcademicYear,
        start_month: typeof start_month === 'string' ? parseInt(start_month) : (Number(start_month) || 0),
        end_month: typeof end_month === 'string' ? parseInt(end_month) : (Number(end_month) || 0),
        frequency,
        frequency_mode:
          frequency_mode === 'multiple'
            ? 'multiple'
            : 'single',
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
      const maybeCode = (insertError as { code?: string }).code;
      if (maybeCode === '23505') {
        return NextResponse.json(
          {
            error: 'Fee structure already exists for this class & section.',
            code: 'FEE_STRUCTURE_EXISTS',
          },
          { status: 409 }
        );
      }
      console.error('Error creating fee structure:', insertError);
      return NextResponse.json(
        { error: 'Failed to create fee structure', details: insertError.message },
        { status: 500 }
      );
    }

    // Create fee structure items (legacy summary items).
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

    // New model: create plan(s), period(s), and per-period components.
    const normalizedPlans: Array<{
      frequency: 'monthly' | 'quarterly' | 'yearly';
      start_month: number;
      end_month: number;
      payment_due_day: number;
      period_components?: Record<string, Array<{ fee_head_id: string; amount: number; is_enabled?: boolean }>>;
      default_components?: Array<{ fee_head_id: string; amount: number; is_enabled?: boolean }>;
    }> = Array.isArray(plans) && plans.length > 0
      ? plans
      : [
          {
            frequency: frequency as 'monthly' | 'quarterly' | 'yearly',
            start_month: Number(start_month),
            end_month: Number(end_month),
            payment_due_day: dueDay,
            default_components: items,
          },
        ];

    const anchorYear = anchorYearFromAcademicYearLabel(normalizedAcademicYear || '');

    for (const plan of normalizedPlans) {
      const freq = String(plan.frequency || '').toLowerCase();
      if (!['monthly', 'quarterly', 'yearly'].includes(freq)) continue;
      const pStart = Math.min(12, Math.max(1, Number(plan.start_month || start_month)));
      const pEnd = Math.min(12, Math.max(1, Number(plan.end_month || end_month)));
      const pDue = Math.min(31, Math.max(1, Number(plan.payment_due_day || dueDay)));

      const { data: createdPlan, error: planErr } = await supabase
        .from('fee_structure_frequency_plans')
        .insert({
          fee_structure_id: feeStructure.id,
          frequency: freq,
          start_month: pStart,
          end_month: pEnd,
          payment_due_day: pDue,
          is_active: true,
        })
        .select('id, frequency')
        .single();

      if (planErr || !createdPlan) {
        await supabase.from('fee_structures').delete().eq('id', feeStructure.id);
        return NextResponse.json(
          { error: 'Failed to create frequency plan', details: planErr?.message || 'No plan created' },
          { status: 500 }
        );
      }

      const periods = computeInstallmentMonthsFromStructure(
        {
          start_month: pStart,
          end_month: pEnd,
          frequency: freq,
          payment_due_day: pDue,
        },
        anchorYear
      );

      const periodRows = periods.map((p, idx) => ({
        fee_plan_id: createdPlan.id,
        period_key: freq === 'quarterly' ? `Q${idx + 1}` : p.due_month,
        period_label: freq === 'quarterly' ? `Q${idx + 1}` : p.due_month,
        due_month: p.due_month,
        due_date: p.due_date,
        sequence_no: idx + 1,
      }));

      const { data: createdPeriods, error: periodErr } = await supabase
        .from('fee_plan_periods')
        .insert(periodRows)
        .select('id, period_key');

      if (periodErr || !createdPeriods) {
        await supabase.from('fee_structures').delete().eq('id', feeStructure.id);
        return NextResponse.json(
          { error: 'Failed to create plan periods', details: periodErr?.message || 'No periods created' },
          { status: 500 }
        );
      }

      for (const period of createdPeriods) {
        const explicit = plan.period_components?.[String(period.period_key)] || null;
        const baseComponents = explicit && explicit.length > 0 ? explicit : (plan.default_components || items);
        const compRows = baseComponents
          .filter((c) => c && c.fee_head_id)
          .filter((c) => c.is_enabled !== false)
          .map((c) => ({
            fee_plan_period_id: period.id,
            fee_head_id: c.fee_head_id,
            amount: Math.max(0, Number(c.amount || 0)),
            is_enabled: c.is_enabled !== false,
          }));
        if (compRows.length === 0) continue;
        const { error: compErr } = await supabase
          .from('fee_plan_period_components')
          .insert(compRows);
        if (compErr) {
          await supabase.from('fee_structures').delete().eq('id', feeStructure.id);
          return NextResponse.json(
            { error: 'Failed to create period components', details: compErr.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      data: {
        ...feeStructure,
        items: createdItems || [],
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'ACADEMIC_YEAR_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/v2/fees/fee-structures:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
