import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/fee-heads
 * Get all fee heads for a school
 * Query params: school_code
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
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

    const { data: feeHeads, error } = await supabase
      .from('fee_heads')
      .select('*')
      .eq('school_code', schoolCode.toUpperCase())
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching fee heads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee heads', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: feeHeads || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/fee-heads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/fees/fee-heads
 * Create a new fee head
 * Body: { school_code, name, description, is_optional }
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const body = await request.json();
    const { school_code, name, description, is_optional } = body;

    if (!school_code || !name) {
      return NextResponse.json(
        { error: 'School code and name are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = school_code.toUpperCase();

    // Get school_id
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Create fee head
    const { data: feeHead, error: insertError } = await supabase
      .from('fee_heads')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        name: name.trim(),
        description: description?.trim() || null,
        is_optional: is_optional || false,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating fee head:', insertError);
      
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Fee head with this name already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create fee head', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: feeHead }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/fee-heads:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
