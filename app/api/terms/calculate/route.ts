import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGradeFromPercentage } from '@/lib/grade-calculator';

/**
 * GET /api/terms/calculate
 * Compute term-wise weighted marks from student_subject_marks.
 * Query: school_code, class_id, exam_ids (comma-separated), weightages (comma-separated, same order as exam_ids).
 * Example: ?school_code=X&class_id=Y&exam_ids=id1,id2,id3&weightages=20,20,60
 * Uses only existing student_subject_marks; no new tables required.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const examIdsStr = searchParams.get('exam_ids');
    const weightagesStr = searchParams.get('weightages');

    if (!schoolCode || !classId || !examIdsStr || !weightagesStr) {
      return NextResponse.json(
        { error: 'school_code, class_id, exam_ids, and weightages are required' },
        { status: 400 }
      );
    }

    const examIds = examIdsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const weightages = weightagesStr.split(',').map((s) => parseFloat(s.trim())).filter((n) => !Number.isNaN(n));

    if (examIds.length === 0 || weightages.length !== examIds.length) {
      return NextResponse.json(
        { error: 'exam_ids and weightages must have the same length and be non-empty' },
        { status: 400 }
      );
    }

    const totalWeight = weightages.reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Weightages must sum to 100' },
        { status: 400 }
      );
    }

    const { data: classRow } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (!classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const { data: students } = await supabase
      .from('students')
      .select('id, student_name, roll_number, admission_no')
      .eq('school_code', schoolCode)
      .eq('class', classRow.class)
      .eq('section', classRow.section ?? '')
      .eq('academic_year', classRow.academic_year)
      .eq('status', 'active')
      .order('roll_number', { ascending: true, nullsFirst: false });

    if (!students?.length) {
      return NextResponse.json({
        data: [],
        exam_ids: examIds,
        weightages,
        message: 'No students in this class',
      }, { status: 200 });
    }

    const { data: marks } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id, exam_id, marks_obtained, max_marks, percentage')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .in('exam_id', examIds)
      .in('status', ['submitted', 'approved']);

    type SubjectKey = string;
    const byStudentSubject: Record<string, Record<SubjectKey, { weightSum: number; pctSum: number }>> = {};

    for (const m of marks ?? []) {
      const sid = m.student_id;
      const subId = m.subject_id;
      const examIdx = examIds.indexOf(m.exam_id);
      if (examIdx === -1) continue;
      const w = weightages[examIdx] / 100;
      const pct = m.max_marks && m.max_marks > 0
        ? (Number(m.marks_obtained) / Number(m.max_marks)) * 100
        : (m.percentage ?? 0);

      if (!byStudentSubject[sid]) byStudentSubject[sid] = {};
      if (!byStudentSubject[sid][subId]) {
        byStudentSubject[sid][subId] = { weightSum: 0, pctSum: 0 };
      }
      byStudentSubject[sid][subId].weightSum += w;
      byStudentSubject[sid][subId].pctSum += pct * w;
    }

    const subjectIds = new Set<string>();
    Object.values(byStudentSubject).forEach((s) => Object.keys(s).forEach((id) => subjectIds.add(id)));
    const { data: subjectRows } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', Array.from(subjectIds));

    const subjectNames: Record<string, string> = {};
    subjectRows?.forEach((r) => { subjectNames[r.id] = r.name ?? ''; });

    const result = students.map((stu) => {
      const subs = byStudentSubject[stu.id] ?? {};
      const subjectBreakup: Array<{ subject_id: string; subject_name: string; weighted_pct: number; grade: string }> = [];
      let totalPct = 0;
      let count = 0;
      Object.entries(subs).forEach(([subId, v]) => {
        const weightedPct = v.weightSum > 0 ? v.pctSum / v.weightSum : 0;
        totalPct += weightedPct;
        count += 1;
        subjectBreakup.push({
          subject_id: subId,
          subject_name: subjectNames[subId] ?? subId,
          weighted_pct: Math.round(weightedPct * 100) / 100,
          grade: getGradeFromPercentage(weightedPct),
        });
      });
      const overallPct = count > 0 ? totalPct / count : 0;
      return {
        student_id: stu.id,
        student_name: stu.student_name,
        roll_number: stu.roll_number,
        admission_no: stu.admission_no,
        overall_percentage: Math.round(overallPct * 100) / 100,
        overall_grade: getGradeFromPercentage(overallPct),
        subject_breakup: subjectBreakup,
      };
    });

    const withRank = [...result].sort((a, b) => b.overall_percentage - a.overall_percentage).map((r, i) => ({
      ...r,
      rank_in_class: i + 1,
    }));

    return NextResponse.json({
      data: withRank,
      exam_ids: examIds,
      weightages,
      class_id: classId,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in term calculation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
