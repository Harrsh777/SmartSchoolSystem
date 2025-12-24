import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch notice
    const { data: notice, error: noticeError } = await supabase
      .from('notices')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (noticeError || !notice) {
      return NextResponse.json(
        { error: 'Notice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: notice }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify notice belongs to this school
    const { data: existingNotice, error: fetchError } = await supabase
      .from('notices')
      .select('id, school_code, status')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingNotice) {
      return NextResponse.json(
        { error: 'Notice not found or access denied' },
        { status: 404 }
      );
    }

    // If changing to Active and no publish_at, set it to now
    if (updateData.status === 'Active' && !updateData.publish_at && existingNotice.status !== 'Active') {
      updateData.publish_at = new Date().toISOString();
    }

    // Update notice
    const { data: updatedNotice, error: updateError } = await supabase
      .from('notices')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update notice', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedNotice }, { status: 200 });
  } catch (error) {
    console.error('Error updating notice:', error);
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
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify notice belongs to this school
    const { data: existingNotice, error: fetchError } = await supabase
      .from('notices')
      .select('id, school_code')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !existingNotice) {
      return NextResponse.json(
        { error: 'Notice not found or access denied' },
        { status: 404 }
      );
    }

    // Archive instead of delete (audit safety)
    const { data: archivedNotice, error: archiveError } = await supabase
      .from('notices')
      .update({ status: 'Archived' })
      .eq('id', id)
      .eq('school_code', schoolCode)
      .select()
      .single();

    if (archiveError) {
      return NextResponse.json(
        { error: 'Failed to archive notice', details: archiveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Notice archived successfully', data: archivedNotice },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error archiving notice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

