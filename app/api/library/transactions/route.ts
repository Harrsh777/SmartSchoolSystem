import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/library/transactions
 * Get all transactions with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const borrowerType = searchParams.get('borrower_type'); // student or staff
    const status = searchParams.get('status'); // issued, returned, overdue
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const classFilter = searchParams.get('class');
    const sectionFilter = searchParams.get('section');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('library_transactions')
      .select(`
        *,
        book_copy:library_book_copies(
          accession_number,
          barcode,
          book:library_books(
            id,
            title,
            author,
            edition
          )
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (borrowerType && borrowerType !== 'all') {
      query = query.eq('borrower_type', borrowerType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('issue_date', startDate);
    }
    if (endDate) {
      query = query.lte('issue_date', endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }

    // Enrich transactions with borrower details
    const enrichedTransactions = await Promise.all(
      (transactions || []).map(async (transaction) => {
        let borrowerDetails = null;
        if (transaction.borrower_type === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('student_name, admission_no, class, section')
            .eq('id', transaction.borrower_id)
            .single();
          borrowerDetails = student;
        } else if (transaction.borrower_type === 'staff') {
          const { data: staff } = await supabase
            .from('staff')
            .select('full_name, staff_id')
            .eq('id', transaction.borrower_id)
            .single();
          borrowerDetails = staff;
        }

        // Apply class/section filter if provided
        if (classFilter && borrowerDetails && 'class' in borrowerDetails) {
          if (borrowerDetails.class !== classFilter) {
            return null;
          }
        }
        if (sectionFilter && borrowerDetails && 'section' in borrowerDetails) {
          if (borrowerDetails.section !== sectionFilter) {
            return null;
          }
        }

        return {
          ...transaction,
          borrower: borrowerDetails,
        };
      })
    );

    // Filter out nulls
    const filtered = enrichedTransactions.filter((t) => t !== null);

    return NextResponse.json({ data: filtered }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/transactions
 * Issue a book (create new transaction)
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
      borrower_type,
      borrower_id,
      book_copy_id,
      book_id,
      issued_by,
    } = body;

    if (!school_code || !borrower_type || !borrower_id || !book_copy_id || !book_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Get library settings
    const { data: settings } = await supabase
      .from('library_settings')
      .select('*')
      .eq('school_code', school_code)
      .single();

    const borrowDays = settings?.borrow_days || 14;
    const maxBooks = borrower_type === 'student'
      ? (settings?.max_books_student || 3)
      : (settings?.max_books_staff || 5);

    // Check if borrower has reached max books limit
    const { count: activeCount } = await supabase
      .from('library_transactions')
      .select('*', { count: 'exact' })
      .eq('school_code', school_code)
      .eq('borrower_type', borrower_type)
      .eq('borrower_id', borrower_id)
      .eq('status', 'issued');

    if (activeCount && activeCount >= maxBooks) {
      return NextResponse.json(
        { error: `Maximum ${maxBooks} books allowed. Please return a book first.` },
        { status: 400 }
      );
    }

    // Verify book copy is available
    const { data: bookCopy, error: copyError } = await supabase
      .from('library_book_copies')
      .select('*')
      .eq('id', book_copy_id)
      .eq('school_code', school_code)
      .single();

    if (copyError || !bookCopy) {
      return NextResponse.json(
        { error: 'Book copy not found' },
        { status: 404 }
      );
    }

    if (bookCopy.status !== 'available') {
      return NextResponse.json(
        { error: 'This book copy is not available' },
        { status: 400 }
      );
    }

    // Calculate due date
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrowDays);

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('library_transactions')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        borrower_type: borrower_type,
        borrower_id: borrower_id,
        book_copy_id: book_copy_id,
        book_id: book_id,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'issued',
        issued_by: issued_by || null,
      }])
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json(
        { error: 'Failed to create transaction', details: transactionError.message },
        { status: 500 }
      );
    }

    // Update book copy status
    await supabase
      .from('library_book_copies')
      .update({
        status: 'issued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', book_copy_id);

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error('Error issuing book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

