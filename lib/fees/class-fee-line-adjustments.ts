import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeFeeDueMonthKey } from '@/lib/fees/due-month-key';
import { isClassFeeLineTableMissingError } from '@/lib/fees/class-fee-line-table';

export type ClassFeeLineRow = {
  id: string;
  school_code: string;
  class_name: string;
  section: string;
  academic_year: string | null;
  fee_structure_id: string;
  due_month: string;
  label: string;
  amount: number;
  kind: 'misc' | 'discount';
  created_at: string;
};

export type MergedManualLine = {
  id: string;
  label: string;
  amount: number;
  kind: 'misc' | 'discount';
  created_at: string;
  source: 'student' | 'class';
};

export function classSectionCacheKey(className: string, section: string | null | undefined): string {
  return `${String(className ?? '').trim()}|${String(section ?? '').trim()}`;
}

/** All class lines for a school, grouped by "class|section" for batch enrichment. */
export async function fetchAllClassFeeLinesBySectionKey(
  supabase: SupabaseClient,
  schoolCode: string
): Promise<Map<string, ClassFeeLineRow[]>> {
  const map = new Map<string, ClassFeeLineRow[]>();
  const { data, error } = await supabase
    .from('class_fee_line_adjustments')
    .select(
      'id, school_code, class_name, section, academic_year, fee_structure_id, due_month, label, amount, kind, created_at'
    )
    .ilike('school_code', schoolCode.trim());

  if (error) {
    if (isClassFeeLineTableMissingError(error)) return map;
    console.warn('fetchAllClassFeeLinesBySectionKey:', error.message);
    return map;
  }

  for (const row of data || []) {
    const k = classSectionCacheKey(String(row.class_name), String(row.section));
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push({
      id: String(row.id),
      school_code: String(row.school_code),
      class_name: String(row.class_name),
      section: String(row.section),
      academic_year: row.academic_year != null ? String(row.academic_year) : null,
      fee_structure_id: String(row.fee_structure_id),
      due_month: String(row.due_month ?? ''),
      label: String(row.label),
      amount: Number(row.amount || 0),
      kind: row.kind as 'misc' | 'discount',
      created_at: String(row.created_at),
    });
  }
  return map;
}

export function filterClassLinesForFee(
  classLines: ClassFeeLineRow[],
  feeStructureId: string,
  dueMonth: string | null | undefined,
  structureAcademicYear: string | null | undefined
): ClassFeeLineRow[] {
  const dm = normalizeFeeDueMonthKey(dueMonth);
  const fsid = String(feeStructureId);
  const ay = structureAcademicYear != null ? String(structureAcademicYear).trim() : '';

  return classLines.filter((cl) => {
    if (String(cl.fee_structure_id) !== fsid) return false;
    if (normalizeFeeDueMonthKey(cl.due_month) !== dm) return false;
    const lineAy = cl.academic_year != null ? String(cl.academic_year).trim() : '';
    if (lineAy !== '') {
      if (ay === '' || ay !== lineAy) return false;
    }
    return true;
  });
}

export function classLinesToMergedManual(classLines: ClassFeeLineRow[]): MergedManualLine[] {
  return classLines.map((cl) => ({
    id: `class:${cl.id}`,
    label: cl.label,
    amount: cl.amount,
    kind: cl.kind,
    created_at: cl.created_at,
    source: 'class' as const,
  }));
}

export function mergeStudentAndClassManualLines(
  studentLines: Array<{
    id: string;
    label: string;
    amount: number;
    kind: 'misc' | 'discount';
    created_at: string;
    source_class_adjustment_id?: string | null;
  }>,
  classLines: ClassFeeLineRow[]
): MergedManualLine[] {
  const classLineIdsAlreadyMaterialized = new Set(
    studentLines
      .map((l) => (l.source_class_adjustment_id ? String(l.source_class_adjustment_id) : ''))
      .filter(Boolean)
  );
  const classSignaturesAlreadyMaterialized = new Set(
    studentLines.map((l) => `${l.kind}::${Number(l.amount || 0).toFixed(2)}::${String(l.label || '').trim().toLowerCase()}`)
  );

  const a: MergedManualLine[] = studentLines.map((l) => ({
    id: l.id,
    label: l.label,
    amount: l.amount,
    kind: l.kind,
    created_at: l.created_at,
    source: 'student',
  }));
  const b = classLinesToMergedManual(
    classLines.filter((cl) => {
      if (classLineIdsAlreadyMaterialized.has(String(cl.id))) return false;
      const sig = `${cl.kind}::${Number(cl.amount || 0).toFixed(2)}::${String(cl.label || '').trim().toLowerCase()}`;
      if (classSignaturesAlreadyMaterialized.has(sig)) return false;
      return true;
    })
  );
  return [...a, ...b].sort(
    (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
  );
}

export function sumMergedManualLines(lines: MergedManualLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0);
}
