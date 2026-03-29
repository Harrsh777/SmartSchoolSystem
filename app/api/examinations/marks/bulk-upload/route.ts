import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { assertBulkMarksEntryAllowed } from '@/lib/marks-bulk-upload-scope';
import { getSchoolAdminSessionForSchool, pickAuditStaffIdForSchool } from '@/lib/bulk-marks-school-admin';
import {
  assertIdentityColumnsMatchRoster,
  buildParsedRowFromMarks,
  isBulkMarksCellEmpty,
  parseMarksCell,
  readBulkMarksSheet,
  resolveStudentForBulkRow,
  validateBulkMarksHeaderRow,
  type BulkMarksRosterStudent,
  type BulkMarksRowError,
} from '@/lib/bulk-marks-excel';
import { checkRateLimit } from '@/lib/rate-limit-memory';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DATA_ROWS = 2000;

function examIsLockedForMarks(exam: Record<string, unknown>): boolean {
  if (exam.marks_entry_locked === true) return true;
  const st = String(exam.status || '').toLowerCase();
  return st === 'completed';
}

type MarkRecord = {
  exam_id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  school_id: string;
  school_code: string;
  max_marks: number;
  marks_obtained: number;
  remarks: string | null;
  entered_by: string;
  marks_entry_code?: string | null;
  status?: string;
};

async function upsertMarksRecords(
  supabase: ReturnType<typeof getServiceRoleClient>,
  records: MarkRecord[],
  selectJoin: string
): Promise<{ ok: true; data: unknown[] } | { ok: false; message: string }> {
  const { data: data1, error: err1 } = await supabase
    .from('student_subject_marks')
    .upsert(records, { onConflict: 'exam_id,student_id,subject_id', ignoreDuplicates: false })
    .select(selectJoin);

  if (!err1 && data1) return { ok: true, data: data1 };

  const isColumnError =
    err1?.code === 'PGRST204' || /column.*does not exist|Could not find the/.test(err1?.message || '');
  if (isColumnError) {
    const stripped = records.map((r) => {
      const { status: _s, marks_entry_code: _m, ...rest } = r;
      void _s;
      void _m;
      return rest;
    });
    const { data: data2, error: err2 } = await supabase
      .from('student_subject_marks')
      .upsert(stripped, { onConflict: 'exam_id,student_id,subject_id', ignoreDuplicates: false })
      .select(selectJoin);
    if (!err2 && data2) return { ok: true, data: data2 };
    return { ok: false, message: err2?.message || 'Upsert failed' };
  }
  return { ok: false, message: err1?.message || 'Upsert failed' };
}

export async function POST(request: NextRequest) {
  try {
    const fwd = request.headers.get('x-forwarded-for');
    const clientIp = fwd ? fwd.split(',')[0]!.trim() : request.headers.get('x-real-ip') || 'local';
    const rl = checkRateLimit(`bulk_marks_upload_ip:${clientIp}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many uploads from this network. Try again shortly.', retry_after_ms: rl.retry_after_ms },
        { status: 429 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Use multipart/form-data with fields: file, school_code, exam_id, class_id, subject_id, entered_by' },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    const school_code = String(form.get('school_code') || '').trim();
    const exam_id = String(form.get('exam_id') || '').trim();
    const class_id = String(form.get('class_id') || '').trim();
    const subject_id = String(form.get('subject_id') || '').trim();
    let entered_by = String(form.get('entered_by') || '').trim();

    if (!school_code || !exam_id || !class_id || !subject_id) {
      return NextResponse.json(
        { error: 'Missing school_code, exam_id, class_id, or subject_id' },
        { status: 400 }
      );
    }

    const schoolAdminSession = await getSchoolAdminSessionForSchool(request, school_code);
    const isSchoolAdmin = Boolean(schoolAdminSession);

    if (isSchoolAdmin) {
      const supabaseAudit = getServiceRoleClient();
      const auditId = await pickAuditStaffIdForSchool(supabaseAudit, school_code);
      if (!auditId) {
        return NextResponse.json(
          {
            error:
              'No active staff record found for this school. Add at least one active staff member so marks can be attributed, or enter marks while logged in as staff.',
            code: 'NO_STAFF_FOR_AUDIT',
          },
          { status: 400 }
        );
      }
      entered_by = auditId;
    } else if (!entered_by) {
      return NextResponse.json(
        { error: 'Missing entered_by (staff id), or sign in as school admin' },
        { status: 400 }
      );
    }

    const rlUserKey = isSchoolAdmin
      ? `bulk_marks_upload:school:${school_code}`
      : `bulk_marks_upload:${entered_by}:${school_code}`;
    const rlUser = checkRateLimit(rlUserKey, 10, 60_000);
    if (!rlUser.ok) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded (max 10 per minute).', retry_after_ms: rlUser.retry_after_ms },
        { status: 429 }
      );
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file field (Excel .xlsx).' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB).` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const sheet = readBulkMarksSheet(buffer);
    if (!sheet.ok) {
      return NextResponse.json({ error: sheet.error }, { status: 400 });
    }

    const rows = sheet.rows;
    if (rows.length < 2) {
      return NextResponse.json({ error: 'The file has no data rows below the header.' }, { status: 400 });
    }

    const headerCheck = validateBulkMarksHeaderRow(rows[0] as unknown[]);
    if (!headerCheck.ok) {
      return NextResponse.json(
        {
          error: headerCheck.error,
          code: 'INVALID_TEMPLATE_HEADERS',
        },
        { status: 400 }
      );
    }

    if (rows.length - 1 > MAX_DATA_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (max ${MAX_DATA_ROWS}). Split the file or contact admin.` },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { data: exam, error: examErr } = await supabase
      .from('examinations')
      .select('id, school_code, status, marks_entry_locked')
      .eq('id', exam_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (examErr || !exam) {
      return NextResponse.json({ error: 'Examination not found.' }, { status: 404 });
    }

    if (examIsLockedForMarks(exam as Record<string, unknown>)) {
      return NextResponse.json(
        { error: 'Marks entry is locked for this examination. Upload rejected.', code: 'EXAM_LOCKED' },
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
      .select('max_marks')
      .eq('exam_id', exam_id)
      .eq('school_code', school_code)
      .eq('class_id', class_id)
      .eq('subject_id', subject_id)
      .maybeSingle();

    if (mapErr || !mapping) {
      return NextResponse.json(
        { error: 'Subject is not in this exam for the selected class.', code: 'SUBJECT_MISMATCH' },
        { status: 400 }
      );
    }

    const maxMarks = Number(mapping.max_marks) || 0;
    if (maxMarks <= 0) {
      return NextResponse.json({ error: 'Invalid max_marks in exam mapping.' }, { status: 400 });
    }

    const { data: classRow, error: classErr } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (classErr || !classRow) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }

    const { data: rosterRows, error: rosterErr } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section')
      .eq('school_code', school_code)
      .ilike('class', String(classRow.class).trim())
      .ilike('section', String(classRow.section ?? '').trim())
      .eq('status', 'active');

    if (rosterErr) {
      return NextResponse.json({ error: 'Failed to load class roster', details: rosterErr.message }, { status: 500 });
    }

    const roster: BulkMarksRosterStudent[] = (rosterRows || []).map((s) => ({
      id: s.id,
      admission_no: s.admission_no,
      student_name: String(s.student_name ?? ''),
      class: String(s.class ?? ''),
      section: String(s.section ?? ''),
    }));

    const rosterById = new Map(roster.map((s) => [s.id, s]));
    const rosterByAdmission = new Map<string, BulkMarksRosterStudent>();
    for (const s of roster) {
      if (s.admission_no) {
        const k = s.admission_no.trim();
        if (k) {
          rosterByAdmission.set(k, s);
          rosterByAdmission.set(k.toLowerCase(), s);
        }
      }
    }

    const rosterIds = roster.map((s) => s.id);
    const lockedSubjects = new Set<string>();
    if (rosterIds.length > 0) {
      const { data: lockedRows } = await supabase
        .from('student_subject_marks')
        .select('student_id')
        .eq('exam_id', exam_id)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        .eq('school_code', school_code)
        .eq('status', 'submitted')
        .in('student_id', rosterIds);

      for (const r of lockedRows || []) {
        lockedSubjects.add(r.student_id);
      }
    }

    const failed: BulkMarksRowError[] = [];
    let skipped_empty = 0;
    const seenInFile = new Set<string>();
    const toSave: MarkRecord[] = [];

    const excelRowBase = 2;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const excel_row = excelRowBase + i - 1;

      if (!row || row.every((c) => String(c ?? '').trim() === '')) {
        continue;
      }

      while (row.length < 6) {
        row.push('');
      }

      const hasExtra = row.slice(6).some((c) => String(c ?? '').trim() !== '');
      if (hasExtra) {
        failed.push({
          excel_row,
          reason: 'Extra columns found. The template must have exactly 6 columns — do not add columns.',
        });
        continue;
      }

      const [c0, c1, c2, c3, c4, c5] = row;

      if (isBulkMarksCellEmpty(c5)) {
        skipped_empty++;
        continue;
      }

      const resolved = resolveStudentForBulkRow(c0, c1, rosterById, rosterByAdmission);
      if (!resolved.ok) {
        failed.push({
          excel_row,
          reason: resolved.error,
          student_id: String(c0 ?? '').trim() || undefined,
          admission_no: String(c1 ?? '').trim() || undefined,
        });
        continue;
      }

      const idMatch = assertIdentityColumnsMatchRoster(resolved.student, c2, c3, c4);
      if (!idMatch.ok) {
        failed.push({
          excel_row,
          reason: idMatch.error,
          student_id: resolved.student.id,
          admission_no: resolved.student.admission_no || undefined,
        });
        continue;
      }

      if (seenInFile.has(resolved.student.id)) {
        failed.push({
          excel_row,
          reason: 'Duplicate row for the same student in this file. Remove duplicates.',
          student_id: resolved.student.id,
        });
        continue;
      }
      seenInFile.add(resolved.student.id);

      if (lockedSubjects.has(resolved.student.id)) {
        failed.push({
          excel_row,
          reason: 'Marks for this student are already submitted and locked.',
          student_id: resolved.student.id,
        });
        continue;
      }

      const parsed = parseMarksCell(c5, maxMarks);
      if (!parsed.ok) {
        failed.push({
          excel_row,
          reason: parsed.error,
          student_id: resolved.student.id,
        });
        continue;
      }

      const built = buildParsedRowFromMarks(parsed);
      toSave.push({
        exam_id,
        student_id: resolved.student.id,
        subject_id,
        class_id,
        school_id: schoolData.id,
        school_code,
        max_marks: maxMarks,
        marks_obtained: built.marks_obtained,
        remarks: built.remarks,
        entered_by,
        marks_entry_code: built.marks_entry_code || undefined,
        status: 'draft',
      });
    }

    if (toSave.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          saved_count: 0,
          skipped_empty_marks: skipped_empty,
          failed,
          message:
            failed.length > 0
              ? 'No rows were saved. Fix the errors below and try again.'
              : 'No marks to save (only empty Marks cells).',
        },
        { status: 200 }
      );
    }

    const selectJoin = `
        *,
        subject:subjects (
          id,
          name,
          color
        )
      `;

    const up = await upsertMarksRecords(supabase, toSave, selectJoin);
    if (!up.ok) {
      return NextResponse.json(
        {
          error: 'Database failed while saving marks.',
          details: up.message,
          failed,
          partial_saved_note: 'Previous validation passed; failure occurred during save.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        saved_count: toSave.length,
        skipped_empty_marks: skipped_empty,
        failed,
        message: `Saved or updated ${toSave.length} mark row(s) as draft.${failed.length ? ` ${failed.length} row(s) had errors and were not saved.` : ''}`,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('bulk-upload POST', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
