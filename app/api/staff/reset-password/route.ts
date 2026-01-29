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
    const { school_code, id, staff_id: staffIdDisplay } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Accept either id (UUID) or staff_id (display code e.g. STF001)
    const staffIdOrUuid = id ?? staffIdDisplay;
    if (!staffIdOrUuid) {
      return NextResponse.json(
        { error: 'Staff ID or staff UUID is required (id or staff_id)' },
        { status: 400 }
      );
    }

    // Look up staff: by UUID (id) or by display staff_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(staffIdOrUuid));
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, school_code')
      .eq('school_code', school_code)
      .eq(isUuid ? 'id' : 'staff_id', staffIdOrUuid)
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

    // Update or insert login record (staff_login.staff_id is display code e.g. STF001 for teacher login)
    const { error: loginError } = await supabase
      .from('staff_login')
      .upsert(
        {
          school_code: school_code,
          staff_id: staffData.staff_id, // Display code for login (STF001)
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
        id: staffData.id,
        staff_id: staffData.staff_id, // Display staff_id for reference
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

