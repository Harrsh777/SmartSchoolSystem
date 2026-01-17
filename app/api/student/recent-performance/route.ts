import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/recent-performance
 * Fetch recent exam performance for a student
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

    // Get recent marks with exam and subject details
    const { data: marks, error: marksError } = await supabase
      .from('student_subject_marks')
      .select(`
        id,
        marks_obtained,
        max_marks,
        percentage,
        grade,
        created_at,
        subject:subject_id(id, name),
        examinations!inner(
          id,
          exam_name,
          end_date,
          exam_type
        )
      `)
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('marks_obtained', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 3); // Get more to aggregate by exam

    if (marksError || !marks) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Group by exam and calculate average
    interface ExamData {
      id: string;
      exam_name?: string;
      end_date?: string;
      exam_type?: string;
    }
    interface SubjectMark {
      id: string;
      marks_obtained?: number | null;
      max_marks?: number | null;
      percentage?: number | null;
      grade?: string | null;
      created_at?: string;
      subject?: {
        id: string;
        name?: string;
      } | null;
      examinations?: ExamData | null;
    }
    interface ExamPerformance {
      [key: string]: {
        exam: ExamData;
        subjects: SubjectMark[];
        avgPercentage: number;
        avgGrade: string;
      };
    }

    const examGroups: ExamPerformance = {};
    // Type the marks data properly - handle Supabase returning arrays for relations
    const typedMarks: SubjectMark[] = marks.map((mark) => {
      const examination = Array.isArray(mark.examinations) ? mark.examinations[0] : mark.examinations;
      const subject = Array.isArray(mark.subject) ? mark.subject[0] : mark.subject;
      
      return {
        id: mark.id,
        marks_obtained: mark.marks_obtained ?? null,
        max_marks: mark.max_marks ?? null,
        percentage: mark.percentage ?? null,
        grade: mark.grade ?? null,
        created_at: mark.created_at,
        subject: subject ? {
          id: subject.id,
          name: subject.name,
        } : null,
        examinations: examination ? {
          id: examination.id,
          exam_name: examination.exam_name,
          end_date: examination.end_date,
          exam_type: examination.exam_type,
        } : null,
      };
    });

    typedMarks.forEach((mark) => {
      const examId = mark.examinations?.id;
      if (!examId) return;

      if (!examGroups[examId]) {
        examGroups[examId] = {
          exam: mark.examinations ? {
            id: mark.examinations.id,
            exam_name: mark.examinations.exam_name,
            end_date: mark.examinations.end_date,
            exam_type: mark.examinations.exam_type,
          } : {
            id: '',
            exam_name: 'Unknown Exam',
            end_date: undefined,
            exam_type: undefined,
          },
          subjects: [],
          avgPercentage: 0,
          avgGrade: '',
        };
      }
      examGroups[examId].subjects.push(mark);
    });

    // Calculate averages and format
    const performances = Object.values(examGroups)
      .map(group => {
        const totalPercentage = group.subjects.reduce((sum, s) => sum + (s.percentage || 0), 0);
        const avgPercentage = Math.round(totalPercentage / group.subjects.length);
        
        // Get grade from percentage
        let grade = 'N/A';
        let gradeColor = 'bg-gray-100 text-gray-700';
        if (avgPercentage >= 90) {
          grade = 'A+';
          gradeColor = 'bg-emerald-100 text-emerald-700';
        } else if (avgPercentage >= 80) {
          grade = 'A';
          gradeColor = 'bg-emerald-100 text-emerald-700';
        } else if (avgPercentage >= 70) {
          grade = 'B';
          gradeColor = 'bg-blue-100 text-blue-700';
        } else if (avgPercentage >= 60) {
          grade = 'C';
          gradeColor = 'bg-yellow-100 text-yellow-700';
        } else if (avgPercentage >= 50) {
          grade = 'D';
          gradeColor = 'bg-orange-100 text-orange-700';
        } else {
          grade = 'E';
          gradeColor = 'bg-red-100 text-red-700';
        }

        const examType = group.exam.exam_type || 'Exam';
        const subjectNames = group.subjects.map(s => s.subject?.name || 'Subject').join(', ');

        return {
          id: group.exam.id,
          subject: subjectNames || 'All Subjects',
          type: examType,
          date: group.exam.end_date ? new Date(group.exam.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
          grade: grade,
          grade_color: gradeColor,
        };
      })
      .slice(0, limit)
      .sort((a, b) => {
        // Sort by date descending
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    return NextResponse.json({ data: performances }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent performance:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
