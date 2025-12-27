import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/admin/schools/[schoolCode]/data
 * Get all data for a specific school - comprehensive supervision endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolCode: string }> }
) {
  try {
    const { schoolCode } = await params;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school basic info
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('*')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Fetch all data in parallel
    const [
      studentsResult,
      staffResult,
      classesResult,
      examinationsResult,
      feesResult,
      timetableGroupsResult,
      libraryBooksResult,
      transportRoutesResult,
      communicationsResult,
      subjectsResult,
      rolesResult,
      permissionsResult,
    ] = await Promise.all([
      // Students
      supabase
        .from('students')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Staff
      supabase
        .from('staff')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Classes
      supabase
        .from('classes')
        .select('*')
        .eq('school_code', schoolCode)
        .order('class', { ascending: true })
        .order('section', { ascending: true }),

      // Examinations
      supabase
        .from('examinations')
        .select(`
          *,
          class:class_id (
            id,
            class,
            section
          ),
          created_by_staff:created_by (
            id,
            full_name,
            staff_id
          )
        `)
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Fees
      supabase
        .from('fees')
        .select('*')
        .eq('school_code', schoolCode)
        .order('payment_date', { ascending: false }),

      // Timetable Period Groups
      supabase
        .from('timetable_period_groups')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Library Books
      supabase
        .from('library_books')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Transport Routes
      supabase
        .from('transport_routes')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Communications/Notices
      supabase
        .from('communications')
        .select('*')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false }),

      // Subjects
      supabase
        .from('subjects')
        .select('*')
        .eq('school_code', schoolCode)
        .order('name', { ascending: true }),

      // Roles (RBAC)
      supabase
        .from('roles')
        .select(`
          *,
          role_permissions:role_permissions (
            permission:permissions (
              id,
              key,
              name,
              description,
              module
            )
          )
        `)
        .order('created_at', { ascending: false }),

      // Permissions (RBAC)
      supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    // Fetch additional related data
    const [examSubjectsResult, studentMarksResult, staffRolesResult] = await Promise.all([
      // Exam Subjects
      examinationsResult.data
        ? supabase
            .from('exam_subjects')
            .select(`
              *,
              exam:examinations!inner (
                id,
                school_code
              ),
              subject:subjects (
                id,
                name,
                color
              )
            `)
            .eq('exam.school_code', schoolCode)
        : Promise.resolve({ data: [], error: null }),

      // Student Marks
      examinationsResult.data
        ? supabase
            .from('student_subject_marks')
            .select(`
              *,
              exam:examinations!inner (
                id,
                school_code
              ),
              student:students (
                id,
                student_name,
                admission_no
              ),
              subject:subjects (
                id,
                name
              )
            `)
            .eq('exam.school_code', schoolCode)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),

      // Staff Roles (RBAC)
      staffResult.data
        ? supabase
            .from('staff_roles')
            .select(`
              *,
              staff:staff_id!inner (
                id,
                school_code
              ),
              role:roles (
                id,
                name,
                description
              )
            `)
            .eq('staff.school_code', schoolCode)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Compile comprehensive data
    const schoolData = {
      school: school,
      statistics: {
        students: {
          total: studentsResult.data?.length || 0,
          active: studentsResult.data?.filter((s: { status?: string }) => s.status === 'active').length || 0,
          inactive: studentsResult.data?.filter((s: { status?: string }) => s.status === 'inactive' || s.status === 'deactivated').length || 0,
        },
        staff: {
          total: staffResult.data?.length || 0,
        },
        classes: {
          total: classesResult.data?.length || 0,
        },
        examinations: {
          total: examinationsResult.data?.length || 0,
        },
        fees: {
          total: feesResult.data?.length || 0,
          totalAmount: feesResult.data?.reduce((sum: number, fee: { amount?: string | number }) => 
            sum + Number(fee.amount || 0), 0) || 0,
        },
        library: {
          totalBooks: libraryBooksResult.data?.length || 0,
        },
        transport: {
          totalRoutes: transportRoutesResult.data?.length || 0,
        },
        communications: {
          total: communicationsResult.data?.length || 0,
        },
        subjects: {
          total: subjectsResult.data?.length || 0,
        },
        roles: {
          total: rolesResult.data?.length || 0,
        },
      },
      data: {
        students: studentsResult.data || [],
        staff: staffResult.data || [],
        classes: classesResult.data || [],
        examinations: examinationsResult.data || [],
        fees: feesResult.data || [],
        timetableGroups: timetableGroupsResult.data || [],
        libraryBooks: libraryBooksResult.data || [],
        transportRoutes: transportRoutesResult.data || [],
        communications: communicationsResult.data || [],
        subjects: subjectsResult.data || [],
        roles: rolesResult.data || [],
        permissions: permissionsResult.data || [],
        examSubjects: examSubjectsResult.data || [],
        studentMarks: studentMarksResult.data || [],
        staffRoles: staffRolesResult.data || [],
      },
    };

    return NextResponse.json({ data: schoolData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching school data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

