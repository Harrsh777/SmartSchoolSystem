import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get examinations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const status = searchParams.get('status');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('examinations')
      .select(`
        *,
        class:class_id (
          id,
          class,
          section,
          academic_year
        ),
        created_by_staff:created_by (
          id,
          full_name,
          staff_id
        ),
        exam_subjects:exam_subjects (
          id,
          subject_id,
          max_marks,
          subject:subjects (
            id,
            name,
            color
          )
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (classId) {
      query = query.eq('class_id', classId);
    }

    // Handle status filter - we'll do client-side filtering if columns don't exist
    // Note: We'll apply status filter after fetching to handle missing columns gracefully

    const { data: examinations, error } = await query;

    if (error) {
      console.error('Examinations query error:', error);
      // If error is due to missing columns, return empty array instead of error
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch examinations', details: error.message },
        { status: 500 }
      );
    }

    // Calculate subjects count and total max marks
    interface ExamWithSubjects {
      exam_subjects?: Array<{ max_marks: number }>;
      name?: string;
      exam_name?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
      [key: string]: unknown;
    }
    
    let enrichedExams = (examinations || []).map((exam: ExamWithSubjects) => ({
      ...exam,
      name: exam.name || exam.exam_name || 'Exam',
      subjects_count: exam.exam_subjects?.length || 0,
      total_max_marks: exam.exam_subjects?.reduce((sum: number, es: { max_marks: number }) => sum + (es.max_marks || 0), 0) || 0,
    }));

    // If status filter was 'upcoming', do additional client-side filtering
    if (status === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      enrichedExams = enrichedExams.filter((exam: ExamWithSubjects) => {
        if (!exam.start_date) return false;
        const examDate = new Date(exam.start_date);
        examDate.setHours(0, 0, 0, 0);
        return examDate >= today && (exam.status === 'upcoming' || exam.status === 'ongoing' || !exam.status);
      });
    }

    return NextResponse.json({ data: enrichedExams || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching examinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create examination
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      class_id,
      name,
      exam_type,
      subjects, // Array of { subject_id, max_marks }
      created_by,
    } = body;

    if (!school_code || !class_id || !name || !subjects || !Array.isArray(subjects) || subjects.length === 0 || !created_by) {
      return NextResponse.json(
        { error: 'School code, class ID, name, subjects, and created_by are required' },
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

    // Calculate total max marks
    interface SubjectInput {
      max_marks: string | number;
    }
    const totalMaxMarks = subjects.reduce((sum: number, s: SubjectInput) => sum + (parseInt(String(s.max_marks)) || 0), 0);

    // Create examination
    const { data: examination, error: examError } = await supabase
      .from('examinations')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        class_id: class_id,
        name: name.trim(),
        exam_type: exam_type || null,
        total_max_marks: totalMaxMarks,
        created_by: created_by,
      }])
      .select()
      .single();

    if (examError || !examination) {
      return NextResponse.json(
        { error: 'Failed to create examination', details: examError?.message },
        { status: 500 }
      );
    }

    // Create exam subjects
    const examSubjects = subjects.map((s: SubjectInput & { subject_id: string }) => ({
      exam_id: examination.id,
      subject_id: s.subject_id,
      max_marks: parseInt(String(s.max_marks || '0')) || 0,
    }));

    const { data: insertedSubjects, error: subjectsError } = await supabase
      .from('exam_subjects')
      .insert(examSubjects)
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color
        )
      `);

    if (subjectsError) {
      // Rollback examination creation
      await supabase.from('examinations').delete().eq('id', examination.id);
      return NextResponse.json(
        { error: 'Failed to create exam subjects', details: subjectsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...examination,
        exam_subjects: insertedSubjects || [],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating examination:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
