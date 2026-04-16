'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GraduationCap, Users, UserCheck, Calendar, FileText, Bell, TrendingUp, CalendarDays, CalendarX, Clock, Loader2, AlertTriangle, MessageSquare, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import type { Staff, Student, Class, Exam, Notice } from '@/lib/supabase';
import TeacherTimetableView from '@/components/timetable/TeacherTimetableView';
import { getString } from '@/lib/type-utils';

interface DailyAgendaSlot {
  id: string;
  type?: 'timetable' | 'todo';
  time: string;
  duration?: number;
  name: string;
  room?: string;
  class?: string;
  period_order?: number;
  subject_id?: string;
  class_id?: string;
  status?: string | null;
  priority?: string;
  due_time?: string;
  category?: string;
  tags?: string[];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<{ percentage: number; present: number; total: number } | null>(null);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [noticesCount, setNoticesCount] = useState(0);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [studentLeaveRequests, setStudentLeaveRequests] = useState<Array<{ id: string; [key: string]: unknown }>>([]);
  const [, setDailyAgenda] = useState<DailyAgendaSlot[]>([]);
  const [, setLoadingAgenda] = useState(false);
  const [gradeDistribution, setGradeDistribution] = useState<{ aToB: number; cToD: number; belowE: number; passRate: number; total: number } | null>(null);
  const [todos, setTodos] = useState<Array<{ id: string; title: string; description?: string; priority?: string; status?: string; due_date?: string; due_time?: string; category?: string; [key: string]: unknown }>>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [myClassStudents, setMyClassStudents] = useState<Student[]>([]);
  const [showSchoolTotalInStudentsCard, setShowSchoolTotalInStudentsCard] = useState(false);
  const [assignedClassesFromTimetable, setAssignedClassesFromTimetable] = useState<Array<{ class: string; section: string; academic_year?: string }>>([]);
  interface EventNotification {
    id: string;
    event: {
      title: string;
      description?: string;
      event_date: string;
      event_type: 'event' | 'holiday';
    };
  }
  const [eventNotifications] = useState<EventNotification[]>([]);

  useEffect(() => {
    // Check if teacher is logged in
    const storedTeacher = sessionStorage.getItem('teacher');
    const role = sessionStorage.getItem('role');

    if (!storedTeacher || role !== 'teacher') {
      router.push('/login');
      return;
    }

    try {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchDashboardData(teacherData);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchDashboardData = async (teacherData: Staff) => {
    try {
      const schoolCode = getString(teacherData.school_code);
      if (!schoolCode) {
        return;
      }

      // Fetch students
      const studentsResponse = await fetch(`/api/students?school_code=${schoolCode}`);
      const studentsResult = await studentsResponse.json();
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data);
      }

      // Fetch assigned classes (teacher can be class teacher for multiple classes)
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
        array: 'true', // Request array of classes
      });
      const teacherId = getString(teacherData.id);
      if (teacherId) {
        queryParams.append('teacher_id', teacherId);
      }
      const staffId = getString(teacherData.staff_id);
      if (staffId) {
        queryParams.append('staff_id', staffId);
      }
      
      const assignedClassResponse = await fetch(
        `/api/classes/teacher?${queryParams.toString()}`
      );
      const assignedClassResult = await assignedClassResponse.json();
      
      if (assignedClassResponse.ok && assignedClassResult.data) {
        // Handle both array and single class responses
        const classesData = Array.isArray(assignedClassResult.data) 
          ? assignedClassResult.data 
          : assignedClassResult.data ? [assignedClassResult.data] : [];
        
        // Filter out null/undefined classes
        const validClasses = classesData.filter((cls: Class | null) => cls && cls.class && cls.section);
        
        if (validClasses.length > 0) {
          const firstClass = validClasses[0] as Class;
          setAssignedClass(firstClass);
          fetchMyClassStudents(schoolCode, firstClass);
        } else {
          setMyClassStudents([]);
        }
      } else {
        setMyClassStudents([]);
      }

      // Fetch teacher's personal attendance statistics
      if (teacherId) {
        fetchTeacherAttendanceStats(schoolCode, teacherId);
      }

      // Fetch upcoming exams count
      fetchUpcomingExamsCount(schoolCode);

      // Fetch notices count
      fetchNoticesCount(schoolCode);

      // Fetch event notifications
      fetchEventNotifications(teacherData);

      // Fetch student leave requests for the first assigned class
      if (assignedClassResult.data) {
        // Handle both array and single class responses
        const classesData = Array.isArray(assignedClassResult.data) 
          ? assignedClassResult.data 
          : assignedClassResult.data ? [assignedClassResult.data] : [];
        
        const firstClass = classesData.find((cls: Class | null) => cls && cls.class && cls.section);
        if (firstClass) {
          const className = getString(firstClass.class);
          const section = getString(firstClass.section);
          if (className && section) {
            fetchStudentLeaveRequests(schoolCode, className, section);
          }
        }
      }

      // Fetch daily agenda and timetable-based assigned classes (for all teachers, not just class teachers)
      if (teacherId) {
        fetchDailyAgenda(schoolCode, teacherId);
        fetchGradeDistribution(schoolCode, teacherId);
        fetchTodos(schoolCode, teacherId);
        fetchAssignedSubjects(schoolCode, teacherId);
        fetchAssignedClassesFromTimetable(schoolCode, teacherId);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchAssignedClassesFromTimetable = async (schoolCode: string, teacherId: string) => {
    try {
      const res = await fetch(`/api/timetable/slots?school_code=${encodeURIComponent(schoolCode)}&teacher_id=${encodeURIComponent(teacherId)}`);
      const result = await res.json();
      if (!res.ok || !result.data) {
        setAssignedClassesFromTimetable([]);
        return;
      }
      const slots = result.data as Array<{ class_reference?: { class: string; section: string; academic_year?: string } | null }>;
      const seen = new Set<string>();
      const classes: Array<{ class: string; section: string; academic_year?: string }> = [];
      slots.forEach((slot) => {
        const ref = slot.class_reference;
        if (ref && ref.class != null && ref.section != null) {
          const key = `${ref.class}-${ref.section}`;
          if (!seen.has(key)) {
            seen.add(key);
            classes.push({ class: ref.class, section: ref.section, academic_year: ref.academic_year });
          }
        }
      });
      classes.sort((a, b) => a.class.localeCompare(b.class) || a.section.localeCompare(b.section));
      setAssignedClassesFromTimetable(classes);
    } catch {
      setAssignedClassesFromTimetable([]);
    }
  };

  const fetchGradeDistribution = async (schoolCode: string, teacherId: string) => {
    try {
      const response = await fetch(`/api/teacher/grade-distribution?school_code=${schoolCode}&teacher_id=${teacherId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setGradeDistribution(result.data);
      }
    } catch (err) {
      console.error('Error fetching grade distribution:', err);
    }
  };

  const fetchTodos = async (schoolCode: string, teacherId: string) => {
    try {
      setLoadingTodos(true);
      const response = await fetch(`/api/teacher/todos?school_code=${schoolCode}&teacher_id=${teacherId}&status=pending,in_progress`);
      const result = await response.json();
      if (response.ok && result.data) {
        setTodos(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching todos:', err);
    } finally {
      setLoadingTodos(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim() || !teacher) return;
    
    const schoolCode = getString(teacher.school_code);
    const teacherId = getString(teacher.id);
    if (!schoolCode || !teacherId) return;

    try {
      const response = await fetch('/api/teacher/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          teacher_id: teacherId,
          title: newTodoTitle.trim(),
          status: 'pending',
          priority: 'medium',
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setNewTodoTitle('');
        setShowAddTodo(false);
        fetchTodos(schoolCode, teacherId);
        fetchDailyAgenda(schoolCode, teacherId); // Refresh daily agenda
      } else {
        alert(result.error || 'Failed to add task');
      }
    } catch (err) {
      console.error('Error adding todo:', err);
      alert('Failed to add task. Please try again.');
    }
  };

  const handleToggleTodo = async (todoId: string, currentStatus: string) => {
    if (!teacher) return;
    
    const schoolCode = getString(teacher.school_code);
    const teacherId = getString(teacher.id);
    if (!schoolCode || !teacherId) return;

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`/api/teacher/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTodos(schoolCode, teacherId);
        fetchDailyAgenda(schoolCode, teacherId); // Refresh daily agenda
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to update task');
      }
    } catch (err) {
      console.error('Error updating todo:', err);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!teacher) return;
    
    const schoolCode = getString(teacher.school_code);
    const teacherId = getString(teacher.id);
    if (!schoolCode || !teacherId) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/teacher/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTodos(schoolCode, teacherId);
        fetchDailyAgenda(schoolCode, teacherId); // Refresh daily agenda
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting todo:', err);
      alert('Failed to delete task. Please try again.');
    }
  };

  const fetchDailyAgenda = async (schoolCode: string, teacherId: string) => {
    try {
      setLoadingAgenda(true);
      const response = await fetch(`/api/timetable/daily-agenda?school_code=${schoolCode}&teacher_id=${teacherId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setDailyAgenda(result.data);
      }
    } catch (err) {
      console.error('Error fetching daily agenda:', err);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const fetchTeacherAttendanceStats = async (schoolCode: string, teacherId: string) => {
    try {
      // Get current month's attendance
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      // Get start and end dates for current month
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Fetch staff attendance for the current month
      const response = await fetch(
        `/api/attendance/staff?school_code=${schoolCode}&staff_id=${teacherId}&start_date=${startDate}&end_date=${endDate}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        // Calculate attendance stats for current month
        const attendanceRecords = result.data || [];
        const presentDays = attendanceRecords.filter((record: { status: string }) => 
          record.status === 'present' || record.status === 'half_day'
        ).length;
        const totalWorkingDays = attendanceRecords.length;
        
        // If no records yet, use 0, otherwise calculate percentage
        const percentage = totalWorkingDays > 0 
          ? Math.round((presentDays / totalWorkingDays) * 100)
          : 0;

        setAttendanceStats({
          percentage: percentage,
          present: presentDays,
          total: totalWorkingDays,
        });
      }
    } catch (err) {
      console.error('Error fetching teacher attendance stats:', err);
    }
  };

  const fetchUpcomingExamsCount = async (schoolCode: string) => {
    try {
      if (!teacher) return;
      const teacherId = getString(teacher.id);
      if (!teacherId) return;

      const response = await fetch(`/api/examinations/v2/teacher?school_code=${schoolCode}&teacher_id=${teacherId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = result.data.filter((exam: Exam) => {
          if (!exam.start_date) return false;
          const startDate = new Date(exam.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(exam.end_date || exam.start_date);
          endDate.setHours(0, 0, 0, 0);
          return (exam.status === 'upcoming' || exam.status === 'ongoing') && 
                 (today >= startDate && today <= endDate || today < startDate);
        });
        setUpcomingExamsCount(upcoming.length);
      }
    } catch (err) {
      console.error('Error fetching upcoming exams:', err);
    }
  };

  const fetchNoticesCount = async (schoolCode: string) => {
    try {
      const response = await fetch(
        `/api/communication/notices?school_code=${schoolCode}&status=Active&category=all&priority=all&limit=5`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        const now = new Date();
        interface NoticeWithPublishAt extends Notice {
          publish_at?: string | null;
        }
        const publishedNotices = result.data.filter((notice: NoticeWithPublishAt) => {
          if (!notice.publish_at) return true;
          return new Date(notice.publish_at) <= now;
        });
        setNoticesCount(publishedNotices.length);
        // Store recent notices for Communication Hub (limit to 3 most recent)
        setRecentNotices(publishedNotices.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  const fetchEventNotifications = async (teacherData: Staff) => {
    try {
      const schoolCode = getString(teacherData.school_code);
      const teacherId = getString(teacherData.id);
      if (!schoolCode || !teacherId) {
        return;
      }
      const response = await fetch(
        `/api/calendar/notifications?school_code=${schoolCode}&user_type=teacher&user_id=${teacherId}&unread_only=true`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        // Note: eventNotifications state is currently not used in the UI
        // but keeping the function for future use
      }
    } catch (err) {
      console.error('Error fetching event notifications:', err);
    }
  };

  const fetchAssignedSubjects = async (schoolCode: string, teacherId: string) => {
    try {
      const response = await fetch(`/api/staff-subjects/${teacherId}?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data && result.data.subjects) {
        setAssignedSubjects(result.data.subjects);
      }
    } catch (err) {
      console.error('Error fetching assigned subjects:', err);
    }
  };

  const fetchMyClassStudents = async (schoolCode: string, cls: Class) => {
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        class: getString(cls.class),
        status: 'active',
      });
      if (cls.section) params.append('section', getString(cls.section));
      if (cls.academic_year) params.append('academic_year', getString(cls.academic_year));
      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setMyClassStudents(result.data);
      } else {
        setMyClassStudents([]);
      }
    } catch {
      setMyClassStudents([]);
    }
  };

  const fetchStudentLeaveRequests = async (schoolCode: string, className: string, section: string) => {
    try {
      const response = await fetch(`/api/leave/student-requests?school_code=${schoolCode}&status=pending`);
      const result = await response.json();
      if (response.ok && result.data) {
        // Filter leave requests for students in this class
        interface LeaveRequest {
          id: string;
          student_id: string;
          class?: string;
          section?: string;
          student_name?: string;
          admission_no?: string;
          leave_type?: string;
          leave_start_date?: string;
          leave_end_date?: string;
          reason?: string;
          [key: string]: unknown;
        }
        const classLeaves = result.data.filter((leave: LeaveRequest) => {
          const leaveClass = getString(leave.class);
          const leaveSection = getString(leave.section);
          return leaveClass === className && leaveSection === section;
        });
        setStudentLeaveRequests(classLeaves.slice(0, 5)); // Show latest 5
      }
    } catch (err) {
      console.error('Error fetching student leave requests:', err);
    }
  };

  if (loading || !teacher) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If assigned class exists, show home page with class students
  if (assignedClass) {
    return (
      <div className="min-h-screen bg-background space-y-4 p-4 md:p-5">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            {(() => {
              const photoUrl = teacher ? getString(teacher.photo_url) : '';
              const fullName = teacher ? getString(teacher.full_name) : '';
              if (photoUrl) {
                return (
                  <Image
                    src={photoUrl}
                    alt={fullName || 'Teacher'}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-input soft-shadow"
                  />
                );
              }
              return (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl soft-shadow">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'T'}
                </div>
              );
            })()}
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-1">
                Welcome, {teacher ? getString(teacher.full_name) || 'Teacher' : 'Teacher'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Class Teacher of {getString(assignedClass.class)}-{getString(assignedClass.section)} ({getString(assignedClass.academic_year) || 'N/A'})
              </p>
              {assignedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-xs text-muted-foreground">Teaching:</span>
                  {assignedSubjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="text-xs px-2 py-1 rounded-full text-white font-medium"
                      style={{ backgroundColor: subject.color || '#6B7280' }}
                    >
                      {subject.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stat cards: compact equal height on md+ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 md:items-stretch"
        >
          {/* Students: default My Class, toggle to school total */}
          <div className="bg-card rounded-lg p-3 shadow-sm border border-input flex flex-col w-full md:h-36 min-h-0 overflow-hidden">
            <div className="w-9 h-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0 mb-2">
              <Users className="text-blue-600" size={20} />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1 shrink-0">Students</p>
            <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
              <div
                className="shrink-0 flex items-center justify-between rounded-md border border-input/60 bg-muted/30 px-2.5 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push('/teacher/dashboard/students')}
                onKeyDown={(e) => e.key === 'Enter' && router.push('/teacher/dashboard/students')}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{showSchoolTotalInStudentsCard ? 'All (school)' : 'My class'}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums leading-tight">
                    {showSchoolTotalInStudentsCard ? students.length : myClassStudents.length}
                  </p>
                </div>
                <p className="text-[10px] text-primary font-medium shrink-0">View →</p>
              </div>
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolTotalInStudentsCard((prev) => !prev)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-input bg-background hover:bg-muted transition-colors"
                >
                  {showSchoolTotalInStudentsCard ? 'My class' : 'Total'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/teacher/dashboard/my-class')}
                  className="text-[10px] text-primary font-medium hover:underline"
                >
                  Class →
                </button>
              </div>
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div className="bg-card rounded-lg p-3 shadow-sm border border-input relative flex flex-col w-full md:h-36 min-h-0 overflow-hidden">
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {studentLeaveRequests.length > 0 ? `${studentLeaveRequests.length} New` : 'None'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md bg-purple-100 flex items-center justify-center shrink-0 mb-2">
              <FileText className="text-purple-600" size={20} />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1 pr-14">Pending requests</p>
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              <h3 className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                {studentLeaveRequests.length}
              </h3>
              <div className="pt-1">
                <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((studentLeaveRequests.length / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Staff Attendance */}
          <div className="bg-card rounded-lg p-3 shadow-sm border border-input relative flex flex-col w-full md:h-36 min-h-0 overflow-hidden">
            <div className="absolute top-3 right-3 z-10">
              <span className={`${
                attendanceStats && attendanceStats.percentage >= 95 
                  ? 'bg-green-100 text-green-700' 
                  : attendanceStats && attendanceStats.percentage >= 80
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              } text-[10px] px-1.5 py-0.5 rounded-full font-medium`}>
                {attendanceStats && attendanceStats.percentage >= 95 
                  ? 'Excellent' 
                  : attendanceStats && attendanceStats.percentage >= 80
                  ? 'Good'
                  : 'Stable'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md bg-green-100 flex items-center justify-center shrink-0 mb-2">
              <UserCheck className="text-green-600" size={20} />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1 pr-14">Staff attendance</p>
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              <h3 className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                {attendanceStats ? `${attendanceStats.percentage}%` : '0%'}
              </h3>
              <div className="pt-1">
                <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${attendanceStats?.percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Notices */}
          <div className="bg-card rounded-lg p-3 shadow-sm border border-input relative flex flex-col w-full md:h-36 min-h-0 overflow-hidden">
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {noticesCount > 0 ? 'Active' : 'None'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md bg-orange-100 flex items-center justify-center shrink-0 mb-2">
              <Bell className="text-orange-600" size={20} />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1 pr-14">Active notices</p>
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              <h3 className="text-2xl font-bold text-foreground tabular-nums leading-tight">{noticesCount}</h3>
              <div className="pt-1">
                <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-orange-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((noticesCount / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`grid gap-2 mb-4 ${assignedClass ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}
        >
          <button
            onClick={() => router.push('/teacher/dashboard/attendance')}
            className="bg-primary text-primary-foreground py-2 px-3 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar size={18} />
            Mark Attendance
          </button>
          <button
            onClick={() => router.push('/teacher/dashboard/examinations')}
            className="bg-card text-foreground py-2 px-3 rounded-md text-sm font-medium hover:bg-muted border border-input flex items-center justify-center gap-2 transition-colors"
          >
            <FileText size={18} />
            Input Grades
          </button>
          <button
            onClick={() => router.push('/teacher/dashboard/students')}
            className="bg-card text-foreground py-2 px-3 rounded-md text-sm font-medium hover:bg-muted border border-input flex items-center justify-center gap-2 transition-colors"
          >
            <Users size={18} />
            All Students
          </button>
          {assignedClass && (
            <button
              onClick={() => router.push('/teacher/dashboard/my-class')}
              className="bg-card text-foreground py-2 px-3 rounded-md text-sm font-medium hover:bg-muted border border-input flex items-center justify-center gap-2 transition-colors"
            >
              <UserCheck size={18} />
              My Class
            </button>
          )}
        </motion.div>

        {/* My Timetable Section - 2/3 + 1/3 Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* My Timetable - 2/3 width */}
          <div className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-input p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">My Timetable</h2>
                <p className="text-xs text-muted-foreground">Weekly schedule</p>
              </div>
            </div>

            {(() => {
              const schoolCode = teacher ? getString(teacher.school_code) : '';
              const teacherId = teacher ? getString(teacher.id) : '';
              if (schoolCode && teacherId) {
                return (
                  <TeacherTimetableView
                    schoolCode={schoolCode}
                    teacherId={teacherId}
                  />
                );
              }
              return (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-muted-foreground mb-2" size={36} />
                  <p className="text-sm text-muted-foreground">No timetable available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your timetable has not been assigned yet
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Right Sidebar - 1/3 width */}
          <div className="space-y-3">
            {/* Student Alerts */}
            <div className="bg-card rounded-lg shadow-sm border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="text-destructive" size={16} />
                  Student Alerts
                </h3>
                <span className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0.5 rounded-full">
                  {studentLeaveRequests.length} New
                </span>
              </div>
              <div className="space-y-2">
                {studentLeaveRequests.slice(0, 2).map((leave) => {
                  const leaveId = getString(leave.id) || `leave-${Math.random()}`;
                  const studentName = getString(leave.student_name) || 'Student';
      
                  const leaveStartDate = getString(leave.leave_start_date);
                  const leaveEndDate = getString(leave.leave_end_date);
                  const reason = getString(leave.reason) || 'N/A';
                  
                  return (
                    <div key={leaveId} className="border-l-4 border-destructive bg-destructive/5 p-2.5 rounded-md">
                      <p className="font-semibold text-foreground text-xs mb-0.5">{studentName}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {leaveStartDate && leaveEndDate
                          ? `Absent ${new Date(leaveStartDate).toLocaleDateString()} - ${new Date(leaveEndDate).toLocaleDateString()}`
                          : reason}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        <button type="button" className="text-[10px] text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors">
                          Call Parent
                        </button>
                        <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground border border-input px-2 py-1 rounded transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
                {studentLeaveRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No active alerts</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const schoolCode = teacher ? getString(teacher.school_code) : '';
                  if (schoolCode) {
                    router.push(`/dashboard/${schoolCode}/leave/student`);
                  }
                }}
                className="text-primary text-xs font-medium mt-2 flex items-center gap-1 hover:underline"
              >
                <AlertTriangle size={12} />
                View all alerts
              </button>
            </div>

            {/* Communication Hub */}
            <div className="bg-primary rounded-lg shadow-sm border border-primary/20 p-4 text-white">
              <h3 className="text-sm font-bold mb-1">Communication Hub</h3>
              <p className="text-xs text-white/80 mb-3">
                Instantly reach parents and faculty via SMS, Email, or App notifications.
              </p>
              <div className="flex items-center gap-2 mb-3">
                {/* Avatar cluster - showing first letters of student names from assigned class */}
                <div className="flex -space-x-2">
                  {myClassStudents.slice(0, 3).map((student, idx) => {
                    const studentName = getString(student.student_name) || getString(student.first_name) || 'A';
                    const initial = studentName.charAt(0).toUpperCase();
                    return (
                      <div
                        key={student.id || idx}
                        className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs font-medium"
                        title={studentName}
                      >
                        {initial}
                      </div>
                    );
                  })}
                  {myClassStudents.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs text-white/60">
                      +{myClassStudents.length - 3}
                    </div>
                  )}
                  {myClassStudents.length === 0 && (
                    <>
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs font-medium">
                        A
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs font-medium">
                        B
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs font-medium">
                        C
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs text-white/60">
                        +12
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/teacher/dashboard/communication')}
                className="bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-accent/90 transition-colors w-full flex items-center justify-center gap-1.5 mb-3"
              >
                <MessageSquare size={16} />
                New Message
              </button>

              {/* Recent Messages/Notices */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {recentNotices.length === 0 ? (
                  <div className="text-center py-3">
                    <Bell className="mx-auto text-white/40 mb-1" size={20} />
                    <p className="text-[10px] text-white/60">No new messages</p>
                  </div>
                ) : (
                  recentNotices.map((notice) => {
                    const noticeTitle = getString(notice.title);
                    const noticeContent = getString(notice.content);
                    const noticeDate = notice.created_at ? new Date(notice.created_at) : null;
                    const priorityColors: Record<string, string> = {
                      High: 'bg-red-500/20 text-red-200 border-red-300/30',
                      Medium: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
                      Low: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
                    };
                    const priorityColor = priorityColors[getString(notice.priority) || 'Low'] || priorityColors.Low;

                    return (
                      <div
                        key={notice.id}
                        className="bg-white/10 backdrop-blur-sm rounded-md p-2 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                        onClick={() => router.push('/teacher/dashboard/communication')}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white line-clamp-1 flex-1">
                            {noticeTitle}
                          </h4>
                          {notice.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor} flex-shrink-0`}>
                              {getString(notice.priority)}
                            </span>
                          )}
                        </div>
                        {noticeContent && (
                          <p className="text-xs text-white/80 line-clamp-2 mb-2">
                            {noticeContent}
                          </p>
                        )}
                        {noticeDate && (
                          <p className="text-xs text-white/60">
                            {noticeDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
                {recentNotices.length > 0 && noticesCount > 3 && (
                  <button
                    onClick={() => router.push('/teacher/dashboard/communication')}
                    className="w-full text-xs text-white/80 hover:text-white underline text-center pt-2"
                  >
                    View all {noticesCount} messages
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grade Distribution & To-Do List Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Grade Distribution */}
          <div className="bg-card rounded-lg shadow-sm border border-input p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Grade Distribution</h3>
              <button type="button" className="text-primary text-xs font-medium hover:underline">
                Full Analytics
              </button>
            </div>
            {/* Donut Chart */}
            <div className="flex items-center justify-center my-4">
              <div className="relative w-36 h-36">
                {gradeDistribution && gradeDistribution.total > 0 ? (
                  <>
                    <svg className="transform -rotate-90 w-36 h-36 shrink-0" viewBox="0 0 192 192">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="16"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="16"
                        strokeDasharray={`${2 * Math.PI * 80 * (gradeDistribution.aToB / 100)} ${2 * Math.PI * 80}`}
                        strokeDashoffset={0}
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="16"
                        strokeDasharray={`${2 * Math.PI * 80 * (gradeDistribution.cToD / 100)} ${2 * Math.PI * 80}`}
                        strokeDashoffset={2 * Math.PI * 80 * (gradeDistribution.aToB / 100) * -1}
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="16"
                        strokeDasharray={`${2 * Math.PI * 80 * (gradeDistribution.belowE / 100)} ${2 * Math.PI * 80}`}
                        strokeDashoffset={2 * Math.PI * 80 * ((gradeDistribution.aToB + gradeDistribution.cToD) / 100) * -1}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground tabular-nums">{gradeDistribution.passRate}%</p>
                        <p className="text-xs text-muted-foreground">PASS RATE</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                      <p className="text-xs text-muted-foreground">No data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Legend */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  A-B ({gradeDistribution?.aToB || 0}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  C-D ({gradeDistribution?.cToD || 0}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-500 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Below E ({gradeDistribution?.belowE || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* To-Do List */}
          <div className="bg-card rounded-lg shadow-sm border border-input p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">My Tasks</h3>
              <button
                type="button"
                onClick={() => setShowAddTodo(!showAddTodo)}
                className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>

            {/* Add Todo Form */}
            {showAddTodo && (
              <div className="mb-2 p-2 bg-muted/30 rounded-md border border-input">
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTodo();
                    }
                  }}
                  placeholder="Enter task title..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 mb-2"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowAddTodo(false);
                      setNewTodoTitle('');
                    }}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTodo}
                    disabled={!newTodoTitle.trim()}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Todos List */}
            {loadingTodos ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="mx-auto text-muted-foreground mb-2" size={28} />
                <p className="text-xs text-muted-foreground">No tasks yet</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Add a task to get started</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {todos.map((todo) => {
                  const isCompleted = todo.status === 'completed';
                  const priorityColors: Record<string, string> = {
                    urgent: 'bg-red-100 text-red-700 border-red-200',
                    high: 'bg-orange-100 text-orange-700 border-orange-200',
                    medium: 'bg-blue-100 text-blue-700 border-blue-200',
                    low: 'bg-gray-100 text-gray-700 border-gray-200',
                  };
                  const priorityColor = priorityColors[todo.priority || 'medium'] || priorityColors.medium;

                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-2 p-2 rounded-md border transition-colors ${
                        isCompleted
                          ? 'bg-muted/30 border-input opacity-75'
                          : 'bg-background border-input hover:border-accent'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo.id, todo.status || 'pending')}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                        title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {isCompleted ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {getString(todo.title)}
                        </p>
                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {getString(todo.description)}
                          </p>
                        )}
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(getString(todo.due_date)).toLocaleDateString()}
                          </p>
                        )}
                        {todo.priority && (
                          <span
                            className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor}`}
                          >
                            {getString(todo.priority).charAt(0).toUpperCase() + getString(todo.priority).slice(1)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-muted-foreground hover:text-red-600 transition-colors mt-0.5"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>


        {/* Student Leave Requests */}
        {studentLeaveRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-destructive/10 rounded-md">
                  <CalendarX className="text-destructive" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">Student Leave Requests</h2>
                  <p className="text-xs text-muted-foreground">
                    {studentLeaveRequests.length} pending {studentLeaveRequests.length === 1 ? 'request' : 'requests'}
                  </p>
                </div>
              </div>
            </div>
            <Card className="glass-card soft-shadow">
              <div className="space-y-3">
                {studentLeaveRequests.map((leave) => {
                  const leaveId = getString(leave.id) || `leave-${Math.random()}`;
                  const studentName = getString(leave.student_name) || 'Student';
                  const admissionNo = getString(leave.admission_no) || 'N/A';
                  const leaveClass = getString(leave.class) || 'N/A';
                  const leaveSection = getString(leave.section) || 'N/A';
                  const leaveType = getString(leave.leave_type) || 'Leave';
                  const leaveStartDate = getString(leave.leave_start_date);
                  const leaveEndDate = getString(leave.leave_end_date);
                  const reason = getString(leave.reason) || 'N/A';
                  
                  return (
                    <div
                      key={leaveId}
                      className="p-4 glass-card soft-shadow rounded-lg border border-input hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{studentName}</p>
                              <p className="text-xs text-muted-foreground">{admissionNo} • {leaveClass}-{leaveSection}</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              {leaveType}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                              <Clock size={12} className="mr-1" />
                              Pending
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                            <div>
                              <p className="text-muted-foreground mb-1">Start Date</p>
                              <p className="font-medium text-foreground">
                                {leaveStartDate ? new Date(leaveStartDate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">End Date</p>
                              <p className="font-medium text-foreground">
                                {leaveEndDate ? new Date(leaveEndDate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Reason</p>
                              <p className="font-medium text-foreground truncate">{reason}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-input">
                <Button
                  onClick={() => {
                    const schoolCode = teacher ? getString(teacher.school_code) : '';
                    if (schoolCode) {
                      router.push(`/dashboard/${schoolCode}/leave/student`);
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  View All Leave Requests
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Event Notifications */}
        {eventNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="glass-card soft-shadow">
              <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                <CalendarDays size={20} className="text-primary" />
                New Events & Holidays
              </h2>
              <div className="space-y-3">
                {eventNotifications.slice(0, 5).map((notification: EventNotification) => {
                  const event = notification.event;
                  if (!event) return null;
                  const eventDate = getString(event.event_date);
                  const eventTitle = getString(event.title);
                  const eventDescription = getString(event.description);
                  const eventType = getString(event.event_type);
                  return (
                    <div
                      key={notification.id}
                      className="p-3 bg-accent/5 border border-accent/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              eventType === 'holiday' 
                                ? 'bg-accent/10 text-accent border border-accent/20' 
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {eventType === 'holiday' ? 'Holiday' : 'Event'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {eventDate ? new Date(eventDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{eventTitle || 'Event'}</h3>
                          {eventDescription && (
                            <p className="text-sm text-muted-foreground mt-1">{eventDescription}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    );
  }

  // If no assigned class, show message
  return (
    <div className="min-h-screen bg-background space-y-4 p-4 md:p-5">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          {(() => {
            const photoUrl = teacher ? getString(teacher.photo_url) : '';
            const fullName = teacher ? getString(teacher.full_name) : '';
            if (photoUrl) {
              return (
                <Image
                  src={photoUrl}
                  alt={fullName || 'Teacher'}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-input soft-shadow"
                />
              );
            }
            return (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl soft-shadow">
                {fullName ? fullName.charAt(0).toUpperCase() : 'T'}
              </div>
            );
          })()}
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-1">
              Welcome, {teacher ? getString(teacher.full_name) || 'Teacher' : 'Teacher'}
            </h1>
            <p className="text-sm text-muted-foreground">Teacher Dashboard</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards — equal fixed height on md+ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:items-stretch"
      >
        {/* Total Students Card */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card soft-shadow rounded-lg p-4 cursor-pointer transition-all hover:shadow-md border border-white/20 dark:border-white/10 md:h-36 flex flex-col justify-between"
          onClick={() => router.push('/teacher/dashboard/students')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Users className="text-primary" size={18} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">All Students</p>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{students.length}</p>
              <p className="text-[10px] text-muted-foreground">In school</p>
            </div>
            <div className="opacity-[0.08] shrink-0 hidden sm:block">
              <TrendingUp size={36} className="text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Teacher Attendance Card */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card soft-shadow rounded-lg p-4 cursor-pointer transition-all hover:shadow-md border border-white/20 dark:border-white/10 md:h-36 flex flex-col justify-between"
          onClick={() => router.push('/teacher/dashboard/attendance')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-accent/10 rounded-md">
                  <Calendar className="text-accent" size={18} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">My Attendance</p>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                {attendanceStats ? `${attendanceStats.percentage}%` : '0%'}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {attendanceStats && attendanceStats.total > 0 
                  ? `${attendanceStats.present}/${attendanceStats.total} days present` 
                  : 'This month'}
              </p>
            </div>
            <div className="opacity-[0.08] shrink-0 hidden sm:block">
              <TrendingUp size={36} className="text-accent" />
            </div>
          </div>
        </motion.div>

        {/* Upcoming Exams Card */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card soft-shadow rounded-lg p-4 cursor-pointer transition-all hover:shadow-md border border-white/20 dark:border-white/10 md:h-36 flex flex-col justify-between"
          onClick={() => router.push('/teacher/dashboard/examinations')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-destructive/10 rounded-md">
                  <FileText className="text-destructive" size={18} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Upcoming Exams</p>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{upcomingExamsCount}</p>
              <p className="text-[10px] text-muted-foreground">Scheduled</p>
            </div>
            <div className="opacity-[0.08] shrink-0 hidden sm:block">
              <TrendingUp size={36} className="text-destructive" />
            </div>
          </div>
        </motion.div>

        {/* Notices Card */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card soft-shadow rounded-lg p-4 cursor-pointer transition-all hover:shadow-md border border-white/20 dark:border-white/10 md:h-36 flex flex-col justify-between"
          onClick={() => router.push('/teacher/dashboard/communication')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-accent/10 rounded-md">
                  <Bell className="text-accent" size={18} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Notices</p>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{noticesCount}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <div className="opacity-[0.08] shrink-0 hidden sm:block">
              <TrendingUp size={36} className="text-accent" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
      >
        <Button
          onClick={() => router.push('/teacher/dashboard/students')}
          variant="primary"
          className="w-full min-h-[3.25rem] py-2 px-3 flex items-center justify-center gap-2 text-sm"
        >
          <GraduationCap size={20} />
          <div className="text-left">
            <div className="font-semibold leading-tight">All Students</div>
            <div className="text-xs opacity-90">View all students</div>
          </div>
        </Button>
        <Button
          onClick={() => router.push('/teacher/dashboard/staff')}
          variant="secondary"
          className="w-full min-h-[3.25rem] py-2 px-3 flex items-center justify-center gap-2 text-sm"
        >
          <Users size={20} />
          <div className="text-left">
            <div className="font-semibold leading-tight">All Staff</div>
            <div className="text-xs opacity-90">View all staff</div>
          </div>
        </Button>
      </motion.div>

      {/* My Timetable - shown for all teachers (including non-class teachers) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-input p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">My Timetable</h2>
              <p className="text-xs text-muted-foreground">Weekly schedule</p>
            </div>
          </div>
          {teacher && getString(teacher.school_code) && getString(teacher.id) ? (
            <TeacherTimetableView
              schoolCode={getString(teacher.school_code)}
              teacherId={getString(teacher.id)}
            />
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-muted-foreground mb-2" size={36} />
              <p className="text-sm text-muted-foreground">No timetable available</p>
            </div>
          )}
        </div>

        {/* Assigned classes from timetable */}
        <div className="space-y-3">
          <div className="bg-card rounded-lg shadow-sm border border-input p-4">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
              <CalendarDays size={16} />
              Classes you teach
            </h3>
            <p className="text-xs text-muted-foreground mb-2">From your timetable</p>
            {assignedClassesFromTimetable.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes assigned in timetable yet.</p>
            ) : (
              <ul className="space-y-2">
                {assignedClassesFromTimetable.map((c, idx) => (
                  <li key={`${c.class}-${c.section}-${idx}`} className="text-sm font-medium text-foreground">
                    {c.class}-{c.section}
                    {c.academic_year && <span className="text-muted-foreground ml-1">({c.academic_year})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>

      {/* No Class Teacher Message - only inform, don't hide timetable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card soft-shadow">
          <div className="text-center py-5 px-2">
            <UserCheck className="mx-auto text-muted-foreground mb-2" size={32} />
            <h3 className="text-base font-serif font-bold text-foreground mb-1">Not a class teacher</h3>
            <p className="text-xs text-muted-foreground">
              You are not assigned as a class teacher. Contact the principal if you need class teacher access (e.g. My Class, Mark Attendance).
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Event Notifications */}
      {eventNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card soft-shadow">
            <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
              <CalendarDays size={20} className="text-primary" />
              New Events & Holidays
            </h2>
            <div className="space-y-3">
              {eventNotifications.slice(0, 5).map((notification: EventNotification) => {
                const event = notification.event;
                if (!event) return null;
                const eventDate = getString(event.event_date);
                const eventTitle = getString(event.title);
                const eventDescription = getString(event.description);
                const eventType = getString(event.event_type);
                return (
                  <div
                    key={notification.id}
                    className="p-3 bg-accent/5 border border-accent/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            eventType === 'holiday' 
                              ? 'bg-accent/10 text-accent border border-accent/20' 
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {eventType === 'holiday' ? 'Holiday' : 'Event'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {eventDate ? new Date(eventDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground">{eventTitle || 'Event'}</h3>
                        {eventDescription && (
                          <p className="text-sm text-muted-foreground mt-1">{eventDescription}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
