import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Test if accepted_schools table exists and is accessible
    const { error } = await supabase
      .from('accepted_schools')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: 'Cannot access accepted_schools table. Please check: 1) Table exists, 2) RLS policies allow inserts, 3) Supabase credentials are correct'
        },
        { status: 500 }
      );
    }

    // Test if we can insert (dry run by checking structure)
    return NextResponse.json(
      {
        success: true,
        message: 'accepted_schools table is accessible',
        canRead: true,
        tableExists: true
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to connect to Supabase. Please check your environment variables.'
      },
      { status: 500 }
    );
  }
}

