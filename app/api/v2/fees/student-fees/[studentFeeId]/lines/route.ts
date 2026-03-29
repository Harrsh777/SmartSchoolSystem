import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import {
  fetchLineAdjustmentsForFee,
} from '@/lib/fees/student-fee-line-adjustments';
import {
  filterClassLinesForFee,
  mergeStudentAndClassManualLines,
} from '@/lib/fees/class-fee-line-adjustments';
import { isClassFeeLineTableMissingError } from '@/lib/fees/class-fee-line-table';

function serializeSupabaseError(err: unknown, httpStatus?: number, httpStatusText?: string): string {
  if (err == null) {
    return httpStatus
      ? `HTTP ${httpStatus}${httpStatusText ? ` ${httpStatusText}` : ''}`
      : 'Unknown database error';
  }
  if (typeof err === 'string') return err.trim() || 'Unknown database error';
  if (err instanceof Error && err.message.trim()) return err.message.trim();

  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.code, o.error, o.error_description].filter(
      (p) => p != null && String(p).trim() !== ''
    );
    if (parts.length > 0) return parts.map(String).join(' — ');
    try {
      const keys = Object.keys(o);
      if (keys.length > 0) return JSON.stringify(o);
    } catch {
      /* ignore */
    }
  }

  return httpStatus
    ? `HTTP ${httpStatus}${httpStatusText ? ` ${httpStatusText}` : ''} (empty error body from PostgREST)`
    : 'Unknown database error';
}

/**
 * GET /api/v2/fees/student-fees/[studentFeeId]/lines?school_code=
 * Structure components (from fee_structure_items) + saved misc/discount lines.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentFeeId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const { studentFeeId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();

    const { data: fee, error: feeErr } = await supabase
      .from('student_fees')
      .select(
        `
        id,
        student_id,
        fee_structure_id,
        due_month,
        due_date,
        base_amount,
        paid_amount,
        adjustment_amount,
        status,
        fee_structure:fee_structure_id ( id, name, academic_year )
      `
      )
      .eq('id', studentFeeId)
      .ilike('school_code', code)
      .single();

    if (feeErr || !fee) {
      return NextResponse.json({ error: 'Student fee not found' }, { status: 404 });
    }

    const structureId = String(fee.fee_structure_id);
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
      .eq('fee_structure_id', structureId);

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

    const studentManual = await fetchLineAdjustmentsForFee(supabase, studentFeeId);

    const { data: stu } = await supabase
      .from('students')
      .select('class, section')
      .eq('id', String(fee.student_id))
      .ilike('school_code', code)
      .single();

    const className = String(stu?.class ?? '').trim();
    const section = String(stu?.section ?? '').trim();
    const fsMeta = fee.fee_structure as { academic_year?: string | null } | null;
    const structureAy = fsMeta?.academic_year != null ? String(fsMeta.academic_year).trim() : '';

    let matchingClass: ReturnType<typeof filterClassLinesForFee> = [];
    if (className && section) {
      const { data: classRows, error: classLineErr } = await supabase
        .from('class_fee_line_adjustments')
        .select(
          'id, class_name, section, academic_year, fee_structure_id, due_month, label, amount, kind, created_at'
        )
        .ilike('school_code', code)
        .ilike('class_name', className)
        .ilike('section', section);

      if (classLineErr) {
        if (!isClassFeeLineTableMissingError(classLineErr)) {
          console.warn('[student-fee lines] class_fee_line_adjustments:', classLineErr.message);
        }
      } else {
      matchingClass = filterClassLinesForFee(
        (classRows || []).map((r) => ({
          id: String(r.id),
          school_code: code,
          class_name: String(r.class_name),
          section: String(r.section),
          academic_year: r.academic_year != null ? String(r.academic_year) : null,
          fee_structure_id: String(r.fee_structure_id),
          due_month: String(r.due_month ?? ''),
          label: String(r.label),
          amount: Number(r.amount),
          kind: r.kind as 'misc' | 'discount',
          created_at: String(r.created_at),
        })),
        String(fee.fee_structure_id),
        fee.due_month,
        structureAy || null
      );
      }
    }
    const merged_manual = mergeStudentAndClassManualLines(studentManual, matchingClass);

    return NextResponse.json({
      data: {
        student_fee: fee,
        structure_components,
        manual_lines: merged_manual,
        editable: String(fee.status).toLowerCase() !== 'paid',
      },
    });
  } catch (e) {
    console.error('GET student-fee lines', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v2/fees/student-fees/[studentFeeId]/lines
 * Body: { school_code, label, amount, kind: 'misc' | 'discount' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentFeeId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const { studentFeeId } = await params;
    const body = await request.json();
    const { school_code, label, amount, kind } = body;

    if (!school_code || !label || amount == null || !kind) {
      return NextResponse.json(
        { error: 'school_code, label, amount, and kind are required' },
        { status: 400 }
      );
    }

    if (kind !== 'misc' && kind !== 'discount') {
      return NextResponse.json({ error: 'kind must be misc or discount' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = school_code.toUpperCase();

    const { data: fee, error: feeErr } = await supabase
      .from('student_fees')
      .select('id, status')
      .eq('id', studentFeeId)
      .eq('school_code', code)
      .single();

    if (feeErr || !fee) {
      return NextResponse.json({ error: 'Student fee not found' }, { status: 404 });
    }

    if (String(fee.status).toLowerCase() === 'paid') {
      return NextResponse.json(
        { error: 'Cannot add lines to a fully paid installment' },
        { status: 400 }
      );
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
      createdBy = staff?.id || null;
    }

    const insertPayload: Record<string, unknown> = {
      school_code: code,
      student_fee_id: studentFeeId,
      label: String(label).trim(),
      amount: signed,
      kind,
    };
    if (createdBy) insertPayload.created_by = createdBy;

    // Bulk-shaped insert avoids edge cases; omit RETURNING and re-fetch (clearer errors if SELECT differs).
    const insertResult = await supabase
      .from('student_fee_line_adjustments')
      .insert([insertPayload]);

    const insErr = insertResult.error;
    const httpStatus = insertResult.status;
    const httpStatusText = insertResult.statusText;

    if (insErr) {
      const msg = serializeSupabaseError(insErr, httpStatus, httpStatusText);
      console.error('POST student_fee_line_adjustments insert', {
        status: httpStatus,
        statusText: httpStatusText,
        raw: insErr,
        serialized: msg,
      });
      const code = (insErr as { code?: string }).code;
      if (code === '42P01' || msg.includes('does not exist') || msg.includes('PGRST205')) {
        return NextResponse.json(
          {
            error:
              'Table student_fee_line_adjustments is missing or not exposed to the API. Run the SQL migration in supabase/migrations (see 20260329140000 and 20260329150000) and reload the PostgREST schema in Supabase Dashboard → Settings → API.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: rows, error: selErr } = await supabase
      .from('student_fee_line_adjustments')
      .select('id, school_code, student_fee_id, label, amount, kind, created_at, created_by')
      .eq('student_fee_id', studentFeeId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (selErr) {
      const msg = serializeSupabaseError(selErr);
      console.error('POST student_fee_line_adjustments select-after-insert', selErr);
      return NextResponse.json(
        { error: `Line may have been saved but could not be reloaded: ${msg}` },
        { status: 500 }
      );
    }

    const labelTrim = String(label).trim();
    const row = rows?.find(
      (r) =>
        String(r.label) === labelTrim &&
        Number(r.amount) === signed &&
        String(r.kind) === kind
    );

    if (!row) {
      console.error('POST student_fee_line_adjustments: insert reported ok but no matching row', {
        studentFeeId,
        school: code,
        recent: rows,
      });
      return NextResponse.json(
        {
          error:
            'Insert did not return a visible row. Confirm table student_fee_line_adjustments exists, matches the migration, and reload the PostgREST schema cache.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    console.error('POST student-fee lines', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
