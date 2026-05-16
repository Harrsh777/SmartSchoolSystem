import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { studentTargetMatchesDiary } from '@/lib/digital-diary-access';

/**
 * GET /api/student/diary
 * Fetch diary entries for the logged-in student's class (session or query params).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;

    let schoolCode = searchParams.get('school_code');
    let studentId = searchParams.get('student_id');
    let class_name = searchParams.get('class');
    let section = searchParams.get('section');

    if (session?.role === 'student' && session.user_id) {
      const { data: st } = await supabase
        .from('students')
        .select('id, school_code, class, section')
        .eq('id', session.user_id)
        .single();
      if (st) {
        schoolCode = st.school_code;
        studentId = st.id;
        class_name = st.class;
        section = st.section ?? null;
      }
    }

    if (!schoolCode || !studentId || !class_name) {
      return NextResponse.json(
        { error: 'school_code, student_id, and class are required' },
        { status: 400 }
      );
    }

    const { data: diaries, error } = await supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type,
          file_size
        ),
        created_by_staff:created_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching diaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch diary entries', details: error.message },
        { status: 500 }
      );
    }

    interface DiaryTarget {
      class_name: string;
      section_name?: string | null;
    }
    interface DiaryRecord {
      id: string;
      diary_targets?: DiaryTarget[] | null;
    }

    const filteredDiaries = (diaries || []).filter((diary: DiaryRecord) => {
      const targets = diary.diary_targets || [];
      return studentTargetMatchesDiary(
        schoolCode!,
        schoolCode!,
        class_name!,
        section,
        targets.map((t) => ({ class_name: t.class_name, section_name: t.section_name ?? null }))
      );
    });

    const diaryIds = filteredDiaries.map((d: DiaryRecord) => d.id);

    const { data: readRecords } = await supabase
      .from('diary_reads')
      .select('diary_id')
      .in('diary_id', diaryIds.length ? diaryIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('user_id', studentId)
      .eq('user_type', 'STUDENT');

    const readDiaryIds = new Set((readRecords || []).map((r: { diary_id: string }) => r.diary_id));

    const submissionByDiary = new Map<string, Record<string, unknown>>();
    if (diaryIds.length > 0) {
      const { data: subs } = await supabase
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
        .eq('student_id', studentId)
        .in('diary_id', diaryIds);

      for (const s of subs || []) {
        submissionByDiary.set((s as { diary_id: string }).diary_id, s as Record<string, unknown>);
      }
    }

    interface DiaryWithDetails extends DiaryRecord {
      title: string;
      content: string;
      type: string;
      mode?: string | null;
      subject_id?: string | null;
      subject_name?: string | null;
      due_at?: string | null;
      instructions?: string | null;
      submissions_allowed?: boolean;
      allow_late_submission?: boolean;
      max_submission_attempts?: number;
      created_at: string;
      updated_at?: string | null;
      created_by?: string;
      diary_attachments?: Array<{
        id: string;
        file_name: string;
        file_url: string;
        file_type?: string | null;
        file_size?: number | null;
      }> | null;
      created_by_staff?: { full_name?: string } | null;
      academic_year_id?: string | null;
    }

    const subjectIds = Array.from(
      new Set(
        filteredDiaries
          .map((diary) => (diary as DiaryWithDetails).subject_id)
          .filter((id): id is string => !!id)
      )
    );

    const subjectNameById = new Map<string, string>();
    if (subjectIds.length > 0) {
      const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
      (subjects || []).forEach((subject: { id: string; name: string }) => {
        subjectNameById.set(subject.id, subject.name);
      });
    }

    function chipFor(
      type: string,
      submissionsAllowed: boolean,
      sub: Record<string, unknown> | undefined,
      dueAt: string | null | undefined
    ): string {
      if (!submissionsAllowed || (type !== 'HOMEWORK' && type !== 'ASSIGNMENT')) return 'NONE';
      if (!sub) {
        if (dueAt && new Date(dueAt).getTime() < Date.now()) return 'Pending';
        return 'Pending';
      }
      const status = String(sub.status || '');
      if (status === 'draft') return 'Draft';
      if (status === 'late' || sub.is_late) return 'Late';
      if (status === 'submitted') return 'Submitted';
      return 'Pending';
    }

    const formattedDiaries = filteredDiaries.map((diary: DiaryWithDetails) => {
      const targetClasses = (diary.diary_targets || [])
        .map((t: DiaryTarget) => `${t.class_name}${t.section_name ? `-${t.section_name}` : ''}`)
        .join(', ');

      const rawSub = submissionByDiary.get(diary.id);
      const submissionsAllowed = diary.submissions_allowed !== false;

      return {
        id: diary.id,
        title: diary.title,
        content: diary.content,
        type: diary.type,
        mode: diary.mode,
        subject_id: diary.subject_id || null,
        subject_name:
          diary.subject_name || (diary.subject_id ? subjectNameById.get(diary.subject_id) || null : null),
        due_at: diary.due_at || null,
        instructions: diary.instructions || null,
        submissions_allowed: submissionsAllowed,
        allow_late_submission: diary.allow_late_submission !== false,
        max_submission_attempts: diary.max_submission_attempts ?? 3,
        created_at: diary.created_at,
        updated_at: diary.updated_at,
        created_by: diary.created_by_staff?.full_name || 'Unknown',
        created_by_id: diary.created_by,
        target_classes: targetClasses,
        attachments: (diary.diary_attachments || []).map((att) => ({
          id: att.id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: att.file_size,
        })),
        is_read: readDiaryIds.has(diary.id),
        academic_year_id: diary.academic_year_id,
        submission: rawSub
          ? {
              id: rawSub.id,
              status: rawSub.status,
              submitted_at: rawSub.submitted_at,
              is_late: rawSub.is_late,
              attempt_count: rawSub.attempt_count,
              student_comment: rawSub.student_comment,
              files: Array.isArray(rawSub.diary_submission_files)
                ? rawSub.diary_submission_files
                : [],
            }
          : null,
        submission_chip: chipFor(diary.type, submissionsAllowed, rawSub, diary.due_at),
      };
    });

    return NextResponse.json({ data: formattedDiaries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student diary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
