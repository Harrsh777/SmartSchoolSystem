import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/components
 * Get all fee components for a school
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

    const { data: components, error } = await supabase
      .from('fee_components')
      .select('*')
      .eq('school_code', schoolCode)
      .order('display_order', { ascending: true })
      .order('head_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch fee components', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: components || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee components:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/components
 * Create a new fee component
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      school_code, 
      head_name, 
      component_name, 
      default_amount = 0,
      fee_type = 'annual',
      applicable_classes = [],
      admission_type = 'All Students',
      gender = 'All Students',
      is_optional = false,
      academic_year,
      remarks 
    } = body;

    if (!school_code || !component_name) {
      return NextResponse.json(
        { error: 'School code and component name are required' },
        { status: 400 }
      );
    }

    if (!['annual', 'quarterly', 'monthly', 'one_time'].includes(fee_type)) {
      return NextResponse.json(
        { error: 'Invalid fee_type. Must be one of: annual, quarterly, monthly, one_time' },
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

    // Check for duplicate component name (within same academic year)
    if (academic_year) {
      const { data: existing } = await supabase
        .from('fee_components')
        .select('id')
        .eq('school_code', school_code)
        .eq('component_name', component_name.trim())
        .eq('academic_year', academic_year)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A fee component with this name already exists for this academic year' },
          { status: 400 }
        );
      }
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from('fee_components')
      .select('display_order')
      .eq('school_code', school_code)
      .eq('academic_year', academic_year || null)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayOrder = maxOrder ? (maxOrder.display_order || 0) + 1 : 0;

    const { data: component, error } = await supabase
      .from('fee_components')
      .insert([{
        school_id: schoolData.id,
        school_code,
        head_name: head_name || null,
        component_name: component_name.trim(),
        default_amount: parseFloat(default_amount.toString()) || 0,
        fee_type,
        applicable_classes: Array.isArray(applicable_classes) ? applicable_classes : [],
        admission_type,
        gender,
        is_optional: Boolean(is_optional),
        is_active: true,
        academic_year: academic_year || null,
        remarks: remarks || null,
        display_order: displayOrder,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating fee component:', error);
      return NextResponse.json(
        { error: 'Failed to create fee component', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: component }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee component:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

