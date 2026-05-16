import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { assertTeacherCanAccessDiary, type DiaryTargetRow } from '@/lib/digital-diary-access';
import { getDiaryStorageBucket } from '@/lib/digital-diary-storage';

/**
 * POST /api/diary/submissions/signed-url
 * Body: { diary_id, storage_path } — teacher session; path must belong to a submission for that diary.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const diary_id = typeof body.diary_id === 'string' ? body.diary_id.trim() : '';
    const storage_path = typeof body.storage_path === 'string' ? body.storage_path.trim() : '';
    if (!diary_id || !storage_path) {
      return NextResponse.json({ error: 'diary_id and storage_path required' }, { status: 400 });
    }

    const { data: diary, error: dErr } = await supabase
      .from('diaries')
      .select(
        `id, school_code, created_by, subject_id, mode, academic_year_id,
         diary_targets ( class_name, section_name, class_id )`
      )
      .eq('id', diary_id)
      .single();

    if (dErr || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    const targets: DiaryTargetRow[] = (
      (diary.diary_targets as DiaryTargetRow[]) || []
    ).map((t) => ({
      class_name: t.class_name,
      section_name: t.section_name ?? null,
      class_id: t.class_id ?? null,
    }));

    const allowed = await assertTeacherCanAccessDiary(
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
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: fileRow, error: fileErr } = await supabase
      .from('diary_submission_files')
      .select('storage_path, storage_bucket, submission_id')
      .eq('storage_path', storage_path)
      .maybeSingle();

    if (fileErr || !fileRow) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: subRow, error: subErr } = await supabase
      .from('diary_student_submissions')
      .select('diary_id')
      .eq('id', fileRow.submission_id)
      .maybeSingle();

    if (subErr || !subRow || subRow.diary_id !== diary_id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const bucket = fileRow.storage_bucket || getDiaryStorageBucket();
    const { data: signed, error: sErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileRow.storage_path, 120);

    if (sErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Could not sign URL', details: sErr?.message }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error('signed-url', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
