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
  Check,
  X,
  Clock,
  Bell,
  Bus,
  IndianRupee,
  Award,
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

interface AttendanceDay {
  attendance_date: string;
  status: string;
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

interface RecentNotice {
  id: string;
  title: string;
  content?: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string | null;
  publish_at?: string | null;
}

export default function StudentDashboardHome() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [classTeacher, setClassTeacher] = useState<ClassTeacher | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [, setWeeklyCompletion] = useState({ weekly_completion: 0, assignments_to_complete: 0 });
  const [attendanceLast7, setAttendanceLast7] = useState<AttendanceDay[]>([]);
  const [recentCommunication, setRecentCommunication] = useState<RecentNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeDueMonth, setFeeDueMonth] = useState(0);
  const [feeDueQuarter, setFeeDueQuarter] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [transportBrief, setTransportBrief] = useState<{ has_transport: boolean; route_name?: string } | null>(null);
  const [publishedMarksCount, setPublishedMarksCount] = useState(0);
  const [upcomingExamPeek, setUpcomingExamPeek] = useState<string[]>([]);

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

  const formatInr = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

  const fetchAllData = useCallback(async (studentData: Student) => {
    const schoolCode = getString(studentData.school_code);
    const studentId = getString(studentData.id);
    
    if (!schoolCode || !studentId) {
      setLoading(false);
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const enc = (s: string) => encodeURIComponent(s);

    try {
      const [
        statsRes,
        upcomingRes,
        weeklyRes,
        teacherRes,
        attendanceRes,
        noticesRes,
        feesRes,
        receiptsRes,
        transportRes,
        examsV2Res,
        marksRes,
      ] = await Promise.all([
        fetch(`/api/student/stats?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`),
        fetch(`/api/student/upcoming-items?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}&limit=3`),
        fetch(`/api/student/weekly-completion?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`),
        fetch(
          `/api/student/class-teacher?school_code=${enc(schoolCode)}&class=${enc(getString(studentData.class))}&section=${enc(getString(studentData.section))}&academic_year=${enc(getString(studentData.academic_year))}`
        ),
        fetch(`/api/student/attendance?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}&start_date=${startStr}&end_date=${endStr}`),
        fetch(`/api/communication/notices?school_code=${enc(schoolCode)}&limit=5`),
        fetch(`/api/student/fees?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`, { cache: 'no-store' }),
        fetch(`/api/student/fees/receipts?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`, { cache: 'no-store' }),
        fetch(`/api/student/transport?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`, { cache: 'no-store' }),
        fetch(`/api/examinations/v2/student?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`, { cache: 'no-store' }),
        fetch(`/api/student/marks?school_code=${enc(schoolCode)}&student_id=${enc(studentId)}`, { cache: 'no-store' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcoming(upcomingData.data || []);
        const examsCount = (upcomingData.data || []).filter((item: UpcomingItem) => item.subtitle === 'Examination').length;
        setUpcomingExamsCount(examsCount);
      }

      if (examsV2Res.ok) {
        const examsJson = await examsV2Res.json();
        const examsList = (examsJson.data || []) as { exam_name?: string; start_date?: string | null; end_date?: string | null }[];
        const todayCut = new Date();
        todayCut.setHours(0, 0, 0, 0);
        const upcomingExams = examsList.filter((e) => {
          const end = new Date(e.end_date || e.start_date || 0);
          end.setHours(23, 59, 59, 999);
          return !Number.isNaN(end.getTime()) && end >= todayCut;
        });
        setUpcomingExamsCount(upcomingExams.length);
        setUpcomingExamPeek(
          upcomingExams.slice(0, 4).map((e) => (typeof e.exam_name === 'string' ? e.exam_name : 'Exam'))
        );
      }

      if (feesRes.ok) {
        const feesJson = await feesRes.json();
        const fees = (feesJson.data || []) as { due_date?: string; balance_due?: number }[];
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const startMonth = new Date(y, m, 1);
        const endMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
        const qStart = Math.floor(m / 3) * 3;
        const startQ = new Date(y, qStart, 1);
        const endQ = new Date(y, qStart + 3, 0, 23, 59, 59, 999);
        const inRange = (d: Date, a: Date, b: Date) => d >= a && d <= b;
        let sumMonth = 0;
        let sumQ = 0;
        for (const f of fees) {
          const bal = Math.max(0, Number(f.balance_due ?? 0));
          if (bal <= 0) continue;
          const dd = f.due_date ? new Date(f.due_date) : null;
          if (!dd || Number.isNaN(dd.getTime())) continue;
          if (inRange(dd, startMonth, endMonth)) sumMonth += bal;
          if (inRange(dd, startQ, endQ)) sumQ += bal;
        }
        setFeeDueMonth(Math.round(sumMonth * 100) / 100);
        setFeeDueQuarter(Math.round(sumQ * 100) / 100);
      }

      if (receiptsRes.ok) {
        const recJson = await receiptsRes.json();
        setReceiptCount(Array.isArray(recJson.data) ? recJson.data.length : 0);
      }

      if (transportRes.ok) {
        const tr = await transportRes.json();
        const d = tr.data;
        if (d && typeof d === 'object') {
          setTransportBrief({
            has_transport: Boolean((d as { has_transport?: boolean }).has_transport),
            route_name: (d as { route?: { route_name?: string } | null }).route?.route_name,
          });
        }
      }

      if (marksRes.ok) {
        const mj = await marksRes.json();
        setPublishedMarksCount(Array.isArray(mj.data) ? mj.data.length : 0);
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

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        const records = (attendanceData.data || []).map((r: { attendance_date: string; status: string }) => ({
          attendance_date: String(r.attendance_date).split('T')[0],
          status: r.status || 'absent',
        }));
        setAttendanceLast7(records);
      }

      if (noticesRes.ok) {
        const noticesData = await noticesRes.json();
        const now = new Date();
        const published = (noticesData.data || []).filter((n: RecentNotice) => {
          if (n.status === 'Active' && n.publish_at) return new Date(n.publish_at) <= now;
          return true;
        });
        setRecentCommunication(published.slice(0, 5));
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
            <p className="text-2xl font-bold text-gray-900 mb-3">{stats?.gpa != null && stats.gpa !== '' ? `${Number(stats.gpa).toFixed(1)}%` : '—'}</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(parseFloat(stats?.gpa || '0') || 0, 100)}%` }}
              ></div>
            </div>
          </motion.div>
        </section>

        {/* Fees, transport, exams & published results */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => router.push('/student/dashboard/fees')}
            className="text-left glass-card soft-shadow rounded-2xl border border-input p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <IndianRupee className="text-amber-600" size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fees</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1">Balance due (by due date)</p>
            <p className="text-lg font-semibold text-foreground">This month: {formatInr(feeDueMonth)}</p>
            <p className="text-sm text-muted-foreground mt-1">This quarter: {formatInr(feeDueQuarter)}</p>
            {receiptCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">{receiptCount} paid receipt{receiptCount === 1 ? '' : 's'} — view under Payment History</p>
            )}
            <p className="text-[11px] text-primary font-semibold mt-3 uppercase tracking-wide">Open fee statement &amp; receipts →</p>
          </motion.button>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => router.push('/student/dashboard/transport')}
            className="text-left glass-card soft-shadow rounded-2xl border border-input p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Bus className="text-sky-600" size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transport</span>
            </div>
            {transportBrief?.has_transport ? (
              <>
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {transportBrief.route_name || 'Route assigned'}
                </p>
                <p className="text-[11px] text-primary font-semibold mt-3 uppercase tracking-wide">View route &amp; stops →</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No transport used</p>
                <p className="text-[11px] text-muted-foreground mt-2">Contact the office if you need bus service.</p>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => router.push('/student/dashboard/examinations')}
            className="text-left glass-card soft-shadow rounded-2xl border border-input p-5 hover:border-primary/40 transition-colors md:col-span-2 xl:col-span-1"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FileText className="text-violet-600" size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Examinations</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{upcomingExamsCount} upcoming</p>
            {upcomingExamPeek.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {upcomingExamPeek.map((name, i) => (
                  <li key={`${i}-${name}`} className="truncate">{name}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-primary font-semibold mt-3 uppercase tracking-wide">Schedules &amp; published marks →</p>
          </motion.button>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => router.push('/student/dashboard/examinations')}
            className="text-left glass-card soft-shadow rounded-2xl border border-input p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award className="text-emerald-600" size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Published results</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{publishedMarksCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Exams where marks are visible after admin lock</p>
          </motion.button>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Timetable */}
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

            {/* My Attendance - Past 7 days */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card soft-shadow rounded-2xl p-6 border border-input"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">My Attendance</h3>
                <button
                  onClick={() => router.push('/student/dashboard/attendance')}
                  className="text-[11px] font-semibold text-primary uppercase tracking-wider hover:underline"
                >
                  View All
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Past 7 days</p>
              <div className="space-y-2">
                {(() => {
                  const dateToStatus: Record<string, string> = {};
                  attendanceLast7.forEach((r) => {
                    dateToStatus[r.attendance_date] = r.status;
                  });
                  const days: { date: Date; key: string }[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    days.push({ date: d, key: d.toISOString().split('T')[0] });
                  }
                  return days.map(({ date: d, key }) => {
                    const status = dateToStatus[key];
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const isPresent = status === 'present';
                    const isHalfDay = status === 'half_day';
                    const isLate = status === 'late';
                    const isAbsent = status === 'absent';
                    const notMarked = !status;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-input/50"
                      >
                        <span className="text-sm text-foreground">{label}</span>
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          {notMarked && <span className="text-muted-foreground">—</span>}
                          {isPresent && (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700">Present</span>
                            </>
                          )}
                          {isHalfDay && (
                            <>
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-700">Half day</span>
                            </>
                          )}
                          {isLate && (
                            <>
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="text-amber-700">Late</span>
                            </>
                          )}
                          {isAbsent && (
                            <>
                              <X className="w-4 h-4 text-red-600" />
                              <span className="text-red-700">Absent</span>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  });
                })()}
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
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
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

            {/* Recent Communication */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-muted rounded-2xl border border-input overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="text-primary" size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Recent Communication</h3>
                  </div>
                  <button
                    onClick={() => router.push('/student/dashboard/communication')}
                    className="text-[10px] font-semibold text-primary uppercase tracking-wider hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {recentCommunication.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent notices</p>
                  ) : (
                    recentCommunication.map((notice) => (
                      <div
                        key={notice.id}
                        onClick={() => router.push('/student/dashboard/communication')}
                        className="p-3 rounded-lg bg-card border border-input/50 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-foreground truncate">{notice.title || 'Notice'}</p>
                        {notice.content && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {String(notice.content).replace(/<[^>]*>/g, '').slice(0, 80)}
                            {String(notice.content).length > 80 ? '…' : ''}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {notice.publish_at
                            ? new Date(notice.publish_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : notice.created_at
                              ? new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
