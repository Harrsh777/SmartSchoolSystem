import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/roles - Get all roles for a school
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'school_code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('role_name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: roles }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, role_name, role_description, is_system_role } = body;

    if (!school_code || !role_name) {
      return NextResponse.json(
        { error: 'school_code and role_name are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'Invalid school_code' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('school_code', school_code)
      .eq('role_name', role_name)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists for this school' },
        { status: 409 }
      );
    }

    // Create new role
    // Handle both 'name' (old schema) and 'role_name' (new schema) columns
    const insertData: Record<string, unknown> = {
      school_id: school.id,
      school_code,
      role_name,
      role_description: role_description || null,
      is_system_role: is_system_role || false,
      is_active: true,
    };
    
    // Also set 'name' column if it exists (for backward compatibility)
    insertData.name = role_name;

    const { data: newRole, error: insertError } = await supabase
      .from('roles')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating role:', insertError);
      return NextResponse.json(
        { error: 'Failed to create role', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newRole }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
