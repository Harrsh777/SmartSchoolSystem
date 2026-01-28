import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password-utils';
import { setAuthCookie } from '@/lib/auth-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const school_code = typeof body.school_code === 'string' ? body.school_code.trim() : '';
    const staff_id = typeof body.staff_id === 'string' ? body.staff_id.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!school_code || !staff_id || !password) {
      return NextResponse.json(
        { error: 'School code, staff ID, and password are required' },
        { status: 400 }
      );
    }

    const normalizedSchoolCode = school_code.toUpperCase();

    // Step 0: Check if school is on hold
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('is_hold')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (!schoolError && school && school.is_hold) {
      return NextResponse.json(
        { error: 'This school is on hold. Please contact admin.' },
        { status: 403 }
      );
    }

    // Step 1: Authenticate from staff_login table (match staff_id case-insensitively)
    const { data: loginRows, error: loginError } = await supabase
      .from('staff_login')
      .select('*')
      .eq('school_code', normalizedSchoolCode);

    if (loginError) {
      console.error('Staff login query error:', loginError.message);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const loginData = (loginRows ?? []).find(
      (r: { staff_id?: string }) =>
        (r.staff_id ?? '').toLowerCase() === staff_id.toLowerCase()
    );

    if (!loginData) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!loginData.is_active) {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Step 2: Verify password (support both bcrypt hash and plain text for migration)
    const loginRecord = loginData as { password_hash?: string; password?: string };
    const storedHash = loginRecord.password_hash ?? loginRecord.password ?? '';
    let isPasswordValid = false;
    if (typeof storedHash === 'string' && storedHash.startsWith('$2')) {
      isPasswordValid = await comparePassword(password, storedHash);
    } else {
      isPasswordValid = storedHash === password;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Step 3: Fetch staff profile from staff table (use staff_id from DB for exact match)
    const matchedStaffId = (loginData as { staff_id: string }).staff_id;
    const { data: teacher, error: teacherError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', normalizedSchoolCode)
      .eq('staff_id', matchedStaffId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // Return success with teacher data (exclude sensitive info)
    interface TeacherWithPassword extends Record<string, unknown> {
      password_hash?: string;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...teacherProfile } = teacher as TeacherWithPassword;

    const response = NextResponse.json({
      success: true,
      teacher: teacherProfile,
      message: 'Login successful',
    }, { status: 200 });
    setAuthCookie(response, 'teacher');
    return response;
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

