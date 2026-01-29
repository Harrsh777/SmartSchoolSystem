import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all to-do items for a teacher
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const dueDate = searchParams.get('due_date');
    const category = searchParams.get('category');

    if (!schoolCode || !teacherId) {
      return NextResponse.json(
        { error: 'school_code and teacher_id are required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('teacher_todos')
      .select(`
        *,
        class:class_id (
          id,
          class,
          section
        ),
        subject:subject_id (
          id,
          name
        )
      `)
      .eq('school_code', schoolCode)
      .eq('teacher_id', teacherId);

    // Apply filters (status can be comma-separated e.g. "pending,in_progress")
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 1) {
        query = query.in('status', statuses);
      } else if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      }
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (dueDate) {
      query = query.eq('due_date', dueDate);
    }
    if (category) {
      query = query.eq('category', category);
    }

    // Order by priority and due date
    const { data: todos, error } = await query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('due_time', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching teacher todos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch todos', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: todos || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher todos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new to-do item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, teacher_id, title, description, priority, status, due_date, due_time, category, tags, class_id, subject_id, is_recurring, recurrence_pattern } = body;

    if (!school_code || !teacher_id || !title) {
      return NextResponse.json(
        { error: 'school_code, teacher_id, and title are required' },
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

    // Prepare to-do record
    const todoRecord: {
      teacher_id: string;
      school_code: string;
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      due_date?: string;
      due_time?: string;
      category?: string;
      tags?: string[];
      class_id?: string;
      subject_id?: string;
      is_recurring?: boolean;
      recurrence_pattern?: string;
      created_by: string;
      [key: string]: unknown;
    } = {
      teacher_id,
      school_code,
      title,
      created_by: teacher_id, // Created by the teacher themselves
    };

    // Add optional fields (default status to pending so GET with status filter finds new tasks)
    if (description) todoRecord.description = description;
    if (priority) todoRecord.priority = priority;
    todoRecord.status = status || 'pending';
    if (due_date) todoRecord.due_date = due_date;
    if (due_time) todoRecord.due_time = due_time;
    if (category) todoRecord.category = category;
    if (tags) todoRecord.tags = tags;
    if (class_id) todoRecord.class_id = class_id;
    if (subject_id) todoRecord.subject_id = subject_id;
    if (is_recurring !== undefined) todoRecord.is_recurring = is_recurring;
    if (recurrence_pattern) todoRecord.recurrence_pattern = recurrence_pattern;

    // Insert to-do record
    const { data: insertedTodo, error: insertError } = await supabase
      .from('teacher_todos')
      .insert(todoRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating todo:', insertError);
      return NextResponse.json(
        { error: 'Failed to create todo', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'To-do created successfully',
      data: insertedTodo,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
