import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import {
  assertTeacherCanCreateDiary,
  isSchoolAdminStaff,
  resolveClassIdForDiaryTarget,
} from '@/lib/digital-diary-access';
import { buildDiarySubmissionStatsMap } from '@/lib/digital-diary-submission-stats';

interface DiaryTargetInput {
  class_name: string;
  section_name?: string;
}

async function validateSubjectWiseScope(params: {
  school_code: string;
  academic_year_id?: string;
  mode?: string;
  subject_id?: string;
  targets: DiaryTargetInput[];
}) {
  const { school_code, academic_year_id, mode, subject_id, targets } = params;

  if (!targets || targets.length !== 1) {
    return { ok: false, error: 'Please select exactly one class/section target' };
  }

  const target = targets[0];
  let classQuery = supabase
    .from('classes')
    .select('id, section')
    .eq('school_code', school_code)
    .eq('class', target.class_name);

  if (academic_year_id) {
    classQuery = classQuery.eq('academic_year', academic_year_id);
  }
  if (target.section_name) {
    classQuery = classQuery.eq('section', target.section_name);
  }

  const { data: classRows, error: classError } = await classQuery;
  if (classError) {
    return { ok: false, error: `Failed to validate class/section: ${classError.message}` };
  }
  if (!classRows || classRows.length === 0) {
    return { ok: false, error: 'Selected class/section was not found in this academic year' };
  }

  if (mode !== 'SUBJECT_WISE') {
    return { ok: true };
  }

  if (!subject_id) {
    return { ok: false, error: 'Subject is required when diary mode is Subject-wise' };
  }

  const classIds = classRows.map((row) => row.id);
  const { data: subjectMappings, error: subjectMapError } = await supabase
    .from('class_subjects')
    .select('class_id')
    .eq('school_code', school_code)
    .eq('subject_id', subject_id)
    .in('class_id', classIds);

  if (subjectMapError) {
    return { ok: false, error: `Failed to validate subject mapping: ${subjectMapError.message}` };
  }

  const coveredClassIds = new Set((subjectMappings || []).map((row) => row.class_id));
  if (coveredClassIds.size !== classIds.length) {
    return { ok: false, error: 'Selected subject is not assigned to the selected class/section scope' };
  }

  return { ok: true };
}

/**
 * GET /api/diary
 * Get diary entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYearId = searchParams.get('academic_year_id') || searchParams.get('academic_year');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = session.user_payload as { school_code?: string } | null | undefined;
    const sessionSchool = String(session.school_code || payload?.school_code || '').trim().toUpperCase();
    if (!sessionSchool || sessionSchool !== schoolCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAdminStaff = await isSchoolAdminStaff(supabase, session.user_id);

    // Build query
    let query = supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name,
          class_id
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type,
          file_size
        )
      `, { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!isAdminStaff) {
      query = query.eq('created_by', session.user_id);
    }

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: diaries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch diaries', details: error.message },
        { status: 500 }
      );
    }

    // Get read counts for each diary
    const diaryIds = (diaries || []).map((d) => d.id);
    const { data: readCounts } = await supabase
      .from('diary_reads')
      .select('diary_id')
      .in('diary_id', diaryIds);

    // Calculate read counts per diary
    const readCountMap = new Map<string, number>();
    (readCounts || []).forEach((read) => {
      readCountMap.set(read.diary_id, (readCountMap.get(read.diary_id) || 0) + 1);
    });

    const submissionStatsMap =
      diaryIds.length > 0
        ? await buildDiarySubmissionStatsMap(
            supabase,
            (diaries || []).map((diary) => ({
              id: diary.id,
              school_code: diary.school_code,
              submissions_allowed: diary.submissions_allowed,
              diary_targets: (diary.diary_targets || []).map(
                (t: { class_name: string; section_name?: string | null; class_id?: string | null }) => ({
                  class_name: t.class_name,
                  section_name: t.section_name ?? null,
                  class_id: t.class_id ?? null,
                })
              ),
            }))
          )
        : new Map<string, { submitted: number; pending: number; late: number }>();

    const subjectIds = Array.from(
      new Set(
        (diaries || [])
          .map((diary) => diary.subject_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const subjectNameById = new Map<string, string>();
    if (subjectIds.length > 0) {
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      if (subjectsError) {
        console.error('Error fetching diary subject names:', subjectsError);
      } else {
        (subjects || []).forEach((subject: { id: string; name: string }) => {
          subjectNameById.set(subject.id, subject.name);
        });
      }
    }

    // Get total target counts (students in assigned classes)
    // For now, we'll use a placeholder - in production, calculate from students table
    const diariesWithCounts = (diaries || []).map((diary) => ({
      ...diary,
      subject_name:
        diary.subject_name || (diary.subject_id ? subjectNameById.get(diary.subject_id) || null : null),
      read_count: readCountMap.get(diary.id) || 0,
      total_targets: diary.diary_targets?.length || 0,
      submission_stats: (() => {
        const s = submissionStatsMap.get(diary.id);
        return s
          ? { submitted: s.submitted, pending: s.pending, late: s.late }
          : { submitted: 0, pending: 0, late: 0 };
      })(),
    }));

    return NextResponse.json({
      data: diariesWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching diaries:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/diary
 * Create a new diary entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      school_code,
      academic_year_id,
      title,
      content,
      type,
      mode,
      subject_id,
      targets,
      attachments,
      due_at,
      instructions,
      submissions_allowed,
      allow_late_submission,
      max_submission_attempts,
    } = body;

    // Validation
    if (!school_code || !title || !type) {
      return NextResponse.json(
        { error: 'School code, title, and type are required' },
        { status: 400 }
      );
    }

    if (!['HOMEWORK', 'OTHER', 'ASSIGNMENT', 'NOTICE'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid diary type. Must be HOMEWORK, OTHER, ASSIGNMENT, or NOTICE' },
        { status: 400 }
      );
    }

    const scopeValidation = await validateSubjectWiseScope({
      school_code,
      academic_year_id,
      mode,
      subject_id,
      targets: targets || [],
    });
    if (!scopeValidation.ok) {
      return NextResponse.json({ error: scopeValidation.error }, { status: 400 });
    }

    const createDiaryMinimal = {
      school_code,
      subject_id: mode === 'SUBJECT_WISE' ? subject_id || null : null,
      mode: mode || 'GENERAL',
      academic_year_id: academic_year_id || null,
    };

    const targetRows =
      ((targets || []) as DiaryTargetInput[]).map((t) => ({
        class_name: t.class_name,
        section_name: t.section_name,
      })) || [];

    const canCreate = await assertTeacherCanCreateDiary(supabase, session, createDiaryMinimal, targetRows);
    if (!canCreate) {
      return NextResponse.json({ error: 'You do not have permission to create this diary entry' }, { status: 403 });
    }

    const staffPayload = session.user_payload as { school_code?: string } | null | undefined;
    const sessionSchoolPost = String(session.school_code || staffPayload?.school_code || '').trim().toUpperCase();
    if (!sessionSchoolPost || sessionSchoolPost !== String(school_code).trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const staffRowId = session.user_id;
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    interface DiaryData {
      school_id: string;
      school_code: string;
      title: string;
      content: string | null;
      type: string;
      mode: string;
      created_by: string | null;
      academic_year_id?: string;
      subject_id?: string | null;
      due_at?: string | null;
      instructions?: string | null;
      submissions_allowed?: boolean;
      allow_late_submission?: boolean;
      max_submission_attempts?: number;
    }

    const diaryData: DiaryData = {
      school_id: schoolData.id,
      school_code,
      title: title.trim(),
      content: content ? content.trim() : null,
      type,
      mode: mode || 'GENERAL',
      created_by: staffRowId,
    };

    if (due_at !== undefined && due_at !== null && String(due_at).trim() !== '') {
      diaryData.due_at = new Date(due_at).toISOString();
    }
    if (instructions !== undefined) {
      diaryData.instructions = instructions ? String(instructions).trim() : null;
    }
    if (typeof submissions_allowed === 'boolean') {
      diaryData.submissions_allowed = submissions_allowed;
    }
    if (typeof allow_late_submission === 'boolean') {
      diaryData.allow_late_submission = allow_late_submission;
    }
    if (max_submission_attempts !== undefined && max_submission_attempts !== null) {
      diaryData.max_submission_attempts = Math.min(20, Math.max(1, parseInt(String(max_submission_attempts), 10) || 3));
    }

    // Add academic_year_id if provided (it's a text field, not a UUID)
    if (academic_year_id) {
      diaryData.academic_year_id = academic_year_id;
    }
    if (mode === 'SUBJECT_WISE') {
      diaryData.subject_id = subject_id || null;
    }

    const { data: diary, error: insertError } = await supabase
      .from('diaries')
      .insert([diaryData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating diary entry:', insertError);
      if (insertError.code === '23514' && String(insertError.message || '').includes('diaries_type_check')) {
        return NextResponse.json(
          {
            error: 'Diary type ASSIGNMENT is not enabled in the database yet.',
            details:
              'Run migration supabase/migrations/20260515130000_diaries_allow_assignment_type.sql in Supabase (SQL editor or CLI), then try again.',
            code: insertError.code,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to create diary entry',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 }
      );
    }

    // Create diary targets
    const targetInserts = await Promise.all(
      targets.map(async (target: { class_name: string; section_name?: string }) => {
        const class_id = await resolveClassIdForDiaryTarget(
          supabase,
          school_code,
          { class_name: target.class_name, section_name: target.section_name },
          academic_year_id
        );
        return {
          diary_id: diary.id,
          class_name: target.class_name,
          section_name: target.section_name || null,
          class_id,
        };
      })
    );

    const { error: targetsError } = await supabase
      .from('diary_targets')
      .insert(targetInserts);

    if (targetsError) {
      // Rollback diary creation
      await supabase.from('diaries').delete().eq('id', diary.id);
      return NextResponse.json(
        { error: 'Failed to create diary targets', details: targetsError.message },
        { status: 500 }
      );
    }

    // Create attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentInserts = attachments.map((att: { file_name: string; file_url: string; file_type: string; file_size?: number }) => ({
        diary_id: diary.id,
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type,
        file_size: att.file_size || null,
        uploaded_by: staffRowId,
      }));

      const { error: attachmentsError } = await supabase
        .from('diary_attachments')
        .insert(attachmentInserts);

      if (attachmentsError) {
        console.error('Error creating attachments:', attachmentsError);
        // Don't fail the request, just log the error
      }
    }

    // Fetch complete diary with relations
    const { data: completeDiary } = await supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name,
          class_id
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type
        )
      `)
      .eq('id', diary.id)
      .single();

    return NextResponse.json({ data: completeDiary }, { status: 201 });
  } catch (error) {
    console.error('Error creating diary entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



