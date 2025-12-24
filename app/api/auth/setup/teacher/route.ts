import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-utils';

/**
 * This endpoint is for setting up teacher/staff login credentials
 * Should be called by admin/principal to create login accounts for staff
 */
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

    // Verify staff exists
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, school_code, staff_id')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Check if login already exists
    const { data: existingLogin } = await supabase
      .from('staff_login')
      .select('id')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
      .single();

    if (existingLogin) {
      // Update existing login
      const { error: updateError } = await supabase
        .from('staff_login')
        .update({
          password_hash: passwordHash,
          is_active: true,
        })
        .eq('school_code', school_code.toUpperCase())
        .eq('staff_id', staff_id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update login credentials', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Teacher login credentials updated successfully',
      }, { status: 200 });
    } else {
      // Create new login
      const { error: insertError } = await supabase
        .from('staff_login')
        .insert({
          school_code: school_code.toUpperCase(),
          staff_id: staff_id,
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
        message: 'Teacher login credentials created successfully',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error setting up teacher login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

