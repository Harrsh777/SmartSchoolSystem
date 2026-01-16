import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch working days for a school
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const schoolId = searchParams.get('school_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // First, get school_id if not provided
    const supabase = getServiceRoleClient();
    let finalSchoolId = schoolId;
    if (!finalSchoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', schoolCode)
        .single();

      if (schoolError || !school) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }
      finalSchoolId = school.id;
    }

    // Fetch working days
    const { data: workingDays, error } = await supabase
      .from('institute_working_days')
      .select('*')
      .eq('school_id', finalSchoolId);

    // Define day order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Sort by day order
    const sortedDays = workingDays?.sort((a, b) => {
      return dayOrder.indexOf(a.day_name) - dayOrder.indexOf(b.day_name);
    });

    if (error) {
      console.error('Error fetching working days:', error);
      return NextResponse.json(
        { error: 'Failed to fetch working days' },
        { status: 500 }
      );
    }

    // If no working days exist, initialize with default days
    if (!sortedDays || sortedDays.length === 0) {
      const defaultDays = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      
      const defaultWorkingDays = defaultDays.map(day => ({
        school_id: finalSchoolId,
        school_code: schoolCode,
        day_name: day,
        start_time: null,
        end_time: null,
        is_working_day: day !== 'Sunday',
      }));

      const supabase = getServiceRoleClient();
      const { data: inserted, error: insertError } = await supabase
        .from('institute_working_days')
        .insert(defaultWorkingDays)
        .select();

      if (insertError) {
        console.error('Error initializing working days:', insertError);
        return NextResponse.json(
          { error: 'Failed to initialize working days' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: inserted });
    }

    // Ensure all 7 days are present, add missing ones
    const existingDayNames = sortedDays.map(d => d.day_name);
    const missingDays = dayOrder.filter(day => !existingDayNames.includes(day));
    
    if (missingDays.length > 0) {
      const daysToInsert = missingDays.map(day => ({
        school_id: finalSchoolId,
        school_code: schoolCode,
        day_name: day,
        start_time: null,
        end_time: null,
        is_working_day: day !== 'Sunday',
      }));

      await supabase
        .from('institute_working_days')
        .insert(daysToInsert);
      
      // Fetch again to get complete list
      const { data: allDays } = await supabase
        .from('institute_working_days')
        .select('*')
        .eq('school_id', finalSchoolId);
      
      const finalSorted = allDays?.sort((a, b) => {
        return dayOrder.indexOf(a.day_name) - dayOrder.indexOf(b.day_name);
      });
      
      return NextResponse.json({ data: finalSorted || sortedDays });
    }

    return NextResponse.json({ data: sortedDays });
  } catch (error) {
    console.error('Error in GET /api/institute/working-days:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update working days
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, school_id, working_days } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school_id if not provided
    const supabase = getServiceRoleClient();
    let finalSchoolId = school_id;
    if (!finalSchoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', school_code)
        .single();

      if (schoolError || !school) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }
      finalSchoolId = school.id;
    }

    if (!working_days || !Array.isArray(working_days)) {
      return NextResponse.json(
        { error: 'Working days array is required' },
        { status: 400 }
      );
    }

    interface WorkingDayInput {
      day_name: string;
      is_working_day?: boolean;
      start_time?: string | null;
      end_time?: string | null;
    }

    // Upsert working days
    const updates = working_days.map((day: WorkingDayInput) => ({
      school_id: finalSchoolId,
      school_code: school_code,
      day_name: day.day_name,
      start_time: day.is_working_day !== false ? (day.start_time || null) : null,
      end_time: day.is_working_day !== false ? (day.end_time || null) : null,
      is_working_day: day.is_working_day !== false,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('institute_working_days')
      .upsert(updates, {
        onConflict: 'school_id,day_name',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error upserting working days:', error);
      return NextResponse.json(
        { error: 'Failed to save working days' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, message: 'Working days updated successfully' });
  } catch (error) {
    console.error('Error in POST /api/institute/working-days:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

