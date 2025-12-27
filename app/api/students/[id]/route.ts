import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/students/[id]
 * Get a single student by ID
 */
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

    // Fetch student
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (error || !student) {
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

/**
 * PATCH /api/students/[id]
 * Update a student by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const body = await request.json();

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify student exists and belongs to school
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('id, admission_no, school_code')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !existingStudent) {
      return NextResponse.json(
        { error: 'Student not found or access denied' },
        { status: 404 }
      );
    }

    // Check for duplicate admission number if it's being changed
    if (body.admission_no && body.admission_no !== existingStudent.admission_no) {
      const { data: duplicate } = await supabase
        .from('students')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('admission_no', body.admission_no)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Admission number already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate Aadhaar if provided and changed
    if (body.aadhaar_number) {
      const { data: duplicateAadhaar } = await supabase
        .from('students')
        .select('id')
        .eq('aadhaar_number', body.aadhaar_number)
        .neq('id', id)
        .single();

      if (duplicateAadhaar) {
        return NextResponse.json(
          { error: 'Aadhaar number already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate RFID if provided and changed
    if (body.rfid) {
      const { data: duplicateRfid } = await supabase
        .from('students')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('rfid', body.rfid)
        .neq('id', id)
        .single();

      if (duplicateRfid) {
        return NextResponse.json(
          { error: 'RFID already exists for this school' },
          { status: 400 }
        );
      }
    }

    // Prepare update data (exclude id and school_code from updates)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, school_code: _schoolCode, ...updateData } = body;

    // Update student
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating student:', updateError);
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
