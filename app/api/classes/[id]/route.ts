import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';

function normalizeSchoolCode(code: string | null | undefined): string {
  return String(code ?? '')
    .trim()
    .toUpperCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = String(rawId ?? '').trim();
    const searchParams = request.nextUrl.searchParams;
    const schoolCodeRaw = searchParams.get('school_code');
    const schoolCodeNorm = normalizeSchoolCode(schoolCodeRaw);

    if (!schoolCodeNorm) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Class id is required' }, { status: 400 });
    }

    // Fetch by id first (school_code in DB may differ by case/whitespace from query param)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        class_teacher:staff!classes_class_teacher_id_fkey(id, full_name, staff_id)
      `)
      .eq('id', id)
      .maybeSingle();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    if (normalizeSchoolCode(classData.school_code as string) !== schoolCodeNorm) {
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
    const { id: rawId } = await params;
    const id = String(rawId ?? '').trim();
    const body = await request.json();
    const { school_code, class_teacher_id, academic_year, academic_year_id, ...updateData } = body;

    const schoolCodeNorm = normalizeSchoolCode(school_code);
    if (!schoolCodeNorm) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Class id is required' }, { status: 400 });
    }

    // Verify class belongs to this school (select * so missing optional columns e.g. academic_year_id don't break the query)
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existingClass) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    if (normalizeSchoolCode(existingClass.school_code as string) !== schoolCodeNorm) {
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

    // Academic year can only be changed via Academic Year Management.
    if (academic_year || academic_year_id) {
      return NextResponse.json(
        { error: 'Academic year can only be changed from Academic Year Management module.' },
        { status: 400 }
      );
    }

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    const ec = existingClass as Record<string, unknown>;
    const yearIdToCheck =
      (updateObject.academic_year_id as string | undefined) ??
      (ec.academic_year_id != null ? String(ec.academic_year_id) : null);
    const lockCheck = await assertAcademicYearNotLocked({
      schoolCode: schoolCodeNorm,
      academic_year_id: yearIdToCheck,
      academic_year: ec.academic_year != null ? String(ec.academic_year) : null,
      adminOverride,
    });
    if (lockCheck) return lockCheck;

    // If class_teacher_id is provided, update it (can be null to remove teacher)
    if (class_teacher_id !== undefined) {
      if (class_teacher_id) {
        // Verify the teacher belongs to the same school and get staff_id
        const { data: teacher, error: teacherError } = await supabase
          .from('staff')
          .select('id, staff_id, role, school_code')
          .eq('id', class_teacher_id)
          .eq('school_code', existingClass.school_code as string)
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
      .eq('school_code', existingClass.school_code as string)
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
    if (error instanceof Error && error.message === 'ACADEMIC_YEAR_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }
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
    const { id: rawId } = await params;
    const id = String(rawId ?? '').trim();
    const searchParams = request.nextUrl.searchParams;
    const schoolCodeNorm = normalizeSchoolCode(searchParams.get('school_code'));

    if (!schoolCodeNorm) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Class id is required' }, { status: 400 });
    }

    // Load by id; use * so we never request a column that doesn't exist on older DBs (would error → false "not found")
    const { data: classRow, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (classError || !classRow) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    if (normalizeSchoolCode(classRow.school_code as string) !== schoolCodeNorm) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const rowSchoolCode = String(classRow.school_code ?? '');
    const cr = classRow as Record<string, unknown>;

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    const lockCheck = await assertAcademicYearNotLocked({
      schoolCode: schoolCodeNorm,
      academic_year_id: cr.academic_year_id != null ? String(cr.academic_year_id) : null,
      academic_year: cr.academic_year != null ? String(cr.academic_year) : null,
      adminOverride,
    });
    if (lockCheck) return lockCheck;

    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', rowSchoolCode)
      .eq('class', classRow.class)
      .eq('section', classRow.section ?? '');

    if (studentCount && studentCount > 0) {
      return NextResponse.json(
        { error: 'Delete all students from this class first, then you can delete this class.' },
        { status: 400 }
      );
    }

    // Delete class (use row's school_code so filter matches the stored value exactly)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('school_code', rowSchoolCode);

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
