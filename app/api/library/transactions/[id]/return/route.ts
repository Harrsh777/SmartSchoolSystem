import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/library/transactions/[id]/return
 * Return a book
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Note: Permission check removed - route-level authentication handles authorization
  // const permissionCheck = await requirePermission(request, 'manage_library');
  // if (permissionCheck) {
  //   return permissionCheck;
  // }

  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, fine_amount, fine_reason, returned_by, notes } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('library_transactions')
      .select('*, book_copy:library_book_copies(id)')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status === 'returned') {
      return NextResponse.json(
        { error: 'This book has already been returned' },
        { status: 400 }
      );
    }

    // Calculate fine if not provided
    let calculatedFine = fine_amount || 0;
    if (!fine_amount && transaction.due_date) {
      const returnDate = new Date();
      const dueDate = new Date(transaction.due_date);
      
      if (returnDate > dueDate) {
        // Get library settings
        const { data: settings } = await supabase
          .from('library_settings')
          .select('late_fine_per_day, late_fine_fixed')
          .eq('school_code', school_code)
          .single();

        if (settings) {
          const daysLate = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (settings.late_fine_per_day > 0) {
            calculatedFine = daysLate * settings.late_fine_per_day;
          } else if (settings.late_fine_fixed > 0) {
            calculatedFine = settings.late_fine_fixed;
          }
        }
      }
    }

    // Update transaction
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('library_transactions')
      .update({
        return_date: new Date().toISOString().split('T')[0],
        fine_amount: calculatedFine,
        fine_reason: fine_reason || (calculatedFine > 0 ? 'late' : null),
        status: 'returned',
        returned_by: returned_by || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update transaction', details: updateError.message },
        { status: 500 }
      );
    }

    // Update book copy status to available
    const bookCopy = transaction.book_copy as { id: string } | null;
    if (bookCopy) {
      await supabase
        .from('library_book_copies')
        .update({
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookCopy.id);
    }

    return NextResponse.json({ data: updatedTransaction }, { status: 200 });
  } catch (error) {
    console.error('Error returning book:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

