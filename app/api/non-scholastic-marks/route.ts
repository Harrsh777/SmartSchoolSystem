import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { isStaffClassTeacherForClass } from '@/lib/staff-class-teacher';

function escapeIlike(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/** Subjects for co-scholastic entry: not explicitly scholastic (includes null / uncategorized). */
function isCoScholasticSubject(category: string | null | undefined): boolean {
  if (category == null || String(category).trim() === '') return true;
  return String(category).toLowerCase() !== 'scholastic';
}

/**
 * GET /api/non-scholastic-marks?school_code=&class_id=&term_id? (term_id optional)
 * Without term_id: students + co-scholastic subjects only (roster preview).
 * With term_id: same + saved grades for that term.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    const classId = sp.get('class_id');
    const termId = sp.get('term_id');
    /** When `non_scholastic_only`, only subjects with category non_scholastic (teacher portal). */
    const scholasticScope = sp.get('scholastic_scope')?.trim();

    if (!schoolCode || !classId) {
      return NextResponse.json(
        { error: 'school_code and class_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: classRow, error: cErr } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (cErr || !classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const className = String(classRow.class || '');
    const sectionName = String(classRow.section || '');

    const studentQuery = supabase
      .from('students')
      .select('id, admission_no, student_name, roll_number, class, section')
      .eq('school_code', schoolCode)
      .ilike('class', escapeIlike(className.trim()))
      .ilike('section', escapeIlike(sectionName.trim()))
      .or('status.eq.active,status.is.null')
      .order('roll_number', { ascending: true, nullsFirst: false });

    const { data: students, error: sErr } = await studentQuery;

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const { data: csRows, error: csErr } = await supabase
      .from('class_subjects')
      .select('subject_id, subject:subject_id(id, name, category, color)')
      .eq('school_code', schoolCode)
      .eq('class_id', classId);

    if (csErr) {
      return NextResponse.json({ error: csErr.message }, { status: 500 });
    }

    const subjects: Array<{ id: string; name: string; color?: string }> = [];
    for (const r of csRows || []) {
      const raw = r.subject as
        | { id?: string; name?: string; category?: string | null; color?: string | null }
        | Array<{ id?: string; name?: string; category?: string | null; color?: string | null }>
        | null;
      const sub = Array.isArray(raw) ? raw[0] : raw;
      if (!sub?.id) continue;
      if (!isCoScholasticSubject(sub.category ?? null)) continue;
      if (
        scholasticScope === 'non_scholastic_only' &&
        String(sub.category ?? '').toLowerCase() !== 'non_scholastic'
      ) {
        continue;
      }
      subjects.push({
        id: String(sub.id),
        name: String(sub.name || 'Subject'),
        color: sub.color ? String(sub.color) : undefined,
      });
    }
    subjects.sort((a, b) => a.name.localeCompare(b.name));

    const studentIds = (students || []).map((s: { id: string }) => s.id);
    let marks: Array<{ student_id: string; subject_id: string; grade: string | null }> = [];
    if (termId && studentIds.length > 0) {
      const { data: markRows, error: mErr } = await supabase
        .from('non_scholastic_marks')
        .select('student_id, subject_id, grade')
        .eq('school_code', schoolCode)
        .eq('term_id', termId)
        .eq('class_id', classId)
        .in('student_id', studentIds);

      if (mErr) {
        if (mErr.code === '42P01' || mErr.message?.includes('non_scholastic_marks')) {
          return NextResponse.json(
            {
              error: 'non_scholastic_marks table not found',
              hint: 'Run docs/NON_SCHOLASTIC_MARKS_SCHEMA.sql in Supabase',
            },
            { status: 501 }
          );
        }
        return NextResponse.json({ error: mErr.message }, { status: 500 });
      }
      marks = (markRows || []) as Array<{ student_id: string; subject_id: string; grade: string | null }>;
    }

    const gradeByStudentSubject = new Map<string, string>();
    for (const m of marks) {
      const g = String(m.grade ?? '').trim();
      if (g) gradeByStudentSubject.set(`${m.student_id}:${m.subject_id}`, g);
    }

    return NextResponse.json(
      {
        data: {
          class: { id: classId, class: className, section: sectionName },
          students: students || [],
          subjects,
          grades: Object.fromEntries(gradeByStudentSubject),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('non-scholastic-marks GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/non-scholastic-marks
 * Body: school_code, class_id, term_id, added_by, entries: [{ student_id, subject_id, grade }]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim();
    const classId = String(body.class_id || '').trim();
    const termId = String(body.term_id || '').trim();
    const rawAddedBy = body.added_by;
    const addedBy =
      rawAddedBy != null && String(rawAddedBy).trim() !== '' ? String(rawAddedBy).trim() : null;
    const entries = body.entries as Array<{ student_id: string; subject_id: string; grade?: string | null }>;
    const teacherClassTeacherOnly = Boolean(body.teacher_class_teacher_only);

    if (!schoolCode || !classId || !termId) {
      return NextResponse.json(
        { error: 'school_code, class_id, and term_id are required' },
        { status: 400 }
      );
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'entries must be a non-empty array' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    if (teacherClassTeacherOnly) {
      if (!addedBy) {
        return NextResponse.json(
          { error: 'added_by is required for class teacher saves.' },
          { status: 400 }
        );
      }
      const allowed = await isStaffClassTeacherForClass(supabase, schoolCode, addedBy, classId);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Only the class teacher for this section can save non-scholastic marks here.' },
          { status: 403 }
        );
      }
    }
    const now = new Date().toISOString();

    const rows = entries.map((e) => ({
      school_code: schoolCode,
      term_id: termId,
      class_id: classId,
      student_id: String(e.student_id),
      subject_id: String(e.subject_id),
      grade: e.grade != null && String(e.grade).trim() !== '' ? String(e.grade).trim() : null,
      added_by: addedBy,
      updated_at: now,
    }));

    const { error } = await supabase.from('non_scholastic_marks').upsert(rows, {
      onConflict: 'term_id,student_id,subject_id',
    });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('non_scholastic_marks')) {
        return NextResponse.json(
          {
            error: 'non_scholastic_marks table not found',
            hint: 'Run docs/NON_SCHOLASTIC_MARKS_SCHEMA.sql in Supabase',
          },
          { status: 501 }
        );
      }
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Saved', count: rows.length }, { status: 200 });
  } catch (e) {
    console.error('non-scholastic-marks POST:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
