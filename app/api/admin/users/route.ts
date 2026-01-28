import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch all users across all schools
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const role = searchParams.get('role'); // 'student', 'staff', 'admin'
    const status = searchParams.get('status'); // 'active', 'inactive'
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getServiceRoleClient();

    const users: Array<Record<string, unknown>> = [];
    let totalCount = 0;

    if (role === 'student' || !role) {
      // Fetch students
      let studentQuery = supabase
        .from('students')
        .select(`
          id,
          student_name,
          admission_no,
          class,
          section,
          school_code,
          school_id,
          created_at,
          accepted_schools!inner(school_name, school_code)
        `, { count: 'exact' });

      if (schoolCode) {
        studentQuery = studentQuery.eq('school_code', schoolCode);
      }
      if (search) {
        studentQuery = studentQuery.or(`student_name.ilike.%${search}%,admission_no.ilike.%${search}%`);
      }

      const { data: students, count: studentCount, error: studentError } = await studentQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      if (!studentError && students) {
        users.push(...students.map(s => ({
          ...s,
          user_type: 'student',
          name: s.student_name,
          identifier: s.admission_no,
        })));
        totalCount += studentCount || 0;
      }
    }

    if (role === 'staff' || !role) {
      // Fetch staff
      let staffQuery = supabase
        .from('staff')
        .select(`
          id,
          full_name,
          staff_id,
          role,
          department,
          school_code,
          school_id,
          created_at,
          accepted_schools!inner(school_name, school_code)
        `, { count: 'exact' });

      if (schoolCode) {
        staffQuery = staffQuery.eq('school_code', schoolCode);
      }
      if (search) {
        staffQuery = staffQuery.or(`full_name.ilike.%${search}%,staff_id.ilike.%${search}%`);
      }

      const { data: staff, count: staffCount, error: staffError } = await staffQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      if (!staffError && staff) {
        users.push(...staff.map(s => ({
          ...s,
          user_type: 'staff',
          name: s.full_name,
          identifier: s.staff_id,
        })));
        totalCount += staffCount || 0;
      }
    }

    // Check login status for each user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        let isActive = false;
        if (user.user_type === 'student') {
          const { data: login } = await supabase
            .from('student_login')
            .select('is_active')
            .eq('admission_no', user.identifier)
            .eq('school_code', user.school_code)
            .single();
          isActive = login?.is_active || false;
        } else if (user.user_type === 'staff') {
          const { data: login } = await supabase
            .from('staff_login')
            .select('is_active')
            .eq('staff_id', user.identifier)
            .eq('school_code', user.school_code)
            .single();
          isActive = login?.is_active || false;
        }

        return {
          ...user,
          status: isActive ? 'active' : 'inactive',
        };
      })
    );

    // Filter by status if provided
    const filteredUsers = status
      ? usersWithStatus.filter(u => u.status === status)
      : usersWithStatus;

    return NextResponse.json({
      data: filteredUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH - Update user status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_type, identifier, school_code, is_active } = body;

    if (!user_type || !identifier || !school_code || is_active === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const tableName = user_type === 'student' ? 'student_login' : 'staff_login';
    const idField = user_type === 'student' ? 'admission_no' : 'staff_id';

    const { error } = await supabase
      .from(tableName)
      .update({ is_active })
      .eq(idField, identifier)
      .eq('school_code', school_code);

    if (error) {
      console.error('Error updating user status:', error);
      return NextResponse.json(
        { error: 'Failed to update user status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
