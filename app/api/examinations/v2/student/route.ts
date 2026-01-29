import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/examinations/v2/student
 * Get examinations for a student (based on their class)
 * Query params: school_code, student_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'School code and student ID are required' },
        { status: 400 }
      );
    }

    // Get student's class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class, section')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get class ID
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('class', student.class)
      .eq('section', student.section)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Get examinations that have this class mapped
    const { data: classMappings, error: mappingError } = await supabase
      .from('exam_class_mappings')
      .select('exam_id')
      .eq('class_id', classData.id)
      .eq('school_code', schoolCode);

    if (mappingError) {
      console.error('Error fetching exam class mappings:', mappingError);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: mappingError.message },
        { status: 500 }
      );
    }

    const examIds = classMappings?.map(cm => cm.exam_id) || [];
    
    if (examIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Fetch examinations with all related data
    const { data: examinations, error: examError } = await supabase
      .from('examinations')
      .select(`
        *,
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings (
          subject_id,
          class_id,
          subject:subjects (
            id,
            name
          ),
          max_marks,
          pass_marks
        ),
        schedules:exam_schedules (
          id,
          exam_date,
          start_time,
          end_time,
          subject
        )
      `)
      .in('id', examIds)
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: true });

    if (examError) {
      console.error('Error fetching examinations:', examError);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: examError.message },
        { status: 500 }
      );
    }

    const classId = classData.id;

    // Filter subject_mappings to this student's class only and collect subject IDs for teachers
    const allSubjectIds = new Set<string>();
    const examsWithClassSubjects = (examinations || []).map((exam: Record<string, unknown>) => {
      const mappings = (exam.subject_mappings as Array<Record<string, unknown>>) || [];
      const forClass = mappings.filter((m) => m.class_id === classId);
      forClass.forEach((m) => {
        if (m.subject_id) allSubjectIds.add(m.subject_id as string);
      });
      return { ...exam, subject_mappings: forClass };
    });

    // Fetch subject teachers (staff_subjects) for these subjects
    const teacherBySubject = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const { data: staffSubs, error: staffSubsError } = await supabase
        .from('staff_subjects')
        .select(`
          subject_id,
          staff:staff_id ( full_name )
        `)
        .eq('school_code', schoolCode)
        .in('subject_id', Array.from(allSubjectIds));

      if (!staffSubsError && staffSubs) {
        staffSubs.forEach((row: Record<string, unknown>) => {
          const sid = row.subject_id as string;
          if (sid && !teacherBySubject.has(sid)) {
            const staff = row.staff;
            const name = Array.isArray(staff) ? (staff[0] as Record<string, unknown>)?.full_name : (staff as Record<string, unknown>)?.full_name;
            if (name) teacherBySubject.set(sid, String(name));
          }
        });
      }
    }

    // Attach teacher and totals to each exam's subject_mappings
    const result = examsWithClassSubjects.map((exam: Record<string, unknown>) => {
      const mappings = ((exam.subject_mappings as Array<Record<string, unknown>>) || []).map((m) => {
        const subjectId = m.subject_id as string;
        const subject = m.subject as Record<string, unknown> | undefined;
        const name = subject && !Array.isArray(subject) && subject.name != null ? String(subject.name) : '—';
        return {
          ...m,
          subject_name: name,
          teacher_name: teacherBySubject.get(subjectId) ?? '—',
          max_marks: m.max_marks ?? null,
          pass_marks: m.pass_marks ?? null,
        };
      });
      const totalMax = mappings.reduce((sum, m) => sum + (Number(m.max_marks) || 0), 0);
      const totalPass = mappings.reduce((sum, m) => sum + (Number(m.pass_marks) || 0), 0);
      return {
        ...exam,
        subject_mappings: mappings,
        total_max_marks: totalMax,
        total_pass_marks: totalPass,
      };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
