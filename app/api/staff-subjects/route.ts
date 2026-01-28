import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/staff-subjects
 * Get all teaching staff with their assigned subjects
 * Query params: school_code
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get all teaching staff for the school
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, role, department, designation, email, phone')
      .eq('school_code', schoolCode)
      .or('role.ilike.%teacher%,role.ilike.%principal%,role.ilike.%head%,role.ilike.%vice%')
      .order('full_name', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    // Get all staff-subject assignments
    // Handle case where table might not exist yet
    const { data: staffSubjects, error: staffSubjectsError } = await supabase
      .from('staff_subjects')
      .select(`
        id,
        staff_id,
        subject_id,
        subject:subject_id (
          id,
          name,
          color
        )
      `)
      .eq('school_code', schoolCode);

    if (staffSubjectsError) {
      // If table doesn't exist, return empty assignments (table will be created on first assignment)
      if (staffSubjectsError.message?.includes('does not exist') || 
          staffSubjectsError.message?.includes('relation') ||
          staffSubjectsError.code === '42P01') {
        console.log('staff_subjects table does not exist yet - returning empty assignments');
        // Return staff with empty subjects array
        const staffWithSubjects = (staff || []).map((s) => ({
          ...s,
          subjects: [],
        }));
        return NextResponse.json({ data: staffWithSubjects }, { status: 200 });
      }
      console.error('Error fetching staff-subjects:', staffSubjectsError);
      return NextResponse.json(
        { error: 'Failed to fetch staff-subject assignments', details: staffSubjectsError.message },
        { status: 500 }
      );
    }

    // Group subjects by staff_id
    const subjectsByStaff = new Map<string, Array<{ id: string; name: string; color: string }>>();
    staffSubjects?.forEach((ss) => {
      if (ss.staff_id && ss.subject && typeof ss.subject === 'object' && 'name' in ss.subject) {
        const subjectData = Array.isArray(ss.subject) ? ss.subject[0] : ss.subject;
        const subject = subjectData as { id: string; name: string; color: string };
        if (!subjectsByStaff.has(ss.staff_id)) {
          subjectsByStaff.set(ss.staff_id, []);
        }
        subjectsByStaff.get(ss.staff_id)?.push({
          id: subject.id,
          name: subject.name,
          color: subject.color || '#6B7280',
        });
      }
    });

    // Combine staff with their subjects
    const staffWithSubjects = (staff || []).map((s) => ({
      ...s,
      subjects: subjectsByStaff.get(s.id) || [],
    }));

    return NextResponse.json({ data: staffWithSubjects }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff-subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
