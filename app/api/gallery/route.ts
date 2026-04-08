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
      // Case-insensitive match so "events" and "Events" both work
      query = query.ilike('category', category);
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
    const schoolCode = formData.get('school_code') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const uploadedBy = formData.get('uploaded_by') as string;
    const staffIdHeader = request.headers.get('x-staff-id');
    const filesFromArrayField = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
    const singleFile = formData.get('file');
    const files: File[] = filesFromArrayField.length
      ? filesFromArrayField
      : (singleFile instanceof File ? [singleFile] : []);

    if (!files.length || !schoolCode) {
      return NextResponse.json(
        { error: 'At least one image file and school code are required' },
        { status: 400 }
      );
    }

    // Get staff ID from header or use default admin/principal
    let staffId: string | null = uploadedBy || staffIdHeader || null;
    
    if (!staffId) {
      // Try to get default admin/principal for the school
      const { data: adminStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', schoolCode)
        .or('role.ilike.%admin%,role.ilike.%principal%')
        .limit(1)
        .single();
      
      if (adminStaff) {
        staffId = adminStaff.id;
      }
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File "${file.name}" must be an image` },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" must be less than 10MB` },
          { status: 400 }
        );
      }
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

    const createdEntries: unknown[] = [];
    const uploadedPaths: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-${schoolCode}-${Date.now()}-${index}.${fileExt}`;
      const filePath = `${schoolCode}/gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('school-media')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        await supabase.storage.from('school-media').remove(uploadedPaths);
        return NextResponse.json(
          { error: `Failed to upload "${file.name}"`, details: uploadError.message },
          { status: 500 }
        );
      }

      uploadedPaths.push(filePath);

      const { data: urlData } = supabase.storage
        .from('school-media')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      const cleanedName = file.name.replace(/\.[^/.]+$/, '').trim();
      const fallbackTitle = cleanedName || `Gallery Image ${index + 1}`;
      const derivedTitle = title?.trim()
        ? (files.length === 1 ? title.trim() : `${title.trim()} (${index + 1})`)
        : fallbackTitle;

      const { data: galleryEntry, error: insertError } = await supabase
        .from('gallery')
        .insert([{
          school_id: schoolData.id,
          school_code: schoolCode,
          title: derivedTitle,
          description: description || null,
          category: category || 'General',
          image_url: imageUrl,
          uploaded_by: staffId,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error saving gallery entry:', insertError);
        await supabase.storage.from('school-media').remove(uploadedPaths);
        return NextResponse.json(
          { error: `Failed to save "${file.name}"`, details: insertError.message },
          { status: 500 }
        );
      }

      createdEntries.push(galleryEntry);
    }

    return NextResponse.json({
      message: files.length > 1 ? 'Images uploaded successfully' : 'Image uploaded successfully',
      data: files.length > 1 ? createdEntries : createdEntries[0],
      count: createdEntries.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

