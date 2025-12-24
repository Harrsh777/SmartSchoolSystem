import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, admission_no, password } = body;

    if (!school_code || !admission_no || !password) {
      return NextResponse.json(
        { error: 'School code, admission number, and password are required' },
        { status: 400 }
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

    // Step 3: Fetch student profile from students table
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('admission_no', admission_no)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Check if student status is active
    if (student.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Return success with student data (exclude sensitive info)
    const { password_hash, ...studentProfile } = student as any;

    return NextResponse.json({
      success: true,
      student: studentProfile,
      message: 'Login successful',
    }, { status: 200 });
  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

