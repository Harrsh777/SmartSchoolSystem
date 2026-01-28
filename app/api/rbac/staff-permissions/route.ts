import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

/**
 * GET /api/rbac/staff-permissions
 * Get all staff with their permissions summary
 * Query params: school_code
 */
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

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();

    // Fetch staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, email, designation, photo_url, role')
      .eq('school_code', normalizedSchoolCode)
      .order('full_name', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    if (!staffData || staffData.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Get default category
    const { data: defaultCategory } = await supabase
      .from('permission_categories')
      .select('id')
      .eq('name', 'Default')
      .single();

    if (!defaultCategory) {
      return NextResponse.json(
        { error: 'Default category not found' },
        { status: 500 }
      );
    }

    // Fetch permissions for all staff
    const staffIds = staffData.map(s => s.id);
    const { data: permissionsData } = await supabase
      .from('staff_permissions')
      .select(`
        staff_id,
        view_access,
        edit_access,
        assigned_by,
        assigned_at,
        sub_module:sub_modules (
          id,
          name,
          module:modules (
            id,
            name
          )
        )
      `)
      .eq('category_id', defaultCategory.id)
      .in('staff_id', staffIds);

    // Get assigned_by names
    const assignedByIds = permissionsData
      ?.map(p => p.assigned_by)
      .filter(Boolean) as string[] || [];
    
    const assignedByMap = new Map();
    if (assignedByIds.length > 0) {
      const { data: assignedByData } = await supabase
        .from('staff')
        .select('id, full_name, email')
        .in('id', assignedByIds);
      
      if (assignedByData) {
        assignedByData.forEach(s => {
          assignedByMap.set(s.id, s);
        });
      }
    }

    // Process permissions for each staff
    const staffWithPermissions = staffData.map((staff) => {
      const staffPerms = permissionsData?.filter(p => p.staff_id === staff.id) || [];
      
      const viewPermissions = staffPerms
        .filter(p => p.view_access)
        .map(p => {
          const subModule = Array.isArray(p.sub_module) ? p.sub_module[0] : p.sub_module;
          return subModule?.name || '';
        })
        .filter(Boolean);
      
      const editPermissions = staffPerms
        .filter(p => p.edit_access)
        .map(p => {
          const subModule = Array.isArray(p.sub_module) ? p.sub_module[0] : p.sub_module;
          return subModule?.name || '';
        })
        .filter(Boolean);

      // Get latest assignment info
      const latestPermission = staffPerms
        .filter(p => p.assigned_by && p.assigned_at)
        .sort((a, b) => 
          new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
        )[0];

      let accessGivenBy = '';
      if (latestPermission?.assigned_by) {
        const assignedBy = assignedByMap.get(latestPermission.assigned_by);
        if (assignedBy) {
          const date = new Date(latestPermission.assigned_at);
          const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          accessGivenBy = `${assignedBy.full_name}, ${formattedDate} at ${formattedTime}, ${assignedBy.email}`;
        }
      }

      // Determine user access type
      const role = staff.role?.toLowerCase() || '';
      const designation = staff.designation?.toLowerCase() || '';
      let userAccess = '';
      if (role === 'teaching' || designation === 'teaching') {
        userAccess = 'Teaching';
      } else if (role === 'non-teaching' || designation === 'non-teaching' || role === 'admin' || designation === 'admin') {
        userAccess = 'Non-Teaching';
        if (role === 'admin' || designation === 'admin') {
          userAccess += ' | Admin';
        }
      } else {
        userAccess = 'Non-Teaching';
      }

      return {
        id: staff.id,
        staff_id: staff.staff_id,
        full_name: staff.full_name,
        email: staff.email,
        designation: staff.designation,
        photo_url: staff.photo_url,
        user_access: userAccess,
        role_category: 'Default',
        view_permissions: viewPermissions,
        edit_permissions: editPermissions,
        access_given_by: accessGivenBy,
      };
    });

    // Calculate summary stats
    const totalStaff = staffWithPermissions.length;
    const viewPermissionCount = staffWithPermissions.filter(s => s.view_permissions.length > 0).length;
    const editPermissionCount = staffWithPermissions.filter(s => s.edit_permissions.length > 0).length;

    return NextResponse.json({
      data: staffWithPermissions,
      summary: {
        total_staff: totalStaff,
        view_permission_count: viewPermissionCount,
        edit_permission_count: editPermissionCount,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

