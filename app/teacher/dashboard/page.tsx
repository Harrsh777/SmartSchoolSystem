'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GraduationCap, Users, UserCheck, Calendar, FileText, Bell, TrendingUp, CalendarDays, CalendarX, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Staff, Student, Class, Exam, Notice } from '@/lib/supabase';
import TimetableView from '@/components/timetable/TimetableView';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<{ percentage: number; present: number; total: number } | null>(null);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [noticesCount, setNoticesCount] = useState(0);
  const [studentLeaveRequests, setStudentLeaveRequests] = useState<any[]>([]);
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
      // Fetch students
      const studentsResponse = await fetch(`/api/students?school_code=${teacherData.school_code}`);
      const studentsResult = await studentsResponse.json();
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data);
      }

      // Fetch assigned class (if teacher is a class teacher)
      // Pass both teacher_id and staff_id to check both fields
      const queryParams = new URLSearchParams({
        school_code: teacherData.school_code,
      });
      if (teacherData.id) {
        queryParams.append('teacher_id', teacherData.id);
      }
      if (teacherData.staff_id) {
        queryParams.append('staff_id', teacherData.staff_id);
      }
      
      const assignedClassResponse = await fetch(
        `/api/classes/teacher?${queryParams.toString()}`
      );
      const assignedClassResult = await assignedClassResponse.json();
      
      if (assignedClassResponse.ok && assignedClassResult.data) {
        setAssignedClass(assignedClassResult.data);
        
        // Fetch attendance statistics for the class
        fetchAttendanceStats(teacherData.school_code, assignedClassResult.data.id);
      }

      // Fetch upcoming exams count
      fetchUpcomingExamsCount(teacherData.school_code);

      // Fetch notices count
      fetchNoticesCount(teacherData.school_code);

      // Fetch event notifications
      fetchEventNotifications(teacherData);

      // Fetch student leave requests for the class
      if (assignedClassResult.data) {
        fetchStudentLeaveRequests(teacherData.school_code, assignedClassResult.data.class, assignedClassResult.data.section);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchAttendanceStats = async (schoolCode: string, classId: string) => {
    try {
      const response = await fetch(
        `/api/attendance/class-stats?school_code=${schoolCode}&class_id=${classId}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setAttendanceStats({
          percentage: result.data.percentage,
          present: result.data.present,
          total: result.data.total,
        });
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
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
        `/api/communication/notices?school_code=${schoolCode}&status=Active&category=all&priority=all`
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
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  const fetchEventNotifications = async (teacherData: Staff) => {
    try {
      const response = await fetch(
        `/api/calendar/notifications?school_code=${teacherData.school_code}&user_type=teacher&user_id=${teacherData.id}&unread_only=true`
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
        const classLeaves = result.data.filter((leave: any) => 
          leave.class === className && leave.section === section
        );
        setStudentLeaveRequests(classLeaves.slice(0, 5)); // Show latest 5
      }
    } catch (err) {
      console.error('Error fetching student leave requests:', err);
    }
  };

  if (loading || !teacher) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              Welcome, {teacher?.full_name}
            </h1>
            <p className="text-gray-600">
              Class Teacher of {assignedClass.class}-{assignedClass.section} ({assignedClass.academic_year})
            </p>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Total Students Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              // Scroll to students section or navigate
              const element = document.getElementById('class-students');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Total Students</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{classStudents.length}</p>
                <p className="text-xs text-gray-500 mt-1">In my class</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Attendance Statistics Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/teacher/dashboard/attendance')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="text-green-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Attendance</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {attendanceStats ? `${attendanceStats.percentage}%` : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {attendanceStats ? `${attendanceStats.present}/${attendanceStats.total} present` : 'No data'}
                </p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-green-600" />
              </div>
            </div>
          </Card>

          {/* Upcoming Exams Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/teacher/dashboard/examinations')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileText className="text-red-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Upcoming Exams</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{upcomingExamsCount}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-red-600" />
              </div>
            </div>
          </Card>

          {/* Notices Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/teacher/dashboard/communication')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Bell className="text-purple-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Notices</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{noticesCount}</p>
                <p className="text-xs text-gray-500 mt-1">Active</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-purple-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Button
            onClick={() => router.push('/teacher/dashboard/students')}
            className="w-full h-20 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            <GraduationCap size={24} />
            <div className="text-left">
              <div className="font-semibold">All Students</div>
              <div className="text-sm opacity-90">View all students</div>
            </div>
          </Button>
          <Button
            onClick={() => router.push('/teacher/dashboard/staff')}
            className="w-full h-20 flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <Users size={24} />
            <div className="text-left">
              <div className="font-semibold">All Staff</div>
              <div className="text-sm opacity-90">View all staff</div>
            </div>
          </Button>
        </motion.div>

        {/* My Class Students */}
        <motion.div
          id="class-students"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserCheck className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  My Class: {assignedClass.class}-{assignedClass.section}
                </h2>
                <p className="text-sm text-gray-600">
                  {classStudents.length} {classStudents.length === 1 ? 'student' : 'students'}
                </p>
              </div>
            </div>
          </div>

          <Card>
            {classStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">No students in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date of Birth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.admission_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{student.student_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.parent_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {student.parent_phone || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {student.date_of_birth 
                            ? new Date(student.date_of_birth).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Timetable Section */}
        {assignedClass.id && teacher && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Class Timetable</h2>
            </div>
            <Card>
              <TimetableView
                schoolCode={teacher.school_code}
                classId={assignedClass.id}
              />
            </Card>
          </motion.div>
        )}

        {/* Student Leave Requests */}
        {studentLeaveRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CalendarX className="text-orange-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Student Leave Requests</h2>
                  <p className="text-sm text-gray-600">
                    {studentLeaveRequests.length} pending {studentLeaveRequests.length === 1 ? 'request' : 'requests'}
                  </p>
                </div>
              </div>
            </div>
            <Card>
              <div className="space-y-3">
                {studentLeaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold text-sm">
                            {leave.student_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{leave.student_name}</p>
                            <p className="text-xs text-gray-600">{leave.admission_no} • {leave.class}-{leave.section}</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF1FF] text-[#2F6FED] border border-[#DBEAFE]">
                            {leave.leave_type}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock size={12} className="mr-1" />
                            Pending
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-gray-600 mb-1">Start Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(leave.leave_start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">End Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(leave.leave_end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Reason</p>
                            <p className="font-medium text-gray-900 truncate">{leave.reason || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => router.push(`/dashboard/${teacher?.school_code}/leave/student`)}
                  variant="outline"
                  className="w-full border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
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
            transition={{ delay: 0.5 }}
          >
            <Card>
              <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                <CalendarDays size={20} />
                New Events & Holidays
              </h2>
              <div className="space-y-3">
                {eventNotifications.slice(0, 5).map((notification: EventNotification) => {
                  const event = notification.event;
                  if (!event) return null;
                  return (
                    <div
                      key={notification.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              event.event_type === 'holiday' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {event.event_type === 'holiday' ? 'Holiday' : 'Event'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(event.event_date).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">
            Welcome, {teacher?.full_name}
          </h1>
          <p className="text-gray-600">Teacher Dashboard</p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Students Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/teacher/dashboard/students')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-blue-600" size={20} />
                </div>
                <p className="text-sm text-gray-600">All Students</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
              <p className="text-xs text-gray-500 mt-1">In school</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Attendance Statistics Card - Disabled for non-class teachers */}
        <Card className="opacity-60">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="text-gray-400" size={20} />
                </div>
                <p className="text-sm text-gray-600">Attendance</p>
              </div>
              <p className="text-3xl font-bold text-gray-400">N/A</p>
              <p className="text-xs text-gray-500 mt-1">Not a class teacher</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-gray-400" />
            </div>
          </div>
        </Card>

        {/* Upcoming Exams Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/teacher/dashboard/examinations')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="text-red-600" size={20} />
                </div>
                <p className="text-sm text-gray-600">Upcoming Exams</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{upcomingExamsCount}</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-red-600" />
            </div>
          </div>
        </Card>

        {/* Notices Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/teacher/dashboard/communication')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bell className="text-purple-600" size={20} />
                </div>
                <p className="text-sm text-gray-600">Notices</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{noticesCount}</p>
              <p className="text-xs text-gray-500 mt-1">Active</p>
            </div>
            <div className="opacity-10">
              <TrendingUp size={48} className="text-purple-600" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Button
          onClick={() => router.push('/teacher/dashboard/students')}
          className="w-full h-20 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
        >
          <GraduationCap size={24} />
          <div className="text-left">
            <div className="font-semibold">All Students</div>
            <div className="text-sm opacity-90">View all students</div>
          </div>
        </Button>
        <Button
          onClick={() => router.push('/teacher/dashboard/staff')}
          className="w-full h-20 flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
        transition={{ delay: 0.2 }}
      >
        <Card>
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Class Assigned</h3>
            <p className="text-gray-600 mb-4">
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
          transition={{ delay: 0.3 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <CalendarDays size={20} />
              New Events & Holidays
            </h2>
            <div className="space-y-3">
              {eventNotifications.slice(0, 5).map((notification: EventNotification) => {
                const event = notification.event;
                if (!event) return null;
                return (
                  <div
                    key={notification.id}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            event.event_type === 'holiday' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.event_type === 'holiday' ? 'Holiday' : 'Event'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(event.event_date).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
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
