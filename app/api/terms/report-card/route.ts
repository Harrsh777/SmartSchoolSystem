import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGradeFromPercentage } from '@/lib/grade-calculator';

/**
 * GET /api/terms/report-card
 * Query: school_code, student_id, and EITHER (term_id) OR (class_id + exam_ids + weightages).
 * Returns term report card data: exam-wise breakup, weighted subject totals, overall %, grade, rank.
 * Uses only student_subject_marks when exam_ids+weightages are provided; uses exam_term_mappings when term_id is provided.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const termId = searchParams.get('term_id');
    const classId = searchParams.get('class_id');
    const examIdsStr = searchParams.get('exam_ids');
    const weightagesStr = searchParams.get('weightages');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    let examIds: string[];
    let weightages: number[];

    if (termId) {
      const { data: mappings, error: mapErr } = await supabase
        .from('exam_term_mappings')
        .select('exam_id, weightage')
        .eq('term_id', termId)
        .eq('is_active', true);

      if (mapErr || !mappings?.length) {
        return NextResponse.json(
          { error: 'Term not found or has no exams. Provide exam_ids and weightages, or run schema and add term exams.' },
          { status: 400 }
        );
      }
      examIds = mappings.map((m) => m.exam_id);
      weightages = mappings.map((m) => Number(m.weightage));
    } else if (classId && examIdsStr && weightagesStr) {
      examIds = examIdsStr.split(',').map((s) => s.trim()).filter(Boolean);
      weightages = weightagesStr.split(',').map((s) => parseFloat(s.trim())).filter((n) => !Number.isNaN(n));
      if (examIds.length === 0 || weightages.length !== examIds.length) {
        return NextResponse.json(
          { error: 'exam_ids and weightages (comma-separated, same length) are required when term_id is not provided' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Provide either term_id, or class_id + exam_ids + weightages' },
        { status: 400 }
      );
    }

    const { data: marks } = await supabase
      .from('student_subject_marks')
      .select('subject_id, exam_id, marks_obtained, max_marks, percentage')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .in('exam_id', examIds)
      .in('status', ['submitted', 'approved']);

    const bySubject: Record<string, { weightSum: number; pctSum: number }> = {};
    for (const m of marks ?? []) {
      const subId = m.subject_id;
      const examIdx = examIds.indexOf(m.exam_id);
      if (examIdx === -1) continue;
      const w = weightages[examIdx] / 100;
      const pct = m.max_marks && m.max_marks > 0
        ? (Number(m.marks_obtained) / Number(m.max_marks)) * 100
        : (m.percentage ?? 0);
      if (!bySubject[subId]) bySubject[subId] = { weightSum: 0, pctSum: 0 };
      bySubject[subId].weightSum += w;
      bySubject[subId].pctSum += pct * w;
    }

    const subjectIds = Object.keys(bySubject);
    const { data: subjectRows } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);
    const subjectNames: Record<string, string> = {};
    subjectRows?.forEach((r) => { subjectNames[r.id] = r.name ?? ''; });

    const subjectBreakup = Object.entries(bySubject).map(([subId, v]) => {
      const weightedPct = v.weightSum > 0 ? v.pctSum / v.weightSum : 0;
      return {
        subject_id: subId,
        subject_name: subjectNames[subId] ?? subId,
        weighted_percentage: Math.round(weightedPct * 100) / 100,
        grade: getGradeFromPercentage(weightedPct),
      };
    });

    const n = subjectBreakup.length;
    const overallPct = n > 0
      ? subjectBreakup.reduce((s, b) => s + b.weighted_percentage, 0) / n
      : 0;

    let coScholastic: Record<string, unknown> | null = null;
    if (termId) {
      try {
        const { data: co } = await supabase
          .from('term_co_scholastic')
          .select('attendance_percentage, discipline_grade, work_habits_grade, teacher_remarks')
          .eq('term_id', termId)
          .eq('student_id', studentId)
          .maybeSingle();
        coScholastic = co ?? null;
      } catch {
        coScholastic = null;
      }
    }

    return NextResponse.json({
      student_id: studentId,
      term_id: termId ?? null,
      exam_ids: examIds,
      weightages,
      subject_breakup: subjectBreakup,
      overall_percentage: Math.round(overallPct * 100) / 100,
      overall_grade: getGradeFromPercentage(overallPct),
      co_scholastic: coScholastic,
    }, { status: 200 });
  } catch (e) {
    console.error('Term report-card GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
