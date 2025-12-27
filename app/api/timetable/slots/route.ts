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
      return NextResponse.json(
        { error: 'Failed to fetch timetable slots', details: error.message },
        { status: 500 }
      );
    }

    // Fetch teachers for slots with teacher_ids arrays
    interface SlotWithTeachers {
      teacher_ids?: string[];
      teachers?: Array<{ id: string; full_name: string; staff_id: string }>;
      [key: string]: unknown;
    }
    const slotsWithTeachers = await Promise.all(
      (slots || []).map(async (slot: SlotWithTeachers) => {
        if (slot.teacher_ids && Array.isArray(slot.teacher_ids) && slot.teacher_ids.length > 0) {
          const { data: teachers } = await supabase
            .from('staff')
            .select('id, full_name, staff_id')
            .in('id', slot.teacher_ids)
            .eq('school_code', schoolCode);
          
          slot.teachers = teachers || [];
        }
        return slot;
      })
    );

    return NextResponse.json({ data: slotsWithTeachers || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching timetable slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Upsert timetable slot (auto-save on drop)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, day, period, period_order, subject_id, class_id, teacher_id, teacher_ids, class_teacher_id } = body;

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

    // Build upsert data
    interface UpsertSlotData {
      school_id: string;
      school_code: string;
      day: string;
      subject_id: string | null;
      period_order?: number;
      period?: string;
      class_id?: string;
      teacher_id?: string;
      teacher_ids?: string[];
    }
    const upsertData: UpsertSlotData = {
      school_id: schoolData.id,
      school_code: school_code,
      day: day,
      subject_id: subject_id || null,
    };

    // Use period_order if provided, otherwise use period
    if (period_order) {
      upsertData.period_order = period_order;
    } else {
      upsertData.period = period;
    }

    if (class_id) {
      upsertData.class_id = class_id;
    } else if (class_teacher_id) {
      // For class teacher timetable, store the class_teacher_id in a special way
      // We'll use class_id as null and store teacher_id
      upsertData.teacher_id = class_teacher_id;
    }

    // Handle teacher assignments
    if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
      upsertData.teacher_ids = teacher_ids;
      // Also set teacher_id to first teacher for backward compatibility
      upsertData.teacher_id = teacher_ids[0];
    } else if (teacher_id) {
      upsertData.teacher_id = teacher_id;
    }

    // First, try to find existing slot
    let query = supabase
      .from('timetable_slots')
      .select('id')
      .eq('school_code', school_code)
      .eq('day', day);
    
    // Use period_order if provided, otherwise use period
    if (period_order) {
      query = query.eq('period_order', period_order);
    } else {
      query = query.eq('period', period);
    }

    if (class_id) {
      query = query.eq('class_id', class_id);
    } else if (class_teacher_id) {
      // For class teacher timetable, find by teacher_id and null class_id
      query = query.is('class_id', null).eq('teacher_id', class_teacher_id);
    } else {
      query = query.is('class_id', null);
    }

    const { data: existing, error: existingError } = await query.single();

    let slot;
    const existingSlot = existing && !existingError ? existing : null;
    
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
        return NextResponse.json(
          { error: 'Failed to update timetable slot', details: updateError.message },
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
        return NextResponse.json(
          { error: 'Failed to create timetable slot', details: insertError.message },
          { status: 500 }
        );
      }
      slot = inserted;
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

      // Get class details for teacher timetable (classData kept for potential future use)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: classData } = await supabase
        .from('classes')
        .select('class, section, academic_year')
        .eq('id', class_id)
        .single();

      // Create/update teacher timetable entries for each teacher
      for (const teacherId of teacher_ids) {
        interface TeacherSlotData {
          school_id: string;
          school_code: string;
          class_id: string;
          day: string;
          period_order?: number;
          period?: string;
          subject_id: string | null;
          teacher_id: string;
          [key: string]: unknown;
        }
        const teacherSlotData: TeacherSlotData = {
          school_id: schoolData.id,
          school_code: school_code,
          class_id: class_id,
          day: day,
          subject_id: subject_id || null,
          teacher_id: teacherId,
        };

        if (period_order) {
          teacherSlotData.period_order = period_order;
        } else if (period) {
          teacherSlotData.period = period;
        }

        // Check if teacher slot already exists
        let teacherQuery = supabase
          .from('timetable_slots')
          .select('id')
          .eq('school_code', school_code)
          .eq('day', day)
          .eq('teacher_id', teacherId)
          .is('class_id', null);
        
        if (period_order) {
          teacherQuery = teacherQuery.eq('period_order', period_order);
        } else if (period) {
          teacherQuery = teacherQuery.eq('period', period);
        }

        const { data: existingTeacherSlot } = await teacherQuery.single();

        if (existingTeacherSlot) {
          // Update existing teacher slot
          await supabase
            .from('timetable_slots')
            .update(teacherSlotData)
            .eq('id', existingTeacherSlot.id);
        } else {
          // Insert new teacher slot
          await supabase
            .from('timetable_slots')
            .insert([teacherSlotData]);
        }
      }
    } else if (existingSlot && class_id) {
      // If teacher_ids is empty but slot exists, remove all teacher timetable entries
      const oldTeacherIds = (await supabase
        .from('timetable_slots')
        .select('teacher_ids')
        .eq('id', existingSlot.id)
        .single()).data?.teacher_ids || [];

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
    return NextResponse.json(
      { error: 'Internal server error' },
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

    let query = supabase
      .from('timetable_slots')
      .delete()
      .eq('school_code', school_code)
      .eq('day', day);

    // Use period_order if provided, otherwise use period
    if (period_order) {
      query = query.eq('period_order', period_order);
    } else {
      query = query.eq('period', parseInt(period));
    }

    if (class_id) {
      // First, get the slot to find teacher_ids before deleting
      let slotQuery = supabase
        .from('timetable_slots')
        .select('teacher_ids')
        .eq('school_code', school_code)
        .eq('day', day)
        .eq('class_id', class_id);
      
      if (period_order) {
        slotQuery = slotQuery.eq('period_order', period_order);
      } else {
        slotQuery = slotQuery.eq('period', parseInt(period));
      }

      const { data: slotData } = await slotQuery.single();

      // Delete the class timetable slot
      if (period_order) {
        query = query.eq('period_order', period_order);
      } else {
        query = query.eq('period', parseInt(period));
      }
      query = query.eq('class_id', class_id);

      // Also delete corresponding teacher timetable entries
      if (slotData && slotData.teacher_ids && Array.isArray(slotData.teacher_ids) && slotData.teacher_ids.length > 0) {
        let teacherQuery = supabase
          .from('timetable_slots')
          .delete()
          .eq('school_code', school_code)
          .eq('day', day)
          .is('class_id', null)
          .in('teacher_id', slotData.teacher_ids);
        
        if (period_order) {
          teacherQuery = teacherQuery.eq('period_order', period_order);
        } else {
          teacherQuery = teacherQuery.eq('period', parseInt(period));
        }
        
        await teacherQuery;
      }
    } else {
      query = query.is('class_id', null);
      if (period_order) {
        query = query.eq('period_order', period_order);
      } else {
        query = query.eq('period', parseInt(period));
      }
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete timetable slot', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

