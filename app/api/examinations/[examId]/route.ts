import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch examination with related data using new structure
    const { data: exam, error: examError } = await supabase
      .from('examinations')
      .select(`
        *,
        created_by_staff:created_by (
          id,
          full_name,
          staff_id
        ),
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section,
            academic_year
          )
        ),
        subject_mappings:exam_subject_mappings (
          subject_id,
          subject:subjects (
            id,
            name,
            color
          ),
          max_marks,
          pass_marks
        )
      `)
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Examination not found' },
        { status: 404 }
      );
    }

    // Transform to match expected format (for backward compatibility)
    const transformedExam = {
      ...exam,
      exam_subjects: exam.subject_mappings?.map((sm: Record<string, unknown>) => ({
        id: sm.subject_id as string,
        subject_id: sm.subject_id as string,
        max_marks: (sm.max_marks as number) || 100,
        subject: (sm.subject as Record<string, unknown>) || { id: sm.subject_id, name: 'Unknown', color: '#000000' },
      })) || [],
      class: exam.class_mappings?.[0]?.class || null,
    };

    return NextResponse.json({ data: transformedExam }, { status: 200 });
  } catch (error) {
    console.error('Error fetching examination:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify examination belongs to this school
    const { data: existingExam, error: fetchError } = await supabase
      .from('examinations')
      .select('id, school_code')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Examination not found or access denied' },
        { status: 404 }
      );
    }

    // Update examination
    const { data: updatedExam, error: updateError } = await supabase
      .from('examinations')
      .update(updateData)
      .eq('id', examId)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update examination', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedExam }, { status: 200 });
  } catch (error) {
    console.error('Error updating examination:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify examination belongs to this school
    const { data: existingExam, error: fetchError } = await supabase
      .from('examinations')
      .select('id, school_code')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Examination not found or access denied' },
        { status: 404 }
      );
    }

    // Delete related exam_subjects first (cascade may not be set up)
    await supabase
      .from('exam_subjects')
      .delete()
      .eq('exam_id', examId);

    // Delete related marks (student_subject_marks table)
    await supabase
      .from('student_subject_marks')
      .delete()
      .eq('exam_id', examId);

    // Delete related exam summary records
    await supabase
      .from('student_exam_summary')
      .delete()
      .eq('exam_id', examId);

    // Delete the examination
    const { error: deleteError } = await supabase
      .from('examinations')
      .delete()
      .eq('id', examId)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete examination', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Examination deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting examination:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


