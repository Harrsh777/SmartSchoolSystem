import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/configuration
 * Get fee configuration for a school
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

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get fee configuration
    const { data: config, error: configError } = await supabase
      .from('fee_configuration')
      .select('*')
      .eq('school_code', schoolCode)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch configuration', details: configError.message },
        { status: 500 }
      );
    }

    // Get student details configuration
    const { data: studentDetails, error: detailsError } = await supabase
      .from('fee_receipt_student_details')
      .select('*')
      .eq('school_code', schoolCode)
      .order('display_order', { ascending: true });

    if (detailsError) {
      console.error('Error fetching student details:', detailsError);
    }

    return NextResponse.json({
      data: {
        configuration: config || null,
        student_details: studentDetails || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/configuration
 * Save fee configuration for a school
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, configuration, student_details } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
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

    // Upsert fee configuration
    const { data: existingConfig } = await supabase
      .from('fee_configuration')
      .select('id')
      .eq('school_code', school_code)
      .single();

    const configData = {
      school_code,
      school_id: schoolData.id,
      ...configuration,
    };

    let configResult;
    if (existingConfig) {
      const { data, error } = await supabase
        .from('fee_configuration')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
      configResult = { data, error };
    } else {
      const { data, error } = await supabase
        .from('fee_configuration')
        .insert([configData])
        .select()
        .single();
      configResult = { data, error };
    }

    if (configResult.error) {
      return NextResponse.json(
        { error: 'Failed to save configuration', details: configResult.error.message },
        { status: 500 }
      );
    }

    // Update student details if provided
    if (student_details && Array.isArray(student_details)) {
      // Delete existing student details
      await supabase
        .from('fee_receipt_student_details')
        .delete()
        .eq('school_code', school_code);

      // Insert new student details
      if (student_details.length > 0) {
        const detailsToInsert = student_details.map((detail: { field_name: string; display_order: number; is_enabled: boolean }) => ({
          school_code,
          field_name: detail.field_name,
          display_order: detail.display_order,
          is_enabled: detail.is_enabled,
        }));

        const { error: detailsError } = await supabase
          .from('fee_receipt_student_details')
          .insert(detailsToInsert);

        if (detailsError) {
          console.error('Error saving student details:', detailsError);
          // Don't fail the whole request if student details fail
        }
      }
    }

    return NextResponse.json({
      message: 'Configuration saved successfully',
      data: configResult.data,
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving fee configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

