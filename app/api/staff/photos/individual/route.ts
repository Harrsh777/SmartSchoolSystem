import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/staff/photos/individual
 * Upload individual staff photo
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_staff');
    if (permissionCheck) {
      return permissionCheck;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const staffId = formData.get('staff_id') as string;

    if (!file || !schoolCode || !staffId) {
      return NextResponse.json(
        { error: 'File, school_code, and staff_id are required' },
        { status: 400 }
      );
    }

    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, GIF are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceRoleClient();

    // Verify staff exists
    const { data: staffData, error: staffError } = await serviceClient
      .from('staff')
      .select('id')
      .eq('id', staffId)
      .eq('school_code', schoolCode)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Generate storage path
    const fileExt = file.name.split('.').pop() || 'jpg';
    const storagePath = `staff-photos/${staffId}/${Date.now()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from('staff-photos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('staff-photos')
      .getPublicUrl(storagePath);

    // Update staff.photo_url
    const { error: updateError } = await serviceClient
      .from('staff')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', staffId)
      .eq('school_code', schoolCode);

    if (updateError) {
      console.error('Error updating staff photo URL:', updateError);
      // Don't fail - file is uploaded, just URL update failed
    }

    return NextResponse.json({
      success: true,
      data: {
        storage_path: storagePath,
        public_url: urlData.publicUrl,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading individual photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
