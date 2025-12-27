import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Diagnostic endpoint to check why password generation is finding 0 students/staff
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    interface Diagnostics {
      schools: Array<{
        school_code: string;
        school_name: string;
        [key: string]: unknown;
      }>;
      students: {
        total: number;
        with_passwords: number;
        without_passwords: number;
        bySchoolCode?: number;
        bySchoolId?: number;
        withoutSchoolCode?: number;
        withoutAdmissionNo?: number;
        sample?: unknown[];
        [key: string]: unknown;
      };
      staff: {
        total: number;
        with_passwords: number;
        without_passwords: number;
        bySchoolCode?: number;
        bySchoolId?: number;
        withoutSchoolCode?: number;
        withoutStaffId?: number;
        sample?: unknown[];
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }
    const diagnostics: Diagnostics = {
      schools: [],
      students: {
        total: 0,
        with_passwords: 0,
        without_passwords: 0,
        bySchoolCode: 0,
        bySchoolId: 0,
        withoutSchoolCode: 0,
        withoutAdmissionNo: 0,
        sample: [],
      },
      staff: {
        total: 0,
        with_passwords: 0,
        without_passwords: 0,
        bySchoolCode: 0,
        bySchoolId: 0,
        withoutSchoolCode: 0,
        withoutStaffId: 0,
        sample: [],
      },
    };

    // Get all schools
    let schoolsQuery = supabase
      .from('accepted_schools')
      .select('id, school_code, school_name');

    if (schoolCode) {
      schoolsQuery = schoolsQuery.eq('school_code', schoolCode);
    }

    const { data: schools } = await schoolsQuery;
    diagnostics.schools = schools || [];

    // Get all students
    const { data: allStudents, count: totalStudents } = await supabase
      .from('students')
      .select('id, school_code, school_id, admission_no, student_name, status', { count: 'exact' })
      .limit(1000);

    diagnostics.students.total = totalStudents || 0;

    if (allStudents && allStudents.length > 0) {
      // Count by school_code
      const studentsBySchoolCode = allStudents.filter(s => s.school_code);
      diagnostics.students.bySchoolCode = studentsBySchoolCode.length;

      // Count by school_id
      const studentsBySchoolId = allStudents.filter(s => s.school_id);
      diagnostics.students.bySchoolId = studentsBySchoolId.length;

      // Count without school_code
      diagnostics.students.withoutSchoolCode = allStudents.filter(s => !s.school_code).length;

      // Count without admission_no
      diagnostics.students.withoutAdmissionNo = allStudents.filter(s => !s.admission_no).length;

      // Sample data
      diagnostics.students.sample = allStudents.slice(0, 10).map(s => ({
        id: s.id,
        school_code: s.school_code || 'NULL',
        school_id: s.school_id || 'NULL',
        admission_no: s.admission_no || 'NULL',
        student_name: s.student_name,
        status: s.status,
      }));

      // Check for each school
      for (const school of diagnostics.schools) {
        const studentsForThisSchool = allStudents.filter(
          s => s.school_code === school.school_code || s.school_id === school.id
        );
        diagnostics.schools.push({
          ...school,
          students_found: studentsForThisSchool.length,
          students_by_code: allStudents.filter(s => s.school_code === school.school_code).length,
          students_by_id: allStudents.filter(s => s.school_id === school.id).length,
        });
      }
    }

    // Get all staff
    const { data: allStaff, count: totalStaff } = await supabase
      .from('staff')
      .select('id, school_code, school_id, staff_id, full_name, role', { count: 'exact' })
      .limit(1000);

    diagnostics.staff.total = totalStaff || 0;

    if (allStaff && allStaff.length > 0) {
      // Count by school_code
      const staffBySchoolCode = allStaff.filter(s => s.school_code);
      diagnostics.staff.bySchoolCode = staffBySchoolCode.length;

      // Count by school_id
      const staffBySchoolId = allStaff.filter(s => s.school_id);
      diagnostics.staff.bySchoolId = staffBySchoolId.length;

      // Count without school_code
      diagnostics.staff.withoutSchoolCode = allStaff.filter(s => !s.school_code).length;

      // Count without staff_id
      diagnostics.staff.withoutStaffId = allStaff.filter(s => !s.staff_id).length;

      // Sample data
      diagnostics.staff.sample = allStaff.slice(0, 10).map(s => ({
        id: s.id,
        school_code: s.school_code || 'NULL',
        school_id: s.school_id || 'NULL',
        staff_id: s.staff_id || 'NULL',
        full_name: s.full_name,
        role: s.role,
      }));
    }

    // Check existing logins
    const { data: studentLogins, count: studentLoginCount } = await supabase
      .from('student_login')
      .select('school_code, admission_no', { count: 'exact' })
      .limit(100);

    const { data: staffLogins, count: staffLoginCount } = await supabase
      .from('staff_login')
      .select('school_code, staff_id', { count: 'exact' })
      .limit(100);

    diagnostics.existing_logins = {
      students: studentLoginCount || 0,
      staff: staffLoginCount || 0,
      student_samples: studentLogins?.slice(0, 5) || [],
      staff_samples: staffLogins?.slice(0, 5) || [],
    };

    return NextResponse.json({
      message: 'Diagnostic information',
      diagnostics,
      recommendations: generateRecommendations(diagnostics),
    }, { status: 200 });
  } catch (error) {
    console.error('Error in diagnostic:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface DiagnosticsForRecommendations {
  schools?: unknown[];
  students: { 
    total: number; 
    with_passwords: number; 
    without_passwords: number;
    withoutSchoolCode?: number;
    withoutAdmissionNo?: number;
    [key: string]: unknown;
  };
  staff: { 
    total: number; 
    with_passwords: number; 
    without_passwords: number;
    withoutSchoolCode?: number;
    withoutStaffId?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function generateRecommendations(diagnostics: DiagnosticsForRecommendations): string[] {
  const recommendations: string[] = [];

  if (diagnostics.students.total === 0) {
    recommendations.push('No students found in database. Import students first.');
  } else {
    if ((diagnostics.students.withoutSchoolCode || 0) > 0) {
      recommendations.push(`${diagnostics.students.withoutSchoolCode} students are missing school_code. Update them to have school_code.`);
    }
    if ((diagnostics.students.withoutAdmissionNo || 0) > 0) {
      recommendations.push(`${diagnostics.students.withoutAdmissionNo} students are missing admission_no. These cannot have passwords.`);
    }
    const bySchoolCode = (diagnostics.students as { bySchoolCode?: number }).bySchoolCode || 0;
    const bySchoolId = (diagnostics.students as { bySchoolId?: number }).bySchoolId || 0;
    if (bySchoolCode === 0 && bySchoolId > 0) {
      recommendations.push('Students have school_id but not school_code. Update students to populate school_code field.');
    }
  }

  if (diagnostics.staff.total === 0) {
    recommendations.push('No staff found in database. Import staff first.');
  } else {
    if ((diagnostics.staff.withoutSchoolCode || 0) > 0) {
      recommendations.push(`${diagnostics.staff.withoutSchoolCode} staff are missing school_code. Update them to have school_code.`);
    }
    if ((diagnostics.staff.withoutStaffId || 0) > 0) {
      recommendations.push(`${diagnostics.staff.withoutStaffId} staff are missing staff_id. These cannot have passwords.`);
    }
    const bySchoolCode = (diagnostics.staff as { bySchoolCode?: number }).bySchoolCode || 0;
    const bySchoolId = (diagnostics.staff as { bySchoolId?: number }).bySchoolId || 0;
    if (bySchoolCode === 0 && bySchoolId > 0) {
      recommendations.push('Staff have school_id but not school_code. Update staff to populate school_code field.');
    }
  }

  const schools = diagnostics.schools as unknown[] | undefined;
  if (!schools || schools.length === 0) {
    recommendations.push('No schools found. Create schools first.');
  }

  return recommendations;
}

