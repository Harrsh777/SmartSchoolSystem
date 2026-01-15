import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const date = searchParams.get('date');

    if (!schoolCode || !date) {
      return NextResponse.json(
        { error: 'School code and date are required' },
        { status: 400 }
      );
    }

    // Fetch collections for the date
    const { data: collections, error } = await supabase
      .from('fee_collections')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode)
      .eq('payment_date', date)
      .eq('cancelled', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching daily collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch daily collections', details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary
    const summary = {
      total_collected: collections?.reduce((sum, c) => sum + parseFloat(c.total_amount?.toString() || '0'), 0) || 0,
      transaction_count: collections?.length || 0,
      by_payment_mode: {} as Record<string, number>,
      by_class: {} as Record<string, number>,
      students_count: new Set(collections?.map(c => c.student_id)).size || 0,
    };

    collections?.forEach(collection => {
      const mode = collection.payment_mode || 'unknown';
      summary.by_payment_mode[mode] = (summary.by_payment_mode[mode] || 0) + parseFloat(collection.total_amount?.toString() || '0');
      
      const className = collection.student?.class ? `${collection.student.class}-${collection.student.section}` : 'Unknown';
      summary.by_class[className] = (summary.by_class[className] || 0) + parseFloat(collection.total_amount?.toString() || '0');
    });

    return NextResponse.json({
      data: {
        date,
        collections: collections || [],
        summary,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating daily report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
