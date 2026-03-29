import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const { id } = await params;
    const body = await request.json();
    const { school_code, target_student_ids, ...updates } = body;

    if (!school_code) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = school_code.toUpperCase();

    const allowed: Record<string, unknown> = {};
    const keys = [
      'is_active',
      'valid_from',
      'valid_to',
      'reason',
      'stack_order',
      'value_numeric',
      'value_type',
      'adjustment_type',
      'academic_year',
    ] as const;
    for (const k of keys) {
      if (k in updates && updates[k] !== undefined) allowed[k] = updates[k];
    }

    if (Object.keys(allowed).length > 0) {
      allowed.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('fee_adjustment_rules')
        .update(allowed)
        .eq('id', id)
        .eq('school_code', code);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (Array.isArray(target_student_ids)) {
      await supabase.from('fee_adjustment_rule_targets').delete().eq('rule_id', id);
      const rows = target_student_ids.map((sid: string) => ({ rule_id: id, student_id: String(sid) }));
      if (rows.length > 0) {
        const { error: tErr } = await supabase.from('fee_adjustment_rule_targets').insert(rows);
        if (tErr) {
          return NextResponse.json({ error: tErr.message }, { status: 500 });
        }
      }
    }

    const { data: rule } = await supabase.from('fee_adjustment_rules').select('*').eq('id', id).single();
    const { data: targets } = await supabase
      .from('fee_adjustment_rule_targets')
      .select('student_id')
      .eq('rule_id', id);

    return NextResponse.json({
      data: {
        ...rule,
        target_student_ids: (targets || []).map((t) => String(t.student_id)),
      },
    });
  } catch (e) {
    console.error('PATCH adjustment-rules', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const { id } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('fee_adjustment_rules')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode.toUpperCase());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Rule deleted' });
  } catch (e) {
    console.error('DELETE adjustment-rules', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
