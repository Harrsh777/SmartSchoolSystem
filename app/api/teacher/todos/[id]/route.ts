import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH - Update a to-do item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, priority, status, due_date, due_time, category, tags, class_id, subject_id, is_recurring, recurrence_pattern, completed_at, completed_by } = body;

    // Verify to-do exists and belongs to the teacher
    const { data: existingTodo, error: fetchError } = await supabase
      .from('teacher_todos')
      .select('id, teacher_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingTodo) {
      return NextResponse.json(
        { error: 'To-do not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      due_date?: string | null;
      due_time?: string | null;
      category?: string;
      tags?: string[];
      class_id?: string | null;
      subject_id?: string | null;
      is_recurring?: boolean;
      recurrence_pattern?: string;
      completed_at?: string | null;
      completed_by?: string | null;
      updated_at?: string;
      [key: string]: unknown;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Add fields if provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      // If marking as completed, set completed_at if not provided
      if (status === 'completed' && !completed_at) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = completed_by || existingTodo.teacher_id;
      } else if (status !== 'completed') {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }
    }
    if (due_date !== undefined) updateData.due_date = due_date;
    if (due_time !== undefined) updateData.due_time = due_time;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (class_id !== undefined) updateData.class_id = class_id;
    if (subject_id !== undefined) updateData.subject_id = subject_id;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurrence_pattern !== undefined) updateData.recurrence_pattern = recurrence_pattern;
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    if (completed_by !== undefined) updateData.completed_by = completed_by;

    // Update to-do record
    const { data: updatedTodo, error: updateError } = await supabase
      .from('teacher_todos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating todo:', updateError);
      return NextResponse.json(
        { error: 'Failed to update todo', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'To-do updated successfully',
      data: updatedTodo,
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a to-do item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify to-do exists
    const { data: existingTodo, error: fetchError } = await supabase
      .from('teacher_todos')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingTodo) {
      return NextResponse.json(
        { error: 'To-do not found' },
        { status: 404 }
      );
    }

    // Delete to-do record
    const { error: deleteError } = await supabase
      .from('teacher_todos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting todo:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete todo', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'To-do deleted successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
