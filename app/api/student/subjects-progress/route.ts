import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/subjects-progress
 * Fetch subject progress for a student
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

    // Get student's class to fetch subjects
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('class, section, academic_year')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get class_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('class', studentData.class)
      .eq('section', studentData.section)
      .eq('academic_year', studentData.academic_year)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Get subjects for this class
    const { data: classSubjects, error: subjectsError } = await supabase
      .from('class_subjects')
      .select('subject_id, subject:subject_id(id, name, color)')
      .eq('class_id', classData.id)
      .eq('school_code', schoolCode);

    if (subjectsError || !classSubjects) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Get marks for each subject to calculate progress
    const { data: marks } = await supabase
      .from('student_subject_marks')
      .select('subject_id, marks_obtained, max_marks, percentage')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId);

    // Calculate progress for each subject
    interface ClassSubjectRaw {
      subject_id: string;
      subject?: {
        id: string;
        name?: string;
        color?: string;
      } | {
        id: string;
        name?: string;
        color?: string;
      }[] | null;
    }
    interface ClassSubject {
      subject_id: string;
      subject: {
        id: string;
        name?: string;
        color?: string;
      } | null;
    }
    // Type the classSubjects properly - handle Supabase returning arrays
    const typedClassSubjects: ClassSubject[] = classSubjects.map((cs: ClassSubjectRaw) => {
      const subject = Array.isArray(cs.subject) ? cs.subject[0] : cs.subject;
      return {
        subject_id: cs.subject_id,
        subject: subject ? {
          id: subject.id,
          name: subject.name,
          color: subject.color,
        } : null,
      };
    });
    const subjectsWithProgress = await Promise.all(
      typedClassSubjects.map(async (cs: ClassSubject) => {
        const subject = cs.subject;
        if (!subject) return null;

        const subjectMarks = marks?.filter(m => m.subject_id === subject.id) || [];
        const avgPercentage = subjectMarks.length > 0
          ? Math.round(subjectMarks.reduce((sum, m) => sum + (m.percentage || 0), 0) / subjectMarks.length)
          : 0;

        // Subject colors (default if not specified)
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const subjectIndex = typedClassSubjects.indexOf(cs);
        const defaultColor = colors[subjectIndex % colors.length];

        return {
          id: subject.id,
          name: subject.name || 'Subject',
          progress: Math.min(avgPercentage, 100), // Cap at 100%
          color: subject.color || defaultColor,
        };
      })
    );

    const validSubjects = subjectsWithProgress.filter(s => s !== null);

    return NextResponse.json({ data: validSubjects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subject progress:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
