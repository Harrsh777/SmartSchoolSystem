'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  User, 
  GraduationCap, 
  Calendar, 
  FileText, 
  DollarSign,
  CheckCircle,
  Bell,
  Mail,
  Phone,
  MapPin,
  Award,
} from 'lucide-react';
import type { Student, AcceptedSchool } from '@/lib/supabase';
import TimetableView from '@/components/timetable/TimetableView';

interface ClassTeacher {
  id: string;
  full_name: string;
  staff_id: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

interface ClassInfo {
  class: string;
  section: string;
  academic_year: string;
  class_id?: string;
  class_teacher: ClassTeacher | null;
}

interface ExamData {
  id?: string;
  name?: string;
  exam_name?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  academic_year?: string;
  [key: string]: unknown;
}

interface NoticeData {
  [key: string]: unknown;
}

interface EventNotificationData {
  [key: string]: unknown;
}

interface MarkData {
  id: string;
  exam_id: string;
  marks_obtained: number;
  max_marks: number;
  percentage?: number;
  grade?: string;
  remarks?: string;
  examinations?: {
    id: string;
    exam_name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    status: string;
  };
}

export default function StudentDashboardHome() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  // school kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingExams, setUpcomingExams] = useState<ExamData[]>([]);
  const [recentNotices, setRecentNotices] = useState<NoticeData[]>([]);
  const [eventNotifications, setEventNotifications] = useState<EventNotificationData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [examMarks, setExamMarks] = useState<MarkData[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchSchoolData(studentData.school_code);
      fetchClassTeacher(studentData);
      fetchUpcomingExams(studentData);
      fetchRecentNotices(studentData);
      fetchEventNotifications(studentData);
      fetchMonthlyAttendance(studentData);
      fetchExamMarks(studentData);
    }
  }, []);

  const fetchSchoolData = async (schoolCode: string) => {
    try {
      const response = await fetch('/api/schools/accepted');
      const result = await response.json();
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
        }
      }
    } catch (err) {
      console.error('Error fetching school:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassTeacher = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/student/class-teacher?school_code=${studentData.school_code}&class=${studentData.class}&section=${studentData.section}&academic_year=${studentData.academic_year}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setClassInfo({
          class: result.data.class.class,
          section: result.data.class.section,
          academic_year: result.data.class.academic_year,
          class_id: result.data.class.id,
          class_teacher: result.data.class_teacher,
        });
      }
    } catch (err) {
      console.error('Error fetching class teacher:', err);
    }
  };

  const fetchUpcomingExams = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/examinations?school_code=${studentData.school_code}&status=upcoming`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = result.data
          .filter((exam: ExamData) => {
            if (!exam.start_date) return false;
            const examDate = new Date(exam.start_date);
            examDate.setHours(0, 0, 0, 0);
            return (exam.status === 'upcoming' || exam.status === 'ongoing') && examDate >= today;
          })
          .slice(0, 3);
        setUpcomingExams(upcoming);
      } else {
        // If no exams found, set empty array
        setUpcomingExams([]);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setUpcomingExams([]);
    }
  };

  const fetchRecentNotices = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/communication/notices?school_code=${studentData.school_code}&status=active&limit=5`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setRecentNotices(result.data);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  const fetchEventNotifications = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/calendar/notifications?school_code=${studentData.school_code}&user_type=student&user_id=${studentData.id}&unread_only=true`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setEventNotifications(result.data);
      }
    } catch (err) {
      console.error('Error fetching event notifications:', err);
    }
  };

  const fetchMonthlyAttendance = async (studentData: Student) => {
    try {
      setAttendanceLoading(true);
      // Get first and last day of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const response = await fetch(
        `/api/attendance/student?school_code=${studentData.school_code}&student_id=${studentData.id}&start_date=${startDate}&end_date=${endDate}`
      );
      const result = await response.json();
      
      if (response.ok && result.statistics) {
        setAttendanceStats(result.statistics);
      } else {
        setAttendanceStats({
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching monthly attendance:', err);
      setAttendanceStats({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        percentage: 0,
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchExamMarks = async (studentData: Student) => {
    try {
      setMarksLoading(true);
      const response = await fetch(
        `/api/marks?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        // Sort by exam date (most recent first) and limit to 5 most recent
        const sortedMarks = (result.data as MarkData[])
          .filter((mark: MarkData) => mark.examinations) // Only show marks with exam details
          .sort((a: MarkData, b: MarkData) => {
            const dateA = a.examinations?.end_date || '';
            const dateB = b.examinations?.end_date || '';
            return dateB.localeCompare(dateA);
          })
          .slice(0, 5);
        setExamMarks(sortedMarks);
      } else {
        setExamMarks([]);
      }
    } catch (err) {
      console.error('Error fetching exam marks:', err);
      setExamMarks([]);
    } finally {
      setMarksLoading(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.student_name || 'Student'}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xl">
              {student.student_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Welcome, {student.student_name}!</h1>
            <p className="text-gray-600">
              {student.class} - {student.section} • Academic Year {student.academic_year}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            hover 
            className="cursor-pointer"
            onClick={() => router.push('/student/dashboard/attendance')}
          >
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Attendance (This Month)</p>
                {attendanceLoading ? (
                  <p className="text-lg font-bold text-black">Loading...</p>
                ) : attendanceStats ? (
                  <div>
                    <p className="text-2xl font-bold text-black">
                      {attendanceStats.percentage}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {attendanceStats.present}/{attendanceStats.total} present
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-black">N/A</p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming Exams</p>
                <p className="text-2xl font-bold text-black">{upcomingExams.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            hover 
            className="cursor-pointer"
            onClick={() => router.push('/student/dashboard/communication')}
          >
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Bell className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">New Notices</p>
                <p className="text-2xl font-bold text-black">{recentNotices.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card 
            hover 
            className="cursor-pointer"
            onClick={() => router.push('/student/dashboard/fees')}
          >
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fees</p>
                <p className="text-2xl font-bold text-black">View</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <User size={20} />
              Personal Information
            </h2>
            <div className="space-y-4">
              {/* Student Photo */}
              {student.photo_url ? (
                <div className="flex justify-center mb-4">
                  <img
                    src={student.photo_url}
                    alt={student.student_name || 'Student'}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                    {student.student_name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Student Name</p>
                  <p className="font-medium text-black">{student.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admission No</p>
                  <p className="font-medium text-black font-mono">{student.admission_no}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class & Section</p>
                  <p className="font-medium text-black">{student.class} - {student.section}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Academic Year</p>
                  <p className="font-medium text-black">{student.academic_year}</p>
                </div>
                {student.gender && (
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-medium text-black">{student.gender}</p>
                  </div>
                )}
                {student.date_of_birth && (
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium text-black">
                      {new Date(student.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {student.address && (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin size={14} />
                    Address
                  </p>
                  <p className="font-medium text-black mt-1">{student.address}</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Class Teacher Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <GraduationCap size={20} />
              Class Teacher
            </h2>
            {classInfo?.class_teacher ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-semibold text-black">{classInfo.class_teacher.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {classInfo.class_teacher.staff_id && (
                    <div>
                      <p className="text-sm text-gray-600">Staff ID</p>
                      <p className="font-medium text-black font-mono">{classInfo.class_teacher.staff_id}</p>
                    </div>
                  )}
                  {classInfo.class_teacher.department && (
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium text-black">{classInfo.class_teacher.department}</p>
                    </div>
                  )}
                  {classInfo.class_teacher.designation && (
                    <div>
                      <p className="text-sm text-gray-600">Designation</p>
                      <p className="font-medium text-black">{classInfo.class_teacher.designation}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {classInfo.class_teacher.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-gray-700">{classInfo.class_teacher.email}</span>
                    </div>
                  )}
                  {classInfo.class_teacher.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-700">{classInfo.class_teacher.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">No class teacher assigned yet</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Timetable */}
      {classInfo?.class_id && student && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TimetableView
            schoolCode={student.school_code}
            classId={classInfo.class_id}
          />
        </motion.div>
      )}

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <FileText size={20} />
              Upcoming Examinations
            </h2>
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-black">
                        {exam.name || exam.exam_name || exam.title || 'Exam'}
                      </h3>
                      {exam.start_date && (
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(exam.start_date).toLocaleDateString()}
                          {exam.end_date && ` - ${new Date(exam.end_date).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    {exam.academic_year && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {exam.academic_year}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Exam Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <Award size={20} />
              Exam Results
            </h2>
            {examMarks.length > 0 && (
              <button
                onClick={() => router.push('/student/dashboard/examinations')}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                View All →
              </button>
            )}
          </div>
          {marksLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading results...</p>
            </div>
          ) : examMarks.length === 0 ? (
            <div className="text-center py-8">
              <Award className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 text-lg">No exam results available</p>
              <p className="text-sm text-gray-500 mt-2">
                Your exam results will appear here once they are published.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {examMarks.map((mark) => {
                const exam = mark.examinations;
                if (!exam) return null;
                
                const percentage = mark.percentage || (mark.max_marks > 0 
                  ? Math.round((mark.marks_obtained / mark.max_marks) * 100) 
                  : 0);
                const isPass = percentage >= 40;
                
                return (
                  <div
                    key={mark.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-black text-lg">{exam.exam_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(exam.end_date).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exam.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Marks</p>
                        <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                          {mark.marks_obtained} / {mark.max_marks}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Percentage</p>
                        <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                          {percentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Grade</p>
                        {mark.grade ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                            mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-800' :
                            mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            mark.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            mark.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {mark.grade}
                          </span>
                        ) : (
                          <p className="text-sm text-gray-500">-</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <p className={`text-sm font-medium ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                          {isPass ? 'Passed' : 'Failed'}
                        </p>
                      </div>
                    </div>
                    
                    {mark.remarks && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">Remarks:</p>
                        <p className="text-sm text-gray-900 mt-1">{mark.remarks}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Recent Notices */}
      {recentNotices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <Bell size={20} />
              Recent Notices
            </h2>
            <div className="space-y-3">
              {recentNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-black">{notice.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      notice.priority === 'high' ? 'bg-red-100 text-red-800' :
                      notice.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {notice.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{notice.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
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
          <Card>
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <Calendar size={20} />
              New Events & Holidays
            </h2>
            <div className="space-y-3">
              {eventNotifications.slice(0, 5).map((notification: EventNotificationData) => {
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
