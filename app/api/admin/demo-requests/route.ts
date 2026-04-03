import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSuperAdminSession } from '@/lib/super-admin-api';

export interface DemoRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  demo_date: string;
  demo_time: string;
  created_at: string | null;
}

export async function GET(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;
  try {
    const { data, error } = await supabase
      .from('demo_requests')
      .select('id, name, phone, email, demo_date, demo_time, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch demo requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('Error fetching demo requests:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
