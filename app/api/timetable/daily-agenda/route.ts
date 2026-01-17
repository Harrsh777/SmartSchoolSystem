import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AgendaItem {
  id: string;
  type: 'timetable' | 'todo';
  time: string;
  duration?: number;
  name: string;
  room?: string;
  class?: string;
  period_order?: number;
  subject_id?: string;
  class_id?: string;
  status?: string | null;
  priority?: string;
  due_time?: string;
  category?: string;
  tags?: string[];
}

// Get today's timetable slots and to-dos for a teacher (Daily Agenda)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');

    if (!schoolCode || !teacherId) {
      return NextResponse.json(
        { error: 'School code and teacher_id are required' },
        { status: 400 }
      );
    }

    // Get today's day name
    const today = new Date();
    const todayDayName = DAYS[today.getDay()];

    // Get slots where teacher_id matches OR teacher_id is in teacher_ids array
    // First get slots with direct teacher_id match
    const { data: directSlots, error: directError } = await supabase
      .from('timetable_slots')
      .select(`
        *,
        subject:subject_id (
          id,
          name,
          color
        ),
        class:class_id (
          id,
          class,
          section
        ),
        class_reference (
          class_id,
          class,
          section,
          academic_year
        )
      `)
      .eq('school_code', schoolCode)
      .eq('day', todayDayName)
      .eq('teacher_id', teacherId);

    // Then get slots where teacher is in teacher_ids array
    const { data: arraySlots, error: arrayError } = await supabase
      .from('timetable_slots')
      .select(`
        *,
        subject:subject_id (
          id,
          name,
          color
        ),
        class:class_id (
          id,
          class,
          section
        ),
        class_reference (
          class_id,
          class,
          section,
          academic_year
        )
      `)
      .eq('school_code', schoolCode)
      .eq('day', todayDayName)
      .contains('teacher_ids', [teacherId]);

    if (directError || arrayError) {
      console.error('Error fetching daily agenda:', directError || arrayError);
      return NextResponse.json(
        { error: 'Failed to fetch daily agenda', details: (directError || arrayError)?.message },
        { status: 500 }
      );
    }

    // Combine and deduplicate slots
    interface TimetableSlot {
      id: string;
      period_order?: number | null;
      period?: number | null;
      subject_id?: string | null;
      class_id?: string | null;
      room?: string | null;
      location?: string | null;
      duration?: number | null;
      subject?: {
        name?: string;
      } | null;
      class?: {
        class: string;
        section?: string | null;
      } | null;
      class_reference?: {
        class: string;
        section?: string | null;
      } | null;
    }
    const allSlots = [...(directSlots || []), ...(arraySlots || [])];
    const uniqueSlots = Array.from(
      new Map(allSlots.map((slot: TimetableSlot) => [slot.id, slot])).values()
    ) as TimetableSlot[];

    const slots = uniqueSlots;

    // Sort slots by period_order if available, otherwise by period
    const sortedSlots = slots.sort((a: TimetableSlot, b: TimetableSlot) => {
      const aOrder = a.period_order ?? a.period ?? 999;
      const bOrder = b.period_order ?? b.period ?? 999;
      return aOrder - bOrder;
    });

    // Map slots to include class information and format for daily agenda
    const agendaSlots: AgendaItem[] = (sortedSlots || []).map((slot: TimetableSlot) => {
      // Get class info from class_reference or class
      const classInfo = slot.class_reference || slot.class;
      
      // Format class name
      const className = classInfo 
        ? `${classInfo.class}${classInfo.section ? `-${classInfo.section}` : ''}`
        : 'N/A';

      // Get subject name
      const subjectName = slot.subject?.name || 'N/A';
      
      // Get room/location (assuming it's stored in a field, or use default)
      const room = slot.room || slot.location || 'TBD';

      // Calculate duration (assuming 40 minutes per period, adjust as needed)
      const duration = slot.duration || 40;

      // Format time (assuming period corresponds to time slots)
      // This is a simplified version - you may need to fetch period times from period_groups
      const periodOrder = slot.period_order || slot.period || 1;
      // Time calculation would depend on your period schedule
      // For now, we'll use period number as placeholder

      return {
        id: slot.id,
        type: 'timetable' as const,
        time: `Period ${periodOrder}`, // Simplified - you can enhance this with actual times
        duration: duration,
        name: subjectName,
        room: room,
        class: className,
        period_order: periodOrder,
        subject_id: slot.subject_id ?? undefined,
        class_id: slot.class_id ?? undefined,
        status: null, // Can be set based on current time vs slot time
      };
    });

    // Fetch to-dos for today (including those without due_date)
    const todayDate = new Date().toISOString().split('T')[0];
    
    // Fetch todos with due_date = today OR due_date is null
    const { data: todosWithDate, error: errorWithDate } = await supabase
      .from('teacher_todos')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('school_code', schoolCode)
      .eq('due_date', todayDate)
      .neq('status', 'completed')
      .neq('status', 'cancelled');
    
    const { data: todosWithoutDate, error: errorWithoutDate } = await supabase
      .from('teacher_todos')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('school_code', schoolCode)
      .is('due_date', null)
      .neq('status', 'completed')
      .neq('status', 'cancelled');
    
    // Combine both queries and deduplicate
    interface TodoItem {
      id: string;
      priority?: string | null;
      due_time?: string | null;
      title: string;
      category?: string | null;
      tags?: string[] | null;
      status?: string | null;
    }
    const allTodos = [...(todosWithDate || []), ...(todosWithoutDate || [])];
    const uniqueTodos: TodoItem[] = Array.from(
      new Map(allTodos.map((todo: TodoItem) => [todo.id, todo])).values()
    );
    
    // Sort combined todos
    const todos = uniqueTodos.sort((a: TodoItem, b: TodoItem) => {
      // Sort by priority first
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Then sort by due_time
      if (a.due_time && b.due_time) {
        return a.due_time.localeCompare(b.due_time);
      }
      if (a.due_time && !b.due_time) return -1;
      if (!a.due_time && b.due_time) return 1;
      return 0;
    });
    
    const todosError = errorWithDate || errorWithoutDate;

    // Map to-dos to agenda format
    const agendaTodos: AgendaItem[] = (todos || []).map((todo: TodoItem) => ({
      id: todo.id,
      type: 'todo' as const,
      time: todo.due_time ? todo.due_time.substring(0, 5) : 'No time', // Format time (HH:MM)
      name: todo.title,
      priority: todo.priority || 'medium',
      due_time: todo.due_time ?? undefined,
      category: todo.category ?? undefined,
      tags: todo.tags || [],
      status: todo.status,
    }));

    // Combine timetable slots and to-dos, sort by time
    const combinedAgenda = [...agendaSlots, ...agendaTodos].sort((a, b) => {
      // Extract time for sorting (handle "Period X" vs "HH:MM" format)
      const timeA = a.time.includes('Period') ? parseInt(a.time.replace('Period ', '')) * 100 : parseInt(a.time.replace(':', '')) || 0;
      const timeB = b.time.includes('Period') ? parseInt(b.time.replace('Period ', '')) * 100 : parseInt(b.time.replace(':', '')) || 0;
      return timeA - timeB;
    });

    if (todosError) {
      console.warn('Error fetching todos for daily agenda:', todosError.message);
      // Continue with just timetable slots if todos fail
      // Return agenda without todos if there's an error
      return NextResponse.json({ data: agendaSlots }, { status: 200 });
    }

    return NextResponse.json({ data: combinedAgenda }, { status: 200 });
  } catch (error) {
    console.error('Error fetching daily agenda:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
