import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

/**
 * API endpoint to generate passwords for ALL students across all schools
 * This is a dedicated endpoint for students only
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code } = body; // Optional: if provided, only process that school

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

    interface StudentPasswordResult {
      school_name: string;
      processed: number;
      created: number;
      skipped: number;
      errors: string[];
    }
    const results: Record<string, StudentPasswordResult> = {};
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const allErrors: Array<{ school_code: string; admission_no: string; error: string }> = [];

    // Process each school
    for (const school of schools) {
      const schoolCode = school.school_code;
      results[schoolCode] = {
        school_name: school.school_name,
        processed: 0,
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      try {
        // Get ALL students for this school (not just active)
        // This ensures every student gets a password
        const { data: allStudents, error: studentsError } = await supabase
          .from('students')
          .select('id, school_code, admission_no, student_name, status')
          .eq('school_code', schoolCode)
          .not('admission_no', 'is', null);

        if (studentsError) {
          results[schoolCode].errors.push(`Error fetching students: ${studentsError.message}`);
          continue;
        }

        if (!allStudents || allStudents.length === 0) {
          results[schoolCode].skipped = 0;
          continue;
        }

        // Filter out students without school_code (shouldn't happen, but safety check)
        const validStudents = allStudents.filter(s => s.school_code && s.admission_no);

        // Get existing logins
        const admissionNos = validStudents.map(s => s.admission_no).filter(Boolean) as string[];
        
        if (admissionNos.length === 0) {
          results[schoolCode].skipped = validStudents.length;
          totalSkipped += validStudents.length;
          continue;
        }

        const { data: existingLogins } = await supabase
          .from('student_login')
          .select('admission_no')
          .eq('school_code', schoolCode)
          .in('admission_no', admissionNos);

        const existingAdmissionNos = new Set(
          existingLogins?.map(l => l.admission_no) || []
        );

        // Generate passwords for students without passwords
        const studentsToProcess = validStudents.filter(
          s => !existingAdmissionNos.has(s.admission_no)
        );

        results[schoolCode].processed = studentsToProcess.length;
        totalProcessed += studentsToProcess.length;
        results[schoolCode].skipped = validStudents.length - studentsToProcess.length;
        totalSkipped += results[schoolCode].skipped;

        // Process in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < studentsToProcess.length; i += BATCH_SIZE) {
          const batch = studentsToProcess.slice(i, i + BATCH_SIZE);
          const loginRecords = [];

          for (const student of batch) {
            try {
              if (!student.school_code || !student.admission_no) {
                results[schoolCode].errors.push(
                  `Student ${student.id || 'unknown'}: Missing school_code or admission_no`
                );
                allErrors.push({
                  school_code: schoolCode,
                  admission_no: student.admission_no || 'unknown',
                  error: 'Missing school_code or admission_no',
                });
                continue;
              }

              const { hash } = await generateAndHashPassword();
              loginRecords.push({
                school_code: student.school_code,
                admission_no: student.admission_no,
                password_hash: hash,
                is_active: true,
              });
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Unknown error';
              results[schoolCode].errors.push(`Student ${student.admission_no}: ${errorMsg}`);
              allErrors.push({
                school_code: schoolCode,
                admission_no: student.admission_no || 'unknown',
                error: errorMsg,
              });
            }
          }

          // Insert batch
          if (loginRecords.length > 0) {
            const { error: insertError } = await supabase
              .from('student_login')
              .insert(loginRecords);

            if (insertError) {
              // Handle duplicate key errors (race condition)
              if (insertError.code === '23505') {
                // Some records might have been inserted between check and insert
                // Count as skipped
                totalSkipped += loginRecords.length;
                results[schoolCode].skipped += loginRecords.length;
                results[schoolCode].created -= loginRecords.length;
              } else {
                results[schoolCode].errors.push(`Batch insert error: ${insertError.message}`);
                allErrors.push({
                  school_code: schoolCode,
                  admission_no: 'batch',
                  error: insertError.message,
                });
              }
            } else {
              results[schoolCode].created += loginRecords.length;
              totalCreated += loginRecords.length;
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results[schoolCode].errors.push(`Failed to process students: ${errorMsg}`);
        allErrors.push({
          school_code: schoolCode,
          admission_no: 'all',
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      message: 'Student password generation completed',
      results,
      summary: {
        schoolsProcessed: Object.keys(results).length,
        totalProcessed,
        totalCreated,
        totalSkipped,
        totalErrors: allErrors.length,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating student passwords:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    let query = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .not('admission_no', 'is', null);

    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    const { count: totalStudents } = await query;

    let loginQuery = supabase
      .from('student_login')
      .select('*', { count: 'exact', head: true });

    if (schoolCode) {
      loginQuery = loginQuery.eq('school_code', schoolCode);
    }

    const { count: studentsWithPasswords } = await loginQuery;

    return NextResponse.json({
      data: {
        total: totalStudents || 0,
        withPassword: studentsWithPasswords || 0,
        withoutPassword: (totalStudents || 0) - (studentsWithPasswords || 0),
        percentage: totalStudents && totalStudents > 0
          ? Math.round(((studentsWithPasswords || 0) / totalStudents) * 100)
          : 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking password status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

