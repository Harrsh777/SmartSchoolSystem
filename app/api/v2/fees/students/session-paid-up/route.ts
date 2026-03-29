import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';
import { enrichPendingFeeRows } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import {
  academicYearMatchesStructure,
  studentMatchesCollectPaymentFilters,
} from '@/lib/fees/fee-structure-class-match';
import { normalizeFeeDueMonthKey } from '@/lib/fees/due-month-key';

type PaidPeriodMode = 'month' | 'quarter' | 'session';

function parseAsOfDate(searchParams: URLSearchParams): { y: number; m: number; d: number } {
  const raw = searchParams.get('as_of')?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [ys, ms, ds] = raw.split('-');
    const y = parseInt(ys, 10);
    const m = parseInt(ms, 10);
    const d = parseInt(ds, 10);
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return { y, m, d: Number.isFinite(d) ? d : 1 };
    }
  }
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

function parseDueMonthYM(s: string | null | undefined): { y: number; m: number } | null {
  const k = normalizeFeeDueMonthKey(String(s ?? ''));
  const m = k.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function academicQuarterKey(y: number, m: number): string {
  const ayStart = m >= 4 ? y : y - 1;
  let q: number;
  if (m >= 4 && m <= 6) q = 1;
  else if (m >= 7 && m <= 9) q = 2;
  else if (m >= 10 && m <= 12) q = 3;
  else q = 4;
  return `${ayStart}-Q${q}`;
}

function feeRowMatchesPeriod(
  dueMonth: string,
  mode: 'month' | 'quarter',
  ref: { y: number; m: number }
): boolean {
  const dm = parseDueMonthYM(dueMonth);
  if (!dm) return false;
  if (mode === 'month') return dm.y === ref.y && dm.m === ref.m;
  return academicQuarterKey(dm.y, dm.m) === academicQuarterKey(ref.y, ref.m);
}

function describePeriod(mode: 'month' | 'quarter', ref: { y: number; m: number }): string {
  if (mode === 'month') {
    return new Date(ref.y, ref.m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  const ayStart = ref.m >= 4 ? ref.y : ref.y - 1;
  const q =
    ref.m >= 4 && ref.m <= 6 ? 1 : ref.m >= 7 && ref.m <= 9 ? 2 : ref.m >= 10 && ref.m <= 12 ? 3 : 4;
  const range = q === 1 ? 'Apr–Jun' : q === 2 ? 'Jul–Sep' : q === 3 ? 'Oct–Dec' : 'Jan–Mar';
  return `Q${q} (${range}) · AY ${ayStart}–${ayStart + 1}`;
}

/**
 * GET /api/v2/fees/students/session-paid-up
 * Collect Payment: list students cleared for a period or for the whole session.
 *
 * Query: paid_period = month | quarter | session (default month)
 *        as_of = YYYY-MM-DD (optional; defaults to server today — client should send local calendar date)
 *
 * - month / quarter: student has at least one fee row in that calendar month or academic quarter (Apr–Mar),
 *   and every such row has total_due ~ 0 after enrichment. Other unpaid future rows are allowed.
 * - session: legacy — all session rows for the student in filter have total_due ~ 0.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 400);
    const classFilter = searchParams.get('class')?.trim() || '';
    const sectionFilter = searchParams.get('section')?.trim() || '';
    const academicYear = searchParams.get('academic_year')?.trim() || '';
    const paidPeriodRaw = (searchParams.get('paid_period') || 'month').trim().toLowerCase();
    const paidPeriod: PaidPeriodMode =
      paidPeriodRaw === 'quarter' || paidPeriodRaw === 'session' ? paidPeriodRaw : 'month';
    const ref = parseAsOfDate(searchParams);

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();

    const { data: feesRaw, error: feesError } = await supabase
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
          class,
          section,
          school_code
        )
      `)
      .eq('school_code', normalizedSchoolCode)
      .in('status', ['pending', 'partial', 'overdue', 'paid'])
      .order('due_date', { ascending: true })
      .limit(2500);

    if (feesError) {
      console.error('Error fetching fees for session-paid-up:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    let fees = (feesRaw || []).filter((fee) => {
      const structure = fee.fee_structure as unknown as { is_active?: boolean } | null;
      return structure?.is_active !== false;
    });

    if (classFilter || sectionFilter || academicYear) {
      fees = fees.filter((fee) => {
        const student = fee.student as unknown as { class?: string; section?: string };
        const structure = fee.fee_structure as unknown as { academic_year?: string | null };
        if (!studentMatchesCollectPaymentFilters(student, classFilter, sectionFilter)) return false;
        if (academicYear) {
          if (!academicYearMatchesStructure(structure?.academic_year, academicYear)) return false;
        }
        return true;
      });
    }

    if (fees.length === 0) {
      const asOfStr = `${ref.y}-${String(ref.m).padStart(2, '0')}-${String(ref.d).padStart(2, '0')}`;
      if (paidPeriod === 'session') {
        return NextResponse.json({
          data: [],
          period_meta: {
            mode: 'session' as const,
            label: 'Full session (no balance on any installment)',
            as_of: asOfStr,
          },
        });
      }
      return NextResponse.json({
        data: [],
        period_meta: {
          mode: paidPeriod,
          label: describePeriod(paidPeriod, { y: ref.y, m: ref.m }),
          as_of: asOfStr,
        },
      });
    }

    const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(
      supabase,
      normalizedSchoolCode
    );
    const enriched = await enrichPendingFeeRows(supabase, normalizedSchoolCode, fees as never, {
      classLinesBySectionKey,
    });

    type Agg = {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      total_due_sum: number;
      installment_count: number;
      total_paid_sum: number;
    };

    const byStudent = new Map<string, Agg>();

    for (const fee of enriched) {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      if (!student?.id) continue;

      const td = Number(fee.total_due || 0);
      const paid = Number(fee.paid_amount || 0);

      if (!byStudent.has(student.id)) {
        byStudent.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          class: student.class || '',
          section: student.section || '',
          total_due_sum: 0,
          installment_count: 0,
          total_paid_sum: 0,
        });
      }
      const a = byStudent.get(student.id)!;
      a.total_due_sum += td;
      a.installment_count += 1;
      a.total_paid_sum += paid;
    }

    const EPS = 0.005;
    const periodLabel =
      paidPeriod === 'session' ? null : describePeriod(paidPeriod, { y: ref.y, m: ref.m });

    if (paidPeriod === 'session') {
      const paidUp = Array.from(byStudent.values())
        .filter((a) => a.installment_count > 0 && a.total_due_sum <= EPS)
        .map((a) => ({
          id: a.id,
          student_name: a.student_name,
          admission_no: a.admission_no,
          class: a.class,
          section: a.section,
          installment_count: a.installment_count,
          total_paid_session: Math.round(a.total_paid_sum * 100) / 100,
          period_label: null as string | null,
        }))
        .sort((x, y) => x.student_name.localeCompare(y.student_name, undefined, { sensitivity: 'base' }))
        .slice(0, limit);

      return NextResponse.json({
        data: paidUp,
        period_meta: {
          mode: 'session' as const,
          label: 'Full session (no balance on any installment)',
          as_of: `${ref.y}-${String(ref.m).padStart(2, '0')}-${String(ref.d).padStart(2, '0')}`,
        },
      });
    }

    /** Per-student fee rows after enrich (same shape as loop input). */
    const feesByStudent = new Map<string, typeof enriched>();
    for (const fee of enriched) {
      const student = fee.student as unknown as { id?: string };
      if (!student?.id) continue;
      const sid = String(student.id);
      if (!feesByStudent.has(sid)) feesByStudent.set(sid, []);
      feesByStudent.get(sid)!.push(fee);
    }

    type PeriodRow = {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      installment_count: number;
      total_paid_session: number;
      period_label: string | null;
    };

    const periodRows: PeriodRow[] = [];

    for (const [sid, studentFees] of feesByStudent) {
      const inPeriod = studentFees.filter((f) =>
        feeRowMatchesPeriod(String(f.due_month || ''), paidPeriod, { y: ref.y, m: ref.m })
      );
      if (inPeriod.length === 0) continue;
      const anyUnpaid = inPeriod.some((f) => Number(f.total_due || 0) > EPS);
      if (anyUnpaid) continue;

      const student = inPeriod[0].student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      const paidSum = inPeriod.reduce((s, f) => s + Number(f.paid_amount || 0), 0);

      periodRows.push({
        id: sid,
        student_name: student.student_name || 'Unknown',
        admission_no: student.admission_no || '',
        class: student.class || '',
        section: student.section || '',
        installment_count: inPeriod.length,
        total_paid_session: Math.round(paidSum * 100) / 100,
        period_label: periodLabel,
      });
    }

    const paidUp = periodRows
      .sort((x, y) => x.student_name.localeCompare(y.student_name, undefined, { sensitivity: 'base' }))
      .slice(0, limit);

    return NextResponse.json({
      data: paidUp,
      period_meta: {
        mode: paidPeriod,
        label: periodLabel || '',
        as_of: `${ref.y}-${String(ref.m).padStart(2, '0')}-${String(ref.d).padStart(2, '0')}`,
      },
    });
  } catch (error) {
    console.error('Error in session-paid-up:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
