import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/library/books
 * Get all books for a school with copies count
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');
    const sectionId = searchParams.get('section_id');
    const materialTypeId = searchParams.get('material_type_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('library_books')
      .select(`
        *,
        section:library_sections(name),
        material_type:library_material_types(name),
        copies:library_book_copies(id, status, accession_number)
      `)
      .eq('school_code', schoolCode);

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }
    if (materialTypeId) {
      query = query.eq('material_type_id', materialTypeId);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`);
    }

    const { data: books, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch books', details: error.message },
        { status: 500 }
      );
    }

    // Format response with available/total copies
    interface BookCopy {
      id: string;
      status: string;
      accession_number: string;
    }
    interface BookData {
      copies?: BookCopy[];
      [key: string]: unknown;
    }
    const formattedBooks = (books || []).map((book: BookData) => {
      const copies = book.copies as BookCopy[] || [];
      const totalCopies = copies.length;
      const availableCopies = copies.filter((c) => c.status === 'available').length;
      return {
        ...book,
        total_copies: totalCopies,
        available_copies: availableCopies,
      };
    });

    return NextResponse.json({ data: formattedBooks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/books
 * Create a new book with copies
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
      title,
      author,
      publisher,
      isbn,
      edition,
      section_id,
      material_type_id,
      image_url,
      total_copies,
    } = body;

    if (!school_code || !title || !total_copies || total_copies < 1) {
      return NextResponse.json(
        { error: 'School code, title, and total copies are required' },
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

    // Create book (image_url stored if column exists)
    const bookRow: Record<string, unknown> = {
      school_id: schoolData.id,
      school_code: school_code,
      title: title,
      author: author || null,
      publisher: publisher || null,
      isbn: isbn || null,
      edition: edition || null,
      section_id: section_id || null,
      material_type_id: material_type_id || null,
      total_copies: parseInt(total_copies),
    };
    if (image_url != null && String(image_url).trim() !== '') {
      bookRow.image_url = String(image_url).trim();
    }
    const { data: book, error: bookError } = await supabase
      .from('library_books')
      .insert([bookRow])
      .select()
      .single();

    if (bookError || !book) {
      return NextResponse.json(
        { error: 'Failed to create book', details: bookError?.message },
        { status: 500 }
      );
    }

    // Generate accession numbers and create copies
    const copies = [];
    for (let i = 1; i <= parseInt(total_copies); i++) {
      // Generate accession number: BOOK-{school_code}-{book_id_short}-{copy_number}
      const bookIdShort = book.id.substring(0, 8).toUpperCase();
      const accessionNumber = `ACC-${school_code}-${bookIdShort}-${String(i).padStart(3, '0')}`;
      const barcode = `${school_code}-${bookIdShort}-${String(i).padStart(3, '0')}`;

      copies.push({
        book_id: book.id,
        school_id: schoolData.id,
        school_code: school_code,
        accession_number: accessionNumber,
        barcode: barcode,
        status: 'available',
      });
    }

    const { data: createdCopies, error: copiesError } = await supabase
      .from('library_book_copies')
      .insert(copies)
      .select();

    if (copiesError) {
      // Rollback: delete the book
      await supabase.from('library_books').delete().eq('id', book.id);
      return NextResponse.json(
        { error: 'Failed to create book copies', details: copiesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...book,
        copies: createdCopies,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

