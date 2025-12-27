import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/library/books/available
 * Get available copies of a book
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const bookId = searchParams.get('book_id');

    if (!schoolCode || !bookId) {
      return NextResponse.json(
        { error: 'School code and book ID are required' },
        { status: 400 }
      );
    }

    const { data: copies, error } = await supabase
      .from('library_book_copies')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('book_id', bookId)
      .eq('status', 'available')
      .order('accession_number', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch available copies', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: copies || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching available copies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

