import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      marks, // Array of { student_id, subjects: [{ subject_id, max_marks, marks_obtained, remarks }] }
      entered_by,
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

    // Get exam subjects to check passing marks from exam_subject_mappings
    // Note: examSubjects is fetched but not currently used - kept for future validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: examSubjects } = await supabase
      .from('exam_subject_mappings')
      .select('subject_id, max_marks, pass_marks')
      .eq('exam_id', exam_id);

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
      entered_by: string; // Required - will use principal_id for principals if needed
    }> = [];

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
        const { subject_id, max_marks, marks_obtained, remarks } = subjectMark;

        // Validation
        if (!subject_id || max_marks === undefined || marks_obtained === undefined) {
          errors.push({
            student_id,
            subject_id,
            error: 'Missing required fields',
          });
          continue;
        }

        const maxMarks = parseFloat(String(max_marks || '0')) || 0;
        const marksObtained = parseFloat(String(marks_obtained || '0')) || 0;

        if (maxMarks <= 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Max marks must be greater than 0',
          });
          continue;
        }

        if (marksObtained < 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Marks obtained cannot be negative',
          });
          continue;
        }

        if (marksObtained > maxMarks) {
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
        allMarksRecords.push({
          exam_id,
          student_id,
          subject_id,
          class_id,
          school_id: schoolData.id,
          school_code,
          max_marks: maxMarks,
          marks_obtained: marksObtained,
          // Removed: percentage - column doesn't exist in table
          // Removed: grade - column doesn't exist in table
          // Removed: passing_status - column doesn't exist in table
          remarks: remarks || null,
          entered_by: finalEnteredBy, // Use finalEnteredBy which handles principal case
          // Removed: status - column doesn't exist in table
        });
      }
    }

    if (allMarksRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid marks to save', errors },
        { status: 400 }
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

    // Bulk upsert all marks
    const { data: savedMarks, error: marksError } = await supabase
      .from('student_subject_marks')
      .upsert(allMarksRecords, {
        onConflict: 'exam_id,student_id,subject_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color
        )
      `);

    if (marksError) {
      console.error('Error saving marks:', {
        error: marksError,
        code: marksError.code,
        message: marksError.message,
        details: marksError.details,
        hint: marksError.hint,
      });
      return NextResponse.json(
        { 
          error: 'Failed to save marks', 
          details: marksError.message,
          code: marksError.code,
          hint: marksError.hint,
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
