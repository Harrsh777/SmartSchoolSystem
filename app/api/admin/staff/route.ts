import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');

    // Build query - fetch all staff or filter by school
    let query = supabase
      .from('staff')
      .select(`
        *,
        accepted_schools:school_id (
          school_name,
          school_code
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data: staff, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: error.message },
        { status: 500 }
      );
    }

    // Apply search filter if provided
    let filteredStaff = staff || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStaff = filteredStaff.filter((s: any) =>
        s.full_name?.toLowerCase().includes(searchLower) ||
        s.staff_id?.toLowerCase().includes(searchLower) ||
        s.role?.toLowerCase().includes(searchLower) ||
        s.school_code?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ data: filteredStaff }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

