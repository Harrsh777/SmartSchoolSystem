import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';

/**
 * GET /api/v2/fees/adjustment-rules?school_code=
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('fee_adjustment_rules')
      .select('*')
      .eq('school_code', schoolCode.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ruleIds = (data || []).map((r) => r.id);
    const targetsByRule: Record<string, string[]> = {};
    if (ruleIds.length > 0) {
      const { data: targets } = await supabase
        .from('fee_adjustment_rule_targets')
        .select('rule_id, student_id')
        .in('rule_id', ruleIds);
      for (const t of targets || []) {
        const rid = String(t.rule_id);
        if (!targetsByRule[rid]) targetsByRule[rid] = [];
        targetsByRule[rid].push(String(t.student_id));
      }
    }

    const withTargets = (data || []).map((r) => ({
      ...r,
      target_student_ids: targetsByRule[String(r.id)] || [],
    }));

    return NextResponse.json({ data: withTargets }, { status: 200 });
  } catch (e) {
    console.error('GET adjustment-rules', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v2/fees/adjustment-rules
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const body = await request.json();
    const {
      school_code,
      scope,
      class_name,
      section,
      apply_to_all_students_in_class,
      student_id,
      adjustment_type,
      value_type,
      value_numeric,
      apply_on,
      fee_head_id,
      valid_from,
      valid_to,
      academic_year,
      reason,
      stack_order,
      target_student_ids,
    } = body;

    if (!school_code || !scope || !adjustment_type || !value_type || value_numeric == null) {
      return NextResponse.json(
        { error: 'school_code, scope, adjustment_type, value_type, and value_numeric are required' },
        { status: 400 }
      );
    }
    if (!valid_from || !valid_to) {
      return NextResponse.json({ error: 'valid_from and valid_to are required' }, { status: 400 });
    }
    if (scope === 'class' && !class_name) {
      return NextResponse.json({ error: 'class_name is required for class scope' }, { status: 400 });
    }
    if (scope === 'student' && !student_id) {
      return NextResponse.json({ error: 'student_id is required for student scope' }, { status: 400 });
    }
    if (apply_on === 'fee_head' && !fee_head_id) {
      return NextResponse.json({ error: 'fee_head_id is required when apply_on is fee_head' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = school_code.toUpperCase();

    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

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
      creatorName = (staff as { full_name?: string } | null)?.full_name || staffId;
    }

    const applyAll =
      scope !== 'class' ? true : Boolean(apply_to_all_students_in_class !== false);

    const { data: rule, error: insertError } = await supabase
      .from('fee_adjustment_rules')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        scope,
        class_name: scope === 'class' ? String(class_name).trim() : null,
        section: section ? String(section).trim() : null,
        apply_to_all_students_in_class: applyAll,
        student_id: scope === 'student' ? student_id : null,
        adjustment_type,
        value_type,
        value_numeric: Number(value_numeric),
        apply_on: apply_on || 'total',
        fee_head_id: apply_on === 'fee_head' ? fee_head_id : null,
        valid_from,
        valid_to,
        academic_year: academic_year?.trim() || null,
        reason: reason?.trim() || null,
        stack_order: stack_order != null ? Number(stack_order) : 100,
        is_active: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError || !rule) {
      console.error(insertError);
      return NextResponse.json(
        { error: 'Failed to create rule', details: insertError?.message },
        { status: 500 }
      );
    }

    const targets: string[] = Array.isArray(target_student_ids) ? target_student_ids.map(String) : [];
    if (scope === 'class' && !applyAll && targets.length > 0) {
      const rows = targets.map((sid) => ({ rule_id: rule.id, student_id: sid }));
      const { error: tErr } = await supabase.from('fee_adjustment_rule_targets').insert(rows);
      if (tErr) {
        await supabase.from('fee_adjustment_rules').delete().eq('id', rule.id);
        return NextResponse.json({ error: 'Failed to save student targets', details: tErr.message }, { status: 500 });
      }
    }

    logAudit(request, {
      userId: createdBy ?? undefined,
      userName: creatorName,
      role: 'Accountant',
      actionType: 'DISCOUNT_APPLIED',
      entityType: 'FEE',
      entityId: rule.id,
      severity: 'MEDIUM',
      metadata: { scope, adjustment_type, value_numeric },
    });

    return NextResponse.json({ data: { ...rule, target_student_ids: targets } }, { status: 201 });
  } catch (e) {
    console.error('POST adjustment-rules', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
