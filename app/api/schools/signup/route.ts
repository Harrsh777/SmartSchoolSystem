import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields (school_code removed - will be auto-generated on approval)
    const requiredFields = [
      'schoolName', 'schoolAddress', 'city', 'state',
      'zipCode', 'country', 'schoolEmail', 'schoolPhone', 'principalName',
      'principalEmail', 'principalPhone', 'establishedYear', 'schoolType', 'affiliation'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('school_signups')
      .select('id')
      .eq('school_email', body.schoolEmail)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Insert school signup (school_code will be null - generated on approval)
    const { data, error } = await supabase
      .from('school_signups')
      .insert([
        {
          school_name: body.schoolName,
          school_code: null, // Will be auto-generated when admin approves
          school_address: body.schoolAddress,
          city: body.city,
          state: body.state,
          zip_code: body.zipCode,
          country: body.country,
          school_email: body.schoolEmail,
          school_phone: body.schoolPhone,
          principal_name: body.principalName,
          principal_email: body.principalEmail,
          principal_phone: body.principalPhone,
          established_year: body.establishedYear,
          school_type: body.schoolType,
          affiliation: body.affiliation,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save school information', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'School signup submitted successfully. We will review your application and get back to you soon.',
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

