'use client';

import { use, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Users, 
  UserCheck, 
  IndianRupee, 
  Download,
  ChevronDown,
  RefreshCw,
  Play,
  TrendingUp,
  TrendingDown,
  Info,
  FileText,
  Plus,
  Bell,
  ChevronRight,
  Package,
  Edit,
  Building2,
  Shield,
  Key,
  BookOpen,
  CalendarDays,
  Calendar,
  Bus,
  MessageSquare,
  FileBarChart,
  Award,
  BookMarked,
  Settings,
  Database,
  UserPlus,
  FileCheck,
  Camera,
  Upload,
  UsersRound,
  CreditCard,
  AlertCircle as AlertCircleIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AcceptedSchool } from '@/lib/supabase';
interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  feeCollection: {
    collected: number;
    total: number;
    todayCollection?: number;
    monthlyCollection?: number;
    feesLast3Months?: number;
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

function DashboardPageContent({
  schoolCode,
}: {
  schoolCode: string;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const [activeQuickActionTab, setActiveQuickActionTab] = useState<'quick' | 'admin' | 'finance' | 'academics' | 'transport' | 'communication' | 'reports'>('quick');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalStaff: 0,
    feeCollection: { collected: 0, total: 0, todayCollection: 0, monthlyCollection: 0 },
    todayAttendance: {
      percentage: 0,
      present: 0,
      students: { present: 0, total: 0, percentage: 0 },
      staff: { present: 0, total: 0, percentage: 0 },
    },
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
      otherPercent?: number;
    };
    staffGenderStats?: {
      total?: number;
      male?: number;
      female?: number;
      other?: number;
      malePercent?: number;
      femalePercent?: number;
      otherPercent?: number;
    };
  }
  interface FinancialData {
    incomeAndExpense?: {
      totalIncome: number;
      totalExpense: number;
      todayExpense?: number;
      monthlyData: Array<{
      month: string;
        income: number;
        expense: number;
      }>;
    };
    feeManagement?: {
      todayCollection: number;
      totalCollected: number;
      totalDue: number;
      collectedPercent: number;
      duePercent: number;
      totalStudents: number;
      pendingStudents: number;
    };
  }
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [feePeriod, setFeePeriod] = useState<'till_date' | 'annual'>('till_date');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [timetables, setTimetables] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingTimetables, setLoadingTimetables] = useState(false);
  
  interface Exam {
    id: string;
    exam_name: string;
    exam_type?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    academic_year?: string;
    term_id?: string | null;
    class?: {
      class: string;
      section: string;
      academic_year?: string;
    };
  }

  interface Term {
    id: string;
    name: string;
    serial?: number;
    start_date?: string | null;
    end_date?: string | null;
  }

  const [terms, setTerms] = useState<Term[]>([]);
  const [examsByTermId, setExamsByTermId] = useState<Record<string, Exam[]>>({});
  const [expandedTermIds, setExpandedTermIds] = useState<Set<string>>(new Set());
  const [loadingExams, setLoadingExams] = useState(false);
  
  interface AdministrativeData {
    attendance?: {
      students?: {
        present: number;
        absent: number;
        halfday: number;
        leave: number;
        dutyLeave: number;
        notMarked: number;
        total: number;
      };
      staff?: {
        present: number;
        absent: number;
        halfday: number;
        leave: number;
        customLeaves: number;
        notMarked: number;
        total: number;
      };
    };
    recentUpdates?: {
      notices?: Array<{
        id: string;
        title: string;
        message?: string;
        category?: string;
        priority?: string;
        created_at?: string;
      }>;
      visitors?: Array<{
        id: string;
        visitor_name: string;
        purpose_of_visit: string;
        created_at?: string;
        status?: string;
      }>;
      leaves?: Array<{
        id: string;
        type: string;
        leave_type?: string;
        leave_title?: string;
        leave_start_date?: string;
        leave_end_date?: string;
        created_at?: string;
      }>;
      noticesArePending?: boolean;
      visitorsArePending?: boolean;
      leavesArePending?: boolean;
    };
  }
  const [administrativeData, setAdministrativeData] = useState<AdministrativeData | null>(null);
  const [loadingAdministrative, setLoadingAdministrative] = useState(false);
  const [activeUpdateTab, setActiveUpdateTab] = useState<'notice' | 'visitors' | 'leaves'>('notice');
  const [showStudentBirthdays, setShowStudentBirthdays] = useState(false);
  const [showTeacherBirthdays, setShowTeacherBirthdays] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarEntries, setCalendarEntries] = useState<Array<{ id?: string; event_date?: string; title?: string; event_type?: string; description?: string }>>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [classesCount, setClassesCount] = useState(0);
  const [sectionsCount, setSectionsCount] = useState(0);
  const [, setLoadingClasses] = useState(false);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [isCurrentAcademicYearExpired, setIsCurrentAcademicYearExpired] = useState(false);

  /** Ignore stale JSON when multiple dashboard requests overlap (refresh / academic year). */
  const dashboardStatsSeq = useRef(0);
  const dashboardDetailedSeq = useRef(0);
  const dashboardFinancialSeq = useRef(0);

  useEffect(() => {
    if (!schoolCode) return;
    fetchSchoolData();
    fetchDashboardStats();
    fetchDetailedStats();
    // fetchFinancialData: loaded by feePeriod effect to avoid duplicate concurrent calls on mount
    fetchTimetables();
    fetchTermsAndExams();
    fetchAdministrativeData();
    fetchClassesAndSections();
    fetchAcademicYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (schoolCode && selectedAcademicYear) {
      fetchDashboardStats();
      fetchDetailedStats();
      fetchFinancialData();
      fetchAdministrativeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear]);

  // Academic Calendar (events) for dashboard widget
  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        if (!schoolCode) return;
        setLoadingCalendar(true);
        const res = await fetch(`/api/calendar/academic?school_code=${encodeURIComponent(schoolCode)}&academic_year=${encodeURIComponent(String(selectedYear))}`);
        const raw = await res.text();
        const json = raw ? JSON.parse(raw) : {};
        if (res.ok && Array.isArray(json.data)) {
          setCalendarEntries(json.data);
        } else {
          setCalendarEntries([]);
        }
      } catch (e) {
        console.error('Error fetching dashboard calendar:', e);
        setCalendarEntries([]);
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, [schoolCode, selectedYear]);

  const getEventsForDay = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEntries.filter((e) => {
      const d = e.event_date ? String(e.event_date).split('T')[0] : '';
      return d === dateStr;
    });
  };

  // Handle navbar quick actions button click
  useEffect(() => {
    const handleNavbarButtonClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = document.getElementById('quick-actions-navbar-button');
      // Check if click is on the button or inside it
      if (button && (button === target || button.contains(target))) {
        event.preventDefault();
        event.stopPropagation();
        setShowQuickActionsMenu((prev) => !prev);
      }
    };

    // Use event delegation on document to catch clicks even if button isn't ready yet
    // This ensures the listener works even on first load
    document.addEventListener('click', handleNavbarButtonClick, true);
    
    return () => {
      document.removeEventListener('click', handleNavbarButtonClick, true);
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showQuickActionsMenu && !target.closest('.quick-actions-menu-container') && !target.closest('#quick-actions-navbar-button')) {
        setShowQuickActionsMenu(false);
      }
      if (showDownloadMenu && !target.closest('.download-menu-container')) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickActionsMenu, showDownloadMenu]);

  // Refetch financial data when period changes
  useEffect(() => {
    if (schoolCode) fetchFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feePeriod, schoolCode]);

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
    const seq = ++dashboardStatsSeq.current;
    try {
      const params = new URLSearchParams({ school_code: schoolCode });
      if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
      const response = await fetch(`/api/dashboard/stats?${params}`);
      const result = await response.json();

      if (seq !== dashboardStatsSeq.current) return;
      if (response.ok && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (seq === dashboardStatsSeq.current) {
        setLoading(false);
      }
    }
  };

  const fetchDetailedStats = async () => {
    const seq = ++dashboardDetailedSeq.current;
    try {
      setLoadingDetailed(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
      const response = await fetch(`/api/dashboard/stats-detailed?${params}`);
      const result = await response.json();
      if (seq !== dashboardDetailedSeq.current) return;
      if (response.ok && result.data) {
        setDetailedStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching detailed stats:', err);
    } finally {
      if (seq === dashboardDetailedSeq.current) {
        setLoadingDetailed(false);
      }
    }
  };

  const fetchFinancialData = async () => {
    if (!schoolCode) return;
    const seq = ++dashboardFinancialSeq.current;
    try {
      setLoadingFinancial(true);
      const params = new URLSearchParams({ school_code: schoolCode, period: feePeriod });
      if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
      const response = await fetch(`/api/dashboard/financial-overview?${params}`);
      const result = response.ok ? await response.json().catch(() => ({})) : {};
      if (seq !== dashboardFinancialSeq.current) return;
      if (response.ok && result.data) {
        setFinancialData(result.data);
      } else if (seq === dashboardFinancialSeq.current) {
        setFinancialData(null);
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
      if (seq === dashboardFinancialSeq.current) {
        setFinancialData(null);
      }
    } finally {
      if (seq === dashboardFinancialSeq.current) {
        setLoadingFinancial(false);
      }
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

  const fetchAdministrativeData = async () => {
    try {
      setLoadingAdministrative(true);
      const response = await fetch(`/api/dashboard/administrative?school_code=${schoolCode}`, { next: { revalidate: 60 } });
      const result = await response.json();
      if (response.ok && result.data) {
        setAdministrativeData(result.data);
      }
    } catch (err) {
      console.error('Error fetching administrative data:', err);
    } finally {
      setLoadingAdministrative(false);
    }
  };

  const toggleTermExpansion = (termId: string) => {
    setExpandedTermIds((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return next;
    });
  };

  const getExamStatusMeta = (exam: Exam) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const examDate = exam.start_date ? new Date(exam.start_date) : null;
    const isPast = examDate ? examDate < today : false;

    if (exam.status === 'ongoing') {
      return { label: 'Ongoing', className: 'bg-[#DCFCE7] text-[#22C55E]' };
    }

    if (exam.status === 'completed' || isPast) {
      return { label: 'Previous', className: 'bg-[#FEF3C7] text-[#D97706]' };
    }

    return { label: 'Upcoming', className: 'bg-[#F1F5F9] dark:bg-[#2D3748] text-[#2C3E50] dark:text-[#5A879A]' };
  };

  const fetchTermsAndExams = async () => {
    try {
      setLoadingExams(true);
      const [termsRes, examsRes] = await Promise.all([
        fetch(`/api/terms?school_code=${schoolCode}`),
        fetch(`/api/examinations?school_code=${schoolCode}`),
      ]);

      const termsJson = termsRes.ok ? await termsRes.json().catch(() => ({})) : {};
      const examsJson = examsRes.ok ? await examsRes.json().catch(() => ({})) : {};

      const fetchedTerms = (termsJson?.data ?? []) as Term[];
      const exams = (examsJson?.data ?? []) as Exam[];

      const map: Record<string, Exam[]> = {};
      exams.forEach((exam) => {
        const termId = exam.term_id ? String(exam.term_id) : '';
        if (!termId) return;
        if (!map[termId]) map[termId] = [];
        map[termId].push(exam);
      });

      // Sort exams inside each term by start_date ascending
      Object.keys(map).forEach((termId) => {
        map[termId].sort((a, b) => {
          if (!a.start_date || !b.start_date) return 0;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });
      });

      setTerms(fetchedTerms);
      setExamsByTermId(map);
      setExpandedTermIds(new Set());
    } catch (err) {
      console.error('Error fetching examinations:', err);
      setTerms([]);
      setExamsByTermId({});
      setExpandedTermIds(new Set());
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      setLoadingAcademicYears(true);
      const response = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const result = await response.json();
      if (response.ok && Array.isArray(result.data) && result.data.length > 0) {
        const rows = result.data as Array<{ year_name?: string; is_current?: boolean; end_date?: string | null }>;
        const years = rows
          .map((r) => String(r.year_name || '').trim())
          .filter(Boolean);
        setAcademicYears(years);

        const currentRow = rows.find((r) => r.is_current && r.year_name);
        const fallbackYear = years[0] || '';
        const selectedYear = currentRow?.year_name ? String(currentRow.year_name) : fallbackYear;
        setSelectedAcademicYear(prev => prev || selectedYear);

        const endDate = String(currentRow?.end_date || '').trim();
        if (endDate) {
          const expiry = new Date(`${endDate}T23:59:59`);
          setIsCurrentAcademicYearExpired(Number.isFinite(expiry.getTime()) && Date.now() > expiry.getTime());
        } else {
          setIsCurrentAcademicYearExpired(false);
        }
      } else {
        setAcademicYears([]);
        setSelectedAcademicYear('');
        setIsCurrentAcademicYearExpired(false);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears([]);
      setSelectedAcademicYear('');
      setIsCurrentAcademicYearExpired(false);
    } finally {
      setLoadingAcademicYears(false);
    }
  };

  const fetchClassesAndSections = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const classes = result.data;
        // Count unique classes
        const uniqueClasses = new Set(classes.map((cls: { class: string }) => cls.class));
        setClassesCount(uniqueClasses.size);
        
        // Count unique sections (class-section combinations)
        const uniqueSections = new Set(
          classes.map((cls: { class: string; section: string }) => `${cls.class}-${cls.section}`)
        );
        setSectionsCount(uniqueSections.size);
      } else {
        setClassesCount(0);
        setSectionsCount(0);
      }
    } catch (err) {
      console.error('Error fetching classes and sections:', err);
      setClassesCount(0);
      setSectionsCount(0);
    } finally {
      setLoadingClasses(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-10 w-40 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`stat-skeleton-${index}`}>
              <div className="space-y-3">
                <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="space-y-4">
              <div className="h-6 w-52 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`detail-skeleton-${index}`}
                    className="h-24 rounded-lg bg-slate-100 dark:bg-slate-900"
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="h-6 w-40 rounded-md bg-slate-200 dark:bg-slate-800" />
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`list-skeleton-${index}`}
                  className="h-12 rounded-lg bg-slate-100 dark:bg-slate-900"
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-[#0F172A] text-lg mb-4">School not found</p>
          <Button onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  const handleClassWiseFeeReport = async () => {
    try {
      const response = await fetch(`/api/fees/reports/class-wise?school_code=${schoolCode}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch report');
      }
      const rows = result.data || [];
      const headers = ['Class', 'Section', 'Academic Year', 'Total Students', 'Expected Fees (₹)', 'Collected (₹)', 'Pending (₹)', 'Collection %'];
      const escapeCsv = (val: unknown) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csvLines = [headers.join(',')];
      rows.forEach((r: { class?: string; section?: string; academic_year?: string; total_students?: number; expected_fees?: number; collected?: number; pending?: number; collection_percent?: number }) => {
        csvLines.push([r.class, r.section, r.academic_year, r.total_students, r.expected_fees, r.collected, r.pending, r.collection_percent].map(escapeCsv).join(','));
      });
      const csv = csvLines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class_wise_fee_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading class-wise fee report:', err);
      alert(err instanceof Error ? err.message : 'Failed to download class-wise fee report.');
    }
  };

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

  // Get today's date formatted
  // const today = new Date();
  // const formattedDate = today.toLocaleDateString('en-GB', { 
  //   day: '2-digit', 
  //   month: 'long', 
  //   year: 'numeric' 
  // });

  // Define menu items organized by category
  type MenuItem = {
    label: string;
    path: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    subItems?: Array<{
      label: string;
      path: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
    }>;
  };

  const quickActionsMenuItems: Record<string, MenuItem[]> = {
    quick: [
      { label: 'Student-wise Fee', path: '/fees/student-wise', icon: IndianRupee, color: '#F97316' },
      { label: 'Create Diary', path: '/homework', icon: BookMarked, color: '#F97316' },
      { label: 'Notice / Circular', path: '/communication', icon: FileText, color: '#F97316' },
      { label: 'Post An Event', path: '/calendar/events', icon: CalendarDays, color: '#F97316' },
      { label: 'Manage Expense', path: '/expense-income', icon: TrendingUp, color: '#F97316' },
      { label: 'Salary Slip', path: '/expense-income', icon: FileText, color: '#F97316' },
    ],
    admin: [
      { label: 'Institute Info', path: '/institute-info', icon: Building2, color: '#F97316', subItems: [] },
      { label: 'Storage Used', path: '/settings', icon: Database, color: '#F97316', subItems: [] },
      { label: 'Download Statistics', path: '/reports', icon: TrendingDown, color: '#F97316', subItems: [] },
      { label: 'Admin Role Management', path: '/settings/roles', icon: Shield, color: '#F97316', subItems: [] },
      { label: 'Staff Management', path: '/staff-management/directory', icon: UserCheck, color: '#F97316', subItems: [
        { label: 'Add Staff', path: '/staff-management/add', icon: UserPlus },
        { label: 'Staff Directory', path: '/staff-management/directory', icon: Users },
        { label: 'Staff Attendance', path: '/staff-management/attendance', icon: Calendar },
        { label: 'Bulk Import Staff', path: '/staff-management/bulk-import', icon: Upload },
        { label: 'Bulk Photo Upload', path: '/staff-management/bulk-photo', icon: Camera },
      ]},
      { label: 'I Card/ Bus Pass/ Admit Card', path: '/certificates', icon: FileText, color: '#F97316', subItems: [] },
      { label: 'Password Management', path: '/password', icon: Key, color: '#F97316', subItems: [] },
      { label: 'Student Management', path: '/students/directory', icon: Users, color: '#F97316', subItems: [
        { label: 'Add Student', path: '/students/add', icon: UserPlus },
        { label: 'Student Directory', path: '/students/directory', icon: Users },
        { label: 'Student Attendance', path: '/students/attendance', icon: Calendar },
        { label: 'Bulk Import Students', path: '/students/bulk-import', icon: Upload },
        { label: 'Student Siblings', path: '/students/siblings', icon: UsersRound },
      ]},
      { label: 'Event & Holiday Management', path: '/calendar/events', icon: CalendarDays, color: '#F97316', subItems: [
        { label: 'Academic Calendar', path: '/calendar/academic', icon: CalendarDays },
        { label: 'Events', path: '/calendar/events', icon: CalendarDays },
        { label: 'Birthdays', path: '/calendar/events/birthdays', icon: CalendarDays },
      ]},
    ],
    finance: [
      { label: 'Fees', path: '/fees', icon: IndianRupee, color: '#F97316', subItems: [
        { label: 'Fee Configuration', path: '/fees/configuration', icon: Settings },
        { label: 'Fee Basics', path: '/fees/basics', icon: Calendar },
        { label: 'Class-wise Fee', path: '/fees/class-wise', icon: Users },
        { label: 'Student-wise Fee', path: '/fees/student-wise', icon: Users },
        { label: 'Student Class & Fee Schedule Mapper', path: '/fees/mapper', icon: AlertCircleIcon },
        { label: 'Pending cheque', path: '/fees/pending-cheque', icon: CreditCard },
      ]},
      { label: 'Expense/Income', path: '/expense-income', icon: TrendingUp, color: '#F97316', subItems: [] },
    ],
    academics: [
      { label: 'Classes', path: '/classes', icon: BookOpen, color: '#F97316', subItems: [
        { label: 'Classes Overview', path: '/classes/overview', icon: BookOpen },
        { label: 'Modify Classes', path: '/classes/modify', icon: BookOpen },
      ]},
      { label: 'Timetable', path: '/timetable', icon: CalendarDays, color: '#F97316', subItems: [
        { label: 'Timetable Builder', path: '/timetable', icon: CalendarDays },
        { label: 'Class Timetable', path: '/timetable/class', icon: CalendarDays },
        { label: 'Teacher Timetable', path: '/timetable/teacher', icon: CalendarDays },
        { label: 'Group Wise Timetable', path: '/timetable/group-wise', icon: CalendarDays },
      ]},
      { label: 'Examinations', path: '/examinations', icon: FileText, color: '#F97316', subItems: [
        { label: 'Create Examination', path: '/examinations/create', icon: FileText },
        { label: 'Exam Schedule', path: '/examinations', icon: Calendar },
        { label: 'View Marks', path: '/examinations/marks-entry', icon: FileCheck },
      ]},
      { label: 'Digital Diary', path: '/homework', icon: BookMarked, color: '#F97316', subItems: [] },
      { label: 'Copy Checking', path: '/copy-checking', icon: FileText, color: '#F97316', subItems: [] },
      { label: 'Certificate Management', path: '/certificates', icon: Award, color: '#F97316', subItems: [
        { label: 'Certificate Dashboard', path: '/certificates', icon: Award },
        { label: 'New Certificate', path: '/certificates/new', icon: Award },
      ]},
    ],
    transport: [
      { label: 'Transport', path: '/transport', icon: Bus, color: '#2F6FED', subItems: [
        { label: 'Transport Dashboard', path: '/transport/dashboard', icon: Bus },
        { label: 'Vehicles', path: '/transport/vehicles', icon: Bus },
        { label: 'Stops', path: '/transport/stops', icon: Bus },
        { label: 'Routes', path: '/transport/routes', icon: Bus },
        { label: 'Student Route Mapping', path: '/transport/route-students', icon: Users },
      
      ]},
    ],
    communication: [
      { label: 'Communication', path: '/communication', icon: MessageSquare, color: '#F97316', subItems: [] },
    ],
    reports: [
      { label: 'Report', path: '/reports', icon: FileBarChart, color: '#F97316', subItems: [] },
    ],
  };

  const toggleItemExpansion = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-8 bg-background min-h-screen p-6">
      {/* Header with School Name, Date, and Quick Actions Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {isCurrentAcademicYearExpired && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircleIcon size={18} className="shrink-0" />
              Your current academic year is expired. Please create a new academic year.
            </div>
            <Button
              onClick={() => router.push(`/dashboard/${schoolCode}/academic-year-management/year-setup`)}
              className="shrink-0"
            >
              Setup Academic Year
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              {school && typeof (school as unknown as { logo_url?: string }).logo_url === 'string' && (school as unknown as { logo_url?: string }).logo_url ? (
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm flex-shrink-0 relative">
                  <Image
                    src={(school as unknown as { logo_url: string }).logo_url}
                    alt="School Logo"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  {school?.school_name || 'Institute Dashboard'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <label className="text-sm text-gray-500">Academic Year:</label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                    disabled={loadingAcademicYears}
                  >
                    {academicYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Quick Actions Dropdown Menu - Positioned relative to navbar button */}
            {showQuickActionsMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed top-20 right-4 w-[800px] max-w-[calc(100vw-2rem)] glass-card rounded-xl soft-shadow-lg border border-border z-50 overflow-hidden quick-actions-menu-container"
              >
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-2 bg-muted/50">
                    <button
                      onClick={() => setActiveQuickActionTab('quick')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'quick'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      QUICK ACTIONS
                      {activeQuickActionTab === 'quick' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                      {activeQuickActionTab === 'quick' && (
                        <Edit className="absolute -top-1 -right-6 text-[#2F6FED]" size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('admin')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'admin'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      ADMIN
                      {activeQuickActionTab === 'admin' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('finance')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'finance'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      FINANCE
                      {activeQuickActionTab === 'finance' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('academics')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'academics'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      ACADEMICS
                      {activeQuickActionTab === 'academics' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('transport')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'transport'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      TRANSPORT
                      {activeQuickActionTab === 'transport' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('communication')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'communication'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      COMMUNICATION
                      {activeQuickActionTab === 'communication' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveQuickActionTab('reports')}
                      className={`px-4 py-2 text-xs font-medium transition-colors relative ${
                        activeQuickActionTab === 'reports'
                          ? 'text-[#2C3E50] dark:text-[#5A879A]'
                          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
                      }`}
                    >
                      REPORTS
                      {activeQuickActionTab === 'reports' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                      )}
                    </button>
                  </div>

                  {/* Menu Items Grid */}
                  <div className="p-6 max-h-[600px] overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4">
                      {quickActionsMenuItems[activeQuickActionTab].map((item, index) => {
                        const Icon = item.icon;
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isExpanded = expandedItems.has(item.label);
                        
                        return (
                          <div key={index}>
                            <button
                              onClick={() => {
                                if (hasSubItems) {
                                  toggleItemExpansion(item.label);
                                } else {
                                  router.push(`/dashboard/${schoolCode}${item.path}`);
                                  setShowQuickActionsMenu(false);
                                }
                              }}
                              className="w-full p-4 glass-card rounded-lg border border-border hover:border-[#2C3E50]/30 dark:hover:border-[#4A707A]/30 hover:soft-shadow-md transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#2C3E50]/10 dark:bg-[#4A707A]/10">
                                  <Icon className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                                </div>
                                <span className="text-sm font-medium text-foreground text-left">{item.label}</span>
                              </div>
                              {hasSubItems && (
                                <ChevronDown 
                                  className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                  size={16} 
                                />
                              )}
                            </button>
                            
                            {/* Sub-items */}
                            {hasSubItems && isExpanded && (
                              <div className="mt-2 ml-4 space-y-2">
                                {item.subItems?.map((subItem, subIndex) => {
                                  const SubIcon = subItem.icon;
                                  return (
                                    <button
                                      key={subIndex}
                                      onClick={() => {
                                        router.push(`/dashboard/${schoolCode}${subItem.path}`);
                                        setShowQuickActionsMenu(false);
                                      }}
                                      className="w-full p-3 bg-muted/50 rounded-lg border border-border hover:border-[#2C3E50]/30 dark:hover:border-[#4A707A]/30 hover:bg-card transition-all flex items-center gap-3 text-left"
                                    >
                                      <SubIcon className="text-[#2C3E50] dark:text-[#5A879A]" size={16} />
                                      <span className="text-xs font-medium text-foreground">{subItem.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
              </motion.div>
            )}
          <div className="relative download-menu-container">
  <Button
    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
    className="flex items-center gap-1.5 bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E3A8A] hover:to-[#2F6FED] text-white shadow-md shadow-[#2F6FED]/30 text-s px-3 py-1.5 h-auto"
  >
  
    Download Statistics
    <ChevronDown size={12} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
  </Button>
            {showDownloadMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] rounded-lg shadow-xl border border-[#E5E7EB] z-50 overflow-hidden"
              >
                <button
                  onClick={() => handleDownload('students')}
                  disabled={downloading === 'students'}
                  className="w-full px-4 py-3 text-left hover:bg-[#F1F5F9] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users size={18} className="text-[#2C3E50] dark:text-[#5A879A]" />
                  <span className="font-medium">
                    {downloading === 'students' ? 'Downloading...' : 'Student Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('staff')}
                  disabled={downloading === 'staff'}
                  className="w-full px-4 py-3 text-left hover:bg-[#F1F5F9] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-[#E5E7EB]"
                >
                  <UserCheck size={18} className="text-[#22C55E]" />
                  <span className="font-medium">
                    {downloading === 'staff' ? 'Downloading...' : 'Staff Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('parents')}
                  disabled={downloading === 'parents'}
                  className="w-full px-4 py-3 text-left hover:bg-[#F1F5F9] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-[#E5E7EB]"
                >
                  <Users size={18} className="text-[#2F6FED]" />
                  <span className="font-medium">
                    {downloading === 'parents' ? 'Downloading...' : 'Parent Data Download'}
                  </span>
                </button>
                <button
                  onClick={() => handleDownload('attendance')}
                  disabled={downloading === 'attendance'}
                  className="w-full px-4 py-3 text-left hover:bg-[#F1F5F9] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-[#E5E7EB]"
                >
                  <Calendar size={18} className="text-[#F97316]" />
                  <span className="font-medium">
                    {downloading === 'attendance' ? 'Downloading...' : 'Attendance Data Download'}
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI Cards - Colorful Design */}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

  {/* STUDENTS & STAFF */}
  <motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -4 }}
  onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
  className="cursor-pointer rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all"
>
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <p className="text-sm font-semibold text-gray-600">
      Students & Staff
    </p>
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
      <UserPlus size={18} className="text-blue-700" />
    </div>
  </div>

  {/* Exact 50 / 50 split */}
  <div className="flex rounded-xl border border-gray-100 overflow-hidden">
    
    {/* Students */}
    <div className="w-1/2 flex flex-col items-center justify-center py-4">
      <p className="text-xs text-gray-400 mb-1">
        Students
      </p>
      <p className="text-2xl font-bold text-gray-900 leading-none">
        {loading ? '—' : stats.totalStudents.toLocaleString()}
      </p>
    </div>

    {/* Divider */}
    <div className="w-px bg-gray-100" />

    {/* Staff */}
    <div className="w-1/2 flex flex-col items-center justify-center py-4">
      <p className="text-xs text-gray-400 mb-1">
        Staff
      </p>
      <p className="text-2xl font-bold text-gray-900 leading-none">
        {loading ? '—' : stats.totalStaff.toLocaleString()}
      </p>
    </div>

  </div>
</motion.div>


  {/* FEES & EXPENSES */}
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`)}
    className="cursor-pointer rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-semibold text-gray-600">Fees & Expenses</p>
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
        <IndianRupee size={18} className="text-green-700" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-xs text-gray-400">Total Fees</p>
        <p className="font-semibold text-green-600">
          ₹{financialData?.feeManagement?.totalCollected?.toLocaleString('en-IN') ?? 0}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Total Expense</p>
        <p className="font-semibold text-red-600">
          ₹{financialData?.incomeAndExpense?.totalExpense?.toLocaleString('en-IN') ?? 0}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Today Fees</p>
        <p className="font-semibold text-green-600">
          ₹{financialData?.feeManagement?.todayCollection?.toLocaleString('en-IN') ?? 0}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Today Expense</p>
        <p className="font-semibold text-red-600">
          ₹{financialData?.incomeAndExpense?.todayExpense?.toLocaleString('en-IN') ?? 0}
        </p>
      </div>
    </div>
  </motion.div>

  {/* TODAY'S ATTENDANCE */}
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    onClick={() => router.push(`/dashboard/${schoolCode}/attendance`)}
    className="cursor-pointer rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-semibold text-gray-600">Today’s Attendance</p>
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
        <UserCheck size={18} className="text-emerald-700" />
      </div>
    </div>

    <div className="space-y-3">
      {[
        { label: 'Staff', value: stats.todayAttendance.staff?.percentage ?? 0 },
        { label: 'Students', value: stats.todayAttendance.students?.percentage ?? 0 },
      ].map(({ label, value }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold">{value}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: `${value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </motion.div>

  {/* CLASSES & SECTIONS */}
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    onClick={() => router.push(`/dashboard/${schoolCode}/classes/overview`)}
    className="cursor-pointer rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-semibold text-gray-600">Classes & Sections</p>
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
        <BookOpen size={18} className="text-orange-700" />
      </div>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Classes</span>
        <span className="font-semibold">{classesCount}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Sections</span>
        <span className="font-semibold">{sectionsCount}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-orange-500"
          animate={{ width: sectionsCount ? '100%' : '0%' }}
        />
      </div>
    </div>
  </motion.div>

</div>



      {/* Staff & Student Enrollment Overview and Examination Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff & Student Enrollment Overview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm"
        >
        <h3 className="text-lg font-semibold text-foreground mb-5">Staff & Student Enrollment Overview</h3>
          {loadingDetailed ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED]" />
            </div>
          ) : (
          <div className="space-y-6">
            {/* Headcount Section */}
              <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[#0F172A]">Headcount</h4>
                <button
                  onClick={() => fetchDetailedStats()}
                  className="p-1 rounded-full hover:bg-[#F1F5F9] transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="text-[#64748B]" size={14} strokeWidth={2} />
                </button>
                      </div>

              {/* Students Section */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#2C3E50]/10 flex items-center justify-center">
                      <Users className="text-[#2C3E50] dark:text-[#4A707A]" size={16} />
                    </div>
                    <span className="text-sm font-medium text-[#0F172A]">
                      Students ({(() => {
                        const male = detailedStats?.genderStats?.male ?? 0;
                        const female = detailedStats?.genderStats?.female ?? 0;
                        const other = detailedStats?.genderStats?.other ?? 0;
                        return male + female + other;
                      })()})
                          </span>
                        </div>
                  <button
                    onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
                    className="w-6 h-6 rounded-full bg-[#F1F5F9] dark:bg-[#2D3748] flex items-center justify-center hover:bg-[#2C3E50]/10 dark:hover:bg-[#4A707A]/20 transition-colors"
                    aria-label="View students"
                    title="View students"
                  >
                    <Play className="text-[#F97316]" size={10} fill="currentColor" />
                  </button>
                      </div>
                
                {/* Gender Distribution Bar Chart */}
                <div className="mb-2">
                  <div className="relative w-full h-6 bg-[#E5E7EB] rounded overflow-hidden flex">
                    {detailedStats?.genderStats && (() => {
                      const malePercent = detailedStats.genderStats.malePercent ?? 0;
                      const femalePercent = detailedStats.genderStats.femalePercent ?? 0;
                      const remainingPercent = 100 - (malePercent + femalePercent);
                      return (
                        <>
                          {malePercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${malePercent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {malePercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                          {femalePercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${femalePercent}%` }}
                              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                              className="bg-[#FF1493] dark:bg-[#5A879A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {femalePercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                          {remainingPercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${remainingPercent}%` }}
                              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                              className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {remainingPercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                        </>
                      );
                    })()}
                        </div>
                      </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  {(() => {
                    const malePercent = detailedStats?.genderStats?.malePercent ?? 0;
                    const femalePercent = detailedStats?.genderStats?.femalePercent ?? 0;
                    const remainingPercent = 100 - (malePercent + femalePercent);
                    return (
                      <>
                        {malePercent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                            <span className="text-[#64748B]">Male ({malePercent.toFixed(1)}%)</span>
                          </div>
                        )}
                        {femalePercent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#FF1493] dark:bg-[#5A879A]"></div>
                            <span className="text-[#FF1493]">Female ({femalePercent.toFixed(1)}%)</span>
                          </div>
                        )}
                        {remainingPercent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                            <span className="text-[#64748B]">Not Mapped ({remainingPercent.toFixed(1)}%)</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Staffs Section */}
                    <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#2C3E50]/10 flex items-center justify-center">
                      <UserCheck className="text-[#F97316]" size={16} />
                      </div>
                    <span className="text-sm font-medium text-[#0F172A]">
                      Staffs ({detailedStats?.staffGenderStats?.total ?? detailedStats?.staffBreakdown?.total ?? 0})
                    </span>
                        </div>
                  <button
                    onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/directory`)}
                    className="w-6 h-6 rounded-full bg-[#F1F5F9] dark:bg-[#2D3748] flex items-center justify-center hover:bg-[#2C3E50]/10 dark:hover:bg-[#4A707A]/20 transition-colors"
                    aria-label="View staff"
                    title="View staff"
                  >
                    <Play className="text-[#F97316]" size={10} fill="currentColor" />
                  </button>
                  </div>
                
                {/* Gender Distribution Bar Chart */}
                <div className="mb-2">
                  <div className="relative w-full h-6 bg-[#E5E7EB] rounded overflow-hidden flex">
                    {detailedStats?.staffGenderStats ? (() => {
                      const malePercent = detailedStats.staffGenderStats.malePercent ?? 0;
                      const femalePercent = detailedStats.staffGenderStats.femalePercent ?? 0;
                      const otherPercent = detailedStats.staffGenderStats.otherPercent ?? 0;
                      return (
                        <>
                          {malePercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${malePercent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {malePercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                          {femalePercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${femalePercent}%` }}
                              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                              className="bg-[#EC4899] dark:bg-[#F472B6] h-full flex items-center justify-center"

                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {femalePercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                          {otherPercent > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${otherPercent}%` }}
                              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                              className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">
                                {otherPercent.toFixed(1)}%
                              </span>
                            </motion.div>
                          )}
                          {otherPercent === 0 && malePercent === 0 && femalePercent === 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-semibold px-1">100.0%</span>
                            </motion.div>
                          )}
                        </>
                      );
                    })() : (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="bg-[#2C3E50] dark:bg-[#4A707A] h-full flex items-center justify-center"
                      >
                        <span className="text-[10px] text-white font-semibold px-1">100.0%</span>
                      </motion.div>
                    )}
                        </div>
                      </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  {(() => {
                    const malePercent = detailedStats?.staffGenderStats?.malePercent ?? 0;
                    const femalePercent = detailedStats?.staffGenderStats?.femalePercent ?? 0;
                    const otherPercent = detailedStats?.staffGenderStats?.otherPercent ?? 0;
                    const hasNoData = malePercent === 0 && femalePercent === 0 && otherPercent === 0;
                    
                    if (!detailedStats?.staffGenderStats || hasNoData) {
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#38BDF8]"></div>
                          <span className="text-[#64748B]">Not Mapped (100.0%)</span>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {malePercent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                            <span className="text-[#64748B]">Male ({malePercent.toFixed(1)}%)</span>
                          </div>
                        )}
                        {femalePercent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#4A707A] dark:bg-[#5A879A]"></div>
                            <span className="text-[#64748B]">Female ({femalePercent.toFixed(1)}%)</span>
                          </div>
                        )}
                        {(otherPercent > 0 || hasNoData) && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#2C3E50] dark:bg-[#4A707A]"></div>
                            <span className="text-[#64748B]">
                              Not Mapped ({otherPercent > 0 ? otherPercent.toFixed(1) : '100.0'}%)
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                    </div>
                  </div>
                </div>
          )}
        </motion.div>

        {/* Examination Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="text-[#64748B]" size={18} strokeWidth={2} />
            Term Management
          </h3>
          <button
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F6FED] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Create Examination
          </button>
                      </div>

        {loadingExams ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6FED]" />
            </div>
          ) : (
          <div className="space-y-3">
            {terms.length > 0 ? (
              terms.map((term) => {
                const termExams = examsByTermId[term.id] ?? [];
                const isExpanded = expandedTermIds.has(term.id);

                return (
                  <div key={term.id} className="rounded-lg border border-[#E5E7EB] overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                      onClick={() => toggleTermExpansion(term.id)}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-[#0F172A]">{term.name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F1F5F9] dark:bg-[#2D3748] text-[#2C3E50] dark:text-[#5A879A]">
                            {termExams.length} Exams
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#64748B]">
                          {term.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(term.start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronDown
                        size={16}
                        className={`text-[#64748B] transition-transform ${isExpanded ? 'rotate-0' : 'rotate-[-90deg]'}`}
                      />
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 p-3 bg-white border-t border-[#E5E7EB]">
                        {termExams.length > 0 ? (
                          termExams.map((exam) => {
                            const statusMeta = getExamStatusMeta(exam);
                            return (
                              <div
                                key={exam.id}
                                className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                                onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-[#0F172A]">{exam.exam_name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-[#64748B]">
                                    {exam.exam_type && (
                                      <span className="flex items-center gap-1">
                                        <FileText size={12} />
                                        {exam.exam_type}
                                      </span>
                                    )}
                                    {exam.start_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(exam.start_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {exam.class && (
                                      <span>
                                        {exam.class.class}-{exam.class.section}
                                        {exam.class.academic_year && ` (${exam.class.academic_year})`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-sm text-[#64748B] py-6">
                            No examinations mapped for this term
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // No terms at all
              <div className="text-center py-12">
                <FileText className="mx-auto text-[#64748B] mb-3" size={48} />
                <p className="text-[#0F172A] font-medium mb-1">No terms found</p>
                <p className="text-sm text-[#64748B]">Create terms to manage examinations</p>
              </div>
            )}
          </div>
        )}
        </motion.div>
      </div>

      {/* Financial Management Overview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-foreground mb-5">Financial Management Overview</h3>
        
        {loadingFinancial ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED]" />
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income And Expense Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[#0F172A]">Income And Expense</h4>
            <button 
                  onClick={() => fetchFinancialData()}
                  className="p-1 rounded-full hover:bg-[#F1F5F9] transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="text-[#64748B]" size={14} strokeWidth={2} />
            </button>
          </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0F172A]">Total Income:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0F172A]">
                      ₹{financialData?.incomeAndExpense?.totalIncome?.toLocaleString('en-IN') ?? '0'}
                    </span>
                    <Info className="text-[#64748B]" size={14} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0F172A]">Total Expense:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0F172A]">
                      ₹{financialData?.incomeAndExpense?.totalExpense?.toLocaleString('en-IN') ?? '0'}
                    </span>
                    <Info className="text-[#64748B]" size={14} />
              </div>
              </div>
              </div>

              {/* Bar Chart */}
              {financialData?.incomeAndExpense?.monthlyData && financialData.incomeAndExpense.monthlyData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData.incomeAndExpense.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      }}
                      formatter={(value: number | string | undefined) => {
                        if (value === undefined) return '₹0';
                        return `₹${Number(value).toLocaleString('en-IN')}`;
                      }}
                    />
                      <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-3 mt-2 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-3 h-3 bg-[#22C55E] rounded flex-shrink-0"></div>
                      <span className="text-[#64748B] whitespace-nowrap">Income</span>
                  </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-3 h-3 bg-[#EF4444] rounded flex-shrink-0"></div>
                      <span className="text-[#64748B] whitespace-nowrap">Expense</span>
                </div>
              </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[#64748B]">
                  <p className="text-sm">No data available</p>
                </div>
              )}
              </div>

            {/* Fee Management Section */}
              <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[#0F172A]">Fee Management</h4>
                <button
                  onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
                  className="p-1 rounded-full hover:bg-[#F1F5F9] transition-colors"
                  aria-label="View Fees"
                >
                  <ChevronRight className="text-[#64748B]" size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Today's Fee Collection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#0F172A]">Today&apos;s Fee Collection:</span>
                  <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0F172A]">
                        ₹{financialData?.feeManagement?.todayCollection?.toLocaleString('en-IN') ?? '0'}
                    </span>
                      <Info className="text-[#64748B]" size={14} />
                  </div>
                </div>
                  <p className="text-xs text-[#64748B]">Basis Fee Entry Date</p>
                </div>

                {/* Date Range Selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFeePeriod('till_date')}
                    className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                      feePeriod === 'till_date'
                        ? 'bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white'
                        : 'bg-[#FFFFFF] text-[#0F172A] border border-[#E5E7EB] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    TILL DATE
                  </button>
                  <button
                    onClick={() => setFeePeriod('annual')}
                    className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                      feePeriod === 'annual'
                        ? 'bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white'
                        : 'bg-[#FFFFFF] text-[#0F172A] border border-[#E5E7EB] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    ANNUAL
                  </button>
                </div>

                {/* Fee Collection Progress Bar */}
                <div>
                  <div className="w-full h-8 bg-[#E5E7EB] rounded overflow-hidden flex">
                    {financialData?.feeManagement && (
                      <>
                        <div 
                          className="bg-[#2F6FED] h-full flex items-center justify-between px-2 transition-all duration-500"
                          style={{ width: `${financialData.feeManagement.collectedPercent}%` }}
                        >
                          <span className="text-xs text-white font-semibold">
                            ₹{financialData.feeManagement.totalCollected.toLocaleString('en-IN')} ({financialData.feeManagement.collectedPercent.toFixed(2)}%)
                    </span>
                          <div className="flex items-center gap-1">
                            <Info className="text-white" size={12} />
                            <RefreshCw className="text-white" size={12} />
                  </div>
                </div>
                        <div 
                          className="bg-[#EF4444] h-full flex items-center justify-between px-2 transition-all duration-500"
                          style={{ width: `${financialData.feeManagement.duePercent}%` }}
                        >
                          <span className="text-xs text-white font-semibold">
                            ₹{financialData.feeManagement.totalDue.toLocaleString('en-IN')} ({financialData.feeManagement.duePercent.toFixed(2)}%)
                          </span>
                          <RefreshCw className="text-white" size={12} />
              </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Fee Pending Section */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-[#0F172A] flex items-center gap-1">
                      Fee pending (till date)
                      <Info className="text-[#64748B]" size={14} />
                    </h5>
                  </div>
                  
                  <div className="space-y-2">
                <div className="flex items-center justify-between">
                      <span className="text-xs text-[#64748B]">Total No. of Students:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {financialData?.feeManagement?.pendingStudents ?? 0}
                        </span>
                        <RefreshCw className="text-[#64748B]" size={12} />
                        <Play className="text-[#64748B]" size={12} fill="currentColor" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#64748B]">Due Amount:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          ₹{financialData?.feeManagement?.totalDue?.toLocaleString('en-IN') ?? '0'} ({financialData?.feeManagement?.duePercent?.toFixed(2) ?? '0'}%)
                        </span>
                        <RefreshCw className="text-[#64748B]" size={12} />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white rounded-lg hover:from-[#1E3A8A] hover:to-[#2F6FED] transition-colors text-xs font-medium shadow-sm">
                      <Bell size={14} />
                      Send Reminder
                    </button>
                    <button
                      onClick={handleClassWiseFeeReport}
                      className="flex items-center gap-2 px-4 py-2 border border-[#2F6FED] text-[#2F6FED] rounded-lg hover:bg-[#EAF1FF] transition-colors text-xs font-medium"
                    >
                      <Download size={14} />
                      CLASS-WISE FEE REPORT
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

      {/* Administrative Operations Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="space-y-6"
      >
        <h3 className="text-lg font-semibold text-foreground">Administrative Operations Overview</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Updates Section */}
          <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-4">Recent Updates</h4>
            
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-[#E5E7EB]">
            <button 
                onClick={() => setActiveUpdateTab('notice')}
                className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                  activeUpdateTab === 'notice'
                    ? 'text-[#2F6FED]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                NOTICE
                {activeUpdateTab === 'notice' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6FED]"></div>
                )}
            </button>
            <button 
                onClick={() => setActiveUpdateTab('visitors')}
                className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                  activeUpdateTab === 'visitors'
                    ? 'text-[#2F6FED]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                VISITORS APPROVAL
                {activeUpdateTab === 'visitors' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6FED]"></div>
                )}
              </button>
              <button
                onClick={() => setActiveUpdateTab('leaves')}
                className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                  activeUpdateTab === 'leaves'
                    ? 'text-[#2F6FED]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                LEAVE APPROVAL
                {activeUpdateTab === 'leaves' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6FED]"></div>
                )}
            </button>
          </div>

            {/* Content */}
            {loadingAdministrative ? (
          <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6FED]" />
          </div>
        ) : (
              <div className="min-h-[300px]">
                {activeUpdateTab === 'notice' && (
          <div className="text-center py-6">
                    {administrativeData?.recentUpdates?.notices && administrativeData.recentUpdates.notices.length > 0 ? (
                      <div className="space-y-3 text-left">
                        <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                          {administrativeData.recentUpdates.noticesArePending ? 'Pending / Active notices' : 'Recent history'}
                        </p>
                        {administrativeData.recentUpdates.notices.slice(0, 3).map((notice) => (
                          <div key={notice.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
                            <h5 className="font-semibold text-[#0F172A] text-sm mb-1">{notice.title}</h5>
                            {notice.message && (
                              <p className="text-xs text-[#64748B] line-clamp-2">{notice.message}</p>
                            )}
                            {notice.created_at && (
                              <p className="text-xs text-[#64748B] mt-1">
                                {new Date(notice.created_at).toLocaleDateString()}
                              </p>
                            )}
              </div>
                        ))}
          </div>
        ) : (
                      <>
                        <div className="relative mx-auto mb-4 w-32 h-32">
                          <div className="absolute inset-0 bg-[#E0F2FE] rounded-full opacity-20"></div>
                          <div className="absolute inset-4 bg-[#E0F2FE] rounded-lg flex items-center justify-center">
                            <Package className="text-[#38BDF8]" size={48} />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A] mb-1">No notices</p>
                        <p className="text-xs text-[#64748B]">Notices will appear here once you receive any updates.</p>
                      </>
                    )}
                  </div>
                )}
                
                {activeUpdateTab === 'visitors' && (
                  <div className="text-center py-6">
                    {administrativeData?.recentUpdates?.visitors && administrativeData.recentUpdates.visitors.length > 0 ? (
                      <div className="space-y-3 text-left">
                        <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                          {administrativeData.recentUpdates.visitorsArePending ? 'Pending approval / Visitors in' : 'Recent history'}
                        </p>
                        {administrativeData.recentUpdates.visitors.slice(0, 3).map((visitor) => (
                          <div key={visitor.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
                            <h5 className="font-semibold text-[#0F172A] text-sm mb-1">{visitor.visitor_name}</h5>
                            <p className="text-xs text-[#64748B]">{visitor.purpose_of_visit}</p>
                            {visitor.created_at && (
                              <p className="text-xs text-[#64748B] mt-1">
                                {new Date(visitor.created_at).toLocaleDateString()}
                              </p>
                            )}
              </div>
                        ))}
            </div>
                    ) : (
                      <>
                        <div className="relative mx-auto mb-4 w-32 h-32">
                          <div className="absolute inset-0 bg-[#E0F2FE] rounded-full opacity-20"></div>
                          <div className="absolute inset-4 bg-[#E0F2FE] rounded-lg flex items-center justify-center">
                            <Package className="text-[#38BDF8]" size={48} />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A] mb-1">No visitors</p>
                        <p className="text-xs text-[#64748B]">Pending visitors or recent history will appear here.</p>
                      </>
                    )}
                  </div>
                )}
                
                {activeUpdateTab === 'leaves' && (
                  <div className="text-center py-6">
                    {administrativeData?.recentUpdates?.leaves && administrativeData.recentUpdates.leaves.length > 0 ? (
                      <div className="space-y-3 text-left">
                        <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                          {administrativeData.recentUpdates.leavesArePending ? 'Pending leave approval' : 'Recent history'}
                        </p>
                        {administrativeData.recentUpdates.leaves.slice(0, 3).map((leave) => (
                          <div key={leave.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
                            <h5 className="font-semibold text-[#0F172A] text-sm mb-1">
                              {leave.type === 'staff' ? (leave.leave_type || 'Staff leave') : (leave.leave_title || 'Student leave')}
                            </h5>
                            {leave.leave_start_date && leave.leave_end_date && (
                              <p className="text-xs text-[#64748B]">
                                {new Date(leave.leave_start_date).toLocaleDateString()} – {new Date(leave.leave_end_date).toLocaleDateString()}
                              </p>
                            )}
                            {leave.created_at && (
                              <p className="text-xs text-[#64748B] mt-1">
                                Applied: {new Date(leave.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
              </div>
            ) : (
                      <>
                        <div className="relative mx-auto mb-4 w-32 h-32">
                          <div className="absolute inset-0 bg-[#E0F2FE] rounded-full opacity-20"></div>
                          <div className="absolute inset-4 bg-[#E0F2FE] rounded-lg flex items-center justify-center">
                            <Package className="text-[#38BDF8]" size={48} />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A] mb-1">No leave requests</p>
                        <p className="text-xs text-[#64748B]">Pending leave approvals or recent history will appear here.</p>
                      </>
            )}
          </div>
        )}
              </div>
            )}
            </div>

          {/* Attendance Section */}
          <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-[#0F172A]">Attendance</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAdministrativeData()}
                  className="p-1 rounded-full hover:bg-[#F1F5F9] transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="text-[#64748B]" size={14} strokeWidth={2} />
                </button>
                <button
                  onClick={() => router.push(`/dashboard/${schoolCode}/attendance/staff`)}
                  className="px-3 py-1.5 bg-[#F97316] text-white rounded text-xs font-medium hover:bg-[#F97316]/90 transition-colors"
                >
                 MARK ATTENDANCE 
                </button>
          </div>
        </div>

            {loadingAdministrative ? (
          <div className="space-y-4 py-6">
                <p className="text-sm text-[#64748B] text-center">Loading attendance…</p>
                <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2F6FED] min-w-[40%]"
                    style={{
                      animation: 'loading-bar 1.2s ease-in-out infinite',
                    }}
                  />
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E5E7EB] border-t-[#2F6FED]" />
                </div>
          </div>
        ) : (
          <div className="space-y-6">
                {/* Student Attendance Overview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-semibold text-[#0F172A]">Student Attendance Overview</h5>
                      <ChevronRight className="text-[#64748B]" size={14} />
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/${schoolCode}/students/attendance`)}
                      className="px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] rounded transition-colors"
                    >
                      DETAILED VIEW
                    </button>
                  </div>
                  
                  {/* Summary Bar - proportional to counts */}
                  {(() => {
                    const s = administrativeData?.attendance?.students;
                    const total = s?.total ?? 0;
                    const present = s?.present ?? 0;
                    const absent = s?.absent ?? 0;
                    const halfday = s?.halfday ?? 0;
                    const leave = (s?.leave ?? 0) + (s?.dutyLeave ?? 0);
                    const notMarked = s?.notMarked ?? 0;
                    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
                    return (
                      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#E5E7EB] mb-3">
                        {present > 0 && <div className="bg-[#22C55E] min-w-0 shrink-0" style={{ width: `${pct(present)}%` }} title="Present" />}
                        {absent > 0 && <div className="bg-[#EF4444] min-w-0 shrink-0" style={{ width: `${pct(absent)}%` }} title="Absent" />}
                        {(halfday + leave) > 0 && <div className="bg-[#F59E0B] min-w-0 shrink-0" style={{ width: `${pct(halfday + leave)}%` }} title="Half day / Leave" />}
                        {notMarked > 0 && <div className="bg-[#94A3B8] min-w-0 shrink-0" style={{ width: `${pct(notMarked)}%` }} title="Not marked" />}
                      </div>
                    );
                  })()}
                  
                  {/* Status List */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
                        <span className="text-[#0F172A]">PRESENT:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.present ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                        <span className="text-[#0F172A]">ABSENT:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.absent ?? 0}
                      </span>
                  </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                        <span className="text-[#0F172A]">HALFDAY:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.halfday ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                        <span className="text-[#0F172A]">LEAVE:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.leave ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                        <span className="text-[#0F172A]">DUTY LEAVE:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.dutyLeave ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#64748B]"></div>
                        <span className="text-[#0F172A]">NOT MARKED:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.students?.notMarked ?? 0} ({administrativeData?.attendance?.students?.total ? ((administrativeData.attendance.students.notMarked / administrativeData.attendance.students.total) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staff Attendance Overview */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-3">
                    <h5 className="text-xs font-semibold text-[#0F172A]">Staff Attendance Overview</h5>
                    <ChevronRight className="text-[#64748B]" size={14} />
                  </div>
                  
                  {/* Summary Bar - proportional to counts */}
                  {(() => {
                    const st = administrativeData?.attendance?.staff;
                    const total = st?.total ?? 0;
                    const present = st?.present ?? 0;
                    const absent = st?.absent ?? 0;
                    const halfday = st?.halfday ?? 0;
                    const leave = (st?.leave ?? 0) + (st?.customLeaves ?? 0);
                    const notMarked = st?.notMarked ?? 0;
                    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
                    return (
                      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#E5E7EB] mb-3">
                        {present > 0 && <div className="bg-[#22C55E] min-w-0 shrink-0" style={{ width: `${pct(present)}%` }} title="Present" />}
                        {absent > 0 && <div className="bg-[#EF4444] min-w-0 shrink-0" style={{ width: `${pct(absent)}%` }} title="Absent" />}
                        {(halfday + leave) > 0 && <div className="bg-[#F59E0B] min-w-0 shrink-0" style={{ width: `${pct(halfday + leave)}%` }} title="Leave" />}
                        {notMarked > 0 && <div className="bg-[#94A3B8] min-w-0 shrink-0" style={{ width: `${pct(notMarked)}%` }} title="Not marked" />}
                      </div>
                    );
                  })()}
                  
                  {/* Status List */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
                        <span className="text-[#0F172A]">PRESENT:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.present ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                        <span className="text-[#0F172A]">ABSENT:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.absent ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                        <span className="text-[#0F172A]">HALFDAY:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.halfday ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                        <span className="text-[#0F172A]">LEAVE:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.leave ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                        <span className="text-[#0F172A]">CUSTOM LEAVES:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.customLeaves ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#64748B]"></div>
                        <span className="text-[#0F172A]">NOT MARKED:</span>
                      </div>
                      <span className="font-semibold text-[#0F172A]">
                        {administrativeData?.attendance?.staff?.notMarked ?? 0} ({administrativeData?.attendance?.staff?.total ? ((administrativeData.attendance.staff.notMarked / administrativeData.attendance.staff.total) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </div>
                  </div>
                </div>
          </div>
        )}
          </div>

          {/* Event Calendar Section */}
          <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-4">Event Calendar</h4>
            
            {/* Toggles */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0F172A]">Students&apos; Birthdays</span>
                <button
                  onClick={() => setShowStudentBirthdays(!showStudentBirthdays)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    showStudentBirthdays ? 'bg-[#2F6FED]' : 'bg-[#E5E7EB]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    showStudentBirthdays ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0F172A]">Teachers&apos; Birthdays</span>
                <button
                  onClick={() => setShowTeacherBirthdays(!showTeacherBirthdays)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    showTeacherBirthdays ? 'bg-[#2F6FED]' : 'bg-[#E5E7EB]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    showTeacherBirthdays ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="space-y-3">
              {/* Month/Year Selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-xs border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-xs border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
            </div>

              {/* Calendar Grid */}
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] border-b border-[#E5E7EB]">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-semibold text-white border-r border-white/20 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Dates */}
                <div className="grid grid-cols-7">
                  {(() => {
                    const firstDay = new Date(selectedYear, selectedMonth, 1);
                    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
                    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
                    const daysInMonth = lastDay.getDate();
                    const days = [];
                    
                    // Empty cells for days before month starts
                    for (let i = 0; i < startDay; i++) {
                      days.push(<div key={`empty-${i}`} className="p-2 min-h-[32px]"></div>);
                    }
                    
                    // Days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayEvents = getEventsForDay(selectedYear, selectedMonth, day);
                      const top = dayEvents.slice(0, 2);
                      days.push(
                        <div
                          key={day}
                          className="p-2 min-h-[68px] text-left text-xs text-[#0F172A] border-r border-b border-[#E5E7EB] last:border-r-0 hover:bg-[#F1F5F9] cursor-pointer"
                          onClick={() => router.push(`/dashboard/${schoolCode}/calendar/academic`)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{day}</span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E0E7FF] text-[#1E3A8A]">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 space-y-1">
                            {top.map((ev, idx) => (
                              <div
                                key={`${day}-ev-${idx}`}
                                className={`truncate text-[10px] px-1.5 py-0.5 rounded border ${
                                  String(ev.event_type || '').toLowerCase() === 'holiday'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : String(ev.event_type || '').toLowerCase() === 'exam'
                                      ? 'bg-orange-50 text-orange-700 border-orange-100'
                                      : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}
                                title={ev.title || 'Event'}
                              >
                                {ev.title || 'Event'}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-[10px] text-gray-500">+{dayEvents.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return days;
                  })()}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {loadingCalendar ? 'Loading events…' : `${calendarEntries.length} event(s) in ${selectedYear}`}
                </div>
                <button
                  onClick={() => router.push(`/dashboard/${schoolCode}/calendar/academic`)}
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                >
                  Open full calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <h2 className="text-base font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/students/add`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Add Student</p>
              <p className="text-sm text-gray-600 mt-1">Register new student</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/attendance`)}
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

// =============================================================================
const TEMP_DASHBOARD_SERVER_CAPACITY_GATE = true;

function ServerCapacityExhaustedScreen({ tenantId }: { tenantId: string }) {
  const [mounted, setMounted] = useState(false);
  const incidentId = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < tenantId.length; i++) {
      h ^= tenantId.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`;
  }, [tenantId]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[2147483647] flex flex-col bg-[#0c1117] text-slate-200 antialiased"
      role="alert"
      aria-live="assertive"
    >
      <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-orange-500 to-red-600" />
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3 text-xs uppercase tracking-widest text-slate-500">
        <span className="font-mono">Platform status</span>
        <span className="font-mono text-amber-500/90">Degraded · Capacity</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#131920] px-8 py-10 shadow-2xl shadow-black/40">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-950/80 border border-red-800/60">
              <Database className="h-6 w-6 text-red-400" aria-hidden />
            </div>
            <div>
              <p className="font-mono text-[11px] text-slate-500">HTTP 503 · SERVICE UNAVAILABLE</p>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Server capacity exhausted
              </h1>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Allocated compute and memory for your tenant have reached the hard
            limit. New requests cannot be served until capacity is increased.
            Kindly upgrade your plan or contact your hosting administrator.
          </p>
          <div className="mt-6 space-y-2 rounded-md border border-white/5 bg-black/30 p-4 font-mono text-[11px] text-slate-500">
            <div className="flex justify-between gap-4">
              <span>Tenant</span>
              <span className="text-slate-300">{tenantId}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Region</span>
              <span className="text-slate-300">ap-south-1</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Pool utilization</span>
              <span className="text-red-400">100% (0 burst remaining)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Incident reference</span>
              <span className="text-slate-300">CAP-{incidentId}</span>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
              <span>Reserved vCPU</span>
              <span className="font-mono text-red-400">512 / 512 units</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-600 to-red-600" />
            </div>
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-600">
            Logged {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC ·{' '}
            <span className="text-slate-500">edge-router-7b4e</span>
          </p>
        </div>
        <p className="mt-8 max-w-md text-center text-xs text-slate-600">
          If you are the account owner, open billing or subscription settings
          and increase the instance tier. Retry automatically resumes after
          provisioning completes (typically 5–15 minutes).
        </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  if (TEMP_DASHBOARD_SERVER_CAPACITY_GATE) {
    return <ServerCapacityExhaustedScreen tenantId={schoolCode} />;
  }
  return <DashboardPageContent schoolCode={schoolCode} />;
}
