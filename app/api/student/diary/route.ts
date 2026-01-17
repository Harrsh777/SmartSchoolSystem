import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/diary
 * Fetch diary entries (announcements) for a specific student's class
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const class_name = searchParams.get('class');
    const section = searchParams.get('section');

    if (!schoolCode || !studentId || !class_name) {
      return NextResponse.json(
        { error: 'school_code, student_id, and class are required' },
        { status: 400 }
      );
    }

    // Fetch diary entries that target this student's class
    // We need to join with diary_targets to filter by class and section
    const { data: diaries, error } = await supabase
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
          file_type,
          file_size
        ),
        created_by_staff:created_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching diaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch diary entries', details: error.message },
        { status: 500 }
      );
    }

    // Filter diaries to only include those targeting this student's class
    interface DiaryTarget {
      class_name: string;
      section_name?: string | null;
    }
    interface DiaryRecord {
      id: string;
      diary_targets?: DiaryTarget[] | null;
    }
    const filteredDiaries = (diaries || []).filter((diary: DiaryRecord) => {
      const targets = diary.diary_targets || [];
      return targets.some((target: DiaryTarget) => {
        // Match class name
        if (target.class_name !== class_name) return false;
        
        // If section is specified, match section (or if target has no section, it applies to all sections)
        if (section && target.section_name && target.section_name !== section) return false;
        
        // If academic_year is provided, we could filter by it, but for now we'll include all
        return true;
      });
    });

    // Check which diaries the student has read
    const diaryIds = filteredDiaries.map((d: DiaryRecord) => d.id);
    const { data: readRecords } = await supabase
      .from('diary_reads')
      .select('diary_id')
      .in('diary_id', diaryIds)
      .eq('user_id', studentId)
      .eq('user_type', 'STUDENT');

    interface ReadRecord {
      diary_id: string;
    }
    const readDiaryIds = new Set((readRecords || []).map((r: ReadRecord) => r.diary_id));

    // Format the data
    interface DiaryWithDetails extends DiaryRecord {
      title: string;
      content: string;
      type: string;
      mode?: string | null;
      created_at: string;
      updated_at?: string | null;
      created_by?: string;
      diary_attachments?: Array<{
        id: string;
        file_name: string;
        file_url: string;
        file_type?: string | null;
        file_size?: number | null;
      }> | null;
      created_by_staff?: {
        full_name?: string;
      } | null;
      academic_year_id?: string | null;
    }
    const formattedDiaries = filteredDiaries.map((diary: DiaryWithDetails) => {
      // Get target classes for display
      const targetClasses = (diary.diary_targets || [])
        .map((t: DiaryTarget) => `${t.class_name}${t.section_name ? `-${t.section_name}` : ''}`)
        .join(', ');

      return {
        id: diary.id,
        title: diary.title,
        content: diary.content,
        type: diary.type, // 'HOMEWORK' or 'OTHER'
        mode: diary.mode,
        created_at: diary.created_at,
        updated_at: diary.updated_at,
        created_by: diary.created_by_staff?.full_name || 'Unknown',
        created_by_id: diary.created_by,
        target_classes: targetClasses,
        attachments: (diary.diary_attachments || []).map((att) => ({
          id: att.id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: att.file_size,
        })),
        is_read: readDiaryIds.has(diary.id),
        academic_year_id: diary.academic_year_id,
      };
    });

    return NextResponse.json({ data: formattedDiaries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student diary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
