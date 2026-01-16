'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  Paperclip,
  RefreshCw,
  Download,
  TrendingUp,
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

  const currentStats = activeSection === 'staff' 
    ? { pending: stats.staffPending, approved: stats.staffApproved, rejected: stats.staffRejected }
    : { pending: stats.studentPending, approved: stats.studentApproved, rejected: stats.studentRejected };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 soft-shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] flex items-center justify-center soft-shadow">
                <CalendarX className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Leave Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage and approve all leave requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10"
              >
                <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10"
              >
                <Download size={18} className="mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
                className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Staff/Student Pending */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/30 to-amber-200/30 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                    <Clock className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {activeSection === 'staff' ? 'Staff' : 'Student'} Pending
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {currentStats.pending}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Awaiting approval</p>
              </div>
            </Card>
          </motion.div>

          {/* Staff/Student Approved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {activeSection === 'staff' ? 'Staff' : 'Student'} Approved
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {currentStats.approved}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Completed requests</p>
              </div>
            </Card>
          </motion.div>

          {/* Staff/Student Rejected */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200/30 to-rose-200/30 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                    <XCircle className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {activeSection === 'staff' ? 'Staff' : 'Student'} Rejected
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {currentStats.rejected}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Declined requests</p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden p-0">
          {/* Section Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <button
              onClick={() => setActiveSection('staff')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-all flex items-center justify-center gap-3 ${
                activeSection === 'staff'
                  ? 'bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white shadow-lg'
                  : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <User size={20} />
              STAFF LEAVE
            </button>
            <button
              onClick={() => setActiveSection('student')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-all flex items-center justify-center gap-3 ${
                activeSection === 'student'
                  ? 'bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white shadow-lg'
                  : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Users size={20} />
              STUDENT LEAVE
            </button>
          </div>

          {/* Request/History Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b]">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-6 py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'requests'
                  ? 'bg-[#5A7A95] text-white border-b-2 border-[#6B9BB8] shadow-sm'
                  : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Clock size={18} />
              LEAVE REQUESTS
              {activeTab === 'requests' && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  {currentStats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-[#5A7A95] text-white border-b-2 border-[#6B9BB8] shadow-sm'
                  : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search by ${activeSection === 'staff' ? 'staff name, ID, or leave type' : 'student name, admission no, or leave title'}...`}
                  className="pl-12 pr-4 py-3 border-2 border-[#5A7A95]/20 rounded-xl focus:border-[#5A7A95] focus:ring-[#5A7A95] dark:border-[#6B9BB8]/20 dark:focus:border-[#6B9BB8]"
                />
              </div>
            </div>

            {/* Staff Leave Table */}
            {activeSection === 'staff' && (
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95]/20 border-t-[#5A7A95] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading leave requests...</p>
                  </div>
                ) : filteredStaffLeaves.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/10 flex items-center justify-center mx-auto mb-4">
                      <CalendarX className="text-[#5A7A95] dark:text-[#6B9BB8]" size={40} />
                    </div>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg">
                      {activeTab === 'requests' ? 'No pending leave requests' : 'No leave history found'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                      {activeTab === 'requests' 
                        ? 'All staff leave requests have been processed' 
                        : 'No historical leave records available'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
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
                      <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredStaffLeaves.map((leave, index) => (
                          <motion.tr
                            key={leave.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold shadow-md">
                                  {leave.staff_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{leave.staff_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{leave.staff_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] border border-[#5A7A95]/20 dark:border-[#6B9BB8]/30">
                                {leave.leave_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {leave.leave_applied_date.includes('T') 
                                ? formatDateTime(leave.leave_applied_date)
                                : formatDate(leave.leave_applied_date)
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {formatDate(leave.leave_start_date)} - {formatDate(leave.leave_end_date)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ({leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'})
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
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
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-md text-xs px-4 py-2"
                                  >
                                    <XCircle size={14} className="mr-1.5" />
                                    REJECT
                                  </Button>
                                  <Button
                                    onClick={() => handleApproveStaff(leave.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md text-xs px-4 py-2"
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
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95]/20 border-t-[#5A7A95] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading leave requests...</p>
                  </div>
                ) : filteredStudentLeaves.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/10 flex items-center justify-center mx-auto mb-4">
                      <CalendarX className="text-[#5A7A95] dark:text-[#6B9BB8]" size={40} />
                    </div>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg">
                      {activeTab === 'requests' ? 'No pending leave requests' : 'No leave history found'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                      {activeTab === 'requests' 
                        ? 'All student leave requests have been processed' 
                        : 'No historical leave records available'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
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
                      <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredStudentLeaves.map((leave, index) => (
                          <motion.tr
                            key={leave.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold shadow-md">
                                  {leave.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{leave.student_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{leave.admission_no}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] border border-[#5A7A95]/20 dark:border-[#6B9BB8]/30">
                                {leave.class} {leave.section}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {leave.leave_applied_date.includes('T') 
                                ? formatDateTime(leave.leave_applied_date)
                                : formatDate(leave.leave_applied_date)
                              }
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{leave.leave_title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {formatDate(leave.leave_start_date)} - {formatDate(leave.leave_end_date)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ({leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'})
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {leave.reason || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto shadow-sm ${
                                leave.absent_form_submitted 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'bg-white dark:bg-[#1e293b] border-yellow-500'
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
                                  className="inline-flex items-center justify-center w-10 h-10 text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-[#5A7A95]/10 dark:hover:bg-[#6B9BB8]/10 rounded-lg transition-colors shadow-sm border border-[#5A7A95]/20 dark:border-[#6B9BB8]/30"
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
                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md text-xs px-4 py-2"
                                  >
                                    <CheckCircle2 size={14} className="mr-1.5" />
                                    APPROVE
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectStudent(leave.id)}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white shadow-md text-xs px-4 py-2"
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
    </div>
  );
}
