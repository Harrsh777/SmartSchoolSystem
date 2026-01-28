import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// Define ALL modules and sub-modules based on DashboardLayout.tsx
// Order matches the order in DashboardLayout
const ALLOWED_MODULES_CONFIG = [
  {
    module_key: 'student_management',
    module_name: 'Student Management',
    order: 1,
    sub_modules: [
      { key: 'add_student', name: 'Add Student', route: '/dashboard/[school]/students/add' },
      { key: 'student_directory', name: 'Student Directory', route: '/dashboard/[school]/students/directory' },
      { key: 'student_attendance', name: 'Student Attendance', route: '/dashboard/[school]/students/attendance' },
      { key: 'mark_attendance', name: 'Mark Attendance', route: '/dashboard/[school]/students/mark-attendance' },
      { key: 'bulk_import_students', name: 'Bulk Import Students', route: '/dashboard/[school]/students/bulk-import' },
      { key: 'student_siblings', name: 'Student Siblings', route: '/dashboard/[school]/students/siblings' },
    ],
  },
  {
    module_key: 'fee_management',
    module_name: 'Fee Management',
    order: 2,
    sub_modules: [
      { key: 'fee_dashboard', name: 'Fee Dashboard', route: '/dashboard/[school]/fees/v2/dashboard' },
      { key: 'fee_heads', name: 'Fee Heads', route: '/dashboard/[school]/fees/v2/fee-heads' },
      { key: 'fee_structures', name: 'Fee Structures', route: '/dashboard/[school]/fees/v2/fee-structures' },
      { key: 'fee_collection', name: 'Collect Payment', route: '/dashboard/[school]/fees/v2/collection' },
      { key: 'fee_statements', name: 'Student Fee Statements', route: '/dashboard/[school]/fees/statements' },
      { key: 'discounts_fines', name: 'Discounts & Fines', route: '/dashboard/[school]/fees/discounts-fines' },
      { key: 'fee_reports', name: 'Fee Reports', route: '/dashboard/[school]/fees/reports' },
    ],
  },
  {
    module_key: 'staff_management',
    module_name: 'Staff Management',
    order: 3,
    sub_modules: [
      { key: 'staff_directory', name: 'Staff Directory', route: '/dashboard/[school]/staff/directory' },
      { key: 'add_staff', name: 'Add Staff', route: '/dashboard/[school]/staff/add' },
      { key: 'bulk_staff_import', name: 'Bulk Staff Import', route: '/dashboard/[school]/staff-management/bulk-import' },
      { key: 'bulk_photo_upload', name: 'Bulk Photo Upload', route: '/dashboard/[school]/staff-management/bulk-photo' },
      { key: 'staff_attendance', name: 'Staff Attendance', route: '/dashboard/[school]/staff-management/attendance' },
      { key: 'staff_attendance_report', name: 'Staff Attendance Marking Report', route: '/dashboard/[school]/staff-management/student-attendance-report' },
      { key: 'role_management', name: 'Role Management', route: '/dashboard/[school]/role-management' },
    ],
  },
  {
    module_key: 'classes',
    module_name: 'Classes',
    order: 4,
    sub_modules: [
      { key: 'classes_overview', name: 'Classes Overview', route: '/dashboard/[school]/classes/overview' },
      { key: 'modify_classes', name: 'Modify Classes', route: '/dashboard/[school]/classes/modify' },
      { key: 'subject_teachers', name: 'Subject Teachers', route: '/dashboard/[school]/classes/subject-teachers' },
      { key: 'add_modify_subjects', name: 'Add/Modify Subjects', route: '/dashboard/[school]/classes/subjects' },
    ],
  },
  {
    module_key: 'timetable',
    module_name: 'Timetable',
    order: 5,
    sub_modules: [
      { key: 'class_timetable', name: 'Class Timetable', route: '/dashboard/[school]/timetable/class' },
      { key: 'teacher_timetable', name: 'Teacher Timetable', route: '/dashboard/[school]/timetable/teacher' },
      { key: 'group_wise_timetable', name: 'Group Wise Timetable', route: '/dashboard/[school]/timetable/group-wise' },
    ],
  },
  {
    module_key: 'event_calendar',
    module_name: 'Event/Calendar',
    order: 6,
    sub_modules: [
      { key: 'academic_calendar', name: 'Academic Calendar', route: '/dashboard/[school]/calendar/academic' },
      { key: 'events', name: 'Events', route: '/dashboard/[school]/calendar/events' },
    ],
  },
  {
    module_key: 'examination',
    module_name: 'Examination',
    order: 7,
    sub_modules: [
      { key: 'examination_dashboard', name: 'Examination Dashboard', route: '/dashboard/[school]/examinations/dashboard' },
      { key: 'create_examination', name: 'Create Examination', route: '/dashboard/[school]/examinations/create' },
      { key: 'grade_scale', name: 'Grade Scale', route: '/dashboard/[school]/examinations/grade-scale' },
      { key: 'report_card', name: 'Report Card', route: '/dashboard/[school]/examinations/report-card' },
      { key: 'examination_reports', name: 'Examination Reports', route: '/dashboard/[school]/examinations/reports' },
    ],
  },
  {
    module_key: 'marks',
    module_name: 'Marks',
    order: 8,
    sub_modules: [
      { key: 'marks_dashboard', name: 'Marks Dashboard', route: '/dashboard/[school]/marks' },
      { key: 'marks_entry', name: 'Mark Entry', route: '/dashboard/[school]/marks-entry' },
    ],
  },
  {
    module_key: 'library',
    module_name: 'Library',
    order: 9,
    sub_modules: [
      { key: 'library_dashboard', name: 'Library Dashboard', route: '/dashboard/[school]/library/dashboard' },
      { key: 'library_basics', name: 'Library Basics', route: '/dashboard/[school]/library/basics' },
      { key: 'library_catalogue', name: 'Library Catalogue', route: '/dashboard/[school]/library/catalogue' },
      { key: 'library_transactions', name: 'Library Transactions', route: '/dashboard/[school]/library/transactions' },
    ],
  },
  {
    module_key: 'transport',
    module_name: 'Transport',
    order: 10,
    sub_modules: [
      { key: 'transport_dashboard', name: 'Transport Dashboard', route: '/dashboard/[school]/transport/dashboard' },
      { key: 'vehicles', name: 'Vehicles', route: '/dashboard/[school]/transport/vehicles' },
      { key: 'stops', name: 'Stops', route: '/dashboard/[school]/transport/stops' },
      { key: 'routes', name: 'Routes', route: '/dashboard/[school]/transport/routes' },
      { key: 'student_route_mapping', name: 'Student Route Mapping', route: '/dashboard/[school]/transport/route-students' },
    ],
  },
  {
    module_key: 'leave_management',
    module_name: 'Leave Management',
    order: 11,
    sub_modules: [
      { key: 'leave_dashboard', name: 'Leave Dashboard', route: '/dashboard/[school]/leave/dashboard' },
      { key: 'student_leave', name: 'Student Leave', route: '/dashboard/[school]/leave/student-leave' },
      { key: 'staff_leave', name: 'Staff Leave', route: '/dashboard/[school]/leave/staff-leave' },
      { key: 'leave_basics', name: 'Leave Basics', route: '/dashboard/[school]/leave/basics' },
    ],
  },
  {
    module_key: 'communication',
    module_name: 'Communication',
    order: 12,
    sub_modules: [
      { key: 'communication_main', name: 'Communication', route: '/dashboard/[school]/communication' },
    ],
  },
  {
    module_key: 'reports',
    module_name: 'Report',
    order: 13,
    sub_modules: [
      { key: 'reports_main', name: 'Report', route: '/dashboard/[school]/reports' },
    ],
  },
  {
    module_key: 'gallery',
    module_name: 'Gallery',
    order: 14,
    sub_modules: [
      { key: 'gallery_main', name: 'Gallery', route: '/dashboard/[school]/gallery' },
    ],
  },
  {
    module_key: 'certificate_management',
    module_name: 'Certificate Management',
    order: 15,
    sub_modules: [
      { key: 'certificate_dashboard', name: 'Certificate Dashboard', route: '/dashboard/[school]/certificates/dashboard' },
      { key: 'new_certificate', name: 'New Certificate', route: '/dashboard/[school]/certificates/new' },
    ],
  },
  {
    module_key: 'digital_diary',
    module_name: 'Digital Diary',
    order: 16,
    sub_modules: [
      { key: 'digital_diary_main', name: 'Digital Diary', route: '/dashboard/[school]/homework' },
    ],
  },
  {
    module_key: 'expense_income',
    module_name: 'Expense/Income',
    order: 17,
    sub_modules: [
      { key: 'expense_income_main', name: 'Expense/Income', route: '/dashboard/[school]/expense-income' },
    ],
  },
  {
    module_key: 'front_office',
    module_name: 'Front Office Management',
    order: 18,
    sub_modules: [
      { key: 'front_office_dashboard', name: 'Front Office Dashboard', route: '/dashboard/[school]/front-office' },
      { key: 'gate_pass', name: 'Gate Pass', route: '/dashboard/[school]/gate-pass' },
      { key: 'visitor_management', name: 'Visitor Management', route: '/dashboard/[school]/visitor-management' },
    ],
  },
  {
    module_key: 'copy_checking',
    module_name: 'Copy Checking',
    order: 19,
    sub_modules: [
      { key: 'copy_checking_main', name: 'Copy Checking', route: '/dashboard/[school]/copy-checking' },
    ],
  },
  {
    module_key: 'attendance',
    module_name: 'Attendance',
    order: 20,
    sub_modules: [
      { key: 'attendance_staff', name: 'Staff Attendance', route: '/dashboard/[school]/attendance/staff' },
    ],
  },
];

// GET /api/modules - Get all modules with sub-modules and categories
export async function GET() {
  try {
    const supabase = getServiceRoleClient();

    // Get all module keys from config
    const allowedModuleKeys = ALLOWED_MODULES_CONFIG.map(m => m.module_key);
    
    // First, get all modules (even without sub-modules)
    const { data: allModules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .in('module_key', allowedModuleKeys);

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules', details: modulesError.message },
        { status: 500 }
      );
    }

    // Then, get all sub-modules with categories for these modules
    const moduleIds = (allModules || []).map((m: Record<string, unknown>) => m.id as string);
    let subModules: Record<string, unknown>[] = [];
    if (moduleIds.length > 0) {
      const { data: subModulesData, error: subModulesError } = await supabase
        .from('sub_modules')
        .select(`
          *,
          permission_categories(*)
        `)
        .eq('is_active', true)
        .in('module_id', moduleIds);

      if (subModulesError) {
        console.error('Error fetching sub-modules:', subModulesError);
        // Continue even if sub-modules fail - we'll show placeholders
      } else {
        subModules = subModulesData || [];
      }
    }

    // Group sub-modules by module_id
    const subModulesByModuleId = new Map<string, Record<string, unknown>[]>();
    (subModules || []).forEach((sm: Record<string, unknown>) => {
      const moduleId = String(sm.module_id);
      if (!subModulesByModuleId.has(moduleId)) {
        subModulesByModuleId.set(moduleId, []);
      }
      subModulesByModuleId.get(moduleId)!.push(sm);
    });

    // Combine modules with their sub-modules
    const modules = (allModules || []).map((modItem: Record<string, unknown>) => ({
      ...modItem,
      sub_modules: subModulesByModuleId.get(modItem.id as string) || [],
    }));

    // Process modules in the exact order from ALLOWED_MODULES_CONFIG
    const processedModules = ALLOWED_MODULES_CONFIG
      .map((config) => {
        // Find the module in the database
        const modRecord = (modules || []).find((m: Record<string, unknown>) => m.module_key === config.module_key);
        if (!modRecord) return null;

        // Get allowed sub-module keys for this module
        const allowedSubModuleKeys = config.sub_modules.map(sm => sm.key);

        // Deduplicate sub-modules by sub_module_key and filter by allowed
        const subModuleMap = new Map<string, Record<string, unknown>>();
        ((modRecord.sub_modules as Record<string, unknown>[]) || []).forEach((subModule: Record<string, unknown>) => {
          const key = (subModule.sub_module_key as string) || (subModule.id as string);
          // Only process allowed sub-modules
          if (!allowedSubModuleKeys.includes(key)) {
            return;
          }
          if (!subModuleMap.has(key)) {
            subModuleMap.set(key, subModule);
          } else {
            // If duplicate sub-module found, merge categories
            const existing = subModuleMap.get(key)!;
            const categories = (existing.permission_categories as unknown[]) || [];
            const newCats = (subModule.permission_categories as unknown[]) || [];
            if (newCats.length > 0) {
              existing.permission_categories = categories.concat(newCats);
            }
          }
        });

        // Build sub-modules in the exact order from config
        // Only include sub-modules that exist in the database
        const orderedSubModules = config.sub_modules
          .map((configSubModule) => {
            const subModule = subModuleMap.get(configSubModule.key);
            
            // Skip if sub-module doesn't exist in DB
            if (!subModule) {
              return null;
            }

            // Deduplicate permission categories by category_key
            const categoryMap = new Map<string, Record<string, unknown>>();
            ((subModule.permission_categories as Record<string, unknown>[]) || []).forEach((category: Record<string, unknown>) => {
              const catKey = (category.category_key as string) || (category.id as string);
              if (!categoryMap.has(catKey)) {
                categoryMap.set(catKey, category);
              }
            });

            // Ensure we have at least view and edit categories
            const categories = Array.from(categoryMap.values());
            const hasView = categories.some((c: Record<string, unknown>) => (c.category_key as string) === 'view');
            const hasEdit = categories.some((c: Record<string, unknown>) => (c.category_key as string) === 'edit');

            if (!hasView) {
              categories.push({
                id: `placeholder-view-${subModule.id}`,
                category_key: 'view',
                category_name: 'View',
                category_type: 'view',
                display_order: 1,
              });
            }
            if (!hasEdit) {
              categories.push({
                id: `placeholder-edit-${subModule.id}`,
                category_key: 'edit',
                category_name: 'Edit',
                category_type: 'edit',
                display_order: 2,
              });
            }

            return {
              ...subModule,
              sub_module_name: configSubModule.name, // Use standardized name
              route_path: configSubModule.route, // Use standardized route
              permission_categories: categories
                .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
                  ((a.display_order as number) || 0) - ((b.display_order as number) || 0)
                ),
            };
          });

        // Return module even if it has no sub-modules (they'll be placeholders)
        return {
          ...modRecord,
          module_name: config.module_name, // Use standardized name
          sub_modules: orderedSubModules,
        };
      })
      .filter((mod: Record<string, unknown> | null) => mod !== null);

    return NextResponse.json({ data: processedModules }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
