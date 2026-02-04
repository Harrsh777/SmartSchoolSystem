import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

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

    // Get allowed class/section/academic_year from the school's Classes module (only these can be imported)
    const { data: existingClasses, error: classesError } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('school_code', school_code);

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to load classes', details: classesError.message },
        { status: 500 }
      );
    }

    // Map normalized key (case-insensitive) -> canonical { class, section, academic_year } from Classes table
    const classKeyToCanonical = new Map<string, { class: string; section: string; academic_year: string }>();
    for (const c of existingClasses ?? []) {
      const key = `${String(c.class).toUpperCase().trim()}-${String(c.section).toUpperCase().trim()}-${String(c.academic_year ?? '').trim()}`;
      classKeyToCanonical.set(key, {
        class: String(c.class ?? '').trim(),
        section: String(c.section ?? '').trim(),
        academic_year: String(c.academic_year ?? '').trim() || currentYear,
      });
    }

    if (classKeyToCanonical.size === 0) {
      return NextResponse.json(
        { error: 'No classes found. Create classes in the Classes module first, then import students.' },
        { status: 400 }
      );
    }

    // Check for existing admission numbers
    interface StudentInput {
      admission_no: string;
      class?: unknown;
      section?: unknown;
      academic_year?: unknown;
      [key: string]: unknown;
    }
    const admissionNos = students.map((s: StudentInput) => s.admission_no).filter(Boolean);
    const { data: existingStudents } = await supabase
      .from('students')
      .select('admission_no')
      .eq('school_code', school_code)
      .in('admission_no', admissionNos);

    const existingAdmissionNos = new Set(
      existingStudents?.map(s => s.admission_no) || []
    );

    // Get existing students without passwords (for password generation)
    interface StudentWithAdmission {
      admission_no?: string;
      [key: string]: unknown;
    }
    const allAdmissionNos = students.map((s: StudentWithAdmission) => s.admission_no).filter(Boolean);
    const { data: existingLogins } = await supabase
      .from('student_login')
      .select('admission_no')
      .eq('school_code', school_code)
      .in('admission_no', allAdmissionNos);

    const existingLoginAdmissionNos = new Set(
      existingLogins?.map(l => l.admission_no) || []
    );

    const errors: Array<{ row: number; error: string }> = [];
    let failedCount = 0;

    // Build list of students to insert: only those with non-duplicate admission_no AND class/section that exists in Classes
    const studentsToInsert: Array<Record<string, unknown>> = [];
    students.forEach((student: StudentInput, idx: number) => {
      const row = idx + 1;
      if (existingAdmissionNos.has(student.admission_no)) {
        errors.push({ row, error: 'Admission number already exists' });
        failedCount++;
        return;
      }
      const cls = student.class != null ? String(student.class).trim() : '';
      const sec = student.section != null ? String(student.section).trim() : '';
      const year = (student.academic_year != null ? String(student.academic_year).trim() : null) || currentYear;
      if (!cls || !sec) {
        errors.push({ row, error: 'Class and section are required' });
        failedCount++;
        return;
      }
      const classKey = `${cls.toUpperCase()}-${sec.toUpperCase()}-${year}`;
      const canonical = classKeyToCanonical.get(classKey);
      if (!canonical) {
        errors.push({
          row,
          error: `Class/section "${cls}-${sec}" (year ${year}) not found. Create it in Classes first.`,
        });
        failedCount++;
        return;
      }
      studentsToInsert.push({
        _importRow: row,
        school_id: schoolId,
        school_code: school_code,
        admission_no: student.admission_no,
        student_name: student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        first_name: student.first_name || null,
        last_name: student.last_name || null,
        class: canonical.class,
        section: canonical.section,
        date_of_birth: student.date_of_birth || null,
        gender: student.gender || null,
        address: student.address || null,
        city: student.city || null,
        state: student.state || null,
        pincode: student.pincode || null,
        aadhaar_number: student.aadhaar_number || null,
        email: student.email || null,
        student_contact: student.student_contact || null,
        blood_group: student.blood_group || null,
        sr_no: student.sr_no || null,
        date_of_admission: student.date_of_admission || null,
        religion: student.religion || null,
        category: student.category || null,
        nationality: student.nationality || 'Indian',
        house: student.house || null,
        last_class: student.last_class || null,
        last_school_name: student.last_school_name || null,
        last_school_percentage: student.last_school_percentage || null,
        last_school_result: student.last_school_result || null,
        medium: student.medium || null,
        schooling_type: student.schooling_type || null,
        roll_number: student.roll_number || null,
        rfid: student.rfid || null,
        pen_no: student.pen_no || null,
        apaar_no: student.apaar_no || null,
        rte: student.rte ?? false,
        new_admission: student.new_admission ?? true,
        father_name: student.father_name || null,
        father_occupation: student.father_occupation || null,
        father_contact: student.father_contact || null,
        mother_name: student.mother_name || null,
        mother_occupation: student.mother_occupation || null,
        mother_contact: student.mother_contact || null,
        staff_relation: student.staff_relation || null,
        transport_type: student.transport_type || null,
        parent_name: student.father_name || student.mother_name || student.parent_name || null,
        parent_phone: student.father_contact || student.mother_contact || student.parent_phone || null,
        parent_email: student.parent_email || null,
        academic_year: canonical.academic_year,
        status: 'active',
      });
    });

    let successCount = 0;
    const generatedPasswords: Array<{ admission_no: string; password: string }> = [];

    // Insert in batches and generate passwords (strip _importRow before insert)
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE);
      const batchForDb = batch.map(({ _importRow: _r, ...s }) => s) as Record<string, unknown>[];

      const { error: insertError, data: insertedStudents } = await supabase
        .from('students')
        .insert(batchForDb)
        .select('admission_no');

      if (insertError) {
        batch.forEach((s: Record<string, unknown>) => {
          errors.push({
            row: (s._importRow as number) ?? i + 1,
            error: insertError.message,
          });
          failedCount++;
        });
      } else {
        successCount += batch.length;
        
        // Generate passwords for successfully inserted students
        const loginRecords = [];
        for (const student of insertedStudents || []) {
          const { password, hashedPassword } = await generateAndHashPassword();
          loginRecords.push({
            school_code: school_code,
            admission_no: student.admission_no,
            password_hash: hashedPassword,
            plain_password: password, // Store plain text password
            is_active: true,
          });
          generatedPasswords.push({
            admission_no: student.admission_no,
            password: password,
          });
        }
        
        // Insert login records
        if (loginRecords.length > 0) {
          const { error: loginInsertError } = await supabase
            .from('student_login')
            .insert(loginRecords);
          
          if (loginInsertError) {
            console.error('Error inserting student login records:', loginInsertError);
            // Don't fail the entire import, but log the error
            // Passwords can be regenerated later if needed
          }
        }
      }
    }

    // Generate passwords for existing students without passwords
    const existingStudentsWithoutPasswords = students
      .filter((s: StudentInput) => 
        existingAdmissionNos.has(s.admission_no) && 
        !existingLoginAdmissionNos.has(s.admission_no)
      );

    for (const student of existingStudentsWithoutPasswords) {
      try {
        const { password, hashedPassword } = await generateAndHashPassword();
        const { error: loginInsertError } = await supabase
          .from('student_login')
          .insert({
            school_code: school_code,
            admission_no: student.admission_no,
            password_hash: hashedPassword,
            plain_password: password, // Store plain text password
            is_active: true,
          });
        
        if (loginInsertError) {
          // Check if it's a duplicate (already exists)
          if (loginInsertError.code === '23505') {
            console.log(`Password already exists for student ${student.admission_no}, skipping`);
          } else {
            console.error(`Error generating password for ${student.admission_no}:`, loginInsertError);
          }
        } else {
          generatedPasswords.push({
            admission_no: student.admission_no,
            password: password,
          });
        }
      } catch (err) {
        console.error(`Error generating password for ${student.admission_no}:`, err);
      }
    }

    return NextResponse.json({
      total: students.length,
      success: successCount,
      failed: failedCount,
      errors,
      passwords: generatedPasswords,
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json(
      { error: 'Failed to import students', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

