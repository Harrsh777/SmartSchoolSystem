import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, password } = body;

    if (!school_code && !password) {
      return NextResponse.json(
        { error: 'At least one of school_code or password must be provided' },
        { status: 400 }
      );
    }

    // Check if school exists
    const { data: existingSchool, error: fetchError } = await supabase
      .from('accepted_schools')
      .select('school_code')
      .eq('id', id)
      .single();

    if (fetchError || !existingSchool) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const updateData: { school_code?: string; password?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    // Update school code if provided
    if (school_code) {
      const normalizedSchoolCode = school_code.toUpperCase().trim();
      
      // Check if the new school code already exists (excluding current school)
      const { data: duplicateCheck, error: duplicateError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', normalizedSchoolCode)
        .neq('id', id)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is what we want
        return NextResponse.json(
          { error: 'Error checking for duplicate school code', details: duplicateError.message },
          { status: 500 }
        );
      }

      if (duplicateCheck) {
        return NextResponse.json(
          { error: 'School code already exists. Please choose a different code.' },
          { status: 400 }
        );
      }

      updateData.school_code = normalizedSchoolCode;
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
    }

    // Update the school
    const { data, error } = await supabase
      .from('accepted_schools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update school credentials', details: error.message },
        { status: 500 }
      );
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...schoolData } = data;

    return NextResponse.json(
      {
        success: true,
        message: 'School credentials updated successfully',
        data: schoolData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating school credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
