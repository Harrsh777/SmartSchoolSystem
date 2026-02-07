import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/permission-middleware';

export async function GET(request: NextRequest) {
  try {
    // Check permission for viewing students
    const permission = await requirePermission(request, 'student_directory', 'view', 'view');
    if (!permission || !permission.allowed) {
      // Allow if no staff ID (for admin/principal access)
      const staffId = request.headers.get('x-staff-id') || request.nextUrl.searchParams.get('staff_id');
      if (staffId) {
        return NextResponse.json(
          { error: 'Access denied. You do not have permission to view students.' },
          { status: 403 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get optional filters
    const classFilter = searchParams.get('class');
    const sectionFilter = searchParams.get('section');
    const academicYearFilter = searchParams.get('academic_year');
    const statusFilter = searchParams.get('status');

    // Build query - select only fields needed for list view
    const studentFields = 'id,admission_no,student_name,first_name,last_name,class,section,academic_year,status,student_contact,father_name,mother_name,father_contact,mother_contact,roll_number,email,created_at,updated_at';
    let query = supabase
      .from('students')
      .select(studentFields)
      .eq('school_code', schoolCode);

    // Apply filters - use flexible class matching (NUR vs NUR. etc.)
    if (classFilter) {
      const trimmed = String(classFilter).trim();
      const withoutPeriod = trimmed.replace(/\.+$/, '');
      const classVariants = [...new Set([classFilter, trimmed, withoutPeriod].filter(Boolean))];
      if (classVariants.length === 1) {
        query = query.eq('class', classVariants[0]);
      } else {
        query = query.in('class', classVariants);
      }
    }
    if (sectionFilter) {
      query = query.eq('section', sectionFilter || '');
    }
    if (academicYearFilter) {
      // Include students with matching academic_year OR null (students added without year)
      query = query.or(`academic_year.eq.${academicYearFilter},academic_year.is.null`);
    }
    if (statusFilter && statusFilter !== 'all') {
      // Map status filter to database values
      const statusMap: Record<string, string> = {
        'active': 'active',
        'deactivated': 'deactivated',
        'transferred': 'transferred',
        'alumni': 'alumni',
        'deleted': 'deleted',
      };
      const dbStatus = statusMap[statusFilter] || statusFilter;
      query = query.eq('status', dbStatus);
    } else if (!statusFilter) {
      // Default to active if no status specified
      query = query.eq('status', 'active');
    }
    // If statusFilter is 'all', don't filter by status

    // Execute query
    const { data: students, error: studentsError } = await query.order('created_at', { ascending: false });

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: students || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, ...studentData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
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

    // Check for duplicate admission number
    const { data: existing } = await supabase
      .from('students')
      .select('admission_no')
      .eq('school_code', school_code)
      .eq('admission_no', studentData.admission_no)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Admission number already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate Aadhaar number if provided
    if (studentData.aadhaar_number) {
      const { data: existingAadhaar } = await supabase
        .from('students')
        .select('aadhaar_number')
        .eq('aadhaar_number', studentData.aadhaar_number)
        .single();

      if (existingAadhaar) {
        return NextResponse.json(
          { error: 'Aadhaar number already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate RFID if provided
    if (studentData.rfid) {
      const { data: existingRfid } = await supabase
        .from('students')
        .select('rfid')
        .eq('school_code', school_code)
        .eq('rfid', studentData.rfid)
        .single();

      if (existingRfid) {
        return NextResponse.json(
          { error: 'RFID already exists for this school' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate roll number in same class and section if provided
    if (studentData.roll_number && studentData.class && studentData.section) {
      const { data: existingRoll } = await supabase
        .from('students')
        .select('roll_number')
        .eq('school_code', school_code)
        .eq('class', studentData.class)
        .eq('section', studentData.section)
        .eq('roll_number', studentData.roll_number)
        .single();

      if (existingRoll) {
        return NextResponse.json(
          { error: 'Roll number already exists in this class and section' },
          { status: 400 }
        );
      }
    }

    // Insert student with all fields
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        admission_no: studentData.admission_no,
        student_name: studentData.student_name,
        class: studentData.class,
        section: studentData.section,
        first_name: studentData.first_name || null,
        middle_name: studentData.middle_name || null,
        last_name: studentData.last_name || null,
        date_of_birth: studentData.date_of_birth || null,
        gender: studentData.gender || null,
        blood_group: studentData.blood_group || null,
        email: studentData.email || null,
        student_contact: studentData.student_contact || null,
        address: studentData.address || null,
        city: studentData.city || null,
        state: studentData.state || null,
        pincode: studentData.pincode || null,
        landmark: studentData.landmark || null,
        roll_number: studentData.roll_number || null,
        date_of_admission: studentData.date_of_admission || null,
        last_class: studentData.last_class || null,
        last_school_name: studentData.last_school_name || null,
        last_school_percentage: studentData.last_school_percentage || null,
        last_school_result: studentData.last_school_result || null,
        medium: studentData.medium || null,
        schooling_type: studentData.schooling_type || null,
        aadhaar_number: studentData.aadhaar_number || null,
        rfid: studentData.rfid || null,
        pen_no: studentData.pen_no || null,
        apaar_no: studentData.apaar_no || null,
        sr_no: studentData.sr_no || null,
        parent_name: studentData.parent_name || null,
        parent_phone: studentData.parent_phone || null,
        parent_email: studentData.parent_email || null,
        father_name: studentData.father_name || null,
        father_occupation: studentData.father_occupation || null,
        father_contact: studentData.father_contact || null,
        mother_name: studentData.mother_name || null,
        mother_occupation: studentData.mother_occupation || null,
        mother_contact: studentData.mother_contact || null,
        staff_relation: studentData.staff_relation || null,
        religion: studentData.religion || null,
        category: studentData.category || null,
        nationality: studentData.nationality || 'Indian',
        house: studentData.house || null,
        transport_type: studentData.transport_type || null,
        rte: studentData.rte || false,
        new_admission: studentData.new_admission !== undefined ? studentData.new_admission : true,
        academic_year: studentData.academic_year || new Date().getFullYear().toString(),
        status: 'active',
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create student', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

