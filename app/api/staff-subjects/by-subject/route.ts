import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/staff-subjects/by-subject
 * Get all staff members who teach a specific subject
 * Query params: school_code, subject_id (optional - if not provided, returns all staff with any subjects)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const subjectId = searchParams.get('subject_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('staff_subjects')
      .select(`
        staff_id,
        staff:staff (
          id,
          staff_id,
          full_name,
          role,
          department,
          designation
        )
      `)
      .eq('school_code', schoolCode);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data: staffSubjects, error } = await query;

    if (error) {
      console.error('Error fetching staff by subject:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: error.message },
        { status: 500 }
      );
    }

    interface StaffData {
      id: string;
      full_name: string;
      [key: string]: unknown;
    }

    // Extract unique staff members
    const staffMap = new Map<string, StaffData>();
    staffSubjects?.forEach((ss) => {
      if (ss.staff) {
        const staffData = Array.isArray(ss.staff) ? ss.staff[0] : ss.staff;
        if (staffData && typeof staffData === 'object' && 'full_name' in staffData) {
          const staff = staffData as {
            id: string;
            staff_id: string;
            full_name: string;
            role: string;
            department?: string;
            designation?: string;
          };
          if (!staffMap.has(staff.id)) {
            staffMap.set(staff.id, staff);
          }
        }
      }
    });

    const staff = Array.from(staffMap.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

    return NextResponse.json({ data: staff }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff-subjects/by-subject:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
