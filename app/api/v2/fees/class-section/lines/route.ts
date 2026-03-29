import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { feeStructureMatchesSelection } from '@/lib/fees/fee-structure-class-match';
import { normalizeFeeDueMonthKey } from '@/lib/fees/due-month-key';
import { isClassFeeLineTableMissingError } from '@/lib/fees/class-fee-line-table';

function serializeInsertError(err: unknown, httpStatus?: number, httpStatusText?: string): string {
  if (err == null) {
    return httpStatus ? `HTTP ${httpStatus} ${httpStatusText || ''}`.trim() : 'Unknown error';
  }
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.code].filter(
      (p) => p != null && String(p).trim() !== ''
    );
    if (parts.length) return parts.map(String).join(' — ');
  }
  return 'Failed to save';
}

/**
 * GET /api/v2/fees/class-section/lines?school_code&class&section&fee_structure_id&due_month&academic_year
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code')?.trim();
    const className = sp.get('class')?.trim() || '';
    const section = sp.get('section')?.trim() || '';
    const feeStructureId = sp.get('fee_structure_id')?.trim() || '';
    const dueMonth = sp.get('due_month')?.trim() || '';
    const academicYear = sp.get('academic_year')?.trim() || '';

    if (!schoolCode || !className || !section || !feeStructureId || !dueMonth || !academicYear) {
      return NextResponse.json(
        { error: 'school_code, class, section, fee_structure_id, due_month, academic_year are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();
    const dueMonthKey = normalizeFeeDueMonthKey(dueMonth);
    const dueMonthVariants = Array.from(new Set([dueMonthKey, dueMonth].filter((x) => x.length > 0)));

    const { data: items, error: itemsErr } = await supabase
      .from('fee_structure_items')
      .select(
        `
        id,
        fee_head_id,
        amount,
        fee_head:fee_head_id ( id, name )
      `
      )
      .eq('fee_structure_id', feeStructureId);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const structure_components = (items || []).map((row: Record<string, unknown>) => {
      const fh = row.fee_head as { name?: string } | null;
      return {
        fee_head_id: String(row.fee_head_id),
        name: fh?.name ? String(fh.name) : 'Fee head',
        amount: Number(row.amount || 0),
      };
    });

    const clResult = await supabase
      .from('class_fee_line_adjustments')
      .select('id, label, amount, kind, created_at, academic_year')
      .ilike('school_code', code)
      .ilike('class_name', className)
      .ilike('section', section)
      .eq('fee_structure_id', feeStructureId)
      .in('due_month', dueMonthVariants.length > 0 ? dueMonthVariants : [dueMonth])
      .order('created_at', { ascending: true });

    let classLines = clResult.data || [];
    let class_fee_lines_available = true;
    const migrationHint =
      'Apply the Supabase migration: supabase/migrations/20260329200000_class_fee_line_adjustments.sql (or 20260330190000_ensure_class_fee_line_adjustments.sql), then reload the API schema if needed.';

    if (clResult.error) {
      if (isClassFeeLineTableMissingError(clResult.error)) {
        console.warn('[GET class-section/lines] class_fee_line_adjustments unavailable:', clResult.error);
        classLines = [];
        class_fee_lines_available = false;
      } else {
        return NextResponse.json({ error: clResult.error.message }, { status: 500 });
      }
    }

    const manual_lines = (classLines || [])
      .filter((row) => {
        const ay = row.academic_year != null ? String(row.academic_year).trim() : '';
        if (ay === '') return true;
        return ay === academicYear;
      })
      .map((row) => ({
        id: String(row.id),
        label: String(row.label),
        amount: Number(row.amount),
        kind: row.kind as 'misc' | 'discount',
        created_at: String(row.created_at),
        source: 'class' as const,
      }));

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', code)
      .ilike('class', className)
      .ilike('section', section)
      .limit(800);

    const studentIds = (students || []).map((s) => s.id);
    let editable = true;
    if (studentIds.length > 0) {
      const { data: fees } = await supabase
        .from('student_fees')
        .select('id, status')
        .ilike('school_code', code)
        .eq('fee_structure_id', feeStructureId)
        .in('due_month', dueMonthVariants.length > 0 ? dueMonthVariants : [dueMonth])
        .in('student_id', studentIds);

      if ((fees || []).length > 0) {
        editable = (fees || []).some((f) => String(f.status || '').toLowerCase() !== 'paid');
      }
    }

    return NextResponse.json({
      data: {
        structure_components,
        manual_lines,
        editable: class_fee_lines_available ? editable : false,
        class_fee_lines_available,
        ...(class_fee_lines_available ? {} : { migration_hint: migrationHint }),
      },
    });
  } catch (e) {
    console.error('GET class-section lines', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v2/fees/class-section/lines
 * Body: school_code, class_name, section, academic_year, fee_structure_id, due_month, label, amount, kind
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const body = await request.json();
    const school_code = typeof body.school_code === 'string' ? body.school_code.trim() : '';
    const class_name = typeof body.class_name === 'string' ? body.class_name.trim() : '';
    const section = typeof body.section === 'string' ? body.section.trim() : '';
    const academic_year =
      body.academic_year != null && String(body.academic_year).trim() !== ''
        ? String(body.academic_year).trim()
        : null;
    const fee_structure_id = typeof body.fee_structure_id === 'string' ? body.fee_structure_id.trim() : '';
    const due_month = typeof body.due_month === 'string' ? body.due_month.trim() : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const amount = body.amount;
    const kind = body.kind;

    if (!school_code || !class_name || !section || !fee_structure_id || !due_month || !label || amount == null || !kind) {
      return NextResponse.json(
        { error: 'school_code, class_name, section, fee_structure_id, due_month, label, amount, kind are required' },
        { status: 400 }
      );
    }
    if (kind !== 'misc' && kind !== 'discount') {
      return NextResponse.json({ error: 'kind must be misc or discount' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = school_code.toUpperCase();
    const dueKey = normalizeFeeDueMonthKey(due_month);
    const dueVariants = Array.from(new Set([dueKey, due_month].filter((x) => String(x).trim().length > 0)));
    const migrationHint =
      'Apply supabase/migrations/20260329200000_class_fee_line_adjustments.sql (or 20260330190000_ensure_class_fee_line_adjustments.sql) and reload the PostgREST schema.';

    const { data: structure, error: fsLookupErr } = await supabase
      .from('fee_structures')
      .select('id, school_code, academic_year, class_name, section, is_active')
      .eq('id', fee_structure_id)
      .ilike('school_code', code)
      .maybeSingle();

    if (fsLookupErr) {
      return NextResponse.json({ error: fsLookupErr.message }, { status: 500 });
    }
    if (!structure) {
      return NextResponse.json({ error: 'Fee structure not found for this school' }, { status: 404 });
    }
    if (structure.is_active === false) {
      return NextResponse.json({ error: 'Fee structure is not active' }, { status: 400 });
    }

    if (
      !feeStructureMatchesSelection(structure, {
        className: class_name,
        section,
        academicYear: academic_year,
      })
    ) {
      return NextResponse.json(
        { error: 'Fee structure does not match this class, section, or academic year' },
        { status: 400 }
      );
    }

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', code)
      .ilike('class', class_name)
      .ilike('section', section)
      .limit(800);

    const studentIds = (students || []).map((s) => s.id);
    if (studentIds.length > 0) {
      const { data: fees } = await supabase
        .from('student_fees')
        .select('id, status')
        .ilike('school_code', code)
        .eq('fee_structure_id', fee_structure_id)
        .in('due_month', dueVariants)
        .in('student_id', studentIds);

      if (fees && fees.length > 0) {
        const allPaid = fees.every((f) => String(f.status || '').toLowerCase() === 'paid');
        if (allPaid) {
          return NextResponse.json(
            { error: 'All students have paid this installment; class lines cannot be added' },
            { status: 400 }
          );
        }
      }
    }

    let signed = Number(amount);
    if (!Number.isFinite(signed)) {
      return NextResponse.json({ error: 'amount must be a valid number' }, { status: 400 });
    }
    signed = Math.round(signed * 100) / 100;
    if (kind === 'misc' && signed < 0) signed = Math.abs(signed);
    if (kind === 'discount' && signed > 0) signed = -signed;

    const staffId = request.headers.get('x-staff-id');
    let createdBy: string | null = null;
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', code)
        .eq('staff_id', staffId)
        .single();
      createdBy = staff?.id ? String(staff.id) : null;
    }

    const insertPayload: Record<string, unknown> = {
      school_code: code,
      class_name,
      section,
      academic_year,
      fee_structure_id,
      due_month: dueKey,
      label,
      amount: signed,
      kind,
    };
    if (createdBy) insertPayload.created_by = createdBy;

    const insertResult = await supabase.from('class_fee_line_adjustments').insert([insertPayload]);

    if (insertResult.error) {
      if (isClassFeeLineTableMissingError(insertResult.error)) {
        return NextResponse.json({ error: migrationHint }, { status: 503 });
      }
      const msg = serializeInsertError(
        insertResult.error,
        (insertResult as { status?: number }).status,
        (insertResult as { statusText?: string }).statusText
      );
      console.error('POST class_fee_line_adjustments', insertResult.error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: rows } = await supabase
      .from('class_fee_line_adjustments')
      .select('id, label, amount, kind, created_at, academic_year')
      .ilike('school_code', code)
      .ilike('class_name', class_name)
      .ilike('section', section)
      .eq('fee_structure_id', fee_structure_id)
      .in('due_month', dueVariants)
      .eq('label', label)
      .order('created_at', { ascending: false })
      .limit(5);

    const row = rows?.find(
      (r) =>
        Number(r.amount) === signed &&
        String(r.kind) === kind &&
        (academic_year == null
          ? r.academic_year == null
          : String(r.academic_year ?? '') === academic_year)
    );

    if (!row) {
      return NextResponse.json({ error: 'Saved but could not reload row' }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          id: String(row.id),
          label: String(row.label),
          amount: Number(row.amount),
          kind: row.kind,
          created_at: String(row.created_at),
          source: 'class' as const,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('POST class-section lines', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
