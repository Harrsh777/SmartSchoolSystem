import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { setAuthCookie, setSessionIdCookie, SESSION_MAX_AGE } from '@/lib/auth-cookie';
import { createSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLoginAuditLog } from '@/lib/login-audit';

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(request, 'auth-login', { windowMs: 60 * 1000, max: 10 });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const { school_code, password } = body;

    if (!school_code || !password) {
      return NextResponse.json(
        { error: 'School code and password are required' },
        { status: 400 }
      );
    }

    // Check if school exists in accepted_schools table
    const { data: school, error } = await supabase
      .from('accepted_schools')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (error || !school) {
      await createLoginAuditLog(request, {
        name: school_code?.toString() ?? 'UNKNOWN',
        role: 'School Admin',
        loginType: 'school',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Invalid school code or password' },
        { status: 401 }
      );
    }

    // Check if school is on hold
    if (school.is_hold) {
      await createLoginAuditLog(request, {
        userId: (school as { id?: string }).id,
        name: (school as { school_name?: string }).school_name ?? school.school_code ?? 'UNKNOWN',
        role: 'School Admin',
        loginType: 'school',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'This school is on hold. Please contact admin.' },
        { status: 403 }
      );
    }

    // Verify password (support both hashed and plain for migration)
    let isPasswordValid = false;
    if (school.password.startsWith('$2')) {
      // Password is hashed
      isPasswordValid = await bcrypt.compare(password, school.password);
    } else {
      // Plain password (for backward compatibility during migration)
      isPasswordValid = school.password === password;
    }

    if (!isPasswordValid) {
      await createLoginAuditLog(request, {
        userId: (school as { id?: string }).id,
        name: (school as { school_name?: string }).school_name ?? school.school_code ?? 'UNKNOWN',
        role: 'School Admin',
        loginType: 'school',
        status: 'failed',
      });
      return NextResponse.json(
        { error: 'Invalid school code or password' },
        { status: 401 }
      );
    }

    // Return school data (excluding password for security)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...schoolData } = school;
    const normalizedSchoolCode = school.school_code?.toUpperCase() ?? '';

    // Create server-side session (stored in public.sessions)
    const { sessionToken, expiresAt } = await createSession({
      role: 'school',
      schoolCode: normalizedSchoolCode,
      userId: (school as { id?: string }).id ?? null,
      userPayload: schoolData as Record<string, unknown>,
      maxAgeSeconds: SESSION_MAX_AGE,
    });

    await createLoginAuditLog(request, {
      userId: (school as { id?: string }).id ?? null,
      name: (school as { school_name?: string }).school_name ?? school.school_code ?? 'UNKNOWN',
      role: 'School Admin',
      loginType: 'school',
      status: 'success',
    });
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        school: schoolData,
      },
      { status: 200 }
    );
    setAuthCookie(response, 'school', normalizedSchoolCode, SESSION_MAX_AGE);
    setSessionIdCookie(response, sessionToken, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

