import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type StudentRow = {
  id: string;
  class: unknown;
  section: unknown;
  academic_year?: string | null;
  school_code?: string | null;
};

type ClassRow = { id: string; class: unknown; section: unknown; academic_year?: string | null };

async function resolveStudent(studentId: string, schoolCodeParam: string): Promise<{ student: StudentRow | null; effectiveSchoolCode: string }> {
  const raw = schoolCodeParam.trim();
  const upper = raw.toUpperCase();
  for (const code of [upper, raw]) {
    if (!code) continue;
    const { data, error } = await supabase
      .from('students')
      .select('id, class, section, academic_year, school_code')
      .eq('id', studentId)
      .eq('school_code', code)
      .maybeSingle();
    if (!error && data) {
      return { student: data as StudentRow, effectiveSchoolCode: String((data as StudentRow).school_code || code) };
    }
  }
  return { student: null, effectiveSchoolCode: upper || raw };
}

async function resolveClassRow(effectiveSchoolCode: string, student: StudentRow): Promise<ClassRow | null> {
  const cls = String(student.class ?? '').trim();
  const sec = String(student.section ?? '').trim();
  const year = student.academic_year ? String(student.academic_year).trim() : '';

  if (year) {
    const { data: withYear } = await supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('school_code', effectiveSchoolCode)
      .eq('class', cls)
      .eq('section', sec)
      .eq('academic_year', year)
      .limit(1);
    if (withYear?.[0]) return withYear[0] as ClassRow;
  }

  const { data: fallback } = await supabase
    .from('classes')
    .select('id, class, section, academic_year')
    .eq('school_code', effectiveSchoolCode)
    .eq('class', cls)
    .eq('section', sec)
    .order('academic_year', { ascending: false })
    .limit(1);

  return (fallback?.[0] as ClassRow) ?? null;
}

async function loadStructuresForClass(schoolCode: string, classRow: ClassRow) {
  const section = String(classRow.section ?? '').trim();
  const { data: mappingRows, error: mapErr } = await supabase
    .from('exam_term_structure_mappings')
    .select('structure_id, section')
    .eq('school_code', schoolCode)
    .eq('class_id', classRow.id)
    .eq('is_active', true);

  if (mapErr) {
    if (mapErr.code === '42P01') return [];
    console.warn('[examinations/v2/student] exam_term_structure_mappings:', mapErr.message);
    return [];
  }

  const structIds = [
    ...new Set(
      (mappingRows || [])
        .filter((r: { structure_id: string; section?: string | null }) => {
          const ms = String(r.section ?? '').trim();
          return !ms || ms === section;
        })
        .map((r: { structure_id: string }) => r.structure_id)
        .filter(Boolean)
    ),
  ];
  const out: Array<{ structure: Record<string, unknown>; terms: unknown[] }> = [];

  for (const sid of structIds) {
    const { data: structure, error: se } = await supabase
      .from('exam_term_structures')
      .select('*')
      .eq('id', sid)
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .maybeSingle();
    if (se || !structure) continue;

    const { data: termsRaw, error: te } = await supabase
      .from('exam_terms')
      .select('id, name, serial, academic_year, structure_id, class_id, section, is_active')
      .eq('structure_id', sid)
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .order('serial', { ascending: true });

    if (te) continue;

    const termsFiltered = (termsRaw || []).filter((t: Record<string, unknown>) => {
      if (t.is_active === false) return false;
      const tClass = t.class_id;
      const tSec = String(t.section ?? '').trim();
      if (tClass != null && String(tClass).length > 0) {
        return String(tClass) === String(classRow.id) && (tSec === '' || tSec === section);
      }
      return true;
    });

    const termsOut = [];
    for (const term of termsFiltered) {
      const { data: tpl } = await supabase
        .from('exam_term_exams')
        .select('id, exam_name, serial, weightage')
        .eq('term_id', (term as { id: string }).id)
        .eq('is_active', true)
        .order('serial', { ascending: true });
      termsOut.push({
        ...term,
        template_exams: tpl || [],
      });
    }

    out.push({ structure, terms: termsOut });
  }

  return out;
}

function enrichExaminations(
  examinations: Record<string, unknown>[],
  classId: string,
  teacherBySubject: Map<string, string>
) {
  return examinations.map((exam: Record<string, unknown>) => {
    const mappings = ((exam.subject_mappings as Array<Record<string, unknown>>) || []).filter((m) => m.class_id === classId);
    const mapped = mappings.map((m) => {
      const subjectId = m.subject_id as string;
      const subject = m.subject as Record<string, unknown> | undefined;
      const name = subject && !Array.isArray(subject) && subject.name != null ? String(subject.name) : '—';
      return {
        ...m,
        subject_name: name,
        teacher_name: teacherBySubject.get(subjectId) ?? '—',
        max_marks: m.max_marks ?? null,
        pass_marks: m.pass_marks ?? null,
      };
    });
    const totalMax = mapped.reduce((sum, m) => sum + (Number(m.max_marks) || 0), 0);
    const totalPass = mapped.reduce((sum, m) => sum + (Number(m.pass_marks) || 0), 0);
    return {
      ...exam,
      subject_mappings: mapped,
      total_max_marks: totalMax,
      total_pass_marks: totalPass,
    };
  });
}

/**
 * GET /api/examinations/v2/student
 * Query: school_code, student_id
 *
 * Returns only data for the student's class: term structure(s), terms, template exams,
 * and scheduled examinations mapped to that class (subjects filtered per class_id).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCodeParam = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCodeParam || !studentId) {
      return NextResponse.json({ error: 'School code and student ID are required' }, { status: 400 });
    }

    const { student, effectiveSchoolCode } = await resolveStudent(studentId, schoolCodeParam);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const classData = await resolveClassRow(effectiveSchoolCode, student);
    if (!classData) {
      return NextResponse.json(
        {
          data: {
            class: null,
            structures: [],
            examinations: [],
          },
        },
        { status: 200 }
      );
    }

    let structures: Awaited<ReturnType<typeof loadStructuresForClass>> = [];
    try {
      structures = await loadStructuresForClass(effectiveSchoolCode, classData);
    } catch (e) {
      console.warn('[examinations/v2/student] structures:', e);
    }

    const { data: classMappings, error: mappingError } = await supabase
      .from('exam_class_mappings')
      .select('exam_id')
      .eq('class_id', classData.id)
      .eq('school_code', effectiveSchoolCode);

    if (mappingError) {
      console.error('Error fetching exam class mappings:', mappingError);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: mappingError.message },
        { status: 500 }
      );
    }

    const examIds = [...new Set((classMappings || []).map((cm: { exam_id: string }) => cm.exam_id).filter(Boolean))];

    if (examIds.length === 0) {
      return NextResponse.json(
        {
          data: {
            class: classData,
            structures,
            examinations: [],
          },
        },
        { status: 200 }
      );
    }

    const { data: examinations, error: examError } = await supabase
      .from('examinations')
      .select(
        `
        *,
        term:term_id (
          id,
          name,
          serial
        ),
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings (
          subject_id,
          class_id,
          subject:subjects (
            id,
            name
          ),
          max_marks,
          pass_marks
        ),
        schedules:exam_schedules (
          id,
          exam_date,
          start_time,
          end_time
        )
      `
      )
      .in('id', examIds)
      .eq('school_code', effectiveSchoolCode)
      .order('start_date', { ascending: true, nullsFirst: false });

    let examsRaw = examinations;
    if (examError) {
      const retrySelect = `
        *,
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings (
          subject_id,
          class_id,
          subject:subjects (
            id,
            name
          ),
          max_marks,
          pass_marks
        ),
        schedules:exam_schedules (
          id,
          exam_date,
          start_time,
          end_time
        )
      `;
      const { data: examinationsRetry, error: examError2 } = await supabase
        .from('examinations')
        .select(retrySelect)
        .in('id', examIds)
        .eq('school_code', effectiveSchoolCode)
        .order('start_date', { ascending: true, nullsFirst: false });

      if (examError2) {
        console.error('Error fetching examinations:', examError, examError2);
        return NextResponse.json(
          { error: 'Failed to fetch examinations', details: examError2.message },
          { status: 500 }
        );
      }
      examsRaw = examinationsRetry;
    }

    const classId = classData.id;
    const allSubjectIds = new Set<string>();
    for (const exam of examsRaw || []) {
      const mappings = (exam as { subject_mappings?: Array<{ class_id?: string; subject_id?: string }> }).subject_mappings || [];
      for (const m of mappings) {
        if (m.class_id === classId && m.subject_id) allSubjectIds.add(m.subject_id);
      }
    }

    const teacherBySubject = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const { data: staffSubs, error: staffSubsError } = await supabase
        .from('staff_subjects')
        .select(
          `
          subject_id,
          staff:staff_id ( full_name )
        `
        )
        .eq('school_code', effectiveSchoolCode)
        .in('subject_id', Array.from(allSubjectIds));

      if (!staffSubsError && staffSubs) {
        staffSubs.forEach((row: Record<string, unknown>) => {
          const sid = row.subject_id as string;
          if (sid && !teacherBySubject.has(sid)) {
            const staff = row.staff;
            const name = Array.isArray(staff)
              ? (staff[0] as Record<string, unknown>)?.full_name
              : (staff as Record<string, unknown>)?.full_name;
            if (name) teacherBySubject.set(sid, String(name));
          }
        });
      }
    }

    const examinationsEnriched = enrichExaminations((examsRaw || []) as Record<string, unknown>[], classId, teacherBySubject);

    return NextResponse.json(
      {
        data: {
          class: classData,
          structures,
          examinations: examinationsEnriched,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching student examinations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
