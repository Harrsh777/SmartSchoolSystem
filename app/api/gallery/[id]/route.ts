import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * DELETE /api/gallery/[id]
 * Delete a gallery image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get gallery entry to get image URL
    const { data: galleryEntry, error: fetchError } = await supabase
      .from('gallery')
      .select('image_url')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !galleryEntry) {
      return NextResponse.json(
        { error: 'Gallery entry not found' },
        { status: 404 }
      );
    }

    // Extract file path from URL
    const url = new URL(galleryEntry.image_url);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('school-media') + 1).join('/');

    // Delete from storage
    if (filePath) {
      await supabase.storage.from('school-media').remove([filePath]);
    }

    // Delete gallery entry (soft delete)
    const { error: deleteError } = await supabase
      .from('gallery')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete gallery entry', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Gallery image deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gallery/[id]
 * Update gallery entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, title, description, category } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const updateData: {
      title?: string;
      description?: string | null;
      category?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;

    const { data: updatedEntry, error: updateError } = await supabase
      .from('gallery')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update gallery entry', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedEntry }, { status: 200 });
  } catch (error) {
    console.error('Error updating gallery entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

