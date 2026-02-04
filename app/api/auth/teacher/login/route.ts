import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password-utils';
import { setAuthCookie, setSessionIdCookie, SESSION_MAX_AGE } from '@/lib/auth-cookie';
import { createSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(request, 'auth-teacher-login', { windowMs: 60 * 1000, max: 10 });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
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

    // Step 1: Authenticate from staff_login table
    // staff_login.staff_id may be either display code (STF002) or staff UUID depending on how it was created
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

    const staffIdLower = staff_id.toLowerCase();
    let loginData = (loginRows ?? []).find(
      (r: { staff_id?: string }) =>
        (r.staff_id ?? '').toLowerCase() === staffIdLower
    );

    // Resolve display staff_id for teacher fetch (same as staff.staff_id)
    let displayStaffId: string | undefined;
    if (loginData) {
      displayStaffId = (loginData as { staff_id: string }).staff_id;
    }

    // Fallback: if no row by display code, staff_login may store staff UUID — resolve via staff table
    if (!loginData) {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('school_code', normalizedSchoolCode)
        .ilike('staff_id', staff_id)
        .maybeSingle();

      if (staffRow) {
        loginData = (loginRows ?? []).find(
          (r: { staff_id?: string }) => r.staff_id === staffRow.id
        ) ?? null;
        displayStaffId = staffRow.staff_id;
      }
    }

    if (!loginData) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (displayStaffId === undefined) {
      displayStaffId = (loginData as { staff_id: string }).staff_id;
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

    // Step 3: Fetch staff profile from staff table (use display staff_id for exact match)
    const { data: teacher, error: teacherError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', normalizedSchoolCode)
      .eq('staff_id', displayStaffId)
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

    // Create server-side session (stored in DB; token in HttpOnly cookie)
    const { sessionToken, expiresAt } = await createSession({
      role: 'teacher',
      schoolCode: normalizedSchoolCode,
      userId: (teacher as { id: string }).id,
      userPayload: teacherProfile as Record<string, unknown>,
      maxAgeSeconds: SESSION_MAX_AGE,
    });

    const response = NextResponse.json({
      success: true,
      teacher: teacherProfile,
      message: 'Login successful',
    }, { status: 200 });
    setAuthCookie(response, 'teacher', normalizedSchoolCode, SESSION_MAX_AGE);
    setSessionIdCookie(response, sessionToken, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

