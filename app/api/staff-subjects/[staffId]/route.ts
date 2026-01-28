import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/staff-subjects/[staffId]
 * Get subjects assigned to a specific staff member
 * Query params: school_code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { staffId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get staff info
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, role, department')
      .eq('id', staffId)
      .eq('school_code', schoolCode)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Get assigned subjects
    const { data: staffSubjects, error: staffSubjectsError } = await supabase
      .from('staff_subjects')
      .select(`
        id,
        subject_id,
        subject:subject_id (
          id,
          name,
          color
        )
      `)
      .eq('school_code', schoolCode)
      .eq('staff_id', staffId);

    if (staffSubjectsError) {
      // If table doesn't exist, return empty subjects array
      if (staffSubjectsError.message?.includes('does not exist') || 
          staffSubjectsError.message?.includes('relation') ||
          staffSubjectsError.code === '42P01') {
        console.log('staff_subjects table does not exist yet - returning empty subjects');
        return NextResponse.json(
          {
            data: {
              staff,
              subjects: [],
            },
          },
          { status: 200 }
        );
      }
      console.error('Error fetching staff-subjects:', staffSubjectsError);
      return NextResponse.json(
        { error: 'Failed to fetch staff-subject assignments', details: staffSubjectsError.message },
        { status: 500 }
      );
    }

    const subjects = (staffSubjects || [])
      .map((ss) => {
        if (ss.subject && typeof ss.subject === 'object' && 'name' in ss.subject) {
          const subjectData = Array.isArray(ss.subject) ? ss.subject[0] : ss.subject;
          const subject = subjectData as { id: string; name: string; color: string };
          return {
            id: subject.id,
            name: subject.name,
            color: subject.color || '#6B7280',
          };
        }
        return null;
      })
      .filter((s): s is { id: string; name: string; color: string } => s !== null);

    return NextResponse.json(
      {
        data: {
          staff,
          subjects,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/staff-subjects/[staffId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff-subjects/[staffId]
 * Save/update subject assignments for a staff member
 * Body: { school_code, subject_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { staffId } = await params;
    const body = await request.json();
    const { school_code, subject_ids } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(subject_ids)) {
      return NextResponse.json(
        { error: 'subject_ids must be an array' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Verify staff exists
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, school_id')
      .eq('id', staffId)
      .eq('school_code', school_code)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Get school_id
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

    // Delete existing assignments for this staff member
    // Handle case where table might not exist yet
    const { error: deleteError } = await supabase
      .from('staff_subjects')
      .delete()
      .eq('school_code', school_code)
      .eq('staff_id', staffId);

    if (deleteError) {
      // If table doesn't exist, that's okay - we'll create it with the insert
      if (!deleteError.message?.includes('does not exist') && 
          !deleteError.message?.includes('relation') &&
          deleteError.code !== '42P01') {
        console.error('Error deleting existing staff-subjects:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update assignments', details: deleteError.message },
          { status: 500 }
        );
      }
      // Table doesn't exist - continue to insert (will create table)
      console.log('staff_subjects table does not exist yet - will be created on insert');
    }

    // Insert new assignments
    if (subject_ids.length > 0) {
      // Verify all subjects exist
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_code', school_code)
        .in('id', subject_ids);

      if (subjectsError) {
        console.error('Error verifying subjects:', subjectsError);
        return NextResponse.json(
          { error: 'Failed to verify subjects', details: subjectsError.message },
          { status: 500 }
        );
      }

      const validSubjectIds = new Set((subjects || []).map((s) => s.id));
      const invalidSubjectIds = subject_ids.filter((id: string) => !validSubjectIds.has(id));

      if (invalidSubjectIds.length > 0) {
        return NextResponse.json(
          { error: 'Some subjects not found', invalid_subject_ids: invalidSubjectIds },
          { status: 400 }
        );
      }

      // Insert new assignments
      const assignments = subject_ids.map((subjectId: string) => ({
        school_id: school.id,
        school_code: school_code,
        staff_id: staffId,
        subject_id: subjectId,
      }));

      const { error: insertError } = await supabase
        .from('staff_subjects')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting staff-subjects:', insertError);
        return NextResponse.json(
          { error: 'Failed to save assignments', details: insertError.message },
          { status: 500 }
        );
      }
    }

    // Fetch updated assignments
    const { data: updatedAssignments, error: fetchError } = await supabase
      .from('staff_subjects')
      .select(`
        id,
        subject_id,
        subject:subject_id (
          id,
          name,
          color
        )
      `)
      .eq('school_code', school_code)
      .eq('staff_id', staffId);

    if (fetchError) {
      // If table doesn't exist or no assignments, return empty array
      if (fetchError.message?.includes('does not exist') || 
          fetchError.message?.includes('relation') ||
          fetchError.code === '42P01') {
        console.log('staff_subjects table does not exist or no assignments found');
      } else {
        console.error('Error fetching updated assignments:', fetchError);
      }
    }

    const updatedSubjects = (updatedAssignments || [])
      .map((ss) => {
        if (ss.subject && typeof ss.subject === 'object' && 'name' in ss.subject) {
          const subjectData = Array.isArray(ss.subject) ? ss.subject[0] : ss.subject;
          const subject = subjectData as { id: string; name: string; color: string };
          return {
            id: subject.id,
            name: subject.name,
            color: subject.color || '#6B7280',
          };
        }
        return null;
      })
      .filter((s): s is { id: string; name: string; color: string } => s !== null);

    return NextResponse.json(
      {
        data: {
          staff_id: staffId,
          subjects: updatedSubjects,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/staff-subjects/[staffId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
