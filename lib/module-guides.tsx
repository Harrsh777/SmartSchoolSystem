import React from 'react';
import { 
  Building2, 
  Shield, 
  Key, 
  UserCheck, 
  BookOpen, 
  Users, 
  CalendarDays, 
  FileText, 
  GraduationCap, 
  IndianRupee, 
  Library, 
  Bus, 
  MessageSquare, 
  FileBarChart, 
  Image, 
  Award, 
  BookMarked, 
  TrendingUp, 
  DoorOpen,
  ClipboardList,
  Plus,
  Folder,
  Search,
  CheckCircle,
  Settings,
  ArrowRight,
  Clock,
  Send,
} from 'lucide-react';

export interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
  details?: string[];
  icon?: React.ReactNode;
}

export interface ModuleGuide {
  moduleName: string;
  moduleIcon: React.ReactNode;
  description: string;
  steps: GuideStep[];
}

export const moduleGuides: Record<string, ModuleGuide> = {
  'home': {
    moduleName: 'Home Dashboard',
    moduleIcon: <Building2 size={32} />,
    description: 'Learn how to navigate and use the main dashboard',
    steps: [
      {
        stepNumber: 1,
        title: 'Welcome to Your Dashboard',
        description: 'This is your central hub for managing all school operations.',
        details: [
          'View quick statistics and overview cards',
          'Access quick action buttons for common tasks',
          'Navigate to different modules from the sidebar',
        ],
        icon: <Building2 size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Quick Actions',
        description: 'Use the quick action buttons for frequently performed tasks.',
        details: [
          'Student-wise Fee: Quickly access fee management',
          'Create Diary: Add homework assignments',
          'Notice / Circular: Send announcements',
          'Post An Event: Add calendar events',
        ],
        icon: <ArrowRight size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Module Navigation',
        description: 'Access all modules from the sidebar menu.',
        details: [
          'Click on any module to open it',
          'Modules with submenus will expand on click',
          'Use the search function to quickly find modules',
        ],
        icon: <Search size={20} />,
      },
    ],
  },

  'institute-info': {
    moduleName: 'Institute Info',
    moduleIcon: <Building2 size={32} />,
    description: 'Configure your school/institute basic information',
    steps: [
      {
        stepNumber: 1,
        title: 'Access Institute Info',
        description: 'Navigate to Institute Info from the sidebar menu.',
        icon: <Building2 size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Fill Basic Information',
        description: 'Enter your school\'s basic details.',
        details: [
          'School Name: Enter the full name of your institution',
          'School Address: Provide complete address',
          'Contact Information: Add phone and email',
          'Principal Details: Enter principal name and contact',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Save Configuration',
        description: 'Click the Save button to store your institute information.',
        details: [
          'All information will be saved permanently',
          'You can edit this information anytime',
          'This information will be used across the system',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'password': {
    moduleName: 'Password Manager',
    moduleIcon: <Key size={32} />,
    description: 'Manage passwords for students and staff',
    steps: [
      {
        stepNumber: 1,
        title: 'Access Password Manager',
        description: 'Navigate to Password Manager from the sidebar.',
        icon: <Key size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Generate Passwords',
        description: 'Generate passwords for users who don\'t have one.',
        details: [
          'Select the user type (Students, Staff, or All)',
          'Click Generate Passwords button',
          'System will create secure passwords automatically',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View and Reset',
        description: 'View existing passwords and reset when needed.',
        details: [
          'Search for specific users',
          'View their current password status',
          'Reset passwords for individual users if needed',
        ],
        icon: <Search size={20} />,
      },
    ],
  },

  'staff-management': {
    moduleName: 'Staff Management',
    moduleIcon: <UserCheck size={32} />,
    description: 'Manage all staff members and their information',
    steps: [
      {
        stepNumber: 1,
        title: 'Add Staff Members',
        description: 'Start by adding staff members to the system.',
        details: [
          'Click "Add Staff" from the Staff Management menu',
          'Fill in personal details (name, email, phone)',
          'Assign staff ID and role',
          'Upload staff photo if available',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Bulk Import Staff',
        description: 'Import multiple staff members at once using Excel.',
        details: [
          'Download the staff template Excel file',
          'Fill in all staff information',
          'Upload the completed file',
          'Review and confirm imported staff',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Manage Staff Directory',
        description: 'View, edit, and manage all staff members.',
        details: [
          'Browse through staff directory',
          'Search and filter staff by department or role',
          'Edit staff information as needed',
          'Manage staff attendance and leaves',
        ],
        icon: <Users size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Assign Roles and Permissions',
        description: 'Configure what each staff member can access.',
        details: [
          'Navigate to Staff Access Control',
          'Assign appropriate roles to staff',
          'Set module-level permissions',
          'Review and approve access requests',
        ],
        icon: <Shield size={20} />,
      },
    ],
  },

  'classes': {
    moduleName: 'Classes',
    moduleIcon: <BookOpen size={32} />,
    description: 'Create and manage classes, sections, and subjects',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Classes',
        description: 'Set up your class structure.',
        details: [
          'Navigate to Classes Overview',
          'Click "Add Class" button',
          'Enter class name (e.g., 1, 2, 3 or Grade 1, Grade 2)',
          'Add sections (A, B, C, etc.)',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Add Subjects',
        description: 'Configure subjects for each class.',
        details: [
          'Go to "Add/Modify Subjects"',
          'Select a class',
          'Add subjects with colors for identification',
          'Assign subject teachers',
        ],
        icon: <BookOpen size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Assign Class Teachers',
        description: 'Assign class teachers to each section.',
        details: [
          'Navigate to "Subject Teachers" or modify class',
          'Select class and section',
          'Assign a class teacher from staff list',
          'Assign subject-specific teachers',
        ],
        icon: <UserCheck size={20} />,
      },
      {
        stepNumber: 4,
        title: 'View Class Overview',
        description: 'Monitor class details and student distribution.',
        details: [
          'View all created classes and sections',
          'Check student count per class',
          'See assigned teachers',
          'Monitor class performance metrics',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'students': {
    moduleName: 'Student Management',
    moduleIcon: <Users size={32} />,
    description: 'Manage student enrollment and information',
    steps: [
      {
        stepNumber: 1,
        title: 'Add Individual Students',
        description: 'Add students one by one through the form.',
        details: [
          'Click "Add Student" from Student Management menu',
          'Fill in personal information (name, DOB, gender, etc.)',
          'Select class and section',
          'Enter admission number and roll number',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Bulk Import Students',
        description: 'Import multiple students using Excel template.',
        details: [
          'Download the student import template',
          'Fill in student details in Excel format',
          'Upload the completed file',
          'Review and confirm imported students',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Bulk Photo Upload',
        description: 'Upload student photos in bulk.',
        details: [
          'Prepare photos named with admission numbers',
          'Upload zip file containing all photos',
          'System will match photos to students automatically',
        ],
        // eslint-disable-next-line jsx-a11y/alt-text
        icon: <Image size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Manage Student Directory',
        description: 'View, search, and manage all students.',
        details: [
          'Browse student directory',
          'Search by name, admission number, or roll number',
          'Filter by class, section, or status',
          'Edit student information as needed',
        ],
        icon: <Search size={20} />,
      },
    ],
  },

  'timetable': {
    moduleName: 'Timetable',
    moduleIcon: <CalendarDays size={32} />,
    description: 'Create and manage class and teacher timetables',
    steps: [
      {
        stepNumber: 1,
        title: 'Set Up Time Periods',
        description: 'Define your school\'s daily time periods.',
        details: [
          'Go to Timetable settings',
          'Define start and end times for each period',
          'Set break times and lunch periods',
          'Configure number of periods per day',
        ],
        icon: <Clock size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Create Class Timetable',
        description: 'Assign subjects to time slots for each class.',
        details: [
          'Select class and section',
          'Choose day of the week',
          'Assign subjects to each period',
          'Ensure no conflicts with teacher availability',
        ],
        icon: <BookOpen size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View Teacher Timetable',
        description: 'Check each teacher\'s schedule.',
        details: [
          'Select a teacher from the list',
          'View their complete weekly schedule',
          'Identify free periods',
          'Ensure balanced workload distribution',
        ],
        icon: <UserCheck size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Group Wise Timetable',
        description: 'Create timetables for special groups.',
        details: [
          'Define groups (e.g., sports, arts)',
          'Assign activities to time slots',
          'Manage group-specific schedules',
        ],
        icon: <Users size={20} />,
      },
    ],
  },

  'calendar': {
    moduleName: 'Event/Calendar',
    moduleIcon: <CalendarDays size={32} />,
    description: 'Manage academic calendar and school events',
    steps: [
      {
        stepNumber: 1,
        title: 'Set Academic Calendar',
        description: 'Configure your academic year calendar.',
        details: [
          'Define academic year start and end dates',
          'Mark holidays and special dates',
          'Set examination periods',
          'Configure term/semester breaks',
        ],
        icon: <CalendarDays size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Create Events',
        description: 'Add school events and activities.',
        details: [
          'Click "Post An Event" from quick actions',
          'Enter event title and description',
          'Set event date and time',
          'Choose event category and color coding',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Manage Events',
        description: 'View and edit all calendar events.',
        details: [
          'Browse the calendar view',
          'Filter events by category',
          'Edit or delete events as needed',
          'Send event notifications to students/staff',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'examinations': {
    moduleName: 'Examinations',
    moduleIcon: <FileText size={32} />,
    description: 'Create examinations and manage exam schedules',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Examination',
        description: 'Set up a new examination.',
        details: [
          'Navigate to "Create Examination"',
          'Enter examination name and type',
          'Select academic year and class',
          'Set examination start and end dates',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Add Subjects to Exam',
        description: 'Configure subjects and marking scheme.',
        details: [
          'Select subjects for the examination',
          'Set maximum marks for each subject',
          'Configure passing marks (default 40%)',
          'Add subject-specific instructions if any',
        ],
        icon: <BookOpen size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Create Exam Schedule',
        description: 'Set up detailed exam timetable.',
        details: [
          'Click on the examination',
          'Go to Exam Schedule',
          'Assign date, time, and venue for each subject',
          'Ensure no overlapping schedules',
        ],
        icon: <CalendarDays size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Enter Marks',
        description: 'Enter student marks for the examination.',
        details: [
          'Navigate to Marks Entry module',
          'Select class, section, and examination',
          'Enter marks for each student and subject',
          'Save as draft or submit for review',
        ],
        icon: <ClipboardList size={20} />,
      },
      {
        stepNumber: 5,
        title: 'Review and Approve',
        description: 'Review submitted marks before finalizing.',
        details: [
          'Go to Marks Approval module',
          'Review marks submitted by teachers',
          'Approve or request corrections',
          'Once approved, marks are finalized',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'marks': {
    moduleName: 'Marks Management',
    moduleIcon: <GraduationCap size={32} />,
    description: 'Enter, view, and manage student examination marks',
    steps: [
      {
        stepNumber: 1,
        title: 'Enter Marks',
        description: 'Enter marks for students in examinations.',
        details: [
          'Navigate to Marks Entry',
          'Select class, section, and examination',
          'Enter marks for each subject',
          'System automatically calculates percentage, grade, and pass/fail status',
        ],
        icon: <ClipboardList size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Save or Submit',
        description: 'Save marks as draft or submit for review.',
        details: [
          'Click "Save Draft" to save incomplete marks',
          'Click "Submit for Review" when all marks are entered',
          'Submitted marks need approval before finalization',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View Marks Dashboard',
        description: 'Analyze and view all student marks.',
        details: [
          'Filter marks by examination, class, or subject',
          'View analytics (pass rate, average percentage)',
          'See grade distribution charts',
          'Download marks in Excel format',
        ],
        icon: <FileBarChart size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Generate Report Cards',
        description: 'Create and download student report cards.',
        details: [
          'Filter marks by examination and class',
          'Click "Download Report Card" for individual students',
          'Use "Download All Report Cards" for bulk generation',
          'Report cards are generated in PDF format',
        ],
        icon: <Award size={20} />,
      },
    ],
  },

  'marks-entry': {
    moduleName: 'Marks Entry',
    moduleIcon: <ClipboardList size={32} />,
    description: 'Enter and manage examination marks for students',
    steps: [
      {
        stepNumber: 1,
        title: 'Select Class and Section',
        description: 'Choose the class and section for marks entry.',
        details: [
          'Select class from the dropdown (e.g., 10, 11, 12)',
          'Select section from the dropdown (e.g., A, B, C)',
          'Section options depend on the selected class',
        ],
        icon: <BookOpen size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Select Examination',
        description: 'Choose the examination for which you want to enter marks.',
        details: [
          'Examination dropdown appears after selecting class and section',
          'Select the appropriate examination from the list',
          'Only examinations configured for this class will appear',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Enter Marks',
        description: 'Enter marks for each student and subject.',
        details: [
          'The system automatically loads all students in the selected class-section',
          'Enter marks for each subject in the table',
          'Marks can be entered as decimal numbers (e.g., 85.5)',
          'System automatically calculates percentage, grade, and pass/fail status as you type',
        ],
        icon: <ClipboardList size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Save or Submit',
        description: 'Save marks as draft or submit for review.',
        details: [
          'Click "Save Draft" to save incomplete marks (can be edited later)',
          'Click "Submit" when all marks are entered (requires all fields to be filled)',
          'Submitted marks need approval before finalization',
          'You can continue editing draft marks anytime',
        ],
        icon: <Send size={20} />,
      },
      {
        stepNumber: 5,
        title: 'View Totals and Grades',
        description: 'Monitor student performance in real-time.',
        details: [
          'Toggle "Show Totals" to view total marks, percentage, grade, and pass/fail status',
          'Totals are calculated automatically as you enter marks',
          'Use search to quickly find specific students',
          'Color-coded marks indicate pass/fail status',
        ],
        icon: <TrendingUp size={20} />,
      },
    ],
  },

  'fees': {
    moduleName: 'Fees Management',
    moduleIcon: <IndianRupee size={32} />,
    description: 'Manage fee structure and fee collections',
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Fee Structure',
        description: 'Set up fee types and amounts.',
        details: [
          'Navigate to Fee Configuration',
          'Define fee types (tuition, library, transport, etc.)',
          'Set fee amounts per class',
          'Configure due dates and late fees',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Collect Fees',
        description: 'Record fee payments from students.',
        details: [
          'Go to Fee Collection',
          'Select student or search by admission number',
          'Select fee type and enter payment amount',
          'Record payment method and receipt number',
        ],
        icon: <IndianRupee size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View Fee Reports',
        description: 'Generate fee-related reports and analytics.',
        details: [
          'View fee collection summary',
          'Check pending fees by class or student',
          'Generate receipts and invoices',
          'Export fee data to Excel',
        ],
        icon: <FileBarChart size={20} />,
      },
    ],
  },

  'library': {
    moduleName: 'Library Management',
    moduleIcon: <Library size={32} />,
    description: 'Manage library resources, books, and transactions',
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Library Settings',
        description: 'Set up library rules and configurations.',
        details: [
          'Navigate to Library Basics',
          'Configure issue rules (books per member, issue period)',
          'Set fine amounts for late returns',
          'Create library sections (e.g., Reference, Fiction)',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Add Books to Catalogue',
        description: 'Add books to your library inventory.',
        details: [
          'Go to Catalogue',
          'Click "Add Book"',
          'Enter book details (title, author, ISBN, etc.)',
          'Specify book section and material type',
          'Set total number of copies',
        ],
        icon: <BookOpen size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Issue Books',
        description: 'Issue books to students and staff.',
        details: [
          'Navigate to Transactions',
          'Select borrower (student or staff)',
          'Select book from available copies',
          'Set issue date and due date',
          'Confirm issue transaction',
        ],
        icon: <ArrowRight size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Return Books',
        description: 'Process book returns and manage fines.',
        details: [
          'Select transaction from issued books list',
          'Check for late returns and calculate fines',
          'Process return and update book availability',
          'Record payment of fines if applicable',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'transport': {
    moduleName: 'Transport Management',
    moduleIcon: <Bus size={32} />,
    description: 'Manage school transport, vehicles, routes, and student assignments',
    steps: [
      {
        stepNumber: 1,
        title: 'Add Vehicles',
        description: 'Register vehicles in your transport fleet.',
        details: [
          'Navigate to Vehicles',
          'Click "Add Vehicle"',
          'Enter vehicle code (e.g., BUS001)',
          'Add registration number and vehicle details',
          'Set capacity (number of seats)',
          'Select vehicle type (Bus, Van, etc.)',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Create Stops',
        description: 'Define pickup and drop-off locations.',
        details: [
          'Go to Stops',
          'Click "Add Stop"',
          'Enter stop name and location',
          'Set pickup fare and drop fare',
          'Add expected pickup time if needed',
        ],
        icon: <Folder size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Create Routes',
        description: 'Create transport routes connecting stops.',
        details: [
          'Navigate to Routes',
          'Click "Add Route"',
          'Enter route name',
          'Select a vehicle for this route',
          'Add stops in order (pickup sequence)',
          'Set route fare',
        ],
        icon: <Bus size={20} />,
      },
      {
        stepNumber: 4,
        title: 'Assign Students to Routes',
        description: 'Assign students to transport routes.',
        details: [
          'Go to Student Route Mapping',
          'Select a route',
          'View available students and route capacity',
          'Assign students to the route',
          'Ensure capacity is not exceeded',
        ],
        icon: <Users size={20} />,
      },
    ],
  },

  'leave': {
    moduleName: 'Leave Management',
    moduleIcon: <CalendarDays size={32} />,
    description: 'Manage staff and student leave requests',
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Leave Settings',
        description: 'Set up leave rules and policies.',
        details: [
          'Navigate to Leave Basics',
          'Define leave types (sick, casual, etc.)',
          'Set maximum leave days per type',
          'Configure approval workflow',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 2,
        title: 'View Leave Requests',
        description: 'Review leave requests from staff and students.',
        details: [
          'Go to Leave Dashboard',
          'View pending leave requests',
          'Filter by staff/student or leave type',
          'Check leave balance for each person',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Approve or Reject',
        description: 'Process leave requests.',
        details: [
          'Review leave application details',
          'Check leave balance and validity',
          'Approve or reject with remarks',
          'Notifications sent automatically',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'communication': {
    moduleName: 'Communication',
    moduleIcon: <MessageSquare size={32} />,
    description: 'Send notices, circulars, and announcements',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Notice/Circular',
        description: 'Send announcements to students or staff.',
        details: [
          'Navigate to Notices/Circulars',
          'Click "Create Notice"',
          'Enter notice title and content',
          'Select recipients (all, specific class, or staff)',
          'Set priority and expiry date',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Schedule Messages',
        description: 'Schedule messages to be sent later.',
        details: [
          'Set send date and time',
          'Choose communication channel (in-app, SMS, email)',
          'Preview message before scheduling',
        ],
        icon: <CalendarDays size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View Message History',
        description: 'Track all sent communications.',
        details: [
          'View sent messages and delivery status',
          'Check read receipts if enabled',
          'Resend or edit scheduled messages',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'reports': {
    moduleName: 'Reports',
    moduleIcon: <FileBarChart size={32} />,
    description: 'Generate various reports and analytics',
    steps: [
      {
        stepNumber: 1,
        title: 'Select Report Type',
        description: 'Choose the type of report you need.',
        details: [
          'Academic Reports: Marks, attendance, performance',
          'Financial Reports: Fees, expenses, income',
          'Administrative Reports: Staff, students, inventory',
        ],
        icon: <FileText size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Configure Report Filters',
        description: 'Set filters for your report.',
        details: [
          'Select date range',
          'Choose class, section, or specific students',
          'Filter by criteria relevant to report type',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Generate and Download',
        description: 'Generate and export your report.',
        details: [
          'Click "Generate Report"',
          'Preview report before downloading',
          'Export to PDF or Excel format',
          'Schedule automatic report generation if needed',
        ],
        icon: <FileBarChart size={20} />,
      },
    ],
  },

  'gallery': {
    moduleName: 'Gallery',
    // eslint-disable-next-line jsx-a11y/alt-text
    moduleIcon: <Image size={32} />,
    description: 'Manage school photo and video gallery',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Album',
        description: 'Organize photos into albums.',
        details: [
          'Click "Create Album"',
          'Enter album name and description',
          'Set album category (events, activities, etc.)',
          'Choose privacy settings',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Upload Photos',
        description: 'Add photos to your gallery.',
        details: [
          'Select an album',
          'Upload multiple photos at once',
          'Add captions and tags',
          'Set featured images',
        ],
        // eslint-disable-next-line jsx-a11y/alt-text
        icon: <Image size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Manage Gallery',
        description: 'Organize and manage gallery content.',
        details: [
          'Edit photo details',
          'Delete unwanted photos',
          'Reorder albums and photos',
          'Share albums with students/staff',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'certificates': {
    moduleName: 'Certificate Management',
    moduleIcon: <Award size={32} />,
    description: 'Generate and manage student certificates',
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Certificate Templates',
        description: 'Set up certificate templates.',
        details: [
          'Go to Certificate Templates',
          'Choose certificate type (bonafide, TC, etc.)',
          'Design template layout',
          'Add school logo and header',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Generate Certificates',
        description: 'Create certificates for students.',
        details: [
          'Navigate to New Certificate',
          'Select certificate type',
          'Choose student',
          'Fill in certificate details',
          'Generate and download PDF',
        ],
        icon: <Award size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Manage Certificate Requests',
        description: 'Track and manage certificate requests.',
        details: [
          'View all certificate requests',
          'Process pending requests',
          'Track certificate history',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'homework': {
    moduleName: 'Digital Diary',
    moduleIcon: <BookMarked size={32} />,
    description: 'Manage homework and assignments for students',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Homework',
        description: 'Add homework assignments for students.',
        details: [
          'Click "Create Diary" from quick actions',
          'Select class and section',
          'Choose subject',
          'Enter homework description',
          'Set due date',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Manage Assignments',
        description: 'View and manage all homework assignments.',
        details: [
          'Browse assignments by class or date',
          'Edit or delete assignments',
          'Track submission status',
        ],
        icon: <Folder size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Review Submissions',
        description: 'Review student homework submissions.',
        details: [
          'View submitted assignments',
          'Grade and provide feedback',
          'Mark as complete or return for revision',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'expense-income': {
    moduleName: 'Expense/Income',
    moduleIcon: <TrendingUp size={32} />,
    description: 'Track school expenses and income',
    steps: [
      {
        stepNumber: 1,
        title: 'Record Income',
        description: 'Log all income transactions.',
        details: [
          'Navigate to Income section',
          'Enter income source and amount',
          'Select category (fees, donations, etc.)',
          'Add payment method and date',
        ],
        icon: <ArrowRight size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Record Expenses',
        description: 'Track all school expenses.',
        details: [
          'Go to Expenses section',
          'Enter expense details',
          'Select category (salaries, utilities, maintenance)',
          'Attach receipts if available',
        ],
        icon: <TrendingUp size={20} />,
      },
      {
        stepNumber: 3,
        title: 'View Financial Reports',
        description: 'Analyze income and expenses.',
        details: [
          'View income vs expense reports',
          'Check category-wise breakdown',
          'Generate monthly/yearly summaries',
          'Export financial data',
        ],
        icon: <FileBarChart size={20} />,
      },
    ],
  },

  'front-office': {
    moduleName: 'Front Office Management',
    moduleIcon: <DoorOpen size={32} />,
    description: 'Manage visitor entries, gate passes, and front office operations',
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Gate Pass Settings',
        description: 'Set up gate pass rules and policies.',
        details: [
          'Navigate to Gate Pass Configuration',
          'Define pass types (student out, visitor in, etc.)',
          'Set approval requirements',
          'Configure automatic notifications',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Issue Gate Passes',
        description: 'Generate gate passes for students or visitors.',
        details: [
          'Select student or enter visitor details',
          'Choose pass type and reason',
          'Set time duration if applicable',
          'Get approval if required',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Track Entries/Exits',
        description: 'Monitor all gate pass activities.',
        details: [
          'View active and completed passes',
          'Track entry and exit times',
          'Generate visitor reports',
        ],
        icon: <Folder size={20} />,
      },
    ],
  },

  'copy-checking': {
    moduleName: 'Copy Checking',
    moduleIcon: <FileText size={32} />,
    description: 'Manage assignment and answer sheet checking',
    steps: [
      {
        stepNumber: 1,
        title: 'Upload Answer Sheets',
        description: 'Upload scanned copies of answer sheets.',
        details: [
          'Navigate to Copy Checking',
          'Select class, section, and subject',
          'Upload answer sheet files',
          'Organize by examination or assignment',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Assign Checkers',
        description: 'Assign staff members to check copies.',
        details: [
          'Select answer sheets to check',
          'Assign checker from staff list',
          'Set checking deadline',
        ],
        icon: <UserCheck size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Review Checked Copies',
        description: 'Review checked copies and marks.',
        details: [
          'View checking status',
          'Review marks and feedback',
          'Approve or request re-checking',
        ],
        icon: <CheckCircle size={20} />,
      },
    ],
  },

  'settings/roles': {
    moduleName: 'Admin Role Management',
    moduleIcon: <Shield size={32} />,
    description: 'Manage admin roles and permissions',
    steps: [
      {
        stepNumber: 1,
        title: 'Create Roles',
        description: 'Define custom roles for administrators.',
        details: [
          'Navigate to Admin Role Management',
          'Click "Create Role"',
          'Enter role name and description',
          'Assign permissions to modules',
        ],
        icon: <Plus size={20} />,
      },
      {
        stepNumber: 2,
        title: 'Assign Permissions',
        description: 'Configure what each role can access.',
        details: [
          'Select a role to edit',
          'Choose modules and sub-modules',
          'Set view and edit permissions',
          'Save role configuration',
        ],
        icon: <Settings size={20} />,
      },
      {
        stepNumber: 3,
        title: 'Assign Roles to Staff',
        description: 'Assign roles to staff members.',
        details: [
          'Go to Staff Access Control',
          'Select a staff member',
          'Assign appropriate role',
          'Verify permissions are applied',
        ],
        icon: <UserCheck size={20} />,
      },
    ],
  },
};

// Helper function to get guide by path
export function getGuideByPath(path: string): ModuleGuide | null {
  // Normalize path (remove leading/trailing slashes and /dashboard/[school] prefix)
  const normalizedPath = path
    .replace(/^\/dashboard\/[^/]+/, '')
    .replace(/^\//, '')
    .replace(/\/$/, '');

  // Handle root/home path
  if (normalizedPath === '' || normalizedPath === 'dashboard') {
    return moduleGuides['home'];
  }

  // Try exact match first
  if (moduleGuides[normalizedPath]) {
    return moduleGuides[normalizedPath];
  }

  // Try without subpaths (e.g., /settings/roles -> settings/roles)
  const pathParts = normalizedPath.split('/');
  const basePath = pathParts[0];
  const fullPath = pathParts.join('/');

  if (moduleGuides[fullPath]) {
    return moduleGuides[fullPath];
  }

  if (moduleGuides[basePath]) {
    return moduleGuides[basePath];
  }

  return null;
}
