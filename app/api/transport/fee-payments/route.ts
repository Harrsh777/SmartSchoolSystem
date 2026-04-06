import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';
import { getTransportFeeMode, isSeparateTransportMode } from '@/lib/fees/transport-fee-mode';
import { formatTransportFeeLabel, type TransportSnapshot } from '@/lib/fees/transport-fee-sync';

const PAY_EPS = 0.02;

function normalizeMonthStart(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

async function sumPaidForMonth(
  supabase: ReturnType<typeof getServiceRoleClient>,
  schoolCode: string,
  studentId: string,
  periodMonth: string
): Promise<number> {
  const { data, error } = await supabase
    .from('transport_fee_payment_entries')
    .select('amount')
    .eq('school_code', schoolCode)
    .eq('student_id', studentId)
    .eq('period_month', periodMonth);

  if (error || !data) return 0;
  return data.reduce((s, r) => s + Number((r as { amount?: number }).amount || 0), 0);
}

/**
 * GET /api/transport/fee-payments
 * Paginated transport fee collections + optional roster with balances (SEPARATE mode).
 */
export async function GET(request: NextRequest) {
  try {
    const viewBlock = await requirePermission(request, 'view_fees');
    if (viewBlock) return viewBlock;

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }
    const code = schoolCode.toUpperCase().trim();
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('page_size') || '30', 10)));
    const roster = sp.get('roster') === '1';
    const studentId = sp.get('student_id')?.trim() || '';
    const classFilter = sp.get('class')?.trim() || '';
    const sectionFilter = sp.get('section')?.trim() || '';

    const supabase = getServiceRoleClient();
    const mode = await getTransportFeeMode(supabase, code);

    if (roster) {
      let q = supabase
        .from('students')
        .select(
          'id, admission_no, student_name, class, section, transport_route_id, transport_fee, transport_pickup_stop_id, transport_dropoff_stop_id'
        )
        .eq('school_code', code)
        .not('transport_route_id', 'is', null);

      if (studentId) q = q.eq('id', studentId);
      if (classFilter) q = q.eq('class', classFilter);
      if (sectionFilter) q = q.eq('section', sectionFilter);

      const { data: students, error: stErr } = await q
        .order('class', { ascending: true })
        .order('section', { ascending: true })
        .order('student_name', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (stErr) {
        return NextResponse.json({ error: stErr.message }, { status: 500 });
      }

      const routeIds = [
        ...new Set((students || []).map((s) => s.transport_route_id).filter(Boolean)),
      ] as string[];
      const routeNameById = new Map<string, string>();
      if (routeIds.length > 0) {
        const { data: routes } = await supabase
          .from('transport_routes')
          .select('id, name')
          .eq('school_code', code)
          .in('id', routeIds);
        for (const r of routes || []) {
          routeNameById.set(String((r as { id: string }).id), String((r as { name?: string }).name || 'Route'));
        }
      }

      const month = normalizeMonthStart(sp.get('billing_month') || new Date().toISOString())!;
      const rows = await Promise.all(
        (students || []).map(async (st) => {
          const sid = String(st.id);
          const monthly = Number(st.transport_fee || 0);
          const paid = monthly > 0 ? await sumPaidForMonth(supabase, code, sid, month) : 0;
          const expected = Math.round(monthly * 100) / 100;
          const paidR = Math.round(paid * 100) / 100;
          let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'NOROUTE' = 'NOROUTE';
          if (expected <= PAY_EPS) status = 'NOROUTE';
          else if (paidR <= PAY_EPS) status = 'PENDING';
          else if (paidR + PAY_EPS < expected) status = 'PARTIAL';
          else status = 'PAID';
          const balance = Math.max(0, Math.round((expected - paidR) * 100) / 100);
          return {
            student_id: sid,
            admission_no: st.admission_no,
            student_name: st.student_name,
            class: st.class,
            section: st.section,
            route_id: st.transport_route_id,
            route_name: st.transport_route_id
              ? routeNameById.get(String(st.transport_route_id)) || null
              : null,
            monthly_transport_fee: expected,
            billing_month: month,
            paid_this_month: paidR,
            balance_due: balance,
            status,
            transport_fee_mode: mode,
          };
        })
      );

      return NextResponse.json({
        data: rows.filter((r) => r.monthly_transport_fee > PAY_EPS),
        meta: { page, page_size: pageSize, transport_fee_mode: mode },
      });
    }

    let query = supabase
      .from('transport_fee_payment_entries')
      .select(
        `
        *,
        student:student_id (id, admission_no, student_name, class, section),
        collector:collected_by (full_name, staff_id)
      `,
        { count: 'exact' }
      )
      .eq('school_code', code)
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      meta: { page, page_size: pageSize, total: count ?? 0, transport_fee_mode: mode },
    });
  } catch (e) {
    console.error('GET /api/transport/fee-payments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/transport/fee-payments
 * Collect transport fee (SEPARATE mode only). Idempotent via idempotency_key.
 */
export async function POST(request: NextRequest) {
  try {
    const perm = await requirePermission(request, 'manage_fees');
    if (perm) return perm;

    const body = await request.json();
    const {
      school_code,
      student_id,
      amount,
      payment_mode,
      period_month,
      reference_no,
      remarks,
      idempotency_key,
      payment_date,
      is_manual_entry,
    } = body as Record<string, unknown>;

    if (!school_code || !student_id || amount == null || !payment_mode) {
      return NextResponse.json(
        { error: 'school_code, student_id, amount, and payment_mode are required' },
        { status: 400 }
      );
    }

    const code = String(school_code).toUpperCase().trim();
    const sid = String(student_id);
    const amt = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const month = normalizeMonthStart(String(period_month || ''));
    if (!month) {
      return NextResponse.json({ error: 'period_month must be a valid date (billing month)' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const mode = await getTransportFeeMode(supabase, code);
    if (!isSeparateTransportMode(mode)) {
      return NextResponse.json(
        { error: 'Transport fee collection here is only available when transport_fee_mode is SEPARATE' },
        { status: 400 }
      );
    }

    const idem = idempotency_key != null ? String(idempotency_key).trim() : '';
    if (idem) {
      const { data: existing } = await supabase
        .from('transport_fee_payment_entries')
        .select('*')
        .eq('school_code', code)
        .eq('idempotency_key', idem)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ message: 'Idempotent replay', data: existing }, { status: 200 });
      }
    }

    const { data: school, error: schoolErr } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', code)
      .single();
    if (schoolErr || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { data: student, error: stErr } = await supabase
      .from('students')
      .select(
        'id, school_code, transport_route_id, transport_fee, transport_pickup_stop_id, transport_dropoff_stop_id, transport_custom_fare, student_name, admission_no'
      )
      .eq('id', sid)
      .eq('school_code', code)
      .single();

    if (stErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!student.transport_route_id) {
      return NextResponse.json({ error: 'Student has no transport route assigned' }, { status: 400 });
    }

    const monthly = Number(student.transport_fee || 0);
    if (!Number.isFinite(monthly) || monthly <= PAY_EPS) {
      return NextResponse.json({ error: 'Student monthly transport fee is not set or zero' }, { status: 400 });
    }

    const expected = Math.round(monthly * 100) / 100;
    const priorPaid = await sumPaidForMonth(supabase, code, sid, month);
    const remainingBefore = Math.max(0, Math.round((expected - priorPaid) * 100) / 100);
    const payAmt = Math.round(amt * 100) / 100;

    if (payAmt > remainingBefore + PAY_EPS) {
      return NextResponse.json(
        {
          error: `Amount exceeds balance for this month (${remainingBefore})`,
          expected_monthly: expected,
          already_paid: Math.round(priorPaid * 100) / 100,
          balance_due: remainingBefore,
        },
        { status: 400 }
      );
    }

    const staffId = request.headers.get('x-staff-id');
    let collectedBy: string | null = null;
    let collectedByStaffId: string | null = null;
    let collectorName = 'Staff';

    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, staff_id, full_name')
        .eq('school_code', code)
        .eq('staff_id', staffId)
        .single();
      collectedBy = staff?.id || null;
      collectedByStaffId = (staff as { staff_id?: string } | null)?.staff_id || null;
      collectorName = (staff as { full_name?: string } | null)?.full_name || collectedByStaffId || 'Staff';
    }

    if (!collectedBy) {
      return NextResponse.json({ error: 'Collector information is required (x-staff-id)' }, { status: 400 });
    }

    const y = new Date(month).getFullYear();
    let receiptNo: string | null = null;
    const { data: rpcNo, error: rpcErr } = await supabase.rpc('generate_transport_receipt_number', {
      p_school_code: code,
      p_year: y,
    });
    if (!rpcErr && rpcNo) {
      receiptNo = String(rpcNo);
    } else {
      receiptNo = `${code}/TREC/${y}/${Date.now()}`;
    }

    const snap: TransportSnapshot = {
      amount: expected,
      custom_fare:
        student.transport_custom_fare != null && student.transport_custom_fare !== ''
          ? Number(student.transport_custom_fare)
          : null,
      pickup_stop_id: student.transport_pickup_stop_id ? String(student.transport_pickup_stop_id) : null,
      drop_stop_id: student.transport_dropoff_stop_id ? String(student.transport_dropoff_stop_id) : null,
      pickup_name: null,
      drop_name: null,
      pickup_fare: null,
      drop_fare: null,
      route_id: student.transport_route_id ? String(student.transport_route_id) : null,
      synced_at: new Date().toISOString(),
    };

    const payDate =
      payment_date != null && String(payment_date).trim()
        ? String(payment_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const totalAfter = Math.round((priorPaid + payAmt) * 100) / 100;
   const lineStatus: 'PARTIAL' | 'PAID' =
      totalAfter + PAY_EPS < expected ? 'PARTIAL' : 'PAID';

    const receiptPayload = {
      type: 'TRANSPORT_RECEIPT',
      student_name: student.student_name,
      admission_no: student.admission_no,
      period_month: month,
      amount_paid: payAmt,
      monthly_fee: expected,
      paid_before: Math.round(priorPaid * 100) / 100,
      paid_after: totalAfter,
      balance_after: Math.max(0, Math.round((expected - totalAfter) * 100) / 100),
      line_status: lineStatus,
      route_id: student.transport_route_id,
      fee_label: formatTransportFeeLabel(snap),
      payment_mode: String(payment_mode),
      transport_fee_mode_at_collection: mode,
    };

    const insertRow: Record<string, unknown> = {
      school_id: school.id,
      school_code: code,
      student_id: sid,
      route_id: student.transport_route_id,
      period_month: month,
      amount: payAmt,
      payment_date: payDate,
      payment_mode: String(payment_mode),
      reference_no: reference_no != null ? String(reference_no).trim() || null : null,
      receipt_no: receiptNo,
      collected_by: collectedBy,
      idempotency_key: idem || null,
      is_manual_entry: Boolean(is_manual_entry),
      transport_fee_mode_at_collection: mode,
      remarks: remarks != null ? String(remarks).trim() || null : null,
      receipt_payload: receiptPayload,
    };

    const { data: inserted, error: insErr } = await supabase
      .from('transport_fee_payment_entries')
      .insert(insertRow)
      .select()
      .single();

    if (insErr) {
      if (String(insErr.message || '').includes('idempotency') || insErr.code === '23505') {
        if (idem) {
          const { data: replay } = await supabase
            .from('transport_fee_payment_entries')
            .select('*')
            .eq('school_code', code)
            .eq('idempotency_key', idem)
            .maybeSingle();
          if (replay) {
            return NextResponse.json({ message: 'Idempotent replay', data: replay }, { status: 200 });
          }
        }
      }
      console.error('transport fee payment insert', insErr);
      return NextResponse.json({ error: 'Failed to record payment', details: insErr.message }, { status: 500 });
    }

    try {
      await supabase.from('income_entries').insert([
        {
          school_id: school.id,
          school_code: code,
          source: 'Transport Fees',
          amount: payAmt,
          entry_date: payDate,
          reference_number: receiptNo,
          notes: `Transport fee — ${student.admission_no} — ${month}`,
          created_by: collectedBy,
          is_active: true,
        },
      ]);
    } catch (e) {
      console.warn('Income entry for transport (non-fatal):', e);
    }

    logAudit(request, {
      userId: collectedBy,
      userName: collectorName,
      role: 'Accountant',
      actionType: 'TRANSPORT_FEE_PAID',
      entityType: 'TRANSPORT_FEE_PAYMENT',
      entityId: inserted.id,
      severity: 'CRITICAL',
      metadata: {
        amount: payAmt,
        receipt_no: receiptNo,
        period_month: month,
        transport_fee_mode: mode,
        manual: Boolean(is_manual_entry),
      },
    });

    return NextResponse.json(
      {
        message: 'Transport fee recorded',
        data: inserted,
        balance: receiptPayload.balance_after,
        status: lineStatus,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('POST /api/transport/fee-payments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
