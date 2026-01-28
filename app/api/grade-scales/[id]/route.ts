import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// PATCH - Update a grade scale
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { grade, min_marks, max_marks, grade_point, description, academic_year, display_order, is_active } = body;

    const supabase = getServiceRoleClient();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (grade !== undefined) updateData.grade = grade;
    if (min_marks !== undefined) updateData.min_marks = min_marks;
    if (max_marks !== undefined) updateData.max_marks = max_marks;
    if (grade_point !== undefined) updateData.grade_point = grade_point;
    if (description !== undefined) updateData.description = description;
    if (academic_year !== undefined) updateData.academic_year = academic_year;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('grade_scales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating grade scale:', error);
      
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found',
          details: 'The grade_scales table does not exist. Please run the grade_scales_schema.sql migration script to create it.',
          code: 'TABLE_NOT_FOUND',
          hint: 'Run the SQL migration: grade_scales_schema.sql'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to update grade scale',
        details: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PATCH /api/grade-scales/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a grade scale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from('grade_scales')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting grade scale:', error);
      
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found',
          details: 'The grade_scales table does not exist. Please run the grade_scales_schema.sql migration script to create it.',
          code: 'TABLE_NOT_FOUND',
          hint: 'Run the SQL migration: grade_scales_schema.sql'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to delete grade scale',
        details: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Grade scale deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/grade-scales/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
