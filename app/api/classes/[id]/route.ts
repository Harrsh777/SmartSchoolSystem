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

    // Fetch class with teacher details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        class_teacher:staff!classes_class_teacher_id_fkey(id, full_name, staff_id)
      `)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: classData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class:', error);
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
    const { school_code, class_teacher_id, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify class belongs to this school
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('id, school_code')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Build update object
    interface UpdateObject extends Record<string, unknown> {
      updated_at?: string;
    }
    const updateObject: UpdateObject = {
      ...updateData,
    };

    // If class_teacher_id is provided, update it (can be null to remove teacher)
    if (class_teacher_id !== undefined) {
      if (class_teacher_id) {
        // Verify the teacher belongs to the same school and get staff_id
        const { data: teacher, error: teacherError } = await supabase
          .from('staff')
          .select('id, staff_id, role, school_code')
          .eq('id', class_teacher_id)
          .eq('school_code', school_code)
          .eq('role', 'Teacher')
          .single();

        if (teacherError || !teacher) {
          return NextResponse.json(
            { error: 'Invalid teacher. Must be a Teacher role from the same school.' },
            { status: 400 }
          );
        }
        // Also set the staff_id for easier querying
        updateObject.class_teacher_id = class_teacher_id;
        updateObject.class_teacher_staff_id = teacher.staff_id;
      } else {
        // Remove teacher assignment
        updateObject.class_teacher_id = null;
        updateObject.class_teacher_staff_id = null;
      }
    }

    // Update class
    const { data: updatedClass, error: updateError } = await supabase
      .from('classes')
      .update(updateObject)
      .eq('id', id)
      .eq('school_code', school_code)
      .select(`
        *,
        class_teacher:staff!classes_class_teacher_id_fkey(id, full_name, staff_id)
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update class', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedClass }, { status: 200 });
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if class has students (count not used but kept for future use)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .not('class', 'is', null)
      .not('section', 'is', null);

    // For now, we'll allow deletion if no students exist
    // You can add more checks here

    // Delete class
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete class', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Class deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
