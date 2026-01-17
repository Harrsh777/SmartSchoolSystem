import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// Get list of all tables with row counts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    const supabase = getServiceRoleClient();

    // Table list from SUPABASE_TABLES.md
    const tables = [
      { name: 'accepted_schools', category: 'Core', description: 'Approved/registered schools' },
      { name: 'school_signups', category: 'Core', description: 'School registration requests' },
      { name: 'rejected_schools', category: 'Core', description: 'Rejected school applications' },
      { name: 'students', category: 'Student Management', description: 'Student records' },
      { name: 'student_login', category: 'Student Management', description: 'Student login credentials' },
      { name: 'student_attendance', category: 'Student Management', description: 'Student attendance records' },
      { name: 'student_leave_requests', category: 'Student Management', description: 'Student leave applications' },
      { name: 'staff', category: 'Staff Management', description: 'Staff/employee records' },
      { name: 'staff_attendance', category: 'Staff Management', description: 'Staff attendance records' },
      { name: 'staff_leave_requests', category: 'Staff Management', description: 'Staff leave applications' },
      { name: 'classes', category: 'Academic Management', description: 'Class/section records' },
      { name: 'class_subjects', category: 'Academic Management', description: 'Subject assignments to classes' },
      { name: 'subjects', category: 'Academic Management', description: 'Subject master data' },
      { name: 'examinations', category: 'Academic Management', description: 'Examination records' },
      { name: 'exam_subjects', category: 'Academic Management', description: 'Subjects in examinations' },
      { name: 'exam_schedules', category: 'Academic Management', description: 'Examination schedules' },
      { name: 'student_subject_marks', category: 'Academic Management', description: 'Individual subject marks for students' },
      { name: 'student_exam_summary', category: 'Academic Management', description: 'Overall exam summary for students' },
      { name: 'library_books', category: 'Library Management', description: 'Book catalog' },
      { name: 'library_book_copies', category: 'Library Management', description: 'Individual book copies' },
      { name: 'library_sections', category: 'Library Management', description: 'Library sections/categories' },
      { name: 'library_material_types', category: 'Library Management', description: 'Material type classifications' },
      { name: 'library_transactions', category: 'Library Management', description: 'Book issue/return transactions' },
      { name: 'library_settings', category: 'Library Management', description: 'Library configuration settings' },
      { name: 'fees', category: 'Fee Management', description: 'Fee records (legacy)' },
      { name: 'fee_structures', category: 'Fee Management', description: 'Fee structure definitions' },
      { name: 'fee_structure_items', category: 'Fee Management', description: 'Items within fee structures' },
      { name: 'student_fees', category: 'Fee Management', description: 'Student fee assignments' },
      { name: 'payments', category: 'Fee Management', description: 'Payment transactions' },
      { name: 'payment_allocations', category: 'Fee Management', description: 'Payment allocation to fee items' },
      { name: 'fee_adjustments', category: 'Fee Management', description: 'Fee adjustments/discounts' },
      { name: 'fee_schedules', category: 'Fee Management', description: 'Fee payment schedules' },
      { name: 'fee_components', category: 'Fee Management', description: 'Fee component definitions' },
      { name: 'fee_discounts', category: 'Fee Management', description: 'Fee discount rules' },
      { name: 'fee_fines', category: 'Fee Management', description: 'Fee fine records' },
      { name: 'misc_fees', category: 'Fee Management', description: 'Miscellaneous fees' },
      { name: 'receipts', category: 'Fee Management', description: 'Payment receipts' },
      { name: 'income_entries', category: 'Financial Management', description: 'Income transactions' },
      { name: 'expense_entries', category: 'Financial Management', description: 'Expense transactions' },
      { name: 'salary_records', category: 'Financial Management', description: 'Staff salary records' },
      { name: 'financial_years', category: 'Financial Management', description: 'Financial year definitions' },
      { name: 'finance_audit_logs', category: 'Financial Management', description: 'Financial audit trail' },
      { name: 'audit_logs', category: 'Financial Management', description: 'General audit logs' },
      { name: 'transport_vehicles', category: 'Transport Management', description: 'Vehicle records' },
      { name: 'transport_routes', category: 'Transport Management', description: 'Transport route definitions' },
      { name: 'transport_route_stops', category: 'Transport Management', description: 'Stops on routes' },
      { name: 'transport_stops', category: 'Transport Management', description: 'Stop master data' },
      { name: 'timetable_slots', category: 'Timetable Management', description: 'Timetable period slots' },
      { name: 'timetable_period_groups', category: 'Timetable Management', description: 'Period group definitions' },
      { name: 'notices', category: 'Communication', description: 'School notices/announcements' },
      { name: 'leave_types', category: 'Leave Management', description: 'Leave type definitions' },
      { name: 'certificates', category: 'Certificate Management', description: 'Certificate records (legacy)' },
      { name: 'simple_certificates', category: 'Certificate Management', description: 'Simple certificate records' },
      { name: 'certificate_templates', category: 'Certificate Management', description: 'Certificate template designs' },
      { name: 'certificates_issued', category: 'Certificate Management', description: 'Issued certificates' },
      { name: 'certificate_fields', category: 'Certificate Management', description: 'Certificate field definitions' },
      { name: 'roles', category: 'RBAC', description: 'Role definitions' },
      { name: 'role_permissions', category: 'RBAC', description: 'Permissions assigned to roles' },
      { name: 'staff_roles', category: 'RBAC', description: 'Staff role assignments' },
      { name: 'staff_permissions', category: 'RBAC', description: 'Direct staff permissions' },
      { name: 'permission_categories', category: 'RBAC', description: 'Permission category groupings' },
      { name: 'gate_passes', category: 'Other Modules', description: 'Gate pass records' },
      { name: 'help_queries', category: 'Other Modules', description: 'Help/support queries' },
      { name: 'diaries', category: 'Other Modules', description: 'Diary/homework entries' },
      { name: 'diary_targets', category: 'Other Modules', description: 'Diary target classes/sections' },
      { name: 'diary_attachments', category: 'Other Modules', description: 'Diary file attachments' },
      { name: 'diary_reads', category: 'Other Modules', description: 'Diary read tracking' },
      { name: 'institute_houses', category: 'Other Modules', description: 'School house/group definitions' },
      { name: 'institute_working_days', category: 'Other Modules', description: 'Working day calendar' },
      { name: 'visitors', category: 'Other Modules', description: 'Visitor management records' },
      { name: 'events', category: 'Other Modules', description: 'Calendar events' },
      { name: 'event_notifications', category: 'Other Modules', description: 'Event notification records' },
      { name: 'academic_calendar', category: 'Other Modules', description: 'Academic calendar entries' },
      { name: 'gallery', category: 'Other Modules', description: 'Gallery image records' },
      { name: 'copy_checking', category: 'Other Modules', description: 'Copy checking/homework records' },
      { name: 'admin_employees', category: 'Admin Management', description: 'Admin employee records' },
      { name: 'employee_schools', category: 'Admin Management', description: 'Employee-school associations' },
      { name: 'exams', category: 'Admin Management', description: 'Exam records (legacy/admin view)' },
      { name: 'communications', category: 'Admin Management', description: 'Communication records' },
      { name: 'permissions', category: 'Admin Management', description: 'Permission definitions (RBAC)' },
      { name: 'timetable_subjects', category: 'Timetable Management', description: 'Subject assignments in timetable' },
      { name: 'timetable_periods', category: 'Timetable Management', description: 'Period definitions within groups' },
      { name: 'timetable_group_classes', category: 'Timetable Management', description: 'Class assignments to period groups' },
      { name: 'fee_assignments', category: 'Fee Management', description: 'Fee assignments to students' },
      { name: 'fee_installments', category: 'Fee Management', description: 'Fee installment records' },
      { name: 'fee_collections', category: 'Fee Management', description: 'Fee collection transactions' },
      { name: 'fee_collection_items', category: 'Fee Management', description: 'Items within fee collections' },
      { name: 'fee_configuration', category: 'Fee Management', description: 'Fee system configuration' },
      { name: 'fee_receipt_student_details', category: 'Fee Management', description: 'Receipt student detail configuration' },
      { name: 'academic_years', category: 'Fee Management', description: 'Academic year definitions' },
      { name: 'staff_photo_batches', category: 'Photo Management', description: 'Staff photo upload batches' },
      { name: 'staff_photos', category: 'Photo Management', description: 'Staff photo records' },
    ];

    // Get row counts for each table (optional, can be slow)
    const tablesWithCounts = await Promise.all(
      tables.map(async (table) => {
        try {
          let query = supabase.from(table.name).select('*', { count: 'exact', head: true });
          
          if (schoolCode && schoolCode !== 'all') {
            // Try to filter by school_code if the column exists
            query = query.eq('school_code', schoolCode);
          }

          const { count } = await query;
          return {
            ...table,
            rowCount: count || 0,
          };
        } catch {
          // If table doesn't exist or error, return 0
          return {
            ...table,
            rowCount: 0,
          };
        }
      })
    );

    return NextResponse.json({
      tables: tablesWithCounts,
      totalTables: tablesWithCounts.length,
    });
  } catch (error) {
    console.error('Error fetching tables list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables list', details: (error as Error).message },
      { status: 500 }
    );
  }
}
