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

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Fetch exams
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (examsError) {
      return NextResponse.json(
        { error: 'Failed to fetch exams', details: examsError.message },
        { status: 500 }
      );
    }

    // Get schedule counts for each exam
    const examsWithCounts = await Promise.all(
      (exams || []).map(async (exam) => {
        const { count } = await supabase
          .from('exam_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        return {
          ...exam,
          schedule_count: count || 0,
        };
      })
    );

    return NextResponse.json({ data: examsWithCounts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, name, academic_year, start_date, end_date, description } = body;

    if (!school_code || !name || !academic_year || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'School code, name, academic year, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('exams')
      .select('id')
      .eq('school_code', school_code)
      .eq('name', name)
      .eq('academic_year', academic_year)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An exam with this name already exists for this academic year' },
        { status: 400 }
      );
    }

    // Insert exam
    const { data: newExam, error: insertError } = await supabase
      .from('exams')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name,
        academic_year: academic_year,
        start_date: start_date,
        end_date: end_date,
        status: 'draft',
        description: description || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create exam', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newExam }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

