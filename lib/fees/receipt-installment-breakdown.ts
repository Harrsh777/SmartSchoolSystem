import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classSectionCacheKey,
  fetchAllClassFeeLinesBySectionKey,
  filterClassLinesForFee,
  mergeStudentAndClassManualLines,
} from '@/lib/fees/class-fee-line-adjustments';
import { fetchLineAdjustmentsGroupedByFeeIds } from '@/lib/fees/student-fee-line-adjustments';

export type ReceiptBreakdownLine = {
  particulars: string;
  /** Signed: discounts negative, misc positive */
  amount: number;
};

export type ReceiptFeeBreakdown = {
  student_fee_id: string;
  fee_schedule_name: string;
  due_month_display: string;
  due_date_display: string;
  lines: ReceiptBreakdownLine[];
};

function formatDueMonthLabel(dueMonth: string | null | undefined): string {
  if (dueMonth == null || String(dueMonth).trim() === '') return '—';
  const d = new Date(String(dueMonth));
  if (Number.isNaN(d.getTime())) return String(dueMonth);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
}

/**
 * Fee heads from structure + student / class-wide misc & discount lines (same rules as class-wise / student-wise UI).
 */
export async function fetchReceiptFeeBreakdownsByStudentFeeIds(
  supabase: SupabaseClient,
  schoolCode: string,
  studentFeeIds: string[]
): Promise<Map<string, ReceiptFeeBreakdown>> {
  const result = new Map<string, ReceiptFeeBreakdown>();
  const code = schoolCode.toUpperCase().trim();
  const ids = [...new Set(studentFeeIds.map(String))].filter(Boolean);
  if (ids.length === 0) return result;

  const { data: feeRows, error } = await supabase
    .from('student_fees')
    .select(
      `
      id,
      student_id,
      fee_structure_id,
      due_month,
      due_date,
      fee_structure:fee_structure_id ( name, academic_year )
    `
    )
    .in('id', ids)
    .ilike('school_code', code);

  if (error || !feeRows?.length) return result;

  const structureIds = [
    ...new Set(
      (feeRows as Array<{ fee_structure_id: string }>).map((f) => String(f.fee_structure_id))
    ),
  ];

  const { data: items } = await supabase
    .from('fee_structure_items')
    .select(`fee_structure_id, amount, fee_head:fee_head_id ( name )`)
    .in('fee_structure_id', structureIds);

  const itemsByStructure = new Map<string, Array<{ name: string; amount: number }>>();
  for (const row of items || []) {
    const r = row as {
      fee_structure_id: string;
      amount?: number;
      fee_head?: { name?: string } | null;
    };
    const sid = String(r.fee_structure_id);
    const name = r.fee_head?.name ? String(r.fee_head.name) : 'Fee component';
    const amt = Number(r.amount || 0);
    if (!itemsByStructure.has(sid)) itemsByStructure.set(sid, []);
    itemsByStructure.get(sid)!.push({ name, amount: amt });
  }

  const lineGroups = await fetchLineAdjustmentsGroupedByFeeIds(supabase, ids);

  const studentIds = [
    ...new Set((feeRows as Array<{ student_id: string }>).map((f) => String(f.student_id))),
  ];
  const { data: students } = await supabase
    .from('students')
    .select('id, class, section')
    .in('id', studentIds)
    .ilike('school_code', code);

  const stuMap = new Map<string, { class?: string; section?: string }>();
  for (const s of students || []) {
    stuMap.set(String((s as { id: string }).id), s as { class?: string; section?: string });
  }

  const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(supabase, code);

  for (const fee of feeRows as Array<Record<string, unknown>>) {
    const fid = String(fee.id);
    const fsid = String(fee.fee_structure_id);
    const fsMeta = fee.fee_structure as { name?: string; academic_year?: string | null } | null;
    const structureAy = fsMeta?.academic_year != null ? String(fsMeta.academic_year).trim() : '';
    const scheduleName = fsMeta?.name ? String(fsMeta.name) : 'Fee';

    const lines: ReceiptBreakdownLine[] = (itemsByStructure.get(fsid) || []).map((c) => ({
      particulars: c.name,
      amount: c.amount,
    }));

    const studentManual = lineGroups.get(fid) ?? [];
    const st = stuMap.get(String(fee.student_id));
    const className = String(st?.class ?? '').trim();
    const section = String(st?.section ?? '').trim();
    const sectionKey = classSectionCacheKey(className, section);
    const classLinesForSection = classLinesBySectionKey.get(sectionKey) ?? [];
    const matchingClass = filterClassLinesForFee(
      classLinesForSection,
      fsid,
      fee.due_month as string | null,
      structureAy || null
    );
    const merged = mergeStudentAndClassManualLines(studentManual, matchingClass);

    for (const m of merged) {
      const src = m.source === 'class' ? ' (class-wide)' : '';
      const kindLabel = m.kind === 'discount' ? 'Discount' : 'Misc fee';
      lines.push({
        particulars: `${kindLabel}: ${m.label}${src}`,
        amount: m.amount,
      });
    }

    const dueDateRaw = fee.due_date;
    const dueDateDisplay =
      dueDateRaw && String(dueDateRaw).trim()
        ? new Date(String(dueDateRaw)).toLocaleDateString('en-IN')
        : '—';

    result.set(fid, {
      student_fee_id: fid,
      fee_schedule_name: scheduleName,
      due_month_display: formatDueMonthLabel(fee.due_month as string | undefined),
      due_date_display: dueDateDisplay,
      lines,
    });
  }

  return result;
}
