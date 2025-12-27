import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-generator';
import bcrypt from 'bcryptjs';

/**
 * Change password for a student
 * Requires current password verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, admission_no, current_password, new_password } = body;

    if (!school_code || !admission_no || !current_password || !new_password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
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

    // Get current login record
    const { data: loginData, error: loginError } = await supabase
      .from('student_login')
      .select('password_hash')
      .eq('school_code', school_code)
      .eq('admission_no', admission_no)
      .single();

    if (loginError || !loginData) {
      return NextResponse.json(
        { error: 'No password found. Please contact administrator.' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, loginData.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    const { error: updateError } = await supabase
      .from('student_login')
      .update({
        password_hash: newPasswordHash,
        plain_password: null, // Clear plain password after change
        updated_at: new Date().toISOString(),
      })
      .eq('school_code', school_code)
      .eq('admission_no', admission_no);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update password', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error changing student password:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

