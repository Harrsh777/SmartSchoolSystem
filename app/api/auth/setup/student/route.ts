import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-utils';

/**
 * This endpoint is for setting up student login credentials
 * Should be called by admin/principal to create login accounts for students
 */
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

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_code, admission_no')
      .eq('school_code', school_code.toUpperCase())
      .eq('admission_no', admission_no)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Check if login already exists
    const { data: existingLogin } = await supabase
      .from('student_login')
      .select('id')
      .eq('school_code', school_code.toUpperCase())
      .eq('admission_no', admission_no)
      .single();

    if (existingLogin) {
      // Update existing login
      const { error: updateError } = await supabase
        .from('student_login')
        .update({
          password_hash: passwordHash,
          is_active: true,
        })
        .eq('school_code', school_code.toUpperCase())
        .eq('admission_no', admission_no);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update login credentials', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Student login credentials updated successfully',
      }, { status: 200 });
    } else {
      // Create new login
      const { error: insertError } = await supabase
        .from('student_login')
        .insert({
          school_code: school_code.toUpperCase(),
          admission_no: admission_no,
          password_hash: passwordHash,
          is_active: true,
        });

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create login credentials', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Student login credentials created successfully',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error setting up student login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

