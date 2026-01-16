/**
 * Demo/Mock data for development purposes
 * 
 * ⚠️ WARNING: This file is for development/demo purposes only.
 * In production, replace localStorage operations with proper API calls to your backend.
 * 
 * @module demoData
 */

// ==================== School Management ====================

/**
 * School interface representing a school entity
 */
export interface School {
  id: string;
  name: string;
  email: string;
  address: string;
  setupCompleted: boolean;
}

const STORAGE_KEY = 'demo_schools';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates school data structure
 */
function validateSchool(school: unknown): school is School {
  if (!school || typeof school !== 'object') return false;
  
  const s = school as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    s.id.length > 0 &&
    typeof s.name === 'string' &&
    s.name.length > 0 &&
    typeof s.email === 'string' &&
    isValidEmail(s.email) &&
    typeof s.address === 'string' &&
    typeof s.setupCompleted === 'boolean'
  );
}

/**
 * Safely retrieves data from localStorage with error handling
 */
function safeGetStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Safely sets data in localStorage with error handling and size limits
 */
function safeSetStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check storage size
    const currentSize = new Blob([value]).size;
    if (currentSize > MAX_STORAGE_SIZE) {
      console.warn(`Storage value exceeds size limit (${MAX_STORAGE_SIZE} bytes)`);
      return false;
    }
    
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Clearing old data...');
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Failed to clear and retry storage:', retryError);
        return false;
      }
    }
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Retrieves a school by email address
 * 
 * @param email - Email address to search for
 * @returns School object if found, null otherwise
 * @throws Will throw an error if email format is invalid
 */
export function getSchoolByEmail(email: string): School | null {
  if (typeof window === 'undefined') return null;
  
  if (!email || typeof email !== 'string') {
    console.warn('Invalid email provided to getSchoolByEmail');
    return null;
  }
  
  if (!isValidEmail(email)) {
    console.warn(`Invalid email format: ${email}`);
    return null;
  }
  
  const stored = safeGetStorage(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const schools: unknown[] = JSON.parse(stored);
    if (!Array.isArray(schools)) {
      console.error('Invalid data format in localStorage');
      return null;
    }
    
    const school = schools.find((s): s is School => validateSchool(s) && s.email.toLowerCase() === email.toLowerCase());
    return school || null;
  } catch (error) {
    console.error('Error parsing schools from localStorage:', error);
    return null;
  }
}

/**
 * Creates a URL-friendly slug from a school name
 * 
 * @param name - School name to convert to slug
 * @returns URL-friendly slug string
 * @example
 * createSchoolSlug("St. Mary's High School") // "st-marys-high-school"
 */
export function createSchoolSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('School name must be a non-empty string');
  }
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'school';
}

/**
 * Saves a school to localStorage
 * 
 * @param school - School object to save
 * @returns true if saved successfully, false otherwise
 * @throws Will throw an error if school data is invalid
 */
export function saveSchool(school: School): boolean {
  if (typeof window === 'undefined') return false;
  
  if (!validateSchool(school)) {
    throw new Error('Invalid school data provided');
  }
  
  const stored = safeGetStorage(STORAGE_KEY);
  let schools: School[] = [];
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        schools = parsed.filter(validateSchool);
      }
    } catch (error) {
      console.error('Error parsing existing schools:', error);
      schools = [];
    }
  }
  
  const existingIndex = schools.findIndex(s => s.id === school.id);
  if (existingIndex >= 0) {
    schools[existingIndex] = school;
  } else {
    schools.push(school);
  }
  
  const serialized = JSON.stringify(schools);
  return safeSetStorage(STORAGE_KEY, serialized);
}

/**
 * Retrieves all stored schools from localStorage
 * 
 * @returns Array of School objects
 */
export function getStoredSchools(): School[] {
  if (typeof window === 'undefined') return [];
  
  const stored = safeGetStorage(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const parsed: unknown[] = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.error('Invalid data format in localStorage');
      return [];
    }
    
    return parsed.filter(validateSchool);
  } catch (error) {
    console.error('Error parsing schools from localStorage:', error);
    return [];
  }
}

// ==================== Calendar Events ====================

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  calendar: string; // 'Senior Wing', 'Primary Wing', 'Junior Wing'
  label: string; // Event type label
  description?: string;
  time?: string; // Time in HH:MM AM/PM format
  location?: string; // Event location
}

/**
 * Event label style interface
 */
export interface EventLabelStyle {
  color: string; // Hex color for inline styles
  text: string; // Tailwind text color class
  bgClass: string; // Tailwind background color class
}

/**
 * Event label color mapping
 * Maps event types to their display colors and text styles
 */
export const eventLabels: Record<string, EventLabelStyle> = {
  'Holiday': { color: '#FEE2E2', text: 'text-red-800', bgClass: 'bg-red-100' },
  'Exam': { color: '#CFFAFE', text: 'text-cyan-800', bgClass: 'bg-cyan-100' },
  'Event': { color: '#DBEAFE', text: 'text-blue-800', bgClass: 'bg-blue-100' },
  'Meeting': { color: '#FFEDD5', text: 'text-orange-800', bgClass: 'bg-orange-100' },
  'Activity': { color: '#D1FAE5', text: 'text-green-800', bgClass: 'bg-green-100' },
  'Deadline': { color: '#FEF3C7', text: 'text-yellow-800', bgClass: 'bg-yellow-100' },
} as const;

/**
 * Validates if a date string is in ISO format (YYYY-MM-DD)
 */
function isValidISODate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates calendar event data structure
 */
function validateCalendarEvent(event: unknown): event is CalendarEvent {
  if (!event || typeof event !== 'object') return false;
  
  const e = event as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.title === 'string' &&
    e.title.length > 0 &&
    typeof e.date === 'string' &&
    isValidISODate(e.date) &&
    typeof e.calendar === 'string' &&
    e.calendar.length > 0 &&
    typeof e.label === 'string' &&
    e.label.length > 0 &&
    (e.description === undefined || typeof e.description === 'string') &&
    (e.time === undefined || typeof e.time === 'string')
  );
}

/**
 * Mock calendar events for demo purposes
 * 
 * ⚠️ NOTE: Dates are relative to current year. In production, replace with API calls.
 */
export const mockCalendarEvents: CalendarEvent[] = (() => {
  const currentYear = new Date().getFullYear();
  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'Annual Day Celebration',
      date: `${currentYear}-02-15`,
      calendar: 'Senior Wing',
      label: 'Event',
      description: 'Annual day celebration with cultural programs',
      time: '10:00 AM',
    },
    {
      id: '2',
      title: 'Mid-Term Examinations',
      date: `${currentYear}-02-20`,
      calendar: 'Senior Wing',
      label: 'Exam',
      description: 'Mid-term exams for all classes',
      time: '9:00 AM',
    },
    {
      id: '3',
      title: 'Republic Day',
      date: `${currentYear}-01-26`,
      calendar: 'Senior Wing',
      label: 'Holiday',
      description: 'National holiday',
    },
    {
      id: '4',
      title: 'Parent-Teacher Meeting',
      date: `${currentYear}-02-10`,
      calendar: 'Primary Wing',
      label: 'Meeting',
      description: 'PTM for all classes',
      time: '2:00 PM',
    },
    {
      id: '5',
      title: 'Science Fair',
      date: `${currentYear}-02-25`,
      calendar: 'Senior Wing',
      label: 'Activity',
      description: 'Annual science fair exhibition',
      time: '11:00 AM',
    },
    {
      id: '6',
      title: 'Assignment Submission Deadline',
      date: `${currentYear}-02-12`,
      calendar: 'Senior Wing',
      label: 'Deadline',
      description: 'Last date for project submission',
    },
    {
      id: '7',
      title: 'Sports Day',
      date: `${currentYear}-02-28`,
      calendar: 'Senior Wing',
      label: 'Event',
      description: 'Annual sports day competition',
      time: '8:00 AM',
    },
    {
      id: '8',
      title: 'Holi Holiday',
      date: `${currentYear}-03-25`,
      calendar: 'Senior Wing',
      label: 'Holiday',
      description: 'Holi festival holiday',
    },
  ];
  
  // Validate all events before returning
  return events.filter(validateCalendarEvent);
})();

// ==================== Contests ====================

/**
 * Contest interface representing a competition/contest
 */
export interface Contest {
  id: string;
  name: string;
  description: string;
  category: string;
  registrationDeadline: string; // ISO date string (YYYY-MM-DD)
  contestDate: string; // ISO date string (YYYY-MM-DD)
  maxParticipants: number;
  enrolledSchools: string[];
  prize: string;
  location: string;
  organizer: string;
}

/**
 * Validates contest data structure
 */
function validateContest(contest: unknown): contest is Contest {
  if (!contest || typeof contest !== 'object') return false;
  
  const c = contest as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.name === 'string' &&
    c.name.length > 0 &&
    typeof c.description === 'string' &&
    typeof c.category === 'string' &&
    typeof c.registrationDeadline === 'string' &&
    isValidISODate(c.registrationDeadline) &&
    typeof c.contestDate === 'string' &&
    isValidISODate(c.contestDate) &&
    typeof c.maxParticipants === 'number' &&
    c.maxParticipants > 0 &&
    Array.isArray(c.enrolledSchools) &&
    c.enrolledSchools.every((s): s is string => typeof s === 'string') &&
    typeof c.prize === 'string' &&
    typeof c.location === 'string' &&
    typeof c.organizer === 'string'
  );
}

/**
 * Mock contests for demo purposes
 * 
 * ⚠️ NOTE: Dates are relative to current year. In production, replace with API calls.
 */
export const mockContests: Contest[] = (() => {
  const currentYear = new Date().getFullYear();
  const contests: Contest[] = [
    {
      id: '1',
      name: 'Inter-School Science Olympiad',
      description: 'A prestigious science competition for students from grades 9-12. Test your knowledge in Physics, Chemistry, Biology, and Mathematics.',
      category: 'Science',
      registrationDeadline: `${currentYear}-03-15`,
      contestDate: `${currentYear}-04-10`,
      maxParticipants: 50,
      enrolledSchools: ['Demo School', 'ABC High School'],
      prize: '₹50,000 + Trophy + Certificates',
      location: 'City Convention Center',
      organizer: 'Science Education Foundation',
    },
    {
      id: '2',
      name: 'National Mathematics Championship',
      description: 'Challenge your mathematical skills in this competitive exam covering algebra, geometry, calculus, and problem-solving.',
      category: 'Academics',
      registrationDeadline: `${currentYear}-03-20`,
      contestDate: `${currentYear}-04-15`,
      maxParticipants: 100,
      enrolledSchools: ['XYZ School'],
      prize: '₹75,000 + Medals + Scholarships',
      location: 'State University Auditorium',
      organizer: 'Math Excellence Society',
    },
    {
      id: '3',
      name: 'Regional Football Tournament',
      description: 'Showcase your football skills in this exciting inter-school tournament. Open to all age groups.',
      category: 'Sports',
      registrationDeadline: `${currentYear}-03-10`,
      contestDate: `${currentYear}-04-05`,
      maxParticipants: 32,
      enrolledSchools: ['Sports Academy'],
      prize: 'Trophy + Medals + Sports Equipment',
      location: 'Regional Sports Complex',
      organizer: 'Sports Authority',
    },
    {
      id: '4',
      name: 'Robotics Innovation Challenge',
      description: 'Design and build innovative robots to solve real-world problems. Teams of 3-5 students.',
      category: 'Technology',
      registrationDeadline: `${currentYear}-03-25`,
      contestDate: `${currentYear}-04-20`,
      maxParticipants: 30,
      enrolledSchools: [],
      prize: '₹1,00,000 + Robotics Kit + Certificates',
      location: 'Tech Innovation Hub',
      organizer: 'Tech Education Initiative',
    },
    {
      id: '5',
      name: 'Drama and Theatre Festival',
      description: 'Express your creativity through drama and theatre. Performances in multiple languages welcome.',
      category: 'Performing Arts',
      registrationDeadline: `${currentYear}-03-18`,
      contestDate: `${currentYear}-04-12`,
      maxParticipants: 25,
      enrolledSchools: ['Arts Academy'],
      prize: 'Trophy + Cash Prizes + Performance Opportunities',
      location: 'City Cultural Center',
      organizer: 'Arts and Culture Society',
    },
    {
      id: '6',
      name: 'Debate Championship',
      description: 'Sharpen your argumentation skills in this competitive debate tournament. Topics announced on the day.',
      category: 'Academics',
      registrationDeadline: `${currentYear}-03-22`,
      contestDate: `${currentYear}-04-18`,
      maxParticipants: 40,
      enrolledSchools: [],
      prize: '₹30,000 + Trophy + Certificates',
      location: 'Debate Hall',
      organizer: 'Debate Society',
    },
    {
      id: '7',
      name: 'Art and Painting Competition',
      description: 'Showcase your artistic talents in various categories including watercolor, oil painting, and digital art.',
      category: 'Arts',
      registrationDeadline: `${currentYear}-03-12`,
      contestDate: `${currentYear}-04-08`,
      maxParticipants: 60,
      enrolledSchools: ['Creative School'],
      prize: 'Art Supplies + Certificates + Exhibition Opportunity',
      location: 'Art Gallery',
      organizer: 'Art Education Foundation',
    },
  ];
  
  // Validate all contests before returning
  return contests.filter(validateContest);
})();

// ==================== Exams ====================

/**
 * Exam status type
 */
export type ExamStatus = 'Upcoming' | 'Scheduled' | 'Completed';

/**
 * Exam interface representing an examination
 */
export interface Exam {
  id: string;
  name: string;
  class: string;
  subject: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time in HH:MM AM/PM format
  duration: string; // Duration description (e.g., "3 hours")
  status: ExamStatus;
  totalMarks?: number;
  passingMarks?: number;
}

/**
 * Validates exam data structure
 */
function validateExam(exam: unknown): exam is Exam {
  if (!exam || typeof exam !== 'object') return false;
  
  const e = exam as Record<string, unknown>;
  const validStatuses: ExamStatus[] = ['Upcoming', 'Scheduled', 'Completed'];
  
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.name === 'string' &&
    e.name.length > 0 &&
    typeof e.class === 'string' &&
    e.class.length > 0 &&
    typeof e.subject === 'string' &&
    e.subject.length > 0 &&
    typeof e.date === 'string' &&
    isValidISODate(e.date) &&
    typeof e.time === 'string' &&
    e.time.length > 0 &&
    typeof e.duration === 'string' &&
    e.duration.length > 0 &&
    typeof e.status === 'string' &&
    validStatuses.includes(e.status as ExamStatus) &&
    (e.totalMarks === undefined || (typeof e.totalMarks === 'number' && e.totalMarks > 0)) &&
    (e.passingMarks === undefined || (typeof e.passingMarks === 'number' && e.passingMarks >= 0))
  );
}

/**
 * Mock exams for demo purposes
 * 
 * ⚠️ NOTE: Dates are relative to current year. In production, replace with API calls.
 */
export const mockExams: Exam[] = (() => {
  const currentYear = new Date().getFullYear();
  const exams: Exam[] = [
    {
      id: '1',
      name: 'Mid-Term Examination',
      class: 'Class 10',
      subject: 'Mathematics',
      date: `${currentYear}-02-20`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Upcoming',
      totalMarks: 100,
      passingMarks: 33,
    },
    {
      id: '2',
      name: 'Mid-Term Examination',
      class: 'Class 10',
      subject: 'Science',
      date: `${currentYear}-02-22`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Upcoming',
      totalMarks: 100,
      passingMarks: 33,
    },
    {
      id: '3',
      name: 'Unit Test',
      class: 'Class 9',
      subject: 'English',
      date: `${currentYear}-02-15`,
      time: '10:00 AM',
      duration: '2 hours',
      status: 'Scheduled',
      totalMarks: 80,
      passingMarks: 26,
    },
    {
      id: '4',
      name: 'Final Examination',
      class: 'Class 12',
      subject: 'Physics',
      date: `${currentYear}-01-10`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Completed',
      totalMarks: 100,
      passingMarks: 33,
    },
    {
      id: '5',
      name: 'Final Examination',
      class: 'Class 12',
      subject: 'Chemistry',
      date: `${currentYear}-01-12`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Completed',
      totalMarks: 100,
      passingMarks: 33,
    },
    {
      id: '6',
      name: 'Unit Test',
      class: 'Class 8',
      subject: 'Mathematics',
      date: `${currentYear}-02-18`,
      time: '10:00 AM',
      duration: '2 hours',
      status: 'Scheduled',
      totalMarks: 80,
      passingMarks: 26,
    },
    {
      id: '7',
      name: 'Mid-Term Examination',
      class: 'Class 11',
      subject: 'Computer Science',
      date: `${currentYear}-02-25`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Upcoming',
      totalMarks: 100,
      passingMarks: 33,
    },
    {
      id: '8',
      name: 'Final Examination',
      class: 'Class 10',
      subject: 'Social Studies',
      date: `${currentYear}-01-08`,
      time: '9:00 AM',
      duration: '3 hours',
      status: 'Completed',
      totalMarks: 100,
      passingMarks: 33,
    },
  ];
  
  // Validate all exams before returning
  return exams.filter(validateExam);
})();
