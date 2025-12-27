import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get event notifications for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const userType = searchParams.get('user_type'); // 'student' or 'staff'
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    if (!schoolCode || !userType || !userId) {
      return NextResponse.json(
        { error: 'School code, user type, and user ID are required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('event_notifications')
      .select(`
        *,
        event:events (
          id,
          event_date,
          title,
          description,
          event_type,
          applicable_for
        )
      `)
      .eq('school_code', schoolCode)
      .eq('user_type', userType)
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: notificationsError } = await query
      .order('created_at', { ascending: false });

    if (notificationsError) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: notificationsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: notifications || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, school_code } = body;

    if (!notification_id || !school_code) {
      return NextResponse.json(
        { error: 'Notification ID and school code are required' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('event_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notification_id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to update notification', details: updateError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

