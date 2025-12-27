import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code } = body; // Optional: if not provided, processes all schools

    interface PasswordGenerationResult {
      school_name: string;
      students: { processed: number; created: number; errors?: string[] };
      staff: { processed: number; created: number; errors?: string[] };
      passwords?: Array<{ type: string; id: string; password: string }>;
    }
    const results: Record<string, PasswordGenerationResult> = {};

    // Get all schools or specific school
    let schoolsQuery = supabase
      .from('accepted_schools')
      .select('id, school_code, school_name');

    if (school_code) {
      schoolsQuery = schoolsQuery.eq('school_code', school_code);
    }

    const { data: schools, error: schoolsError } = await schoolsQuery;

    if (schoolsError || !schools || schools.length === 0) {
      return NextResponse.json(
        { error: 'No schools found' },
        { status: 404 }
      );
    }

    // Process each school
    for (const school of schools) {
      const schoolCode = school.school_code;
      results[schoolCode] = {
        school_name: school.school_name,
        students: { processed: 0, created: 0, errors: [] as string[] },
        staff: { processed: 0, created: 0, errors: [] as string[] },
        passwords: [] as Array<{ type: string; id: string; password: string }>,
      };

      // ============================================
      // PROCESS STUDENTS
      // ============================================
      try {
        // Get school_id first to handle students that might only have school_id
        const { data: schoolData } = await supabase
          .from('accepted_schools')
          .select('id')
          .eq('school_code', schoolCode)
          .single();

        // Get all students for this school
        // Try by school_code first, then by school_id if needed
        const query = supabase
          .from('students')
          .select('school_code, admission_no, id, student_name, status, school_id')
          .eq('school_code', schoolCode);

        const { data: allStudents, error: studentsError } = await query;

        // If no students found by school_code, try by school_id
        interface StudentData {
          school_code: string;
          admission_no: string;
          id: string;
          student_name: string;
          status: string;
          school_id: string;
        }
        let studentsBySchoolId: StudentData[] = [];
        if ((!allStudents || allStudents.length === 0) && schoolData?.id) {
          const { data: studentsById } = await supabase
            .from('students')
            .select('school_code, admission_no, id, student_name, status, school_id')
            .eq('school_id', schoolData.id);
          
          if (studentsById) {
            studentsBySchoolId = studentsById;
          }
        }

        const finalStudents = (allStudents || []).concat(studentsBySchoolId);

        if (studentsError && (!finalStudents || finalStudents.length === 0)) {
          if (results[schoolCode]?.students?.errors) {
            results[schoolCode].students.errors.push(`Error fetching students: ${studentsError.message}`);
          }
        } else if (!finalStudents || finalStudents.length === 0) {
          // No students found for this school
          if (results[schoolCode]?.students) {
            results[schoolCode].students.processed = 0;
          }
          console.log(`School ${schoolCode}: No students found`);
        } else {
          // Filter out students without required fields and ensure school_code is set
          const validStudents = finalStudents.filter(
            s => s.admission_no && (s.school_code || schoolCode)
          );

          // Update school_code for students that don't have it
          const studentsWithSchoolCode = validStudents.map(s => ({
            ...s,
            school_code: s.school_code || schoolCode,
          }));

          // Get existing logins
          const admissionNos = studentsWithSchoolCode.map(s => s.admission_no).filter(Boolean) as string[];
          
          if (admissionNos.length === 0) {
            if (results[schoolCode]?.students) {
              results[schoolCode].students.processed = 0;
              results[schoolCode].students.errors?.push('No valid admission numbers found');
            }
            console.log(`School ${schoolCode}: No valid admission numbers`);
          } else {
            const { data: existingLogins } = await supabase
              .from('student_login')
              .select('admission_no')
              .eq('school_code', schoolCode)
              .in('admission_no', admissionNos);

            const existingAdmissionNos = new Set(
              existingLogins?.map(l => l.admission_no) || []
            );

            // Generate passwords for students without passwords
            const studentsToProcess = studentsWithSchoolCode.filter(
              s => s.admission_no && !existingAdmissionNos.has(s.admission_no)
            );

            if (results[schoolCode]?.students) {
              results[schoolCode].students.processed = studentsToProcess.length;
            }

            // Log for debugging
            console.log(`School ${schoolCode}: Found ${finalStudents.length} students, ${validStudents.length} valid, ${studentsToProcess.length} need passwords`);

            // Process in batches to avoid overwhelming the system
            const BATCH_SIZE = 50;
            for (let i = 0; i < studentsToProcess.length; i += BATCH_SIZE) {
            const batch = studentsToProcess.slice(i, i + BATCH_SIZE);
            const loginRecords = [];

            for (const student of batch) {
              try {
                // Double-check required fields
                if (!student.school_code || !student.admission_no) {
                  results[schoolCode]?.students?.errors?.push(
                    `Student ${student.id || 'unknown'}: Missing school_code or admission_no`
                  );
                  continue;
                }

                const { password, hash } = await generateAndHashPassword();
                loginRecords.push({
                  school_code: student.school_code,
                  admission_no: student.admission_no,
                  password_hash: hash,
                  is_active: true,
                });
                results[schoolCode]?.passwords?.push({
                  type: 'student',
                  id: student.admission_no,
                  password: password,
                });
              } catch (err) {
                results[schoolCode]?.students?.errors?.push(
                  `Student ${student.admission_no || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`
                );
              }
            }

            // Insert batch
            if (loginRecords.length > 0) {
              const { error: insertError } = await supabase
                .from('student_login')
                .insert(loginRecords);

              if (insertError) {
                results[schoolCode]?.students?.errors?.push(`Batch insert error: ${insertError.message}`);
              } else {
                if (results[schoolCode]?.students) {
                  results[schoolCode].students.created += loginRecords.length;
                }
              }
            }
          }
          }
        }
      } catch (err) {
        results[schoolCode]?.students?.errors?.push(`Failed to process students: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // ============================================
      // PROCESS STAFF
      // ============================================
      try {
        // Get all staff
        const { data: allStaff, error: staffError } = await supabase
          .from('staff')
          .select('school_code, staff_id, id, full_name, role')
          .eq('school_code', schoolCode);

        if (staffError) {
          results[schoolCode]?.staff?.errors?.push(`Error fetching staff: ${staffError.message}`);
        } else {
          // Get existing logins
          const staffIds = (allStaff || []).map(s => s.staff_id);
          const { data: existingLogins } = await supabase
            .from('staff_login')
            .select('staff_id')
            .eq('school_code', schoolCode)
            .in('staff_id', staffIds);

          const existingStaffIds = new Set(
            existingLogins?.map(l => l.staff_id) || []
          );

          // Generate passwords for staff without passwords
          const staffToProcess = (allStaff || []).filter(
            s => !existingStaffIds.has(s.staff_id)
          );

          if (results[schoolCode]?.staff) {
            results[schoolCode].staff.processed = staffToProcess.length;
          }

          // Process in batches
          const BATCH_SIZE = 50;
          for (let i = 0; i < staffToProcess.length; i += BATCH_SIZE) {
            const batch = staffToProcess.slice(i, i + BATCH_SIZE);
            const loginRecords = [];

            for (const member of batch) {
              try {
                const { password, hash } = await generateAndHashPassword();
                loginRecords.push({
                  school_code: member.school_code,
                  staff_id: member.staff_id,
                  password_hash: hash,
                  is_active: true,
                });
                results[schoolCode]?.passwords?.push({
                  type: 'staff',
                  id: member.staff_id,
                  password: password,
                });
              } catch (err) {
                results[schoolCode]?.staff?.errors?.push(
                  `Staff ${member.staff_id}: ${err instanceof Error ? err.message : 'Unknown error'}`
                );
              }
            }

            // Insert batch
            if (loginRecords.length > 0) {
              const { error: insertError } = await supabase
                .from('staff_login')
                .insert(loginRecords);

              if (insertError) {
                results[schoolCode]?.staff?.errors?.push(`Batch insert error: ${insertError.message}`);
              } else {
                if (results[schoolCode]?.staff) {
                  results[schoolCode].staff.created += loginRecords.length;
                }
              }
            }
          }
        }
      } catch (err) {
        results[schoolCode]?.staff?.errors?.push(`Failed to process staff: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Calculate totals
    const totals = {
      schools: Object.keys(results).length,
      students: {
        processed: Object.values(results).reduce((sum: number, r: PasswordGenerationResult) => sum + r.students.processed, 0),
        created: Object.values(results).reduce((sum: number, r: PasswordGenerationResult) => sum + r.students.created, 0),
      },
      staff: {
        processed: Object.values(results).reduce((sum: number, r: PasswordGenerationResult) => sum + r.staff.processed, 0),
        created: Object.values(results).reduce((sum: number, r: PasswordGenerationResult) => sum + r.staff.created, 0),
      },
      totalPasswords: Object.values(results).reduce((sum: number, r: PasswordGenerationResult) => sum + (r.passwords?.length || 0), 0),
    };

    return NextResponse.json({
      message: 'Password generation completed',
      results,
      totals,
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating passwords:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

