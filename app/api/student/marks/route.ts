import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/student/marks
 * Fetch all marks for a specific student, grouped by examinations and subjects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Select only columns that exist in all deployments (no status, created_at, updated_at)
    const { data: marks, error: marksError } = await supabase
      .from('student_subject_marks')
      .select('id, marks_obtained, max_marks, remarks, subject_id, exam_id')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('marks_obtained', 'is', null);

    if (marksError) {
      console.error('Error fetching marks:', marksError);
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: marksError.message },
        { status: 500 }
      );
    }

    if (!marks || marks.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const subjectIds = [...new Set(marks.map((m) => m.subject_id).filter(Boolean))] as string[];
    const examIds = [...new Set(marks.map((m) => m.exam_id).filter(Boolean))] as string[];

    type ExamRow = { id: string; exam_name?: string | null; name?: string | null; exam_type?: string | null; start_date?: string | null; end_date?: string | null; academic_year?: string | null };
    const [subjectsRes, examsRes] = await Promise.all([
      subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds)
        : Promise.resolve({ data: [] as { id: string; name: string; color: string | null }[], error: null }),
      examIds.length > 0
        ? supabase
            .from('examinations')
            .select('id, exam_name, name, exam_type, start_date, end_date, academic_year')
            .in('id', examIds)
            .eq('school_code', schoolCode)
        : Promise.resolve({ data: [] as ExamRow[], error: null }),
    ]);

    const subjectMap = new Map<string, { id: string; name: string; color: string | null }>();
    (subjectsRes.data || []).forEach((s) => subjectMap.set(s.id, { id: s.id, name: s.name, color: s.color ?? null }));
    const examMap = new Map<string, { id: string; exam_name: string; exam_type: string | null; start_date: string | null; end_date: string | null; academic_year: string | null }>();
    (examsRes.data || []).forEach((e: ExamRow) => {
      const examName = (e.exam_name ?? e.name ?? 'Examination').toString().trim() || 'Examination';
      examMap.set(e.id, {
        id: e.id,
        exam_name: examName,
        exam_type: e.exam_type ?? null,
        start_date: e.start_date ?? null,
        end_date: e.end_date ?? null,
        academic_year: e.academic_year ?? null,
      });
    });

    interface MarkData {
      id: string;
      marks_obtained: number;
      max_marks: number;
      percentage: number;
      grade: string | null;
      status: string | null;
      remarks: string | null;
      created_at: string;
      updated_at: string;
      subject: { id: string; name: string; color: string | null } | null;
      exam: { id: string; exam_name: string; exam_type: string | null; start_date: string | null; end_date: string | null; academic_year: string | null };
    }

    interface ExamGroup {
      exam_id: string;
      exam_name: string;
      exam_type: string | null;
      start_date: string | null;
      end_date: string | null;
      academic_year: string | null;
      subjects: Array<{
        id: string;
        subject_id: string;
        subject_name: string;
        subject_color: string | null;
        marks_obtained: number;
        max_marks: number;
        percentage: number;
        grade: string | null;
        status: string | null;
        remarks: string | null;
        created_at: string;
      }>;
      total_marks: number;
      total_max_marks: number;
      overall_percentage: number;
      overall_grade: string;
    }

    const examGroups: Record<string, ExamGroup> = {};

    function gradeFromPercentage(pct: number): string {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B';
      if (pct >= 60) return 'C';
      if (pct >= 50) return 'D';
      return 'E';
    }

    const typedMarks: MarkData[] = marks.map((mark) => {
      const subject = mark.subject_id ? subjectMap.get(mark.subject_id) ?? null : null;
      const exam = mark.exam_id ? examMap.get(mark.exam_id) : null;
      const maxM = Number(mark.max_marks) || 0;
      const obtained = Number(mark.marks_obtained) ?? 0;
      const percentage = maxM > 0 ? Math.round((obtained / maxM) * 100) : 0;
      const grade = gradeFromPercentage(percentage);
      return {
        id: mark.id,
        marks_obtained: obtained,
        max_marks: maxM,
        percentage,
        grade,
        status: null,
        remarks: mark.remarks ?? null,
        created_at: (mark as { created_at?: string }).created_at ?? '',
        updated_at: (mark as { updated_at?: string }).updated_at ?? '',
        subject,
        exam: exam ?? {
          id: mark.exam_id || '',
          exam_name: 'Unknown Exam',
          exam_type: null,
          start_date: null,
          end_date: null,
          academic_year: null,
        },
      };
    });

    typedMarks.forEach((mark) => {
      const examId = mark.exam.id;
      
      if (!examGroups[examId]) {
        examGroups[examId] = {
          exam_id: examId,
          exam_name: mark.exam.exam_name,
          exam_type: mark.exam.exam_type,
          start_date: mark.exam.start_date,
          end_date: mark.exam.end_date,
          academic_year: mark.exam.academic_year,
          subjects: [],
          total_marks: 0,
          total_max_marks: 0,
          overall_percentage: 0,
          overall_grade: '',
        };
      }

      examGroups[examId].subjects.push({
        id: mark.id,
        subject_id: mark.subject?.id || '',
        subject_name: mark.subject?.name || 'Unknown Subject',
        subject_color: mark.subject?.color || null,
        marks_obtained: mark.marks_obtained,
        max_marks: mark.max_marks,
        percentage: mark.percentage,
        grade: mark.grade,
        status: mark.status,
        remarks: mark.remarks ?? null,
        created_at: mark.created_at || '',
      });

      examGroups[examId].total_marks += mark.marks_obtained;
      examGroups[examId].total_max_marks += mark.max_marks;
    });

    // Calculate overall percentage and grade for each exam
    const formattedExams = Object.values(examGroups).map((exam) => {
      exam.overall_percentage = exam.total_max_marks > 0
        ? Math.round((exam.total_marks / exam.total_max_marks) * 100)
        : 0;

      // Calculate overall grade
      let overallGrade = 'N/A';
      if (exam.overall_percentage >= 90) {
        overallGrade = 'A+';
      } else if (exam.overall_percentage >= 80) {
        overallGrade = 'A';
      } else if (exam.overall_percentage >= 70) {
        overallGrade = 'B';
      } else if (exam.overall_percentage >= 60) {
        overallGrade = 'C';
      } else if (exam.overall_percentage >= 50) {
        overallGrade = 'D';
      } else {
        overallGrade = 'E';
      }
      exam.overall_grade = overallGrade;

      return exam;
    });

    // Sort by end_date (most recent first)
    formattedExams.sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date).getTime() : 0;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ data: formattedExams }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
