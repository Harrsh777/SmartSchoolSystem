'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
  Filter,
  Download,
  Settings,
  Paperclip,
  TrendingUp,
  AlertCircle,
  Calendar,
  Shield,
  RefreshCw,
  Eye,
  MoreVertical
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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, activeTab, schoolCode]);

  const fetchData = async () => {
    await Promise.all([fetchStaffLeaves(), fetchStudentLeaves()]);
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
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <CalendarX className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Leave Dashboard</h1>
              <p className="text-gray-600 text-sm">Manage and approve all leave requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            >
              <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            >
              <Download size={18} className="mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Staff Pending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-700">{stats.staffPending}</div>
                <div className="text-xs text-amber-600 font-medium mt-1">Requests</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Staff Pending</h3>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </Card>
        </motion.div>

        {/* Staff Approved */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-700">{stats.staffApproved}</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Approved</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Staff Approved</h3>
            <p className="text-xs text-gray-600 mt-1">Completed requests</p>
          </Card>
        </motion.div>

        {/* Staff Rejected */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-700">{stats.staffRejected}</div>
                <div className="text-xs text-red-600 font-medium mt-1">Rejected</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Staff Rejected</h3>
            <p className="text-xs text-gray-600 mt-1">Declined requests</p>
          </Card>
        </motion.div>

        {/* Student Pending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-700">{stats.studentPending}</div>
                <div className="text-xs text-amber-600 font-medium mt-1">Requests</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Student Pending</h3>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </Card>
        </motion.div>

        {/* Student Approved */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-700">{stats.studentApproved}</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Approved</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Student Approved</h3>
            <p className="text-xs text-gray-600 mt-1">Completed requests</p>
          </Card>
        </motion.div>

        {/* Student Rejected */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-5 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-700">{stats.studentRejected}</div>
                <div className="text-xs text-red-600 font-medium mt-1">Rejected</div>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-900">Student Rejected</h3>
            <p className="text-xs text-gray-600 mt-1">Declined requests</p>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Card */}
      <Card className="p-0 bg-white shadow-xl border-gray-100 overflow-hidden">
        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <button
            onClick={() => setActiveSection('staff')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-all flex items-center justify-center gap-3 ${
              activeSection === 'staff'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User size={20} />
            STAFF LEAVE
          </button>
          <button
            onClick={() => setActiveSection('student')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-all flex items-center justify-center gap-3 ${
              activeSection === 'student'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={20} />
            STUDENT LEAVE
          </button>
        </div>

        {/* Request/History Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-6 py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-b-2 border-orange-600 shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} />
            LEAVE REQUESTS
            {activeTab === 'requests' && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {activeSection === 'staff' ? stats.staffPending : stats.studentPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-b-2 border-orange-600 shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText size={18} />
            LEAVE HISTORY
          </button>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by ${activeSection === 'staff' ? 'staff name, ID, or leave type' : 'student name, admission no, or leave title'}...`}
                className="pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Staff Leave Table */}
          {activeSection === 'staff' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading leave requests...</p>
                </div>
              ) : filteredStaffLeaves.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CalendarX className="text-gray-400" size={40} />
                  </div>
                  <p className="text-gray-600 font-medium text-lg">
                    {activeTab === 'requests' ? 'No pending leave requests' : 'No leave history found'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {activeTab === 'requests' 
                      ? 'All staff leave requests have been processed' 
                      : 'No historical leave records available'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Leave Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Applied Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Request Dates</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Comment</th>
                        {activeTab === 'history' && (
                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                        )}
                        {activeTab === 'requests' && (
                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStaffLeaves.map((leave, index) => (
                        <motion.tr
                          key={leave.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                                {leave.staff_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{leave.staff_name}</p>
                                <p className="text-xs text-gray-500 font-mono">{leave.staff_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 shadow-sm">
                              {leave.leave_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {leave.leave_applied_date.includes('T') 
                              ? formatDateTime(leave.leave_applied_date)
                              : formatDate(leave.leave_applied_date)
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">
                              {formatDate(leave.leave_start_date)} - {formatDate(leave.leave_end_date)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ({leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'})
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {leave.comment || leave.reason || '-'}
                          </td>
                          {activeTab === 'history' && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(leave.status)}`}>
                                {leave.status === 'approved' && <CheckCircle2 size={14} className="mr-1.5" />}
                                {leave.status === 'rejected' && <XCircle size={14} className="mr-1.5" />}
                                {leave.status === 'pending' && <Clock size={14} className="mr-1.5" />}
                                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                              </span>
                            </td>
                          )}
                          {activeTab === 'requests' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  onClick={() => handleRejectStaff(leave.id)}
                                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md text-xs px-4 py-2"
                                >
                                  <XCircle size={14} className="mr-1.5" />
                                  REJECT
                                </Button>
                                <Button
                                  onClick={() => handleApproveStaff(leave.id)}
                                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md text-xs px-4 py-2"
                                >
                                  <CheckCircle2 size={14} className="mr-1.5" />
                                  APPROVE
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
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading leave requests...</p>
                </div>
              ) : filteredStudentLeaves.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CalendarX className="text-gray-400" size={40} />
                  </div>
                  <p className="text-gray-600 font-medium text-lg">
                    {activeTab === 'requests' ? 'No pending leave requests' : 'No leave history found'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {activeTab === 'requests' 
                      ? 'All student leave requests have been processed' 
                      : 'No historical leave records available'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Class</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Applied Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Leave Title</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Request Dates</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Absent Form</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Attachment</th>
                        {activeTab === 'history' && (
                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                        )}
                        {activeTab === 'requests' && (
                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudentLeaves.map((leave, index) => (
                        <motion.tr
                          key={leave.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                                {leave.student_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{leave.student_name}</p>
                                <p className="text-xs text-gray-500 font-mono">{leave.admission_no}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              {leave.class} {leave.section}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {leave.leave_applied_date.includes('T') 
                              ? formatDateTime(leave.leave_applied_date)
                              : formatDate(leave.leave_applied_date)
                            }
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{leave.leave_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">
                              {formatDate(leave.leave_start_date)} - {formatDate(leave.leave_end_date)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ({leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'})
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {leave.reason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto shadow-sm ${
                              leave.absent_form_submitted 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'bg-white border-amber-500'
                            }`}>
                              {leave.absent_form_submitted && (
                                <CheckCircle2 size={16} className="text-white" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {leave.attachment ? (
                              <a
                                href={leave.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-10 h-10 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-200"
                                title="View attachment"
                              >
                                <Paperclip size={18} />
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {activeTab === 'history' && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(leave.status)}`}>
                                {leave.status === 'approved' && <CheckCircle2 size={14} className="mr-1.5" />}
                                {leave.status === 'rejected' && <XCircle size={14} className="mr-1.5" />}
                                {leave.status === 'pending' && <Clock size={14} className="mr-1.5" />}
                                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                              </span>
                            </td>
                          )}
                          {activeTab === 'requests' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col items-center gap-2">
                                <Button
                                  onClick={() => handleApproveStudent(leave.id)}
                                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md text-xs px-4 py-2"
                                >
                                  <CheckCircle2 size={14} className="mr-1.5" />
                                  APPROVE
                                </Button>
                                <Button
                                  onClick={() => handleRejectStudent(leave.id)}
                                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md text-xs px-4 py-2"
                                >
                                  <XCircle size={14} className="mr-1.5" />
                                  REJECT
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
  );
}
