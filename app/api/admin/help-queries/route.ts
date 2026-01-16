import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

function getSupabase() {
  return getServiceRoleClient();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const schoolCode = searchParams.get('school_code');

    const supabase = getSupabase();
    let query = supabase
      .from('help_queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching help queries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch help queries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Error in help queries API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, admin_response } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: { status: string; admin_response?: string; updated_at?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (admin_response) {
      updateData.admin_response = admin_response;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('help_queries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating help query:', error);
      return NextResponse.json(
        { error: 'Failed to update help query' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in help query update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

