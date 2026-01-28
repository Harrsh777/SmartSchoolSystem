import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/marks/view
 * Get marks with filters (Class, Section, Exam, Subject)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const section = searchParams.get('section');
    const subjectId = searchParams.get('subject_id');
    const studentId = searchParams.get('student_id');
    const searchQuery = searchParams.get('search'); // Student name or roll number

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Build query for student_exam_summary (aggregated marks per student per exam)
    let summaryQuery = supabase
      .from('student_exam_summary')
      .select(`
        *,
        student:students!inner (
          id,
          student_name,
          admission_no,
          roll_number,
          class,
          section,
          photo_url
        ),
        exam:examinations!inner (
          id,
          exam_name,
          academic_year,
          start_date,
          end_date,
          status
        )
      `)
      .eq('school_code', schoolCode);

    // Apply filters
    if (examId) {
      summaryQuery = summaryQuery.eq('exam_id', examId);
    }

    if (studentId) {
      summaryQuery = summaryQuery.eq('student_id', studentId);
    }

    // Fetch summaries
    const { data: summaries, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error('Error fetching summaries:', {
        code: summaryError.code,
        message: summaryError.message,
        details: summaryError.details,
        hint: summaryError.hint,
      });
      
      // If the error is about missing columns or tables, try fetching directly from student_subject_marks
      if (summaryError.code === 'PGRST204' || summaryError.message?.includes('does not exist') || summaryError.message?.includes('relation')) {
        console.warn('Summary table/column issue, trying to fetch from student_subject_marks directly');
        
        // Fallback: Fetch marks directly from student_subject_marks
        let marksQuery = supabase
          .from('student_subject_marks')
          .select(`
            *,
            student:students!inner (
              id,
              student_name,
              admission_no,
              roll_number,
              class,
              section,
              photo_url
            ),
            exam:examinations!inner (
              id,
              exam_name,
              academic_year,
              start_date,
              end_date,
              status
            ),
            subject:subjects (
              id,
              name,
              color
            )
          `)
          .eq('school_code', schoolCode);
        
        if (examId) {
          marksQuery = marksQuery.eq('exam_id', examId);
        }
        
        if (studentId) {
          marksQuery = marksQuery.eq('student_id', studentId);
        }
        
        const { data: marksData, error: marksError } = await marksQuery;
        
        if (marksError) {
          console.error('Error fetching marks directly:', marksError);
          return NextResponse.json({
            data: [],
            analytics: {
              total_students: 0,
              passed: 0,
              failed: 0,
              average_percentage: 0,
              toppers: [],
            },
          }, { status: 200 });
        }
        
        // Group marks by student and exam to create summary-like structure
        const groupedMarks: Record<string, Record<string, unknown>> = {};
        ((marksData || []) as Record<string, unknown>[]).forEach((mark: Record<string, unknown>) => {
          const key = `${mark.student_id}_${mark.exam_id}`;
          if (!groupedMarks[key]) {
            groupedMarks[key] = {
              student_id: mark.student_id,
              exam_id: mark.exam_id,
              student: mark.student,
              exam: mark.exam,
              subject_marks: [],
            };
          }
          (groupedMarks[key].subject_marks as Record<string, unknown>[]).push(mark);
        });
        
        const fallbackSummaries = Object.values(groupedMarks);
        
        // Apply filters
        const filteredSummaries = fallbackSummaries.filter((summary: Record<string, unknown>) => {
          const student = summary.student as Record<string, unknown> | undefined;
          if (!student) return false;
          
          if (classId && student.class !== classId) return false;
          if (section && student.section !== section) return false;
          
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const studentName = (student.student_name || '') as string;
            const rollNumber = (student.roll_number || '') as string;
            const admissionNo = (student.admission_no || '') as string;
            const matchesName = studentName.toLowerCase().includes(query);
            const matchesRoll = rollNumber.toLowerCase().includes(query);
            const matchesAdmission = admissionNo.toLowerCase().includes(query);
            if (!matchesName && !matchesRoll && !matchesAdmission) return false;
          }
          
          return true;
        });
        
        // Calculate analytics from marks
        const studentPercentages: Record<string, number> = {};
        
        filteredSummaries.forEach((summary: Record<string, unknown>) => {
          const marks = (summary.subject_marks || []) as Record<string, unknown>[];
          const studentTotal = marks.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.marks_obtained || 0), 0);
          const studentMax = marks.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.max_marks || 0), 0);
          const percentage = studentMax > 0 ? (studentTotal / studentMax) * 100 : 0;
          const studentId = String(summary.student_id || '');
          studentPercentages[studentId] = percentage;
        });
        
        const percentages = Object.values(studentPercentages);
        const passed = percentages.filter((p: number) => p >= 40).length;
        const failed = percentages.filter((p: number) => p < 40).length;
        const averagePercentage = percentages.length > 0 
          ? percentages.reduce((sum: number, p: number) => sum + p, 0) / percentages.length 
          : 0;
        
        const toppers = filteredSummaries
          .map((summary: Record<string, unknown>) => {
            const studentId = String(summary.student_id || '');
            return {
              summary,
              percentage: studentPercentages[studentId] || 0,
            };
          })
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5)
          .map((item: { summary: Record<string, unknown>; percentage: number }) => {
            const student = item.summary.student as Record<string, unknown> | undefined;
            const studentName = (student?.student_name || 'Unknown') as string;
            return {
              student_name: studentName,
              percentage: item.percentage,
              grade: 'N/A', // Grade calculation would need to be added
            };
          });
        
        const analytics = {
          total_students: filteredSummaries.length,
          passed,
          failed,
          average_percentage: averagePercentage,
          toppers,
        };
        
        return NextResponse.json({
          data: filteredSummaries,
          analytics,
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: summaryError.message },
        { status: 500 }
      );
    }

    interface SummaryItem {
      student_id: string;
      exam_id: string;
      student?: {
        class?: string;
        section?: string;
        student_name?: string;
        roll_number?: string;
        admission_no?: string;
      };
      exam?: {
        class_id?: string;
      };
      percentage?: number;
      [key: string]: unknown;
    }

    interface SubjectMark {
      student_id: string;
      exam_id: string;
      subject_id?: string;
      marks_obtained?: number;
      max_marks?: number;
      subject?: {
        id: string;
        name: string;
        color?: string;
      };
      [key: string]: unknown;
    }

    // Filter by class and section in memory (since they're in students table)
    let filteredSummaries = (summaries || []).filter((summary: SummaryItem) => {
      const student = summary.student;
      if (!student) return false;

      if (classId) {
        // Check student.class if available (class_id doesn't exist in new exam structure)
        // The new structure uses exam_class_mappings instead
        if (student.class && student.class !== classId) {
          // If classId is a UUID, we need to check differently
          // For now, just check the student's class name
          return false;
        }
      }

      if (section && student.section !== section) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (student.student_name || '').toLowerCase().includes(query);
        const matchesRoll = (student.roll_number || '').toLowerCase().includes(query);
        const matchesAdmission = (student.admission_no || '').toLowerCase().includes(query);
        if (!matchesName && !matchesRoll && !matchesAdmission) return false;
      }

      return true;
    });

    // If subject filter is applied, fetch detailed subject marks
    if (subjectId) {
      const studentIds = filteredSummaries.map((s) => s.student_id);
      const examIds = filteredSummaries.map((s) => s.exam_id);

      const { data: subjectMarks, error: marksError } = await supabase
        .from('student_subject_marks')
        .select(`
          *,
          subject:subjects (
            id,
            name,
            color
          )
        `)
        .eq('subject_id', subjectId)
        .in('student_id', studentIds)
        .in('exam_id', examIds);

      if (marksError) {
        console.error('Error fetching subject marks:', marksError);
      } else {
        // Merge subject marks into summaries
        filteredSummaries = filteredSummaries.map((summary: SummaryItem) => {
          const subjectMark = subjectMarks?.find(
            (m: SubjectMark) => m.student_id === summary.student_id && m.exam_id === summary.exam_id
          );
          return {
            ...summary,
            subject_mark: subjectMark,
          };
        });
      }
    } else {
      // Fetch all subject marks for each student
      const studentIds = filteredSummaries.map((s) => s.student_id);
      const examIds = [...new Set(filteredSummaries.map((s) => s.exam_id))];

      if (studentIds.length > 0 && examIds.length > 0) {
        const { data: allSubjectMarks, error: marksError } = await supabase
          .from('student_subject_marks')
          .select(`
            *,
            subject:subjects (
              id,
              name,
              color
            )
          `)
          .in('student_id', studentIds)
          .in('exam_id', examIds);

        if (!marksError && allSubjectMarks) {
          // Group marks by student and exam
          filteredSummaries = filteredSummaries.map((summary: SummaryItem) => {
            const studentMarks = allSubjectMarks.filter(
              (m: SubjectMark) => m.student_id === summary.student_id && m.exam_id === summary.exam_id
            );
            return {
              ...summary,
              subject_marks: studentMarks,
            };
          });
        }
      }
    }

    // Calculate analytics
    const analytics = {
      total_students: filteredSummaries.length,
      passed: filteredSummaries.filter((s) => (s.percentage || 0) >= 40).length,
      failed: filteredSummaries.filter((s) => (s.percentage || 0) < 40).length,
      average_percentage: filteredSummaries.length > 0
        ? filteredSummaries.reduce((sum, s) => sum + (s.percentage || 0), 0) / filteredSummaries.length
        : 0,
      toppers: filteredSummaries
        .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
        .slice(0, 5)
        .map((s) => ({
          student_name: s.student?.student_name || 'Unknown',
          percentage: s.percentage || 0,
          grade: s.grade || 'N/A',
        })),
    };

    return NextResponse.json({
      data: filteredSummaries,
      analytics,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/marks/view:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
