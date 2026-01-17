import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// Valid table names from SUPABASE_TABLES.md
const VALID_TABLES = [
  'accepted_schools',
  'school_signups',
  'rejected_schools',
  'students',
  'student_login',
  'student_attendance',
  'student_leave_requests',
  'staff',
  'staff_attendance',
  'staff_leave_requests',
  'classes',
  'class_subjects',
  'subjects',
  'examinations',
  'exam_subjects',
  'exam_schedules',
  'student_subject_marks',
  'student_exam_summary',
  'library_books',
  'library_book_copies',
  'library_sections',
  'library_material_types',
  'library_transactions',
  'library_settings',
  'fees',
  'fee_structures',
  'fee_structure_items',
  'student_fees',
  'payments',
  'payment_allocations',
  'fee_adjustments',
  'fee_schedules',
  'fee_components',
  'fee_discounts',
  'fee_fines',
  'misc_fees',
  'receipts',
  'income_entries',
  'expense_entries',
  'salary_records',
  'financial_years',
  'finance_audit_logs',
  'audit_logs',
  'transport_vehicles',
  'transport_routes',
  'transport_route_stops',
  'transport_stops',
  'timetable_slots',
  'timetable_period_groups',
  'notices',
  'leave_types',
  'certificates',
  'simple_certificates',
  'certificate_templates',
  'certificates_issued',
  'certificate_fields',
  'roles',
  'role_permissions',
  'staff_roles',
  'staff_permissions',
  'permission_categories',
  'gate_passes',
  'help_queries',
  'diaries',
  'diary_targets',
  'diary_attachments',
  'diary_reads',
  'institute_houses',
  'institute_working_days',
  'visitors',
  'events',
  'event_notifications',
  'academic_calendar',
  'gallery',
  'copy_checking',
  'admin_employees',
  'employee_schools',
  'exams',
  'communications',
  'permissions',
  'timetable_subjects',
  'timetable_periods',
  'timetable_group_classes',
  'fee_assignments',
  'fee_installments',
  'fee_collections',
  'fee_collection_items',
  'fee_configuration',
  'fee_receipt_student_details',
  'academic_years',
  'staff_photo_batches',
  'staff_photos',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await params;
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Validate table name
    if (!VALID_TABLES.includes(tableName as typeof VALID_TABLES[number])) {
      return NextResponse.json(
        { error: `Invalid table name: ${tableName}` },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Build query
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // Apply school_code filter if table has this column
    if (schoolCode && schoolCode !== 'all') {
      query = query.eq('school_code', schoolCode);
    }

    // Apply search if provided (search in common text fields)
    if (search && search.trim()) {
      // Try to search in common columns (this is a best-effort approach)
      // For production, you might want table-specific search logic
      const searchLower = search.toLowerCase();
      // Use ilike for case-insensitive search on text columns
      // Note: This is a simplified approach. For better results, specify columns per table.
      query = query.or(`name.ilike.%${searchLower}%,title.ilike.%${searchLower}%,email.ilike.%${searchLower}%,full_name.ilike.%${searchLower}%,student_name.ilike.%${searchLower}%,school_name.ilike.%${searchLower}%`);
    }

    // Apply pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return NextResponse.json(
        { error: `Failed to fetch data from ${tableName}`, details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error(`Error in GET /api/admin/tables/${tableName}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
