import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';

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

    // Fetch all student logins (with plain_password if requested)
    const includePasswords = searchParams.get('include_passwords') === 'true';
    
    const studentLoginSelect = includePasswords 
      ? 'admission_no, is_active, created_at, plain_password'
      : 'admission_no, is_active, created_at';
    
    const { data: studentLogins } = await supabase
      .from('student_login')
      .select(studentLoginSelect)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    // Fetch all staff logins (with plain_password if requested)
    const staffLoginSelect = includePasswords
      ? 'staff_id, is_active, created_at, plain_password'
      : 'staff_id, is_active, created_at';
    
    const { data: staffLogins } = await supabase
      .from('staff_login')
      .select(staffLoginSelect)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    // Get ALL student details (not just those with logins)
    const { data: students } = await supabase
      .from('students')
      .select('admission_no, student_name, class, section')
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    // Get ALL staff details (not just those with logins)
    const { data: staff } = await supabase
      .from('staff')
      .select('staff_id, full_name, role')
      .eq('school_code', schoolCode);

    // Map students with login info
    interface Student {
      admission_no: string;
      student_name: string;
      class: string;
      section: string | null;
    }
    interface StudentLogin {
      admission_no: string;
      is_active: boolean;
      created_at: string;
      plain_password?: string;
    }
    const studentCredentials = (students || []).map((student: Student) => {
      const login = (studentLogins as unknown as StudentLogin[] | undefined)?.find(l => l.admission_no === student.admission_no);
      return {
        admission_no: student.admission_no,
        name: student.student_name,
        class: student.class,
        section: student.section,
        hasPassword: !!login,
        isActive: login?.is_active ?? false,
        createdAt: login?.created_at,
        password: includePasswords ? login?.plain_password || null : null,
      };
    });

    // Map staff with login info
    interface Staff {
      staff_id: string;
      full_name: string;
      role: string | null;
    }
    interface StaffLogin {
      staff_id: string;
      is_active: boolean;
      created_at: string;
      plain_password?: string;
    }
    const staffCredentials = (staff || []).map((member: Staff) => {
      const login = (staffLogins as unknown as StaffLogin[] | undefined)?.find(l => l.staff_id === member.staff_id);
      return {
        staff_id: member.staff_id,
        name: member.full_name,
        role: member.role,
        hasPassword: !!login,
        isActive: login?.is_active ?? false,
        createdAt: login?.created_at,
        password: includePasswords ? (login as { plain_password?: string })?.plain_password || null : null,
      };
    });

    return NextResponse.json({
      data: {
        students: studentCredentials,
        staff: staffCredentials,
        summary: {
          totalStudents: studentCredentials.length,
          studentsWithPassword: studentCredentials.filter(s => s.hasPassword).length,
          totalStaff: staffCredentials.length,
          staffWithPassword: staffCredentials.filter(s => s.hasPassword).length,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching login credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint to generate passwords and return them for viewing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, include_passwords, regenerate_all } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get all students
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('admission_no, student_name, class, section')
      .eq('school_code', school_code)
      .eq('status', 'active');

    // Get all staff
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('staff_id, full_name, role')
      .eq('school_code', school_code);

    if (studentsError || staffError) {
      return NextResponse.json(
        { error: 'Failed to fetch students or staff' },
        { status: 500 }
      );
    }

    // Get existing logins
    const studentAdmissionNos = (allStudents || []).map(s => s.admission_no);
    const { data: studentLogins } = await supabase
      .from('student_login')
      .select('admission_no')
      .eq('school_code', school_code)
      .in('admission_no', studentAdmissionNos);

    const staffIds = (allStaff || []).map(s => s.staff_id);
    const { data: staffLogins } = await supabase
      .from('staff_login')
      .select('staff_id')
      .eq('school_code', school_code)
      .in('staff_id', staffIds);

    const existingStudentLogins = new Set(studentLogins?.map(l => l.admission_no) || []);
    const existingStaffLogins = new Set(staffLogins?.map(l => l.staff_id) || []);

    // Generate passwords for students
    const studentCredentialsWithPasswords = [];
    const studentLoginRecords = [];

    for (const student of allStudents || []) {
      const hasPassword = existingStudentLogins.has(student.admission_no);
      let password = null;

      // Generate password if: include_passwords is true AND (regenerate_all is true OR user doesn't have password)
      if (include_passwords && (regenerate_all || !hasPassword)) {
        // Generate and hash password
        const { password: generatedPassword, hashedPassword } = await generateAndHashPassword();
        password = generatedPassword;
        
        // Prepare for database insert/update (store both hash and plain password)
        studentLoginRecords.push({
          school_code: school_code,
          admission_no: student.admission_no,
          password_hash: hashedPassword,
          plain_password: generatedPassword, // Store plain text password
          is_active: true,
        });
      }

      studentCredentialsWithPasswords.push({
        admission_no: student.admission_no,
        name: student.student_name,
        class: student.class,
        section: student.section,
        hasPassword: regenerate_all ? true : hasPassword,
        password: include_passwords && (regenerate_all || !hasPassword) ? password : null,
      });
    }

    // Generate passwords for staff
    const staffCredentialsWithPasswords = [];
    const staffLoginRecords = [];

    for (const member of allStaff || []) {
      const hasPassword = existingStaffLogins.has(member.staff_id);
      let password = null;

      // Generate password if: include_passwords is true AND (regenerate_all is true OR user doesn't have password)
      if (include_passwords && (regenerate_all || !hasPassword)) {
        // Generate and hash password
        const { password: generatedPassword, hashedPassword } = await generateAndHashPassword();
        password = generatedPassword;
        
        // Prepare for database insert/update (store both hash and plain password)
        staffLoginRecords.push({
          school_code: school_code,
          staff_id: member.staff_id,
          password_hash: hashedPassword,
          plain_password: generatedPassword, // Store plain text password
          is_active: true,
        });
      }

      staffCredentialsWithPasswords.push({
        staff_id: member.staff_id,
        name: member.full_name,
        role: member.role,
        hasPassword: regenerate_all ? true : hasPassword,
        password: include_passwords && (regenerate_all || !hasPassword) ? password : null,
      });
    }

    // Save generated passwords to database
    if (studentLoginRecords.length > 0) {
      await supabase
        .from('student_login')
        .upsert(studentLoginRecords, {
          onConflict: 'school_code,admission_no',
          ignoreDuplicates: false,
        });
    }

    if (staffLoginRecords.length > 0) {
      await supabase
        .from('staff_login')
        .upsert(staffLoginRecords, {
          onConflict: 'school_code,staff_id',
          ignoreDuplicates: false,
        });
    }

    return NextResponse.json({
      data: {
        students: studentCredentialsWithPasswords,
        staff: staffCredentialsWithPasswords,
        summary: {
          totalStudents: studentCredentialsWithPasswords.length,
          studentsWithPassword: studentCredentialsWithPasswords.filter(s => s.hasPassword).length,
          totalStaff: staffCredentialsWithPasswords.length,
          staffWithPassword: staffCredentialsWithPasswords.filter(s => s.hasPassword).length,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating login credentials with passwords:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

