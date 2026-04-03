import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function normToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYearFilter = searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    let classesQuery = supabase
      .from('classes')
      .select('id, class, section, academic_year, class_teacher_id')
      .eq('school_code', schoolCode);

    if (academicYearFilter) {
      classesQuery = classesQuery.eq('academic_year', academicYearFilter);
    }

    const { data: classesRaw, error: classesError } = await classesQuery
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('academic_year', { ascending: false });

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classesError.message },
        { status: 500 }
      );
    }

    let classes: typeof classesRaw = classesRaw || [];
    if (!academicYearFilter && classes.length > 0) {
      const seen = new Set<string>();
      classes = classes.filter((cls) => {
        const key = `${normToken(cls.class)}-${normToken(cls.section)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const academicYearStart =
      currentMonth >= 3
        ? new Date(currentYear, 3, 1)
        : new Date(currentYear - 1, 3, 1);

    const classIds = classes.map((c) => c.id);
    if (classIds.length === 0) {
      return NextResponse.json({
        data: [],
        totals: {
          old_admissions: 0,
          new_admissions: 0,
          active_students: 0,
          deactivated_students: 0,
          total_students: 0,
        },
      });
    }

    const teacherIds = [
      ...new Set(
        classes
          .map((c) => c.class_teacher_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [teachersRes, slotsRes, classSubjectsRes, studentsRes] =
      await Promise.all([
        teacherIds.length
          ? supabase
              .from('staff')
              .select('id, full_name, staff_id')
              .in('id', teacherIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string; staff_id: string }[], error: null }),
        supabase
          .from('timetable_slots')
          .select('class_id, subject_id')
          .eq('school_code', schoolCode)
          .in('class_id', classIds),
        supabase
          .from('class_subjects')
          .select('class_id, subject_id')
          .eq('school_code', schoolCode)
          .in('class_id', classIds),
        supabase
          .from('students')
          .select('id, created_at, status, academic_year, class, section')
          .eq('school_code', schoolCode),
      ]);

    if (teachersRes.error) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: teachersRes.error.message },
        { status: 500 }
      );
    }
    if (slotsRes.error) {
      return NextResponse.json(
        { error: 'Failed to fetch timetable', details: slotsRes.error.message },
        { status: 500 }
      );
    }
    if (classSubjectsRes.error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch class subjects',
          details: classSubjectsRes.error.message,
        },
        { status: 500 }
      );
    }
    if (studentsRes.error) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsRes.error.message },
        { status: 500 }
      );
    }

    const teacherById = Object.fromEntries(
      (teachersRes.data || []).map((t) => [t.id, t])
    );

    const timetableSubjectIdsByClass = new Map<string, Set<string>>();
    const hasSlotByClass = new Map<string, boolean>();
    for (const row of slotsRes.data || []) {
      const cid = row.class_id as string;
      hasSlotByClass.set(cid, true);
      if (!row.subject_id) continue;
      if (!timetableSubjectIdsByClass.has(cid)) {
        timetableSubjectIdsByClass.set(cid, new Set());
      }
      timetableSubjectIdsByClass.get(cid)!.add(row.subject_id as string);
    }

    /** Assigned subjects (Assign Subjects / class_subjects) — primary count for overview */
    const assignedSubjectIdsByClass = new Map<string, Set<string>>();
    for (const row of classSubjectsRes.data || []) {
      const cid = row.class_id as string;
      if (!row.subject_id) continue;
      if (!assignedSubjectIdsByClass.has(cid)) {
        assignedSubjectIdsByClass.set(cid, new Set());
      }
      assignedSubjectIdsByClass.get(cid)!.add(row.subject_id as string);
    }

    const allStudentsRaw = studentsRes.data || [];

    const classesWithDetails = classes.map((cls) => {
      const classTeacher = cls.class_teacher_id
        ? teacherById[cls.class_teacher_id] ?? null
        : null;

      const hasTimetable = hasSlotByClass.get(cls.id) === true;

      const fromAssigned = assignedSubjectIdsByClass.get(cls.id);
      const fromTimetable = timetableSubjectIdsByClass.get(cls.id);
      const merged = new Set<string>([
        ...(fromAssigned ? [...fromAssigned] : []),
        ...(fromTimetable ? [...fromTimetable] : []),
      ]);
      const totalSubjects = merged.size;

      const classYear = String(cls.academic_year ?? '').trim();
      const cc = normToken(cls.class);
      const se = normToken(cls.section);

      const allStudents = allStudentsRaw.filter((s) => {
        if (normToken(s.class) !== cc || normToken(s.section) !== se) {
          return false;
        }
        if (!classYear) return true;
        const studentYear = String(s.academic_year ?? '').trim();
        return studentYear === classYear;
      });

      const totalStudents = allStudents.length;
      const activeStudents = allStudents.filter(
        (s) => s.status !== 'deactivated' && s.status !== 'inactive'
      ).length;
      const deactivatedStudents = allStudents.filter(
        (s) => s.status === 'deactivated' || s.status === 'inactive'
      ).length;

      const oldAdmissions = allStudents.filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at) < academicYearStart;
      }).length;

      const newAdmissions = allStudents.filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at) >= academicYearStart;
      }).length;

      return {
        id: cls.id,
        class: cls.class,
        section: cls.section,
        academic_year: cls.academic_year,
        class_teacher: classTeacher,
        total_subjects: totalSubjects,
        has_timetable: hasTimetable,
        old_admissions: oldAdmissions,
        new_admissions: newAdmissions,
        active_students: activeStudents,
        deactivated_students: deactivatedStudents,
        total_students: totalStudents,
      };
    });

    const totals = {
      old_admissions: classesWithDetails.reduce((sum, c) => sum + c.old_admissions, 0),
      new_admissions: classesWithDetails.reduce((sum, c) => sum + c.new_admissions, 0),
      active_students: classesWithDetails.reduce(
        (sum, c) => sum + c.active_students,
        0
      ),
      deactivated_students: classesWithDetails.reduce(
        (sum, c) => sum + c.deactivated_students,
        0
      ),
      total_students: classesWithDetails.reduce((sum, c) => sum + c.total_students, 0),
    };

    return NextResponse.json(
      {
        data: classesWithDetails,
        totals,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching class overview:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
