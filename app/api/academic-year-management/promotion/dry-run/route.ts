import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface PromotionRuleRow {
  from_class: string;
  to_class?: string;
  on_pass?: string;
  on_fail?: string;
  final_class?: string;
}

/**
 * POST /api/academic-year-management/promotion/dry-run
 * Body: { school_code, from_year, to_year }
 * Returns proposed actions per student (from students table filtered by academic_year = from_year).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, from_year, to_year } = body;

    if (!school_code || !from_year || !to_year) {
      return NextResponse.json(
        { error: 'school_code, from_year, and to_year are required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section, academic_year')
      .eq('school_code', school_code)
      .eq('academic_year', from_year)
      .eq('status', 'active');

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    const list = students || [];

    const { data: rules } = await supabase
      .from('promotion_rules')
      .select('*')
      .eq('school_code', school_code);

    const rulesMap = new Map<string, PromotionRuleRow>(
      (rules || []).map((r: PromotionRuleRow) => [r.from_class, r])
    );

    const proposed: Array<{
      student_id: string;
      admission_no: string | null;
      student_name: string | null;
      current_class: string;
      current_section: string;
      action: 'promote' | 'detain' | 'graduate' | 'transfer';
      target_class: string | null;
      target_section: string | null;
      roll_no: string | null;
    }> = [];

    for (const s of list) {
      const fromClass = (s.class || '').toString().trim();
      const rule = rulesMap.get(fromClass);
      const toClass = rule?.to_class ?? (fromClass ? String(parseInt(fromClass, 10) + 1) : '');
      const toSection = (s.section || '').toString();

      let action: 'promote' | 'detain' | 'graduate' | 'transfer' = 'promote';
      let targetClass: string | null = toClass;
      let targetSection: string | null = toSection;

      if (rule) {
        action = (rule.on_pass as 'promote' | 'detain' | 'graduate' | 'transfer') || 'promote';
        if (action === 'graduate') {
          targetClass = null;
          targetSection = null;
        } else if (action === 'promote') {
          targetClass = rule.to_class ?? toClass;
          targetSection = toSection;
        }
      }

      proposed.push({
        student_id: s.id,
        admission_no: s.admission_no ?? null,
        student_name: s.student_name ?? null,
        current_class: fromClass,
        current_section: toSection,
        action,
        target_class: targetClass,
        target_section: targetSection,
        roll_no: null,
      });
    }

    return NextResponse.json({
      data: {
        from_year,
        to_year,
        total: proposed.length,
        proposed,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Promotion dry-run error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
