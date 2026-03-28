import { getServiceRoleClient } from '@/lib/supabase-admin';

export type CoScholasticReportRow = { name: string; term1_grade?: string; term2_grade?: string };

function escapeIlike(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Build Part II co-scholastic rows from non_scholastic_marks + class non-scholastic subjects.
 * Uses exam term(s) to resolve Term-I / Term-II (first two terms by serial in the same structure + class-section).
 */
export async function fetchCoScholasticRowsForReportCard(params: {
  schoolCode: string;
  studentId: string;
  studentClass: string;
  studentSection: string;
  examTermIds: string[];
}): Promise<CoScholasticReportRow[] | null> {
  const { schoolCode, studentId, studentClass, studentSection, examTermIds } = params;
  const supabase = getServiceRoleClient();

  const { data: clsRows, error: clsErr } = await supabase
    .from('classes')
    .select('id')
    .eq('school_code', schoolCode)
    .ilike('class', escapeIlike(String(studentClass || '').trim()))
    .ilike('section', escapeIlike(String(studentSection || '').trim()))
    .limit(1);

  if (clsErr || !clsRows?.[0]?.id) return null;
  const classId = clsRows[0].id as string;

  const { data: csRows, error: csErr } = await supabase
    .from('class_subjects')
    .select('subject_id, subject:subject_id(id, name, category)')
    .eq('school_code', schoolCode)
    .eq('class_id', classId);

  if (csErr) return null;

  const subjects: { id: string; name: string }[] = [];
  for (const r of csRows || []) {
    const raw = r.subject as { id?: string; name?: string; category?: string | null } | { id?: string; name?: string; category?: string | null }[] | null;
    const sub = Array.isArray(raw) ? raw[0] : raw;
    const cat = sub?.category ?? null;
    const isCoScholastic = cat == null || String(cat).trim() === '' || String(cat).toLowerCase() !== 'scholastic';
    if (sub?.id && isCoScholastic) {
      subjects.push({ id: String(sub.id), name: String(sub.name || 'Subject') });
    }
  }
  subjects.sort((a, b) => a.name.localeCompare(b.name));
  if (subjects.length === 0) return null;

  let term1Id: string | null = null;
  let term2Id: string | null = null;

  const validTermIds = examTermIds.filter(Boolean);
  if (validTermIds.length > 0) {
    const { data: termRows } = await supabase
      .from('exam_terms')
      .select('id, serial, structure_id, class_id, section')
      .eq('school_code', schoolCode)
      .in('id', validTermIds);

    const anchor = termRows?.[0] as { structure_id?: string | null; class_id?: string | null; section?: string | null } | undefined;
    if (anchor?.structure_id && anchor.class_id != null && anchor.section != null) {
      const { data: siblings } = await supabase
        .from('exam_terms')
        .select('id, serial')
        .eq('school_code', schoolCode)
        .eq('structure_id', anchor.structure_id)
        .eq('class_id', anchor.class_id)
        .eq('section', String(anchor.section))
        .order('serial', { ascending: true });

      if (siblings && siblings.length > 0) {
        term1Id = String(siblings[0].id);
        term2Id = siblings[1] ? String(siblings[1].id) : null;
      }
    }
  }

  if (!term1Id && validTermIds.length > 0) {
    term1Id = validTermIds[0];
    if (validTermIds.length > 1) term2Id = validTermIds[1];
  }

  if (!term1Id) return null;

  const termIds = term2Id ? [term1Id, term2Id] : [term1Id];
  const { data: marks, error: marksErr } = await supabase
    .from('non_scholastic_marks')
    .select('subject_id, term_id, grade')
    .eq('school_code', schoolCode)
    .eq('student_id', studentId)
    .in('term_id', termIds);

  if (marksErr) {
    if (marksErr.code === '42P01' || marksErr.message?.includes('non_scholastic_marks')) {
      return null;
    }
    return null;
  }

  const bySubTerm = new Map<string, string>();
  for (const m of marks || []) {
    const sid = String((m as { subject_id?: string }).subject_id || '');
    const tid = String((m as { term_id?: string }).term_id || '');
    const g = String((m as { grade?: string | null }).grade ?? '').trim();
    if (sid && tid && g) bySubTerm.set(`${sid}:${tid}`, g);
  }

  return subjects.map((s) => ({
    name: s.name,
    term1_grade: bySubTerm.get(`${s.id}:${term1Id}`) || undefined,
    term2_grade: term2Id ? bySubTerm.get(`${s.id}:${term2Id}`) || undefined : undefined,
  }));
}
