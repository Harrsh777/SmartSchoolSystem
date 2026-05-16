import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { studentTargetMatchesDiary } from '@/lib/digital-diary-access';
import {
  getDiaryStorageBucket,
  parseDiaryStoragePathFromUrl,
} from '@/lib/digital-diary-storage';

/**
 * POST /api/student/diary/attachment-url
 * Body: { diary_id, attachment_id } — returns a short-lived signed URL for a teacher attachment.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'student' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const diary_id = typeof body.diary_id === 'string' ? body.diary_id.trim() : '';
    const attachment_id =
      typeof body.attachment_id === 'string' ? body.attachment_id.trim() : '';
    if (!diary_id || !attachment_id) {
      return NextResponse.json(
        { error: 'diary_id and attachment_id are required' },
        { status: 400 }
      );
    }

    const { data: studentRow, error: stErr } = await supabase
      .from('students')
      .select('id, school_code, class, section')
      .eq('id', session.user_id)
      .single();

    if (stErr || !studentRow) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = studentRow as {
      id: string;
      school_code: string;
      class: string;
      section?: string | null;
    };

    const { data: diary, error: dErr } = await supabase
      .from('diaries')
      .select(
        `
        id,
        school_code,
        diary_targets ( class_name, section_name )
      `
      )
      .eq('id', diary_id)
      .eq('school_code', student.school_code)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (dErr || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    const targets = (
      (diary.diary_targets as Array<{ class_name: string; section_name?: string | null }>) || []
    ).map((t) => ({
      class_name: t.class_name,
      section_name: t.section_name ?? null,
    }));

    if (
      !studentTargetMatchesDiary(
        diary.school_code,
        student.school_code,
        student.class,
        student.section,
        targets
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: attachment, error: attErr } = await supabase
      .from('diary_attachments')
      .select('id, file_url, file_name')
      .eq('id', attachment_id)
      .eq('diary_id', diary_id)
      .maybeSingle();

    if (attErr || !attachment?.file_url) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const bucket = getDiaryStorageBucket();
    const storagePath = parseDiaryStoragePathFromUrl(attachment.file_url, bucket);
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Could not resolve attachment path', details: attachment.file_url },
        { status: 500 }
      );
    }

    const { data: signed, error: sErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600);

    if (sErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: 'Could not sign URL', details: sErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      file_name: attachment.file_name,
    });
  } catch (e) {
    console.error('student diary attachment-url', e);
    return NextResponse.json(
      { error: 'Internal server error', details: (e as Error).message },
      { status: 500 }
    );
  }
}
