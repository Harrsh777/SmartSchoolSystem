import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { setAuthCookie, setSessionIdCookie, SESSION_MAX_AGE } from '@/lib/auth-cookie';
import { createSession } from '@/lib/session-store';

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Invalid school code or password' },
        { status: 401 }
      );
    }

    // Check if school is on hold
    if (school.is_hold) {
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

