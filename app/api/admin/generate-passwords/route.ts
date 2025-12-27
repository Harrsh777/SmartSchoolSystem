import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, type } = body; // type: 'students' | 'staff' | 'all'

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const results = {
      students: { processed: 0, created: 0, errors: [] as string[] },
      staff: { processed: 0, created: 0, errors: [] as string[] },
    };

    // Generate passwords for students
    if (type === 'students' || type === 'all') {
      try {
        // Get all students without passwords
        const { data: studentsWithoutPasswords, error: studentsError } = await supabase
          .from('students')
          .select('school_code, admission_no, id')
          .eq('school_code', school_code)
          .eq('status', 'active');

        if (studentsError) {
          results.students.errors.push(`Error fetching students: ${studentsError.message}`);
        } else {
          // Get existing logins
          const admissionNos = (studentsWithoutPasswords || []).map(s => s.admission_no);
          const { data: existingLogins } = await supabase
            .from('student_login')
            .select('admission_no')
            .eq('school_code', school_code)
            .in('admission_no', admissionNos);

          const existingAdmissionNos = new Set(
            existingLogins?.map(l => l.admission_no) || []
          );

          // Generate passwords for students without passwords
          const studentsToProcess = (studentsWithoutPasswords || []).filter(
            s => !existingAdmissionNos.has(s.admission_no)
          );

          results.students.processed = studentsToProcess.length;

          for (const student of studentsToProcess) {
            try {
              const { password, hash } = await generateAndHashPassword();
              
              const { error: insertError } = await supabase
                .from('student_login')
                .insert({
                  school_code: student.school_code,
                  admission_no: student.admission_no,
                  password_hash: hash,
                  plain_password: password, // Store plain text password
                  is_active: true,
                });

              if (insertError) {
                if (insertError.code === '23505') {
                  // Duplicate - already exists, skip
                  continue;
                }
                results.students.errors.push(`Student ${student.admission_no}: ${insertError.message}`);
              } else {
                results.students.created++;
              }
            } catch (err) {
              results.students.errors.push(`Student ${student.admission_no}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        }
      } catch (err) {
        results.students.errors.push(`Failed to process students: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Generate passwords for staff
    if (type === 'staff' || type === 'all') {
      try {
        // Get all staff without passwords
        const { data: staffWithoutPasswords, error: staffError } = await supabase
          .from('staff')
          .select('school_code, staff_id, id')
          .eq('school_code', school_code);

        if (staffError) {
          results.staff.errors.push(`Error fetching staff: ${staffError.message}`);
        } else {
          // Get existing logins
          const staffIds = (staffWithoutPasswords || []).map(s => s.staff_id);
          const { data: existingLogins } = await supabase
            .from('staff_login')
            .select('staff_id')
            .eq('school_code', school_code)
            .in('staff_id', staffIds);

          const existingStaffIds = new Set(
            existingLogins?.map(l => l.staff_id) || []
          );

          // Generate passwords for staff without passwords
          const staffToProcess = (staffWithoutPasswords || []).filter(
            s => !existingStaffIds.has(s.staff_id)
          );

          results.staff.processed = staffToProcess.length;

          for (const member of staffToProcess) {
            try {
              const { password, hash } = await generateAndHashPassword();
              
              const { error: insertError } = await supabase
                .from('staff_login')
                .insert({
                  school_code: member.school_code,
                  staff_id: member.staff_id,
                  password_hash: hash,
                  plain_password: password, // Store plain text password
                  is_active: true,
                });

              if (insertError) {
                if (insertError.code === '23505') {
                  // Duplicate - already exists, skip
                  continue;
                }
                results.staff.errors.push(`Staff ${member.staff_id}: ${insertError.message}`);
              } else {
                results.staff.created++;
              }
            } catch (err) {
              results.staff.errors.push(`Staff ${member.staff_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        }
      } catch (err) {
        results.staff.errors.push(`Failed to process staff: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: 'Password generation completed',
      results,
      summary: {
        totalProcessed: results.students.processed + results.staff.processed,
        totalCreated: results.students.created + results.staff.created,
        totalErrors: results.students.errors.length + results.staff.errors.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating passwords:', error);
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

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Count students without passwords
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    const { count: studentsWithPasswords } = await supabase
      .from('student_login')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Count staff without passwords
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    const { count: staffWithPasswords } = await supabase
      .from('staff_login')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    return NextResponse.json({
      data: {
        students: {
          total: totalStudents || 0,
          withPassword: studentsWithPasswords || 0,
          withoutPassword: (totalStudents || 0) - (studentsWithPasswords || 0),
        },
        staff: {
          total: totalStaff || 0,
          withPassword: staffWithPasswords || 0,
          withoutPassword: (totalStaff || 0) - (staffWithPasswords || 0),
        },
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

