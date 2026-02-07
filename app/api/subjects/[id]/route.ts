import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Update a subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const body = await request.json();
    const { 
      name, 
      color,
      category,
    } = body;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }

    const validCategory = category === 'scholastic' || category === 'non_scholastic' ? category : category === '' || category === null ? null : undefined;

    // Schema: id, name, color, category (optional), school_id, school_code, created_at, updated_at
    interface SubjectUpdateData {
      name: string;
      updated_at: string;
      color?: string;
      category?: string | null;
    }

    const updateData: SubjectUpdateData = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    if (color !== undefined) updateData.color = color;
    if (validCategory !== undefined) updateData.category = validCategory;

    const { data: subject, error: updateError } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update subject', details: updateError.message },
        { status: 500 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: subject }, { status: 200 });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a subject
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

    const { error: deleteError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete subject', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Subject deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

