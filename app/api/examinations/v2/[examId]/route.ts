import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit-logger';
import { resolveStaffForAudit } from '@/lib/audit-staff';
import { resolveAcademicYear } from '@/lib/academic-year-id';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';
import { getRequiredCurrentAcademicYear } from '@/lib/current-academic-year';

/**
 * Full update for v2 examinations: replaces class mappings, subject mappings, and schedules
 * (same shape as POST /api/examinations/v2/create). Clears dependent rows first, including marks.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const {
      school_code,
      exam_name,
      start_date,
      end_date,
      description,
      term_id,
      exam_term_exam_id,
      class_mappings,
      class_subjects,
      schedules,
      created_by,
    } = body;

    if (!school_code || !exam_name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existingRow, error: existingErr } = await supabase
      .from('examinations')
      .select('id, school_code, status, is_published, created_by')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (existingErr || !existingRow) {
      return NextResponse.json(
        { error: 'Examination not found or access denied' },
        { status: 404 }
      );
    }

    const currentYear = await getRequiredCurrentAcademicYear(String(school_code));
    const { yearId, yearName } = await resolveAcademicYear({
      schoolCode: school_code,
      academic_year_id: currentYear.id,
      academic_year: currentYear.year_name,
    });
    const resolvedAcademicYearId = yearId;
    const resolvedAcademicYearName = yearName;

    if (
      !resolvedAcademicYearId ||
      !String(resolvedAcademicYearId).trim() ||
      !resolvedAcademicYearName ||
      !String(resolvedAcademicYearName).trim()
    ) {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    const lockCheck = await assertAcademicYearNotLocked({
      schoolCode: school_code,
      academic_year_id: resolvedAcademicYearId,
      adminOverride,
    });
    if (lockCheck) return lockCheck;

    if (!class_mappings || !Array.isArray(class_mappings) || class_mappings.length === 0) {
      return NextResponse.json({ error: 'At least one class must be selected' }, { status: 400 });
    }

    const termIdStr = term_id ? String(term_id).trim() : '';
    const templateIdStr = exam_term_exam_id ? String(exam_term_exam_id).trim() : '';

    if (!termIdStr) {
      return NextResponse.json(
        { error: 'term_id is required for this examination flow' },
        { status: 400 }
      );
    }

    if (!templateIdStr) {
      return NextResponse.json(
        {
          error: 'exam_term_exam_id is required (select the examination template from the term)',
        },
        { status: 400 }
      );
    }

    const allSectionIds: string[] = [];
    for (const classMapping of class_mappings) {
      const sections = classMapping.sections;
      if (!Array.isArray(sections)) continue;
      for (const sectionId of sections) {
        if (sectionId) allSectionIds.push(String(sectionId));
      }
    }
    if (allSectionIds.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one class-section to include in this examination' },
        { status: 400 }
      );
    }

    const { data: conflictRows, error: conflictErr } = await supabase
      .from('exam_class_mappings')
      .select('class_id, exam_id')
      .eq('school_code', school_code)
      .eq('term_id', termIdStr)
      .eq('exam_term_exam_id', templateIdStr)
      .in('class_id', allSectionIds);

    if (conflictErr) {
      console.error('Duplicate exam check failed:', conflictErr);
      return NextResponse.json(
        { error: 'Could not verify existing examinations', details: conflictErr.message },
        { status: 500 }
      );
    }

    const conflictingIds = new Set<string>();
    for (const r of conflictRows || []) {
      const row = r as { class_id: string; exam_id: string };
      if (String(row.exam_id) === String(examId)) continue;
      conflictingIds.add(String(row.class_id));
    }
    if (conflictingIds.size > 0) {
      return NextResponse.json(
        {
          error:
            'Exam already exists for one or more selected class-sections for this term and examination type',
          conflicting_class_ids: Array.from(conflictingIds),
        },
        { status: 409 }
      );
    }

    if (!class_subjects || !Array.isArray(class_subjects) || class_subjects.length === 0) {
      return NextResponse.json({ error: 'At least one subject must be mapped' }, { status: 400 });
    }

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ error: 'At least one schedule must be provided' }, { status: 400 });
    }

    const windowStart = String(start_date).slice(0, 10);
    const windowEnd = String(end_date).slice(0, 10);
    for (let i = 0; i < schedules.length; i++) {
      const row = schedules[i] as { exam_date?: string };
      const d = row.exam_date ? String(row.exam_date).slice(0, 10) : '';
      if (!d || d < windowStart || d > windowEnd) {
        return NextResponse.json(
          {
            error: 'Each exam date must fall within the examination start and end dates',
            details: `Row ${i + 1}: date ${d || '(missing)'} is outside ${windowStart} – ${windowEnd}`,
          },
          { status: 400 }
        );
      }
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    await supabase.from('report_cards').delete().eq('exam_id', examId);
    await supabase.from('exam_schedules').delete().eq('exam_id', examId);
    await supabase.from('exam_subject_mappings').delete().eq('exam_id', examId);
    await supabase.from('exam_class_mappings').delete().eq('exam_id', examId);
    await supabase.from('exam_subjects').delete().eq('exam_id', examId);
    await supabase.from('student_subject_marks').delete().eq('exam_id', examId);
    await supabase.from('student_exam_summary').delete().eq('exam_id', examId);

    const existing = existingRow as {
      status?: string;
      is_published?: boolean;
      created_by?: string | null;
    };

    const { error: updateExamError } = await supabase
      .from('examinations')
      .update({
        exam_name: exam_name.trim(),
        academic_year: String(resolvedAcademicYearName).trim(),
        academic_year_id: resolvedAcademicYearId,
        start_date,
        end_date,
        description: description || null,
        term_id: termIdStr,
        exam_term_exam_id: templateIdStr,
        status: typeof existing.status === 'string' && existing.status ? existing.status : 'upcoming',
        is_published: Boolean(existing.is_published),
        created_by: existing.created_by ?? created_by ?? null,
      })
      .eq('id', examId)
      .eq('school_code', school_code);

    if (updateExamError) {
      return NextResponse.json(
        {
          error: 'Failed to update examination',
          details: updateExamError.message,
          code: updateExamError.code,
          hint: updateExamError.hint,
        },
        { status: 500 }
      );
    }

    const classMappingInserts: Array<Record<string, unknown>> = [];
    for (const classMapping of class_mappings) {
      for (const sectionId of classMapping.sections || []) {
        if (!sectionId) continue;
        classMappingInserts.push({
          exam_id: examId,
          class_id: sectionId,
          school_code: school_code,
          term_id: termIdStr,
          exam_term_exam_id: templateIdStr,
        });
      }
    }

    if (classMappingInserts.length > 0) {
      const { error: mappingError } = await supabase.from('exam_class_mappings').insert(classMappingInserts);
      if (mappingError) {
        return NextResponse.json(
          {
            error:
              mappingError.code === '23505'
                ? 'Exam already exists for this class-section (duplicate term + examination type)'
                : 'Failed to create class mappings',
            details: mappingError.message,
            code: mappingError.code,
            hint: mappingError.hint,
          },
          { status: mappingError.code === '23505' ? 409 : 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'No class mappings to insert' }, { status: 400 });
    }

    const subjectMappingInserts: Array<Record<string, unknown>> = [];
    for (const classSubject of class_subjects) {
      for (const subject of classSubject.subjects || []) {
        subjectMappingInserts.push({
          exam_id: examId,
          class_id: classSubject.sectionId,
          subject_id: subject.subject_id,
          max_marks: subject.max_marks,
          pass_marks: subject.pass_marks,
          weightage: subject.weightage || 0,
          school_code: school_code,
        });
      }
    }

    if (subjectMappingInserts.length > 0) {
      const { error: subjectError } = await supabase.from('exam_subject_mappings').insert(subjectMappingInserts);
      if (subjectError) {
        return NextResponse.json(
          {
            error: 'Failed to create subject mappings',
            details: subjectError.message,
            code: subjectError.code,
            hint: subjectError.hint,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'No subject mappings to insert' }, { status: 400 });
    }

    const scheduleInserts: Array<Record<string, unknown>> = [];
    const scheduleByDate = new Map<
      string,
      Array<{
        schedule: (typeof schedules)[0];
        subject: { subject_id: string; max_marks: number } | undefined;
      }>
    >();

    for (const schedule of schedules) {
      const classSubject = class_subjects.find((cs: { sectionId: string }) => cs.sectionId === schedule.sectionId);
      const subject = classSubject?.subjects.find(
        (s: { subject_id: string }) => s.subject_id === schedule.subjectId
      );
      const dateKey = schedule.exam_date;
      if (!scheduleByDate.has(dateKey)) {
        scheduleByDate.set(dateKey, []);
      }
      scheduleByDate.get(dateKey)!.push({ schedule, subject });
    }

    for (const [date, items] of scheduleByDate.entries()) {
      const firstItem = items[0];
      scheduleInserts.push({
        exam_id: examId,
        school_id: schoolData.id,
        school_code: school_code,
        exam_date: date,
        start_time: firstItem.schedule.start_time,
        end_time: firstItem.schedule.end_time,
        exam_name: exam_name.trim(),
        max_marks: firstItem.subject?.max_marks || null,
      });
    }

    if (scheduleInserts.length > 0) {
      const { error: scheduleError } = await supabase
        .from('exam_schedules')
        .upsert(scheduleInserts, { onConflict: 'exam_id,exam_date' })
        .select();

      if (scheduleError) {
        return NextResponse.json(
          {
            error: 'Failed to create schedules',
            details: scheduleError.message,
            code: scheduleError.code,
            hint: scheduleError.hint,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'No schedules to insert' }, { status: 400 });
    }

    const actor = await resolveStaffForAudit(supabase, school_code, created_by);
    logAudit(request, {
      userId: actor.userId,
      userName: actor.userName,
      role: actor.role,
      actionType: 'EXAM_UPDATED',
      entityType: 'EXAM',
      entityId: examId,
      severity: 'CRITICAL',
      metadata: { target: exam_name.trim(), term_id: termIdStr, v2_full_replace: true },
    });

    return NextResponse.json({
      data: {
        id: examId,
        exam_name: exam_name.trim(),
        message: 'Examination updated successfully.',
        class_mappings_count: classMappingInserts.length,
        subject_mappings_count: subjectMappingInserts.length,
        schedules_count: scheduleInserts.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ACADEMIC_YEAR_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }
    console.error('Error updating examination (v2):', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
