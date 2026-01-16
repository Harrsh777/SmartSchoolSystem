import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/diary/[id]
 * Update a diary entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      content,
      type,
      mode,
      targets,
      attachments,
      updated_by,
    } = body;

    // Get existing diary
    const { data: existing, error: fetchError } = await supabase
      .from('diaries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    // Update diary entry
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (mode !== undefined) updateData.mode = mode;
    if (updated_by !== undefined) updateData.updated_by = updated_by;

    const { error: updateError } = await supabase
      .from('diaries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update diary entry', details: updateError.message },
        { status: 500 }
      );
    }

    // Update targets if provided
    if (targets) {
      // Delete existing targets
      await supabase.from('diary_targets').delete().eq('diary_id', id);

      // Insert new targets
      if (targets.length > 0) {
        const targetInserts = targets.map((target: { class_name: string; section_name?: string }) => ({
          diary_id: id,
          class_name: target.class_name,
          section_name: target.section_name || null,
        }));

        await supabase.from('diary_targets').insert(targetInserts);
      }
    }

    // Update attachments if provided
    if (attachments) {
      // Delete existing attachments
      await supabase.from('diary_attachments').delete().eq('diary_id', id);

      // Insert new attachments
      if (attachments.length > 0) {
        const attachmentInserts = attachments.map((att: { file_name: string; file_url: string; file_type: string; file_size?: number }) => ({
          diary_id: id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: att.file_size || null,
          uploaded_by: updated_by || null,
        }));

        await supabase.from('diary_attachments').insert(attachmentInserts);
      }
    }

    // Fetch complete diary with relations
    const { data: completeDiary } = await supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          id,
          class_name,
          section_name
        ),
        diary_attachments (
          id,
          file_name,
          file_url,
          file_type
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ data: completeDiary }, { status: 200 });
  } catch (error) {
    console.error('Error updating diary entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/diary/[id]
 * Soft delete a diary entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete
    const { error: deleteError } = await supabase
      .from('diaries')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete diary entry', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Diary entry deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



