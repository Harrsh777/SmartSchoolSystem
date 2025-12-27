import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

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

    if (!loginData.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Step 2: Verify password
    const isValidPassword = await bcrypt.compare(password, loginData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Step 3: Get staff details and verify role
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .eq('staff_id', staff_id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff record not found' },
        { status: 404 }
      );
    }

    // Step 4: Verify role is accountant
    if (!staffData.role.toLowerCase().includes('accountant')) {
      return NextResponse.json(
        { error: 'Access denied. Only accountants can access this portal.' },
        { status: 403 }
      );
    }

    // Step 5: Get school details
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id, school_name, school_code')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Return success with staff and school data
    return NextResponse.json({
      message: 'Login successful',
      data: {
        staff: {
          id: staffData.id,
          staff_id: staffData.staff_id,
          full_name: staffData.full_name,
          role: staffData.role,
          department: staffData.department,
          designation: staffData.designation,
          email: staffData.email,
          phone: staffData.phone,
          school_code: staffData.school_code,
        },
        school: {
          id: schoolData.id,
          school_name: schoolData.school_name,
          school_code: schoolData.school_code,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in accountant login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

