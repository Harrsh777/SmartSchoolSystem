import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';
import { enrichPendingFeeRows } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import {
  academicYearMatchesStructure,
  studentMatchesCollectPaymentFilters,
} from '@/lib/fees/fee-structure-class-match';
import { getTransportFeeMode, includeTransportStudentFeeRowForMainFeesUi } from '@/lib/fees/transport-fee-mode';
import {
  computeAcademicFeeColumnState,
  feeRowYearMonth,
  sumLateFeeForFees,
} from '@/lib/fees/pending-student-academic-window';
import {
  formatPeriodLabel,
  normalizeBillingFrequency,
  periodStartForBilling,
} from '@/lib/transport/transport-billing-period';

const PAY_EPS = 0.02;

async function attachSeparateTransportSummaries(
  supabase: ReturnType<typeof getServiceRoleClient>,
  schoolCode: string,
  studentRows: Array<{
    id: string;
    class: string;
    section: string;
    admission_no: string;
  }>
): Promise<
  Map<
    string,
    | { mode: 'NONE' }
    | {
        mode: 'SEPARATE';
        period_label: string;
        balance_due: number;
        expected: number;
        paid: boolean;
      }
  >
> {
  const out = new Map<
    string,
    | { mode: 'NONE' }
    | { mode: 'SEPARATE'; period_label: string; balance_due: number; expected: number; paid: boolean }
  >();
  const ids = studentRows.map((r) => r.id);
  if (ids.length === 0) return out;

  const { data: stRows, error } = await supabase
    .from('students')
    .select('id, transport_route_id, transport_billing_frequency, transport_fee')
    .eq('school_code', schoolCode)
    .in('id', ids);

  if (error || !stRows) {
    for (const r of studentRows) out.set(r.id, { mode: 'NONE' });
    return out;
  }

  const byId = new Map(
    stRows.map((row) => [
      String((row as { id: string }).id),
      row as {
        id: string;
        transport_route_id: string | null;
        transport_billing_frequency?: string | null;
        transport_fee?: number | null;
      },
    ])
  );

  const withRoute = stRows
    .filter((r) => (r as { transport_route_id?: string | null }).transport_route_id)
    .map((r) => String((r as { id: string }).id));

  const today = new Date();
  const anchor = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const periodByStudent = new Map<string, string>();
  const uniquePeriods = new Set<string>();
  for (const sid of withRoute) {
    const row = byId.get(sid);
    if (!row?.transport_route_id) continue;
    const freq = normalizeBillingFrequency(row.transport_billing_frequency);
    const ps = periodStartForBilling(anchor, freq);
    periodByStudent.set(sid, ps);
    uniquePeriods.add(ps);
  }

  const periodList = [...uniquePeriods];
  type OblRow = { student_id: string; period_start: string; amount_due: number };
  let obligations: OblRow[] = [];
  if (withRoute.length > 0 && periodList.length > 0) {
    const obRes = await supabase
      .from('transport_billing_obligations')
      .select('student_id, period_start, amount_due')
      .eq('school_code', schoolCode)
      .in('student_id', withRoute)
      .in('period_start', periodList);
    if (!obRes.error && obRes.data) {
      obligations = obRes.data as OblRow[];
    }
  }

  const obligationMap = new Map<string, number>();
  for (const o of obligations) {
    obligationMap.set(`${o.student_id}:${String(o.period_start).slice(0, 10)}`, Number(o.amount_due || 0));
  }

  type PayRow = { student_id: string; period_month: string; amount: number };
  let payments: PayRow[] = [];
  if (withRoute.length > 0) {
    const payRes = await supabase
      .from('transport_fee_payment_entries')
      .select('student_id, period_month, amount')
      .eq('school_code', schoolCode)
      .in('student_id', withRoute);
    if (!payRes.error && payRes.data) {
      payments = payRes.data as PayRow[];
    }
  }

  const paidByKey = new Map<string, number>();
  for (const p of payments) {
    const pm = String(p.period_month || '').slice(0, 10);
    const k = `${p.student_id}:${pm}`;
    paidByKey.set(k, (paidByKey.get(k) || 0) + Number(p.amount || 0));
  }

  for (const sid of ids) {
    const row = byId.get(sid);
    if (!row?.transport_route_id) {
      out.set(sid, { mode: 'NONE' });
      continue;
    }
    const freq = normalizeBillingFrequency(row.transport_billing_frequency);
    const ps = periodByStudent.get(sid) || periodStartForBilling(anchor, freq);
    const fromOb = obligationMap.get(`${sid}:${ps}`);
    const fromStudent = Math.round(Number(row.transport_fee || 0) * 100) / 100;
    const expected =
      fromOb != null && Number.isFinite(fromOb) ? Math.round(fromOb * 100) / 100 : fromStudent;
    const paid = Math.round((paidByKey.get(`${sid}:${ps}`) || 0) * 100) / 100;
    const balance = Math.max(0, Math.round((expected - paid) * 100) / 100);
    const paidOk = expected <= PAY_EPS || balance <= PAY_EPS;
    out.set(sid, {
      mode: 'SEPARATE',
      period_label: formatPeriodLabel(ps, freq),
      expected,
      paid: paidOk,
      balance_due: paidOk ? 0 : balance,
    });
  }

  return out;
}

function comparePendingStudentsByRoll(
  a: { roll_number: string; student_name: string },
  b: { roll_number: string; student_name: string }
): number {
  const ra = String(a.roll_number || '').trim();
  const rb = String(b.roll_number || '').trim();
  if (!ra && !rb) {
    return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
  }
  if (!ra) return 1;
  if (!rb) return -1;
  const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
}

function isMissingStudentsIsRteColumn(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message || '';
  const code = (error as { code?: string } | null)?.code || '';
  return (
    code === '42703' ||
    /column.*is_rte.*does not exist|Could not find the 'is_rte' column/i.test(String(msg))
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const classFilter = searchParams.get('class')?.trim() || '';
    const sectionFilter = searchParams.get('section')?.trim() || '';
    const academicYear = searchParams.get('academic_year')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();

    const selectPendingWithRte = () =>
      supabase
        .from('student_fees')
        .select(`
        id,
        student_id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        due_month,
        status,
        fee_structure_id,
        fee_source,
        transport_snapshot,
        fee_structure:fee_structure_id (
          is_active,
          late_fee_type,
          late_fee_value,
          grace_period_days,
          academic_year
        ),
        student:students!inner(
          id,
          student_name,
          admission_no,
          roll_number,
          class,
          section,
          school_code,
          is_rte
        )
      `)
        .eq('school_code', normalizedSchoolCode)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1000);

    const selectPendingLegacy = () =>
      supabase
        .from('student_fees')
        .select(`
        id,
        student_id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        due_month,
        status,
        fee_structure_id,
        fee_source,
        transport_snapshot,
        fee_structure:fee_structure_id (
          is_active,
          late_fee_type,
          late_fee_value,
          grace_period_days,
          academic_year
        ),
        student:students!inner(
          id,
          student_name,
          admission_no,
          roll_number,
          class,
          section,
          school_code
        )
      `)
        .eq('school_code', normalizedSchoolCode)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1000);

    let { data: pendingFeesRaw, error: feesError }: {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string; code?: string } | null;
    } = await selectPendingWithRte() as unknown as {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string; code?: string } | null;
    };
    if (feesError && isMissingStudentsIsRteColumn(feesError)) {
      ({ data: pendingFeesRaw, error: feesError } =
        (await selectPendingLegacy()) as unknown as {
          data: Array<Record<string, unknown>> | null;
          error: { message?: string; code?: string } | null;
        });
    }

    if (feesError) {
      console.error('Error fetching pending fees:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    // Do not hide rows when the fee structure was deactivated — staff still need to collect outstanding dues.
    let pendingFees = pendingFeesRaw || [];
    if (classFilter || sectionFilter || academicYear) {
      pendingFees = pendingFees.filter((fee) => {
        const student = fee.student as unknown as { class?: string; section?: string };
        const structure = fee.fee_structure as unknown as { academic_year?: string | null };
        if (!studentMatchesCollectPaymentFilters(student, classFilter, sectionFilter)) return false;
        if (academicYear) {
          if (!academicYearMatchesStructure(structure?.academic_year, academicYear)) return false;
        }
        return true;
      });
    }

    const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(
      supabase,
      normalizedSchoolCode
    );
    const enriched = await enrichPendingFeeRows(supabase, normalizedSchoolCode, pendingFees as never, {
      classLinesBySectionKey,
    });

    const transportMode = await getTransportFeeMode(supabase, normalizedSchoolCode);

    type EnrichedRow = (typeof enriched)[number];
    const feesByStudent = new Map<string, EnrichedRow[]>();
    const DUE_EPS = 0.01;

    enriched.forEach((fee) => {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        roll_number?: string | null;
        class?: string;
        section?: string;
        is_rte?: boolean;
      };

      if (!student?.id) return;
      if (student.is_rte === true) return;

      if (
        !includeTransportStudentFeeRowForMainFeesUi(
          transportMode,
          String((fee as { fee_source?: string }).fee_source ?? ''),
          Number((fee as { total_due?: number }).total_due || 0)
        )
      ) {
        return;
      }

      const totalDue = Number(fee.total_due || 0);
      if (totalDue <= DUE_EPS) return;

      const sid = student.id;
      if (!feesByStudent.has(sid)) feesByStudent.set(sid, []);
      feesByStudent.get(sid)!.push(fee);
    });

    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const studentMap = new Map<
      string,
      {
        id: string;
        student_name: string;
        admission_no: string;
        roll_number: string;
        class: string;
        section: string;
        pending_amount: number;
        late_fee_amount: number;
        due_date: string;
        latest_due_date: string;
        academic_fee_status: 'NONE' | 'CURRENT_DUE' | 'CURRENT_CLEAR';
        total_pending_amount: number;
        transport:
          | { mode: 'MERGED' }
          | { mode: 'NONE' }
          | {
              mode: 'SEPARATE';
              period_label: string;
              balance_due: number;
              expected: number;
              paid: boolean;
            };
      }
    >();

    for (const [sid, fees] of feesByStudent) {
      const student = fees[0].student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        roll_number?: string | null;
        class?: string;
        section?: string;
      };

      const academicFees = fees.filter(
        (f) =>
          !(transportMode === 'SEPARATE' && String((f as { fee_source?: string }).fee_source) === 'transport')
      );

      const academicState = computeAcademicFeeColumnState(
        academicFees.map((f) => ({
          total_due: Number(f.total_due || 0),
          late_fee: Number(f.late_fee || 0),
          due_date: String(f.due_date || ''),
          due_month: (f as { due_month?: string }).due_month,
        })),
        now
      );

      let pending_amount = 0;
      let due_date = '';
      let late_fee_amount = 0;
      if (academicState.kind === 'CURRENT_DUE') {
        pending_amount = academicState.amount;
        due_date = academicState.due_date;
        const inMonth = academicFees.filter(
          (f) =>
            Number(f.total_due || 0) > DUE_EPS && feeRowYearMonth(f as { due_month?: string; due_date: string }) === currentYm
        );
        late_fee_amount = sumLateFeeForFees(
          inMonth.map((f) => ({
            total_due: Number(f.total_due || 0),
            late_fee: Number(f.late_fee || 0),
            due_date: String(f.due_date || ''),
            due_month: (f as { due_month?: string }).due_month,
          }))
        );
      }

      let latest_due_date = '';
      for (const f of fees) {
        const d = String(f.due_date || '').trim();
        if (d && (!latest_due_date || d > latest_due_date)) latest_due_date = d;
      }

      const total_pending_amount =
        Math.round(fees.reduce((s, f) => s + Number(f.total_due || 0), 0) * 100) / 100;

      studentMap.set(sid, {
        id: sid,
        student_name: student.student_name || 'Unknown',
        admission_no: student.admission_no || '',
        roll_number: student.roll_number != null ? String(student.roll_number) : '',
        class: student.class || '',
        section: student.section || '',
        pending_amount,
        late_fee_amount,
        due_date,
        latest_due_date,
        academic_fee_status: academicState.kind,
        total_pending_amount,
        transport: transportMode === 'MERGED' ? { mode: 'MERGED' } : { mode: 'NONE' },
      });
    }

    if (transportMode === 'SEPARATE') {
      const transportMap = await attachSeparateTransportSummaries(
        supabase,
        normalizedSchoolCode,
        Array.from(studentMap.values()).map((r) => ({
          id: r.id,
          class: r.class,
          section: r.section,
          admission_no: r.admission_no,
        }))
      );
      for (const [id, row] of studentMap) {
        const t = transportMap.get(id);
        if (t) row.transport = t;
      }
    }

    const pendingStudents = Array.from(studentMap.values())
      .sort(comparePendingStudentsByRoll)
      .slice(0, limit);

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error('Error in pending students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
