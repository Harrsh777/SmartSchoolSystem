export type DiaryType = 'HOMEWORK' | 'OTHER' | 'ASSIGNMENT' | 'NOTICE';

export type SubmissionChip = 'Submitted' | 'Pending' | 'Late' | 'Draft' | 'Returned' | 'NONE';

export interface DiarySubmissionFile {
  id: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  storage_path: string;
  storage_bucket?: string;
}

export interface StudentSubmissionRow {
  student: {
    id: string;
    name?: string | null;
    admission_no?: string | null;
    roll_number?: string | null;
    class?: string | null;
    section?: string | null;
  };
  submission: {
    id: string;
    status: string;
    student_comment?: string | null;
    submitted_at?: string | null;
    updated_at?: string | null;
    is_late: boolean;
    attempt_count: number;
    files: DiarySubmissionFile[];
  } | null;
  submission_chip: SubmissionChip;
}

export interface TeacherAnalytics {
  total_assignments: number;
  pending_submissions: number;
  submission_rate_pct: number;
  late_submissions: number;
}
