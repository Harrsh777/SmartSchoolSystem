import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/staff/photo
 * Upload staff photo
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const staffId = formData.get('staff_id') as string;

    if (!file || !schoolCode || !staffId) {
      return NextResponse.json(
        { error: 'File, school code, and staff ID are required' },
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

    // Verify staff exists
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, school_code')
      .eq('id', staffId)
      .eq('school_code', schoolCode)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `staff-${staffData.staff_id}-${Date.now()}.${fileExt}`;
    const filePath = `${schoolCode}/staff/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('school-media')
      .getPublicUrl(filePath);

    const photoUrl = urlData.publicUrl;

    // Update staff record with photo URL
    const { data: updatedStaff, error: updateError } = await supabase
      .from('staff')
      .update({ photo_url: photoUrl })
      .eq('id', staffId)
      .eq('school_code', schoolCode)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating staff:', updateError);
      // Try to delete uploaded file if update fails
      await supabase.storage.from('school-media').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to update staff record', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      data: {
        photo_url: photoUrl,
        staff: updatedStaff,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading staff photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

