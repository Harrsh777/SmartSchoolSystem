import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/student/recent-performance
 * Fetch recent exam performance for a student (same data source as /api/student/marks, limited and summarized).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const limit = parseInt(searchParams.get('limit') || '3');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: marks, error: marksError } = await supabase
      .from('student_subject_marks')
      .select('id, marks_obtained, max_marks, percentage, grade, subject_id, exam_id, created_at')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('marks_obtained', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 10);

    if (marksError || !marks || marks.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const subjectIds = [...new Set(marks.map((m) => m.subject_id).filter(Boolean))] as string[];
    const examIds = [...new Set(marks.map((m) => m.exam_id).filter(Boolean))] as string[];

    type ExamRow = { id: string; exam_name?: string | null; name?: string | null; title?: string | null; exam_type?: string | null; end_date?: string | null };
    const [subjectsRes, examsRes] = await Promise.all([
      subjectIds.length > 0
        ? supabase.from('subjects').select('id, name').in('id', subjectIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
      examIds.length > 0
        ? supabase
            .from('examinations')
            .select('id, exam_name, name, exam_type, end_date')
            .in('id', examIds)
        : Promise.resolve({ data: [] as ExamRow[], error: null }),
    ]);

    const subjectMap = new Map<string, string>();
    (subjectsRes.data || []).forEach((s) => subjectMap.set(s.id, s.name || 'Subject'));
    const examMap = new Map<string, { exam_name: string; exam_type: string | null; end_date: string | null }>();
    (examsRes.data || []).forEach((e: ExamRow) => {
      const examName = (e.exam_name ?? e.name ?? e.title ?? 'Examination').toString().trim() || 'Examination';
      examMap.set(e.id, {
        exam_name: examName,
        exam_type: e.exam_type ?? null,
        end_date: e.end_date ?? null,
      });
    });

    const examGroups: Record<
      string,
      {
        exam_id: string;
        exam_name: string;
        exam_type: string | null;
        end_date: string | null;
        subjects: Array<{ marks_obtained: number; max_marks: number; percentage: number | null }>;
      }
    > = {};

    marks.forEach((mark) => {
      const examId = mark.exam_id || '';
      if (!examId) return;
      const exam = examMap.get(examId) ?? { exam_name: 'Unknown Exam', exam_type: null, end_date: null };
      if (!examGroups[examId]) {
        examGroups[examId] = {
          exam_id: examId,
          exam_name: exam.exam_name,
          exam_type: exam.exam_type,
          end_date: exam.end_date,
          subjects: [],
        };
      }
      const maxM = Number(mark.max_marks) || 0;
      const obtained = Number(mark.marks_obtained) ?? 0;
      const pct = mark.percentage != null ? Number(mark.percentage) : maxM > 0 ? (obtained / maxM) * 100 : 0;
      examGroups[examId].subjects.push({
        marks_obtained: obtained,
        max_marks: maxM,
        percentage: Math.round(pct),
      });
    });

    function gradeFromPercentage(pct: number): string {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B';
      if (pct >= 60) return 'C';
      if (pct >= 50) return 'D';
      return 'E';
    }

    function gradeColor(grade: string): string {
      if (grade === 'A+' || grade === 'A') return 'bg-emerald-100 text-emerald-700';
      if (grade === 'B') return 'bg-blue-100 text-blue-700';
      if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
      if (grade === 'D') return 'bg-orange-100 text-orange-700';
      return 'bg-red-100 text-red-700';
    }

    const performances = Object.values(examGroups)
      .map((group) => {
        const totalObtained = group.subjects.reduce((s, x) => s + x.marks_obtained, 0);
        const totalMax = group.subjects.reduce((s, x) => s + x.max_marks, 0);
        const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
        const grade = gradeFromPercentage(percentage);
        const marksInExam = marks.filter((m) => m.exam_id === group.exam_id);
        const subjectNames = marksInExam
          .map((m) => (m.subject_id ? subjectMap.get(m.subject_id) : null))
          .filter(Boolean) as string[];
        const subjectNameStr = [...new Set(subjectNames)].slice(0, 5).join(', ') || 'All Subjects';

        return {
          id: group.exam_id,
          subject: subjectNameStr,
          type: group.exam_type || 'Exam',
          date: group.end_date ? new Date(group.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
          end_date: group.end_date || '',
          grade,
          grade_color: gradeColor(grade),
          percentage,
          marks_display: totalMax > 0 ? `${totalObtained}/${totalMax}` : `${percentage}%`,
        };
      })
      .sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime())
      .slice(0, limit);

    return NextResponse.json({ data: performances }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent performance:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
