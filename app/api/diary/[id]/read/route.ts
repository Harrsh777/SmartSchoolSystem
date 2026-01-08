import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/diary/[id]/read
 * Mark a diary entry as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id, user_type } = body;

    if (!user_id || !user_type) {
      return NextResponse.json(
        { error: 'User ID and user type are required' },
        { status: 400 }
      );
    }

    if (!['STUDENT', 'PARENT'].includes(user_type)) {
      return NextResponse.json(
        { error: 'Invalid user type. Must be STUDENT or PARENT' },
        { status: 400 }
      );
    }

    // Check if already read
    const { data: existing } = await supabase
      .from('diary_reads')
      .select('id')
      .eq('diary_id', id)
      .eq('user_id', user_id)
      .eq('user_type', user_type)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already marked as read', data: existing }, { status: 200 });
    }

    // Create read receipt
    const { data: readReceipt, error } = await supabase
      .from('diary_reads')
      .insert([{
        diary_id: id,
        user_id,
        user_type,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to mark as read', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: readReceipt }, { status: 201 });
  } catch (error) {
    console.error('Error marking diary as read:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



