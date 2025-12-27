import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/library/books/[id]
 * Get a specific book with all copies
 */
export async function GET(
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

    const { data: book, error } = await supabase
      .from('library_books')
      .select(`
        *,
        section:library_sections(name),
        material_type:library_material_types(name),
        copies:library_book_copies(*)
      `)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (error || !book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: book }, { status: 200 });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/library/books/[id]
 * Update a book
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: book, error } = await supabase
      .from('library_books')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update book', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: book }, { status: 200 });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/library/books/[id]
 * Delete a book (soft delete - mark copies as lost)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

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

    // Mark all copies as lost
    await supabase
      .from('library_book_copies')
      .update({ status: 'lost', updated_at: new Date().toISOString() })
      .eq('book_id', id)
      .eq('school_code', schoolCode);

    // Note: We don't delete the book record to maintain transaction history
    // You can add a soft delete flag if needed

    return NextResponse.json({ message: 'Book deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

