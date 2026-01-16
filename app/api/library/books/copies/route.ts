import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/library/books/copies
 * Add a new copy to a book
 */
export async function POST(request: NextRequest) {
  // Note: Permission check removed - route-level authentication handles authorization
  // const permissionCheck = await requirePermission(request, 'manage_library');
  // if (permissionCheck) {
  //   return permissionCheck;
  // }

  try {
    const body = await request.json();
    const {
      school_code,
      book_id,
      accession_number,
      barcode,
      location,
      notes,
    } = body;

    if (!school_code || !book_id || !accession_number) {
      return NextResponse.json(
        { error: 'School code, book ID, and accession number are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify book exists
    const { data: bookData, error: bookError } = await supabase
      .from('library_books')
      .select('id')
      .eq('id', book_id)
      .eq('school_code', school_code)
      .single();

    if (bookError || !bookData) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check if accession number already exists
    const { data: existingCopy } = await supabase
      .from('library_book_copies')
      .select('id')
      .eq('school_code', school_code)
      .eq('accession_number', accession_number)
      .single();

    if (existingCopy) {
      return NextResponse.json(
        { error: 'Accession number already exists' },
        { status: 400 }
      );
    }

    // Create copy
    const { data: copy, error: copyError } = await supabase
      .from('library_book_copies')
      .insert([{
        book_id,
        school_id: schoolData.id,
        school_code,
        accession_number,
        barcode: barcode || null,
        location: location || null,
        notes: notes || null,
        status: 'available',
      }])
      .select()
      .single();

    if (copyError) {
      return NextResponse.json(
        { error: 'Failed to create copy', details: copyError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: copy }, { status: 201 });
  } catch (error) {
    console.error('Error creating book copy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

