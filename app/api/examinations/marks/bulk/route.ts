import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { logAudit } from '@/lib/audit-logger';
import { resolveStaffForAudit } from '@/lib/audit-staff';
import { normalizeMarksEntryCode } from '@/lib/marks-entry-codes';
import { assertTeacherSubjectScope, loadTeachingMap } from '@/lib/marks-teacher-validation';
import { isExamClassMarksLocked, MARKS_LOCKED_MESSAGE } from '@/lib/exam-marks-lock';

function asTimestamp(value: unknown): number | null {
  if (!value) return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Bulk save marks for multiple students
 * POST /api/examinations/marks/bulk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      class_id,
      marks, // Array of { student_id, subjects: [{ subject_id, max_marks, marks_obtained, remarks, marks_entry_code?, expected_updated_at? }] }
      entered_by,
      teacher_marks_scoped,
    } = body;

    if (!school_code || !exam_id || !class_id || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }
    
    // entered_by is optional for principals/admins, but required for staff/teachers
    // If not provided, we'll use null (principals can save marks without staff ID)

    console.log('Looking up school with code:', school_code);
    
    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id, school_code, school_name')
      .eq('school_code', school_code)
      .single();

    if (schoolError) {
      console.error('Error fetching school:', {
        code: schoolError.code,
        message: schoolError.message,
        details: schoolError.details,
        hint: schoolError.hint,
        school_code,
      });
      return NextResponse.json(
        { 
          error: 'School not found',
          details: schoolError.message,
          hint: `No school found with code: ${school_code}`,
        },
        { status: 404 }
      );
    }
    
    if (!schoolData) {
      console.error('School data is null for code:', school_code);
      return NextResponse.json(
        { 
          error: 'School not found',
          hint: `No school found with code: ${school_code}`,
        },
        { status: 404 }
      );
    }
    
    console.log('School found:', {
      id: schoolData.id,
      school_code: schoolData.school_code,
      school_name: schoolData.school_name,
    });
    
    // If entered_by is null (principal/admin), we need to find a staff member for this school
    // Try to get the first staff member from this school as a fallback
    let finalEnteredBy = entered_by;
    if (!finalEnteredBy) {
      console.log('entered_by is null, trying to find a staff member for school:', school_code);
      const { data: staffMembers } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', school_code)
        .limit(1);
      
      if (staffMembers && staffMembers.length > 0) {
        finalEnteredBy = staffMembers[0].id;
        console.log('Using first staff member as entered_by:', finalEnteredBy);
      }
    }
    
    // If still null, we cannot proceed - entered_by is required
    if (!finalEnteredBy) {
      return NextResponse.json(
        { 
          error: 'entered_by is required. Please provide a staff ID or ensure there is at least one staff member in the school.',
          hint: 'For principals, the system will use the first available staff member from the school as a fallback.'
        },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleClient();
    if (await isExamClassMarksLocked(adminSupabase, school_code, exam_id, class_id)) {
      return NextResponse.json({ error: MARKS_LOCKED_MESSAGE }, { status: 403 });
    }

    if (teacher_marks_scoped) {
      const teachingMap = await loadTeachingMap(supabase, school_code, String(finalEnteredBy));
      const allSubjectIds: string[] = [];
      for (const studentMark of marks as Array<{ subjects?: Array<{ subject_id?: string }> }>) {
        for (const sub of studentMark.subjects || []) {
          if (sub.subject_id) allSubjectIds.push(String(sub.subject_id));
        }
      }
      const gate = assertTeacherSubjectScope(teachingMap, String(class_id), [...new Set(allSubjectIds)]);
      if (!gate.ok) {
        return NextResponse.json(
          {
            error: 'You can only enter marks for subjects you teach on the timetable for this class.',
            forbidden_subjects: gate.forbidden,
          },
          { status: 403 }
        );
      }
    }

    // Get exam subjects to check passing marks from exam_subject_mappings
    // Note: examSubjects is fetched but not currently used - kept for future validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: examSubjects } = await supabase
      .from('exam_subject_mappings')
      .select('subject_id, max_marks, pass_marks')
      .eq('exam_id', exam_id);

    const maxMarksBySubjectId = new Map<string, number>(
      (examSubjects || []).map((es: { subject_id: string; max_marks: unknown }) => [
        String(es.subject_id),
        Number(es.max_marks) || 0,
      ])
    );

    // Prepare all marks records
    // Note: grade, percentage, passing_status, and status columns don't exist in the table
    // They may be calculated by database triggers or views
    const allMarksRecords: Array<{
      exam_id: string;
      student_id: string;
      subject_id: string;
      class_id: string;
      school_id: string;
      school_code: string;
      max_marks: number;
      marks_obtained: number;
      remarks: string | null;
      entered_by: string;
      marks_entry_code?: string | null;
      status?: string;
    }> = [];
    const expectedVersionByKey = new Map<string, string | null>();

    const errors: Array<{ student_id: string; subject_id?: string; error: string }> = [];

    // Process each student's marks
    for (const studentMark of marks) {
      const { student_id, subjects } = studentMark;

      if (!student_id || !subjects || !Array.isArray(subjects)) {
        errors.push({
          student_id: student_id || 'unknown',
          error: 'Missing student_id or subjects array',
        });
        continue;
      }

      // Process each subject for this student
      for (const subjectMark of subjects) {
        const { subject_id, max_marks, marks_obtained, remarks } = subjectMark as {
          subject_id?: string;
          max_marks?: unknown;
          marks_obtained?: unknown;
          remarks?: string | null;
          marks_entry_code?: unknown;
          expected_updated_at?: unknown;
        };
        const expectedUpdatedAt = subjectMark.expected_updated_at == null
          ? null
          : String(subjectMark.expected_updated_at);

        const entryCode = normalizeMarksEntryCode(subjectMark.marks_entry_code);

        // Validation
        if (!subject_id || max_marks === undefined || (marks_obtained === undefined && !entryCode)) {
          errors.push({
            student_id,
            subject_id,
            error: 'Missing required fields',
          });
          continue;
        }

        const payloadMaxMarks = parseFloat(String(max_marks || '0')) || 0;
        const resolvedMaxMarks = maxMarksBySubjectId.get(String(subject_id)) ?? payloadMaxMarks;
        const maxMarks = resolvedMaxMarks;
        const marksObtained = entryCode ? 0 : parseFloat(String(marks_obtained ?? '0')) || 0;
        const isAbsent = entryCode === 'AB';

        if (maxMarks <= 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Max marks must be greater than 0',
          });
          continue;
        }

        if (!entryCode && marksObtained < 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Marks obtained cannot be negative',
          });
          continue;
        }

        if (!isAbsent && marksObtained <= 0) {
          errors.push({
            student_id,
            subject_id,
            error: '0 marks are only allowed when student is marked absent',
          });
          continue;
        }

        if (!entryCode && marksObtained > maxMarks) {
          errors.push({
            student_id,
            subject_id,
            error: `Marks obtained (${marksObtained}) cannot exceed max marks (${maxMarks})`,
          });
          continue;
        }

        // Percentage calculation removed - not used
        // const percentage = calculatePercentage(marksObtained, maxMarks);
        
        // Passing marks calculation removed - not used
        // const examSubject = examSubjects?.find((es) => es.subject_id === subject_id);
        // const passingMarks = examSubject?.pass_marks || examSubject?.passing_marks || Math.round(maxMarks * 0.4);

        // Insert only columns that exist in the table
        // grade, percentage, and passing_status columns don't exist - may be calculated by database triggers
        const row: (typeof allMarksRecords)[0] = {
          exam_id,
          student_id,
          subject_id,
          class_id,
          school_id: schoolData.id,
          school_code,
          max_marks: maxMarks,
          marks_obtained: marksObtained,
          remarks: remarks || null,
          entered_by: finalEnteredBy,
          status: 'draft',
        };
        if (entryCode) row.marks_entry_code = entryCode;
        allMarksRecords.push(row);
        expectedVersionByKey.set(`${student_id}::${subject_id}`, expectedUpdatedAt);
      }
    }

    if (allMarksRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid marks to save', errors },
        { status: 400 }
      );
    }

    const studentIds = [...new Set(allMarksRecords.map((m) => m.student_id))];
    const subjectIds = [...new Set(allMarksRecords.map((m) => m.subject_id))];
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id, updated_at, created_at, entered_by')
      .eq('exam_id', exam_id)
      .eq('class_id', class_id)
      .in('student_id', studentIds)
      .in('subject_id', subjectIds);

    if (existingRowsError) {
      return NextResponse.json(
        { error: 'Failed to verify latest mark versions before save', details: existingRowsError.message },
        { status: 500 }
      );
    }

    const existingByKey = new Map<
      string,
      { updated_at?: string | null; created_at?: string | null; entered_by?: string | null }
    >();
    for (const row of existingRows || []) {
      existingByKey.set(`${row.student_id}::${row.subject_id}`, row);
    }

    const conflicts: Array<{
      student_id: string;
      subject_id: string;
      student_name: string;
      subject_name: string;
      updated_at: string | null;
      updated_by: string | null;
      updated_by_name: string | null;
    }> = [];

    for (const rec of allMarksRecords) {
      const key = `${rec.student_id}::${rec.subject_id}`;
      const expected = expectedVersionByKey.get(key);
      const current = existingByKey.get(key);
      if (!current) continue;
      const currentIso = current.updated_at || current.created_at || null;
      if (asTimestamp(expected) !== asTimestamp(currentIso)) {
        conflicts.push({
          student_id: rec.student_id,
          subject_id: rec.subject_id,
          student_name: '',
          subject_name: '',
          updated_at: currentIso,
          updated_by: current.entered_by || null,
          updated_by_name: null,
        });
      }
    }

    if (conflicts.length > 0) {
      const conflictStudentIds = [...new Set(conflicts.map((c) => c.student_id))];
      const conflictSubjectIds = [...new Set(conflicts.map((c) => c.subject_id))];
      const conflictUpdatedByIds = [
        ...new Set(conflicts.map((c) => c.updated_by).filter((x): x is string => Boolean(x))),
      ];

      const [{ data: studentRows }, { data: subjectRows }, { data: staffRows }] = await Promise.all([
        supabase.from('students').select('id, student_name').in('id', conflictStudentIds),
        supabase.from('subjects').select('id, name').in('id', conflictSubjectIds),
        conflictUpdatedByIds.length > 0
          ? supabase.from('staff').select('id, full_name').in('id', conflictUpdatedByIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
      ]);

      const studentNameById = new Map((studentRows || []).map((s) => [String(s.id), String(s.student_name || '')]));
      const subjectNameById = new Map((subjectRows || []).map((s) => [String(s.id), String(s.name || '')]));
      const staffNameById = new Map((staffRows || []).map((s) => [String(s.id), s.full_name || null]));

      const detailedConflicts = conflicts.map((c) => ({
        ...c,
        student_name: studentNameById.get(c.student_id) || c.student_id,
        subject_name: subjectNameById.get(c.subject_id) || c.subject_id,
        updated_by_name: c.updated_by ? (staffNameById.get(c.updated_by) || null) : null,
      }));

      return NextResponse.json(
        {
          error: 'Concurrent update conflict',
          message: 'Some records were updated by another teacher while you were editing.',
          conflicts: detailedConflicts,
        },
        { status: 409 }
      );
    }

    console.log('Attempting to save marks:', {
      totalRecords: allMarksRecords.length,
      exam_id,
      class_id,
      school_code,
      entered_by: finalEnteredBy,
      original_entered_by: entered_by,
      sampleRecord: allMarksRecords[0] ? {
        exam_id: allMarksRecords[0].exam_id,
        student_id: allMarksRecords[0].student_id,
        subject_id: allMarksRecords[0].subject_id,
        marks_obtained: allMarksRecords[0].marks_obtained,
        entered_by: allMarksRecords[0].entered_by,
      } : null,
    });

    const selectJoin = `
        *,
        subject:subjects (
          id,
          name,
          color
        )
      `;

    let savedMarks: unknown[] | null = null;
    let marksError: { message?: string; code?: string; hint?: string } | null = null;

    const { data: data1, error: err1 } = await supabase
      .from('student_subject_marks')
      .upsert(allMarksRecords, {
        onConflict: 'exam_id,student_id,subject_id',
        ignoreDuplicates: false,
      })
      .select(selectJoin);

    if (!err1) {
      savedMarks = data1;
    } else {
      const isColumnError =
        err1.code === 'PGRST204' || /column.*does not exist|Could not find the/.test(err1.message || '');
      if (isColumnError) {
        const stripped = allMarksRecords.map((r) => {
          const { status: _s, marks_entry_code: _m, ...rest } = r;
          void _s;
          void _m;
          return rest;
        });
        const { data: data2, error: err2 } = await supabase
          .from('student_subject_marks')
          .upsert(stripped, {
            onConflict: 'exam_id,student_id,subject_id',
            ignoreDuplicates: false,
          })
          .select(selectJoin);
        if (!err2) savedMarks = data2;
        else marksError = err2;
      } else {
        marksError = err1;
      }
    }

    if (marksError || savedMarks == null) {
      const err = marksError || { message: 'Upsert failed' };
      console.error('Error saving marks:', err);
      return NextResponse.json(
        {
          error: 'Failed to save marks',
          details: err.message,
          code: err.code,
          hint: err.hint,
        },
        { status: 500 }
      );
    }

    // Calculate and update exam summaries for all affected students
    const uniqueStudentIds = [...new Set(allMarksRecords.map((m) => m.student_id))];
    
    console.log('Marks saved successfully:', {
      savedCount: savedMarks?.length || 0,
      totalStudents: uniqueStudentIds.length,
    });

    const auditStaffId = entered_by || finalEnteredBy;
    const actor = await resolveStaffForAudit(supabase, school_code, auditStaffId);
    logAudit(request, {
      userId: actor.userId,
      userName: actor.userName,
      role: actor.role,
      actionType: 'MARKS_UPDATED',
      entityType: 'MARKS',
      entityId: exam_id,
      severity: 'CRITICAL',
      metadata: {
        class_id,
        student_count: uniqueStudentIds.length,
        marks_rows: savedMarks?.length ?? 0,
      },
    });
    
    // Fetch updated summaries (triggers should have calculated them)
    const { data: summaries } = await supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', exam_id)
      .in('student_id', uniqueStudentIds);

    return NextResponse.json({
      data: savedMarks,
      summaries: summaries || [],
      summary: {
        total_students: uniqueStudentIds.length,
        total_marks_saved: savedMarks?.length || 0,
        errors_count: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully saved marks for ${uniqueStudentIds.length} student(s)`,
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving bulk marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
