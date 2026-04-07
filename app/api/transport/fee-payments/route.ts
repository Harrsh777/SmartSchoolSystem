import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';
import { getTransportFeeMode, isSeparateTransportMode } from '@/lib/fees/transport-fee-mode';
import { formatTransportFeeLabel, type TransportSnapshot } from '@/lib/fees/transport-fee-sync';
import {
  enumerateMonthlyPeriods,
  enumerateQuarterStartsInRange,
  formatPeriodLabel,
  normalizeBillingFrequency,
  parseMonthInputToMonthStart,
  periodStartForBilling,
} from '@/lib/transport/transport-billing-period';
import { fetchObligationAmount, upsertTransportBillingObligation } from '@/lib/transport/transport-billing-obligations';
import { computePeriodicTransportFeeFromStops } from '@/lib/transport/compute-student-transport-fee';

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
          'id, admission_no, student_name, class, section, transport_route_id, transport_fee, transport_pickup_stop_id, transport_dropoff_stop_id, transport_custom_fare, transport_billing_frequency'
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
        .limit(500);

      if (stErr) {
        return NextResponse.json({ error: stErr.message }, { status: 500 });
      }

      const routeIds = [
        ...new Set((students || []).map((s) => s.transport_route_id).filter(Boolean)),
      ] as string[];
      const routeNameById = new Map<string, string>();
      const stopMetaById = new Map<
        string,
        {
          name: string;
          pickup_fare: number;
          drop_fare: number;
          monthly_pickup_fee: number;
          monthly_drop_fee: number;
          quarterly_pickup_fee: number;
          quarterly_drop_fee: number;
        }
      >();
      if (routeIds.length > 0) {
        const { data: routes } = await supabase
          .from('transport_routes')
          .select('id, route_name')
          .eq('school_code', code)
          .in('id', routeIds);
        for (const r of routes || []) {
          const row = r as { id: string; route_name?: string };
          routeNameById.set(String(row.id), String(row.route_name || 'Route'));
        }
      }
      const stopIds = [
        ...new Set(
          (students || [])
            .flatMap((s) => [s.transport_pickup_stop_id, s.transport_dropoff_stop_id])
            .filter(Boolean)
        ),
      ] as string[];
      if (stopIds.length > 0) {
        const { data: stops } = await supabase
          .from('transport_stops')
          .select(
            'id, name, monthly_pickup_fee, monthly_drop_fee, quarterly_pickup_fee, quarterly_drop_fee'
          )
          .eq('school_code', code)
          .in('id', stopIds);
        for (const s of stops || []) {
          const row = s as Record<string, unknown>;
          stopMetaById.set(String(row.id), {
            name: String(row.name || 'Stop'),
            pickup_fare: 0,
            drop_fare: 0,
            monthly_pickup_fee: Number(row.monthly_pickup_fee ?? 0),
            monthly_drop_fee: Number(row.monthly_drop_fee ?? 0),
            quarterly_pickup_fee: Number(row.quarterly_pickup_fee ?? 0),
            quarterly_drop_fee: Number(row.quarterly_drop_fee ?? 0),
          });
        }
      }

      const rows = await Promise.all(
        (students || []).map(async (st) => {
          const sid = String(st.id);
          const freq = normalizeBillingFrequency(
            (st as { transport_billing_frequency?: string }).transport_billing_frequency
          );
          const fromStudent = Math.round(Number(st.transport_fee || 0) * 100) / 100;
          const pickupStop = st.transport_pickup_stop_id
            ? stopMetaById.get(String(st.transport_pickup_stop_id)) || null
            : null;
          const dropStop = st.transport_dropoff_stop_id
            ? stopMetaById.get(String(st.transport_dropoff_stop_id)) || null
            : null;
          const fareCalc = computePeriodicTransportFeeFromStops({
            pickupStop,
            dropStop,
            frequency: freq,
            customFare: (st as { transport_custom_fare?: number | null }).transport_custom_fare ?? null,
          });
          const { data: mappings } = await supabase
            .from('transport_assignment_versions')
            .select('effective_from, effective_to, billing_frequency, transport_fee')
            .eq('school_code', code)
            .eq('student_id', sid)
            .order('effective_from', { ascending: true });
          const periods = new Map<
            string,
            { period_month: string; period_label: string; expected: number; paid: number; balance: number; status: string; frequency: string }
          >();
          for (const m of mappings || []) {
            const localFreq = normalizeBillingFrequency(
              (m as { billing_frequency?: string }).billing_frequency ?? freq
            );
            const start = parseMonthInputToMonthStart(String((m as { effective_from: string }).effective_from || ''));
            const endSrc = (m as { effective_to?: string | null }).effective_to;
            const end = parseMonthInputToMonthStart(String(endSrc || '')) || start;
            if (!start || !end || end < start) continue;
            const months =
              localFreq === 'QUARTERLY'
                ? enumerateQuarterStartsInRange(start, end)
                : enumerateMonthlyPeriods(start, end);
            const dueAmount = Math.round(Number((m as { transport_fee?: number }).transport_fee ?? fromStudent) * 100) / 100;
            for (const period of months) {
              if (dueAmount > PAY_EPS) {
                await upsertTransportBillingObligation(supabase, {
                  schoolCode: code,
                  studentId: sid,
                  billingMonthIso: period,
                  billingFrequency: localFreq,
                  amountDue: dueAmount,
                  assignmentVersionId: null,
                });
              }
              const expected = Math.round(
                ((await fetchObligationAmount(supabase, code, sid, period, localFreq)) ?? dueAmount) * 100
              ) / 100;
              const canonical = periodStartForBilling(period, localFreq);
              const paidR = expected > 0 ? Math.round((await sumPaidForMonth(supabase, code, sid, canonical)) * 100) / 100 : 0;
              const balance = Math.max(0, Math.round((expected - paidR) * 100) / 100);
              const status = expected <= PAY_EPS ? 'NOROUTE' : paidR <= PAY_EPS ? 'PENDING' : paidR + PAY_EPS < expected ? 'PARTIAL' : 'PAID';
              periods.set(`${localFreq}:${canonical}`, {
                period_month: canonical,
                period_label: formatPeriodLabel(canonical, localFreq),
                expected,
                paid: paidR,
                balance,
                status,
                frequency: localFreq,
              });
            }
          }
          const orderedPeriods = [...periods.values()].sort((a, b) => a.period_month.localeCompare(b.period_month));
          const totalDue = orderedPeriods.reduce((s, p) => s + p.expected, 0);
          const totalPaid = orderedPeriods.reduce((s, p) => s + p.paid, 0);
          const totalBalance = orderedPeriods.reduce((s, p) => s + p.balance, 0);
          const status = totalBalance <= PAY_EPS ? 'PAID' : totalPaid > PAY_EPS ? 'PARTIAL' : 'PENDING';
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
            monthly_transport_fee: Math.round(totalDue * 100) / 100,
            billing_month: null,
            billing_frequency: freq,
            period_label: null,
            paid_this_month: Math.round(totalPaid * 100) / 100,
            balance_due: Math.round(totalBalance * 100) / 100,
            status,
            periods: orderedPeriods,
            transport_fee_mode: mode,
            pickup_stop_name: pickupStop?.name || null,
            drop_stop_name: dropStop?.name || null,
            fare_breakdown: {
              from_custom: fareCalc.fromCustom,
              pickup_amount: fareCalc.pickupPortion,
              drop_amount: fareCalc.dropPortion,
              calculated_total: fareCalc.total,
              period_fee: fareCalc.total,
            },
          };
        })
      );

      const withFee = rows.filter((r) => Array.isArray((r as { periods?: unknown[] }).periods) && ((r as { periods?: unknown[] }).periods || []).length > 0);
      const due = withFee.filter((r) => r.balance_due > PAY_EPS);

      let collections: Record<string, unknown>[] = [];
      if (classFilter && sectionFilter && (students || []).length > 0) {
        const freqById = new Map<string, ReturnType<typeof normalizeBillingFrequency>>();
        for (const s of students || []) {
          freqById.set(
            String((s as { id: string }).id),
            normalizeBillingFrequency((s as { transport_billing_frequency?: string }).transport_billing_frequency)
          );
        }
        const ids = [...freqById.keys()];
        const { data: payRows, error: payErr } = await supabase
          .from('transport_fee_payment_entries')
          .select(
            `
            id,
            student_id,
            amount,
            period_month,
            receipt_no,
            payment_date,
            payment_mode,
            reference_no,
            created_at,
            student:student_id (student_name, admission_no, class, section)
          `
          )
          .eq('school_code', code)
          .in('student_id', ids)
          .order('created_at', { ascending: false })
          .limit(400);

        if (!payErr && payRows) {
          collections = payRows as Record<string, unknown>[];
        }
      }

      return NextResponse.json({
        due,
        collections,
        meta: {
          page: 1,
          page_size: due.length,
          transport_fee_mode: mode,
        },
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

    const rawBilling = normalizeMonthStart(String(period_month || ''));
    if (!rawBilling) {
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
        'id, school_code, transport_route_id, transport_fee, transport_pickup_stop_id, transport_dropoff_stop_id, transport_custom_fare, student_name, admission_no, transport_billing_frequency'
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

    const freq = normalizeBillingFrequency(
      (student as { transport_billing_frequency?: string }).transport_billing_frequency
    );
    const canonicalPeriod = periodStartForBilling(rawBilling, freq);
    const { data: mapRows, error: mapErr } = await supabase
      .from('transport_assignment_versions')
      .select('effective_from, effective_to, billing_frequency')
      .eq('school_code', code)
      .eq('student_id', sid);
    if (mapErr && mapErr.code !== '42P01') {
      return NextResponse.json({ error: 'Failed to validate student mapping period' }, { status: 500 });
    }
    if (Array.isArray(mapRows) && mapRows.length > 0) {
      const inAnyRange = mapRows.some((r: { effective_from: string; effective_to: string | null; billing_frequency?: string }) => {
        const localFreq = normalizeBillingFrequency(r.billing_frequency ?? freq);
        const start = parseMonthInputToMonthStart(String(r.effective_from || ''));
        const end = parseMonthInputToMonthStart(String(r.effective_to || '')) ?? '9999-12-01';
        if (!start) return false;
        const candidate = periodStartForBilling(canonicalPeriod, localFreq);
        return candidate >= start && candidate <= end;
      });
      if (!inAnyRange) {
        return NextResponse.json(
          { error: 'Selected billing period is outside student mapping effective range' },
          { status: 400 }
        );
      }
    }
    const fromStudent = Math.round(Number(student.transport_fee || 0) * 100) / 100;
    const obligationAmt = await fetchObligationAmount(supabase, code, sid, rawBilling, freq);
    let expected = obligationAmt ?? fromStudent;
    expected = Math.round(expected * 100) / 100;

    if (!Number.isFinite(expected) || expected <= PAY_EPS) {
      return NextResponse.json(
        { error: 'Student transport fee for this billing period is not set or zero' },
        { status: 400 }
      );
    }

    const priorPaid = await sumPaidForMonth(supabase, code, sid, canonicalPeriod);
    const remainingBefore = Math.max(0, Math.round((expected - priorPaid) * 100) / 100);
    const payAmt = Math.round(amt * 100) / 100;

    if (payAmt > remainingBefore + PAY_EPS) {
      return NextResponse.json(
        {
          error: `Amount exceeds balance for this billing period (${remainingBefore})`,
          expected_period_fee: expected,
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

    const y = new Date(`${canonicalPeriod}T12:00:00.000Z`).getUTCFullYear();
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
      period_month: canonicalPeriod,
      billing_frequency: freq,
      period_label: formatPeriodLabel(canonicalPeriod, freq),
      amount_paid: payAmt,
      monthly_fee: expected,
      period_fee: expected,
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
      period_month: canonicalPeriod,
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
          notes: `Transport fee — ${student.admission_no} — ${canonicalPeriod}`,
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
        period_month: canonicalPeriod,
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
