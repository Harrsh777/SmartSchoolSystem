import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Get timetable slots
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const teacherId = searchParams.get('teacher_id');

    let query = supabase
      .from('timetable_slots')
      .select(`
        *,
        subject:subject_id (
          id,
          name,
          color
        ),
        teacher:teacher_id (
          id,
          full_name,
          staff_id
        ),
        class:class_id (
          id,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode);

    if (classId) {
      query = query.eq('class_id', classId);
    } else if (teacherId) {
      // For teacher timetable, get slots where teacher_id matches and class_id is null
      query = query.eq('teacher_id', teacherId).is('class_id', null);
    } else {
      query = query.is('class_id', null);
    }

    // Order by period_order if available, otherwise by period
    const { data: slots, error } = await query
      .order('day', { ascending: true })
      .order('period_order', { ascending: true, nullsFirst: false })
      .order('period', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching timetable slots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch timetable slots', details: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      );
    }

    // Fetch teachers for slots with teacher_ids arrays
    // Also fetch class info for teacher timetables from class_reference
    interface SlotWithTeachers {
      teacher_ids?: string[];
      teachers?: Array<{ id: string; full_name: string; staff_id: string }>;
      class_reference?: { class_id: string; class: string; section: string; academic_year?: string } | null;
      class?: { id: string; class: string; section: string; academic_year?: string } | null;
      [key: string]: unknown;
    }
    const slotsWithTeachers = await Promise.all(
      (slots || []).map(async (slot: SlotWithTeachers) => {
        // Fetch teachers if teacher_ids exist
        if (slot.teacher_ids && Array.isArray(slot.teacher_ids) && slot.teacher_ids.length > 0) {
          const { data: teachers } = await supabase
            .from('staff')
            .select('id, full_name, staff_id')
            .in('id', slot.teacher_ids)
            .eq('school_code', schoolCode);
          
          slot.teachers = teachers || [];
        }
        
        // For teacher timetables, use class_reference if available, otherwise fetch from class_id
        if (!slot.class && slot.class_reference) {
          slot.class = {
            id: slot.class_reference.class_id,
            class: slot.class_reference.class,
            section: slot.class_reference.section,
            academic_year: slot.class_reference.academic_year,
          };
        }
        
        return slot;
      })
    );

    return NextResponse.json({ data: slotsWithTeachers || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching timetable slots:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

// Upsert timetable slot (auto-save on drop)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, day, period, period_order, subject_id, class_id, teacher_id, teacher_ids, class_teacher_id, period_group_id } = body;

    if (!school_code || !day || (!period && !period_order)) {
      return NextResponse.json(
        { error: 'School code, day, and period (or period_order) are required' },
        { status: 400 }
      );
    }

    // Use period_order if provided, otherwise use period (periodValue kept for potential future use)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const periodValue = period_order || period;

    // Validate day
    if (!DAYS.includes(day)) {
      return NextResponse.json(
        { error: `Day must be one of: ${DAYS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate period (only if using old period system)
    if (!period_order && !PERIODS.includes(period)) {
      return NextResponse.json(
        { error: `Period must be between 1 and 8` },
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

    // Validate period_group_id if provided (foreign key constraint)
    if (period_group_id) {
      const { data: periodGroupData, error: periodGroupError } = await supabase
        .from('timetable_period_groups')
        .select('id')
        .eq('id', period_group_id)
        .eq('school_code', school_code)
        .single();

      if (periodGroupError || !periodGroupData) {
        return NextResponse.json(
          { error: 'Period group not found or does not belong to this school' },
          { status: 400 }
        );
      }
    }

    // Validate subject_id if provided (foreign key constraint)
    if (subject_id) {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subject_id)
        .eq('school_code', school_code)
        .single();

      if (subjectError || !subjectData) {
        return NextResponse.json(
          { error: 'Subject not found or does not belong to this school' },
          { status: 400 }
        );
      }
    }

    // Validate class_id if provided (foreign key constraint)
    if (class_id) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('id', class_id)
        .eq('school_code', school_code)
        .single();

      if (classError || !classData) {
        return NextResponse.json(
          { error: 'Class not found or does not belong to this school' },
          { status: 400 }
        );
      }
    }

    // Build upsert data
    interface UpsertSlotData {
      school_id: string;
      school_code: string;
      day: string;
      subject_id: string | null;
      period_order?: number;
      period?: string;
      class_id?: string | null;
      teacher_id?: string | null;
      teacher_ids?: string[];
      period_group_id?: string | null;
      [key: string]: unknown; // Allow additional fields
    }
    const upsertData: UpsertSlotData = {
      school_id: schoolData.id,
      school_code: school_code,
      day: day,
      subject_id: subject_id || null,
    };
    
    // Add period_group_id if provided (optional)
    if (period_group_id !== undefined) {
      upsertData.period_group_id = period_group_id || null;
    }

    // Use period_order if provided, otherwise use period
    // Always set both for compatibility (period as string representation of period_order)
    // CRITICAL: The valid_period constraint requires at least one to be NOT NULL
    if (period_order !== undefined && period_order !== null) {
      upsertData.period_order = Number(period_order);
      upsertData.period = String(period_order); // Set period as string for backward compatibility
    } else if (period !== undefined && period !== null) {
      upsertData.period = String(period);
      // Try to parse period as number for period_order if it's numeric
      const periodNum = parseInt(String(period), 10);
      if (!isNaN(periodNum)) {
        upsertData.period_order = periodNum;
      }
    } else {
      // If neither is provided, return error (this should have been caught earlier, but just in case)
      return NextResponse.json(
        { error: 'Either period_order or period must be provided' },
        { status: 400 }
      );
    }

    if (class_id) {
      upsertData.class_id = class_id;
      // For class timetables, ensure teacher_id is undefined if not provided
      // This satisfies the constraint: (class_id IS NOT NULL) OR (teacher_id IS NOT NULL)
      upsertData.teacher_id = undefined;
      upsertData.teacher_ids = [];
    } else if (class_teacher_id) {
      // For class teacher timetable, store the class_teacher_id in a special way
      // We'll use class_id as null and store teacher_id
      upsertData.class_id = null;
      upsertData.teacher_id = class_teacher_id;
      upsertData.teacher_ids = [class_teacher_id];
    }

    // Handle teacher assignments (override defaults if teachers are provided)
    if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
      upsertData.teacher_ids = teacher_ids;
      // Also set teacher_id to first teacher for backward compatibility
      upsertData.teacher_id = teacher_ids[0];
    } else if (teacher_id) {
      upsertData.teacher_id = teacher_id;
      upsertData.teacher_ids = [teacher_id];
    }

    // First, try to find existing slot
    // For class timetables, we need to match: class_id, day, period_order/period
    // The unique constraint is on: (class_id, day, COALESCE(period_order, 0), COALESCE(period, ''))
    let query = supabase
      .from('timetable_slots')
      .select('id, teacher_ids')
      .eq('school_code', school_code)
      .eq('day', day);
    
    // Use period_order if provided, otherwise use period
    // Must match exactly what will be used in the unique constraint
    if (period_order !== undefined && period_order !== null) {
      query = query.eq('period_order', period_order);
    } else if (period !== undefined && period !== null) {
      query = query.eq('period', period);
    }

    // For class timetables, match by class_id (critical for unique constraint)
    if (class_id) {
      query = query.eq('class_id', class_id);
    } else if (class_teacher_id) {
      // For class teacher timetable, find by teacher_id and null class_id
      query = query.is('class_id', null).eq('teacher_id', class_teacher_id);
    } else {
      query = query.is('class_id', null);
    }

    // Note: We don't filter by period_group_id when checking for existing slots
    // because the unique constraint doesn't include it, so a slot can exist
    // with the same class_id/day/period but different period_group_id
    // However, in practice, each class should only have one period group at a time

    const { data: existing, error: existingError } = await query.maybeSingle();

    let slot;
    // existingError with code 'PGRST116' means no rows found, which is fine
    // Any other error means there was a problem, so we should return it
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking for existing slot:', existingError);
      return NextResponse.json(
        { error: 'Failed to check for existing timetable slot', details: existingError.message, code: existingError.code, hint: existingError.hint },
        { status: 500 }
      );
    }
    const existingSlot = existing || null;
    
    if (existingSlot) {
      // Update existing slot
      const { data: updated, error: updateError } = await supabase
        .from('timetable_slots')
        .update(upsertData)
        .eq('id', existingSlot.id)
        .select(`
          *,
          subject:subject_id (
            id,
            name,
            color
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating timetable slot:', updateError);
        return NextResponse.json(
          { error: 'Failed to update timetable slot', details: updateError.message, code: updateError.code, hint: updateError.hint },
          { status: 500 }
        );
      }
      slot = updated;
    } else {
      // Insert new slot
      const { data: inserted, error: insertError } = await supabase
        .from('timetable_slots')
        .insert([upsertData])
        .select(`
          *,
          subject:subject_id (
            id,
            name,
            color
          )
        `)
        .single();

      if (insertError) {
        // If it's a unique constraint violation, try to find and update the existing slot
        if (insertError.code === '23505') {
          console.warn('Unique constraint violation, attempting to find and update existing slot:', insertError);
          
          // Try to find the conflicting slot more carefully
          let conflictQuery = supabase
            .from('timetable_slots')
            .select('id, teacher_ids')
            .eq('school_code', school_code)
            .eq('day', day);
          
          if (period_order !== undefined && period_order !== null) {
            conflictQuery = conflictQuery.eq('period_order', period_order);
          } else if (period !== undefined && period !== null) {
            conflictQuery = conflictQuery.eq('period', period);
          }
          
          if (class_id) {
            conflictQuery = conflictQuery.eq('class_id', class_id);
          } else if (class_teacher_id) {
            conflictQuery = conflictQuery.is('class_id', null).eq('teacher_id', class_teacher_id);
          }
          
          const { data: conflictSlot } = await conflictQuery.maybeSingle();
          
          if (conflictSlot) {
            // Update the existing slot instead
            const { data: updated, error: updateError } = await supabase
              .from('timetable_slots')
              .update(upsertData)
              .eq('id', conflictSlot.id)
              .select(`
                *,
                subject:subject_id (
                  id,
                  name,
                  color
                )
              `)
              .single();

            if (updateError) {
              console.error('Error updating conflicting slot:', updateError);
              return NextResponse.json(
                { error: 'Failed to update existing timetable slot', details: updateError.message, code: updateError.code, hint: updateError.hint },
                { status: 500 }
              );
            }
            slot = updated;
          } else {
            // Couldn't find the conflicting slot, return the original error
            console.error('Error creating timetable slot (unique constraint violation but slot not found):', insertError);
            return NextResponse.json(
              { error: 'Failed to create timetable slot: A slot already exists for this day/period. Please refresh and try again.', details: insertError.message, code: insertError.code, hint: insertError.hint },
              { status: 500 }
            );
          }
        } else {
          console.error('Error creating timetable slot:', insertError);
          return NextResponse.json(
            { error: 'Failed to create timetable slot', details: insertError.message, code: insertError.code, hint: insertError.hint },
            { status: 500 }
          );
        }
      } else {
        slot = inserted;
      }
    }

    // If teacher_ids are provided and class_id exists, create/update teacher timetable entries
    if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0 && class_id) {
      // Get existing teacher_ids for this slot to find removed teachers
      const oldTeacherIds = existingSlot 
        ? (await supabase
            .from('timetable_slots')
            .select('teacher_ids')
            .eq('id', existingSlot.id)
            .single()).data?.teacher_ids || []
        : [];

      // Find removed teachers (in old but not in new)
      const removedTeacherIds = oldTeacherIds.filter((id: string) => !teacher_ids.includes(id));
      
      // Delete teacher timetable entries for removed teachers
      if (removedTeacherIds.length > 0) {
        let deleteQuery = supabase
          .from('timetable_slots')
          .delete()
          .eq('school_code', school_code)
          .eq('day', day)
          .is('class_id', null)
          .in('teacher_id', removedTeacherIds);
        
        if (period_order) {
          deleteQuery = deleteQuery.eq('period_order', period_order);
        } else if (period) {
          deleteQuery = deleteQuery.eq('period', period);
        }
        
        await deleteQuery;
      }

      // CONFLICT DETECTION: Check if teachers are already assigned to other classes at this time
      const conflicts: Array<{ teacher_id: string; class_id: string; class_name: string }> = [];
      
      for (const teacherId of teacher_ids) {
        // Check if teacher is already assigned to another class at this time
        let conflictQuery = supabase
          .from('timetable_slots')
          .select(`
            id,
            class_id,
            class:class_id (class, section)
          `)
          .eq('school_code', school_code)
          .eq('day', day)
          .eq('teacher_id', teacherId)
          .not('class_id', 'is', null)
          .not('class_id', 'eq', class_id); // Exclude current class

        if (period_order) {
          conflictQuery = conflictQuery.eq('period_order', period_order);
        } else if (period) {
          conflictQuery = conflictQuery.eq('period', period);
        }

        const { data: conflictsData } = await conflictQuery;

        if (conflictsData && conflictsData.length > 0) {
          for (const conflict of conflictsData) {
            const classData = Array.isArray(conflict.class) ? conflict.class[0] : conflict.class;
            const classInfo = classData as { class: string; section: string } | null;
            conflicts.push({
              teacher_id: teacherId,
              class_id: conflict.class_id,
              class_name: classInfo ? `${classInfo.class}-${classInfo.section}` : 'Unknown',
            });
          }
        }
      }

      // Return conflict error if found (but don't block - allow override in future)
      // For now, we'll continue but log conflicts
      if (conflicts.length > 0) {
        console.warn('Teacher conflicts detected:', conflicts);
      }

      // Get class details for teacher timetable reference
      const { data: classData } = await supabase
        .from('classes')
        .select('id, class, section, academic_year')
        .eq('id', class_id)
        .single();

      // Build class reference JSON for teacher timetable
      const classReference = classData
        ? {
            class_id: classData.id,
            class: classData.class,
            section: classData.section,
            academic_year: classData.academic_year,
          }
        : null;

      // Create/update teacher timetable entries for each teacher
      for (const teacherId of teacher_ids) {
        interface TeacherSlotData {
          school_id: string;
          school_code: string;
          class_id: string | null; // IMPORTANT: NULL for teacher timetables
          day: string;
          period_order?: number;
          period?: string;
          subject_id: string | null;
          teacher_id: string;
          teacher_ids: string[];
          period_group_id?: string | null;
          class_reference?: { class_id: string; class: string; section: string; academic_year: string } | null;
          [key: string]: unknown;
        }
        
        const teacherSlotData: TeacherSlotData = {
          school_id: schoolData.id,
          school_code: school_code,
          class_id: null, // CRITICAL: NULL for teacher timetables
          day: day,
          subject_id: subject_id || null,
          teacher_id: teacherId,
          teacher_ids: [teacherId], // Single teacher per slot in teacher timetable
          class_reference: classReference, // Store class info for teacher view
        };

        // Always set both period_order and period for compatibility
        // CRITICAL: The valid_period constraint requires at least one to be NOT NULL
        if (period_order !== undefined && period_order !== null) {
          teacherSlotData.period_order = Number(period_order);
          teacherSlotData.period = String(period_order); // Set period as string for backward compatibility
        } else if (period !== undefined && period !== null) {
          teacherSlotData.period = String(period);
          // Try to parse period as number for period_order if it's numeric
          const periodNum = parseInt(String(period), 10);
          if (!isNaN(periodNum)) {
            teacherSlotData.period_order = periodNum;
          }
        }
        
        // Include period_group_id if provided (sync with class timetable)
        if (period_group_id !== undefined) {
          teacherSlotData.period_group_id = period_group_id || null;
        }

        // Check if teacher slot already exists
        let teacherQuery = supabase
          .from('timetable_slots')
          .select('id')
          .eq('school_code', school_code)
          .eq('day', day)
          .eq('teacher_id', teacherId)
          .is('class_id', null); // IMPORTANT: Only find teacher slots (class_id IS NULL)
        
        if (period_order) {
          teacherQuery = teacherQuery.eq('period_order', period_order);
        } else if (period) {
          teacherQuery = teacherQuery.eq('period', period);
        }

        const { data: existingTeacherSlot } = await teacherQuery.maybeSingle();

        if (existingTeacherSlot) {
          // Update existing teacher slot
          await supabase
            .from('timetable_slots')
            .update(teacherSlotData)
            .eq('id', existingTeacherSlot.id);
        } else {
          // Insert new teacher slot (with class_id = NULL)
          await supabase
            .from('timetable_slots')
            .insert([teacherSlotData]);
        }
      }
    } else if (existingSlot && class_id) {
      // If teacher_ids is empty but slot exists, remove all teacher timetable entries
      const { data: oldSlotData } = await supabase
        .from('timetable_slots')
        .select('teacher_ids')
        .eq('id', existingSlot.id)
        .maybeSingle();
      const oldTeacherIds = oldSlotData?.teacher_ids || [];

      if (oldTeacherIds.length > 0) {
        let deleteQuery = supabase
          .from('timetable_slots')
          .delete()
          .eq('school_code', school_code)
          .eq('day', day)
          .is('class_id', null)
          .in('teacher_id', oldTeacherIds);
        
        if (period_order) {
          deleteQuery = deleteQuery.eq('period_order', period_order);
        } else if (period) {
          deleteQuery = deleteQuery.eq('period', period);
        }
        
        await deleteQuery;
      }
    }

    // Fetch teachers if teacher_ids exist
    if (slot.teacher_ids && Array.isArray(slot.teacher_ids) && slot.teacher_ids.length > 0) {
      const { data: teachers } = await supabase
        .from('staff')
        .select('id, full_name, staff_id')
        .in('id', slot.teacher_ids)
        .eq('school_code', school_code);
      
      slot.teachers = teachers || [];
    }

    return NextResponse.json({ data: slot }, { status: existingSlot ? 200 : 201 });
  } catch (error) {
    console.error('Error saving timetable slot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

// Delete/clear a timetable slot
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, day, period, period_order, class_id } = body;

    if (!school_code || !day || (!period && !period_order)) {
      return NextResponse.json(
        { error: 'School code, day, and period (or period_order) are required' },
        { status: 400 }
      );
    }

    // Determine which period field to use (prefer period_order)
    const usePeriodOrder = period_order !== undefined && period_order !== null;
    const periodValue = usePeriodOrder ? period_order : parseInt(period, 10);

    if (class_id) {
      // First, get the slot to find teacher_ids before deleting
      let slotQuery = supabase
        .from('timetable_slots')
        .select('teacher_ids')
        .eq('school_code', school_code)
        .eq('day', day)
        .eq('class_id', class_id);
      
      if (usePeriodOrder) {
        slotQuery = slotQuery.eq('period_order', periodValue);
      } else {
        slotQuery = slotQuery.eq('period', String(periodValue));
      }

      const { data: slotData, error: slotQueryError } = await slotQuery.maybeSingle();

      if (slotQueryError && slotQueryError.code !== 'PGRST116') {
        console.error('Error fetching slot for deletion:', slotQueryError);
        return NextResponse.json(
          { error: 'Failed to fetch timetable slot', details: slotQueryError.message },
          { status: 500 }
        );
      }

      // Delete the class timetable slot
      let deleteQuery = supabase
        .from('timetable_slots')
        .delete()
        .eq('school_code', school_code)
        .eq('day', day)
        .eq('class_id', class_id);

      if (usePeriodOrder) {
        deleteQuery = deleteQuery.eq('period_order', periodValue);
      } else {
        deleteQuery = deleteQuery.eq('period', String(periodValue));
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Error deleting class timetable slot:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete timetable slot', details: deleteError.message },
          { status: 500 }
        );
      }

      // Also delete corresponding teacher timetable entries
      if (slotData && slotData.teacher_ids && Array.isArray(slotData.teacher_ids) && slotData.teacher_ids.length > 0) {
        let teacherQuery = supabase
          .from('timetable_slots')
          .delete()
          .eq('school_code', school_code)
          .eq('day', day)
          .is('class_id', null)
          .in('teacher_id', slotData.teacher_ids);
        
        if (usePeriodOrder) {
          teacherQuery = teacherQuery.eq('period_order', periodValue);
        } else {
          teacherQuery = teacherQuery.eq('period', String(periodValue));
        }
        
        const { error: teacherDeleteError } = await teacherQuery;
        
        if (teacherDeleteError) {
          console.error('Error deleting teacher timetable slots:', teacherDeleteError);
          // Don't fail the request, but log the error
        }
      }
    } else {
      // Delete teacher-only slots (class_id is NULL)
      let deleteQuery = supabase
        .from('timetable_slots')
        .delete()
        .eq('school_code', school_code)
        .eq('day', day)
        .is('class_id', null);

      if (usePeriodOrder) {
        deleteQuery = deleteQuery.eq('period_order', periodValue);
      } else {
        deleteQuery = deleteQuery.eq('period', String(periodValue));
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Error deleting timetable slot:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete timetable slot', details: deleteError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

