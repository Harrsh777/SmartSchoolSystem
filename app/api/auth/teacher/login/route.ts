import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password-utils';

export async function POST(request: NextRequest) {
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
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('is_hold')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (!schoolError && school && school.is_hold) {
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

    // Check if account is active
    if (!loginData.is_active) {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Step 2: Verify password hash
    const isPasswordValid = await comparePassword(password, loginData.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Step 3: Fetch staff profile from staff table
    const { data: teacher, error: teacherError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
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

    return NextResponse.json({
      success: true,
      teacher: teacherProfile,
      message: 'Login successful',
    }, { status: 200 });
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

