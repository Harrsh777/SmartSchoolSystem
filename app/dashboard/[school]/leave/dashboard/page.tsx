'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ArrowLeft, 
  CalendarX,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  FileText,
  RefreshCw,
  Inbox,
} from 'lucide-react';

interface StaffLeave {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  leave_type_name: string;
  leave_applied_date: string;
  leave_start_date: string;
  leave_end_date: string;
  total_days: number;
  comment?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
}

interface StudentLeave {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  leave_applied_date: string;
  leave_title: string;
  leave_start_date: string;
  leave_end_date: string;
  total_days: number;
  reason?: string;
  absent_form_submitted: boolean;
  attachment?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
}

export default function LeaveDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'staff' | 'student'>('staff');
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [staffLeaves, setStaffLeaves] = useState<StaffLeave[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<StudentLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    staffPending: 0,
    staffApproved: 0,
    staffRejected: 0,
    studentPending: 0,
    studentApproved: 0,
    studentRejected: 0,
  });
  const [summary, setSummary] = useState<{
    staff_leave_taken: number;
    staff_leave_left: number;
    staff_pending_requests: number;
    student_leave_taken: number;
    student_leave_left: number;
    student_pending_requests: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, activeTab, schoolCode]);

  const fetchData = async () => {
    await Promise.all([fetchSummary(), fetchStaffLeaves(), fetchStudentLeaves()]);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/leave/dashboard-summary?school_code=${schoolCode}`);
      const json = await res.json();
      if (res.ok && json.data) setSummary(json.data);
    } catch (err) {
      console.error('Error fetching leave summary:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const fetchStaffLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (activeTab === 'requests') {
        params.append('status', 'pending');
      }

      const response = await fetch(`/api/leave/requests?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStaffLeaves(result.data);
        // Calculate stats
        const allStaffResponse = await fetch(`/api/leave/requests?school_code=${schoolCode}`);
        const allStaffResult = await allStaffResponse.json();
        if (allStaffResponse.ok && allStaffResult.data) {
          const allStaff = allStaffResult.data;
          setStats(prev => ({
            ...prev,
            staffPending: allStaff.filter((l: StaffLeave) => l.status === 'pending').length,
            staffApproved: allStaff.filter((l: StaffLeave) => l.status === 'approved').length,
            staffRejected: allStaff.filter((l: StaffLeave) => l.status === 'rejected').length,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching staff leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentLeaves = async () => {
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (activeTab === 'requests') {
        params.append('status', 'pending');
      }

      const response = await fetch(`/api/leave/student-requests?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStudentLeaves(result.data);
        // Calculate stats
        const allStudentResponse = await fetch(`/api/leave/student-requests?school_code=${schoolCode}`);
        const allStudentResult = await allStudentResponse.json();
        if (allStudentResponse.ok && allStudentResult.data) {
          const allStudent = allStudentResult.data;
          setStats(prev => ({
            ...prev,
            studentPending: allStudent.filter((l: StudentLeave) => l.status === 'pending').length,
            studentApproved: allStudent.filter((l: StudentLeave) => l.status === 'approved').length,
            studentRejected: allStudent.filter((l: StudentLeave) => l.status === 'rejected').length,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApproveStaff = async (id: string) => {
    if (confirm('Are you sure you want to approve this leave request?')) {
      try {
        setLoading(true);
        const storedStaff = sessionStorage.getItem('staff');
        let updatedBy = null;
        if (storedStaff) {
          try {
            const staff = JSON.parse(storedStaff);
            updatedBy = staff.id;
          } catch {}
        }

        const response = await fetch(`/api/leave/requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
            updated_by: updatedBy,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchData();
        } else {
          alert(result.error || 'Failed to approve leave request');
        }
      } catch (err) {
        console.error('Error approving leave:', err);
        alert('Failed to approve leave request. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectStaff = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        setLoading(true);
        const storedStaff = sessionStorage.getItem('staff');
        let updatedBy = null;
        if (storedStaff) {
          try {
            const staff = JSON.parse(storedStaff);
            updatedBy = staff.id;
          } catch {}
        }

        const response = await fetch(`/api/leave/requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            rejected_reason: reason,
            updated_by: updatedBy,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchData();
        } else {
          alert(result.error || 'Failed to reject leave request');
        }
      } catch (err) {
        console.error('Error rejecting leave:', err);
        alert('Failed to reject leave request. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApproveStudent = async (id: string) => {
    if (confirm('Are you sure you want to approve this leave request?')) {
      try {
        setLoading(true);
        const storedStaff = sessionStorage.getItem('staff');
        let updatedBy = null;
        if (storedStaff) {
          try {
            const staff = JSON.parse(storedStaff);
            updatedBy = staff.id;
          } catch {}
        }

        const response = await fetch(`/api/leave/student-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
            updated_by: updatedBy,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchData();
        } else {
          alert(result.error || 'Failed to approve leave request');
        }
      } catch (err) {
        console.error('Error approving leave:', err);
        alert('Failed to approve leave request. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectStudent = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        setLoading(true);
        const storedStaff = sessionStorage.getItem('staff');
        let updatedBy = null;
        if (storedStaff) {
          try {
            const staff = JSON.parse(storedStaff);
            updatedBy = staff.id;
          } catch {}
        }

        const response = await fetch(`/api/leave/student-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            rejected_reason: reason,
            updated_by: updatedBy,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchData();
        } else {
          alert(result.error || 'Failed to reject leave request');
        }
      } catch (err) {
        console.error('Error rejecting leave:', err);
        alert('Failed to reject leave request. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredStaffLeaves = staffLeaves.filter(leave => {
    const matchesSearch = 
      leave.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.leave_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'requests') {
      return matchesSearch && leave.status === 'pending';
    } else {
      return matchesSearch && leave.status !== 'pending';
    }
  });

  const filteredStudentLeaves = studentLeaves.filter(leave => {
    const matchesSearch = 
      leave.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.leave_title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'requests') {
      return matchesSearch && leave.status === 'pending';
    } else {
      return matchesSearch && leave.status !== 'pending';
    }
  });

  const currentPending = activeSection === 'staff'
    ? (summary?.staff_pending_requests ?? stats.staffPending)
    : (summary?.student_pending_requests ?? stats.studentPending);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-md">
              <CalendarX className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A]">Leave Dashboard</h1>
              <p className="text-xs text-[#64748B]">Overview and manage leave requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"
            >
              <RefreshCw size={16} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
              className="rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
          </div>
        </motion.div>

        {/* Summary: 6 compact cards — Staff row + Student row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {/* Staff */}
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-[#64748B]" />
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Staff</span>
            </div>
            <p className="text-2xl font-bold text-[#1e3a8a]">{summary?.staff_leave_taken ?? '—'}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Taken (days)</p>
          </Card>
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{summary?.staff_leave_left ?? '—'}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Left (days)</p>
          </Card>
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center gap-1.5">
              <Inbox size={16} className="text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{summary?.staff_pending_requests ?? '—'}</p>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">Pending requests</p>
          </Card>
          {/* Student */}
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-[#64748B]" />
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Student</span>
            </div>
            <p className="text-2xl font-bold text-[#1e3a8a]">{summary?.student_leave_taken ?? '—'}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Taken (days)</p>
          </Card>
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <p className="text-2xl font-bold text-teal-600">{summary?.student_leave_left ?? '—'}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Left (days)</p>
          </Card>
          <Card className="rounded-xl p-4 border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center gap-1.5">
              <Inbox size={16} className="text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{summary?.student_pending_requests ?? '—'}</p>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">Pending requests</p>
          </Card>
        </motion.div>

        {/* Main: Requests & History */}
        <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          {/* Tabs: Staff | Student, then Pending | History */}
          <div className="flex border-b border-[#E2E8F0]">
            <button
              onClick={() => setActiveSection('staff')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeSection === 'staff'
                  ? 'bg-[#1e3a8a] text-white border-b-2 border-[#1e3a8a]'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              <User size={16} />
              Staff
            </button>
            <button
              onClick={() => setActiveSection('student')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeSection === 'student'
                  ? 'bg-[#1e3a8a] text-white border-b-2 border-[#1e3a8a]'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              <Users size={16} />
              Student
            </button>
          </div>
          <div className="flex border-b border-[#E2E8F0] bg-white">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'requests'
                  ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a] bg-[#EFF6FF]'
                  : 'text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              <Clock size={14} />
              Pending
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
                {currentPending}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'history'
                  ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a] bg-[#EFF6FF]'
                  : 'text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              <FileText size={14} />
              History
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeSection === 'staff' ? 'Search staff, leave type…' : 'Search student, leave title…'}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {/* Staff Leave Table */}
            {activeSection === 'staff' && (
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E2E8F0] border-t-[#1e3a8a] mx-auto mb-3" />
                    <p className="text-sm text-[#64748B]">Loading…</p>
                  </div>
                ) : filteredStaffLeaves.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <CalendarX className="mx-auto text-[#94A3B8]" size={36} />
                    <p className="text-sm font-medium text-[#475569] mt-2">
                      {activeTab === 'requests' ? 'No pending staff requests' : 'No staff leave history'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Leave</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] hidden sm:table-cell">Applied</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Dates</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] max-w-[120px] truncate hidden md:table-cell">Comment</th>
                          {activeTab === 'history' && (
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569]">Status</th>
                          )}
                          {activeTab === 'requests' && (
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569] w-28">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E2E8F0]">
                        {filteredStaffLeaves.map((leave, index) => (
                          <motion.tr
                            key={leave.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(index * 0.02, 0.15) }}
                            className="hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#E0E7FF] flex items-center justify-center text-[#3730A3] font-semibold text-sm">
                                  {leave.staff_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-[#0F172A]">{leave.staff_name}</p>
                                  <p className="text-xs text-[#94A3B8] font-mono">{leave.staff_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#E0E7FF] text-[#3730A3]">
                                {leave.leave_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#64748B] hidden sm:table-cell">
                              {leave.leave_applied_date.includes('T') 
                                ? formatDateTime(leave.leave_applied_date)
                                : formatDate(leave.leave_applied_date)
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#475569]">
                              {formatDate(leave.leave_start_date)} – {formatDate(leave.leave_end_date)}
                              <span className="text-[#94A3B8] ml-1">({leave.total_days}d)</span>
                            </td>
                            <td className="px-4 py-3 text-[#64748B] max-w-[120px] truncate hidden md:table-cell">
                              {leave.comment || leave.reason || '—'}
                            </td>
                            {activeTab === 'history' && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(leave.status)}`}>
                                  {leave.status === 'approved' && <CheckCircle2 size={12} className="mr-1" />}
                                  {leave.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                                  {leave.status === 'pending' && <Clock size={12} className="mr-1" />}
                                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                </span>
                              </td>
                            )}
                            {activeTab === 'requests' && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    onClick={() => handleRejectStaff(leave.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    <XCircle size={12} className="mr-1" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleApproveStaff(leave.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    <CheckCircle2 size={12} className="mr-1" />
                                    Approve
                                  </Button>
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Student Leave Table */}
            {activeSection === 'student' && (
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E2E8F0] border-t-[#1e3a8a] mx-auto mb-3" />
                    <p className="text-sm text-[#64748B]">Loading…</p>
                  </div>
                ) : filteredStudentLeaves.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <CalendarX className="mx-auto text-[#94A3B8]" size={36} />
                    <p className="text-sm font-medium text-[#475569] mt-2">
                      {activeTab === 'requests' ? 'No pending student requests' : 'No student leave history'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Class</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] hidden sm:table-cell">Applied</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569]">Dates</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] max-w-[100px] truncate hidden md:table-cell">Reason</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569] w-16">Form</th>
                          {activeTab === 'history' && (
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569]">Status</th>
                          )}
                          {activeTab === 'requests' && (
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#475569] w-28">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E2E8F0]">
                        {filteredStudentLeaves.map((leave, index) => (
                          <motion.tr
                            key={leave.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(index * 0.02, 0.15) }}
                            className="hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#E0E7FF] flex items-center justify-center text-[#3730A3] font-semibold text-sm">
                                  {leave.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-[#0F172A]">{leave.student_name}</p>
                                  <p className="text-xs text-[#94A3B8] font-mono">{leave.admission_no}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#E0E7FF] text-[#3730A3]">
                                {leave.class} {leave.section}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#64748B] hidden sm:table-cell">
                              {leave.leave_applied_date.includes('T') ? formatDateTime(leave.leave_applied_date) : formatDate(leave.leave_applied_date)}
                            </td>
                            <td className="px-4 py-3 text-[#0F172A] font-medium">{leave.leave_title}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#475569]">
                              {formatDate(leave.leave_start_date)} – {formatDate(leave.leave_end_date)}
                              <span className="text-[#94A3B8] ml-1">({leave.total_days}d)</span>
                            </td>
                            <td className="px-4 py-3 text-[#64748B] max-w-[100px] truncate hidden md:table-cell">
                              {leave.reason || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {leave.absent_form_submitted ? (
                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>
                            {activeTab === 'history' && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(leave.status)}`}>
                                  {leave.status === 'approved' && <CheckCircle2 size={12} className="mr-1" />}
                                  {leave.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                                  {leave.status === 'pending' && <Clock size={12} className="mr-1" />}
                                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                </span>
                              </td>
                            )}
                            {activeTab === 'requests' && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    onClick={() => handleApproveStudent(leave.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    <CheckCircle2 size={12} className="mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectStudent(leave.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    <XCircle size={12} className="mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
