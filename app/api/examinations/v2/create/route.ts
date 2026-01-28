import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_name,
      academic_year,
      start_date,
      end_date,
      description,
      class_mappings,
      class_subjects,
      schedules,
      created_by,
    } = body;

    console.log('Received examination creation request:', {
      school_code,
      exam_name,
      academic_year,
      class_mappings_count: class_mappings?.length || 0,
      class_subjects_count: class_subjects?.length || 0,
      schedules_count: schedules?.length || 0,
    });

    // Validation
    if (!school_code || !exam_name || !academic_year || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!class_mappings || !Array.isArray(class_mappings) || class_mappings.length === 0) {
      return NextResponse.json(
        { error: 'At least one class must be selected' },
        { status: 400 }
      );
    }

    if (!class_subjects || !Array.isArray(class_subjects) || class_subjects.length === 0) {
      return NextResponse.json(
        { error: 'At least one subject must be mapped' },
        { status: 400 }
      );
    }

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: 'At least one schedule must be provided' },
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

    // Create examination with status DRAFT — but fall back gracefully if DB restricts status values
    const baseInsert = {
      school_id: schoolData.id,
      school_code: school_code,
      exam_name: exam_name.trim(),
      academic_year: academic_year.trim(),
      start_date: start_date,
      end_date: end_date,
      description: description || null,
      is_published: false,
      created_by: created_by || null,
    };

    let examination: { id: string; exam_name?: string; status?: string; [key: string]: unknown } | null = null;
    let examError: { message?: string; code?: string; hint?: string } | null = null;

    // Attempt #1: draft (desired flow)
    {
      const attempt = await supabase
        .from('examinations')
        .insert([{ ...baseInsert, status: 'draft' }])
        .select()
        .single();
      examination = attempt.data;
      examError = attempt.error as { message?: string; code?: string; hint?: string } | null;
    }

    // Attempt #2: fallback to upcoming if draft not allowed by DB enum/check
    if (examError || !examination) {
      console.error('Error creating examination (draft attempt):', examError);
      const attempt = await supabase
        .from('examinations')
        .insert([{ ...baseInsert, status: 'upcoming' }])
        .select()
        .single();
      examination = attempt.data;
      examError = attempt.error as { message?: string; code?: string; hint?: string } | null;
    }

    if (examError || !examination) {
      console.error('Error creating examination:', examError);
      return NextResponse.json(
        {
          error: 'Failed to create examination',
          details: examError?.message,
          code: examError?.code,
          hint: examError?.hint,
        },
        { status: 500 }
      );
    }

    // Create class mappings
    const classMappingInserts = [];
    for (const classMapping of class_mappings) {
      for (const sectionId of classMapping.sections) {
        classMappingInserts.push({
          exam_id: examination.id,
          class_id: sectionId, // sectionId is actually the class record ID
          school_code: school_code,
        });
      }
    }

    console.log('Class mapping inserts:', JSON.stringify(classMappingInserts, null, 2));

    if (classMappingInserts.length > 0) {
      const { data: insertedMappings, error: mappingError } = await supabase
        .from('exam_class_mappings')
        .insert(classMappingInserts)
        .select();

      if (mappingError) {
        console.error('Error creating class mappings:', JSON.stringify(mappingError, null, 2));
        // Rollback examination
        await supabase.from('examinations').delete().eq('id', examination.id);
        return NextResponse.json(
          { 
            error: 'Failed to create class mappings', 
            details: mappingError.message,
            code: mappingError.code,
            hint: mappingError.hint,
          },
          { status: 500 }
        );
      }
      console.log('Class mappings created successfully:', insertedMappings?.length || 0, 'records');
    } else {
      console.warn('No class mappings to insert - this should not happen if validation passed');
      return NextResponse.json(
        { error: 'No class mappings to insert' },
        { status: 400 }
      );
    }

    // Create subject mappings with marks
    const subjectMappingInserts = [];
    for (const classSubject of class_subjects) {
      for (const subject of classSubject.subjects) {
        subjectMappingInserts.push({
          exam_id: examination.id,
          class_id: classSubject.sectionId, // sectionId is the class record ID
          subject_id: subject.subject_id,
          max_marks: subject.max_marks,
          pass_marks: subject.pass_marks,
          weightage: subject.weightage || 0,
          school_code: school_code,
        });
      }
    }

    console.log('Subject mapping inserts:', JSON.stringify(subjectMappingInserts.slice(0, 3), null, 2), `... (${subjectMappingInserts.length} total)`);

    if (subjectMappingInserts.length > 0) {
      const { data: insertedSubjects, error: subjectError } = await supabase
        .from('exam_subject_mappings')
        .insert(subjectMappingInserts)
        .select();

      if (subjectError) {
        console.error('Error creating subject mappings:', JSON.stringify(subjectError, null, 2));
        // Rollback
        await supabase.from('exam_class_mappings').delete().eq('exam_id', examination.id);
        await supabase.from('examinations').delete().eq('id', examination.id);
        return NextResponse.json(
          { 
            error: 'Failed to create subject mappings', 
            details: subjectError.message,
            code: subjectError.code,
            hint: subjectError.hint,
          },
          { status: 500 }
        );
      }
      console.log('Subject mappings created successfully:', insertedSubjects?.length || 0, 'records');
    } else {
      console.warn('No subject mappings to insert - this should not happen if validation passed');
      return NextResponse.json(
        { error: 'No subject mappings to insert' },
        { status: 400 }
      );
    }

    // Create schedules
    // Note: exam_schedules has unique constraint on (exam_id, exam_date)
    // If multiple subjects share the same date, we need to group them or use upsert
    const scheduleInserts: Array<Record<string, unknown>> = [];
    const scheduleByDate = new Map<string, Array<{ schedule: typeof schedules[0]; subject: { subject_id: string; max_marks: number } | undefined }>>();
    
    for (const schedule of schedules) {
      const classSubject = class_subjects.find(cs => cs.sectionId === schedule.sectionId);
      const subject = classSubject?.subjects.find((s: { subject_id: string }) => s.subject_id === schedule.subjectId);
      const dateKey = schedule.exam_date;
      
      if (!scheduleByDate.has(dateKey)) {
        scheduleByDate.set(dateKey, []);
      }
      scheduleByDate.get(dateKey)!.push({ schedule, subject });
    }
    
    // For each unique date, create one schedule (or combine if needed)
    for (const [date, items] of scheduleByDate.entries()) {
      const firstItem = items[0];
      scheduleInserts.push({
        exam_id: examination.id,
        school_id: schoolData.id,
        school_code: school_code,
        exam_date: date,
        start_time: firstItem.schedule.start_time,
        end_time: firstItem.schedule.end_time,
        exam_name: exam_name.trim(),
        max_marks: firstItem.subject?.max_marks || null,
      });
    }

    console.log('Schedule inserts (grouped by date):', JSON.stringify(scheduleInserts.slice(0, 3), null, 2), `... (${scheduleInserts.length} total)`);

    if (scheduleInserts.length > 0) {
      // Use upsert to handle duplicates gracefully (unique constraint on exam_id, exam_date)
      const { data: insertedSchedules, error: scheduleError } = await supabase
        .from('exam_schedules')
        .upsert(scheduleInserts, {
          onConflict: 'exam_id,exam_date',
        })
        .select();

      if (scheduleError) {
        console.error('Error creating schedules:', JSON.stringify(scheduleError, null, 2));
        // Rollback
        await supabase.from('exam_subject_mappings').delete().eq('exam_id', examination.id);
        await supabase.from('exam_class_mappings').delete().eq('exam_id', examination.id);
        await supabase.from('examinations').delete().eq('id', examination.id);
        return NextResponse.json(
          { 
            error: 'Failed to create schedules', 
            details: scheduleError.message,
            code: scheduleError.code,
            hint: scheduleError.hint,
          },
          { status: 500 }
        );
      }
      console.log('Schedules created successfully:', insertedSchedules?.length || 0, 'records');
    } else {
      console.warn('No schedules to insert - this should not happen if validation passed');
      return NextResponse.json(
        { error: 'No schedules to insert' },
        { status: 400 }
      );
    }

    // NOTE: If your DB restricts exam.status values, we fall back to 'upcoming'.

    console.log('Examination created successfully:', {
      exam_id: examination.id,
      class_mappings: classMappingInserts.length,
      subject_mappings: subjectMappingInserts.length,
      schedules: scheduleInserts.length,
    });

    return NextResponse.json({
      data: {
        id: examination.id,
        exam_name: examination.exam_name,
        status: examination.status ?? 'upcoming',
        message: 'Examination created successfully. Publish when ready for marks entry.',
        class_mappings_count: classMappingInserts.length,
        subject_mappings_count: subjectMappingInserts.length,
        schedules_count: scheduleInserts.length,
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
