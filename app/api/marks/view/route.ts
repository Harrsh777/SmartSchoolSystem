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
          full_name,
          admission_no,
          roll_number,
          class,
          section,
          photo_url
        ),
        exam:examinations!inner (
          id,
          exam_name,
          name,
          academic_year,
          start_date,
          end_date,
          class_id
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
      console.error('Error fetching summaries:', summaryError);
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: summaryError.message },
        { status: 500 }
      );
    }

    // Filter by class and section in memory (since they're in students table)
    let filteredSummaries = (summaries || []).filter((summary: any) => {
      const student = summary.student;
      if (!student) return false;

      if (classId) {
        // Match class_id from exam or class name from student
        const examClassId = summary.exam?.class_id;
        if (examClassId && examClassId !== classId) return false;
        // Also check student.class if available
        // Note: This is a simplified check - adjust based on your schema
      }

      if (section && student.section !== section) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (student.student_name || student.full_name || '').toLowerCase().includes(query);
        const matchesRoll = (student.roll_number || '').toLowerCase().includes(query);
        const matchesAdmission = (student.admission_no || '').toLowerCase().includes(query);
        if (!matchesName && !matchesRoll && !matchesAdmission) return false;
      }

      return true;
    });

    // If subject filter is applied, fetch detailed subject marks
    if (subjectId) {
      const studentIds = filteredSummaries.map((s: any) => s.student_id);
      const examIds = filteredSummaries.map((s: any) => s.exam_id);

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
        filteredSummaries = filteredSummaries.map((summary: any) => {
          const subjectMark = subjectMarks?.find(
            (m: any) => m.student_id === summary.student_id && m.exam_id === summary.exam_id
          );
          return {
            ...summary,
            subject_mark: subjectMark,
          };
        });
      }
    } else {
      // Fetch all subject marks for each student
      const studentIds = filteredSummaries.map((s: any) => s.student_id);
      const examIds = [...new Set(filteredSummaries.map((s: any) => s.exam_id))];

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
          filteredSummaries = filteredSummaries.map((summary: any) => {
            const studentMarks = allSubjectMarks.filter(
              (m: any) => m.student_id === summary.student_id && m.exam_id === summary.exam_id
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
      passed: filteredSummaries.filter((s: any) => (s.percentage || 0) >= 40).length,
      failed: filteredSummaries.filter((s: any) => (s.percentage || 0) < 40).length,
      average_percentage: filteredSummaries.length > 0
        ? filteredSummaries.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / filteredSummaries.length
        : 0,
      toppers: filteredSummaries
        .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
        .slice(0, 5)
        .map((s: any) => ({
          student_name: s.student?.student_name || s.student?.full_name || 'Unknown',
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
