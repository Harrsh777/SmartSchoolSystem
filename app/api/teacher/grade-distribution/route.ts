import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGradeFromPercentage } from '@/lib/grade-calculator';

// GET - Fetch grade distribution for a teacher's classes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');
    const classId = searchParams.get('class_id'); // Optional: filter by specific class

    if (!schoolCode || !teacherId) {
      return NextResponse.json(
        { error: 'school_code and teacher_id are required' },
        { status: 400 }
      );
    }

    // Get classes assigned to this teacher
    let classQuery = supabase
      .from('classes')
      .select('id')
      .eq('school_code', schoolCode)
      .or(`class_teacher_id.eq.${teacherId},class_teacher_staff_id.eq.${teacherId}`);

    if (classId) {
      classQuery = classQuery.eq('id', classId);
    }

    const { data: classes, error: classError } = await classQuery;

    if (classError || !classes || classes.length === 0) {
      return NextResponse.json(
        { data: { aToB: 0, cToD: 0, belowE: 0, passRate: 0, total: 0 } },
        { status: 200 }
      );
    }

    const classIds = classes.map(c => c.id);

    // Get all marks for students in these classes
    // We'll use exam_summaries table if available, otherwise calculate from student_subject_marks
    const { data: examSummaries, error: summaryError } = await supabase
      .from('exam_summaries')
      .select('grade, passing_status, class_id')
      .in('class_id', classIds)
      .eq('school_code', schoolCode);

    if (summaryError) {
      console.warn('Could not fetch from exam_summaries, calculating from marks:', summaryError.message);
    }

    // Calculate grade distribution
    let aToB = 0;
    let cToD = 0;
    let belowE = 0;
    let passed = 0;
    let total = 0;

    if (examSummaries && examSummaries.length > 0) {
      examSummaries.forEach((summary: { grade?: string; passing_status?: string }) => {
        const grade = summary.grade?.toUpperCase() || '';
        const isPassed = summary.passing_status === 'passed';

        if (isPassed) passed++;
        total++;

        if (grade === 'A+' || grade === 'A' || grade === 'A-' || grade === 'B+' || grade === 'B' || grade === 'B-') {
          aToB++;
        } else if (grade === 'C+' || grade === 'C' || grade === 'C-' || grade === 'D+' || grade === 'D' || grade === 'D-') {
          cToD++;
        } else {
          belowE++;
        }
      });
    } else {
      // Fallback: Calculate from student_subject_marks
      const { data: marks, error: marksError } = await supabase
        .from('student_subject_marks')
        .select('grade, percentage, passing_status, class_id')
        .in('class_id', classIds)
        .eq('school_code', schoolCode);

      if (!marksError && marks) {
        // Group by student and calculate average grade
        const studentGrades: Record<string, { grades: string[]; percentages: number[]; passed: boolean }> = {};

        marks.forEach((mark: { grade?: string; percentage?: number; passing_status?: string; class_id: string }) => {
          const grade = mark.grade?.toUpperCase() || '';
          const percentage = mark.percentage || 0;
          // Use a composite key for student (we'd need student_id for better grouping)
          const key = mark.class_id;

          if (!studentGrades[key]) {
            studentGrades[key] = { grades: [], percentages: [], passed: true };
          }
          studentGrades[key].grades.push(grade);
          studentGrades[key].percentages.push(percentage);
          if (mark.passing_status !== 'passed') {
            studentGrades[key].passed = false;
          }
        });

        // Calculate distribution
        Object.values(studentGrades).forEach((student) => {
          const avgPercentage = student.percentages.reduce((a, b) => a + b, 0) / student.percentages.length;
          const avgGrade = getGradeFromPercentage(avgPercentage);

          if (student.passed) passed++;
          total++;

          if (avgGrade === 'A+' || avgGrade === 'A' || avgGrade === 'A-' || avgGrade === 'B+' || avgGrade === 'B' || avgGrade === 'B-') {
            aToB++;
          } else if (avgGrade === 'C+' || avgGrade === 'C' || avgGrade === 'C-' || avgGrade === 'D+' || avgGrade === 'D' || avgGrade === 'D-') {
            cToD++;
          } else {
            belowE++;
          }
        });
      }
    }

    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const aToBPercent = total > 0 ? Math.round((aToB / total) * 100) : 0;
    const cToDPercent = total > 0 ? Math.round((cToD / total) * 100) : 0;
    const belowEPercent = total > 0 ? Math.round((belowE / total) * 100) : 0;

    return NextResponse.json({
      data: {
        aToB: aToBPercent,
        cToD: cToDPercent,
        belowE: belowEPercent,
        passRate,
        total,
        passed,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching grade distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
