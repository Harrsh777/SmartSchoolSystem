// Student Dashboard Mock Data

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  email: string;
  phone: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  admissionDate: string;
  bloodGroup: string;
  address: string;
}

export interface AttendanceRecord {
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  subject?: string;
}

export interface Mark {
  subject: string;
  examType: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  examDate: string;
}

export interface FeeRecord {
  id: string;
  category: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  receiptNo?: string;
}

export interface ExamSchedule {
  id: string;
  subject: string;
  examType: string;
  date: string;
  time: string;
  duration: string;
  room: string;
  status: 'Upcoming' | 'Completed';
}

export interface TimetableSlot {
  day: string;
  periods: {
    time: string;
    subject: string;
    teacher: string;
    room: string;
  }[];
}

export interface ReportCard {
  term: string;
  academicYear: string;
  overallPercentage: number;
  overallGrade: string;
  rank: number;
  totalStudents: number;
  subjects: {
    subject: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
  }[];
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  };
}

// Demo Student Data
export const demoStudent: Student = {
  id: '1',
  name: 'Aarav Sharma',
  rollNo: '101',
  class: '10',
  section: 'A',
  email: 'aarav.sharma@school.com',
  phone: '+91 98765 43210',
  parentName: 'Rajesh Sharma',
  parentEmail: 'rajesh.sharma@email.com',
  parentPhone: '+91 98765 43211',
  admissionDate: '2020-04-01',
  bloodGroup: 'O+',
  address: '123 Main Street, City, State - 123456',
};

export const demoAttendance: AttendanceRecord[] = [
  { date: '2024-01-15', status: 'Present' },
  { date: '2024-01-16', status: 'Present' },
  { date: '2024-01-17', status: 'Absent' },
  { date: '2024-01-18', status: 'Present' },
  { date: '2024-01-19', status: 'Late' },
  { date: '2024-01-20', status: 'Present' },
  { date: '2024-01-21', status: 'Present' },
  { date: '2024-01-22', status: 'Present' },
  { date: '2024-01-23', status: 'Present' },
  { date: '2024-01-24', status: 'Absent' },
];

export const demoMarks: Mark[] = [
  { subject: 'Mathematics', examType: 'Unit Test 1', marksObtained: 85, maxMarks: 100, percentage: 85, grade: 'A', examDate: '2024-01-10' },
  { subject: 'English', examType: 'Unit Test 1', marksObtained: 92, maxMarks: 100, percentage: 92, grade: 'A+', examDate: '2024-01-12' },
  { subject: 'Science', examType: 'Unit Test 1', marksObtained: 88, maxMarks: 100, percentage: 88, grade: 'A', examDate: '2024-01-15' },
  { subject: 'Social Studies', examType: 'Unit Test 1', marksObtained: 90, maxMarks: 100, percentage: 90, grade: 'A+', examDate: '2024-01-18' },
  { subject: 'Computer Science', examType: 'Unit Test 1', marksObtained: 95, maxMarks: 100, percentage: 95, grade: 'A+', examDate: '2024-01-20' },
  { subject: 'Mathematics', examType: 'Mid-Term', marksObtained: 82, maxMarks: 100, percentage: 82, grade: 'A', examDate: '2024-02-15' },
  { subject: 'English', examType: 'Mid-Term', marksObtained: 89, maxMarks: 100, percentage: 89, grade: 'A', examDate: '2024-02-16' },
];

export const demoFees: FeeRecord[] = [
  { id: '1', category: 'Tuition Fee', amount: 15000, dueDate: '2024-02-01', paidDate: '2024-01-28', status: 'Paid', receiptNo: 'RCP-2024-001' },
  { id: '2', category: 'Library Fee', amount: 2000, dueDate: '2024-02-05', paidDate: '2024-01-30', status: 'Paid', receiptNo: 'RCP-2024-002' },
  { id: '3', category: 'Sports Fee', amount: 3000, dueDate: '2024-02-10', status: 'Pending' },
  { id: '4', category: 'Transport Fee', amount: 5000, dueDate: '2024-02-15', status: 'Pending' },
  { id: '5', category: 'Tuition Fee', amount: 15000, dueDate: '2024-03-01', status: 'Pending' },
];

export const demoExams: ExamSchedule[] = [
  { id: '1', subject: 'Mathematics', examType: 'Final Examination', date: '2024-03-20', time: '09:00 AM', duration: '3 hours', room: 'Hall A', status: 'Upcoming' },
  { id: '2', subject: 'English', examType: 'Final Examination', date: '2024-03-21', time: '09:00 AM', duration: '3 hours', room: 'Hall B', status: 'Upcoming' },
  { id: '3', subject: 'Science', examType: 'Final Examination', date: '2024-03-22', time: '09:00 AM', duration: '3 hours', room: 'Hall A', status: 'Upcoming' },
  { id: '4', subject: 'Social Studies', examType: 'Final Examination', date: '2024-03-23', time: '09:00 AM', duration: '3 hours', room: 'Hall C', status: 'Upcoming' },
  { id: '5', subject: 'Computer Science', examType: 'Final Examination', date: '2024-03-24', time: '09:00 AM', duration: '3 hours', room: 'Lab 1', status: 'Upcoming' },
  { id: '6', subject: 'Mathematics', examType: 'Mid-Term', date: '2024-02-15', time: '09:00 AM', duration: '3 hours', room: 'Hall A', status: 'Completed' },
];

export const demoTimetable: TimetableSlot[] = [
  {
    day: 'Monday',
    periods: [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '08:45 - 09:30', subject: 'English', teacher: 'Ms. Kavita Desai', room: 'Room 102' },
      { time: '09:30 - 10:15', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Social Studies', teacher: 'Mr. Amit Joshi', room: 'Room 103' },
      { time: '11:15 - 12:00', subject: 'Computer Science', teacher: 'Ms. Radha Menon', room: 'Lab 2' },
      { time: '12:00 - 12:45', subject: 'Physical Education', teacher: 'Mr. Deepak Verma', room: 'Ground' },
    ],
  },
  {
    day: 'Tuesday',
    periods: [
      { time: '08:00 - 08:45', subject: 'English', teacher: 'Ms. Kavita Desai', room: 'Room 102' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '09:30 - 10:15', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Computer Science', teacher: 'Ms. Radha Menon', room: 'Lab 2' },
      { time: '11:15 - 12:00', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '12:00 - 12:45', subject: 'Library', teacher: 'Librarian', room: 'Library' },
    ],
  },
  {
    day: 'Wednesday',
    periods: [
      { time: '08:00 - 08:45', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '09:30 - 10:15', subject: 'English', teacher: 'Ms. Kavita Desai', room: 'Room 102' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Social Studies', teacher: 'Mr. Amit Joshi', room: 'Room 103' },
      { time: '11:15 - 12:00', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '12:00 - 12:45', subject: 'Art', teacher: 'Ms. Priya Mehta', room: 'Art Room' },
    ],
  },
  {
    day: 'Thursday',
    periods: [
      { time: '08:00 - 08:45', subject: 'Computer Science', teacher: 'Ms. Radha Menon', room: 'Lab 2' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '09:30 - 10:15', subject: 'English', teacher: 'Ms. Kavita Desai', room: 'Room 102' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '11:15 - 12:00', subject: 'Social Studies', teacher: 'Mr. Amit Joshi', room: 'Room 103' },
      { time: '12:00 - 12:45', subject: 'Music', teacher: 'Mr. Suresh Kumar', room: 'Music Room' },
    ],
  },
  {
    day: 'Friday',
    periods: [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
      { time: '08:45 - 09:30', subject: 'Science', teacher: 'Dr. Vikram Rao', room: 'Lab 1' },
      { time: '09:30 - 10:15', subject: 'English', teacher: 'Ms. Kavita Desai', room: 'Room 102' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Computer Science', teacher: 'Ms. Radha Menon', room: 'Lab 2' },
      { time: '11:15 - 12:00', subject: 'Social Studies', teacher: 'Mr. Amit Joshi', room: 'Room 103' },
      { time: '12:00 - 12:45', subject: 'Physical Education', teacher: 'Mr. Deepak Verma', room: 'Ground' },
    ],
  },
];

export const demoReportCard: ReportCard = {
  term: 'First Term',
  academicYear: '2024-2025',
  overallPercentage: 88.5,
  overallGrade: 'A+',
  rank: 5,
  totalStudents: 42,
  subjects: [
    { subject: 'Mathematics', marksObtained: 85, maxMarks: 100, percentage: 85, grade: 'A' },
    { subject: 'English', marksObtained: 92, maxMarks: 100, percentage: 92, grade: 'A+' },
    { subject: 'Science', marksObtained: 88, maxMarks: 100, percentage: 88, grade: 'A' },
    { subject: 'Social Studies', marksObtained: 90, maxMarks: 100, percentage: 90, grade: 'A+' },
    { subject: 'Computer Science', marksObtained: 95, maxMarks: 100, percentage: 95, grade: 'A+' },
  ],
  attendance: {
    totalDays: 180,
    presentDays: 168,
    absentDays: 12,
    percentage: 93.3,
  },
};

