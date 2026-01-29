import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/** GET: return all booked slots (demo_date, demo_time) for the public demo page to disable them */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('demo_requests')
      .select('demo_date, demo_time');

    if (error) {
      console.error('Error fetching demo slots:', error);
      return NextResponse.json(
        { error: 'Failed to load availability' },
        { status: 500 }
      );
    }

    const slots = (data ?? []).map((row) => ({
      demo_date: String(row.demo_date).split('T')[0],
      demo_time: String(row.demo_time).trim(),
    }));

    return NextResponse.json({ slots });
  } catch (err) {
    console.error('Error in GET /api/demo:', err);
    return NextResponse.json(
      { error: 'Failed to load availability' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, demo_date, demo_time } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      );
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!demo_date || typeof demo_date !== 'string') {
      return NextResponse.json(
        { error: 'Demo date is required' },
        { status: 400 }
      );
    }
    if (!demo_time || typeof demo_time !== 'string' || !demo_time.trim()) {
      return NextResponse.json(
        { error: 'Demo time is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('demo_requests')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        demo_date: demo_date.trim(),
        demo_time: demo_time.trim(),
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error inserting demo request:', error);
      return NextResponse.json(
        { error: 'Failed to schedule demo. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: data?.id, created_at: data?.created_at },
    });
  } catch (err) {
    console.error('Error in POST /api/demo:', err);
    return NextResponse.json(
      { error: 'Failed to schedule demo. Please try again.' },
      { status: 500 }
    );
  }
}
