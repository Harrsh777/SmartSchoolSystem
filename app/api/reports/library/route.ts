import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch all library books
    const { data: books, error: booksError } = await supabase
      .from('library_books')
      .select(`
        *,
        section:library_sections(
          name
        ),
        material_type:library_material_types(
          name
        )
      `)
      .eq('school_code', schoolCode)
      .order('title', { ascending: true });

    if (booksError) {
      return NextResponse.json(
        { error: 'Failed to fetch library books', details: booksError.message },
        { status: 500 }
      );
    }

    // Fetch all book copies
    const { data: copies, error: copiesError } = await supabase
      .from('library_book_copies')
      .select(`
        *,
        book:library_books(
          title,
          author,
          isbn
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (copiesError) {
      console.error('Error fetching book copies:', copiesError);
    }

    // Fetch all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('library_transactions')
      .select(`
        *,
        book_copy:library_book_copies(
          accession_number,
          barcode,
          book:library_books(
            title,
            author
          )
        )
      `)
      .eq('school_code', schoolCode)
      .order('issue_date', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Convert to CSV
    if ((!books || books.length === 0) && (!transactions || transactions.length === 0)) {
      return new NextResponse('No library data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="library_report_${schoolCode}.csv"`,
        },
      });
    }

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    // Create CSV with book catalog information
    const csvHeader = [
      'Book Title',
      'Author',
      'ISBN',
      'Publisher',
      'Edition',
      'Section',
      'Material Type',
      'Total Copies',
      'Available Copies',
      'Issued Copies',
      'Accession Number',
      'Barcode',
      'Copy Status',
      'Borrower Type',
      'Borrower Name',
      'Issue Date',
      'Due Date',
      'Return Date',
      'Fine Amount',
      'Transaction Status',
      'Created At',
    ].join(',') + '\n';

    const csvRows: string[] = [];

    // Process books and their copies
    for (const book of (books || [])) {
      const sectionName = Array.isArray(book.section) 
        ? book.section[0]?.name || ''
        : (book.section as { name?: string } | undefined)?.name || '';
      const materialTypeName = Array.isArray(book.material_type)
        ? book.material_type[0]?.name || ''
        : (book.material_type as { name?: string } | undefined)?.name || '';

      // Get copies for this book
      const bookCopies = copies?.filter((copy: { book_id?: string }) => copy.book_id === book.id) || [];
      const availableCopies = bookCopies.filter((copy: { status?: string }) => copy.status === 'available').length;
      const issuedCopies = bookCopies.filter((copy: { status?: string }) => copy.status === 'issued').length;

      // Get transactions for this book's copies
      const bookTransactions = transactions?.filter((t: {
        book_copy?: { book?: { id?: string } };
        [key: string]: unknown;
      }) => {
        const copy = t.book_copy as { book?: { id?: string } } | undefined;
        return copy?.book?.id === book.id;
      }) || [];

      if (bookCopies.length > 0) {
        // Process copies with Promise.all for async operations
        await Promise.all(bookCopies.map(async (copy: {
          accession_number?: string;
          barcode?: string;
          status?: string;
          created_at?: string;
          [key: string]: unknown;
        }) => {
          // Find transaction for this copy
          const copyTransaction = bookTransactions.find((t: {
            book_copy?: { accession_number?: string };
            [key: string]: unknown;
          }) => {
            const tCopy = t.book_copy as { accession_number?: string } | undefined;
            return tCopy?.accession_number === copy.accession_number;
          });

          if (copyTransaction) {
            const transaction = copyTransaction as {
              borrower_type?: string;
              borrower_id?: string;
              issue_date?: string;
              due_date?: string;
              return_date?: string;
              fine_amount?: number;
              status?: string;
              [key: string]: unknown;
            };

            // Fetch borrower details
            let borrowerName = '';
            if (transaction.borrower_type === 'student' && transaction.borrower_id) {
              const { data: student } = await supabase
                .from('students')
                .select('student_name')
                .eq('id', transaction.borrower_id)
                .single();
              borrowerName = student?.student_name || '';
            } else if (transaction.borrower_type === 'staff' && transaction.borrower_id) {
              const { data: staff } = await supabase
                .from('staff')
                .select('full_name')
                .eq('id', transaction.borrower_id)
                .single();
              borrowerName = staff?.full_name || '';
            }

            csvRows.push([
              book.title || '',
              book.author || '',
              book.isbn || '',
              book.publisher || '',
              book.edition || '',
              sectionName,
              materialTypeName,
              book.total_copies || 0,
              availableCopies,
              issuedCopies,
              copy.accession_number || '',
              copy.barcode || '',
              copy.status || '',
              transaction.borrower_type || '',
              borrowerName,
              transaction.issue_date || '',
              transaction.due_date || '',
              transaction.return_date || '',
              transaction.fine_amount || 0,
              transaction.status || '',
              copy.created_at || '',
            ].map(escapeCsvValue).join(','));
          } else {
            // Copy with no transaction
            csvRows.push([
              book.title || '',
              book.author || '',
              book.isbn || '',
              book.publisher || '',
              book.edition || '',
              sectionName,
              materialTypeName,
              book.total_copies || 0,
              availableCopies,
              issuedCopies,
              copy.accession_number || '',
              copy.barcode || '',
              copy.status || '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              copy.created_at || '',
            ].map(escapeCsvValue).join(','));
          }
        }));
      } else {
        // Book with no copies
        csvRows.push([
          book.title || '',
          book.author || '',
          book.isbn || '',
          book.publisher || '',
          book.edition || '',
          sectionName,
          materialTypeName,
          book.total_copies || 0,
          0,
          0,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].map(escapeCsvValue).join(','));
      }
    }

    const csvContent = csvHeader + csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="library_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating library report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
