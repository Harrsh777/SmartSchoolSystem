import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAndHashPassword } from '@/lib/password-generator';
import { randomUUID } from 'crypto';

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

    // Get the highest staff_id number for this school to auto-generate new ones
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('school_code', school_code)
      .order('staff_id', { ascending: false })
      .limit(1);

    let nextStaffNumber = 1;
    if (existingStaff && existingStaff.length > 0) {
      // Extract number from staff_id (e.g., "STF001" -> 1, "STF123" -> 123)
      const lastId = existingStaff[0].staff_id;
      const match = lastId.match(/(\d+)$/);
      if (match) {
        nextStaffNumber = parseInt(match[1]) + 1;
      }
    }

    // Get existing staff without passwords (for password generation)
    const { data: existingLogins } = await supabase
      .from('staff_login')
      .select('staff_id')
      .eq('school_code', school_code);

    const existingLoginStaffIds = new Set(
      existingLogins?.map(l => l.staff_id) || []
    );

    // Prepare staff for insertion with auto-generated staff_id
    interface StaffMember {
      full_name?: string;
      role?: string;
      department?: string;
      designation?: string;
      phone?: string;
      contact1?: string;
      email?: string;
      date_of_joining?: string;
    }
    const staffToInsert = staff
      .filter((s: StaffMember) => s.full_name && s.role && s.department && s.designation && (s.phone || s.contact1) && s.date_of_joining)
      .map((member: StaffMember, index: number) => {
        // Auto-generate staff_id
        const generatedStaffId = `STF${String(nextStaffNumber + index).padStart(3, '0')}`;
        
        return {
          school_id: schoolId,
          school_code: school_code,
          staff_id: generatedStaffId,
        full_name: member.full_name,
        role: member.role,
        department: member.department || null,
        designation: member.designation || null,
        email: member.email || null,
        phone: member.phone || member.contact1 || null,
        date_of_joining: member.date_of_joining,
        employment_type: member.employment_type || null,
        qualification: member.qualification || null,
        experience_years: member.experience_years || null,
        gender: member.gender || null,
        address: member.address || null,
        // New fields
        dob: member.dob || null,
        adhar_no: member.adhar_no || null,
        blood_group: member.blood_group || null,
        religion: member.religion || null,
        category: member.category || null,
        nationality: member.nationality || 'Indian',
        contact1: member.contact1 || member.phone || null,
        contact2: member.contact2 || null,
        employee_code: generatedStaffId, // Set employee_code to staff_id
        dop: member.dop || null,
        short_code: member.short_code || null,
        rfid: member.rfid || null,
        uuid: randomUUID(), // Auto-generate UUID
        alma_mater: member.alma_mater || null,
        major: member.major || null,
        website: member.website || null,
      };
      });

    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;
    const generatedPasswords: Array<{ staff_id: string; password: string }> = [];

    // Insert in batches and generate passwords
    for (let i = 0; i < staffToInsert.length; i += BATCH_SIZE) {
      const batch = staffToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError, data: insertedStaff } = await supabase
        .from('staff')
        .insert(batch)
        .select('staff_id');

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
        
        // Generate passwords for successfully inserted staff
        const loginRecords = [];
        for (const member of insertedStaff || []) {
          const { password, hash } = await generateAndHashPassword();
          loginRecords.push({
            school_code: school_code,
            staff_id: member.staff_id,
            password_hash: hash,
            plain_password: password, // Store plain text password
            is_active: true,
          });
          generatedPasswords.push({
            staff_id: member.staff_id,
            password: password,
          });
        }
        
        // Insert login records
        if (loginRecords.length > 0) {
          const { error: loginInsertError } = await supabase
            .from('staff_login')
            .insert(loginRecords);
          
          if (loginInsertError) {
            console.error('Error inserting staff login records:', loginInsertError);
            // Don't fail the entire import, but log the error
            // Passwords can be regenerated later if needed
          }
        }
      }
    }

    // Generate passwords for existing staff without passwords
    const existingStaffIds = new Set(
      existingStaff?.map(s => s.staff_id) || []
    );
    interface StaffMemberWithId {
      staff_id: string;
    }
    const existingStaffWithoutPasswords = staff
      .filter((s: StaffMemberWithId) => 
        existingStaffIds.has(s.staff_id) && 
        !existingLoginStaffIds.has(s.staff_id)
      );

    for (const member of existingStaffWithoutPasswords) {
      try {
        const { password, hash } = await generateAndHashPassword();
        const { error: loginInsertError } = await supabase
          .from('staff_login')
          .insert({
            school_code: school_code,
            staff_id: member.staff_id,
            password_hash: hash,
            plain_password: password, // Store plain text password
            is_active: true,
          });
        
        if (loginInsertError) {
          // Check if it's a duplicate (already exists)
          if (loginInsertError.code === '23505') {
            console.log(`Password already exists for staff ${member.staff_id}, skipping`);
          } else {
            console.error(`Error generating password for ${member.staff_id}:`, loginInsertError);
          }
        } else {
          generatedPasswords.push({
            staff_id: member.staff_id,
            password: password,
          });
        }
      } catch (err) {
        console.error(`Error generating password for ${member.staff_id}:`, err);
      }
    }

    // Add errors for rows that failed validation
    interface StaffMember {
      full_name?: string;
      role?: string;
      department?: string;
      designation?: string;
      phone?: string;
      contact1?: string;
      date_of_joining?: string;
      [key: string]: unknown;
    }
    staff.forEach((member: StaffMember, idx: number) => {
      if (!member.full_name || !member.role || !member.department || !member.designation || (!member.phone && !member.contact1) || !member.date_of_joining) {
        errors.push({
          row: idx + 1,
          error: 'Missing required fields',
        });
        failedCount++;
      }
    });

    return NextResponse.json({
      total: staff.length,
      success: successCount,
      failed: failedCount,
      errors,
      passwords: generatedPasswords,
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing staff:', error);
    return NextResponse.json(
      { error: 'Failed to import staff', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

