import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch examinations with all related data
    const { data: examinations, error } = await supabase
      .from('examinations')
      .select(`
        *,
        class_mappings:exam_class_mappings (
          class_id,
          class:classes (
            id,
            class,
            section
          )
        ),
        subject_mappings:exam_subject_mappings (
          class_id,
          subject_id,
          max_marks,
          pass_marks,
          weightage,
          subject:subjects (
            id,
            name,
            color
          )
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching examinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: examinations || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
