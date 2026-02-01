-- ============================================================================
-- REPORT CARD SYSTEM - Production Schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Report Card Templates (school-specific or global presets)
CREATE TABLE IF NOT EXISTS public.report_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_card_templates_school ON public.report_card_templates(school_code);
CREATE INDEX IF NOT EXISTS idx_report_card_templates_active ON public.report_card_templates(is_active) WHERE is_active = true;

-- Unique constraint to prevent duplicate templates per school (or system templates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_card_templates_unique_name 
  ON public.report_card_templates(COALESCE(school_code, ''), name) WHERE is_active = true;

-- 2. Update accepted_schools - add template and logo columns
ALTER TABLE public.accepted_schools ADD COLUMN IF NOT EXISTS default_report_card_template_id UUID REFERENCES public.report_card_templates(id);
ALTER TABLE public.accepted_schools ADD COLUMN IF NOT EXISTS right_logo_url TEXT;
ALTER TABLE public.accepted_schools ADD COLUMN IF NOT EXISTS principal_signature_url TEXT;
ALTER TABLE public.accepted_schools ADD COLUMN IF NOT EXISTS class_teacher_signature_url TEXT;
ALTER TABLE public.accepted_schools ADD COLUMN IF NOT EXISTS school_stamp_url TEXT;

-- 3. Update report_cards - add exam_ids for multi-exam, template_id, updated_at
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS exam_ids UUID[] DEFAULT '{}';
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.report_card_templates(id);
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_report_cards_updated ON public.report_cards(school_code, updated_at DESC NULLS LAST);

-- 4. First, delete duplicate system templates (keep only oldest by created_at)
DELETE FROM public.report_card_templates 
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id 
  FROM public.report_card_templates 
  WHERE school_code IS NULL AND is_system = TRUE
  ORDER BY name, created_at ASC
) AND school_code IS NULL AND is_system = TRUE;

-- 5. Insert default system templates only if they don't exist
INSERT INTO public.report_card_templates (school_code, name, description, is_system, is_active, config, display_order)
SELECT NULL, 'Standard CBSE', 'Full CBSE-style report card with scholastic, co-scholastic, attendance, grading scale', TRUE, TRUE,
  '{"logos":{"left_size":100,"right_size":100,"left_shape":"circle","right_shape":"circle","show_right_logo":true},"header":{"school_name_color":"#8B0000","font_size":18,"sub_title":"SENIOR SECONDARY SCHOOL","show_affiliation":true,"show_email":true,"show_contact":true},"sections":{"show_student_profile":true,"show_marks_table":true,"show_attendance":true,"show_co_scholastic":true,"show_remarks":true,"show_instructions":true,"show_grading_scale":true},"student_profile_fields":["name","class_section","father_name","mother_name","address","admission_no","contact"],"marks_table":{"show_sno":true,"show_percentage":true,"show_grade":true,"show_max_marks":true,"header_bg_color":"#e6f0e6","zebra_rows":true,"round_percentage":true},"labels":{"father_name":"Father''s Name","mother_name":"Mother''s Name","remarks":"Remarks","attendance":"Attendance","report_title":"REPORT CARD"},"branding":{"primary_color":"#1e3a8a","accent_color":"#3B82F6","font_family":"Arial, sans-serif"},"layout":{"header_layout":"both_sides","orientation":"portrait","table_density":"normal"},"class_term_info":{"show_exam_name":true,"show_academic_session":true,"show_result_date":true},"attendance_display":"both","result_summary":{"show_total":true,"show_percentage":true,"show_grade":true,"show_rank":true,"show_pass_fail":true},"signatures":{"show_class_teacher":true,"show_principal":true},"output":{"watermark":"final"},"watermark":{"enabled":true,"size":500,"opacity":0.08}}'::jsonb,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.report_card_templates WHERE name = 'Standard CBSE' AND school_code IS NULL);

INSERT INTO public.report_card_templates (school_code, name, description, is_system, is_active, config, display_order)
SELECT NULL, 'Minimal', 'Compact report card with essential information only', TRUE, TRUE,
  '{"logos":{"left_size":80,"right_size":80,"left_shape":"circle","right_shape":"circle","show_right_logo":false},"header":{"school_name_color":"#333","font_size":16,"sub_title":"","show_affiliation":false,"show_email":false,"show_contact":true},"sections":{"show_student_profile":true,"show_marks_table":true,"show_attendance":true,"show_co_scholastic":false,"show_remarks":true,"show_instructions":false,"show_grading_scale":false},"student_profile_fields":["name","class_section","admission_no"],"marks_table":{"show_sno":true,"show_percentage":true,"show_grade":true,"show_max_marks":true,"header_bg_color":"#f5f5f5","zebra_rows":false,"round_percentage":true},"labels":{"father_name":"Father","mother_name":"Mother","remarks":"Remarks","attendance":"Attendance","report_title":"Report Card"},"branding":{"primary_color":"#333","accent_color":"#666","font_family":"Arial, sans-serif"},"layout":{"header_layout":"left","orientation":"portrait","table_density":"compact"},"class_term_info":{"show_exam_name":true,"show_academic_session":true,"show_result_date":true},"attendance_display":"percentage_only","result_summary":{"show_total":true,"show_percentage":true,"show_grade":true,"show_rank":false,"show_pass_fail":true},"signatures":{"show_class_teacher":true,"show_principal":true},"output":{"watermark":"final"},"watermark":{"enabled":true,"size":500,"opacity":0.08}}'::jsonb,
  2
WHERE NOT EXISTS (SELECT 1 FROM public.report_card_templates WHERE name = 'Minimal' AND school_code IS NULL);

INSERT INTO public.report_card_templates (school_code, name, description, is_system, is_active, config, display_order)
SELECT NULL, 'Detailed', 'Comprehensive report card with all sections', TRUE, TRUE,
  '{"logos":{"left_size":120,"right_size":120,"left_shape":"circle","right_shape":"circle","show_right_logo":true},"header":{"school_name_color":"#8B0000","font_size":20,"sub_title":"SENIOR SECONDARY SCHOOL","show_affiliation":true,"show_email":true,"show_contact":true},"sections":{"show_student_profile":true,"show_marks_table":true,"show_attendance":true,"show_co_scholastic":true,"show_remarks":true,"show_instructions":true,"show_grading_scale":true},"student_profile_fields":["name","class_section","father_name","mother_name","address","admission_no","contact","roll_number"],"marks_table":{"show_sno":true,"show_percentage":true,"show_grade":true,"show_max_marks":true,"header_bg_color":"#e6f0e6","zebra_rows":true,"round_percentage":true},"labels":{"father_name":"Father''s Name","mother_name":"Mother''s Name","remarks":"Remarks","attendance":"Attendance","report_title":"REPORT CARD"},"branding":{"primary_color":"#1e3a8a","accent_color":"#3B82F6","font_family":"Arial, sans-serif"},"layout":{"header_layout":"both_sides","orientation":"portrait","table_density":"spacious"},"class_term_info":{"show_exam_name":true,"show_academic_session":true,"show_result_date":true},"attendance_display":"both","result_summary":{"show_total":true,"show_percentage":true,"show_grade":true,"show_rank":true,"show_pass_fail":true},"signatures":{"show_class_teacher":true,"show_principal":true},"output":{"watermark":"final"},"watermark":{"enabled":true,"size":500,"opacity":0.08}}'::jsonb,
  3
WHERE NOT EXISTS (SELECT 1 FROM public.report_card_templates WHERE name = 'Detailed' AND school_code IS NULL);

INSERT INTO public.report_card_templates (school_code, name, description, is_system, is_active, config, display_order)
SELECT NULL, 'CBSE Term-Wise', 'CBSE format with Term I and Term II columns', TRUE, TRUE,
  '{"logos":{"left_size":100,"right_size":100,"left_shape":"circle","right_shape":"circle","show_right_logo":true},"header":{"school_name_color":"#8B0000","font_size":18,"sub_title":"SENIOR SECONDARY SCHOOL","show_affiliation":true,"show_email":true,"show_contact":true},"sections":{"show_student_profile":true,"show_marks_table":true,"show_attendance":true,"show_co_scholastic":true,"show_remarks":true,"show_instructions":true,"show_grading_scale":true},"student_profile_fields":["name","class_section","father_name","mother_name","address","admission_no","contact"],"marks_table":{"show_sno":true,"show_percentage":true,"show_grade":true,"show_max_marks":true,"header_bg_color":"#e6f0e6","zebra_rows":true,"round_percentage":true,"term_wise":true},"labels":{"father_name":"Father''s Name","mother_name":"Mother''s Name","remarks":"Remarks","attendance":"Attendance","report_title":"REPORT CARD"},"branding":{"primary_color":"#1e3a8a","accent_color":"#3B82F6","font_family":"Arial, sans-serif"},"layout":{"header_layout":"both_sides","orientation":"portrait","table_density":"normal"},"class_term_info":{"show_exam_name":true,"show_academic_session":true,"show_result_date":true},"attendance_display":"both","result_summary":{"show_total":true,"show_percentage":true,"show_grade":true,"show_rank":true,"show_pass_fail":true},"signatures":{"show_class_teacher":true,"show_principal":true},"output":{"watermark":"final"},"watermark":{"enabled":true,"size":500,"opacity":0.08}}'::jsonb,
  4
WHERE NOT EXISTS (SELECT 1 FROM public.report_card_templates WHERE name = 'CBSE Term-Wise' AND school_code IS NULL);

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION update_report_card_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS report_card_templates_updated_at ON public.report_card_templates;
CREATE TRIGGER report_card_templates_updated_at
  BEFORE UPDATE ON public.report_card_templates
  FOR EACH ROW EXECUTE PROCEDURE update_report_card_templates_updated_at();
