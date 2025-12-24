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

    // Fetch exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: exam }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam:', error);
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

    // Verify exam belongs to this school
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('id, school_code')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (updateData.start_date && updateData.end_date) {
      const start = new Date(updateData.start_date);
      const end = new Date(updateData.end_date);

      if (start > end) {
        return NextResponse.json(
          { error: 'Start date must be before or equal to end date' },
          { status: 400 }
        );
      }
    }

    // Update exam
    const { data: updatedExam, error: updateError } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update exam', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedExam }, { status: 200 });
  } catch (error) {
    console.error('Error updating exam:', error);
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

    // Verify exam belongs to this school
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('id, school_code')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      );
    }

    // Check if exam has schedules
    const { count } = await supabase
      .from('exam_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId);

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete exam. It has ${count} schedule(s). Please delete schedules first.`,
        },
        { status: 400 }
      );
    }

    // Delete exam
    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete exam', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Exam deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


