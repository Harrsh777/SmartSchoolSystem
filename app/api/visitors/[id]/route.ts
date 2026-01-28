import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: visitor, error } = await supabase
      .from('visitors')
      .select(`
        *,
        student:students!visitors_student_id_fkey(
          id,
          student_name,
          admission_no
        ),
        host:staff!visitors_host_id_fkey(
          id,
          full_name,
          staff_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Visitor not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: visitor }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getServiceRoleClient();

    const { data: visitor, error } = await supabase
      .from('visitors')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating visitor:', error);
      return NextResponse.json(
        { error: 'Failed to update visitor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: visitor }, { status: 200 });
  } catch (error) {
    console.error('Error updating visitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting visitor:', error);
      return NextResponse.json(
        { error: 'Failed to delete visitor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Visitor deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

