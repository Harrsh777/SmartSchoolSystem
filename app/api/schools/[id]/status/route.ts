import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generatePassword } from '@/lib/password-generator';
import { generateSchoolCode } from '@/lib/school-code-generator';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason, approved_by, rejected_by } = body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved, rejected, or pending' },
        { status: 400 }
      );
    }

    // If rejecting, require rejection reason
    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // First, get the school data from signups table
    const { data: schoolData, error: fetchError } = await supabase
      .from('school_signups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Update status in school_signups table
    const { error: updateError } = await supabase
      .from('school_signups')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Supabase error updating status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update school status', details: updateError.message },
        { status: 500 }
      );
    }

    // If approved, save to accepted_schools table with generated school code and password
    if (status === 'approved') {
      // Generate password based on school name
      const generatedPassword = generatePassword();
      
      // Retry mechanism for handling potential duplicate school codes (race conditions)
      let insertedData = null;
      let insertError = null;
      let generatedSchoolCode = '';
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Generate school code (SCH001, SCH002, etc.)
        generatedSchoolCode = generateSchoolCode(schoolData.school_name);
        
        const result = await supabase
          .from('accepted_schools')
          .insert([{
            school_name: schoolData.school_name,
            school_code: generatedSchoolCode,
            school_address: schoolData.school_address,
            city: schoolData.city,
            state: schoolData.state,
            zip_code: schoolData.zip_code,
            country: schoolData.country,
            school_email: schoolData.school_email,
            school_phone: schoolData.school_phone,
            principal_name: schoolData.principal_name,
            principal_email: schoolData.principal_email,
            principal_phone: schoolData.principal_phone,
            established_year: schoolData.established_year,
            school_type: schoolData.school_type,
            affiliation: schoolData.affiliation,
            password: generatedPassword,
            approved_by: approved_by || null,
          }])
          .select()
          .single();

        insertedData = result.data;
        insertError = result.error;

        // If successful, break out of retry loop
        if (!insertError) {
          break;
        }

        // If error is due to duplicate school_code, retry with a new code
        if (insertError?.code === '23505' || insertError?.message?.includes('duplicate') || insertError?.message?.includes('unique')) {
          console.warn(`Duplicate school code detected: ${generatedSchoolCode}. Retrying with new code... (attempt ${attempt + 1}/${maxRetries})`);
          // Wait a bit before retrying (helps with race conditions)
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }

        // If it's a different error, break and return error
        break;
      }

      if (insertError) {
        console.error('Error saving to accepted_schools:', insertError);
        return NextResponse.json(
          { 
            error: 'Failed to save school to accepted_schools table', 
            details: insertError.message,
            hint: insertError.code === '23505' 
              ? 'Duplicate school code detected. Please try again.' 
              : 'Please check if the accepted_schools table exists and has the correct schema'
          },
          { status: 500 }
        );
      }

      // Return the generated credentials in the response (for admin to see/share)
      return NextResponse.json(
        { 
          success: true, 
          message: `School approved successfully. School Code: ${generatedSchoolCode}, Password: ${generatedPassword}`,
          school_code: generatedSchoolCode,
          password: generatedPassword,
          data: insertedData
        },
        { status: 200 }
      );
    }

    // If rejected, save to rejected_schools table
    if (status === 'rejected') {
      // Check if school is already in rejected_schools (prevent duplicates)
      const { data: existingRejected, error: checkError } = await supabase
        .from('rejected_schools')
        .select('id')
        .eq('school_email', schoolData.school_email)
        .single();

      // If already exists, update it instead of inserting
      if (existingRejected && !checkError) {
        const { error: updateRejectedError } = await supabase
          .from('rejected_schools')
          .update({
            school_name: schoolData.school_name,
            school_address: schoolData.school_address,
            city: schoolData.city,
            state: schoolData.state,
            zip_code: schoolData.zip_code,
            country: schoolData.country,
            school_email: schoolData.school_email,
            school_phone: schoolData.school_phone,
            principal_name: schoolData.principal_name,
            principal_email: schoolData.principal_email,
            principal_phone: schoolData.principal_phone,
            established_year: schoolData.established_year,
            school_type: schoolData.school_type,
            affiliation: schoolData.affiliation,
            rejection_reason: rejection_reason,
            rejected_by: rejected_by || null,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRejected.id);

        if (updateRejectedError) {
          console.error('Error updating rejected_schools:', updateRejectedError);
          return NextResponse.json(
            { 
              error: 'Failed to update rejected school', 
              details: updateRejectedError.message,
            },
            { status: 500 }
          );
        }
      } else {
        // Insert new rejected school
        const { error: insertError } = await supabase
          .from('rejected_schools')
          .insert([{
            school_name: schoolData.school_name,
            school_address: schoolData.school_address,
            city: schoolData.city,
            state: schoolData.state,
            zip_code: schoolData.zip_code,
            country: schoolData.country,
            school_email: schoolData.school_email,
            school_phone: schoolData.school_phone,
            principal_name: schoolData.principal_name,
            principal_email: schoolData.principal_email,
            principal_phone: schoolData.principal_phone,
            established_year: schoolData.established_year,
            school_type: schoolData.school_type,
            affiliation: schoolData.affiliation,
            rejection_reason: rejection_reason,
            rejected_by: rejected_by || null,
            rejected_at: new Date().toISOString(),
          }]);

        if (insertError) {
          console.error('Error saving to rejected_schools:', insertError);
          return NextResponse.json(
            { 
              error: 'Failed to save school to rejected_schools table', 
              details: insertError.message,
              hint: insertError.code === '42P01' 
                ? 'The rejected_schools table does not exist. Please create it in your database.'
                : insertError.code === '42703'
                ? 'A required column is missing in rejected_schools table. Please check the schema.'
                : insertError.code === '23505'
                ? 'This school has already been rejected. Please refresh the page.'
                : 'Please check if the rejected_schools table exists and has the correct schema'
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `School ${status} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating school status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

