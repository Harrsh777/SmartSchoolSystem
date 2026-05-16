import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import {
  classSectionCacheKey,
  fetchAllClassFeeLinesBySectionKey,
} from '@/lib/fees/class-fee-line-adjustments';
import { applyBulkAdjustments, type BulkApplyBody } from '@/lib/fees/bulk-adjustment-apply';
import type { BulkChargeType, BulkValueMode } from '@/lib/fees/bulk-adjustment-math';

/**
 * POST /api/v2/fees/discounts-fines/apply
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const body = await request.json();
    const {
      school_code,
      class_name,
      section,
      student_ids,
      fee_structure_id,
      due_months,
      charge_type,
      value_mode,
      value,
      label,
    } = body;

    if (!school_code || !class_name || !section) {
      return NextResponse.json({ error: 'school_code, class_name, and section are required' }, { status: 400 });
    }

    const validTypes: BulkChargeType[] = ['discount', 'fine', 'additional_charge'];
    if (!validTypes.includes(charge_type)) {
      return NextResponse.json({ error: 'Invalid charge_type' }, { status: 400 });
    }
    if (value_mode !== 'absolute' && value_mode !== 'percent') {
      return NextResponse.json({ error: 'value_mode must be absolute or percent' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = String(school_code).toUpperCase();

    const staffId = request.headers.get('x-staff-id');
    let createdBy: string | null = null;
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', code)
        .eq('staff_id', staffId)
        .single();
      createdBy = staff?.id || null;
    }

    const classLinesMap = await fetchAllClassFeeLinesBySectionKey(supabase, code);
    const sectionKey = classSectionCacheKey(String(class_name), String(section));
    const classLines = classLinesMap.get(sectionKey) ?? [];

    const applyBody: BulkApplyBody = {
      school_code: code,
      student_ids: Array.isArray(student_ids) ? student_ids.map(String) : [],
      fee_structure_id: String(fee_structure_id),
      due_months: Array.isArray(due_months) ? due_months.map(String) : [],
      charge_type: charge_type as BulkChargeType,
      value_mode: value_mode as BulkValueMode,
      value: Number(value),
      label: label != null ? String(label) : undefined,
    };

    const result = await applyBulkAdjustments(supabase, applyBody, createdBy, classLines);

    if (result.errors.length > 0 && result.applied === 0) {
      return NextResponse.json(
        { error: result.errors.join('; '), data: result },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        structure_name: result.structure_name,
        applied: result.applied,
        skipped: result.skipped,
        rows: result.rows,
      },
    });
  } catch (e) {
    console.error('POST discounts-fines/apply', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
