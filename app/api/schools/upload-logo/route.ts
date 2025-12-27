import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Use service role client for server-side operations
    const supabase = getServiceRoleClient();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Get school data
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id, school_code')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found', details: schoolError?.message },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${schoolCode}-${Date.now()}.${fileExt}`;
    const filePath = `${schoolCode}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('school-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload logo';
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('The resource was not found')) {
        errorMessage = 'Storage bucket "school-logos" not found. Please create it in Supabase Storage.';
      } else if (uploadError.message?.includes('new row violates row-level security policy') || uploadError.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please check storage policies in Supabase.';
      } else if (uploadError.message?.includes('duplicate key') || uploadError.message?.includes('already exists')) {
        // This shouldn't happen with upsert: true, but handle it anyway
        errorMessage = 'File already exists. Trying to replace...';
        // Try to remove and re-upload
        await supabase.storage.from('school-logos').remove([filePath]);
        const retryUpload = await supabase.storage
          .from('school-logos')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
          });
        if (retryUpload.error) {
          return NextResponse.json(
            { error: errorMessage, details: retryUpload.error.message },
            { status: 500 }
          );
        }
        // Continue with the rest of the code if retry succeeds
      } else {
        errorMessage = uploadError.message || errorMessage;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('school-logos')
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update school record with logo URL
    const { data: updatedSchool, error: updateError } = await supabase
      .from('accepted_schools')
      .update({ logo_url: logoUrl })
      .eq('id', schoolData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating school:', updateError);
      // Try to delete uploaded file if update fails
      await supabase.storage.from('school-logos').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to update school record', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Logo uploaded successfully',
      data: {
        logo_url: logoUrl,
        school: updatedSchool,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

