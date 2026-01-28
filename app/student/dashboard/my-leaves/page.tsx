'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  CalendarX,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  Inbox,
} from 'lucide-react';

type StatusFilter = 'all' | 'approved' | 'rejected' | 'pending';

interface LeaveRequest {
  id: string;
  leave_type: string;
  leave_type_name: string;
  leave_title: string;
  leave_applied_date: string;
  leave_start_date: string;
  leave_end_date: string;
  total_days?: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
}

export default function MyLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData: { id: string; school_code: string } = JSON.parse(storedStudent);
      fetchLeaves(studentData);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchLeaves = async (studentData: { id: string; school_code: string }) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leave/student-requests?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        setLeaves(Array.isArray(result.data) ? result.data : []);
      } else {
        setLeaves([]);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      fetchLeaves(studentData);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const approvedCount = leaves.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length;
  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  const filteredLeaves = leaves.filter((leave) => {
    const matchesStatus =
      statusFilter === 'all' ||
      leave.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      leave.leave_type_name?.toLowerCase().includes(query) ||
      leave.leave_type?.toLowerCase().includes(query) ||
      (leave.leave_title && leave.leave_title.toLowerCase().includes(query)) ||
      leave.status?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const statusTabs: { key: StatusFilter; label: string; icon: typeof CheckCircle2; count: number }[] = [
    { key: 'all', label: 'All', icon: FileText, count: leaves.length },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, count: approvedCount },
    { key: 'rejected', label: 'Rejected', icon: XCircle, count: rejectedCount },
    { key: 'pending', label: 'Pending', icon: Clock, count: pendingCount },
  ];

  return (
    <div className="space-y-6 pb-8 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <CalendarX className="text-white" size={24} />
            </div>
            My Leaves
          </h1>
          <p className="text-[#64748B] mt-1.5">
            View your accepted, rejected, and pending leave requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/student/dashboard/apply-leave')}
            className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white"
          >
            Apply for Leave
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/student/dashboard')}
            className="border-[#64748B] text-[#64748B] hover:bg-[#f1f5f9]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Approved</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <XCircle className="text-red-600 dark:text-red-400" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Rejected</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{rejectedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Clock className="text-amber-600 dark:text-amber-400" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Pending</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by leave type or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      statusFilter === tab.key
                        ? 'bg-[#1e3a8a] text-white shadow-md'
                        : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                        statusFilter === tab.key ? 'bg-white/20' : 'bg-[#e2e8f0] text-[#64748b]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {loading ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#64748B] font-medium">Loading your leave requests...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredLeaves.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  <Card className="p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                      <Inbox className="text-[#94a3b8]" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1e293b] mb-2">
                      {statusFilter === 'all'
                        ? 'No leave requests yet'
                        : statusFilter === 'approved'
                          ? 'No approved leaves'
                          : statusFilter === 'rejected'
                            ? 'No rejected leaves'
                            : 'No pending leaves'}
                    </h3>
                    <p className="text-[#64748B] text-sm mb-6">
                      {statusFilter === 'all' || statusFilter === 'pending'
                        ? 'Apply for leave when you need time off. Your requests will appear here once submitted.'
                        : `You don't have any ${statusFilter} leave requests.`}
                    </p>
                    {(statusFilter === 'all' || statusFilter === 'pending') && (
                      <Button
                        onClick={() => router.push('/student/dashboard/apply-leave')}
                        className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white"
                      >
                        Apply for Leave
                      </Button>
                    )}
                  </Card>
                </motion.div>
              ) : (
                filteredLeaves.map((leave, index) => (
                  <motion.div
                    key={leave.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <LeaveCard leave={leave} formatDate={formatDate} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function LeaveCard({
  leave,
  formatDate,
}: {
  leave: LeaveRequest;
  formatDate: (s: string) => string;
}) {
  const isApproved = leave.status === 'approved';
  const isRejected = leave.status === 'rejected';
  const isPending = leave.status === 'pending';

  const totalDays =
    leave.total_days ??
    (() => {
      const start = new Date(leave.leave_start_date);
      const end = new Date(leave.leave_end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    })();

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        isApproved
          ? 'border-l-4 border-l-emerald-500'
          : isRejected
            ? 'border-l-4 border-l-red-500'
            : 'border-l-4 border-l-amber-500'
      }`}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">
                {leave.leave_type}
              </span>
              <span className="font-semibold text-[#1e293b]">{leave.leave_type_name}</span>
              {leave.leave_title && (
                <span className="text-sm text-[#64748B]">— {leave.leave_title}</span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : isRejected
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isApproved && <CheckCircle2 size={14} />}
                {isRejected && <XCircle size={14} />}
                {isPending && <Clock size={14} />}
                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Applied</p>
                <p className="font-medium text-[#1e293b]">{formatDate(leave.leave_applied_date)}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Start</p>
                <p className="font-medium text-[#1e293b]">{formatDate(leave.leave_start_date)}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">End</p>
                <p className="font-medium text-[#1e293b]">{formatDate(leave.leave_end_date)}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Duration</p>
                <p className="font-medium text-[#2563eb]">
                  {totalDays} {totalDays === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>

            {leave.reason && (
              <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">
                  Reason
                </p>
                <p className="text-sm text-[#475569]">{leave.reason}</p>
              </div>
            )}

            {isRejected && leave.rejected_reason && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                  <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Rejection reason
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-200 mt-0.5">
                      {leave.rejected_reason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Card>
  );
}
