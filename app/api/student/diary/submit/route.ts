import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { studentTargetMatchesDiary } from '@/lib/digital-diary-access';
import {
  diarySchemaMissingResponse,
  getDiaryStorageBucket,
  isDiarySchemaMissingError,
} from '@/lib/digital-diary-storage';

const BUCKET = getDiaryStorageBucket();
const MAX_FILE = 25 * 1024 * 1024;
const MAX_TOTAL = 80 * 1024 * 1024;

function extFromName(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * POST multipart: diary_id, finalize (0|1), comment (optional), file (repeat)
 * Student session required.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'student' || !session.user_id) {
      return NextResponse.json(
        {
          error:
            'Your session has expired or you are not signed in as a student. Please log in again at the student portal.',
          code: 'SESSION_REQUIRED',
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const diaryIdRaw = formData.get('diary_id');
    const finalizeRaw = formData.get('finalize');
    const comment = formData.get('comment');
    const diaryId = typeof diaryIdRaw === 'string' ? diaryIdRaw.trim() : '';
    const finalize = finalizeRaw === '1' || finalizeRaw === 'true';

    if (!diaryId) {
      return NextResponse.json({ error: 'diary_id is required' }, { status: 400 });
    }

    const { data: studentRow, error: stErr } = await supabase
      .from('students')
      .select('id, school_code, class, section')
      .eq('id', session.user_id)
      .single();

    if (stErr || !studentRow) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const st = studentRow as { id: string; school_code: string; class: string; section?: string | null };

    const { data: diary, error: dErr } = await supabase
      .from('diaries')
      .select(
        `
        id,
        school_code,
        type,
        due_at,
        submissions_allowed,
        allow_late_submission,
        max_submission_attempts,
        diary_targets ( class_name, section_name )
      `
      )
      .eq('id', diaryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (dErr || !diary) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if ((diary.type === 'HOMEWORK' || diary.type === 'ASSIGNMENT') && diary.submissions_allowed === false) {
      return NextResponse.json({ error: 'Submissions are not required for this entry' }, { status: 400 });
    }

    const targets = (diary.diary_targets || []) as Array<{ class_name: string; section_name?: string | null }>;
    if (
      !studentTargetMatchesDiary(
        diary.school_code,
        st.school_code,
        st.class,
        st.section ?? null,
        targets.map((t) => ({ class_name: t.class_name, section_name: t.section_name ?? null }))
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    if (diary.due_at && !diary.allow_late_submission && finalize) {
      if (new Date(diary.due_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Deadline has passed — late submissions are not allowed' }, { status: 400 });
      }
    }

    const { data: subRowInitial, error: subFetchErr } = await supabase
      .from('diary_student_submissions')
      .select('id, attempt_count, status')
      .eq('diary_id', diaryId)
      .eq('student_id', st.id)
      .maybeSingle();
    let subRow = subRowInitial;

    if (subFetchErr && subFetchErr.code !== 'PGRST116') {
      if (isDiarySchemaMissingError(subFetchErr)) {
        return NextResponse.json(diarySchemaMissingResponse(subFetchErr.message), { status: 503 });
      }
      return NextResponse.json({ error: subFetchErr.message, code: subFetchErr.code }, { status: 500 });
    }

    const maxAttempts = Math.min(20, Math.max(1, Number(diary.max_submission_attempts) || 3));

    const fileEntries = formData.getAll('file').filter((f): f is File => typeof f === 'object' && f instanceof File && f.size > 0);

    if (!subRow) {
      const { data: inserted, error: insErr } = await supabase
        .from('diary_student_submissions')
        .insert({
          diary_id: diaryId,
          student_id: st.id,
          school_code: st.school_code,
          status: 'draft',
          student_comment: typeof comment === 'string' ? comment.trim() || null : null,
        })
        .select('id, attempt_count, status')
        .single();
      if (insErr) {
        return NextResponse.json({ error: 'Failed to create submission', details: insErr.message }, { status: 500 });
      }
      subRow = inserted;
    } else if (!finalize && typeof comment === 'string') {
      await supabase
        .from('diary_student_submissions')
        .update({ student_comment: comment.trim() || null })
        .eq('id', subRow.id);
    }

    const submissionId = subRow!.id as string;
    let uploadedBytes = 0;

    for (const file of fileEntries) {
      if (file.size > MAX_FILE) {
        return NextResponse.json({ error: `File too large: ${file.name} (max ${MAX_FILE / (1024 * 1024)} MB)` }, { status: 400 });
      }
      uploadedBytes += file.size;
      if (uploadedBytes > MAX_TOTAL) {
        return NextResponse.json({ error: 'Total upload size exceeds limit' }, { status: 400 });
      }

      const ext = extFromName(file.name);
      const allowedExt = new Set([
        'pdf',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'doc',
        'docx',
        'zip',
      ]);
      if (!allowedExt.has(ext)) {
        return NextResponse.json({ error: `Unsupported format: ${file.name}` }, { status: 400 });
      }

      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `${st.school_code}/diary/submissions/${diaryId}/${st.id}/${crypto.randomUUID()}_${sanitized}`;
      const buf = Buffer.from(await file.arrayBuffer());

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upErr) {
        return NextResponse.json({ error: 'Upload failed', details: upErr.message }, { status: 500 });
      }

      const { error: fErr } = await supabase.from('diary_submission_files').insert({
        submission_id: submissionId,
        storage_bucket: BUCKET,
        storage_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (fErr) {
        await supabase.storage.from(BUCKET).remove([objectPath]);
        return NextResponse.json({ error: 'Failed to save file metadata', details: fErr.message }, { status: 500 });
      }
    }

    if (finalize) {
      const { data: freshSub } = await supabase
        .from('diary_student_submissions')
        .select('id, attempt_count, status')
        .eq('id', submissionId)
        .single();

      const prevStatus = freshSub?.status || subRow?.status;
      if (prevStatus === 'submitted' || prevStatus === 'late') {
        const attempts = Number(freshSub?.attempt_count || subRow?.attempt_count || 1);
        if (attempts >= maxAttempts) {
          return NextResponse.json({ error: 'Maximum submission attempts reached' }, { status: 400 });
        }
      }

      const { data: existingFiles } = await supabase
        .from('diary_submission_files')
        .select('id')
        .eq('submission_id', submissionId)
        .limit(1);

      if (!existingFiles?.length) {
        return NextResponse.json({ error: 'Add at least one file before submitting' }, { status: 400 });
      }

      const pastDue = Boolean(diary.due_at && new Date(diary.due_at).getTime() < Date.now());
      if (pastDue && !diary.allow_late_submission) {
        return NextResponse.json({ error: 'Deadline has passed — late submissions are not allowed' }, { status: 400 });
      }

      const nextAttempt =
        prevStatus === 'submitted' || prevStatus === 'late'
          ? Math.min(maxAttempts, Number(freshSub?.attempt_count || subRow?.attempt_count || 1) + 1)
          : Number(freshSub?.attempt_count || subRow?.attempt_count || 1);

      const nextStatus: 'submitted' | 'late' = pastDue && diary.allow_late_submission ? 'late' : 'submitted';

      const { error: finErr } = await supabase
        .from('diary_student_submissions')
        .update({
          status: nextStatus,
          submitted_at: nowIso,
          is_late: pastDue,
          attempt_count: nextAttempt,
          student_comment: typeof comment === 'string' ? comment.trim() || null : undefined,
        })
        .eq('id', submissionId);

      if (finErr) {
        return NextResponse.json({ error: 'Failed to finalize submission', details: finErr.message }, { status: 500 });
      }
    }

    const { data: out } = await supabase
      .from('diary_student_submissions')
      .select(
        `
        id,
        diary_id,
        status,
        submitted_at,
        is_late,
        attempt_count,
        student_comment,
        diary_submission_files ( id, file_name, mime_type, file_size, storage_path, storage_bucket )
      `
      )
      .eq('id', submissionId)
      .single();

    return NextResponse.json({ data: out }, { status: 200 });
  } catch (e) {
    console.error('student diary submit', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
