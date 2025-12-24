import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch student filtered by school_code
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: student }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify student belongs to this school and get current admission_no
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('id, school_code, admission_no')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingStudent) {
      return NextResponse.json(
        { error: 'Student not found or access denied' },
        { status: 404 }
      );
    }

    // Check for duplicate admission number if admission_no is being updated
    if (updateData.admission_no && updateData.admission_no !== existingStudent.admission_no) {
      const { data: duplicate } = await supabase
        .from('students')
        .select('id')
        .eq('school_code', school_code)
        .eq('admission_no', updateData.admission_no)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Admission number already exists' },
          { status: 400 }
        );
      }
    }

    // Update student (don't allow updating school_code)
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update({
        admission_no: updateData.admission_no,
        student_name: updateData.student_name,
        class: updateData.class,
        section: updateData.section,
        date_of_birth: updateData.date_of_birth || null,
        gender: updateData.gender || null,
        parent_name: updateData.parent_name || null,
        parent_phone: updateData.parent_phone || null,
        parent_email: updateData.parent_email || null,
        address: updateData.address || null,
        status: updateData.status || 'active',
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update student', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedStudent }, { status: 200 });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

