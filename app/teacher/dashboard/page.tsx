'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GraduationCap, Users, UserCheck, Calendar, FileText, Bell, TrendingUp, CalendarDays, CalendarX, Clock, ChevronLeft, ChevronRight, MapPin, Loader2, AlertTriangle, Link as LinkIcon, MessageSquare, Filter, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
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
  const [dailyAgenda, setDailyAgenda] = useState<DailyAgendaSlot[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [gradeDistribution, setGradeDistribution] = useState<{ aToB: number; cToD: number; belowE: number; passRate: number; total: number } | null>(null);
  const [todos, setTodos] = useState<Array<{ id: string; title: string; description?: string; priority?: string; status?: string; due_date?: string; due_time?: string; category?: string; [key: string]: unknown }>>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
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
          // Set first class as assigned (for backward compatibility with dashboard)
          setAssignedClass(validClasses[0]);
        }
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

      // Fetch daily agenda
      if (teacherId) {
        fetchDailyAgenda(schoolCode, teacherId);
        fetchGradeDistribution(schoolCode, teacherId);
        fetchTodos(schoolCode, teacherId);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
      const response = await fetch(`/api/examinations?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = result.data.filter((exam: Exam) => {
          return (exam.status === 'upcoming' || exam.status === 'ongoing') && exam.end_date && exam.end_date >= today;
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
    const classStudents = students.filter(
      (s) => s.class === assignedClass.class && 
             s.section === assignedClass.section &&
             s.academic_year === assignedClass.academic_year
    );

    return (
      <div className="min-h-screen bg-background space-y-8 p-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
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
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                Welcome, {teacher ? getString(teacher.full_name) || 'Teacher' : 'Teacher'}
              </h1>
              <p className="text-muted-foreground">
                Class Teacher of {getString(assignedClass.class)}-{getString(assignedClass.section)} ({getString(assignedClass.academic_year) || 'N/A'})
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Students Card - Blue */}
          <div className="bg-card rounded-lg p-6 shadow-sm border border-input relative">
            <div className="absolute top-4 right-4">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                {classStudents.length > 0 ? '+' : '0'} Students
              </span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Users className="text-blue-600" size={24} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                <h3 className="text-3xl font-bold text-foreground">{classStudents.length}</h3>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((classStudents.length / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Pending Leave Requests Card - Purple */}
          <div className="bg-card rounded-lg p-6 shadow-sm border border-input relative">
            <div className="absolute top-4 right-4">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                {studentLeaveRequests.length > 0 ? `${studentLeaveRequests.length} New` : 'None'}
              </span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <FileText className="text-purple-600" size={24} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Pending Requests</p>
                <h3 className="text-3xl font-bold text-foreground">{studentLeaveRequests.length}</h3>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((studentLeaveRequests.length / 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Staff Attendance Card - Green */}
          <div className="bg-card rounded-lg p-6 shadow-sm border border-input relative">
            <div className="absolute top-4 right-4">
              <span className={`${
                attendanceStats && attendanceStats.percentage >= 95 
                  ? 'bg-green-100 text-green-700' 
                  : attendanceStats && attendanceStats.percentage >= 80
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              } text-xs px-2 py-1 rounded-full font-medium`}>
                {attendanceStats && attendanceStats.percentage >= 95 
                  ? 'Excellent' 
                  : attendanceStats && attendanceStats.percentage >= 80
                  ? 'Good'
                  : 'Stable'}
              </span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <UserCheck className="text-green-600" size={24} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Staff Attendance</p>
                <h3 className="text-3xl font-bold text-foreground">
                  {attendanceStats ? `${attendanceStats.percentage}%` : '0%'}
                </h3>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-500"
                style={{ width: `${attendanceStats?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Active Notices Card - Orange */}
          <div className="bg-card rounded-lg p-6 shadow-sm border border-input relative">
            <div className="absolute top-4 right-4">
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                {noticesCount > 0 ? 'Active' : 'None'}
              </span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Bell className="text-orange-600" size={24} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Active Notices</p>
                <h3 className="text-3xl font-bold text-foreground">{noticesCount}</h3>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-orange-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((noticesCount / 20) * 100, 100)}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <button
            onClick={() => router.push('/teacher/dashboard/attendance')}
            className="bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar size={20} />
            Mark Attendance
          </button>
          <button
            onClick={() => router.push('/teacher/dashboard/examinations')}
            className="bg-card text-foreground py-3 px-6 rounded-lg font-medium hover:bg-muted border border-input flex items-center justify-center gap-2 transition-colors"
          >
            <FileText size={20} />
            Input Grades
          </button>
          <button
            onClick={() => router.push('/teacher/dashboard/students')}
            className="bg-card text-foreground py-3 px-6 rounded-lg font-medium hover:bg-muted border border-input flex items-center justify-center gap-2 transition-colors"
          >
            <Users size={20} />
            All Students
          </button>
        </motion.div>

        {/* My Timetable Section - 2/3 + 1/3 Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* My Timetable - 2/3 width */}
          <div className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-input p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">My Timetable</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {loadingAgenda ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : dailyAgenda.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-muted-foreground mb-4" size={48} />
                <p className="text-muted-foreground">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyAgenda.map((session) => {
                  const isTodo = session.type === 'todo';
                  const isCurrent = session.status === 'Current' || session.status === 'current';
                  const priorityColors: Record<string, string> = {
                    urgent: 'bg-red-100 text-red-700 border-red-200',
                    high: 'bg-orange-100 text-orange-700 border-orange-200',
                    medium: 'bg-blue-100 text-blue-700 border-blue-200',
                    low: 'bg-gray-100 text-gray-700 border-gray-200',
                  };
                  const priorityColor = priorityColors[session.priority || 'medium'] || priorityColors.medium;
                  
                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isCurrent 
                          ? 'bg-primary/10 border-primary shadow-md' 
                          : isTodo
                          ? 'border-input hover:border-accent'
                          : 'border-input hover:border-primary'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-center min-w-20">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                            {session.time}
                          </p>
                          {session.duration && !isTodo && (
                            <p className="text-xs text-muted-foreground">{session.duration} Min</p>
                          )}
                          {isTodo && session.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor} mt-1 inline-block`}>
                              {session.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                              {session.name}
                            </h3>
                            {isTodo && (
                              <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-0.5 rounded border border-accent/20">
                                To-Do
                              </span>
                            )}
                            {!isTodo && session.status && (
                              <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                                {session.status}
                              </span>
                            )}
                          </div>
                          {!isTodo && session.room && session.class && (
                            <p className={`text-sm flex items-center gap-1 ${isCurrent ? 'text-primary/80' : 'text-muted-foreground'}`}>
                              <MapPin size={14} />
                              {session.room} • {session.class}
                            </p>
                          )}
                          {isTodo && session.category && (
                            <p className="text-sm text-muted-foreground">
                              {session.category}
                            </p>
                          )}
                        </div>
                        {!isTodo && (
                          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                            {isCurrent ? 'View Materials' : 'Start Class'}
                          </button>
                        )}
                        {isTodo && (
                          <button className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Student Alerts */}
            <div className="bg-card rounded-lg shadow-sm border border-input p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="text-destructive" size={20} />
                  Student Alerts
                </h3>
                <span className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-full">
                  {studentLeaveRequests.length} New
                </span>
              </div>
              <div className="space-y-4">
                {studentLeaveRequests.slice(0, 2).map((leave) => {
                  const leaveId = getString(leave.id) || `leave-${Math.random()}`;
                  const studentName = getString(leave.student_name) || 'Student';
      
                  const leaveStartDate = getString(leave.leave_start_date);
                  const leaveEndDate = getString(leave.leave_end_date);
                  const reason = getString(leave.reason) || 'N/A';
                  
                  return (
                    <div key={leaveId} className="border-l-4 border-destructive bg-destructive/5 p-4 rounded">
                      <p className="font-semibold text-foreground text-sm mb-1">{studentName}</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {leaveStartDate && leaveEndDate
                          ? `Absent ${new Date(leaveStartDate).toLocaleDateString()} - ${new Date(leaveEndDate).toLocaleDateString()}`
                          : reason}
                      </p>
                      <div className="flex gap-2">
                        <button className="text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded transition-colors">
                          Call Parent
                        </button>
                        <button className="text-xs text-muted-foreground hover:text-foreground border border-input px-3 py-1.5 rounded transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
                {studentLeaveRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
                )}
              </div>
              <button
                onClick={() => {
                  const schoolCode = teacher ? getString(teacher.school_code) : '';
                  if (schoolCode) {
                    router.push(`/dashboard/${schoolCode}/leave/student`);
                  }
                }}
                className="text-primary text-sm font-medium mt-4 flex items-center gap-1 hover:underline"
              >
                <AlertTriangle size={14} />
                View All Active Alerts
              </button>
            </div>

            {/* Recent Submissions */}
            <div className="bg-card rounded-lg shadow-sm border border-input p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Recent Submissions</h3>
                <button className="text-muted-foreground hover:text-foreground">
                  <Filter size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {/* Placeholder for recent submissions - will be replaced with real data */}
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                  <FileText className="text-blue-500" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Assignment_01.pdf</p>
                    <p className="text-xs text-muted-foreground">Submitted by Student Name • 14m ago</p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <FileText size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                  <LinkIcon className="text-blue-500" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Project Link</p>
                    <p className="text-xs text-muted-foreground">Submitted by Student Name • 1h ago</p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <FileText size={18} />
                  </button>
                </div>
              </div>
              <button className="text-primary text-sm font-medium mt-4 flex items-center gap-1 hover:underline">
                <FileText size={14} />
                Grade All ({studentLeaveRequests.length} Pending)
              </button>
            </div>

            {/* Communication Hub */}
            <div className="bg-primary rounded-lg shadow-sm border border-primary/20 p-6 text-white">
              <h3 className="font-bold mb-2">Communication Hub</h3>
              <p className="text-sm text-white/80 mb-4">
                Instantly reach parents and faculty via SMS, Email, or App notifications.
              </p>
              <div className="flex items-center gap-2 mb-4">
                {/* Avatar cluster - showing first letters of student names from assigned class */}
                <div className="flex -space-x-2">
                  {classStudents.slice(0, 3).map((student, idx) => {
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
                  {classStudents.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs text-white/60">
                      +{classStudents.length - 3}
                    </div>
                  )}
                  {classStudents.length === 0 && (
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
                onClick={() => router.push('/teacher/dashboard/communication')}
                className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors w-full flex items-center justify-center gap-2 mb-4"
              >
                <MessageSquare size={16} />
                New Message
              </button>

              {/* Recent Messages/Notices */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentNotices.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell className="mx-auto text-white/40 mb-2" size={24} />
                    <p className="text-xs text-white/60">No new messages</p>
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
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Grade Distribution */}
          <div className="bg-card rounded-lg shadow-sm border border-input p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Grade Distribution</h3>
              <button className="text-primary text-sm font-medium hover:underline">
                Full Analytics
              </button>
            </div>
            {/* Donut Chart */}
            <div className="flex items-center justify-center my-8">
              <div className="relative w-48 h-48">
                {gradeDistribution && gradeDistribution.total > 0 ? (
                  <>
                    <svg className="transform -rotate-90 w-48 h-48">
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
                        <p className="text-3xl font-bold text-foreground">{gradeDistribution.passRate}%</p>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-600"></div>
                <span className="text-sm text-muted-foreground">
                  A-B ({gradeDistribution?.aToB || 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-muted-foreground">
                  C-D ({gradeDistribution?.cToD || 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
                <span className="text-sm text-muted-foreground">
                  Below E ({gradeDistribution?.belowE || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* To-Do List */}
          <div className="bg-card rounded-lg shadow-sm border border-input p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">My Tasks</h3>
              <button
                onClick={() => setShowAddTodo(!showAddTodo)}
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>

            {/* Add Todo Form */}
            {showAddTodo && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-input">
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto text-muted-foreground mb-3" size={32} />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click &quot;Add Task&quot; to create one</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
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

        {/* My Class Students */}
        <motion.div
          id="class-students"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <UserCheck className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  My Class: {assignedClass.class}-{assignedClass.section}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {classStudents.length} {classStudents.length === 1 ? 'student' : 'students'}
                </p>
              </div>
            </div>
          </div>

          <Card className="glass-card soft-shadow">
            {classStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="mx-auto text-muted-foreground mb-4" size={48} />
                <p className="text-muted-foreground">No students in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-input">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Admission No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Parent Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date of Birth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-input">
                    {classStudents.map((student, index) => {
                      const studentId = getString(student.id) || `student-${index}`;
                      const admissionNo = getString(student.admission_no);
                      const studentName = getString(student.student_name);
                      const parentName = getString(student.parent_name);
                      const parentPhone = getString(student.parent_phone);
                      const dateOfBirth = getString(student.date_of_birth);
                      return (
                        <tr key={studentId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{admissionNo || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{studentName || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{parentName || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {parentPhone || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {dateOfBirth 
                              ? new Date(dateOfBirth).toLocaleDateString()
                              : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Timetable Section */}
        {(() => {
          const schoolCode = teacher ? getString(teacher.school_code) : '';
          const teacherId = teacher ? getString(teacher.id) : '';
          if (schoolCode && teacherId) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <Calendar className="text-primary" size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-foreground">My Timetable</h2>
                </div>
                <TeacherTimetableView
                  schoolCode={schoolCode}
                  teacherId={teacherId}
                />
              </motion.div>
            );
          }
          return null;
        })()}

        {/* Student Leave Requests */}
        {studentLeaveRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-destructive/10 rounded-lg">
                  <CalendarX className="text-destructive" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground">Student Leave Requests</h2>
                  <p className="text-sm text-muted-foreground">
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
    <div className="min-h-screen bg-background space-y-8 p-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
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
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Welcome, {teacher ? getString(teacher.full_name) || 'Teacher' : 'Teacher'}
            </h1>
            <p className="text-muted-foreground">Teacher Dashboard</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Total Students Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card soft-shadow rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg border border-white/20 dark:border-white/10"
          onClick={() => router.push('/teacher/dashboard/students')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-primary/10 rounded-lg">
                  <Users className="text-primary" size={20} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All Students</p>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{students.length}</p>
              <p className="text-xs text-muted-foreground">In school</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Teacher Attendance Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card soft-shadow rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg border border-white/20 dark:border-white/10"
          onClick={() => router.push('/teacher/dashboard/attendance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-accent/10 rounded-lg">
                  <Calendar className="text-accent" size={20} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">My Attendance</p>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {attendanceStats ? `${attendanceStats.percentage}%` : '0%'}
              </p>
              <p className="text-xs text-muted-foreground">
                {attendanceStats && attendanceStats.total > 0 
                  ? `${attendanceStats.present}/${attendanceStats.total} days present` 
                  : 'This month'}
              </p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-accent" />
            </div>
          </div>
        </motion.div>

        {/* Upcoming Exams Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card soft-shadow rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg border border-white/20 dark:border-white/10"
          onClick={() => router.push('/teacher/dashboard/examinations')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-destructive/10 rounded-lg">
                  <FileText className="text-destructive" size={20} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Exams</p>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{upcomingExamsCount}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-destructive" />
            </div>
          </div>
        </motion.div>

        {/* Notices Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="glass-card soft-shadow rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg border border-white/20 dark:border-white/10"
          onClick={() => router.push('/teacher/dashboard/communication')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-accent/10 rounded-lg">
                  <Bell className="text-accent" size={20} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Notices</p>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{noticesCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-accent" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Button
          onClick={() => router.push('/teacher/dashboard/students')}
          variant="primary"
          className="w-full h-20 flex items-center justify-center gap-3"
        >
          <GraduationCap size={24} />
          <div className="text-left">
            <div className="font-semibold">All Students</div>
            <div className="text-sm opacity-90">View all students</div>
          </div>
        </Button>
        <Button
          onClick={() => router.push('/teacher/dashboard/staff')}
          variant="secondary"
          className="w-full h-20 flex items-center justify-center gap-3"
        >
          <Users size={24} />
          <div className="text-left">
            <div className="font-semibold">All Staff</div>
            <div className="text-sm opacity-90">View all staff</div>
          </div>
        </Button>
      </motion.div>

      {/* No Class Assigned Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">No Class Assigned</h3>
            <p className="text-muted-foreground mb-4">
              You are not assigned as a class teacher. Please contact the principal to be assigned to a class.
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
