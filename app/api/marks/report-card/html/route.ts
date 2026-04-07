import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { getAppUrl } from '@/lib/env';
import {
  generateReportCardHTML,
  formatReportClassLabel,
  type ReportCardData,
  type ReportCardTemplateConfig,
} from '@/lib/report-card-html';
import { fetchCoScholasticRowsForReportCard } from '@/lib/co-scholastic-report';

/**
 * Use the same photo endpoint as the student profile UI so report cards work when
 * the student-photos bucket is private (raw photo_url in HTML would 403).
 */
function formatDobForReport(student: Record<string, unknown>): string {
  const raw = student.date_of_birth ?? student.dob;
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveStudentContact(student: Record<string, unknown>): string {
  const candidates = [
    student.student_contact,
    student.parent_phone,
    student.father_contact,
    student.mother_contact,
    student.phone,
    student.mobile,
    student.contact_no,
  ];
  for (const c of candidates) {
    const t = c != null ? String(c).trim() : '';
    if (t) return t;
  }
  return '';
}

/** When PostgREST embed `subject:subjects` fails, resolve names from subjects table. */
function gradeScalesQuery(
  supabase: ReturnType<typeof getServiceRoleClient>,
  schoolCode: string,
  academicYear: string | null | undefined
) {
  let q = supabase
    .from('grade_scales')
    .select('grade, min_marks, max_marks, min_percentage, max_percentage')
    .eq('school_code', schoolCode)
    .eq('is_active', true);
  const y = String(academicYear ?? '').trim();
  if (y) {
    q = q.or(`academic_year.is.null,academic_year.eq.${y}`);
  } else {
    q = q.or('academic_year.is.null');
  }
  return q.order('display_order', { ascending: false });
}

async function attachSubjectNamesToMarks(
  supabase: ReturnType<typeof getServiceRoleClient>,
  marks: Array<Record<string, unknown>>
): Promise<void> {
  if (!marks.length) return;
  const ids = [...new Set(marks.map((m) => m.subject_id).filter(Boolean))] as string[];
  if (!ids.length) return;
  const needs = marks.some((m) => {
    const sub = m.subject as { name?: string } | null | undefined;
    const name = sub && typeof sub.name === 'string' ? sub.name.trim() : '';
    return Boolean(m.subject_id) && !name;
  });
  if (!needs) return;
  const { data: subs } = await supabase.from('subjects').select('id, name').in('id', ids);
  const byId = new Map((subs || []).map((s) => [String(s.id), String(s.name || 'N/A')]));
  for (const m of marks) {
    const sid = m.subject_id ? String(m.subject_id) : '';
    if (!sid) continue;
    const sub = (m.subject as { name?: string; id?: string; color?: string }) || {};
    const existingName = sub.name && String(sub.name).trim();
    const name = existingName || byId.get(sid) || 'N/A';
    m.subject = { ...sub, id: sub.id || sid, name };
  }
}

type ClassRow = { id: string; class?: string | null; section?: string | null; academic_year?: string | null };

async function resolveClassRowForStudent(
  supabase: ReturnType<typeof getServiceRoleClient>,
  schoolCode: string,
  studentClass: string,
  studentSection: string,
  academicYear: string
): Promise<ClassRow | null> {
  const sc = String(studentClass ?? '').trim();
  const ss = String(studentSection ?? '').trim();
  if (!sc) return null;
  const { data: rows } = await supabase
    .from('classes')
    .select('id, class, section, academic_year')
    .eq('school_code', schoolCode)
    .eq('class', sc)
    .eq('section', ss);
  if (!rows?.length) return null;
  const ay = String(academicYear ?? '').trim();
  if (ay) {
    const exact = rows.find((r) => String(r.academic_year ?? '').trim() === ay);
    if (exact) return exact as ClassRow;
    const loose = rows.find((r) => !r.academic_year);
    if (loose) return loose as ClassRow;
  }
  return rows[0] as ClassRow;
}

async function fetchStudentAttendanceForReport(
  supabase: ReturnType<typeof getServiceRoleClient>,
  opts: {
    schoolCode: string;
    studentId: string;
    classId: string | null;
    academicYear: string;
    startDate: string;
    endDate: string;
  }
): Promise<{ present: number; total: number; percentage: number } | null> {
  const { schoolCode, studentId, classId, academicYear, startDate, endDate } = opts;
  const ay = String(academicYear ?? '').trim();

  if (classId && ay) {
    const { data: manual, error: manErr } = await supabase
      .from('student_manual_attendance')
      .select('attended_days, total_working_days, attendance_percentage')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('academic_year', ay)
      .maybeSingle();
    const code = (manErr as { code?: string } | null)?.code;
    if (!manErr && manual && Number(manual.total_working_days) > 0) {
      return {
        present: Number(manual.attended_days),
        total: Number(manual.total_working_days),
        percentage: Number(manual.attendance_percentage),
      };
    }
    if (manErr && code && code !== 'PGRST116' && !String(manErr.message || '').includes('does not exist')) {
      console.warn('Manual attendance lookup:', manErr.message);
    }
  }

  const { data: attendanceRows, error: attErr } = await supabase
    .from('student_attendance')
    .select('status, attendance_date')
    .eq('student_id', studentId)
    .eq('school_code', schoolCode)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  if (attErr) {
    const { data: legacy } = await supabase
      .from('student_attendance')
      .select('status, date')
      .eq('student_id', studentId)
      .eq('school_code', schoolCode)
      .gte('date', startDate)
      .lte('date', endDate);
    if (legacy?.length) {
      const total = legacy.length;
      const present = legacy.filter((r) => String(r.status || '').toLowerCase() === 'present').length;
      return { present, total, percentage: total > 0 ? (present / total) * 100 : 0 };
    }
    return null;
  }

  if (!attendanceRows?.length) return null;
  const total = attendanceRows.length;
  const present = attendanceRows.filter((r) => String(r.status || '').toLowerCase() === 'present').length;
  return { present, total, percentage: total > 0 ? (present / total) * 100 : 0 };
}

function resolveReportCardStudentPhotoUrl(
  student: Record<string, unknown>,
  schoolCode: string
): string | null {
  const raw =
    (typeof student.photo_url === 'string' && student.photo_url.trim()) ||
    (typeof student.student_photo_url === 'string' && student.student_photo_url.trim()) ||
    (typeof student.student_photo === 'string' && student.student_photo.trim()) ||
    (typeof student.profile_photo_url === 'string' && student.profile_photo_url.trim()) ||
    (typeof student.avatar_url === 'string' && student.avatar_url.trim()) ||
    null;
  if (!raw) return null;

  const id = student.id;
  if (!id || typeof id !== 'string') {
    return raw;
  }

  const qs = `school_code=${encodeURIComponent(schoolCode)}`;
  const base = getAppUrl();
  if (base) {
    return `${base}/api/students/${id}/photo?${qs}`;
  }
  return `/api/students/${id}/photo?${qs}`;
}

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

    const templateId = searchParams.get('template_id');
    let templateConfig: ReportCardTemplateConfig | undefined;
    if (templateId?.trim()) {
      const supabase = getServiceRoleClient();
      const { data: t } = await supabase
        .from('report_card_templates')
        .select('config, school_code')
        .eq('id', templateId.trim())
        .maybeSingle();
      const tplSchool = (t as { school_code?: string | null } | null)?.school_code;
      const allowed =
        t &&
        (tplSchool == null || String(tplSchool).trim() === String(schoolCode).trim());
      if (
        allowed &&
        t.config &&
        typeof t.config === 'object' &&
        Object.keys(t.config as object).length > 0
      ) {
        templateConfig = t.config as ReportCardTemplateConfig;
      }
    }

    const html = generateReportCardHTML(data, templateConfig);

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
      .select('school_name, school_code, school_address, school_email, school_phone, affiliation, affiliation_number, logo_url, right_logo_url, principal_name')
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
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: true }),
    supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('school_code', schoolCode)
      .maybeSingle(),
    gradeScalesQuery(supabase, schoolCode, exam.academic_year as string | undefined),
  ]);

  const marks = marksRes.data || [];
  await attachSubjectNamesToMarks(supabase, marks as Array<Record<string, unknown>>);
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

  const yearForClass = String(
    (student as { academic_year?: string }).academic_year || exam.academic_year || ''
  ).trim();

  const classRow = await resolveClassRowForStudent(
    supabase,
    schoolCode,
    String(student.class || ''),
    String(student.section || ''),
    yearForClass
  );
  const classDisplay =
    classRow != null
      ? formatReportClassLabel(String(classRow.class ?? student.class), String(classRow.section ?? student.section))
      : formatReportClassLabel(String(student.class || ''), String(student.section || ''));

  const attendance = await fetchStudentAttendanceForReport(supabase, {
    schoolCode,
    studentId,
    classId: classRow?.id ?? null,
    academicYear: yearForClass || String(exam.academic_year || ''),
    startDate,
    endDate,
  });

  const examTermId = (exam as { term_id?: string | null }).term_id;
  let coScholastic: Array<{ name: string; term1_grade?: string; term2_grade?: string }> | null = null;

  const cosFromMarks = await fetchCoScholasticRowsForReportCard({
    schoolCode,
    studentId,
    studentClass: String(student.class || ''),
    studentSection: String(student.section || ''),
    examTermIds: examTermId ? [String(examTermId)] : [],
  });
  if (cosFromMarks && cosFromMarks.length > 0) {
    coScholastic = cosFromMarks;
  } else {
    try {
      const { data: co } = await supabase
        .from('term_co_scholastic')
        .select('*')
        .eq('school_code', schoolCode)
        .eq('student_id', studentId)
        .limit(5);
      if (co?.length) {
        coScholastic = [
          {
            name: 'Work Education or Pre Vocational Education',
            term1_grade: (co[0] as { discipline_grade?: string }).discipline_grade,
            term2_grade: (co[0] as { work_habits_grade?: string }).work_habits_grade,
          },
          { name: 'Art Education', term1_grade: undefined, term2_grade: undefined },
          { name: 'Health & Physical Education', term1_grade: undefined, term2_grade: undefined },
        ];
      }
    } catch {
      coScholastic = null;
    }
  }

  return {
    school: {
      school_name: school.school_name || '',
      school_code: school.school_code || '',
      affiliation: school.affiliation,
      affiliation_number: (school as { affiliation_number?: string }).affiliation_number,
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
      class_display: classDisplay,
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address || student.school_address,
      student_contact: resolveStudentContact(student as Record<string, unknown>) || undefined,
      date_of_birth: formatDobForReport(student as Record<string, unknown>) || undefined,
      roll_number: student.roll_number,
      photo_url: resolveReportCardStudentPhotoUrl(student as Record<string, unknown>, schoolCode),
    },
    exam: {
      exam_name: exam.exam_name || exam.name || '',
      academic_year: exam.academic_year || '',
      result_date: new Date().toLocaleDateString('en-IN'),
    },
    marks: marks.map((m) => {
      const codeRaw = (m as { marks_entry_code?: string | null }).marks_entry_code;
      const code = codeRaw ? String(codeRaw).trim().toUpperCase() : '';
      return {
        subject: m.subject || { name: 'N/A' },
        max_marks: Number(m.max_marks) || 0,
        marks_obtained: code ? null : m.marks_obtained != null ? Number(m.marks_obtained) : null,
        percentage: m.percentage != null ? Number(m.percentage) : undefined,
        grade: m.grade,
        remarks: m.remarks,
        marks_entry_code: code || null,
      };
    }),
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
      .select('school_name, school_code, school_address, school_email, school_phone, affiliation, affiliation_number, logo_url, right_logo_url, principal_name')
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

  const termIds = Array.from(new Set((exams as Array<{ term_id?: string | null }>).map((e) => e.term_id).filter(Boolean))) as string[];
  const termMetaById = new Map<string, { name: string; serial?: number }>();
  if (termIds.length > 0) {
    const { data: termRows } = await supabase
      .from('exam_terms')
      .select('id, name, serial')
      .in('id', termIds);
    (termRows || []).forEach((t: { id: string; name?: string; serial?: number }) => {
      termMetaById.set(String(t.id), { name: String(t.name || 'Term'), serial: t.serial });
    });
  }

  type ExamRecord = { id: string; academic_year?: string; exam_name?: string; name?: string; start_date?: string };
  const firstExam = exams[0] as ExamRecord;
  const examNames = exams.map((e: ExamRecord) => e.exam_name || e.name || '').filter(Boolean);
  const combinedExamName = examNames.join(' + ') || 'Combined Exam';

  // Build examsList for column headers
  const examsList = exams.map((e: ExamRecord) => ({
    id: e.id,
    name: e.exam_name || e.name || 'Exam',
    max_marks_per_subject: 100, // Default, will be overridden per subject if needed
    term_id: (e as { term_id?: string | null }).term_id || null,
    term_name: termMetaById.get(String((e as { term_id?: string | null }).term_id || ''))?.name || ((e as { term_id?: string | null }).term_id ? 'Term' : 'Unassigned'),
    term_serial: termMetaById.get(String((e as { term_id?: string | null }).term_id || ''))?.serial,
  }));

  const { data: allMarksRaw } = await supabase
    .from('student_subject_marks')
    .select(`*, subject:subjects(id, name, color)`)
    .in('exam_id', examIds)
    .eq('student_id', studentId)
    .eq('school_code', schoolCode)
    .order('exam_id', { ascending: true })
    .order('created_at', { ascending: true });

  const allMarks = allMarksRaw || [];
  await attachSubjectNamesToMarks(supabase, allMarks as Array<Record<string, unknown>>);

  const { data: gradeScalesData } = await gradeScalesQuery(
    supabase,
    schoolCode,
    firstExam.academic_year as string | undefined
  );

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
    marks_entry_code?: string | null;
    grade?: string;
    remarks?: string;
  };

  const bySubject: Record<string, {
    subject: { name: string };
    exams: Record<string, {
      exam_id: string;
      exam_name: string;
      term_id?: string | null;
      term_name?: string;
      term_serial?: number;
      marks_obtained: number | null;
      max_marks: number;
      grade?: string;
      marks_entry_code?: string | null;
    }>;
    overall_max_marks: number;
    overall_marks_obtained: number | null;
  }> = {};

  for (const m of (allMarks || []) as MarkRecord[]) {
    const subName = m.subject?.name || 'N/A';
    const subId = m.subject_id || subName;
    const max = Number(m.max_marks) || 0;
    const entryCode = String(m.marks_entry_code || '').trim().toUpperCase();
    const obtained = entryCode ? null : m.marks_obtained != null ? Number(m.marks_obtained) : null;
    const examIdRow = m.exam_id;
    const examInfo = exams.find((e: ExamRecord) => e.id === examIdRow);
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
    const pct = !entryCode && max > 0 && obtained != null ? (obtained / max) * 100 : 0;
    bySubject[subId].exams[examIdRow] = {
      exam_id: examIdRow,
      exam_name: examName,
      term_id: (examInfo as { term_id?: string | null })?.term_id || null,
      term_name: termMetaById.get(String((examInfo as { term_id?: string | null })?.term_id || ''))?.name || ((examInfo as { term_id?: string | null })?.term_id ? 'Term' : 'Unassigned'),
      term_serial: termMetaById.get(String((examInfo as { term_id?: string | null })?.term_id || ''))?.serial,
      marks_obtained: obtained,
      max_marks: max,
      grade: entryCode ? '-' : getGradeFromPct(pct),
      marks_entry_code: entryCode || null,
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
    const termTotals = new Map<string, { term_id: string; term_name: string; term_serial?: number; total_obtained: number; total_max: number }>();
    examIds.forEach((eid) => {
      const examData = m.exams[eid];
      if (!examData) return;
      const termId = String(examData.term_id || 'unassigned');
      const existing = termTotals.get(termId) || {
        term_id: termId,
        term_name: examData.term_name || (termId === 'unassigned' ? 'Unassigned' : 'Term'),
        term_serial: examData.term_serial,
        total_obtained: 0,
        total_max: 0,
      };
      existing.total_max += Number(examData.max_marks || 0);
      existing.total_obtained += Number(examData.marks_obtained || 0);
      termTotals.set(termId, existing);
    });
    const termTotalsList = Array.from(termTotals.values()).map((tt) => ({
      ...tt,
      grade: tt.total_max > 0 ? getGradeFromPct((tt.total_obtained / tt.total_max) * 100) : '-',
    }));
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
          marks_entry_code: null,
        };
      }),
      term_totals: termTotalsList,
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

  const yearForClassMulti = String(
    (student as { academic_year?: string }).academic_year || firstExam.academic_year || ''
  ).trim();
  const classRowMulti = await resolveClassRowForStudent(
    supabase,
    schoolCode,
    String(student.class || ''),
    String(student.section || ''),
    yearForClassMulti
  );
  const classDisplayMulti =
    classRowMulti != null
      ? formatReportClassLabel(
          String(classRowMulti.class ?? student.class),
          String(classRowMulti.section ?? student.section)
        )
      : formatReportClassLabel(String(student.class || ''), String(student.section || ''));

  const attendance = await fetchStudentAttendanceForReport(supabase, {
    schoolCode,
    studentId,
    classId: classRowMulti?.id ?? null,
    academicYear: yearForClassMulti || String(firstExam.academic_year || ''),
    startDate,
    endDate,
  });

  let coScholastic: Array<{ name: string; term1_grade?: string; term2_grade?: string }> | null = null;

  const cosFromMarksMulti = await fetchCoScholasticRowsForReportCard({
    schoolCode,
    studentId,
    studentClass: String(student.class || ''),
    studentSection: String(student.section || ''),
    examTermIds: termIds,
  });
  if (cosFromMarksMulti && cosFromMarksMulti.length > 0) {
    coScholastic = cosFromMarksMulti;
  } else {
    try {
      const { data: co } = await supabase
        .from('term_co_scholastic')
        .select('*')
        .eq('school_code', schoolCode)
        .eq('student_id', studentId)
        .order('added_at', { ascending: false })
        .limit(5);

      if (co?.length) {
        coScholastic = [
          {
            name: 'Work Education or Pre Vocational Education',
            term1_grade: (co[0] as { discipline_grade?: string }).discipline_grade,
            term2_grade: (co[0] as { work_habits_grade?: string }).work_habits_grade,
          },
          { name: 'Art Education', term1_grade: undefined, term2_grade: undefined },
          { name: 'Health & Physical Education', term1_grade: undefined, term2_grade: undefined },
        ];
      }
    } catch {
      coScholastic = null;
    }
  }

  return {
    school: {
      school_name: school.school_name || '',
      school_code: school.school_code || '',
      affiliation: school.affiliation,
      affiliation_number: (school as { affiliation_number?: string }).affiliation_number,
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
      class_display: classDisplayMulti,
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address || student.school_address,
      student_contact: resolveStudentContact(student as Record<string, unknown>) || undefined,
      date_of_birth: formatDobForReport(student as Record<string, unknown>) || undefined,
      roll_number: student.roll_number,
      photo_url: resolveReportCardStudentPhotoUrl(student as Record<string, unknown>, schoolCode),
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
    coScholastic,
    gradeScales,
    result: overallPct >= 33 ? 'Pass' : 'Fail',
    promoted_to: student.class ? `${student.class}-${student.section || 'A'}` : undefined,
  };
}
