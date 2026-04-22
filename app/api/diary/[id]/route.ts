import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DiaryTargetInput {
  class_name: string;
  section_name?: string;
}

async function validateSubjectWiseScope(params: {
  school_code: string;
  academic_year_id?: string;
  mode?: string;
  subject_id?: string;
  targets: DiaryTargetInput[];
}) {
  const { school_code, academic_year_id, mode, subject_id, targets } = params;

  if (!targets || targets.length !== 1) {
    return { ok: false, error: 'Please select exactly one class/section target' };
  }

  const target = targets[0];
  let classQuery = supabase
    .from('classes')
    .select('id, section')
    .eq('school_code', school_code)
    .eq('class', target.class_name);

  if (academic_year_id) {
    classQuery = classQuery.eq('academic_year', academic_year_id);
  }
  if (target.section_name) {
    classQuery = classQuery.eq('section', target.section_name);
  }

  const { data: classRows, error: classError } = await classQuery;
  if (classError) {
    return { ok: false, error: `Failed to validate class/section: ${classError.message}` };
  }
  if (!classRows || classRows.length === 0) {
    return { ok: false, error: 'Selected class/section was not found in this academic year' };
  }

  if (mode !== 'SUBJECT_WISE') {
    return { ok: true };
  }

  if (!subject_id) {
    return { ok: false, error: 'Subject is required when diary mode is Subject-wise' };
  }

  const classIds = classRows.map((row) => row.id);
  const { data: subjectMappings, error: subjectMapError } = await supabase
    .from('class_subjects')
    .select('class_id')
    .eq('school_code', school_code)
    .eq('subject_id', subject_id)
    .in('class_id', classIds);

  if (subjectMapError) {
    return { ok: false, error: `Failed to validate subject mapping: ${subjectMapError.message}` };
  }

  const coveredClassIds = new Set((subjectMappings || []).map((row) => row.class_id));
  if (coveredClassIds.size !== classIds.length) {
    return { ok: false, error: 'Selected subject is not assigned to the selected class/section scope' };
  }

  return { ok: true };
}

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
      subject_id,
      targets,
      attachments,
      updated_by,
    } = body;

    // Get existing diary
    const { data: existing, error: fetchError } = await supabase
      .from('diaries')
      .select(`
        *,
        diary_targets (
          class_name,
          section_name
        )
      `)
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
    if (subject_id !== undefined) updateData.subject_id = subject_id || null;
    if (mode === 'GENERAL' && 'subject_id' in existing) {
      updateData.subject_id = null;
    }
    if (mode === 'SUBJECT_WISE' && !subject_id && !existing.subject_id) {
      return NextResponse.json(
        { error: 'Subject is required when diary mode is Subject-wise' },
        { status: 400 }
      );
    }

    const effectiveMode = mode ?? existing.mode;
    const effectiveSubjectId =
      subject_id !== undefined ? (subject_id || undefined) : (existing.subject_id || undefined);
    const effectiveTargets: DiaryTargetInput[] = Array.isArray(targets)
      ? targets
      : (existing.diary_targets as DiaryTargetInput[] | undefined) || [];
    const scopeValidation = await validateSubjectWiseScope({
      school_code: existing.school_code,
      academic_year_id: existing.academic_year_id || undefined,
      mode: effectiveMode,
      subject_id: effectiveSubjectId,
      targets: effectiveTargets,
    });
    if (!scopeValidation.ok) {
      return NextResponse.json({ error: scopeValidation.error }, { status: 400 });
    }

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



