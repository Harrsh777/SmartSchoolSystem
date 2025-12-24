import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, staff } = body;

    if (!school_code || !staff || !Array.isArray(staff)) {
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

    // Check for existing staff_ids
    const staffIds = staff.map((s: any) => s.staff_id).filter(Boolean);
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('school_code', school_code)
      .in('staff_id', staffIds);

    const existingStaffIds = new Set(
      existingStaff?.map(s => s.staff_id) || []
    );

    // Prepare staff for insertion with school_code
    const staffToInsert = staff
      .filter((s: any) => !existingStaffIds.has(s.staff_id))
      .map((member: any) => ({
        school_id: schoolId,
        school_code: school_code,
        staff_id: member.staff_id,
        full_name: member.full_name,
        role: member.role,
        department: member.department || null,
        designation: member.designation || null,
        email: member.email || null,
        phone: member.phone,
        date_of_joining: member.date_of_joining,
        employment_type: member.employment_type || null,
        qualification: member.qualification || null,
        experience_years: member.experience_years || null,
        gender: member.gender || null,
        address: member.address || null,
      }));

    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Insert in batches
    for (let i = 0; i < staffToInsert.length; i += BATCH_SIZE) {
      const batch = staffToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('staff')
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
    staff.forEach((member: any, idx: number) => {
      if (existingStaffIds.has(member.staff_id)) {
        errors.push({
          row: idx + 1,
          error: 'Staff ID already exists',
        });
        failedCount++;
      }
    });

    return NextResponse.json({
      total: staff.length,
      success: successCount,
      failed: failedCount,
      errors,
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing staff:', error);
    return NextResponse.json(
      { error: 'Failed to import staff', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

