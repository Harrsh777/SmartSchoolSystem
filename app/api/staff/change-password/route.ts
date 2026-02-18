import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-generator';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/audit-logger';

/**
 * Change password for a staff member
 * Requires current password verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, id, current_password, new_password } = body;

    if (!school_code || !id || !current_password || !new_password) {
      return NextResponse.json(
        { error: 'All fields are required (school_code, id (UUID), current_password, new_password)' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Verify staff exists by UUID
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, school_code')
      .eq('school_code', school_code)
      .eq('id', id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Get current login record (staff_login.staff_id should reference staff.id UUID)
    const { data: loginData, error: loginError } = await supabase
      .from('staff_login')
      .select('password_hash')
      .eq('school_code', school_code)
      .eq('staff_id', staffData.id) // Use UUID
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
      .from('staff_login')
      .update({
        password_hash: newPasswordHash,
        plain_password: null, // Clear plain password after change
        updated_at: new Date().toISOString(),
      })
      .eq('school_code', school_code)
      .eq('staff_id', staffData.id); // Use UUID

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update password', details: updateError.message },
        { status: 500 }
      );
    }

    logAudit(request, {
      userId: staffData.id,
      userName: (staffData as { full_name?: string }).full_name ?? staffData.staff_id ?? 'Staff',
      role: 'Staff',
      actionType: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: staffData.id,
      severity: 'CRITICAL',
      metadata: {},
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error changing staff password:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

