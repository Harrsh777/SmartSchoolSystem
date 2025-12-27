import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classFilter = searchParams.get('class');
    const sectionFilter = searchParams.get('section');
    const searchQuery = searchParams.get('search');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query for students
    let query = supabase
      .from('students')
      .select('id, admission_no, student_name, class, section, school_code')
      .eq('school_code', schoolCode)
      .eq('status', 'active')
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('student_name', { ascending: true });

    // Apply filters
    if (classFilter) {
      query = query.eq('class', classFilter);
    }
    if (sectionFilter) {
      query = query.eq('section', sectionFilter);
    }
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      query = query.or(`student_name.ilike.${searchPattern},admission_no.ilike.${searchPattern}`);
    }

    // Fetch all students (no limit)
    const { data: students, error: studentsError } = await query;

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get fee totals for each student
    interface StudentData {
      id: string;
      admission_no?: string;
      student_name?: string;
      [key: string]: unknown;
    }
    const studentsWithFees = await Promise.all(
      (students || []).map(async (student: StudentData) => {
        const { data: feeRecords } = await supabase
          .from('fees')
          .select('amount')
          .eq('school_code', schoolCode)
          .eq('student_id', student.id);

        interface FeeRecord {
          amount?: string | number;
          [key: string]: unknown;
        }
        const totalPaid = (feeRecords || []).reduce(
          (sum: number, fee: FeeRecord) => sum + Number(fee.amount || 0),
          0
        );

        return {
          ...student,
          total_paid: totalPaid,
          fee_status: totalPaid > 0 ? 'paid' : 'pending',
        };
      })
    );

    return NextResponse.json({ data: studentsWithFees }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students for fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

