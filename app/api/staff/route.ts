import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch staff filtered by school_code
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (staffError) {
      console.error('Supabase error fetching staff:', staffError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch staff', 
          details: staffError.message,
          code: staffError.code,
          hint: staffError.hint 
        },
        { status: 500 }
      );
    }

    // Return empty array if no staff found (not an error)
    return NextResponse.json({ data: staff || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, ...staffData } = body;

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

    // Auto-generate staff_id if not provided
    let generatedStaffId = staffData.staff_id;
    if (!generatedStaffId) {
      // Get the highest staff_id number for this school
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('staff_id')
        .eq('school_code', school_code)
        .order('staff_id', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingStaff && existingStaff.length > 0) {
        // Extract number from staff_id (e.g., "STF001" -> 1, "STF123" -> 123)
        const lastId = existingStaff[0].staff_id;
        const match = lastId.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      generatedStaffId = `STF${String(nextNumber).padStart(3, '0')}`;
    }

    // Check for duplicate staff_id
    const { data: existing } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('school_code', school_code)
      .eq('staff_id', generatedStaffId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Staff ID already exists' },
        { status: 400 }
      );
    }

    // Generate UUID if not provided
    const generatedUuid = staffData.uuid || crypto.randomUUID();

    // Insert staff with school_code
    const { data: newStaff, error: insertError } = await supabase
      .from('staff')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        staff_id: generatedStaffId,
        full_name: staffData.full_name,
        role: staffData.role,
        department: staffData.department || null,
        designation: staffData.designation || null,
        email: staffData.email || null,
        phone: staffData.phone || staffData.contact1 || null,
        date_of_joining: staffData.date_of_joining,
        employment_type: staffData.employment_type || null,
        qualification: staffData.qualification || null,
        experience_years: staffData.experience_years || null,
        gender: staffData.gender || null,
        address: staffData.address || null,
        // New fields
        dob: staffData.dob || null,
        adhar_no: staffData.adhar_no || null,
        blood_group: staffData.blood_group || null,
        religion: staffData.religion || null,
        category: staffData.category || null,
        nationality: staffData.nationality || 'Indian',
        contact1: staffData.contact1 || staffData.phone || null,
        contact2: staffData.contact2 || null,
        employee_code: staffData.employee_code || generatedStaffId || null,
        dop: staffData.dop || null,
        short_code: staffData.short_code || null,
        rfid: staffData.rfid || null,
        uuid: generatedUuid,
        alma_mater: staffData.alma_mater || null,
        major: staffData.major || null,
        website: staffData.website || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create staff', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newStaff }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

