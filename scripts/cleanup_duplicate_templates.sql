-- ============================================================================
-- CLEANUP DUPLICATE REPORT CARD TEMPLATES
-- Run this in Supabase SQL Editor to remove duplicate templates
-- ============================================================================

-- Delete duplicate system templates (keep only the oldest one by created_at for each name)
DELETE FROM public.report_card_templates 
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id 
  FROM public.report_card_templates 
  WHERE school_code IS NULL AND is_system = TRUE
  ORDER BY name, created_at ASC
) AND school_code IS NULL AND is_system = TRUE;

-- Delete duplicate school-specific templates (keep only the oldest one for each school+name)
DELETE FROM public.report_card_templates 
WHERE id NOT IN (
  SELECT DISTINCT ON (school_code, name) id 
  FROM public.report_card_templates 
  WHERE school_code IS NOT NULL
  ORDER BY school_code, name, created_at ASC
) AND school_code IS NOT NULL;

-- Verify results
SELECT name, COUNT(*) as count 
FROM public.report_card_templates 
WHERE is_active = true 
GROUP BY name 
ORDER BY count DESC;
