import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';
import {
  normalizeStatusForDisplay,
  normalizeStatusForStorage,
  tallyCopyCheckingStatuses,
  workTypeFromClient,
  workTypeToDb,
  workTypeToClient,
} from '@/lib/copy-checking-normalize';
import { assertCopyCheckingWriteAllowed } from '@/lib/copy-checking-write-scope';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const section = searchParams.get('section');
    const subjectId = searchParams.get('subject_id');
    const workDate = searchParams.get('work_date');
    const workTypeRaw = searchParams.get('work_type');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode || !classId || !subjectId || !workDate || !workTypeRaw) {
      return NextResponse.json(
        { error: 'School code, class ID, subject ID, work date, and work type are required' },
        { status: 400 }
      );
    }

    const workTypeDb = workTypeFromClient(workTypeRaw);

    const supabase = getServiceRoleClient();

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found', details: classError?.message },
        { status: 404 }
      );
    }

    const classLabel = String(classData.class ?? '').trim();
    if (!classLabel) {
      return NextResponse.json(
        { error: 'Class has no class label' },
        { status: 400 }
      );
    }

    const sectionFilter = section || classData.section;
    const yearFilter = academicYear || classData.academic_year || '';

    let studentsQuery = supabase
      .from('students')
      .select('id, student_name, first_name, last_name, admission_no, roll_number, class, section')
      .eq('school_code', schoolCode)
      .ilike('class', classLabel);

    if (sectionFilter) {
      studentsQuery = studentsQuery.ilike('section', String(sectionFilter).trim());
    }

    if (yearFilter) {
      studentsQuery = studentsQuery.or(`academic_year.eq.${yearFilter},academic_year.is.null`);
    }

    const { data: students, error: studentsError } = await studentsQuery
      .order('roll_number', { ascending: true });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    let recordsQuery = supabase
      .from('copy_checking')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('work_date', workDate)
      .eq('work_type', workTypeDb);

    if (sectionFilter) {
      recordsQuery = recordsQuery.eq('section', sectionFilter);
    }

    if (academicYear) {
      recordsQuery = recordsQuery.eq('academic_year', academicYear);
    }

    const { data: existingRecords, error: recordsError } = await recordsQuery;

    if (recordsError) {
      console.error('Error fetching copy checking records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch copy checking records', details: recordsError.message },
        { status: 500 }
      );
    }

    interface CopyCheckingRecord {
      student_id: string;
      status?: string;
      remarks?: string;
      topic?: string;
    }

    interface Student {
      id: string;
      student_name: string;
      first_name?: string | null;
      last_name?: string | null;
      admission_no: string;
      roll_number: string;
      class: string;
      section: string;
    }

    const recordsMap = new Map<string, CopyCheckingRecord>();
    (existingRecords || []).forEach((record: CopyCheckingRecord) => {
      recordsMap.set(record.student_id, record);
    });

    const studentsWithRecords = (students || []).map((student: Student) => {
      const record = recordsMap.get(student.id);
      const rawStatus = record?.status;
      const status = normalizeStatusForDisplay(rawStatus);
      return {
        ...student,
        copy_checking: record || null,
        status,
        remarks: record?.remarks || '',
        topic: record?.topic || null,
      };
    });

    const stats = tallyCopyCheckingStatuses(studentsWithRecords.map((s) => s.status));

    return NextResponse.json(
      {
        data: studentsWithRecords,
        statistics: stats,
        topic: existingRecords?.[0]?.topic || null,
        work_type_client: workTypeToClient(workTypeDb),
      },
      { status: 200 }
    );
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
      records,
      marked_by,
      teacher_copy_scoped,
    } = body;

    if (!school_code || !class_id || !subject_id || !work_date || !work_type || !records || !marked_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const scoped = Boolean(teacher_copy_scoped);
    const scopeGate = await assertCopyCheckingWriteAllowed(
      school_code,
      String(marked_by),
      String(class_id),
      String(subject_id),
      scoped
    );
    if (!scopeGate.ok) {
      return NextResponse.json({ error: scopeGate.error }, { status: scopeGate.status });
    }

    const workTypeDb = workTypeToDb(work_type);

    const supabase = getServiceRoleClient();

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

    interface RecordInput {
      student_id: string;
      status?: string;
      remarks?: string;
    }

    const upsertPromises = (records as RecordInput[]).map((record: RecordInput) => {
      const statusStored = normalizeStatusForStorage(record.status);
      return supabase
        .from('copy_checking')
        .upsert(
          {
            school_id: school.id,
            school_code,
            academic_year: academic_year || new Date().getFullYear().toString(),
            class_id,
            section: section || null,
            subject_id,
            subject_name,
            work_date,
            work_type: workTypeDb,
            topic: topic || null,
            student_id: record.student_id,
            status: statusStored,
            remarks: record.remarks || null,
            marked_by,
          },
          {
            onConflict: 'student_id,work_date,work_type,subject_id,class_id,school_code',
          }
        );
    });

    const results = await Promise.all(upsertPromises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      console.error('Error saving copy checking records:', errors);
      return NextResponse.json(
        { error: 'Failed to save some records', details: errors[0].error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Copy checking records saved successfully',
        saved_count: records.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving copy checking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
