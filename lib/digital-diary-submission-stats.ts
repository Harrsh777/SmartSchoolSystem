import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiaryTargetRow } from '@/lib/digital-diary-access';
import {
  fetchStudentsByClassSectionKeys,
  studentsForSingleDiaryTargets,
  type DiaryStudentRow,
} from '@/lib/digital-diary-students';

export type DiarySubmissionStats = {
  submitted: number;
  pending: number;
  late: number;
  eligible: number;
};

export type DiaryForSubmissionStats = {
  id: string;
  school_code: string;
  submissions_allowed?: boolean | null;
  diary_targets?: DiaryTargetRow[] | null;
};

type SubmissionRow = {
  diary_id: string;
  student_id: string;
  status: string;
  is_late: boolean;
};

function isSubmittedStatus(status: string, isLate: boolean): boolean {
  return status === 'submitted' || status === 'late' || isLate;
}

function statsForDiary(
  eligible: DiaryStudentRow[],
  submissions: SubmissionRow[]
): DiarySubmissionStats {
  const byStudent = new Map(submissions.map((s) => [s.student_id, s]));
  let submitted = 0;
  let late = 0;

  for (const student of eligible) {
    const sub = byStudent.get(student.id);
    if (!sub) continue;
    if (isSubmittedStatus(sub.status, sub.is_late)) {
      submitted++;
      if (sub.status === 'late' || sub.is_late) late++;
    }
  }

  const eligibleCount = eligible.length;
  return {
    eligible: eligibleCount,
    submitted,
    pending: Math.max(0, eligibleCount - submitted),
    late,
  };
}

/**
 * Per-diary submission counts based on target-class students (not only submission rows).
 * Matches /api/diary/[id]/submissions summary logic.
 */
export async function buildDiarySubmissionStatsMap(
  supabase: SupabaseClient,
  diaries: DiaryForSubmissionStats[]
): Promise<Map<string, DiarySubmissionStats>> {
  const result = new Map<string, DiarySubmissionStats>();
  const trackable = diaries.filter((d) => d.submissions_allowed !== false);
  for (const diary of diaries) {
    result.set(diary.id, { submitted: 0, pending: 0, late: 0, eligible: 0 });
  }
  if (trackable.length === 0) return result;

  const schoolCode = trackable[0].school_code;
  const diaryIds = trackable.map((d) => d.id);
  const allTargets = trackable.flatMap((d) => d.diary_targets || []);

  const { byKey, error: studentErr } = await fetchStudentsByClassSectionKeys(
    supabase,
    schoolCode,
    allTargets
  );

  if (studentErr) {
    console.error('buildDiarySubmissionStatsMap: student load failed', studentErr);
    return result;
  }

  const { data: subRows, error: subErr } = await supabase
    .from('diary_student_submissions')
    .select('diary_id, student_id, status, is_late')
    .in('diary_id', diaryIds);

  const subsByDiary = new Map<string, SubmissionRow[]>();
  if (!subErr && subRows) {
    for (const row of subRows as SubmissionRow[]) {
      const list = subsByDiary.get(row.diary_id) || [];
      list.push(row);
      subsByDiary.set(row.diary_id, list);
    }
  } else if (subErr) {
    console.error('buildDiarySubmissionStatsMap: submissions load failed', subErr.message);
  }

  for (const diary of trackable) {
    const eligible = studentsForSingleDiaryTargets(byKey, diary.diary_targets || []);
    const stats = statsForDiary(eligible, subsByDiary.get(diary.id) || []);
    result.set(diary.id, stats);
  }

  return result;
}

/**
 * School-wide rollup: sum of per-diary pending/submitted across assignment diaries.
 */
export async function buildAssignmentSubmissionRollup(
  supabase: SupabaseClient,
  diaries: DiaryForSubmissionStats[]
): Promise<{
  pending_submissions: number;
  submitted_submissions: number;
  late_submissions: number;
  eligible_submissions: number;
  submission_rate_pct: number;
}> {
  const statsMap = await buildDiarySubmissionStatsMap(supabase, diaries);
  let pending = 0;
  let submitted = 0;
  let late = 0;
  let eligible = 0;

  for (const stats of statsMap.values()) {
    pending += stats.pending;
    submitted += stats.submitted;
    late += stats.late;
    eligible += stats.eligible;
  }

  return {
    pending_submissions: pending,
    submitted_submissions: submitted,
    late_submissions: late,
    eligible_submissions: eligible,
    submission_rate_pct: eligible > 0 ? Math.round((submitted / eligible) * 1000) / 10 : 0,
  };
}
