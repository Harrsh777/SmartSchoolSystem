import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/library/borrower/check
 * Check borrower eligibility and current books
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const borrowerType = searchParams.get('borrower_type');
    const borrowerId = searchParams.get('borrower_id');

    if (!schoolCode || !borrowerType || !borrowerId) {
      return NextResponse.json(
        { error: 'School code, borrower type, and borrower ID are required' },
        { status: 400 }
      );
    }

    // Get library settings
    const { data: settings } = await supabase
      .from('library_settings')
      .select('*')
      .eq('school_code', schoolCode)
      .single();

    const maxBooks = borrowerType === 'student'
      ? (settings?.max_books_student || 3)
      : (settings?.max_books_staff || 5);

    // Get current active transactions
    const { data: activeTransactions, count: activeCount } = await supabase
      .from('library_transactions')
      .select(`
        *,
        book_copy:library_book_copies(
          accession_number,
          book:library_books(title, author)
        )
      `)
      .eq('school_code', schoolCode)
      .eq('borrower_type', borrowerType)
      .eq('borrower_id', borrowerId)
      .eq('status', 'issued')
      .order('due_date', { ascending: true });

    // Get borrower details
    let borrowerDetails = null;
    if (borrowerType === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('student_name, admission_no, class, section')
        .eq('id', borrowerId)
        .eq('school_code', schoolCode)
        .single();
      borrowerDetails = student;
    } else if (borrowerType === 'staff') {
      const { data: staff } = await supabase
        .from('staff')
        .select('full_name, staff_id')
        .eq('id', borrowerId)
        .eq('school_code', schoolCode)
        .single();
      borrowerDetails = staff;
    }

    return NextResponse.json({
      data: {
        borrower: borrowerDetails,
        maxBooksAllowed: maxBooks,
        currentBooksCount: activeCount || 0,
        canBorrow: (activeCount || 0) < maxBooks,
        activeTransactions: activeTransactions || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking borrower:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

