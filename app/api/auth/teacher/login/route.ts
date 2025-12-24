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
    const { password_hash, ...teacherProfile } = teacher as any;

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

