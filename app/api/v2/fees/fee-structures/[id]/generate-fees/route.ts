import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/v2/fees/fee-structures/[id]/generate-fees
 * Generate student fees for all applicable students
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get structure first to get school_code for permission check
    const { data: structure, error: structureError } = await supabase
      .from('fee_structures')
      .select(`
        *,
        items:fee_structure_items (*)
      `)
      .eq('id', id)
      .single();

    if (structureError || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Now check permissions
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }
    

    if (!structure.is_active) {
      return NextResponse.json(
        { error: 'Fee structure must be activated before generating fees' },
        { status: 400 }
      );
    }

    // Calculate total base amount from items
    const totalBaseAmount = structure.items?.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0) || 0;

    // Normalize values for matching
    const normalizedSchoolCode = String(structure.school_code || '').toUpperCase().trim();
    const normalizedClassName = String(structure.class_name || '').trim();
    const normalizedSection = structure.section ? String(structure.section).trim() : null;
    const normalizedAcademicYear = structure.academic_year ? String(structure.academic_year).trim() : null;
    const structureSchoolId = structure.school_id || null;

    // Debug: First, check what students exist for this school
    let debugQuery = supabase
      .from('students')
      .select('id, admission_no, student_name, class, section, academic_year, school_code')
      .limit(100);
    if (structureSchoolId) {
      debugQuery = debugQuery.eq('school_id', structureSchoolId);
    } else {
      debugQuery = debugQuery.ilike('school_code', normalizedSchoolCode);
    }
    const { data: allStudentsForSchool } = await debugQuery;

    console.log('All students for school:', {
      school_code: normalizedSchoolCode,
      school_id: structureSchoolId,
      count: allStudentsForSchool?.length || 0,
      sample_students: allStudentsForSchool?.slice(0, 5).map(s => ({
        name: s.student_name,
        class: s.class,
        section: s.section,
        academic_year: s.academic_year,
      })),
    });

    // Build student query: match by school (id or code), then class/section (case-insensitive), then academic_year if set
    let studentsQuery = supabase
      .from('students')
      .select('id, school_id, school_code, admission_no, student_name, class, section, academic_year')
      .ilike('class', normalizedClassName);

    if (structureSchoolId) {
      studentsQuery = studentsQuery.eq('school_id', structureSchoolId);
    } else {
      studentsQuery = studentsQuery.ilike('school_code', normalizedSchoolCode);
    }

    if (normalizedSection) {
      studentsQuery = studentsQuery.ilike('section', normalizedSection);
    }

    if (normalizedAcademicYear) {
      studentsQuery = studentsQuery.eq('academic_year', normalizedAcademicYear);
    }

    const { data: initialStudents, error: studentsError } = await studentsQuery;
    let students: typeof initialStudents = initialStudents;

    // If still no students and academic_year was used, retry without academic_year filter (format mismatch e.g. 2026 vs 2026-2027)
    let academicYearIgnored = false;
    if ((!students || students.length === 0) && normalizedAcademicYear) {
      console.log('No students found with academic_year filter, trying without academic_year...');
      let retryQuery = supabase
        .from('students')
        .select('id, school_id, school_code, admission_no, student_name, class, section, academic_year')
        .ilike('class', normalizedClassName);

      if (structureSchoolId) {
        retryQuery = retryQuery.eq('school_id', structureSchoolId);
      } else {
        retryQuery = retryQuery.ilike('school_code', normalizedSchoolCode);
      }
      if (normalizedSection) {
        retryQuery = retryQuery.ilike('section', normalizedSection);
      }

      const { data: retryStudents, error: retryError } = await retryQuery;

      if (!retryError && retryStudents && retryStudents.length > 0) {
        console.log(`Found ${retryStudents.length} students when ignoring academic_year filter`);
        students = retryStudents;
        academicYearIgnored = true;
        console.warn(`Academic year mismatch: Structure has "${normalizedAcademicYear}" but students have different/null values. Proceeding without academic year filter.`);
      } else {
        students = null;
      }
    }

    // If still no students and we filtered by school_id, retry with school_code (in case students have school_code but no school_id)
    if ((!students || students.length === 0) && structureSchoolId) {
      console.log('No students found with school_id, trying with school_code...');
      let fallbackQuery = supabase
        .from('students')
        .select('id, school_id, school_code, admission_no, student_name, class, section, academic_year')
        .ilike('school_code', normalizedSchoolCode)
        .ilike('class', normalizedClassName);
      if (normalizedSection) fallbackQuery = fallbackQuery.ilike('section', normalizedSection);
      if (normalizedAcademicYear) fallbackQuery = fallbackQuery.eq('academic_year', normalizedAcademicYear);
      const { data: fallbackStudents, error: fallbackError } = await fallbackQuery;
      if (!fallbackError && fallbackStudents && fallbackStudents.length > 0) {
        students = fallbackStudents;
        console.log(`Found ${fallbackStudents.length} students using school_code instead of school_id`);
      }
      if ((!students || students.length === 0) && normalizedAcademicYear) {
        fallbackQuery = supabase
          .from('students')
          .select('id, school_id, school_code, admission_no, student_name, class, section, academic_year')
          .ilike('school_code', normalizedSchoolCode)
          .ilike('class', normalizedClassName);
        if (normalizedSection) fallbackQuery = fallbackQuery.ilike('section', normalizedSection);
        const { data: fallback2 } = await fallbackQuery;
        if (fallback2 && fallback2.length > 0) {
          students = fallback2;
          academicYearIgnored = true;
        }
      }
    }

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      console.error('Structure details:', {
        school_code: structure.school_code,
        class_name: structure.class_name,
        section: structure.section,
        academic_year: structure.academic_year,
      });
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Debug logging
    console.log('Fee generation query:', {
      school_code: normalizedSchoolCode,
      class_name: normalizedClassName,
      section: normalizedSection || 'all sections',
      academic_year: normalizedAcademicYear || 'all years',
      students_found: students?.length || 0,
      matching_students: students?.map(s => ({
        name: s.student_name,
        class: s.class,
        section: s.section,
        admission_no: s.admission_no,
      })),
    });

    if (!students || students.length === 0) {
      // Provide helpful debugging information
      return NextResponse.json({
        message: 'No students found matching the criteria',
        details: {
          school_code: normalizedSchoolCode,
          class_name: normalizedClassName,
          section: normalizedSection || 'all sections',
          academic_year: normalizedAcademicYear || 'all years',
          structure_id: id,
        },
        debug: {
          total_students_in_school: allStudentsForSchool?.length || 0,
          sample_classes_found: Array.from(new Set(allStudentsForSchool?.map(s => s.class) || [])).slice(0, 10),
          sample_sections_found: Array.from(new Set(allStudentsForSchool?.map(s => s.section) || [])).slice(0, 10),
        },
        data: {
          structure_id: id,
          students_processed: 0,
          fees_generated: 0,
        },
      }, { status: 200 });
    }

    // Generate months based on frequency
    const months: Date[] = [];
    const currentYear = new Date().getFullYear();
    
    // Handle academic years that span calendar years (e.g., April-March)
    let startDate: Date;
    let endDate: Date;
    
    if (structure.end_month < structure.start_month) {
      // Academic year spans calendar years (e.g., April 2025 - March 2026)
      startDate = new Date(currentYear, structure.start_month - 1, 1);
      endDate = new Date(currentYear + 1, structure.end_month, 0); // Last day of end_month in next year
    } else {
      // Academic year within same calendar year (e.g., January-December)
      startDate = new Date(currentYear, structure.start_month - 1, 1);
      endDate = new Date(currentYear, structure.end_month, 0); // Last day of end_month
    }

    console.log('Month generation:', {
      start_month: structure.start_month,
      end_month: structure.end_month,
      frequency: structure.frequency,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    if (structure.frequency === 'monthly') {
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        months.push(new Date(d));
      }
    } else if (structure.frequency === 'quarterly') {
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 3)) {
        months.push(new Date(d));
      }
    } else if (structure.frequency === 'yearly') {
      months.push(new Date(startDate));
    }

    console.log(`Generated ${months.length} months for ${structure.frequency} frequency:`, 
      months.map(m => m.toISOString().split('T')[0]));

    // Generate fee records for each student and month
    const feeRecords: Array<{
      school_id: string;
      school_code: string;
      student_id: string;
      fee_structure_id: string;
      due_month: string;
      due_date: string;
      base_amount: number;
    }> = [];

    for (const student of students) {
      for (const month of months) {
        const dueDay = Math.min(
          structure.payment_due_day ? Math.max(1, Math.min(31, structure.payment_due_day)) : 15,
          new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        );
        const dueDate = new Date(month.getFullYear(), month.getMonth(), dueDay);

        feeRecords.push({
          school_id: student.school_id || structure.school_id,
          school_code: student.school_code || normalizedSchoolCode,
          student_id: student.id,
          fee_structure_id: id,
          due_month: new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          base_amount: totalBaseAmount,
        });
      }
    }

    // Insert fee records in batches
    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;

    console.log(`Inserting ${feeRecords.length} fee records in batches of ${BATCH_SIZE}...`);
    console.log('Sample fee record:', feeRecords[0] || 'No records to insert');

    for (let i = 0; i < feeRecords.length; i += BATCH_SIZE) {
      const batch = feeRecords.slice(i, i + BATCH_SIZE);
      const { data: insertedData, error: insertError } = await supabase
        .from('student_fees')
        .insert(batch)
        .select('id, student_id, fee_structure_id, due_month');

      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        console.error('Batch data:', batch.slice(0, 2)); // Log first 2 records of failed batch
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1}: ${batch.length} records`);
        if (insertedData && insertedData.length > 0) {
          console.log('Sample inserted record:', insertedData[0]);
        }
      }
    }

    console.log(`Fee insertion complete: ${inserted} inserted, ${errors} errors`);

    return NextResponse.json({
      message: 'Student fees generated successfully',
      ...(academicYearIgnored && {
        warning: `Academic year filter was ignored (structure: "${normalizedAcademicYear}" vs student values). Fees generated for all matching students.`,
      }),
      data: {
        structure_id: id,
        students_processed: students.length,
        fees_generated: inserted,
        errors: errors,
        months_generated: months.length,
        academic_year_ignored: academicYearIgnored,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/fee-structures/[id]/generate-fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
