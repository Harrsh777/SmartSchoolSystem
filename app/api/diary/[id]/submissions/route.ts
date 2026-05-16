import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { assertTeacherCanAccessDiary, type DiaryTargetRow } from '@/lib/digital-diary-access';
import { diarySchemaMissingResponse, isDiarySchemaMissingError } from '@/lib/digital-diary-storage';
import { fetchStudentsForDiaryTargets } from '@/lib/digital-diary-students';

/**
 * GET /api/diary/[id]/submissions
 * Assignment creator / class–subject scoped teacher / admin: list student submission status + files metadata.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: diaryId } = await params;
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: diary, error: dErr } = await supabase
      .from('diaries')
      .select(
        `
        id,
        school_code,
        type,
        created_by,
        subject_id,
        mode,
        academic_year_id,
        due_at,
        submissions_allowed,
        allow_late_submission,
        max_submission_attempts,
        diary_targets ( class_name, section_name, class_id )
      `
      )
      .eq('id', diaryId)
      .single();

    if (dErr || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    const targets: DiaryTargetRow[] = (
      (diary.diary_targets as { class_name: string; section_name?: string | null; class_id?: string | null }[]) || []
    ).map((t) => ({
      class_name: t.class_name,
      section_name: t.section_name ?? null,
      class_id: t.class_id ?? null,
    }));

    const ok = await assertTeacherCanAccessDiary(
      supabase,
      session,
      {
        school_code: diary.school_code,
        created_by: diary.created_by,
        subject_id: diary.subject_id,
        mode: diary.mode,
        academic_year_id: diary.academic_year_id,
      },
      targets
    );
    if (!ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { students, error: studentsErr } = await fetchStudentsForDiaryTargets(
      supabase,
      diary.school_code,
      targets
    );
    if (studentsErr) {
      return NextResponse.json({ error: 'Failed to load students', details: studentsErr }, { status: 500 });
    }

    const { data: submissions, error: subErr } = await supabase
      .from('diary_student_submissions')
      .select(
        `
        id,
        student_id,
        status,
        student_comment,
        submitted_at,
        is_late,
        attempt_count,
        updated_at,
        diary_submission_files (
          id,
          file_name,
          mime_type,
          file_size,
          storage_path,
          storage_bucket
        )
      `
      )
      .eq('diary_id', diaryId);

    if (subErr) {
      if (isDiarySchemaMissingError(subErr)) {
        return NextResponse.json(diarySchemaMissingResponse(subErr.message), { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to load submissions', details: subErr.message }, { status: 500 });
    }

    const byStudent = new Map((submissions || []).map((r) => [(r as { student_id: string }).student_id, r]));

    const rows = students.map((st) => {
      const sub = byStudent.get(st.id) as
        | {
            id: string;
            status: string;
            student_comment: string | null;
            submitted_at: string | null;
            is_late: boolean;
            attempt_count: number;
            updated_at: string;
            diary_submission_files?: Array<Record<string, unknown>>;
          }
        | undefined;

      const files = Array.isArray(sub?.diary_submission_files)
        ? sub!.diary_submission_files!.map((f: Record<string, unknown>) => ({
            id: f.id,
            file_name: f.file_name,
            mime_type: f.mime_type,
            file_size: f.file_size,
            storage_path: f.storage_path,
            storage_bucket: f.storage_bucket,
          }))
        : [];

      let chip: 'Submitted' | 'Late' | 'Pending' | 'Draft' | 'Returned' | 'NONE' = 'NONE';
      if (!diary.submissions_allowed) chip = 'NONE';
      else if (!sub) chip = 'Pending';
      else if (sub.status === 'draft') chip = 'Draft';
      else if (sub.status === 'returned') chip = 'Returned';
      else if (sub.status === 'late' || sub.is_late) chip = 'Late';
      else if (sub.status === 'submitted') chip = 'Submitted';
      else chip = 'Pending';

      return {
        student: {
          id: st.id,
          name: st.student_name,
          admission_no: st.admission_no,
          roll_number: st.roll_number,
          class: st.class,
          section: st.section,
        },
        submission: sub
          ? {
              id: sub.id,
              status: sub.status,
              student_comment: sub.student_comment,
              submitted_at: sub.submitted_at,
              is_late: sub.is_late,
              attempt_count: sub.attempt_count,
              updated_at: sub.updated_at,
              files,
            }
          : null,
        submission_chip: chip,
      };
    });

    const submitted = rows.filter((r) => r.submission_chip === 'Submitted' || r.submission_chip === 'Late').length;
    const pending = rows.filter((r) => r.submission_chip === 'Pending' || r.submission_chip === 'Draft').length;
    const late = rows.filter((r) => r.submission_chip === 'Late').length;
    const total = diary.submissions_allowed ? rows.length : 0;

    return NextResponse.json({
      data: {
        diary: {
          id: diary.id,
          type: diary.type,
          due_at: diary.due_at,
          submissions_allowed: diary.submissions_allowed,
        },
        students: rows,
        summary: {
          eligible: total,
          submitted,
          pending,
          late,
          submission_rate_pct: total > 0 ? Math.round((submitted / total) * 1000) / 10 : 0,
        },
      },
    });
  } catch (e) {
    console.error('diary submissions GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
