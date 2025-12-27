import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-generator';

/**
 * Reset password for a single staff member
 * Returns the new plain text password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, staff_id } = body;

    if (!school_code || !staff_id) {
      return NextResponse.json(
        { error: 'School code and staff ID are required' },
        { status: 400 }
      );
    }

    // Verify staff exists
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, school_code')
      .eq('school_code', school_code)
      .eq('staff_id', staff_id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Set default password to "staff123"
    const password = 'staff123';
    const hash = await hashPassword(password);

    // Update or insert login record
    const { error: loginError } = await supabase
      .from('staff_login')
      .upsert(
        {
          school_code: school_code,
          staff_id: staff_id,
          password_hash: hash,
          plain_password: password, // Store plain text password
          is_active: true,
        },
        {
          onConflict: 'school_code,staff_id',
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
        staff_id: staff_id,
        staff_name: staffData.full_name,
        password: password, // Return plain text password
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error resetting staff password:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

