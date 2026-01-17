import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/copy-checking
 * Fetch copy checking records for a specific student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Fetch copy checking records for this student
    const { data: records, error } = await supabase
      .from('copy_checking')
      .select(`
        *,
        subject:subject_id (
          id,
          name,
          color
        ),
        marked_by_staff:marked_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .order('work_date', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching copy checking records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch copy checking records', details: error.message },
        { status: 500 }
      );
    }

    // Format the data
    interface CopyCheckingRecord {
      id: string;
      subject_id: string;
      subject_name?: string | null;
      status?: string | null;
      updated_at?: string;
      created_at?: string;
      work_date: string;
      work_type: string;
      remarks?: string | null;
      topic?: string | null;
      marked_by?: string;
      subject?: {
        name?: string;
        color?: string;
      } | null;
      marked_by_staff?: {
        full_name?: string;
      } | null;
    }
    const formattedRecords = (records || []).map((record: CopyCheckingRecord) => {
      // Use updated_at as the checked date (when it was last marked/updated)
      // If status is not_marked, there's no checked date
      const checkedDate = record.status && record.status !== 'not_marked' 
        ? (record.updated_at || record.created_at) 
        : null;

      return {
        id: record.id,
        subject_id: record.subject_id,
        subject_name: record.subject_name || record.subject?.name || 'Unknown Subject',
        subject_color: record.subject?.color || '#3B82F6',
        work_date: record.work_date,
        work_type: record.work_type, // 'class_work' or 'homework'
        status: record.status || 'not_marked', // 'green', 'yellow', 'red', 'not_marked'
        remarks: record.remarks || null,
        topic: record.topic || null,
        marked_by: record.marked_by_staff?.full_name || 'Unknown',
        marked_by_id: record.marked_by,
        checked_date: checkedDate,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };
    });

    return NextResponse.json({ data: formattedRecords }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student copy checking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
