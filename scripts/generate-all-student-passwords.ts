/**
 * One-time script to generate passwords for all existing students
 * This script reads all students from the database and generates passwords
 * for those who don't have passwords in the student_login table.
 * 
 * Run this via API endpoint: POST /api/admin/generate-passwords-all
 * Or use the Admin Dashboard UI
 */

import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

export async function generatePasswordsForAllStudents() {
  try {
    console.log('Starting password generation for all students...');

    // Get all active students
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, school_code, admission_no, student_name, status')
      .eq('status', 'active');

    if (studentsError) {
      throw new Error(`Error fetching students: ${studentsError.message}`);
    }

    if (!allStudents || allStudents.length === 0) {
      console.log('No students found in the database.');
      return {
        total: 0,
        processed: 0,
        created: 0,
        skipped: 0,
        errors: [],
      };
    }

    console.log(`Found ${allStudents.length} active students`);

    // Get all existing logins
    const admissionNos = allStudents
      .map(s => s.admission_no)
      .filter(Boolean) as string[];

    if (admissionNos.length === 0) {
      console.log('No admission numbers found.');
      return {
        total: 0,
        processed: 0,
        created: 0,
        skipped: 0,
        errors: [],
      };
    }

    // Group by school_code for batch processing
    const studentsBySchool = allStudents.reduce((acc, student) => {
      if (!student.school_code) {
        console.warn(`Student ${student.admission_no} has no school_code, skipping`);
        return acc;
      }
      if (!acc[student.school_code]) {
        acc[student.school_code] = [];
      }
      acc[student.school_code].push(student);
      return acc;
    }, {} as Record<string, typeof allStudents>);

    // Get existing logins for each school
    const existingLoginsBySchool: Record<string, Set<string>> = {};
    
    for (const schoolCode of Object.keys(studentsBySchool)) {
      const schoolAdmissionNos = studentsBySchool[schoolCode]
        .map(s => s.admission_no)
        .filter(Boolean) as string[];

      if (schoolAdmissionNos.length > 0) {
        const { data: existingLogins } = await supabase
          .from('student_login')
          .select('admission_no')
          .eq('school_code', schoolCode)
          .in('admission_no', schoolAdmissionNos);

        existingLoginsBySchool[schoolCode] = new Set(
          existingLogins?.map(l => l.admission_no) || []
        );
      }
    }

    // Process students in batches
    const BATCH_SIZE = 50;
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: Array<{ admission_no: string; error: string }> = [];

    for (const [schoolCode, students] of Object.entries(studentsBySchool)) {
      const existingLogins = existingLoginsBySchool[schoolCode] || new Set();
      
      // Filter students without passwords
      const studentsToProcess = students.filter(
        s => !existingLogins.has(s.admission_no)
      );

      console.log(`Processing ${studentsToProcess.length} students for school ${schoolCode}...`);

      // Process in batches
      for (let i = 0; i < studentsToProcess.length; i += BATCH_SIZE) {
        const batch = studentsToProcess.slice(i, i + BATCH_SIZE);
        const loginRecords = [];

        for (const student of batch) {
          try {
            if (!student.school_code || !student.admission_no) {
              errors.push({
                admission_no: student.admission_no || 'unknown',
                error: 'Missing school_code or admission_no',
              });
              continue;
            }

            const {hashedPassword } = await generateAndHashPassword();
            loginRecords.push({
              school_code: student.school_code,
              admission_no: student.admission_no,
              password_hash: hashedPassword,
              is_active: true,
            });

            totalProcessed++;
          } catch (err) {
            errors.push({
              admission_no: student.admission_no || 'unknown',
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }

        // Insert batch
        if (loginRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('student_login')
            .insert(loginRecords);

          if (insertError) {
            // Handle individual errors
            if (insertError.code === '23505') {
              // Duplicate - some might have been created between check and insert
              totalSkipped += loginRecords.length;
              console.log(`Skipped ${loginRecords.length} duplicate entries for school ${schoolCode}`);
            } else {
              // Other errors
              errors.push({
                admission_no: 'batch',
                error: `Batch insert error for school ${schoolCode}: ${insertError.message}`,
              });
              console.error(`Error inserting batch for school ${schoolCode}:`, insertError);
            }
          } else {
            totalCreated += loginRecords.length;
            console.log(`Created ${loginRecords.length} passwords for school ${schoolCode}`);
          }
        }
      }

      // Count skipped (students that already have passwords)
      const skippedCount = students.length - studentsToProcess.length;
      totalSkipped += skippedCount;
      if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} students (already have passwords) for school ${schoolCode}`);
      }
    }

    const result = {
      total: allStudents.length,
      processed: totalProcessed,
      created: totalCreated,
      skipped: totalSkipped,
      errors,
    };

    console.log('Password generation completed:', result);
    return result;
  } catch (error) {
    console.error('Error generating passwords for students:', error);
    throw error;
  }
}

