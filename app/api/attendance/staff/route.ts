import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get staff attendance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const staffId = searchParams.get('staff_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

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

    // Build query
    let query = supabase
      .from('staff_attendance')
      .select(`
        *,
        staff:staff_id (
          id,
          staff_id,
          full_name,
          role,
          department
        ),
        marked_by_staff:marked_by (
          id,
          full_name
        )
      `)
      .eq('school_code', schoolCode);

    // Apply filters
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (date) {
      query = query.eq('attendance_date', date);
    }

    if (startDate && endDate) {
      query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
    }

    // Execute query
    const { data: attendance, error: attendanceError } = await query
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: attendance || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark staff attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, id, attendance_date, status, check_in_time, check_out_time, remarks, marked_by } = body;

    if (!school_code || !id || !attendance_date || !status) {
      return NextResponse.json(
        { error: 'School code, staff ID (UUID), date, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'half_day', 'leave', 'holiday'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
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

    // Verify staff exists and belongs to school (using UUID)
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, school_code')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found or does not belong to this school' },
        { status: 404 }
      );
    }

    // Check if attendance already exists for this date
    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('id')
      .eq('school_code', school_code)
      .eq('staff_id', staffData.id) // Use UUID
      .eq('attendance_date', attendance_date)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('staff_attendance')
        .update({
          status,
          check_in_time: check_in_time || null,
          check_out_time: check_out_time || null,
          remarks: remarks || null,
          marked_by: marked_by || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(`
          *,
          staff:staff_id (
            id,
            staff_id,
            full_name,
            role,
            department
          )
        `)
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update attendance', details: updateError.message },
          { status: 500 }
        );
      }

      result = updated;
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('staff_attendance')
        .insert([{
          school_id: schoolData.id,
          school_code: school_code,
          staff_id: staffData.id, // Use UUID
          attendance_date: attendance_date,
          status: status,
          check_in_time: check_in_time || null,
          check_out_time: check_out_time || null,
          remarks: remarks || null,
          marked_by: marked_by || null,
        }])
        .select(`
          *,
          staff:staff_id (
            id,
            staff_id,
            full_name,
            role,
            department
          )
        `)
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create attendance', details: insertError.message },
          { status: 500 }
        );
      }

      result = inserted;
    }

    return NextResponse.json({ data: result }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error marking staff attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Bulk mark attendance for multiple staff members
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, attendance_date, attendance_records, marked_by } = body;

    if (!school_code || !attendance_date || !Array.isArray(attendance_records) || attendance_records.length === 0) {
      return NextResponse.json(
        { error: 'School code, date, and attendance records array are required' },
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

    // Prepare records for upsert
    interface StaffAttendanceInput {
      staff_id: string;
      status: string;
      check_in_time?: string;
      check_out_time?: string;
      remarks?: string;
      [key: string]: unknown;
    }
    const records = attendance_records.map((record: StaffAttendanceInput) => ({
      school_id: schoolData.id,
      school_code: school_code,
      staff_id: record.staff_id,
      attendance_date: attendance_date,
      status: record.status,
      check_in_time: record.check_in_time || null,
      check_out_time: record.check_out_time || null,
      remarks: record.remarks || null,
      marked_by: marked_by || null,
    }));

    // Verify all staff IDs exist before upserting
    const staffIds = [...new Set(records.map(r => r.staff_id))];
    const { data: staffData, error: staffCheckError } = await supabase
      .from('staff')
      .select('id')
      .eq('school_code', school_code)
      .in('id', staffIds);

    if (staffCheckError) {
      return NextResponse.json(
        { error: 'Failed to verify staff members', details: staffCheckError.message },
        { status: 500 }
      );
    }

    const validStaffIds = new Set(staffData?.map(s => s.id) || []);
    const invalidStaffIds = staffIds.filter(id => !validStaffIds.has(id));
    
    if (invalidStaffIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid staff IDs: ${invalidStaffIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Use upsert to insert or update records
    const { data: inserted, error: insertError } = await supabase
      .from('staff_attendance')
      .upsert(records, {
        onConflict: 'school_code,staff_id,attendance_date',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        staff:staff_id (
          id,
          staff_id,
          full_name,
          role,
          department
        )
      `);

    if (insertError) {
      console.error('Upsert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to bulk mark attendance', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data: inserted, 
      message: `Successfully marked attendance for ${inserted.length} staff members` 
    }, { status: 200 });
  } catch (error) {
    console.error('Error bulk marking staff attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

