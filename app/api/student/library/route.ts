import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/library
 * Fetch all library books and student's borrowed books
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Fetch all books in the library
    const { data: books, error: booksError } = await supabase
      .from('library_books')
      .select(`
        *,
        section:library_sections(
          id,
          name
        ),
        material_type:library_material_types(
          id,
          name
        ),
        copies:library_book_copies(
          id,
          status,
          accession_number,
          barcode
        )
      `)
      .eq('school_code', schoolCode)
      .order('title', { ascending: true });

    if (booksError) {
      console.error('Error fetching books:', booksError);
    }

    // Fetch student's borrowed books (transactions)
    const { data: transactions, error: transactionsError } = await supabase
      .from('library_transactions')
      .select(`
        *,
        book_copy:library_book_copies(
          id,
          accession_number,
          barcode,
          book:library_books(
            id,
            title,
            author,
            isbn,
            edition
          )
        )
      `)
      .eq('school_code', schoolCode)
      .eq('borrower_type', 'student')
      .eq('borrower_id', studentId)
      .order('issue_date', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Format books with available/total copies
    interface BookCopy {
      id: string;
      status: string;
      accession_number: string;
      barcode: string | null;
    }
    interface BookData {
      copies?: BookCopy[];
      section?: { id: string; name: string } | null;
      material_type?: { id: string; name: string } | null;
      [key: string]: unknown;
    }

    const formattedBooks = (books || []).map((book: BookData) => {
      const copies = book.copies as BookCopy[] || [];
      const totalCopies = copies.length;
      const availableCopies = copies.filter((c) => c.status === 'available').length;
      return {
        id: book.id,
        title: book.title,
        author: book.author || null,
        publisher: book.publisher || null,
        isbn: book.isbn || null,
        edition: book.edition || null,
        section: book.section?.name || null,
        material_type: book.material_type?.name || null,
        total_copies: totalCopies,
        available_copies: availableCopies,
        is_available: availableCopies > 0,
      };
    });

    // Format transactions
    interface TransactionData {
      id: string;
      book_copy_id: string;
      book_id: string;
      issue_date: string;
      due_date: string;
      return_date: string | null;
      status: string;
      fine_amount: number | null;
      fine_reason: string | null;
      notes: string | null;
      book_copy: {
        id: string;
        accession_number: string;
        barcode: string | null;
        book: {
          id: string;
          title: string;
          author: string | null;
          isbn: string | null;
          edition: string | null;
        } | null;
      } | null;
    }

    const formattedTransactions = (transactions || []).map((transaction: TransactionData) => {
      const book = transaction.book_copy?.book;
      const isOverdue = transaction.status === 'issued' && 
        transaction.due_date && 
        new Date(transaction.due_date) < new Date();

      return {
        id: transaction.id,
        book_id: transaction.book_id,
        book_title: book?.title || 'Unknown Book',
        book_author: book?.author || null,
        book_isbn: book?.isbn || null,
        book_edition: book?.edition || null,
        accession_number: transaction.book_copy?.accession_number || null,
        barcode: transaction.book_copy?.barcode || null,
        issue_date: transaction.issue_date,
        due_date: transaction.due_date,
        return_date: transaction.return_date,
        status: transaction.status,
        is_overdue: isOverdue,
        fine_amount: transaction.fine_amount,
        fine_reason: transaction.fine_reason,
        notes: transaction.notes,
      };
    });

    return NextResponse.json({
      data: {
        books: formattedBooks,
        borrowed_books: formattedTransactions,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student library data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
