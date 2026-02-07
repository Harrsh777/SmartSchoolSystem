import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password-utils';
import { setAuthCookie, setSessionIdCookie, SESSION_MAX_AGE } from '@/lib/auth-cookie';
import { createSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLoginAuditLog } from '@/lib/login-audit';

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(request, 'auth-student-login', { windowMs: 60 * 1000, max: 10 });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const { school_code, admission_no, password } = body;

    if (!school_code || !admission_no || !password) {
      return NextResponse.json(
        { error: 'School code, admission number, and password are required' },
        { status: 400 }
      );
    }

    // Step 0: Check if school is on hold
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('is_hold')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (!schoolError && school && school.is_hold) {
      await createLoginAuditLog(request, {
        name: admission_no || school_code || 'UNKNOWN',
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'This school is on hold. Please contact admin.' },
        { status: 403 }
      );
    }

    // Step 1: Authenticate from student_login table
    const { data: loginData, error: loginError } = await supabase
      .from('student_login')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('admission_no', admission_no)
      .single();

    if (loginError || !loginData) {
      await createLoginAuditLog(request, {
        name: admission_no || school_code || 'UNKNOWN',
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!loginData.is_active) {
      await createLoginAuditLog(request, {
        name: admission_no,
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Step 2: Verify password hash
    const isPasswordValid = await comparePassword(password, loginData.password_hash);
    
    if (!isPasswordValid) {
      await createLoginAuditLog(request, {
        name: admission_no,
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Step 3: Fetch student profile from students table
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('admission_no', admission_no)
      .single();

    if (studentError || !student) {
      await createLoginAuditLog(request, {
        name: admission_no,
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Check if student status is active
    if (student.status !== 'active') {
      await createLoginAuditLog(request, {
        userId: (student as { id: string }).id,
        name: (student as { student_name?: string }).student_name ?? admission_no,
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Return success with student data (exclude sensitive info)
    interface StudentWithPassword extends Record<string, unknown> {
      password_hash?: string;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...studentProfile } = student as StudentWithPassword;
    const normalizedSchoolCode = school_code.toUpperCase();

    // Log success first (so we record even if createSession fails)
    await createLoginAuditLog(request, {
      userId: (student as { id: string }).id,
      name: (student as { student_name?: string }).student_name ?? admission_no,
      role: 'Student',
      loginType: 'student',
      status: 'success',
    });

    // Create server-side session (stored in public.sessions)
    const { sessionToken, expiresAt } = await createSession({
      role: 'student',
      schoolCode: normalizedSchoolCode,
      userId: (student as { id: string }).id,
      userPayload: studentProfile as Record<string, unknown>,
      maxAgeSeconds: SESSION_MAX_AGE,
    });

    const response = NextResponse.json({
      success: true,
      student: studentProfile,
      message: 'Login successful',
    }, { status: 200 });
    setAuthCookie(response, 'student', undefined, SESSION_MAX_AGE);
    setSessionIdCookie(response, sessionToken, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error('Student login error:', error);
    try {
      await createLoginAuditLog(request, {
        name: 'Unknown',
        role: 'Student',
        loginType: 'student',
        status: 'failed',
      });
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

