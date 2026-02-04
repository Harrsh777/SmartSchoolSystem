import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { setAuthCookie, setSessionIdCookie, SESSION_MAX_AGE } from '@/lib/auth-cookie';
import { createSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(request, 'auth-accountant-login', { windowMs: 60 * 1000, max: 10 });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const { school_code, staff_id, password } = body;

    if (!school_code || !staff_id || !password) {
      return NextResponse.json(
        { error: 'School code, staff ID, and password are required' },
        { status: 400 }
      );
    }

    // Step 0: Check if school is on hold
    const { data: school, error: holdCheckError } = await supabase
      .from('accepted_schools')
      .select('is_hold')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (!holdCheckError && school && school.is_hold) {
      return NextResponse.json(
        { error: 'This school is on hold. Please contact admin.' },
        { status: 403 }
      );
    }

    // Step 1: Authenticate from staff_login table
    const { data: loginData, error: loginError } = await supabase
      .from('staff_login')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
      .single();

    if (loginError || !loginData) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!loginData.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Step 2: Verify password
    const isValidPassword = await bcrypt.compare(password, loginData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Step 3: Get staff details and verify role
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff record not found' },
        { status: 404 }
      );
    }

    // Step 4: Verify role is accountant
    if (!staffData.role.toLowerCase().includes('accountant')) {
      return NextResponse.json(
        { error: 'Access denied. Only accountants can access this portal.' },
        { status: 403 }
      );
    }

    // Step 5: Get school details
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id, school_name, school_code')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const staffPayload = {
      id: staffData.id,
      staff_id: staffData.staff_id,
      full_name: staffData.full_name,
      role: staffData.role,
      department: staffData.department,
      designation: staffData.designation,
      email: staffData.email,
      phone: staffData.phone,
      school_code: staffData.school_code,
    };
    const schoolPayload = {
      id: schoolData.id,
      school_name: schoolData.school_name,
      school_code: schoolData.school_code,
    };
    const normalizedSchoolCode = school_code.toUpperCase();

    // Create server-side session (stored in public.sessions)
    const { sessionToken, expiresAt } = await createSession({
      role: 'accountant',
      schoolCode: normalizedSchoolCode,
      userId: staffData.id,
      userPayload: { staff: staffPayload, school: schoolPayload } as Record<string, unknown>,
      maxAgeSeconds: SESSION_MAX_AGE,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      data: {
        staff: staffPayload,
        school: schoolPayload,
      },
    }, { status: 200 });
    setAuthCookie(response, 'accountant', undefined, SESSION_MAX_AGE);
    setSessionIdCookie(response, sessionToken, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error('Error in accountant login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

