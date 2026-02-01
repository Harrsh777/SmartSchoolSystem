import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/reports/class-wise?school_code=SCH001
 * Returns class-wise fee report: class, section, academic_year, total_students, expected_fees, collected, pending
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get current financial year (April to March)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const financialYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;
    const startDate = new Date(financialYearStart, 3, 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    // Fetch all active students with class info
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, class, section, academic_year')
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    if (studentsError || !students) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError?.message },
        { status: 500 }
      );
    }

    const studentIds = students.map(s => s.id);

    // Fetch payments (v2) - collected per student
    const { data: payments } = await supabase
      .from('payments')
      .select('student_id, amount')
      .eq('school_code', schoolCode)
      .eq('is_reversed', false)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    // Fallback: fees table (legacy)
    let feesData: Array<{ student_id?: string; amount?: number }> = [];
    if (!payments || payments.length === 0) {
      const { data: oldFees } = await supabase
        .from('fees')
        .select('student_id, total_amount, amount')
        .eq('school_code', schoolCode)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);
      feesData = (oldFees || []).map(f => ({
        student_id: f.student_id,
        amount: Number(f.total_amount || f.amount || 0),
      }));
    }

    const paymentsByStudent = new Map<string, number>();
    (payments || []).forEach((p: { student_id: string; amount: number }) => {
      const sid = p.student_id;
      if (!sid) return;
      paymentsByStudent.set(sid, (paymentsByStudent.get(sid) || 0) + Number(p.amount || 0));
    });
    (feesData || []).forEach((f: { student_id?: string; amount?: number }) => {
      const sid = f.student_id;
      if (!sid) return;
      paymentsByStudent.set(sid, (paymentsByStudent.get(sid) || 0) + Number(f.amount || 0));
    });

    // Fetch student_fees for expected amount (if available)
    const { data: studentFees } = await supabase
      .from('student_fees')
      .select('student_id, base_amount, paid_amount, adjustment_amount, status')
      .eq('school_code', schoolCode);

    const expectedByStudent = new Map<string, number>();
    const pendingByStudent = new Map<string, number>();
    if (studentFees && studentFees.length > 0) {
      studentFees.forEach((sf: { student_id: string; base_amount?: number; paid_amount?: number; adjustment_amount?: number; status?: string }) => {
        const expected = Number(sf.base_amount || 0) + Number(sf.adjustment_amount || 0);
        const paid = Number(sf.paid_amount || 0);
        const balance = expected - paid;
        expectedByStudent.set(sf.student_id, expected);
        if (balance > 0 && ['pending', 'partial', 'overdue'].includes(sf.status || '')) {
          pendingByStudent.set(sf.student_id, balance);
        }
      });
    }

    // Fallback: fee_schedules if student_fees not available
    if (expectedByStudent.size === 0) {
      const { data: feeSchedules } = await supabase
        .from('fee_schedules')
        .select('amount, class, academic_year')
        .eq('school_code', schoolCode)
        .eq('is_active', true);

      if (feeSchedules && feeSchedules.length > 0) {
        students.forEach(st => {
          const schedule = feeSchedules.find(
            (s: { class?: string; academic_year?: string }) =>
              s.class === st.class && (s.academic_year === st.academic_year || !st.academic_year)
          );
          if (schedule) {
            const amt = Number(schedule.amount || 0);
            expectedByStudent.set(st.id, amt);
          }
        });
      }
    }

    // Aggregate by class+section+academic_year
    const classMap = new Map<string, { class: string; section: string; academic_year: string; total_students: number; expected: number; collected: number; pending: number }>();

    students.forEach(st => {
      const key = `${st.class || ''}|${st.section || ''}|${st.academic_year || ''}`;
      const existing = classMap.get(key);
      const expected = expectedByStudent.get(st.id) || 0;
      const collected = paymentsByStudent.get(st.id) || 0;
      const pending = pendingByStudent.get(st.id) ?? (expected > collected ? expected - collected : 0);

      if (existing) {
        existing.total_students += 1;
        existing.expected += expected;
        existing.collected += collected;
        existing.pending += pending;
      } else {
        classMap.set(key, {
          class: st.class || '',
          section: st.section || '',
          academic_year: st.academic_year || '',
          total_students: 1,
          expected,
          collected,
          pending,
        });
      }
    });

    const reportRows = Array.from(classMap.values())
      .filter(r => r.class || r.section)
      .map(r => ({
        class: r.class,
        section: r.section,
        academic_year: r.academic_year,
        total_students: r.total_students,
        expected_fees: Math.round(r.expected * 100) / 100,
        collected: Math.round(r.collected * 100) / 100,
        pending: Math.round(r.pending * 100) / 100,
        collection_percent: r.expected > 0 ? Math.round((r.collected / r.expected) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => {
        const ac = a.class || '';
        const bc = b.class || '';
        if (ac !== bc) return ac.localeCompare(bc);
        return (a.section || '').localeCompare(b.section || '');
      });

    return NextResponse.json({ data: reportRows }, { status: 200 });
  } catch (error) {
    console.error('Error generating class-wise fee report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
