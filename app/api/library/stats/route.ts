import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/library/stats
 * Get library statistics and analytics
 */
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

    // Get total books
    const { count: totalBooks } = await supabase
      .from('library_books')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Get total copies
    const { count: totalCopies } = await supabase
      .from('library_book_copies')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Get available copies
    const { count: availableCopies } = await supabase
      .from('library_book_copies')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'available');

    // Get issued copies
    const { count: issuedCopies } = await supabase
      .from('library_book_copies')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'issued');

    // Get overdue transactions
    const today = new Date().toISOString().split('T')[0];
    const { count: overdueCount } = await supabase
      .from('library_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'issued')
      .lt('due_date', today);

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from('library_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Get most issued books
    const { data: mostIssued } = await supabase
      .from('library_transactions')
      .select('book_id, book:library_books(title, author)')
      .eq('school_code', schoolCode)
      .eq('status', 'returned');

    // Count book issues
    const bookIssueCounts = new Map<string, { title: string; author: string | null; count: number }>();
    (mostIssued || []).forEach((transaction) => {
      const book = Array.isArray(transaction.book) ? transaction.book[0] : transaction.book;
      if (book) {
        const bookData = book as { title?: string; author?: string | null };
        const current = bookIssueCounts.get(String(transaction.book_id || '')) || { title: bookData.title || '', author: bookData.author || null, count: 0 };
        current.count++;
        bookIssueCounts.set(String(transaction.book_id || ''), current);
      }
    });

    const mostIssuedBooks = Array.from(bookIssueCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get monthly issue/return trend (last 12 months)
    const { data: allTransactions } = await supabase
      .from('library_transactions')
      .select('issue_date, return_date, status')
      .eq('school_code', schoolCode)
      .gte('issue_date', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0]);

    // Calculate monthly stats
    const monthlyStats: Record<string, { issues: number; returns: number }> = {};
    (allTransactions || []).forEach((transaction) => {
      const issueMonth = transaction.issue_date?.substring(0, 7); // YYYY-MM
      if (issueMonth) {
        if (!monthlyStats[issueMonth]) {
          monthlyStats[issueMonth] = { issues: 0, returns: 0 };
        }
        monthlyStats[issueMonth].issues++;
      }
      if (transaction.return_date) {
        const returnMonth = transaction.return_date.substring(0, 7);
        if (!monthlyStats[returnMonth]) {
          monthlyStats[returnMonth] = { issues: 0, returns: 0 };
        }
        monthlyStats[returnMonth].returns++;
      }
    });

    // Get section-wise usage
    const { data: sectionUsage } = await supabase
      .from('library_transactions')
      .select(`
        book_id,
        book:library_books(
          section_id,
          section:library_sections(name)
        )
      `)
      .eq('school_code', schoolCode)
      .eq('status', 'returned');

    const sectionCounts = new Map<string, number>();
    (sectionUsage || []).forEach((transaction) => {
      const book = Array.isArray(transaction.book) ? transaction.book[0] : transaction.book;
      const section = book && typeof book === 'object' && 'section' in book 
        ? (Array.isArray(book.section) ? book.section[0] : book.section)
        : null;
      const sectionName = (section && typeof section === 'object' && 'name' in section 
        ? String(section.name || '')
        : 'Unknown') || 'Unknown';
      sectionCounts.set(sectionName, (sectionCounts.get(sectionName) || 0) + 1);
    });

    // Get student vs staff usage
    const { data: borrowerStats } = await supabase
      .from('library_transactions')
      .select('borrower_type')
      .eq('school_code', schoolCode)
      .eq('status', 'returned');

    const studentCount = (borrowerStats || []).filter((t) => t.borrower_type === 'student').length;
    const staffCount = (borrowerStats || []).filter((t) => t.borrower_type === 'staff').length;

    return NextResponse.json({
      data: {
        totalBooks: totalBooks || 0,
        totalCopies: totalCopies || 0,
        availableCopies: availableCopies || 0,
        issuedCopies: issuedCopies || 0,
        overdueBooks: overdueCount || 0,
        totalTransactions: totalTransactions || 0,
        mostIssuedBooks: mostIssuedBooks,
        monthlyTrend: monthlyStats,
        sectionUsage: Object.fromEntries(sectionCounts),
        borrowerStats: {
          students: studentCount,
          staff: staffCount,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching library stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

