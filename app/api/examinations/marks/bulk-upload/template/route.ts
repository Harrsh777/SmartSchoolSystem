import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { assertBulkMarksEntryAllowed } from '@/lib/marks-bulk-upload-scope';
import { getSchoolAdminSessionForSchool } from '@/lib/bulk-marks-school-admin';
import { buildBulkMarksTemplateBuffer } from '@/lib/bulk-marks-excel';
import { checkRateLimit } from '@/lib/rate-limit-memory';
import { normalizeMarksEntryCode } from '@/lib/marks-entry-codes';

function examIsLockedForMarks(exam: Record<string, unknown>): boolean {
  if (exam.marks_entry_locked === true) return true;
  const st = String(exam.status || '').toLowerCase();
  return st === 'completed';
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const school_code = sp.get('school_code')?.trim() || '';
    const exam_id = sp.get('exam_id')?.trim() || '';
    const class_id = sp.get('class_id')?.trim() || '';
    const subject_id = sp.get('subject_id')?.trim() || '';
    const entered_by = sp.get('entered_by')?.trim() || '';

    if (!school_code || !exam_id || !class_id || !subject_id) {
      return NextResponse.json(
        {
          error: 'Missing query params: school_code, exam_id, class_id, subject_id',
        },
        { status: 400 }
      );
    }

    const schoolAdminSession = await getSchoolAdminSessionForSchool(request, school_code);
    const isSchoolAdmin = Boolean(schoolAdminSession);

    if (!isSchoolAdmin && !entered_by) {
      return NextResponse.json(
        {
          error: 'Missing query param: entered_by (or sign in as school admin)',
        },
        { status: 400 }
      );
    }

    const rlKey = isSchoolAdmin
      ? `bulk_marks_template:school:${school_code}`
      : `bulk_marks_template:${entered_by}:${school_code}`;
    const rl = checkRateLimit(rlKey, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many template downloads. Try again in a minute.', retry_after_ms: rl.retry_after_ms },
        { status: 429 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: exam, error: examErr } = await supabase
      .from('examinations')
      .select('id, school_code, status, marks_entry_locked, exam_name')
      .eq('id', exam_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (examErr || !exam) {
      return NextResponse.json({ error: 'Examination not found for this school.' }, { status: 404 });
    }

    if (examIsLockedForMarks(exam as Record<string, unknown>)) {
      return NextResponse.json(
        { error: 'Marks entry is locked for this examination. Bulk template is not available.' },
        { status: 403 }
      );
    }

    if (!isSchoolAdmin) {
      const scope = await assertBulkMarksEntryAllowed(supabase, school_code, entered_by, class_id, [
        subject_id,
      ]);
      if (!scope.ok) {
        return NextResponse.json(scope.body, { status: scope.status });
      }
    }

    const { data: mapping, error: mapErr } = await supabase
      .from('exam_subject_mappings')
      .select('max_marks, pass_marks, subject_id, class_id')
      .eq('exam_id', exam_id)
      .eq('school_code', school_code)
      .eq('class_id', class_id)
      .eq('subject_id', subject_id)
      .maybeSingle();

    if (mapErr || !mapping) {
      return NextResponse.json(
        { error: 'This subject is not part of the exam for the selected class.' },
        { status: 400 }
      );
    }

    const maxMarksNum = Number((mapping as { max_marks?: unknown }).max_marks) || 0;

    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subject_id)
      .eq('school_code', school_code)
      .maybeSingle();

    const subjectDisplayName = subjectRow?.name
      ? String(subjectRow.name)
      : `Subject (${subject_id.slice(0, 8)})`;

    const { data: classRow, error: classErr } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (classErr || !classRow) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }

    const { data: students, error: stuErr } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section')
      .eq('school_code', school_code)
      .ilike('class', String(classRow.class).trim())
      .ilike('section', String(classRow.section ?? '').trim())
      .eq('status', 'active')
      .order('roll_number', { ascending: true });

    if (stuErr) {
      return NextResponse.json({ error: 'Failed to load students', details: stuErr.message }, { status: 500 });
    }

    const list = students || [];
    const ids = list.map((s) => s.id);

    const marksByStudent = new Map<
      string,
      { marks_obtained: number; marks_entry_code: string | null; updated_at: string | null; created_at: string | null }
    >();

    if (ids.length > 0) {
      let existing: Array<{
        student_id: string;
        marks_obtained: number;
        marks_entry_code?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      }> | null = null;
      const { data: existingWithUpdatedAt, error: existingErr } = await supabase
        .from('student_subject_marks')
        .select('student_id, marks_obtained, marks_entry_code, updated_at, created_at')
        .eq('exam_id', exam_id)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        .eq('school_code', school_code)
        .in('student_id', ids);
      if (!existingErr) {
        existing = existingWithUpdatedAt as unknown as typeof existing;
      } else {
        const colErr =
          existingErr.code === 'PGRST204' ||
          /column.*does not exist|Could not find the/.test(existingErr.message || '');
        if (!colErr) {
          return NextResponse.json({ error: 'Failed to load existing marks', details: existingErr.message }, { status: 500 });
        }
        const { data: existingFallback, error: fallbackErr } = await supabase
          .from('student_subject_marks')
          .select('student_id, marks_obtained, marks_entry_code, created_at')
          .eq('exam_id', exam_id)
          .eq('class_id', class_id)
          .eq('subject_id', subject_id)
          .eq('school_code', school_code)
          .in('student_id', ids);
        if (!fallbackErr) {
          existing = (existingFallback as unknown as typeof existing) || [];
        } else {
          const fallbackColErr =
            fallbackErr.code === 'PGRST204' ||
            /column.*does not exist|Could not find the/.test(fallbackErr.message || '');
          if (!fallbackColErr) {
            return NextResponse.json({ error: 'Failed to load existing marks', details: fallbackErr.message }, { status: 500 });
          }
          // Final compatibility fallback for older schemas without marks_entry_code and/or updated_at.
          const { data: existingLegacy, error: legacyErr } = await supabase
            .from('student_subject_marks')
            .select('student_id, marks_obtained, created_at')
            .eq('exam_id', exam_id)
            .eq('class_id', class_id)
            .eq('subject_id', subject_id)
            .eq('school_code', school_code)
            .in('student_id', ids);
          if (legacyErr) {
            return NextResponse.json({ error: 'Failed to load existing marks', details: legacyErr.message }, { status: 500 });
          }
          existing = (existingLegacy as unknown as typeof existing) || [];
        }
      }

      for (const m of existing || []) {
        marksByStudent.set(m.student_id, {
          marks_obtained: Number(m.marks_obtained) || 0,
          marks_entry_code: m.marks_entry_code ? String(m.marks_entry_code) : null,
          updated_at: m.updated_at ? String(m.updated_at) : null,
          created_at: m.created_at ? String(m.created_at) : null,
        });
      }
    }

    let snapshotAt = new Date().toISOString();
    for (const m of marksByStudent.values()) {
      const ts = m.updated_at || m.created_at;
      if (!ts) continue;
      if (new Date(ts).getTime() > new Date(snapshotAt).getTime()) snapshotAt = ts;
    }

    const rows: string[][] = list.map((s) => {
      const ex = marksByStudent.get(s.id);
      let marksCell = '';
      if (ex?.marks_entry_code) {
        const code = normalizeMarksEntryCode(ex.marks_entry_code);
        marksCell = code || String(ex.marks_entry_code);
      } else if (marksByStudent.has(s.id)) {
        marksCell = String(ex?.marks_obtained ?? '');
      }
      return [
        s.id,
        String(s.admission_no ?? ''),
        String(s.student_name ?? ''),
        String(s.class ?? ''),
        String(s.section ?? ''),
        marksCell,
      ];
    });

    const buf = buildBulkMarksTemplateBuffer(rows, {
      subjectName: subjectDisplayName,
      maxMarks: maxMarksNum,
      snapshotAt,
    });
    const safeName = String((exam as { exam_name?: string }).exam_name || 'exam')
      .replace(/[^\w\- ]+/g, '')
      .slice(0, 60)
      .trim()
      .replace(/\s+/g, '_');
    const safeSubject = subjectDisplayName
      .replace(/[^\w\- ]+/g, '')
      .slice(0, 48)
      .trim()
      .replace(/\s+/g, '_');

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="marks_${safeName}_${safeSubject || 'subject'}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('bulk-upload template GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
