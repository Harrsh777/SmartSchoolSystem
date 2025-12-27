import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/library/material-types
 * Get all material types for a school
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

    const { data: types, error } = await supabase
      .from('library_material_types')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch material types', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: types || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching material types:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/material-types
 * Create a new material type
 */
export async function POST(request: NextRequest) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

  try {
    const body = await request.json();
    const { school_code, name } = body;

    if (!school_code || !name) {
      return NextResponse.json(
        { error: 'School code and name are required' },
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

    const { data: materialType, error: insertError } = await supabase
      .from('library_material_types')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create material type', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: materialType }, { status: 201 });
  } catch (error) {
    console.error('Error creating material type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

