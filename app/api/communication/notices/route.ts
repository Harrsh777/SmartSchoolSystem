import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('notices')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: notices, error: noticesError } = await query;

    if (noticesError) {
      return NextResponse.json(
        { error: 'Failed to fetch notices', details: noticesError.message },
        { status: 500 }
      );
    }

    // Apply search filter if provided
    let filteredNotices = notices || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNotices = filteredNotices.filter(
        (notice: any) =>
          notice.title.toLowerCase().includes(searchLower) ||
          notice.content.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ data: filteredNotices }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      title,
      content,
      category,
      priority,
      status,
      publish_at,
    } = body;

    if (!school_code || !title || !content || !category || !priority) {
      return NextResponse.json(
        { error: 'School code, title, content, category, and priority are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Set publish_at based on status
    let publishDate = publish_at;
    if (status === 'Active' && !publish_at) {
      publishDate = new Date().toISOString();
    }

    // Insert notice
    const { data: newNotice, error: insertError } = await supabase
      .from('notices')
      .insert([
        {
          school_id: schoolData.id,
          school_code: school_code,
          title: title,
          content: content,
          category: category,
          priority: priority,
          status: status || 'Draft',
          publish_at: publishDate || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create notice', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newNotice }, { status: 201 });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

