'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap,
  IndianRupee,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Edit,
  FileText,
  School,
  Briefcase,
  Shield,
  CreditCard,
  Receipt,
  BarChart3,
  Loader2,
  RefreshCw
} from 'lucide-react';
import type { Student } from '@/lib/supabase';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late';
  marked_by?: string;
  remarks?: string;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface FeeRecord {
  id: string;
  receipt_no: string;
  payment_date: string;
  amount: number;
  transport_fee?: number;
  total_amount: number;
  payment_mode: string;
  collected_by?: string;
  remarks?: string;
}

interface ClassInfo {
  id: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher?: {
    id: string;
    full_name: string;
    staff_id: string;
    email?: string;
    phone?: string;
  };
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: studentId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'financial' | 'academic'>('overview');
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
  });
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [houseColor, setHouseColor] = useState<string | null>(null);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const getStudentPhotoUrl = (s: Student & { profile_photo_url?: string; image_url?: string }): string => {
    const url = s.photo_url ?? s.profile_photo_url ?? s.image_url;
    return typeof url === 'string' && url.trim() !== '' ? url.trim() : '';
  };

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudent(result.data);
      } else {
        router.push(`/dashboard/${schoolCode}/students`);
      }
    } catch (err) {
      console.error('Error fetching student:', err);
      router.push(`/dashboard/${schoolCode}/students`);
    } finally {
      setLoading(false);
    }
  }, [studentId, schoolCode, router]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  // Fetch house color when student has a house assigned
  useEffect(() => {
    const houseName = typeof student?.house === 'string' ? student.house.trim() : '';
    if (!schoolCode || !houseName) {
      setHouseColor(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/institute/houses?school_code=${encodeURIComponent(schoolCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.data)) return;
        const match = data.data.find((h: { house_name?: string }) => String(h?.house_name || '').trim() === houseName);
        if (match && (match as { house_color?: string }).house_color) {
          setHouseColor((match as { house_color: string }).house_color);
        } else {
          setHouseColor(null);
        }
      })
      .catch(() => {
        if (!cancelled) setHouseColor(null);
      });
    return () => { cancelled = true; };
  }, [schoolCode, student?.house]);

  useEffect(() => {
    if (student) {
      if (activeTab === 'attendance') {
        fetchAttendance();
      } else if (activeTab === 'financial') {
        fetchFees();
      } else if (activeTab === 'academic') {
        fetchClassInfo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, activeTab]);

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const response = await fetch(
        `/api/attendance/student?school_code=${schoolCode}&student_id=${studentId}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setAttendance(result.data);
        if (result.statistics) {
          setAttendanceStats(result.statistics);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchFees = async () => {
    try {
      setFeesLoading(true);
      const response = await fetch(
        `/api/fees?school_code=${schoolCode}&student_id=${studentId}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setFees(result.data);
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setFeesLoading(false);
    }
  };

  const fetchClassInfo = async () => {
    if (!student?.class || !student?.section || !student?.academic_year) return;
    
    try {
      const response = await fetch(
        `/api/student/class-teacher?school_code=${schoolCode}&class=${student.class}&section=${student.section}&academic_year=${student.academic_year}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setClassInfo(result.data.class);
      }
    } catch (err) {
      console.error('Error fetching class info:', err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'absent': return <XCircle size={16} className="text-red-600" />;
      case 'late': return <AlertCircle size={16} className="text-yellow-600" />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <Card>
        <div className="text-center py-12">
          <User size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg mb-4">Student not found</p>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/students`)}>
            Back to Students
          </Button>
        </div>
      </Card>
    );
  }

  // Calculate financial stats
  const financialStats = {
    totalPaid: fees.reduce((sum, fee) => sum + Number(fee.total_amount || 0), 0),
    totalTransactions: fees.length,
    lastPayment: fees.length > 0 ? fees[0].payment_date : null,
    pendingAmount: 0, // TODO: Calculate from fee schedules
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'financial', label: 'Financial', icon: IndianRupee },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
  ];

  const studentPhotoUrl = getStudentPhotoUrl(student);

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg relative">
                {studentPhotoUrl ? (
                  <>
                    <img
                      src={studentPhotoUrl}
                      alt={getString(student.student_name)}
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6]">
                      <User className="text-white" size={24} />
                    </span>
                  </>
                ) : (
                  <User className="text-white" size={24} />
                )}
              </div>
              {getString(student.student_name)}
            </h1>
            <p className="text-gray-600">
              {getString(student.admission_no)} • {getString(student.class)}{getString(student.section) ? `-${getString(student.section)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students/${studentId}/edit`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <Edit size={18} className="mr-2" />
            Edit
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <Calendar size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Attendance</span>
            </div>
            <p className="text-3xl font-bold mb-1">{attendanceStats.percentage}%</p>
            <p className="text-xs text-blue-100">{attendanceStats.present} present / {attendanceStats.total} total</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <IndianRupee size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total Paid</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(financialStats.totalPaid)}</p>
            <p className="text-xs text-green-100">{financialStats.totalTransactions} transaction{financialStats.totalTransactions !== 1 ? 's' : ''}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Class</span>
            </div>
            <p className="text-3xl font-bold mb-1">{getString(student.class)}</p>
            <p className="text-xs text-purple-100">Section {getString(student.section) || 'N/A'}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <Shield size={20} className="opacity-90" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Status</span>
            </div>
            <p className="text-3xl font-bold mb-1 capitalize">{getString(student.status) || 'Active'}</p>
            <p className="text-xs text-orange-100">Student Status</p>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'attendance' | 'financial' | 'academic')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-white text-[#1e3a8a] shadow-sm border border-[#1e3a8a]/20'
                      : 'text-gray-600 hover:text-[#1e3a8a] hover:bg-white/50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Student Profile Card - background uses house color when student has a house assigned */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card
                    className="md:col-span-1 p-6 text-white"
                    style={
                      houseColor
                        ? { background: `linear-gradient(to bottom right, ${houseColor}, ${houseColor})` }
                        : { background: 'linear-gradient(to bottom right, #1e3a8a, #3B82F6)' }
                    }
                  >
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 relative overflow-hidden">
                        {studentPhotoUrl ? (
                          <>
                            <img
                              src={studentPhotoUrl}
                              alt={getString(student.student_name)}
                              className="absolute inset-0 w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center bg-white/20">
                              <User size={48} className="text-white" />
                            </span>
                          </>
                        ) : (
                          <User size={48} className="text-white" />
                        )}
                      </div>
                      <h2 className="text-2xl font-bold mb-1">{getString(student.student_name)}</h2>
                      <p className="text-white/90 mb-4">{getString(student.admission_no)}</p>
                      <div className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        <School size={16} />
                        <span className="text-sm font-semibold">
                          {getString(student.class)}{getString(student.section) ? `-${getString(student.section)}` : ''}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="md:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User size={20} className="text-[#1e3a8a]" />
                      Personal Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(typeof student.date_of_birth === 'string' ? student.date_of_birth : undefined)}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.gender) || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blood Group</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.blood_group) || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roll Number</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.roll_number) || 'Not assigned'}</p>
                      </div>
                      {!!student.email && (
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Mail size={12} />
                            Email
                          </label>
                          <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.email)}</p>
                        </div>
                      )}
                      {!!student.student_contact && (
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Phone size={12} />
                            Contact
                          </label>
                          <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.student_contact)}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Parent/Guardian Information */}
                {(!!student.father_name || !!student.mother_name || !!student.parent_name) && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users size={20} className="text-[#1e3a8a]" />
                      Parent/Guardian Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {!!student.father_name && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <User size={18} className="text-[#1e3a8a]" />
                            <h4 className="font-semibold text-gray-900">Father</h4>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-2">{getString(student.father_name)}</p>
                          {!!student.father_occupation && (
                            <p className="text-xs text-gray-600 mb-1">
                              <Briefcase size={12} className="inline mr-1" />
                              {getString(student.father_occupation)}
                            </p>
                          )}
                          {!!student.father_contact && (
                            <p className="text-xs text-gray-600">
                              <Phone size={12} className="inline mr-1" />
                              {getString(student.father_contact)}
                            </p>
                          )}
                        </div>
                      )}
                      {!!student.mother_name && (
                        <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                          <div className="flex items-center gap-2 mb-3">
                            <User size={18} className="text-pink-600" />
                            <h4 className="font-semibold text-gray-900">Mother</h4>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-2">{getString(student.mother_name)}</p>
                          {!!student.mother_occupation && (
                            <p className="text-xs text-gray-600 mb-1">
                              <Briefcase size={12} className="inline mr-1" />
                              {getString(student.mother_occupation)}
                            </p>
                          )}
                          {!!student.mother_contact && (
                            <p className="text-xs text-gray-600">
                              <Phone size={12} className="inline mr-1" />
                              {getString(student.mother_contact)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Address */}
                {!!student.address && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin size={20} className="text-[#1e3a8a]" />
                      Address
                    </h3>
                    <p className="text-gray-700">{getString(student.address)}</p>
                    {(!!student.city || !!student.state || !!student.pincode) && (
                      <p className="text-sm text-gray-600 mt-2">
                        {[getString(student.city), getString(student.state), getString(student.pincode)].filter(s => s.length > 0).join(', ')}
                      </p>
                    )}
                  </Card>
                )}

                {/* Additional Information */}
                <Card>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-[#1e3a8a]" />
                    Additional Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {!!student.religion && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Religion</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.religion)}</p>
                      </div>
                    )}
                    {!!student.category && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.category)}</p>
                      </div>
                    )}
                    {!!student.nationality && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.nationality)}</p>
                      </div>
                    )}
                    {!!student.house && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">House</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.house)}</p>
                      </div>
                    )}
                    {!!student.transport_type && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transport</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.transport_type)}</p>
                      </div>
                    )}
                    {!!student.academic_year && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Academic Year</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getString(student.academic_year)}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Attendance Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 size={20} className="opacity-90" />
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Present</span>
                    </div>
                    <p className="text-3xl font-bold">{attendanceStats.present}</p>
                    <p className="text-xs text-green-100 mt-1">Days</p>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <XCircle size={20} className="opacity-90" />
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Absent</span>
                    </div>
                    <p className="text-3xl font-bold">{attendanceStats.absent}</p>
                    <p className="text-xs text-red-100 mt-1">Days</p>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Clock size={20} className="opacity-90" />
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Late</span>
                    </div>
                    <p className="text-3xl font-bold">{attendanceStats.late}</p>
                    <p className="text-xs text-yellow-100 mt-1">Days</p>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 size={20} className="opacity-90" />
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Percentage</span>
                    </div>
                    <p className="text-3xl font-bold">{attendanceStats.percentage}%</p>
                    <p className="text-xs text-blue-100 mt-1">Overall</p>
                  </Card>
                </div>

                {/* Attendance Records */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Calendar size={20} className="text-[#1e3a8a]" />
                      Attendance Records
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAttendance}
                      disabled={attendanceLoading}
                      className="border-[#1e3a8a] text-[#1e3a8a]"
                    >
                      <RefreshCw size={16} className={`mr-2 ${attendanceLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {attendanceLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin text-[#1e3a8a]" size={32} />
                    </div>
                  ) : attendance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Marked By</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {attendance.map((record) => (
                            <motion.tr
                              key={record.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(record.attendance_date)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(record.status)}`}>
                                  {getStatusIcon(record.status)}
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {record.marked_by || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {record.remarks || '-'}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No attendance records found</p>
                      <p className="text-sm text-gray-400 mt-1">Attendance will appear here once marked</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Financial Summary */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <IndianRupee size={20} className="opacity-90" />
                      <TrendingUp size={16} className="opacity-90" />
                    </div>
                    <p className="text-2xl font-bold mb-1">Total Paid</p>
                    <p className="text-3xl font-bold">{formatCurrency(financialStats.totalPaid)}</p>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Receipt size={20} className="opacity-90" />
                      <FileText size={16} className="opacity-90" />
                    </div>
                    <p className="text-2xl font-bold mb-1">Transactions</p>
                    <p className="text-3xl font-bold">{financialStats.totalTransactions}</p>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar size={20} className="opacity-90" />
                      <Clock size={16} className="opacity-90" />
                    </div>
                    <p className="text-2xl font-bold mb-1">Last Payment</p>
                    <p className="text-sm font-medium">
                      {financialStats.lastPayment ? formatDate(financialStats.lastPayment) : 'No payments yet'}
                    </p>
                  </Card>
                </div>

                {/* Fee Records */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard size={20} className="text-[#1e3a8a]" />
                      Payment History
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchFees}
                      disabled={feesLoading}
                      className="border-[#1e3a8a] text-[#1e3a8a]"
                    >
                      <RefreshCw size={16} className={`mr-2 ${feesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {feesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin text-[#1e3a8a]" size={32} />
                    </div>
                  ) : fees.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Receipt #</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Transport</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Payment Mode</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {fees.map((fee) => (
                            <motion.tr
                              key={fee.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                                {fee.receipt_no}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(fee.payment_date)}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {formatCurrency(Number(fee.amount || 0))}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {fee.transport_fee ? formatCurrency(Number(fee.transport_fee)) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-green-600">
                                {formatCurrency(Number(fee.total_amount || 0))}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {fee.payment_mode}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {fee.remarks || '-'}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No payment records found</p>
                      <p className="text-sm text-gray-400 mt-1">Fee payments will appear here</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Academic Tab */}
            {activeTab === 'academic' && (
              <motion.div
                key="academic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Class Information */}
                <Card>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <School size={20} className="text-[#1e3a8a]" />
                    Class Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-4 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] rounded-lg text-white">
                      <p className="text-xs text-blue-100 mb-1">Current Class</p>
                      <p className="text-2xl font-bold">{getString(student.class)}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white">
                      <p className="text-xs text-purple-100 mb-1">Section</p>
                      <p className="text-2xl font-bold">{getString(student.section) || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg text-white">
                      <p className="text-xs text-teal-100 mb-1">Academic Year</p>
                      <p className="text-lg font-bold">{getString(student.academic_year) || 'N/A'}</p>
                    </div>
                  </div>
                </Card>

                {/* Class Teacher */}
                {classInfo?.class_teacher ? (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users size={20} className="text-[#1e3a8a]" />
                      Class Teacher
                    </h3>
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-100">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {classInfo.class_teacher.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1">
                            {classInfo.class_teacher.full_name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Staff ID: <span className="font-mono font-semibold">{classInfo.class_teacher.staff_id}</span>
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            {classInfo.class_teacher.email && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Mail size={14} />
                                <span>{classInfo.class_teacher.email}</span>
                              </div>
                            )}
                            {classInfo.class_teacher.phone && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone size={14} />
                                <span>{classInfo.class_teacher.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <div className="text-center py-8">
                      <Users size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No class teacher assigned</p>
                      <p className="text-sm text-gray-400 mt-1">Class teacher information will appear here when assigned</p>
                    </div>
                  </Card>
                )}

                {/* Academic Details */}
                <Card>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap size={20} className="text-[#1e3a8a]" />
                    Academic Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {!!student.roll_number && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roll Number</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{getString(student.roll_number)}</p>
                      </div>
                    )}
                    {!!student.date_of_admission && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Admission</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(typeof student.date_of_admission === 'string' ? student.date_of_admission : undefined)}</p>
                      </div>
                    )}
                    {!!student.last_class && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous Class</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{getString(student.last_class)}</p>
                      </div>
                    )}
                    {!!student.last_school_name && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous School</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{getString(student.last_school_name)}</p>
                      </div>
                    )}
                    {!!student.medium && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medium</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{getString(student.medium)}</p>
                      </div>
                    )}
                    {!!student.schooling_type && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Schooling Type</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{getString(student.schooling_type)}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
