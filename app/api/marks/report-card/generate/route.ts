import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { fetchReportCardData, fetchReportCardDataMultiExam } from '../html/route';
import { generateReportCardHTML, type ReportCardTemplateConfig } from '@/lib/report-card-html';

/**
 * POST /api/marks/report-card/generate
 * Generate HTML report cards for one or more students and save to report_cards table
 * Body: { school_code, exam_id?: string, exam_ids?: string[], student_ids: string[], template_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, exam_id, exam_ids, student_ids, template_id } = body;

    const examIds: string[] = Array.isArray(exam_ids) && exam_ids.length > 0
      ? exam_ids
      : exam_id ? [exam_id] : [];

    if (!school_code || examIds.length === 0 || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: 'school_code, exam_id or exam_ids, and student_ids (non-empty array) are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const primaryExamId = examIds[0];

    let templateConfig: ReportCardTemplateConfig | undefined;
    
    // If no template_id provided, try to get the school's default or first school-specific template
    let effectiveTemplateId = template_id;
    if (!effectiveTemplateId) {
      console.log('No template_id provided, looking for school-specific template...');
      // First try school-specific templates
      const { data: schoolTemplate } = await supabase
        .from('report_card_templates')
        .select('id, name, config')
        .eq('school_code', school_code)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (schoolTemplate?.id) {
        effectiveTemplateId = schoolTemplate.id;
        console.log(`Using school-specific template: ${schoolTemplate.name}`);
      }
    }
    
    if (effectiveTemplateId) {
      console.log(`Fetching template config for template_id: ${effectiveTemplateId}`);
      const { data: t, error: templateError } = await supabase
        .from('report_card_templates')
        .select('id, name, config')
        .eq('id', effectiveTemplateId)
        .single();
      
      if (templateError) {
        console.error('Error fetching template:', templateError);
      } else if (t) {
        console.log(`Found template: ${t.name}`);
        console.log('Template config:', JSON.stringify(t.config));
        if (t.config && typeof t.config === 'object' && Object.keys(t.config).length > 0) {
          templateConfig = t.config as ReportCardTemplateConfig;
          console.log('Template config applied successfully');
        } else {
          console.log('Template config is empty, using default styling');
        }
      }
    } else {
      console.log('No template found, using default styling');
    }

    const generated: Array<{ id: string; student_id: string; student_name: string }> = [];
    const errors: Array<{ student_id: string; error: string }> = [];

    for (const studentId of student_ids) {
      try {
        const data = examIds.length === 1
          ? await fetchReportCardData(school_code, studentId, primaryExamId)
          : await fetchReportCardDataMultiExam(school_code, studentId, examIds);

        if (!data) {
          errors.push({ student_id: studentId, error: 'Student or exam not found' });
          continue;
        }

        const html = generateReportCardHTML(data, templateConfig);

        const now = new Date().toISOString();
        // Build payload - only include columns that exist in the table
        const upsertPayload: Record<string, unknown> = {
          school_code,
          student_id: studentId,
          exam_id: primaryExamId,
          student_name: data.student.student_name,
          admission_no: data.student.admission_no,
          class_name: data.student.class,
          section: data.student.section,
          academic_year: data.exam.academic_year,
          html_content: html,
          updated_at: now,
        };

        // Try insert first (simpler, avoids upsert constraint issues)
        let insertedId: string | null = null;

        // Check if record exists
        const { data: existing } = await supabase
          .from('report_cards')
          .select('id')
          .eq('school_code', school_code)
          .eq('student_id', studentId)
          .eq('exam_id', primaryExamId)
          .maybeSingle();

        if (existing?.id) {
          // Update existing (set updated_at so list shows latest first)
          const { error: updateErr } = await supabase
            .from('report_cards')
            .update({
              student_name: upsertPayload.student_name,
              admission_no: upsertPayload.admission_no,
              class_name: upsertPayload.class_name,
              section: upsertPayload.section,
              academic_year: upsertPayload.academic_year,
              html_content: upsertPayload.html_content,
              updated_at: now,
            })
            .eq('id', existing.id);

          if (updateErr) {
            errors.push({ student_id: studentId, error: updateErr.message });
            continue;
          }
          insertedId = existing.id;
        } else {
          // Insert new
          const { data: inserted, error: insertErr } = await supabase
            .from('report_cards')
            .insert(upsertPayload)
            .select('id')
            .single();

          if (insertErr) {
            errors.push({ student_id: studentId, error: insertErr.message });
            continue;
          }
          insertedId = inserted?.id || null;
        }

        if (insertedId) {
          generated.push({
            id: insertedId,
            student_id: studentId,
            student_name: data.student.student_name,
          });
        }
      } catch (e) {
        errors.push({ student_id: studentId, error: (e as Error).message });
      }
    }

    console.log(`Report card generation complete: ${generated.length} generated, ${errors.length} errors`);
    if (errors.length > 0) {
      console.error('Report card generation errors:', errors);
    }

    return NextResponse.json({
      message: `Generated ${generated.length} report card(s)`,
      generated,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error('Error generating report cards:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
