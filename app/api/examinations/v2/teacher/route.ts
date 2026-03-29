import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchTeachingByClass,
  staffTeachesSubject,
  teachingMapToRecord,
} from '@/lib/teacher-timetable-teaching';

/**
 * GET /api/examinations/v2/teacher
 * school_code (required). teacher_id optional:
 * - Without teacher_id: all published exams (calendar / admin).
 * - With teacher_id: only exams that include at least one subject the teacher teaches
 *   for that class on the timetable; subject_mappings are trimmed to those subjects only.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch all examinations for the school (all staff can view all exams date-wise)
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

    // Show all non-draft examinations (upcoming, ongoing, completed, active)
    let filteredExams = (examinations || []).filter((exam: Record<string, unknown>) => {
      const status = exam.status as string;
      const isPublishedOrActive = exam.status === 'active' || exam.is_published === true
        || (status !== 'draft' && (status === 'upcoming' || status === 'ongoing' || status === 'completed'));
      return isPublishedOrActive;
    });

    let subject_ids_by_class: Record<string, string[]> = {};
    let teacher_scope: 'all' | 'timetable' | 'timetable_empty' = 'all';
    let teaching_assignments: Array<{
      class_id: string;
      class_name: string;
      section: string;
      subject_ids: string[];
    }> = [];

    if (teacherId) {
      const teaching = await fetchTeachingByClass(supabase, schoolCode, teacherId);
      subject_ids_by_class = { ...teachingMapToRecord(teaching) };
      teacher_scope = teaching.size > 0 ? 'timetable' : 'timetable_empty';

      const classIdList = Array.from(teaching.keys());
      if (classIdList.length > 0) {
        const { data: classRows } = await supabase
          .from('classes')
          .select('id, class, section')
          .eq('school_code', schoolCode)
          .in('id', classIdList);
        const byId = new Map((classRows || []).map((c) => [c.id, c]));
        teaching_assignments = classIdList.map((cid) => {
          const row = byId.get(cid);
          return {
            class_id: cid,
            class_name: row?.class ?? '',
            section: row?.section ?? '',
            subject_ids: Array.from(teaching.get(cid) || []),
          };
        });
      }

      filteredExams = filteredExams
        .map((exam: Record<string, unknown>) => {
          const mappings = ((exam.subject_mappings as Array<Record<string, unknown>>) || []).filter((m) => {
            const cid = String(m.class_id ?? '');
            const sid = String(m.subject_id ?? '');
            return staffTeachesSubject(teaching, cid, sid);
          });
          return { ...exam, subject_mappings: mappings };
        })
        .filter((exam: Record<string, unknown>) => {
          const mappings = (exam.subject_mappings as Array<Record<string, unknown>>) || [];
          return mappings.length > 0;
        });
    }

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

    return NextResponse.json(
      {
        data: enrichedExams,
        teacher_scope,
        subject_ids_by_class,
        teaching_assignments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching teacher examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
