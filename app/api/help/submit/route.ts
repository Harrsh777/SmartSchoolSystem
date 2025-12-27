import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, query, user_name, user_role } = body;

    // Validate required fields
    if (!school_code || !query) {
      return NextResponse.json(
        { error: 'School code and query are required' },
        { status: 400 }
      );
    }

    // Insert the help query
    const { data, error } = await supabase
      .from('help_queries')
      .insert({
        school_code,
        query: query.trim(),
        user_name: user_name || 'Unknown',
        user_role: user_role || 'User',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting help query:', error);
      return NextResponse.json(
        { error: 'Failed to submit query' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Query submitted successfully',
    });
  } catch (error) {
    console.error('Error in help submit API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

