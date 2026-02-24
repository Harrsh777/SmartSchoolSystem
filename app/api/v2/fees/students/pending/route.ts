import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';

function computeLateFee(
  dueDate: string,
  baseAmount: number,
  lateFeeType: string | null,
  lateFeeValue: number,
  gracePeriodDays: number
): number {
  if (!lateFeeType) return 0;
  const currentDate = new Date();
  const due = new Date(dueDate);
  const effectiveDue = new Date(due);
  effectiveDue.setDate(effectiveDue.getDate() + gracePeriodDays);
  if (currentDate <= effectiveDue) return 0;
  const daysLate = Math.floor((currentDate.getTime() - effectiveDue.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLate <= 0) return 0;
  if (lateFeeType === 'flat') return lateFeeValue || 0;
  if (lateFeeType === 'per_day') return (lateFeeValue || 0) * daysLate;
  if (lateFeeType === 'percentage') return (baseAmount * (lateFeeValue || 0) / 100) * daysLate;
  return 0;
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

    const { data: pendingFeesRaw, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
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
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1000);

    if (feesError) {
      console.error('Error fetching pending fees:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    // Only include fees from active fee structures; exclude deactivated structures
    let pendingFees = (pendingFeesRaw || []).filter((fee) => {
      const structure = fee.fee_structure as unknown as { is_active?: boolean } | null;
      return structure?.is_active !== false;
    });
    if (classFilter || sectionFilter || academicYear) {
      pendingFees = pendingFees.filter((fee) => {
        const student = fee.student as unknown as { class?: string; section?: string };
        const structure = fee.fee_structure as unknown as { academic_year?: string | null };
        if (classFilter && (student?.class || '') !== classFilter) return false;
        if (sectionFilter && (student?.section || '') !== sectionFilter) return false;
        if (academicYear) {
          const feeYear = (structure?.academic_year ?? '').toString().trim();
          if (feeYear && feeYear !== academicYear) return false;
        }
        return true;
      });
    }

    const studentMap = new Map<string, {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      pending_amount: number;
      late_fee_amount: number;
      due_date: string;
    }>();

    (pendingFees || []).forEach((fee) => {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };

      if (!student?.id) return;

      const baseAmount = Number(fee.base_amount || 0);
      const paidAmount = Number(fee.paid_amount || 0);
      const adjustmentAmount = Number(fee.adjustment_amount || 0);
      const balanceDue = baseAmount + adjustmentAmount - paidAmount;
      if (balanceDue <= 0) return;

      const structure = fee.fee_structure as unknown as { late_fee_type?: string | null; late_fee_value?: number; grace_period_days?: number } | null;
      const lateFee = computeLateFee(
        fee.due_date || '',
        baseAmount,
        structure?.late_fee_type ?? null,
        Number(structure?.late_fee_value ?? 0),
        Number(structure?.grace_period_days ?? 0)
      );
      const totalDue = balanceDue + lateFee;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          class: student.class || '',
          section: student.section || '',
          pending_amount: 0,
          late_fee_amount: 0,
          due_date: fee.due_date,
        });
      }

      const data = studentMap.get(student.id)!;
      data.pending_amount += totalDue;
      data.late_fee_amount += lateFee;

      if (fee.due_date && new Date(fee.due_date) < new Date(data.due_date)) {
        data.due_date = fee.due_date;
      }
    });

    const pendingStudents = Array.from(studentMap.values())
      .sort((a, b) => b.pending_amount - a.pending_amount)
      .slice(0, limit);

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error('Error in pending students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
