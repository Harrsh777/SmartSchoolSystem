import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Get school ID
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

    // Fetch classes (optionally filter by academic year)
    let classesQuery = supabase
      .from('classes')
      .select('id, class, section, academic_year, class_teacher_id')
      .eq('school_code', schoolCode);

    if (academicYearFilter) {
      classesQuery = classesQuery.eq('academic_year', academicYearFilter);
    }

    const { data: classes, error: classesError } = await classesQuery
      .order('class', { ascending: true })
      .order('section', { ascending: true });

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classesError.message },
        { status: 500 }
      );
    }

    // Get current academic year start date (assuming academic year starts in April)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const academicYearStart = currentMonth >= 3 
      ? new Date(currentYear, 3, 1) // April 1st of current year
      : new Date(currentYear - 1, 3, 1); // April 1st of previous year

    // Get comprehensive data for each class
    const classesWithDetails = await Promise.all(
      (classes || []).map(async (cls) => {
        // Get class teacher info
        let classTeacher = null;
        if (cls.class_teacher_id) {
          const { data: teacher } = await supabase
            .from('staff')
            .select('id, full_name, staff_id')
            .eq('id', cls.class_teacher_id)
            .single();
          
          if (teacher) {
            classTeacher = teacher;
          }
        }

        // Get timetable status and subject count
        const { count: timetableCount, data: timetableSlots } = await supabase
          .from('timetable_slots')
          .select('subject_id', { count: 'exact' })
          .eq('school_code', schoolCode)
          .eq('class_id', cls.id);

        const hasTimetable = (timetableCount || 0) > 0;
        // Get unique subjects count
        const uniqueSubjects = new Set(
          (timetableSlots || []).map((slot: { subject_id: string }) => slot.subject_id).filter(Boolean)
        );
        const totalSubjects = uniqueSubjects.size;

        // Get all students for this class (match class + section; academic_year can match or be null/empty)
        // Use flexible class matching: "NUR" and "NUR." often refer to the same class
        const classTrimmed = (cls.class || '').toString().trim();
        const classWithoutTrailingPeriod = classTrimmed.replace(/\.+$/, '');
        const classVariants = [...new Set([cls.class, classTrimmed, classWithoutTrailingPeriod].filter(Boolean))];

        let allStudentsRaw: { id: string; created_at: string | null; status: string; academic_year: string | null }[] = [];
        if (classVariants.length > 0) {
          const { data } = await supabase
            .from('students')
            .select('id, created_at, status, academic_year')
            .eq('school_code', schoolCode)
            .in('class', classVariants)
            .eq('section', cls.section || '');
          allStudentsRaw = data || [];
        } else {
          const { data } = await supabase
            .from('students')
            .select('id, created_at, status, academic_year')
            .eq('school_code', schoolCode)
            .eq('class', cls.class)
            .eq('section', cls.section || '');
          allStudentsRaw = data || [];
        }

        // Include students where academic_year matches, or student's is null/empty (for students added without academic_year)
        const classYear = (cls.academic_year || '').toString().trim();
        const allStudents = (allStudentsRaw || []).filter((s) => {
          const studentYear = (s.academic_year || '').toString().trim();
          if (!studentYear) return true; // Student has no academic_year - include
          if (!classYear) return true; // Class has no academic_year - include
          return studentYear === classYear;
        });

        // Calculate student statistics
        const totalStudents = allStudents?.length || 0;
        const activeStudents = allStudents?.filter(s => s.status !== 'deactivated' && s.status !== 'inactive').length || 0;
        const deactivatedStudents = allStudents?.filter(s => s.status === 'deactivated' || s.status === 'inactive').length || 0;
        
        // Old admissions: students created before current academic year start
        const oldAdmissions = allStudents?.filter(s => {
          if (!s.created_at) return false;
          const createdDate = new Date(s.created_at);
          return createdDate < academicYearStart;
        }).length || 0;

        // New admissions: students created in current academic year
        const newAdmissions = allStudents?.filter(s => {
          if (!s.created_at) return false;
          const createdDate = new Date(s.created_at);
          return createdDate >= academicYearStart;
        }).length || 0;

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
      })
    );

    // Calculate totals
    const totals = {
      old_admissions: classesWithDetails.reduce((sum, cls) => sum + cls.old_admissions, 0),
      new_admissions: classesWithDetails.reduce((sum, cls) => sum + cls.new_admissions, 0),
      active_students: classesWithDetails.reduce((sum, cls) => sum + cls.active_students, 0),
      deactivated_students: classesWithDetails.reduce((sum, cls) => sum + cls.deactivated_students, 0),
      total_students: classesWithDetails.reduce((sum, cls) => sum + cls.total_students, 0),
    };

    return NextResponse.json({
      data: classesWithDetails,
      totals: totals,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class overview:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

