import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/fines
 * Get all fee fines for a school
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

    const { data: fines, error } = await supabase
      .from('fee_fines')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch fee fines', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fines || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee fines:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/fines
 * Create a new fee fine
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, fine_name, fine_type, fine_value, fine_amount, fine_percentage, daily_fine_amount, applicable_after_days, is_active, remarks, max_fine_amount } = body;

    if (!school_code || !fine_name || !fine_type) {
      return NextResponse.json(
        { error: 'School code, fine name, and fine type are required' },
        { status: 400 }
      );
    }

    if (!fine_value && !fine_amount && !fine_percentage && !daily_fine_amount) {
      return NextResponse.json(
        { error: 'Fine value is required (provide fine_value or appropriate field based on fine_type)' },
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

    // Determine fine_value - prefer fine_value if provided, otherwise calculate from type-specific fields
    let fineValue = 0;
    if (fine_value !== undefined) {
      fineValue = parseFloat(fine_value);
    } else if (fine_type === 'fixed' && fine_amount) {
      fineValue = parseFloat(fine_amount);
    } else if (fine_type === 'percentage' && fine_percentage) {
      fineValue = parseFloat(fine_percentage);
    } else if (fine_type === 'daily' && daily_fine_amount) {
      fineValue = parseFloat(daily_fine_amount);
    }

    const bodyData: any = {
      school_id: schoolData.id,
      school_code,
      fine_name,
      fine_type,
      fine_value: fineValue,
      is_active: is_active !== undefined ? is_active : true,
    };

    // Add applicable_after_days if provided (from schema) - handle both field names
    if (body.applicable_after_days !== undefined) {
      bodyData.applicable_after_days = parseInt(body.applicable_after_days) || 1;
    } else if (body.applicable_from_days !== undefined) {
      bodyData.applicable_after_days = parseInt(body.applicable_from_days) || 1;
    } else {
      // Default to 1 if not provided
      bodyData.applicable_after_days = 1;
    }

    // Add max_fine_amount if provided (from schema)
    if (body.max_fine_amount !== undefined) {
      bodyData.max_fine_amount = body.max_fine_amount ? parseFloat(body.max_fine_amount) : null;
    }

    // Add remarks if provided
    if (body.remarks !== undefined) {
      bodyData.remarks = body.remarks;
    }

    const { data: fine, error } = await supabase
      .from('fee_fines')
      .insert([bodyData])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create fee fine', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fine }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee fine:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

