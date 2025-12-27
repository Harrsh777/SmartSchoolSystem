import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/rbac/roles
 * Get all roles with their permissions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Use service role client to bypass RLS
    let supabase;
    try {
      supabase = getServiceRoleClient();
    } catch (envError) {
      console.error('Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: (envError as Error).message,
          hint: 'Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables'
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        description,
        role_permissions (
          permission:permissions (
            id,
            key,
            name,
            module
          )
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      );
    }

    const roles = (data || []).map((role) => {
      // Handle the case where permission might be an array or single object
      const rolePerms = role.role_permissions as Array<{ 
        permission: { id: string; key: string; name: string; module: string | null } | Array<{ id: string; key: string; name: string; module: string | null }> | null
      }> | null;
      
      const permissions = (rolePerms || [])
        .flatMap((rp) => {
          if (!rp || !rp.permission) return [];
          const perm = rp.permission;
          // If permission is an array, return all items; otherwise return the single item
          return Array.isArray(perm) ? perm : [perm];
        })
        .filter((p): p is { id: string; key: string; name: string; module: string | null } => 
          p !== null && p !== undefined
        );
      
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
      };
    });

    return NextResponse.json({ data: roles }, { status: 200 });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rbac/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    let supabase;
    try {
      supabase = getServiceRoleClient();
    } catch (envError) {
      console.error('Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: (envError as Error).message,
          hint: 'Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables'
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('roles')
      .insert([{ name, description: description || null }])
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return NextResponse.json(
        { error: 'Failed to create role', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

