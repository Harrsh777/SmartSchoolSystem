import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { generateReportCardHTML } from '@/lib/report-card-html';
import type { ReportCardData } from '@/lib/report-card-html';

/**
 * GET /api/marks/report-card/html
 * Generate HTML report card for a student (on-the-fly, no save)
 * Query: school_code, student_id, exam_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const examId = searchParams.get('exam_id');

    if (!schoolCode || !studentId || !examId) {
      return NextResponse.json(
        { error: 'School code, student ID, and exam ID are required' },
        { status: 400 }
      );
    }

    const data = await fetchReportCardData(schoolCode, studentId, examId);
    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const html = generateReportCardHTML(data);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="report_card_${(data.student.student_name || '').replace(/\s+/g, '_')}_${(data.exam.exam_name || '').replace(/\s+/g, '_')}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating report card HTML:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function fetchReportCardData(
  schoolCode: string,
  studentId: string,
  examId: string
): Promise<ReportCardData | null> {
  const supabase = getServiceRoleClient();

  const [studentRes, examRes, schoolRes] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).eq('school_code', schoolCode).single(),
    supabase.from('examinations').select('*').eq('id', examId).eq('school_code', schoolCode).single(),
    supabase
      .from('accepted_schools')
      .select('school_name, school_code, school_address, school_email, school_phone, affiliation, logo_url, principal_name')
      .eq('school_code', schoolCode)
      .single(),
  ]);

  const student = studentRes.data;
  const exam = examRes.data;
  const school = schoolRes.data;

  if (!student || studentRes.error || !exam || examRes.error || !school || schoolRes.error) {
    return null;
  }

  const [marksRes, summaryRes, gradeScalesRes] = await Promise.all([
    supabase
      .from('student_subject_marks')
      .select(`*, subject:subjects(id, name, color)`)
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true }),
    supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle(),
    supabase
      .from('grade_scales')
      .select('grade, min_marks, max_marks, min_percentage, max_percentage')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .or(`academic_year.is.null,academic_year.eq.${exam.academic_year || ''}`)
      .order('display_order', { ascending: false }),
  ]);

  const marks = marksRes.data || [];
  const summary = summaryRes.data;

  let gradeScales: Array<{ grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }> = [];
  const gradeScalesData = gradeScalesRes?.data;
  if (gradeScalesData?.length) {
    gradeScales = gradeScalesData.map((g: { grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }) => ({
      grade: g.grade,
      min_marks: g.min_marks,
      max_marks: g.max_marks,
      min_percentage: g.min_percentage ?? (g.min_marks != null ? g.min_marks : undefined),
      max_percentage: g.max_percentage ?? (g.max_marks != null ? g.max_marks : undefined),
    }));
  } else {
    gradeScales = [
      { grade: 'A1', min_percentage: 91, max_percentage: 100 },
      { grade: 'A2', min_percentage: 81, max_percentage: 90 },
      { grade: 'B1', min_percentage: 71, max_percentage: 80 },
      { grade: 'B2', min_percentage: 61, max_percentage: 70 },
      { grade: 'C1', min_percentage: 51, max_percentage: 60 },
      { grade: 'C2', min_percentage: 41, max_percentage: 50 },
      { grade: 'D', min_percentage: 33, max_percentage: 40 },
      { grade: 'E', min_percentage: 0, max_percentage: 32 },
    ];
  }

  const totalObtained = summary?.total_marks ?? marks.reduce((s, m) => s + (m.marks_obtained ?? 0), 0);
  const totalMax = summary?.total_max_marks ?? marks.reduce((s, m) => s + (m.max_marks || 0), 0);
  const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  const academicYearStart = exam.academic_year ? parseInt(String(exam.academic_year).split('-')[0] || '', 10) : new Date().getFullYear();
  const academicYearEnd = academicYearStart + 1;
  const startDate = `${academicYearStart}-04-01`;
  const endDate = `${academicYearEnd}-03-31`;

  const { data: attendanceRows } = await supabase
    .from('student_attendance')
    .select('status, date')
    .eq('student_id', studentId)
    .eq('school_code', schoolCode)
    .gte('date', startDate)
    .lte('date', endDate);

  let attendance: { present: number; total: number; percentage: number } | null = null;
  if (attendanceRows?.length) {
    const total = attendanceRows.length;
    const present = attendanceRows.filter((r) => String(r.status || '').toLowerCase() === 'present').length;
    attendance = {
      present,
      total,
      percentage: total > 0 ? (present / total) * 100 : 0,
    };
  }

  let coScholastic: Array<{ name: string; term1_grade?: string; term2_grade?: string }> | null = null;
  try {
    const { data: co } = await supabase
      .from('term_co_scholastic')
      .select('*')
      .eq('student_id', studentId)
      .limit(5);
    if (co?.length) {
      coScholastic = [
        { name: 'Work Education or Pre Vocational Education', term1_grade: (co[0] as { discipline_grade?: string }).discipline_grade, term2_grade: (co[0] as { work_habits_grade?: string }).work_habits_grade },
        { name: 'Art Education', term1_grade: undefined, term2_grade: undefined },
        { name: 'Health & Physical Education', term1_grade: undefined, term2_grade: undefined },
      ];
    }
  } catch {
    coScholastic = null;
  }

  return {
    school: {
      school_name: school.school_name || '',
      school_code: school.school_code || '',
      affiliation: school.affiliation,
      school_email: school.school_email,
      school_phone: school.school_phone,
      school_address: school.school_address,
      logo_url: school.logo_url,
      right_logo_url: (school as { right_logo_url?: string }).right_logo_url,
      principal_name: school.principal_name,
      sub_title: 'SENIOR SECONDARY SCHOOL',
    },
    student: {
      student_name: student.student_name || '',
      admission_no: student.admission_no || '',
      class: student.class || '',
      section: student.section || '',
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address || student.school_address,
      student_contact: student.student_contact || student.phone || student.mobile,
      roll_number: student.roll_number,
    },
    exam: {
      exam_name: exam.exam_name || exam.name || '',
      academic_year: exam.academic_year || '',
      result_date: new Date().toLocaleDateString('en-IN'),
    },
    marks: marks.map((m) => ({
      subject: m.subject || { name: 'N/A' },
      max_marks: Number(m.max_marks) || 0,
      marks_obtained: m.marks_obtained != null ? Number(m.marks_obtained) : null,
      percentage: m.percentage != null ? Number(m.percentage) : undefined,
      grade: m.grade,
      remarks: m.remarks,
    })),
    summary: summary
      ? {
          total_marks: summary.total_marks,
          total_max_marks: summary.total_max_marks,
          percentage: summary.percentage,
          grade: summary.grade,
        }
      : null,
    attendance,
    coScholastic,
    gradeScales,
    result: overallPct >= 33 ? 'Pass' : 'Fail',
    promoted_to: student.class ? `${student.class}-${student.section || 'A'}` : undefined,
  };
}

export async function fetchReportCardDataMultiExam(
  schoolCode: string,
  studentId: string,
  examIds: string[]
): Promise<ReportCardData | null> {
  if (examIds.length === 0) return null;
  if (examIds.length === 1) return fetchReportCardData(schoolCode, studentId, examIds[0]);

  const supabase = getServiceRoleClient();

  const [studentRes, schoolRes] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).eq('school_code', schoolCode).single(),
    supabase
      .from('accepted_schools')
      .select('school_name, school_code, school_address, school_email, school_phone, affiliation, logo_url, principal_name')
      .eq('school_code', schoolCode)
      .single(),
  ]);

  const student = studentRes.data;
  const school = schoolRes.data;
  if (!student || studentRes.error || !school || schoolRes.error) return null;

  const { data: exams } = await supabase
    .from('examinations')
    .select('*')
    .in('id', examIds)
    .eq('school_code', schoolCode)
    .order('start_date', { ascending: true });

  if (!exams || exams.length === 0) return null;

  type ExamRecord = { id: string; academic_year?: string; exam_name?: string; name?: string; start_date?: string };
  const firstExam = exams[0] as ExamRecord;
  const examNames = exams.map((e: ExamRecord) => e.exam_name || e.name || '').filter(Boolean);
  const combinedExamName = examNames.join(' + ') || 'Combined Exam';

  // Build examsList for column headers
  const examsList = exams.map((e: ExamRecord) => ({
    id: e.id,
    name: e.exam_name || e.name || 'Exam',
    max_marks_per_subject: 100, // Default, will be overridden per subject if needed
  }));

  const { data: allMarks } = await supabase
    .from('student_subject_marks')
    .select(`*, subject:subjects(id, name, color)`)
    .in('exam_id', examIds)
    .eq('student_id', studentId)
    .order('exam_id', { ascending: true })
    .order('created_at', { ascending: true });

  const { data: gradeScalesData } = await supabase
    .from('grade_scales')
    .select('grade, min_marks, max_marks, min_percentage, max_percentage')
    .eq('school_code', schoolCode)
    .eq('is_active', true)
    .or(`academic_year.is.null,academic_year.eq.${firstExam.academic_year || ''}`)
    .order('display_order', { ascending: false });

  let gradeScales: Array<{ grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }> = [];
  if (gradeScalesData?.length) {
    gradeScales = gradeScalesData.map((g: { grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }) => ({
      grade: g.grade,
      min_marks: g.min_marks,
      max_marks: g.max_marks,
      min_percentage: g.min_percentage ?? g.min_marks,
      max_percentage: g.max_percentage ?? g.max_marks,
    }));
  } else {
    gradeScales = [
      { grade: 'A1', min_percentage: 91, max_percentage: 100 },
      { grade: 'A2', min_percentage: 81, max_percentage: 90 },
      { grade: 'B1', min_percentage: 71, max_percentage: 80 },
      { grade: 'B2', min_percentage: 61, max_percentage: 70 },
      { grade: 'C1', min_percentage: 51, max_percentage: 60 },
      { grade: 'C2', min_percentage: 41, max_percentage: 50 },
      { grade: 'D', min_percentage: 33, max_percentage: 40 },
      { grade: 'E', min_percentage: 0, max_percentage: 32 },
    ];
  }

  const getGradeFromPct = (pct: number): string => {
    const s = gradeScales.find((g) => pct >= (g.min_percentage ?? g.min_marks ?? 0) && pct <= (g.max_percentage ?? g.max_marks ?? 100));
    return s?.grade ?? '-';
  };

  // Build multi-exam marks structure: group by subject, then by exam
  type MarkRecord = {
    exam_id: string;
    subject_id?: string;
    subject?: { id?: string; name?: string };
    max_marks?: number;
    marks_obtained?: number | null;
    grade?: string;
    remarks?: string;
  };

  const bySubject: Record<string, {
    subject: { name: string };
    exams: Record<string, { exam_id: string; exam_name: string; marks_obtained: number | null; max_marks: number; grade?: string }>;
    overall_max_marks: number;
    overall_marks_obtained: number | null;
  }> = {};

  for (const m of (allMarks || []) as MarkRecord[]) {
    const subName = m.subject?.name || 'N/A';
    const subId = m.subject_id || subName;
    const max = Number(m.max_marks) || 0;
    const obtained = m.marks_obtained != null ? Number(m.marks_obtained) : null;
    const examId = m.exam_id;
    const examInfo = exams.find((e: ExamRecord) => e.id === examId);
    const examName = examInfo?.exam_name || examInfo?.name || 'Exam';

    if (!bySubject[subId]) {
      bySubject[subId] = { 
        subject: { name: subName }, 
        exams: {},
        overall_max_marks: 0, 
        overall_marks_obtained: null 
      };
    }

    // Store per-exam marks
    const pct = max > 0 && obtained != null ? (obtained / max) * 100 : 0;
    bySubject[subId].exams[examId] = {
      exam_id: examId,
      exam_name: examName,
      marks_obtained: obtained,
      max_marks: max,
      grade: getGradeFromPct(pct),
    };

    // Accumulate for overall
    bySubject[subId].overall_max_marks += max;
    if (obtained !== null) {
      bySubject[subId].overall_marks_obtained = (bySubject[subId].overall_marks_obtained ?? 0) + obtained;
    }
  }

  // Convert to multiExamMarks array
  const multiExamMarks = Object.values(bySubject).map((m) => {
    const overallPct = m.overall_max_marks > 0 && m.overall_marks_obtained != null 
      ? (m.overall_marks_obtained / m.overall_max_marks) * 100 
      : 0;
    return {
      subject: m.subject,
      exams: examIds.map(eid => {
        const examData = m.exams[eid];
        const examInfo = exams.find((e: ExamRecord) => e.id === eid);
        return examData || {
          exam_id: eid,
          exam_name: examInfo?.exam_name || examInfo?.name || 'Exam',
          marks_obtained: null,
          max_marks: 0,
          grade: '-',
        };
      }),
      overall_max_marks: m.overall_max_marks,
      overall_marks_obtained: m.overall_marks_obtained,
      overall_grade: getGradeFromPct(overallPct),
    };
  });

  // Also create simple marks array for backward compatibility
  const marks = multiExamMarks.map((m) => ({
    subject: m.subject,
    max_marks: m.overall_max_marks,
    marks_obtained: m.overall_marks_obtained,
    grade: m.overall_grade,
  }));

  const totalObtained = marks.reduce((s, m) => s + (m.marks_obtained ?? 0), 0);
  const totalMax = marks.reduce((s, m) => s + m.max_marks, 0);
  const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  const academicYearStart = firstExam.academic_year ? parseInt(String(firstExam.academic_year).split('-')[0] || '', 10) : new Date().getFullYear();
  const startDate = `${academicYearStart}-04-01`;
  const endDate = `${academicYearStart + 1}-03-31`;

  const { data: attendanceRows } = await supabase
    .from('student_attendance')
    .select('status, date')
    .eq('student_id', studentId)
    .eq('school_code', schoolCode)
    .gte('date', startDate)
    .lte('date', endDate);

  let attendance: { present: number; total: number; percentage: number } | null = null;
  if (attendanceRows?.length) {
    const total = attendanceRows.length;
    const present = attendanceRows.filter((r) => String(r.status || '').toLowerCase() === 'present').length;
    attendance = { present, total, percentage: total > 0 ? (present / total) * 100 : 0 };
  }

  return {
    school: {
      school_name: school.school_name || '',
      school_code: school.school_code || '',
      affiliation: school.affiliation,
      school_email: school.school_email,
      school_phone: school.school_phone,
      school_address: school.school_address,
      logo_url: school.logo_url,
      right_logo_url: (school as { right_logo_url?: string }).right_logo_url,
      principal_name: school.principal_name,
      sub_title: 'SENIOR SECONDARY SCHOOL',
    },
    student: {
      student_name: student.student_name || '',
      admission_no: student.admission_no || '',
      class: student.class || '',
      section: student.section || '',
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address || student.school_address,
      student_contact: student.student_contact || student.phone || student.mobile,
      roll_number: student.roll_number,
    },
    exam: {
      exam_name: combinedExamName,
      academic_year: firstExam.academic_year || '',
      result_date: new Date().toLocaleDateString('en-IN'),
    },
    marks,
    multiExamMarks,
    examsList,
    summary: {
      total_marks: totalObtained,
      total_max_marks: totalMax,
      percentage: overallPct,
      grade: gradeScales.length ? getGradeFromPct(overallPct) : '-',
    },
    attendance,
    coScholastic: null,
    gradeScales,
    result: overallPct >= 33 ? 'Pass' : 'Fail',
    promoted_to: student.class ? `${student.class}-${student.section || 'A'}` : undefined,
  };
}
