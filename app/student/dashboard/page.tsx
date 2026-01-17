'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Trophy,
  MessageSquare,
  Calendar,
  GraduationCap,
  FileText,
  User,
  CheckCircle,
} from 'lucide-react';
import type { Student } from '@/lib/supabase';
import TimetableView from '@/components/timetable/TimetableView';

interface Stats {
  attendance: number;
  attendance_change: number;
  gpa: string;
  gpa_rank: string;
  merit_points: number;
  progress_current: number;
  progress_total: number;
  term: string;
}

interface Performance {
  id: string;
  subject: string;
  type: string;
  date: string;
  grade: string;
  grade_color: string;
}

interface UpcomingItem {
  id: string;
  title: string;
  subtitle: string;
  month: string;
  day: string;
}

interface ClassTeacher {
  full_name: string;
  designation?: string;
  email?: string;
  phone?: string;
}

export default function StudentDashboardHome() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [classTeacher, setClassTeacher] = useState<ClassTeacher | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [, setWeeklyCompletion] = useState({ weekly_completion: 0, assignments_to_complete: 0 });
  const [loading, setLoading] = useState(true);

  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const fetchAllData = useCallback(async (studentData: Student) => {
    const schoolCode = getString(studentData.school_code);
    const studentId = getString(studentData.id);
    
    if (!schoolCode || !studentId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [statsRes, performanceRes, upcomingRes, weeklyRes, teacherRes] = await Promise.all([
        fetch(`/api/student/stats?school_code=${schoolCode}&student_id=${studentId}`),
        fetch(`/api/student/recent-performance?school_code=${schoolCode}&student_id=${studentId}&limit=3`),
        fetch(`/api/student/upcoming-items?school_code=${schoolCode}&student_id=${studentId}&limit=3`),
        fetch(`/api/student/weekly-completion?school_code=${schoolCode}&student_id=${studentId}`),
        fetch(`/api/student/class-teacher?school_code=${schoolCode}&class=${getString(studentData.class)}&section=${getString(studentData.section)}&academic_year=${getString(studentData.academic_year)}`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json();
        setPerformances(performanceData.data || []);
      }

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcoming(upcomingData.data || []);
        // Count only examinations (not events)
        const examsCount = (upcomingData.data || []).filter((item: UpcomingItem) => item.subtitle === 'Examination').length;
        setUpcomingExamsCount(examsCount);
      }
      
      // Also fetch total upcoming exams count
      try {
        const examsCountRes = await fetch(`/api/examinations?school_code=${schoolCode}&status=upcoming`);
        if (examsCountRes.ok) {
          const examsData = await examsCountRes.json();
          if (examsData.data) {
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            interface Exam {
              start_date?: string | null;
              status?: string;
            }
            const upcomingExams = examsData.data.filter((exam: Exam) => {
              if (!exam.start_date) return false;
              const examDate = new Date(exam.start_date);
              examDate.setHours(0, 0, 0, 0);
              return (exam.status === 'upcoming' || exam.status === 'ongoing') && examDate >= todayDate;
            });
            setUpcomingExamsCount(upcomingExams.length);
          }
        }
      } catch (err) {
        console.error('Error fetching upcoming exams count:', err);
      }

      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json();
        setWeeklyCompletion(weeklyData.data);
      }

      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        if (teacherData.data?.class_teacher) {
          setClassTeacher(teacherData.data.class_teacher);
        }
        if (teacherData.data?.class?.id) {
          setClassId(teacherData.data.class.id);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchAllData(studentData);
    }
  }, [fetchAllData]);

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const studentName = getString(student.student_name);
  const firstName = studentName.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest">Dashboard</span>
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl text-foreground font-serif">
              {getGreeting()}, <span className="italic text-muted-foreground">{firstName}</span>.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg">
              <span className="font-semibold text-foreground">
                {getString(student.class) || 'N/A'}-{getString(student.section) || 'N/A'}
              </span>
              {stats?.attendance !== undefined && (
                <>
                  {' • '}
                  {stats.attendance < 80 ? (
                    <span className="text-orange-600 font-semibold">Improve the attendance</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">Keep it up</span>
                  )}
                </>
              )}
            </p>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => router.push('/student/dashboard/examinations')}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              >
                Resume Learning
              </button>
              <button 
                onClick={() => router.push('/student/dashboard/calendar')}
                className="bg-card text-foreground border border-input px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-all"
              >
                My Schedule
              </button>
            </div>
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <div className="relative bg-muted rounded-2xl p-6 border border-input flex items-center justify-center h-48">
              <GraduationCap className="text-muted-foreground" size={120} />
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Attendance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
                <CheckCircle className="text-blue-500" size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                {(stats?.attendance_change || 0) > 0 ? '+' : ''}{stats?.attendance_change || 0}%
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attendance</p>
            <p className="text-2xl font-bold text-gray-900 mb-3">{stats?.attendance || 0}%</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats?.attendance || 0, 100)}%` }}
              ></div>
            </div>
          </motion.div>

          {/* Upcoming Examinations Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-50">
                <FileText className="text-purple-500" size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                {upcomingExamsCount > 0 ? `${upcomingExamsCount} New` : 'None'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Upcoming Examinations</p>
            <p className="text-2xl font-bold text-gray-900 mb-3">{upcomingExamsCount}</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((upcomingExamsCount / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </motion.div>

          {/* Class Teacher Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-50">
                <User className="text-green-500" size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {classTeacher ? 'Assigned' : 'Not Set'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">My Class Teacher</p>
            <p className="text-lg font-bold text-gray-900 mb-1 truncate">
              {classTeacher?.full_name || 'Not Assigned'}
            </p>
            {classTeacher?.designation && (
              <p className="text-xs text-gray-500 mb-3">{classTeacher.designation}</p>
            )}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: classTeacher ? '100%' : '0%' }}
              ></div>
            </div>
          </motion.div>

          {/* Academic Index Card (GPA) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-50">
                <Trophy className="text-orange-500" size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                {stats?.gpa_rank || 'A- Avg'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Academic Index</p>
            <p className="text-2xl font-bold text-gray-900 mb-3">{stats?.gpa || '0.00'}</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((parseFloat(stats?.gpa || '0') / 4) * 100, 100)}%` }}
              ></div>
            </div>
          </motion.div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Timetable & Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Timetable */}
            {classId && student ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card soft-shadow rounded-2xl border border-input overflow-hidden"
              >
                <div className="p-6 border-b border-input">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">My Timetable</h3>
                      <p className="text-xs text-muted-foreground mt-1">Weekly class schedule</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <TimetableView
                    schoolCode={getString(student.school_code)}
                    classId={classId}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card soft-shadow rounded-2xl p-8 border border-input"
              >
                <div className="text-center py-8">
                  <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
                  <p className="text-muted-foreground">Timetable information not available</p>
                </div>
              </motion.div>
            )}

            {/* Recent Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card soft-shadow rounded-2xl p-8 border border-input"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-semibold text-foreground">Recent Performance</h3>
                <button 
                  onClick={() => router.push('/student/dashboard/examinations')}
                  className="text-[11px] font-semibold text-primary uppercase tracking-wider hover:underline"
                >
                  Full Report
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold border-b border-input">
                      <th className="pb-4 font-bold">Subject</th>
                      <th className="pb-4 font-bold">Type</th>
                      <th className="pb-4 font-bold">Date</th>
                      <th className="pb-4 text-right font-bold">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-input/50">
                    {performances.length > 0 ? performances.map((perf) => (
                      <tr key={perf.id} className="group">
                        <td className="py-4 font-medium text-sm text-foreground">{perf.subject}</td>
                        <td className="py-4 text-[11px] text-muted-foreground">{perf.type}</td>
                        <td className="py-4 text-[11px] text-muted-foreground">{perf.date}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-1 ${perf.grade_color} text-xs font-bold rounded`}>
                            {perf.grade}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                          No recent performance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Upcoming & Mentor */}
          <div className="space-y-6">
            {/* Upcoming */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-muted rounded-2xl border border-input overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
                  <button 
                    onClick={() => router.push('/student/dashboard/calendar')}
                    className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest hover:text-foreground"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-5">
                  {upcoming.length > 0 ? upcoming.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 bg-card border border-input rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold text-muted-foreground leading-none">{item.month}</span>
                        <span className="text-sm font-bold text-foreground leading-tight">{item.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming items</p>
                  )}
                </div>
              </div>

              <div className="mx-6 h-px bg-input"></div>

              <div className="p-6">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Mentor Contact</p>
                {classTeacher ? (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {classTeacher.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{classTeacher.full_name}</p>
                        <p className="text-[10px] text-muted-foreground italic">{classTeacher.designation || 'Academic Advisor'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push('/student/dashboard/communication')}
                      className="w-full py-2.5 bg-card text-foreground text-xs font-medium rounded-lg border border-input hover:bg-muted transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Chat with Mentor
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No mentor assigned</p>
                )}
              </div>
            </motion.div>

            {/* Study Group CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-primary p-6 rounded-2xl relative overflow-hidden"
            >
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-primary-foreground/70 uppercase tracking-widest mb-1">Study Group</p>
                <p className="text-sm text-primary-foreground font-medium mb-4 leading-relaxed">
                  Join study sessions and collaborate with peers.
                </p>
                <button 
                  onClick={() => router.push('/student/dashboard/communication')}
                  className="w-full py-2 bg-primary-foreground text-primary text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                >
                  Launch Group Call
                </button>
              </div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl"></div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
