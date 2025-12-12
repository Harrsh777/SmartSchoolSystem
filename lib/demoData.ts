// Mock data for the demo application

export interface School {
  id: string;
  name: string;
  email: string;
  address: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
  setupCompleted: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  feeCollection: {
    collected: number;
    pending: number;
    total: number;
  };
  todayAttendance: {
    present: number;
    absent: number;
    percentage: number;
  };
  upcomingExams: number;
  recentNotices: number;
}

export const mockDashboardStats: DashboardStats = {
  totalStudents: 1247,
  totalStaff: 89,
  feeCollection: {
    collected: 2450000,
    pending: 450000,
    total: 2900000,
  },
  todayAttendance: {
    present: 1156,
    absent: 91,
    percentage: 92.7,
  },
  upcomingExams: 3,
  recentNotices: 5,
};

export const mockStudents = [
  { id: '1', name: 'Aarav Sharma', class: '10-A', rollNo: '101', attendance: 95, email: 'aarav.sharma@school.com', phone: '+91 98765 43210' },
  { id: '2', name: 'Priya Patel', class: '10-B', rollNo: '102', attendance: 98, email: 'priya.patel@school.com', phone: '+91 98765 43211' },
  { id: '3', name: 'Rohan Kumar', class: '9-A', rollNo: '201', attendance: 87, email: 'rohan.kumar@school.com', phone: '+91 98765 43212' },
  { id: '4', name: 'Sneha Reddy', class: '10-A', rollNo: '103', attendance: 92, email: 'sneha.reddy@school.com', phone: '+91 98765 43213' },
  { id: '5', name: 'Arjun Nair', class: '9-B', rollNo: '202', attendance: 89, email: 'arjun.nair@school.com', phone: '+91 98765 43214' },
  { id: '6', name: 'Isha Gupta', class: '8-A', rollNo: '301', attendance: 96, email: 'isha.gupta@school.com', phone: '+91 98765 43215' },
];

export const mockStaff = [
  { id: '1', name: 'Dr. Anjali Mehta', role: 'Principal', department: 'Administration', email: 'anjali.mehta@school.com', phone: '+91 98765 43001', joinDate: '2020-01-15' },
  { id: '2', name: 'Prof. Rajesh Singh', role: 'Math Teacher', department: 'Mathematics', email: 'rajesh.singh@school.com', phone: '+91 98765 43002', joinDate: '2019-06-01' },
  { id: '3', name: 'Ms. Kavita Desai', role: 'English Teacher', department: 'Languages', email: 'kavita.desai@school.com', phone: '+91 98765 43003', joinDate: '2021-03-10' },
  { id: '4', name: 'Dr. Vikram Rao', role: 'Science Teacher', department: 'Science', email: 'vikram.rao@school.com', phone: '+91 98765 43004', joinDate: '2018-08-20' },
  { id: '5', name: 'Mrs. Sunita Iyer', role: 'Vice Principal', department: 'Administration', email: 'sunita.iyer@school.com', phone: '+91 98765 43005', joinDate: '2019-01-05' },
  { id: '6', name: 'Mr. Amit Joshi', role: 'History Teacher', department: 'Social Studies', email: 'amit.joshi@school.com', phone: '+91 98765 43006', joinDate: '2020-07-15' },
  { id: '7', name: 'Ms. Radha Menon', role: 'Computer Teacher', department: 'Computer Science', email: 'radha.menon@school.com', phone: '+91 98765 43007', joinDate: '2021-01-20' },
  { id: '8', name: 'Mr. Deepak Verma', role: 'Physical Education', department: 'Sports', email: 'deepak.verma@school.com', phone: '+91 98765 43008', joinDate: '2019-04-01' },
];

export const mockClasses = [
  { id: '1', name: 'Class 10-A', section: 'A', grade: '10', students: 42, teacher: 'Prof. Rajesh Singh', room: 'Room 101' },
  { id: '2', name: 'Class 10-B', section: 'B', grade: '10', students: 38, teacher: 'Ms. Kavita Desai', room: 'Room 102' },
  { id: '3', name: 'Class 9-A', section: 'A', grade: '9', students: 40, teacher: 'Dr. Vikram Rao', room: 'Room 201' },
  { id: '4', name: 'Class 9-B', section: 'B', grade: '9', students: 35, teacher: 'Mr. Amit Joshi', room: 'Room 202' },
  { id: '5', name: 'Class 8-A', section: 'A', grade: '8', students: 45, teacher: 'Ms. Radha Menon', room: 'Room 301' },
  { id: '6', name: 'Class 8-B', section: 'B', grade: '8', students: 41, teacher: 'Mr. Deepak Verma', room: 'Room 302' },
  { id: '7', name: 'Class 7-A', section: 'A', grade: '7', students: 39, teacher: 'Prof. Rajesh Singh', room: 'Room 401' },
  { id: '8', name: 'Class 7-B', section: 'B', grade: '7', students: 37, teacher: 'Ms. Kavita Desai', room: 'Room 402' },
];

export const mockAttendance = [
  { id: '1', date: '2024-01-15', class: '10-A', present: 38, absent: 4, percentage: 90.5 },
  { id: '2', date: '2024-01-15', class: '10-B', present: 35, absent: 3, percentage: 92.1 },
  { id: '3', date: '2024-01-15', class: '9-A', present: 37, absent: 3, percentage: 92.5 },
  { id: '4', date: '2024-01-15', class: '9-B', present: 32, absent: 3, percentage: 91.4 },
  { id: '5', date: '2024-01-14', class: '10-A', present: 40, absent: 2, percentage: 95.2 },
  { id: '6', date: '2024-01-14', class: '10-B', present: 36, absent: 2, percentage: 94.7 },
];

export const mockExams = [
  { id: '1', name: 'Mid-Term Examination', subject: 'Mathematics', class: '10-A', date: '2024-02-15', time: '09:00 AM', duration: '3 hours', status: 'Upcoming' },
  { id: '2', name: 'Mid-Term Examination', subject: 'English', class: '10-B', date: '2024-02-16', time: '09:00 AM', duration: '3 hours', status: 'Upcoming' },
  { id: '3', name: 'Unit Test', subject: 'Science', class: '9-A', date: '2024-02-10', time: '10:00 AM', duration: '2 hours', status: 'Upcoming' },
  { id: '4', name: 'Final Examination', subject: 'All Subjects', class: '10-A', date: '2024-03-20', time: '09:00 AM', duration: '3 hours', status: 'Scheduled' },
  { id: '5', name: 'Quarterly Test', subject: 'Mathematics', class: '8-A', date: '2024-01-25', time: '09:00 AM', duration: '2 hours', status: 'Completed' },
];

export const mockFees = [
  { id: '1', studentName: 'Aarav Sharma', class: '10-A', rollNo: '101', category: 'Tuition Fee', amount: 15000, dueDate: '2024-02-01', status: 'Paid', paidDate: '2024-01-28' },
  { id: '2', studentName: 'Priya Patel', class: '10-B', rollNo: '102', category: 'Tuition Fee', amount: 15000, dueDate: '2024-02-01', status: 'Pending', paidDate: null },
  { id: '3', studentName: 'Rohan Kumar', class: '9-A', rollNo: '201', category: 'Library Fee', amount: 2000, dueDate: '2024-02-05', status: 'Paid', paidDate: '2024-01-30' },
  { id: '4', studentName: 'Sneha Reddy', class: '10-A', rollNo: '103', category: 'Transport Fee', amount: 5000, dueDate: '2024-02-10', status: 'Pending', paidDate: null },
  { id: '5', studentName: 'Arjun Nair', class: '9-B', rollNo: '202', category: 'Tuition Fee', amount: 15000, dueDate: '2024-02-01', status: 'Paid', paidDate: '2024-01-25' },
  { id: '6', studentName: 'Isha Gupta', class: '8-A', rollNo: '301', category: 'Sports Fee', amount: 3000, dueDate: '2024-02-15', status: 'Pending', paidDate: null },
];

export const mockLibraryBooks = [
  { id: '1', title: 'Mathematics for Class 10', author: 'R.D. Sharma', isbn: '978-81-1234-567-8', category: 'Textbook', available: 15, total: 20, status: 'Available' },
  { id: '2', title: 'English Literature', author: 'William Shakespeare', isbn: '978-81-1234-568-5', category: 'Literature', available: 8, total: 12, status: 'Available' },
  { id: '3', title: 'Physics Fundamentals', author: 'H.C. Verma', isbn: '978-81-1234-569-2', category: 'Science', available: 0, total: 10, status: 'Issued' },
  { id: '4', title: 'History of India', author: 'Bipin Chandra', isbn: '978-81-1234-570-9', category: 'History', available: 5, total: 8, status: 'Available' },
  { id: '5', title: 'Computer Science Basics', author: 'Sumita Arora', isbn: '978-81-1234-571-6', category: 'Computer', available: 12, total: 15, status: 'Available' },
  { id: '6', title: 'Chemistry Concepts', author: 'Pradeep Publications', isbn: '978-81-1234-572-3', category: 'Science', available: 3, total: 10, status: 'Available' },
];

export const mockLibraryIssues = [
  { id: '1', studentName: 'Aarav Sharma', bookTitle: 'Mathematics for Class 10', issueDate: '2024-01-10', returnDate: '2024-01-24', dueDate: '2024-01-24', status: 'Issued' },
  { id: '2', studentName: 'Priya Patel', bookTitle: 'English Literature', issueDate: '2024-01-12', returnDate: null, dueDate: '2024-01-26', status: 'Issued' },
  { id: '3', studentName: 'Rohan Kumar', bookTitle: 'Physics Fundamentals', issueDate: '2024-01-05', returnDate: '2024-01-19', dueDate: '2024-01-19', status: 'Returned' },
];

export const mockTransport = [
  { id: '1', routeName: 'Route A - North Zone', vehicleNo: 'DL-01-AB-1234', driverName: 'Rajesh Kumar', driverPhone: '+91 98765 44001', capacity: 40, students: 35, status: 'Active' },
  { id: '2', routeName: 'Route B - South Zone', vehicleNo: 'DL-01-CD-5678', driverName: 'Suresh Yadav', driverPhone: '+91 98765 44002', capacity: 40, students: 38, status: 'Active' },
  { id: '3', routeName: 'Route C - East Zone', vehicleNo: 'DL-01-EF-9012', driverName: 'Mohan Singh', driverPhone: '+91 98765 44003', capacity: 35, students: 32, status: 'Active' },
  { id: '4', routeName: 'Route D - West Zone', vehicleNo: 'DL-01-GH-3456', driverName: 'Vikram Mehta', driverPhone: '+91 98765 44004', capacity: 35, students: 30, status: 'Active' },
  { id: '5', routeName: 'Route E - Central Zone', vehicleNo: 'DL-01-IJ-7890', driverName: 'Amit Sharma', driverPhone: '+91 98765 44005', capacity: 30, students: 28, status: 'Active' },
];

export const mockNotices = [
  { id: '1', title: 'Mid-Term Examination Schedule', content: 'The mid-term examinations will commence from February 15, 2024. Please check the schedule on the notice board.', category: 'Examination', date: '2024-01-20', priority: 'High', status: 'Active' },
  { id: '2', title: 'Parent-Teacher Meeting', content: 'A parent-teacher meeting is scheduled for February 5, 2024. All parents are requested to attend.', category: 'Meeting', date: '2024-01-18', priority: 'High', status: 'Active' },
  { id: '3', title: 'Sports Day Announcement', content: 'Annual Sports Day will be held on March 10, 2024. Students interested in participating should register by February 20.', category: 'Event', date: '2024-01-15', priority: 'Medium', status: 'Active' },
  { id: '4', title: 'Fee Payment Reminder', content: 'This is a reminder that the tuition fee for February 2024 is due on February 1, 2024. Please make the payment on time.', category: 'Fee', date: '2024-01-25', priority: 'High', status: 'Active' },
  { id: '5', title: 'Library Book Return Notice', content: 'Students who have borrowed books from the library are requested to return them before the examination period begins.', category: 'Library', date: '2024-01-22', priority: 'Medium', status: 'Active' },
  { id: '6', title: 'Holiday Notice - Republic Day', content: 'School will remain closed on January 26, 2024, on account of Republic Day.', category: 'Holiday', date: '2024-01-20', priority: 'Low', status: 'Active' },
];

// Calendar Events Data
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  label: 'Class Activity' | 'Quiz' | 'Lab' | 'Test' | 'Exam' | 'Sports Activity' | 'Celebration' | 'Meetings' | 'PTM' | 'Holiday';
  calendar: 'Senior Wing' | 'Primary Wing' | 'Junior Wing';
}

export const mockCalendarEvents: CalendarEvent[] = [
  { id: '1', title: 'Trip to Hills', date: '2024-02-03', label: 'Sports Activity', calendar: 'Senior Wing' },
  { id: '2', title: 'Class Test', date: '2024-02-10', time: '10:00am-11:00am', location: 'Class Room', label: 'Test', calendar: 'Senior Wing' },
  { id: '3', title: 'SA-2 Exam', date: '2024-02-14', time: '10:00am-1:00pm', location: 'Class Room', description: 'SA-2 Exam for senior wing, Participants Students of PS I & PS II', label: 'Exam', calendar: 'Senior Wing' },
  { id: '4', title: '9a PTM', date: '2024-02-17', time: '9:00am-12:00pm', location: 'School Auditorium', label: 'PTM', calendar: 'Senior Wing' },
  { id: '5', title: 'Month Celebration', date: '2024-02-19', time: '2:00pm-4:00pm', location: 'School Ground', label: 'Celebration', calendar: 'Primary Wing' },
  { id: '6', title: 'Annual Sports Meet', date: '2024-02-21', time: '9:00am-5:00pm', location: 'Sports Ground', label: 'Sports Activity', calendar: 'Senior Wing' },
  { id: '7', title: 'Orange Color Day', date: '2024-02-15', time: '10:00am-12:00pm', location: 'Class Room', label: 'Class Activity', calendar: 'Primary Wing' },
  { id: '8', title: 'Science Quiz', date: '2024-02-12', time: '11:00am-12:00pm', location: 'Lab', label: 'Quiz', calendar: 'Junior Wing' },
  { id: '9', title: 'Chemistry Lab', date: '2024-02-18', time: '2:00pm-4:00pm', location: 'Chemistry Lab', label: 'Lab', calendar: 'Senior Wing' },
  { id: '10', title: 'Staff Meeting', date: '2024-02-20', time: '3:00pm-4:00pm', location: 'Conference Room', label: 'Meetings', calendar: 'Senior Wing' },
  { id: '11', title: 'Republic Day', date: '2024-01-26', label: 'Holiday', calendar: 'Senior Wing' },
  { id: '12', title: 'Holi', date: '2024-03-25', label: 'Holiday', calendar: 'Senior Wing' },
];

export const eventLabels = {
  'Class Activity': { color: 'bg-blue-500', text: 'text-white' },
  'Quiz': { color: 'bg-green-500', text: 'text-white' },
  'Lab': { color: 'bg-purple-500', text: 'text-white' },
  'Test': { color: 'bg-indigo-600', text: 'text-white' },
  'Exam': { color: 'bg-red-500', text: 'text-white' },
  'Sports Activity': { color: 'bg-yellow-500', text: 'text-black' },
  'Celebration': { color: 'bg-teal-500', text: 'text-white' },
  'Meetings': { color: 'bg-sky-500', text: 'text-white' },
  'PTM': { color: 'bg-blue-700', text: 'text-white' },
  'Holiday': { color: 'bg-gray-400', text: 'text-white' },
};

// Store schools in localStorage (demo only)
export const getStoredSchools = (): School[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('eduflow360_schools');
  return stored ? JSON.parse(stored) : [];
};

export const saveSchool = (school: School): void => {
  if (typeof window === 'undefined') return;
  const schools = getStoredSchools();
  const existingIndex = schools.findIndex(s => s.id === school.id);
  if (existingIndex >= 0) {
    schools[existingIndex] = school;
  } else {
    schools.push(school);
  }
  localStorage.setItem('eduflow360_schools', JSON.stringify(schools));
};

export const getSchoolBySlug = (slug: string): School | null => {
  const schools = getStoredSchools();
  return schools.find(s => s.id === slug || s.name.toLowerCase().replace(/\s+/g, '-') === slug) || null;
};

export const getSchoolByEmail = (email: string): School | null => {
  const schools = getStoredSchools();
  return schools.find(s => s.email === email) || null;
};

export const createSchoolSlug = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Admin Dashboard Mock Data
export const mockAllSchools: School[] = [
  {
    id: 'demo-school',
    name: 'Demo International School',
    email: 'demo@school.com',
    address: '123 Education Street, City',
    setupCompleted: true,
  },
  {
    id: 'greenwood-academy',
    name: 'Greenwood Academy',
    email: 'admin@greenwood.edu',
    address: '456 Learning Avenue, City',
    setupCompleted: true,
  },
  {
    id: 'sunrise-public-school',
    name: 'Sunrise Public School',
    email: 'contact@sunrise.edu',
    address: '789 Knowledge Road, City',
    setupCompleted: false,
  },
  {
    id: 'elite-college',
    name: 'Elite College',
    email: 'info@elitecollege.edu',
    address: '321 Wisdom Lane, City',
    setupCompleted: true,
  },
  {
    id: 'bright-future-school',
    name: 'Bright Future School',
    email: 'hello@brightfuture.edu',
    address: '654 Success Boulevard, City',
    setupCompleted: true,
  },
  {
    id: 'excellence-academy',
    name: 'Excellence Academy',
    email: 'admin@excellence.edu',
    address: '987 Achievement Street, City',
    setupCompleted: false,
  },
  {
    id: 'wisdom-international',
    name: 'Wisdom International School',
    email: 'contact@wisdom.edu',
    address: '147 Scholar Avenue, City',
    setupCompleted: true,
  },
  {
    id: 'premier-school',
    name: 'Premier School',
    email: 'info@premier.edu',
    address: '258 Excellence Road, City',
    setupCompleted: true,
  },
];

// Contest Mock Data
export interface Contest {
  id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  enrolledSchools: string[];
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  prize: string;
}

export const mockContests: Contest[] = [
  {
    id: '1',
    name: 'National Bodybuilding Championship',
    category: 'Sports',
    description: 'Inter-school bodybuilding competition showcasing physical fitness and strength. Open to all age groups.',
    startDate: '2025-03-15',
    endDate: '2025-03-17',
    registrationDeadline: '2025-03-01',
    maxParticipants: 50,
    enrolledSchools: ['greenwood-academy', 'elite-college', 'bright-future-school'],
    status: 'Upcoming',
    prize: '₹1,00,000 + Trophy',
  },
  {
    id: '2',
    name: 'Tech Hackathon 2024',
    category: 'Technology',
    description: '48-hour coding competition where students develop innovative solutions to real-world problems.',
    startDate: '2025-02-20',
    endDate: '2025-02-22',
    registrationDeadline: '2025-02-10',
    maxParticipants: 30,
    enrolledSchools: ['demo-school', 'greenwood-academy', 'wisdom-international', 'premier-school'],
    status: 'Upcoming',
    prize: '₹2,50,000 + Internship Opportunities',
  },
  {
    id: '3',
    name: 'Math Olympiad',
    category: 'Academics',
    description: 'Competitive mathematics examination testing problem-solving skills and mathematical reasoning.',
    startDate: '2025-04-10',
    endDate: '2025-04-10',
    registrationDeadline: '2025-03-25',
    maxParticipants: 100,
    enrolledSchools: ['elite-college', 'bright-future-school', 'excellence-academy'],
    status: 'Upcoming',
    prize: '₹75,000 + Scholarships',
  },
  {
    id: '4',
    name: 'Science Fair Exhibition',
    category: 'Science',
    description: 'Showcase innovative science projects and experiments from students across schools.',
    startDate: '2025-05-05',
    endDate: '2025-05-07',
    registrationDeadline: '2025-04-20',
    maxParticipants: 40,
    enrolledSchools: ['demo-school', 'sunrise-public-school', 'wisdom-international'],
    status: 'Upcoming',
    prize: '₹1,50,000 + Lab Equipment',
  },
  {
    id: '5',
    name: 'Debate Championship',
    category: 'Academics',
    description: 'Inter-school debate competition on current affairs and social issues.',
    startDate: '2025-03-25',
    endDate: '2025-03-27',
    registrationDeadline: '2025-03-10',
    maxParticipants: 32,
    enrolledSchools: ['greenwood-academy', 'elite-college', 'premier-school', 'bright-future-school'],
    status: 'Upcoming',
    prize: '₹60,000 + Certificates',
  },
  {
    id: '6',
    name: 'Robotics Competition',
    category: 'Technology',
    description: 'Build and program robots to complete various challenges and tasks.',
    startDate: '2025-06-15',
    endDate: '2025-06-17',
    registrationDeadline: '2025-05-30',
    maxParticipants: 25,
    enrolledSchools: ['demo-school', 'excellence-academy'],
    status: 'Upcoming',
    prize: '₹2,00,000 + Robotics Kits',
  },
  {
    id: '7',
    name: 'Art & Design Contest',
    category: 'Arts',
    description: 'Creative competition showcasing artistic talent in painting, digital art, and design.',
    startDate: '2025-04-20',
    endDate: '2025-04-22',
    registrationDeadline: '2025-04-05',
    maxParticipants: 60,
    enrolledSchools: ['sunrise-public-school', 'wisdom-international', 'premier-school'],
    status: 'Upcoming',
    prize: '₹80,000 + Art Supplies',
  },
  {
    id: '8',
    name: 'Music & Dance Festival',
    category: 'Performing Arts',
    description: 'Celebrate talent in music and dance performances from various schools.',
    startDate: '2025-07-10',
    endDate: '2025-07-12',
    registrationDeadline: '2025-06-25',
    maxParticipants: 45,
    enrolledSchools: ['greenwood-academy', 'bright-future-school'],
    status: 'Upcoming',
    prize: '₹1,20,000 + Musical Instruments',
  },
];

