import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/examinations/v2/teacher
 * Get examinations for a teacher (class teacher OR subject teacher from timetable).
 * Query params: school_code, teacher_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');

    if (!schoolCode || !teacherId) {
      return NextResponse.json(
        { error: 'School code and teacher ID are required' },
        { status: 400 }
      );
    }

    const staffId = searchParams.get('staff_id');

    // 1) Class teacher: classes where class_teacher_id or class_teacher_staff_id
    let query = supabase
      .from('classes')
      .select('id, class, section')
      .eq('school_code', schoolCode);

    const conditions: string[] = [];
    if (teacherId) conditions.push(`class_teacher_id.eq.${teacherId}`);
    if (staffId) conditions.push(`class_teacher_staff_id.eq.${staffId}`);
    if (conditions.length === 0) {
      return NextResponse.json(
        { error: 'Either teacher_id or staff_id is required' },
        { status: 400 }
      );
    }
    query = query.or(conditions.join(','));

    const { data: teacherClasses, error: classError } = await query;

    if (classError) {
      console.error('Error fetching teacher classes:', classError);
      return NextResponse.json(
        { error: 'Failed to fetch teacher classes', details: classError.message },
        { status: 500 }
      );
    }

    let classIds: string[] = teacherClasses?.map(c => c.id) ?? [];
    let teacherScope: 'class_teacher' | 'subject_teacher' = 'class_teacher';
    const subjectIdsByClass: Record<string, string[]> = {};

    // 2) If not class teacher, derive from timetable (subject teacher)
    if (!classIds.length) {
      const { data: slots, error: slotsError } = await supabase
        .from('timetable_slots')
        .select('class_id, subject_id, teacher_id, teacher_ids')
        .eq('school_code', schoolCode)
        .not('class_id', 'is', null)
        .not('subject_id', 'is', null);

      if (slotsError || !slots?.length) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }

      const slotsWithTeacher = (slots as Array<{ class_id: string; subject_id: string; teacher_id?: string; teacher_ids?: string[] }>).filter(
        (s) => s.teacher_id === teacherId || (Array.isArray(s.teacher_ids) && s.teacher_ids.includes(teacherId))
      );
      if (!slotsWithTeacher.length) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }

      const classIdSet = new Set<string>();
      for (const s of slotsWithTeacher) {
        if (s.class_id && s.subject_id) {
          classIdSet.add(s.class_id);
          const list = subjectIdsByClass[s.class_id] ?? [];
          if (!list.includes(s.subject_id)) list.push(s.subject_id);
          subjectIdsByClass[s.class_id] = list;
        }
      }
      classIds = Array.from(classIdSet);
      teacherScope = 'subject_teacher';
    }

    if (classIds.length === 0) {
      return NextResponse.json({ data: [], teacher_scope: teacherScope }, { status: 200 });
    }

    // Get examinations that have these classes mapped
    const { data: classMappings, error: mappingError } = await supabase
      .from('exam_class_mappings')
      .select(`
        exam_id,
        class_id,
        exam:examinations (
          id,
          exam_name,
          academic_year,
          start_date,
          end_date,
          status,
          description
        )
      `)
      .in('class_id', classIds)
      .eq('school_code', schoolCode);

    if (mappingError) {
      console.error('Error fetching exam class mappings:', mappingError);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: mappingError.message },
        { status: 500 }
      );
    }

    // Get unique exams and enrich with subject mappings
    const examIds = [...new Set(classMappings?.map(cm => cm.exam_id) || [])];
    
    if (examIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const examQuery = supabase
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
          class_id,
          subject_id,
          subject:subjects (
            id,
            name
          ),
          max_marks,
          pass_marks
        )
      `)
      .in('id', examIds)
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: true });

    const { data: examinations, error: examError } = await examQuery;

    if (examError) {
      console.error('Error fetching examinations:', examError);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: examError.message },
        { status: 500 }
      );
    }

    // Filter to only show exams for teacher's classes and only published/active (allowed for marks entry)
    const filteredExams = examinations?.filter(exam => {
      const examClassIds = exam.class_mappings?.map((cm: Record<string, unknown>) => cm.class_id as string) || [];
      const isForTeacherClass = examClassIds.some((examClassId: string) => classIds.includes(examClassId));
      const isPublishedOrActive = exam.status === 'active' || exam.is_published === true
        || (exam.status !== 'draft' && (exam.status === 'upcoming' || exam.status === 'ongoing' || exam.status === 'completed'));
      return isForTeacherClass && isPublishedOrActive;
    }) || [];

    // Collect all subject IDs from subject_mappings to fetch teacher names
    const allSubjectIds = new Set<string>();
    filteredExams.forEach((exam: Record<string, unknown>) => {
      const mappings = (exam.subject_mappings as Array<Record<string, unknown>>) || [];
      mappings.forEach((m) => { if (m.subject_id) allSubjectIds.add(m.subject_id as string); });
    });

    // Fetch subject teachers (staff_subjects) for display
    const teacherBySubject = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const { data: staffSubs } = await supabase
        .from('staff_subjects')
        .select('subject_id, staff:staff_id ( full_name )')
        .eq('school_code', schoolCode)
        .in('subject_id', Array.from(allSubjectIds));
      (staffSubs || []).forEach((row: Record<string, unknown>) => {
        const sid = row.subject_id as string;
        if (sid && !teacherBySubject.has(sid)) {
          const staff = row.staff;
          const name = Array.isArray(staff) ? (staff[0] as Record<string, unknown>)?.full_name : (staff as Record<string, unknown>)?.full_name;
          if (name) teacherBySubject.set(sid, String(name));
        }
      });
    }

    // Enrich each exam's subject_mappings with subject_name, teacher_name, and add totals
    const enrichedExams = filteredExams.map((exam: Record<string, unknown>) => {
      const mappings = ((exam.subject_mappings as Array<Record<string, unknown>>) || []).map((m) => {
        const subject = m.subject as Record<string, unknown> | undefined;
        const subjectName = subject && !Array.isArray(subject) && subject.name != null ? String(subject.name) : '—';
        return {
          ...m,
          subject_name: subjectName,
          teacher_name: teacherBySubject.get(m.subject_id as string) ?? '—',
          max_marks: m.max_marks ?? null,
          pass_marks: m.pass_marks ?? null,
        };
      });
      const total_max_marks = mappings.reduce((sum, m) => sum + (Number(m.max_marks) || 0), 0);
      const total_pass_marks = mappings.reduce((sum, m) => sum + (Number(m.pass_marks) || 0), 0);
      return {
        ...exam,
        subject_mappings: mappings,
        total_max_marks,
        total_pass_marks,
      };
    });

    const payload = teacherScope === 'subject_teacher'
      ? { data: enrichedExams, teacher_scope: 'subject_teacher', subject_ids_by_class: subjectIdsByClass }
      : { data: enrichedExams, teacher_scope: 'class_teacher' };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
