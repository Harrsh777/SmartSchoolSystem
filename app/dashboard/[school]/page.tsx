'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Calendar, 
  FileText, 
  Bell,
  Download,
  ChevronDown,
  RefreshCw,
  Info,
  Play,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';
import TimetableView from '@/components/timetable/TimetableView';

interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  feeCollection: {
    collected: number;
    total: number;
    todayCollection?: number;
    monthlyCollection?: number;
  };
  todayAttendance: {
    percentage: number;
    present: number;
    students?: {
      present: number;
      total: number;
      percentage: number;
    };
    staff?: {
      present: number;
      total: number;
      percentage: number;
    };
  };
  upcomingExams: number;
  recentNotices: number;
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalStaff: 0,
    feeCollection: { collected: 0, total: 0, todayCollection: 0, monthlyCollection: 0 },
    todayAttendance: { percentage: 0, present: 0 },
    upcomingExams: 0,
    recentNotices: 0,
  });
  interface DetailedStats {
    newAdmissions?: number;
    newAdmissionsList?: Array<{ name?: string; date?: string }>;
    staffBreakdown?: {
      teaching?: number;
      nonTeaching?: number;
      total?: number;
    };
    genderStats?: {
      male?: number;
      female?: number;
      other?: number;
      malePercent?: number;
      femalePercent?: number;
    };
  }
  interface FinancialData {
    totalRevenue?: number;
    thisMonthEarnings?: number;
    totalTransactions?: number;
    monthlyEarnings?: Array<{
      month: string;
      earnings: number;
    }>;
  }
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [financialPeriod, setFinancialPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  interface Timetable {
    class_id: string;
    class: string;
    section: string;
    academic_year?: string;
    slot_count?: number;
    has_timetable?: boolean;
    class_teacher?: {
      full_name: string;
    };
  }
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loadingTimetables, setLoadingTimetables] = useState(false);
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string | null>(null);

  useEffect(() => {
    fetchSchoolData();
    fetchDashboardStats();
    fetchDetailedStats();
    fetchFinancialData();
    fetchTimetables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  // Refetch financial data when period changes
  useEffect(() => {
    if (schoolCode) {
      fetchFinancialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialPeriod]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDownloadMenu && !target.closest('.download-menu-container')) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDownloadMenu]);

  const fetchSchoolData = async () => {
    try {
      // Get from sessionStorage first
      const storedSchool = sessionStorage.getItem('school');
      if (storedSchool) {
        const schoolData = JSON.parse(storedSchool);
        if (schoolData.school_code === schoolCode) {
          setSchool(schoolData);
          return;
        }
      }

      // If not in sessionStorage, fetch from API
      const response = await fetch(`/api/schools/accepted`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
          sessionStorage.setItem('school', JSON.stringify(schoolData));
        } else {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching school:', err);
      router.push('/login');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedStats = async () => {
    try {
      setLoadingDetailed(true);
      const response = await fetch(`/api/dashboard/stats-detailed?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setDetailedStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching detailed stats:', err);
    } finally {
      setLoadingDetailed(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      setLoadingFinancial(true);
      const response = await fetch(`/api/dashboard/financial?school_code=${schoolCode}&period=${financialPeriod}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setFinancialData(result.data);
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
    } finally {
      setLoadingFinancial(false);
    }
  };


  const fetchTimetables = async () => {
    try {
      setLoadingTimetables(true);
      const response = await fetch(`/api/timetable/list?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setTimetables(result.data);
      }
    } catch (err) {
      console.error('Error fetching timetables:', err);
    } finally {
      setLoadingTimetables(false);
    }
  };


  const statCards: Array<{
    title: string;
    value: string;
    icon: LucideIcon;
    color: string;
    subtitle?: string;
    showProgress?: boolean;
    progressValue?: number;
  }> = [
    {
      title: 'Upcoming Exams',
      value: stats.upcomingExams.toString(),
      icon: FileText,
      color: 'bg-gray-600',
    },
    {
      title: 'Recent Notices',
      value: stats.recentNotices.toString(),
      icon: Bell,
      color: 'bg-gray-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">School not found</p>
          <Button onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  const handleDownload = async (type: 'students' | 'staff' | 'parents' | 'attendance') => {
    try {
      setDownloading(type);
      const url = `/api/download/${type}?school_code=${schoolCode}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}_${schoolCode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      alert(`Failed to download ${type} data. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section - Vibrant */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Welcome, {school.school_name}
            </h1>
            <p className="text-gray-600 text-lg">Here&apos;s what&apos;s happening at your school today.</p>
          </div>
          <div className="relative download-menu-container">
            <Button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
            >
              <Download size={18} />
              Download Statistics
              <ChevronDown size={16} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </Button>
            {showDownloadMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
              >
                <button
                  onClick={() => handleDownload('students')}
                  disabled={downloading === 'students'}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users size={18} className="text-blue-600" />
                  <span className="font-medium">
                    {downloading === 'students' ? 'Downloading...' : 'Student Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('staff')}
                  disabled={downloading === 'staff'}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
                >
                  <UserCheck size={18} className="text-green-600" />
                  <span className="font-medium">
                    {downloading === 'staff' ? 'Downloading...' : 'Staff Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('parents')}
                  disabled={downloading === 'parents'}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
                >
                  <Users size={18} className="text-purple-600" />
                  <span className="font-medium">
                    {downloading === 'parents' ? 'Downloading...' : 'Parent Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('attendance')}
                  disabled={downloading === 'attendance'}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
                >
                  <Calendar size={18} className="text-orange-600" />
                  <span className="font-medium">
                    {downloading === 'attendance' ? 'Downloading...' : 'Attendance Data Download'}
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Headcount Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="group relative bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden md:col-span-1 lg:col-span-1"
        >
          <div className="flex h-full">
            {/* Left Section - Headcount Title (2/3 width) */}
            <div className="flex-[2] flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Headcount</h3>
              <button
                onClick={() => {
                  fetchDashboardStats();
                }}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Refresh headcount"
              >
                <RefreshCw className="text-gray-700" size={18} />
              </button>
            </div>
            
            {/* Right Section - Students and Staff (1/3 width) */}
            <div className="flex-1 flex flex-col justify-center space-y-4 pl-4 border-l border-gray-200">
              {/* Students */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm font-medium">Students</span>
                  <Info className="text-gray-500" size={14} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 text-xl font-bold">
                    {loading ? '...' : stats.totalStudents.toLocaleString()}
                  </span>
                  <button
                    onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="View students"
                  >
                    <Play className="text-gray-700" size={14} />
                  </button>
                </div>
              </div>
              
              {/* Staff */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-sm font-medium">Staffs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 text-xl font-bold">
                    {loading ? '...' : stats.totalStaff.toLocaleString()}
                  </span>
                  <button
                    onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="View staff"
                  >
                    <Play className="text-gray-700" size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Attendance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="group relative bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden md:col-span-1 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Today&apos;s Attendance</h3>
            <button
              onClick={() => {
                fetchDashboardStats();
              }}
              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Refresh attendance"
            >
              <RefreshCw className="text-gray-700" size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Students Row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">Students</span>
                <button
                  onClick={() => router.push(`/dashboard/${schoolCode}/attendance`)}
                  className="p-0.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex-shrink-0"
                  aria-label="View student attendance"
                >
                  <Play className="text-gray-700" size={10} />
                </button>
              </div>
              <div className="flex-1 bg-gray-100 rounded px-2 py-1.5 flex items-center justify-center min-h-[32px]">
                <span className="text-gray-900 font-bold text-base">
                  {loading ? '...' : (stats.todayAttendance.students?.present ?? stats.todayAttendance.present ?? 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-600 min-w-[35px] text-right">
                {loading ? '...' : `${stats.todayAttendance.students?.percentage ?? stats.todayAttendance.percentage ?? 0}%`}
              </span>
            </div>

            {/* Staff Row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">Staffs</span>
                <button
                  onClick={() => router.push(`/dashboard/${schoolCode}/attendance/staff`)}
                  className="p-0.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex-shrink-0"
                  aria-label="View staff attendance"
                >
                  <Play className="text-gray-700" size={10} />
                </button>
              </div>
              <div className="flex-1 bg-gray-100 rounded px-2 py-1.5 flex items-center justify-center min-h-[32px]">
                <span className="text-gray-900 font-bold text-base">
                  {loading ? '...' : (stats.todayAttendance.staff?.present ?? 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-600 min-w-[35px] text-right">
                {loading ? '...' : `${stats.todayAttendance.staff?.percentage ?? 0}%`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Fee Collection Card - Combined */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="group relative bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden md:col-span-1 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fee Collection</p>
            <button
              onClick={() => {
                fetchDashboardStats();
              }}
              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Refresh collection"
            >
              <RefreshCw className="text-gray-700" size={14} />
            </button>
          </div>
          <div className="flex items-start gap-4">
            {/* Today's Collection */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Today&apos;s Collection</p>
              {loading ? (
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  ₹{(stats.feeCollection.todayCollection ?? 0).toLocaleString()}
                </p>
              )}
            </div>
            {/* Divider */}
            <div className="w-px h-12 bg-gray-200" />
            {/* Total Collection This Month */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Total Collection</p>
              {loading ? (
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  ₹{(stats.feeCollection.monthlyCollection ?? 0).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">This Month</p>
            </div>
          </div>
        </motion.div>

        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 2) * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="group relative bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{card.title}</p>
                {loading ? (
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-bold text-gray-900">
                    {card.value}
                  </p>
                )}
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1 font-medium">{card.subtitle}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Student & Staff Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Users className="text-gray-700" size={20} />
            Students Overview
          </h3>
          {loadingDetailed ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Gender Distribution</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Male</span>
                      <span className="font-semibold text-gray-900">{detailedStats?.genderStats?.malePercent ?? 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Female</span>
                      <span className="font-semibold text-gray-900">{detailedStats?.genderStats?.femalePercent ?? 0}%</span>
                    </div>
                  </div>
                </div>
                {detailedStats?.genderStats && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Male', value: detailedStats.genderStats.male },
                            { name: 'Female', value: detailedStats.genderStats.female },
                            { name: 'Other', value: detailedStats.genderStats.other },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#ec4899" />
                          <Cell fill="#94a3b8" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">New Admissions</p>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      +{detailedStats?.newAdmissions ?? 0} New
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Last 3 days</p>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {detailedStats?.newAdmissionsList && detailedStats.newAdmissionsList.length > 0 ? (
                    detailedStats.newAdmissionsList.map((admission: { name?: string; date?: string }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700">{admission.name || 'New Student'}</span>
                        <span className="text-gray-500 text-xs">
                          {admission.date ? new Date(admission.date).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No new admissions</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Staff Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <UserCheck className="text-gray-700" size={20} />
            Staff Overview
          </h3>
          {loadingDetailed ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Teaching Staff</span>
                  <span className="font-bold text-gray-900">{detailedStats?.staffBreakdown?.teaching ?? 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: detailedStats?.staffBreakdown?.total && detailedStats?.staffBreakdown?.teaching
                        ? `${(detailedStats.staffBreakdown.teaching / detailedStats.staffBreakdown.total) * 100}%` 
                        : '0%' 
                    }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="bg-gray-600 h-3 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Non-Teaching Staff</span>
                  <span className="font-bold text-gray-900">{detailedStats?.staffBreakdown?.nonTeaching ?? 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: detailedStats?.staffBreakdown?.total && detailedStats?.staffBreakdown?.nonTeaching
                        ? `${(detailedStats.staffBreakdown.nonTeaching / detailedStats.staffBreakdown.total) * 100}%` 
                        : '0%' 
                    }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Staff</span>
                  <span className="text-2xl font-bold text-gray-900">{detailedStats?.staffBreakdown?.total ?? 0}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Financial Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Financial Management</h3>
            <p className="text-sm text-gray-600 mt-1">School Earnings Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFinancialPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                financialPeriod === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setFinancialPeriod('quarterly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                financialPeriod === 'quarterly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
        {loadingFinancial ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{financialData?.totalRevenue?.toLocaleString('en-IN') ?? '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-green-600">
                  ₹{financialData?.thisMonthEarnings?.toLocaleString('en-IN') ?? '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-blue-600">
                  {financialData?.totalTransactions ?? '0'}
                </p>
              </div>
            </div>
            {financialData?.monthlyEarnings && financialData.monthlyEarnings.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.monthlyEarnings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      }}
                      formatter={(value: number | string | undefined) => {
                        if (value === undefined) return '₹0';
                        return `₹${Number(value).toLocaleString('en-IN')}`;
                      }}
                    />
                    <Bar 
                      dataKey="earnings" 
                      fill="url(#colorGradient)"
                      radius={[8, 8, 0, 0]}
                    >
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <DollarSign className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No fee data available</p>
                  <p className="text-sm mt-1">Fee collection data will appear here once fees are recorded</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Timetables Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Class Timetables</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage timetables for all classes</p>
          </div>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/timetable`)}>
            <Calendar size={18} className="mr-2" />
            Create Timetable
          </Button>
        </div>
        {loadingTimetables ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : timetables.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg mb-2">No timetables created yet</p>
            <p className="text-gray-500 text-sm mb-4">Create a timetable for a class to get started</p>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/timetable`)}>
              Create First Timetable
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timetable List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timetables.map((tt) => (
                <motion.button
                  key={tt.class_id}
                  onClick={() => setSelectedTimetableClass(selectedTimetableClass === tt.class_id ? null : tt.class_id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTimetableClass === tt.class_id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-black">
                      {tt.class}-{tt.section}
                    </h4>
                    {tt.has_timetable ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Has Timetable
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        No Timetable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Academic Year: {tt.academic_year}</p>
                  <p className="text-sm text-gray-600">Slots: {tt.slot_count}</p>
                  {tt.class_teacher && (
                    <p className="text-sm text-gray-600 mt-2">
                      Class Teacher: {tt.class_teacher.full_name}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Selected Timetable View */}
            {selectedTimetableClass && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <TimetableView
                  schoolCode={schoolCode}
                  classId={selectedTimetableClass}
                />
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/students/add`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Add Student</p>
              <p className="text-sm text-gray-600 mt-1">Register new student</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/attendance`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Mark Attendance</p>
              <p className="text-sm text-gray-600 mt-1">Record today&apos;s attendance</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Create Exam</p>
              <p className="text-sm text-gray-600 mt-1">Schedule new examination</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/communication`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Send Notice</p>
              <p className="text-sm text-gray-600 mt-1">Publish announcement</p>
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

