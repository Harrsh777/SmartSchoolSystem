import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const workDate = searchParams.get('work_date');
    const workType = searchParams.get('work_type'); // 'class_work' or 'homework'

    if (!schoolCode || !classId || !subjectId || !workDate || !workType) {
      return NextResponse.json(
        { error: 'School code, class ID, subject ID, work date, and work type are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get students for the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, roll_number, class, section')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .order('roll_number', { ascending: true, nullsLast: true });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get existing copy checking records
    const { data: existingRecords, error: recordsError } = await supabase
      .from('copy_checking')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('work_date', workDate)
      .eq('work_type', workType);

    if (recordsError) {
      console.error('Error fetching copy checking records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch copy checking records', details: recordsError.message },
        { status: 500 }
      );
    }

    // Map existing records by student_id
    const recordsMap = new Map();
    (existingRecords || []).forEach((record: any) => {
      recordsMap.set(record.student_id, record);
    });

    // Combine students with their copy checking records
    const studentsWithRecords = (students || []).map((student: any) => {
      const record = recordsMap.get(student.id);
      return {
        ...student,
        copy_checking: record || null,
        status: record?.status || 'not_marked',
        remarks: record?.remarks || '',
        topic: record?.topic || null,
      };
    });

    // Calculate statistics
    const stats = {
      green: 0,
      yellow: 0,
      red: 0,
      not_marked: 0,
    };

    studentsWithRecords.forEach((student: any) => {
      if (student.status === 'green') stats.green++;
      else if (student.status === 'yellow') stats.yellow++;
      else if (student.status === 'red') stats.red++;
      else stats.not_marked++;
    });

    return NextResponse.json({
      data: studentsWithRecords,
      statistics: stats,
      topic: existingRecords?.[0]?.topic || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching copy checking data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      academic_year,
      class_id,
      section,
      subject_id,
      subject_name,
      work_date,
      work_type,
      topic,
      records, // Array of { student_id, status, remarks }
      marked_by,
    } = body;

    if (!school_code || !class_id || !subject_id || !work_date || !work_type || !records || !marked_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get school_id
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Upsert records for each student
    const upsertPromises = records.map((record: any) => {
      return supabase
        .from('copy_checking')
        .upsert({
          school_id: school.id,
          school_code,
          academic_year: academic_year || new Date().getFullYear().toString(),
          class_id,
          section: section || null,
          subject_id,
          subject_name,
          work_date,
          work_type,
          topic: topic || null,
          student_id: record.student_id,
          status: record.status || 'not_marked',
          remarks: record.remarks || null,
          marked_by,
        }, {
          onConflict: 'student_id,work_date,work_type,subject_id,class_id,school_code',
        });
    });

    const results = await Promise.all(upsertPromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Error saving copy checking records:', errors);
      return NextResponse.json(
        { error: 'Failed to save some records', details: errors[0].error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Copy checking records saved successfully',
      saved_count: records.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving copy checking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

