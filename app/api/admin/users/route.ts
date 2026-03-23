import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { generateAndHashPassword } from '@/lib/password-generator';

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
            .maybeSingle();
          isActive = Boolean(login?.is_active);
        } else if (user.user_type === 'staff') {
          const { data: login } = await supabase
            .from('staff_login')
            .select('is_active')
            .eq('staff_id', user.identifier)
            .eq('school_code', user.school_code)
            .maybeSingle();
          isActive = Boolean(login?.is_active);
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

    if (!user_type || identifier === undefined || identifier === null || identifier === '' || !school_code || is_active === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const schoolNorm = String(school_code).trim().toUpperCase();
    const identNorm = String(identifier).trim();

    if (user_type === 'student') {
      const { data: existing, error: lookupErr } = await supabase
        .from('student_login')
        .select('id')
        .eq('admission_no', identNorm)
        .eq('school_code', schoolNorm)
        .maybeSingle();

      if (lookupErr) {
        console.error('student_login lookup:', lookupErr);
        return NextResponse.json(
          { error: 'Failed to look up student login', details: lookupErr.message },
          { status: 500 }
        );
      }

      if (existing) {
        const { error } = await supabase
          .from('student_login')
          .update({ is_active })
          .eq('admission_no', identNorm)
          .eq('school_code', schoolNorm);

        if (error) {
          console.error('Error updating student_login:', error);
          return NextResponse.json(
            { error: 'Failed to update user status', details: error.message },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true });
      }

      if (!is_active) {
        return NextResponse.json({
          success: true,
          message: 'No login record exists; user cannot sign in already.',
        });
      }

      const { data: student, error: stErr } = await supabase
        .from('students')
        .select('id')
        .eq('admission_no', identNorm)
        .eq('school_code', schoolNorm)
        .maybeSingle();

      if (stErr || !student) {
        return NextResponse.json(
          { error: 'Student not found for this school and admission number' },
          { status: 404 }
        );
      }

      const { password, hashedPassword } = await generateAndHashPassword();
      const { error: insertError } = await supabase.from('student_login').insert({
        school_code: schoolNorm,
        admission_no: identNorm,
        password_hash: hashedPassword,
        plain_password: password,
        is_active: true,
      });

      if (insertError) {
        console.error('Error inserting student_login:', insertError);
        return NextResponse.json(
          { error: 'Failed to create student login', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        created_login: true,
        generated_password: password,
      });
    }

    if (user_type === 'staff') {
      const { data: existing, error: lookupErr } = await supabase
        .from('staff_login')
        .select('id')
        .eq('staff_id', identNorm)
        .eq('school_code', schoolNorm)
        .maybeSingle();

      if (lookupErr) {
        console.error('staff_login lookup:', lookupErr);
        return NextResponse.json(
          { error: 'Failed to look up staff login', details: lookupErr.message },
          { status: 500 }
        );
      }

      if (existing) {
        const { error } = await supabase
          .from('staff_login')
          .update({ is_active })
          .eq('staff_id', identNorm)
          .eq('school_code', schoolNorm);

        if (error) {
          console.error('Error updating staff_login:', error);
          return NextResponse.json(
            { error: 'Failed to update user status', details: error.message },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true });
      }

      if (!is_active) {
        return NextResponse.json({
          success: true,
          message: 'No login record exists; user cannot sign in already.',
        });
      }

      const { data: staffRow, error: staffErr } = await supabase
        .from('staff')
        .select('id')
        .eq('staff_id', identNorm)
        .eq('school_code', schoolNorm)
        .maybeSingle();

      if (staffErr || !staffRow) {
        return NextResponse.json(
          { error: 'Staff not found for this school and staff ID' },
          { status: 404 }
        );
      }

      const { password, hashedPassword } = await generateAndHashPassword();
      const { error: insertError } = await supabase.from('staff_login').insert({
        school_code: schoolNorm,
        staff_id: identNorm,
        password_hash: hashedPassword,
        plain_password: password,
        is_active: true,
      });

      if (insertError) {
        console.error('Error inserting staff_login:', insertError);
        return NextResponse.json(
          { error: 'Failed to create staff login', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        created_login: true,
        generated_password: password,
      });
    }

    return NextResponse.json({ error: 'Invalid user_type' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
