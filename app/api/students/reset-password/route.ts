import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-generator';

/**
 * Reset password for a single student
 * Returns the new plain text password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, admission_no } = body;

    if (!school_code || !admission_no) {
      return NextResponse.json(
        { error: 'School code and admission number are required' },
        { status: 400 }
      );
    }

    // Verify student exists
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, admission_no, student_name, school_code')
      .eq('school_code', school_code)
      .eq('admission_no', admission_no)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Set default password to "student123"
    const password = 'student123';
    const hash = await hashPassword(password);

    // Update or insert login record
    const { error: loginError } = await supabase
      .from('student_login')
      .upsert(
        {
          school_code: school_code,
          admission_no: admission_no,
          password_hash: hash,
          plain_password: password, // Store plain text password
          is_active: true,
        },
        {
          onConflict: 'school_code,admission_no',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (loginError) {
      return NextResponse.json(
        { error: 'Failed to reset password', details: loginError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        admission_no: admission_no,
        student_name: studentData.student_name,
        password: password, // Return plain text password
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error resetting student password:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

