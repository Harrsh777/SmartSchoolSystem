import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/marks
 * Fetch all marks for a specific student, grouped by examinations and subjects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Fetch all marks for this student with exam and subject details
    const { data: marks, error: marksError } = await supabase
      .from('student_subject_marks')
      .select(`
        id,
        marks_obtained,
        max_marks,
        percentage,
        grade,
        status,
        remarks,
        created_at,
        updated_at,
        subject:subject_id(
          id,
          name,
          color
        ),
        examinations!inner(
          id,
          exam_name,
          exam_type,
          start_date,
          end_date,
          academic_year
        )
      `)
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('marks_obtained', 'is', null)
      .order('created_at', { ascending: false });

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

    // Group marks by examination
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
      subject: {
        id: string;
        name: string;
        color: string | null;
      } | null;
      examinations: {
        id: string;
        exam_name: string;
        exam_type: string | null;
        start_date: string | null;
        end_date: string | null;
        academic_year: string | null;
      };
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

    // Type the marks data properly - Supabase may return subject and examinations as arrays
    const typedMarks = marks.map((mark): MarkData => {
      const subject = Array.isArray(mark.subject) ? mark.subject[0] : mark.subject;
      const examination = Array.isArray(mark.examinations) ? mark.examinations[0] : mark.examinations;
      return {
        id: mark.id,
        marks_obtained: mark.marks_obtained,
        max_marks: mark.max_marks,
        percentage: mark.percentage,
        grade: mark.grade,
        status: mark.status,
        remarks: mark.remarks,
        created_at: mark.created_at,
        updated_at: mark.updated_at,
        subject: subject ? {
          id: subject.id,
          name: subject.name,
          color: subject.color ?? null,
        } : null,
        examinations: examination ? {
          id: examination.id,
          exam_name: examination.exam_name,
          exam_type: examination.exam_type ?? null,
          start_date: examination.start_date ?? null,
          end_date: examination.end_date ?? null,
          academic_year: examination.academic_year ?? null,
        } : {
          id: '',
          exam_name: 'Unknown Exam',
          exam_type: null,
          start_date: null,
          end_date: null,
          academic_year: null,
        },
      };
    });

    typedMarks.forEach((mark) => {
      const examId = mark.examinations.id;
      
      if (!examGroups[examId]) {
        examGroups[examId] = {
          exam_id: examId,
          exam_name: mark.examinations.exam_name,
          exam_type: mark.examinations.exam_type,
          start_date: mark.examinations.start_date,
          end_date: mark.examinations.end_date,
          academic_year: mark.examinations.academic_year,
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
        remarks: mark.remarks,
        created_at: mark.created_at,
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
