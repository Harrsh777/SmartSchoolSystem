import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/gallery
 * Get all gallery images for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const category = searchParams.get('category');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('gallery')
      .select(`
        *,
        uploaded_by_staff:uploaded_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error('Error fetching gallery:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery images', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: images || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gallery
 * Upload a new gallery image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const uploadedBy = formData.get('uploaded_by') as string;

    if (!file || !schoolCode || !title) {
      return NextResponse.json(
        { error: 'File, school code, and title are required' },
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

    // Validate file size (max 10MB for gallery)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Get school data
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `gallery-${schoolCode}-${Date.now()}.${fileExt}`;
    const filePath = `${schoolCode}/gallery/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('school-media')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Save gallery entry
    const { data: galleryEntry, error: insertError } = await supabase
      .from('gallery')
      .insert([{
        school_id: schoolData.id,
        school_code: schoolCode,
        title: title,
        description: description || null,
        category: category || 'General',
        image_url: imageUrl,
        uploaded_by: uploadedBy || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error saving gallery entry:', insertError);
      // Try to delete uploaded file if insert fails
      await supabase.storage.from('school-media').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to save gallery entry', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Image uploaded successfully',
      data: galleryEntry,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

