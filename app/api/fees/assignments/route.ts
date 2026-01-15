import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get fee assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('fee_assignments')
      .select(`
        *,
        fee_component:fee_component_id (
          id,
          component_name,
          default_amount,
          fee_type
        ),
        fee_schedule:fee_schedule_id (
          id,
          schedule_name,
          number_of_installments,
          installments
        )
      `)
      .eq('school_code', schoolCode);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: assignments, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fee assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee assignments', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: assignments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Create or update fee assignments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      academic_year,
      assignments, // Array of assignments
      generate_installments = false,
    } = body;

    if (!school_code || !academic_year || !assignments || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: 'School code, academic year, and assignments array are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const results = {
      assignments_created: 0,
      assignments_updated: 0,
      installments_generated: 0,
      students_affected: 0,
      errors: [] as string[],
    };

    // Process each assignment
    for (const assignment of assignments) {
      const {
        assignment_type,
        class_id,
        student_id,
        fee_component_id,
        amount,
        fee_schedule_id,
        discount_id,
        discount_amount,
        is_active = true,
      } = assignment;

      if (!fee_component_id || !amount || !fee_schedule_id) {
        results.errors.push(`Missing required fields for assignment`);
        continue;
      }

      if (assignment_type === 'class' && !class_id) {
        results.errors.push(`Class ID required for class assignment`);
        continue;
      }

      if (assignment_type === 'student' && !student_id) {
        results.errors.push(`Student ID required for student assignment`);
        continue;
      }

      // Check if assignment already exists
      let existingQuery = supabase
        .from('fee_assignments')
        .select('id')
        .eq('school_code', school_code)
        .eq('academic_year', academic_year)
        .eq('fee_component_id', fee_component_id);

      if (assignment_type === 'class') {
        existingQuery = existingQuery.eq('class_id', class_id).is('student_id', null);
      } else {
        existingQuery = existingQuery.eq('student_id', student_id).is('class_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('fee_assignments')
          .update({
            amount: parseFloat(amount),
            fee_schedule_id,
            discount_id: discount_id || null,
            discount_amount: discount_amount ? parseFloat(discount_amount) : null,
            is_active: Boolean(is_active),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          results.errors.push(`Failed to update assignment: ${updateError.message}`);
        } else {
          results.assignments_updated++;
        }
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('fee_assignments')
          .insert([{
            school_id: schoolData.id,
            school_code: school_code,
            academic_year: academic_year,
            assignment_type: assignment_type,
            class_id: assignment_type === 'class' ? class_id : null,
            student_id: assignment_type === 'student' ? student_id : null,
            fee_component_id: fee_component_id,
            amount: parseFloat(amount),
            fee_schedule_id: fee_schedule_id,
            discount_id: discount_id || null,
            discount_amount: discount_amount ? parseFloat(discount_amount) : null,
            is_active: Boolean(is_active),
          }]);

        if (insertError) {
          results.errors.push(`Failed to create assignment: ${insertError.message}`);
        } else {
          results.assignments_created++;
        }
      }

      // Generate installments if requested and assignment is for a class
      if (generate_installments && assignment_type === 'class' && class_id) {
        // The trigger should automatically generate installments, but we can manually trigger if needed
        // For now, we'll let the database trigger handle it
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', class_id)
          .eq('school_code', school_code);

        if (students) {
          results.students_affected += students.length;
          // Installments will be generated by the trigger
        }
      }
    }

    return NextResponse.json({
      data: results,
      message: `Processed ${results.assignments_created + results.assignments_updated} assignments${generate_installments ? `. Installments will be generated automatically.` : ''}`,
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving fee assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
