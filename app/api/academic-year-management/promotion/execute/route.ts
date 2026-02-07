import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/academic-year-management/promotion/execute
 * Body: { school_code, from_year, actions: [{ student_id, action: 'promote'|'repeat'|'left_school', to_year?, target_class?, target_section?, current_class, current_section }], performed_by? }
 * - promote: target_class, target_section, to_year (per row or from first) → enrollment + update students
 * - repeat: same class/section, to_year → enrollment + update students
 * - left_school: enrollment with status transferred, update student status to transferred (no new class)
 * Creates new rows in student_enrollments; updates students for promote/repeat. Logs audit.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, from_year, to_year: bodyToYear, actions, performed_by } = body;

    if (!school_code || !from_year || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'school_code, from_year, and non-empty actions array are required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const enrollmentsToInsert: Array<{
      school_code: string;
      student_id: string;
      academic_year: string;
      class: string;
      section: string;
      roll_no: string | null;
      status: string;
      created_by: string | null;
    }> = [];

    const studentUpdates: Array<{ id: string; class: string; section: string; academic_year: string; status?: string }> = [];

    for (const a of actions) {
      const action = (a.action || 'promote').toLowerCase();
      const studentId = a.student_id;
      if (!studentId) continue;

      const toYear = (a.to_year || bodyToYear || from_year).toString().trim();
      if (!toYear) continue;

      const currentClass = (a.current_class ?? '').toString().trim();
      const currentSection = (a.current_section ?? '').toString().trim();
      const targetClass = (a.target_class ?? '').toString().trim();
      const targetSection = (a.target_section ?? '').toString().trim();

      if (action === 'left_school') {
        enrollmentsToInsert.push({
          school_code,
          student_id: studentId,
          academic_year: toYear,
          class: currentClass,
          section: currentSection,
          roll_no: null,
          status: 'transferred',
          created_by: performed_by || null,
        });
        studentUpdates.push({
          id: studentId,
          class: currentClass,
          section: currentSection,
          academic_year: from_year,
          status: 'transferred',
        });
        continue;
      }

      if (action === 'repeat' || (action === 'promote' && !targetClass)) {
        enrollmentsToInsert.push({
          school_code,
          student_id: studentId,
          academic_year: toYear,
          class: currentClass,
          section: currentSection,
          roll_no: a.roll_no ?? null,
          status: 'active',
          created_by: performed_by || null,
        });
        studentUpdates.push({
          id: studentId,
          class: currentClass,
          section: currentSection,
          academic_year: toYear,
        });
        continue;
      }

      if (action === 'promote' && targetClass) {
        enrollmentsToInsert.push({
          school_code,
          student_id: studentId,
          academic_year: toYear,
          class: targetClass,
          section: targetSection,
          roll_no: a.roll_no ?? null,
          status: 'active',
          created_by: performed_by || null,
        });
        studentUpdates.push({
          id: studentId,
          class: targetClass,
          section: targetSection,
          academic_year: toYear,
        });
      }
    }

    if (enrollmentsToInsert.length === 0) {
      return NextResponse.json({ error: 'No valid enrollment rows to create' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('student_enrollments')
      .insert(enrollmentsToInsert);

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'One or more enrollments already exist for this year. No rows overwritten.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create enrollments', details: insertError.message },
        { status: 500 }
      );
    }

    for (const u of studentUpdates) {
      const updatePayload: { class: string; section: string; academic_year: string; status?: string } = {
        class: u.class,
        section: u.section,
        academic_year: u.academic_year,
      };
      if (u.status) updatePayload.status = u.status;
      await supabase.from('students').update(updatePayload).eq('id', u.id);
    }

    const firstToYear = enrollmentsToInsert[0]?.academic_year || bodyToYear || from_year;
    try {
      await supabase.from('academic_year_audit_log').insert([
        {
          school_code,
          action: 'promotion_execute',
          academic_year_from: from_year,
          academic_year_to: firstToYear,
          performed_by: performed_by || null,
          details: { count: enrollmentsToInsert.length, student_updates: studentUpdates.length },
        },
      ]);
    } catch {
      // best-effort audit
    }

    return NextResponse.json({
      data: {
        from_year,
        to_year: firstToYear,
        enrollments_created: enrollmentsToInsert.length,
        students_updated: studentUpdates.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Promotion execute error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
