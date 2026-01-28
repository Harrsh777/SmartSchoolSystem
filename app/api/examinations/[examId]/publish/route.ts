import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const { school_code } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify exam belongs to school
    const { data: exam, error: examError } = await supabase
      .from('examinations')
      .select('id, exam_name')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if schedule exists
    const { data: schedules, error: schedulesError } = await supabase
      .from('exam_schedules')
      .select('id')
      .eq('exam_id', examId)
      .eq('school_code', school_code)
      .limit(1);

    if (schedulesError) {
      return NextResponse.json(
        { error: 'Failed to check schedules', details: schedulesError.message },
        { status: 500 }
      );
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json(
        { error: 'Cannot publish exam without schedule. Please add schedule items first.' },
        { status: 400 }
      );
    }

    // Update exam to ACTIVE (published) — allows marks entry.
    // If DB restricts status values, fall back to only is_published=true.
    let updatedExam: { id: string; [key: string]: unknown } | null = null;
    let updateError: { message?: string; code?: string; hint?: string } | null = null;

    {
      const attempt = await supabase
        .from('examinations')
        .update({
          status: 'active',
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', examId)
        .eq('school_code', school_code)
        .select()
        .single();
      updatedExam = attempt.data;
      updateError = attempt.error as { message?: string; code?: string; hint?: string } | null;
    }

    if (updateError || !updatedExam) {
      console.error('Error publishing exam (active attempt):', updateError);
      const attempt = await supabase
        .from('examinations')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', examId)
        .eq('school_code', school_code)
        .select()
        .single();
      updatedExam = attempt.data;
      updateError = attempt.error as { message?: string; code?: string; hint?: string } | null;
    }

    if (updateError) {
      console.error('Error publishing exam:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish exam', details: updateError.message, code: updateError.code, hint: updateError.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Exam published successfully',
      data: updatedExam,
    }, { status: 200 });
  } catch (error) {
    console.error('Error publishing exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

