import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/diary
 * Get diary entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYearId = searchParams.get('academic_year_id');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type
        )
      `, { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: diaries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch diaries', details: error.message },
        { status: 500 }
      );
    }

    // Get read counts for each diary
    const diaryIds = (diaries || []).map((d) => d.id);
    const { data: readCounts } = await supabase
      .from('diary_reads')
      .select('diary_id')
      .in('diary_id', diaryIds);

    // Calculate read counts per diary
    const readCountMap = new Map<string, number>();
    (readCounts || []).forEach((read) => {
      readCountMap.set(read.diary_id, (readCountMap.get(read.diary_id) || 0) + 1);
    });

    // Get total target counts (students in assigned classes)
    // For now, we'll use a placeholder - in production, calculate from students table
    const diariesWithCounts = (diaries || []).map((diary) => ({
      ...diary,
      read_count: readCountMap.get(diary.id) || 0,
      total_targets: diary.diary_targets?.length || 0, // Simplified - should count actual students
    }));

    return NextResponse.json({
      data: diariesWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching diaries:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/diary
 * Create a new diary entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      academic_year_id,
      title,
      content,
      type,
      mode,
      targets, // Array of { class_name, section_name }
      attachments, // Array of { file_name, file_url, file_type, file_size }
      created_by,
    } = body;

    // Validation
    if (!school_code || !title || !type) {
      return NextResponse.json(
        { error: 'School code, title, and type are required' },
        { status: 400 }
      );
    }

    if (!['HOMEWORK', 'ANNOUNCEMENT', 'HOLIDAY', 'OTHER'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid diary type' },
        { status: 400 }
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { error: 'At least one class/section must be selected' },
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

    // Create diary entry
    const { data: diary, error: insertError } = await supabase
      .from('diaries')
      .insert([{
        school_id: schoolData.id,
        school_code,
        academic_year_id: academic_year_id || null,
        title,
        content: content || null,
        type,
        mode: mode || 'GENERAL',
        created_by: created_by || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create diary entry', details: insertError.message },
        { status: 500 }
      );
    }

    // Create diary targets
    const targetInserts = targets.map((target: { class_name: string; section_name?: string }) => ({
      diary_id: diary.id,
      class_name: target.class_name,
      section_name: target.section_name || null,
    }));

    const { error: targetsError } = await supabase
      .from('diary_targets')
      .insert(targetInserts);

    if (targetsError) {
      // Rollback diary creation
      await supabase.from('diaries').delete().eq('id', diary.id);
      return NextResponse.json(
        { error: 'Failed to create diary targets', details: targetsError.message },
        { status: 500 }
      );
    }

    // Create attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentInserts = attachments.map((att: { file_name: string; file_url: string; file_type: string; file_size?: number }) => ({
        diary_id: diary.id,
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type,
        file_size: att.file_size || null,
        uploaded_by: created_by || null,
      }));

      const { error: attachmentsError } = await supabase
        .from('diary_attachments')
        .insert(attachmentInserts);

      if (attachmentsError) {
        console.error('Error creating attachments:', attachmentsError);
        // Don't fail the request, just log the error
      }
    }

    // Fetch complete diary with relations
    const { data: completeDiary } = await supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type
        )
      `)
      .eq('id', diary.id)
      .single();

    return NextResponse.json({ data: completeDiary }, { status: 201 });
  } catch (error) {
    console.error('Error creating diary entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



