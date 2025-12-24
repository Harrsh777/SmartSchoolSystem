import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, students } = body;

    if (!school_code || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
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

    const schoolId = schoolData.id;
    const currentYear = new Date().getFullYear().toString();

    // Check for existing admission numbers
    const admissionNos = students.map((s: any) => s.admission_no).filter(Boolean);
    const { data: existingStudents } = await supabase
      .from('students')
      .select('admission_no')
      .eq('school_code', school_code)
      .in('admission_no', admissionNos);

    const existingAdmissionNos = new Set(
      existingStudents?.map(s => s.admission_no) || []
    );

    // Prepare students for insertion with school_code
    const studentsToInsert = students
      .filter((s: any) => !existingAdmissionNos.has(s.admission_no))
      .map((student: any) => ({
        school_id: schoolId,
        school_code: school_code,
        admission_no: student.admission_no,
        student_name: student.student_name,
        class: student.class,
        section: student.section,
        date_of_birth: student.date_of_birth || null,
        gender: student.gender || null,
        parent_name: student.parent_name || null,
        parent_phone: student.parent_phone || null,
        parent_email: student.parent_email || null,
        address: student.address || null,
        academic_year: currentYear,
        status: 'active',
      }));

    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Insert in batches
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('students')
        .insert(batch);

      if (insertError) {
        // Handle batch errors
        batch.forEach((_, idx) => {
          errors.push({
            row: i + idx + 1,
            error: insertError.message,
          });
          failedCount++;
        });
      } else {
        successCount += batch.length;
      }
    }

    // Add errors for duplicates
    students.forEach((student: any, idx: number) => {
      if (existingAdmissionNos.has(student.admission_no)) {
        errors.push({
          row: idx + 1,
          error: 'Admission number already exists',
        });
        failedCount++;
      }
    });

    return NextResponse.json({
      total: students.length,
      success: successCount,
      failed: failedCount,
      errors,
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json(
      { error: 'Failed to import students', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

