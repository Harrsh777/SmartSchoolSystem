import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, password } = body;

    if (!school_code || !password) {
      return NextResponse.json(
        { error: 'School code and password are required' },
        { status: 400 }
      );
    }

    // Check if school exists in accepted_schools table
    const { data: school, error } = await supabase
      .from('accepted_schools')
      .select('*')
      .eq('school_code', school_code.toUpperCase())
      .single();

    if (error || !school) {
      return NextResponse.json(
        { error: 'Invalid school code or password' },
        { status: 401 }
      );
    }

    // Verify password (support both hashed and plain for migration)
    let isPasswordValid = false;
    if (school.password.startsWith('$2')) {
      // Password is hashed
      isPasswordValid = await bcrypt.compare(password, school.password);
    } else {
      // Plain password (for backward compatibility during migration)
      isPasswordValid = school.password === password;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid school code or password' },
        { status: 401 }
      );
    }

    // Return school data (excluding password for security)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...schoolData } = school;

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        school: schoolData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

