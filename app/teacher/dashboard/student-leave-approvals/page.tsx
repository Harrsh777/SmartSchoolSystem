'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  CalendarX,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Search,
  RefreshCw,
  Inbox,
  Loader2,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface StudentLeaveRequest {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  leave_type: string;
  leave_type_name: string;
  leave_title: string;
  leave_applied_date: string;
  leave_start_date: string;
  leave_end_date: string;
  total_days: number;
  reason: string;
  status: string;
  rejected_reason?: string | null;
  class_teacher_approved: boolean | null;
  class_teacher_approval_date: string | null;
  class_teacher_rejection_reason: string | null;
}

export default function StudentLeaveApprovalsPage() {
  const [teacher, setTeacher] = useState<{ id: string; staff_id: string; school_code: string } | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<StudentLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StudentLeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchLeaveRequests(teacherData);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchLeaveRequests = async (teacherData: { id: string; staff_id: string; school_code: string }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: teacherData.school_code,
        teacher_id: teacherData.id,
        staff_id: teacherData.staff_id,
      });
      const response = await fetch(`/api/leave/student-requests/class-teacher?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setLeaveRequests(Array.isArray(result.data) ? result.data : []);
      } else {
        setLeaveRequests([]);
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const isApproved = (req: StudentLeaveRequest) =>
    req.status === 'approved' || req.class_teacher_approved === true;
  const isRejected = (req: StudentLeaveRequest) =>
    req.status === 'rejected' || req.class_teacher_approved === false;
  const isPending = (req: StudentLeaveRequest) => !isApproved(req) && !isRejected(req);

  const pendingCount = leaveRequests.filter(isPending).length;
  const approvedCount = leaveRequests.filter(isApproved).length;
  const rejectedCount = leaveRequests.filter(isRejected).length;

  const filteredRequests = leaveRequests.filter((req) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && isPending(req)) ||
      (statusFilter === 'approved' && isApproved(req)) ||
      (statusFilter === 'rejected' && isRejected(req));
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      req.student_name?.toLowerCase().includes(q) ||
      req.admission_no?.toLowerCase().includes(q) ||
      req.leave_type_name?.toLowerCase().includes(q) ||
      req.leave_title?.toLowerCase().includes(q) ||
      `${req.class}-${req.section}`.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async (request: StudentLeaveRequest) => {
    if (!teacher) return;
    try {
      setProcessingId(request.id);
      const response = await fetch(`/api/leave/student-requests/${request.id}/class-teacher-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          teacher_id: teacher.id,
          staff_id: teacher.staff_id,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        fetchLeaveRequests(teacher);
      } else {
        alert(result.error || 'Failed to approve leave request');
      }
    } catch (err) {
      console.error('Error approving leave request:', err);
      alert('An error occurred while approving the leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!teacher || !selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      setProcessingId(selectedRequest.id);
      const response = await fetch(
        `/api/leave/student-requests/${selectedRequest.id}/class-teacher-approval`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            rejection_reason: rejectionReason.trim(),
            teacher_id: teacher.id,
            staff_id: teacher.staff_id,
          }),
        }
      );
      const result = await response.json();
      if (response.ok) {
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        fetchLeaveRequests(teacher);
      } else {
        alert(result.error || 'Failed to reject leave request');
      }
    } catch (err) {
      console.error('Error rejecting leave request:', err);
      alert('An error occurred while rejecting the leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (request: StudentLeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const statusTabs: { key: StatusFilter; label: string; icon: typeof Clock; count: number }[] = [
    { key: 'all', label: 'All', icon: FileText, count: leaveRequests.length },
    { key: 'pending', label: 'Pending', icon: Clock, count: pendingCount },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, count: approvedCount },
    { key: 'rejected', label: 'Rejected', icon: XCircle, count: rejectedCount },
  ];

  return (
    <div className="space-y-6 pb-8">
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
            Student Leave Approvals
          </h1>
          <p className="text-[#64748B] mt-1.5">
            Review and approve leave requests from your class students
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => teacher && fetchLeaveRequests(teacher)}
          disabled={loading}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="text-amber-600" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-xs text-[#64748B]">Needs your action</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Approved</p>
              <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Rejected</p>
              <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search + status tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input
                type="text"
                placeholder="Search by student name, admission no, or leave type..."
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
              <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin mb-4" />
              <p className="text-[#64748B] font-medium">Loading leave requests...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredRequests.length === 0 ? (
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
                        ? 'No leave requests'
                        : statusFilter === 'pending'
                          ? 'No pending requests'
                          : statusFilter === 'approved'
                            ? 'No approved leaves'
                            : 'No rejected leaves'}
                    </h3>
                    <p className="text-[#64748B] text-sm">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter.'
                        : 'Students from your class have not applied for leave yet.'}
                    </p>
                  </Card>
                </motion.div>
              ) : (
                filteredRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <LeaveRequestCard
                      request={request}
                      formatDate={formatDate}
                      onApprove={handleApprove}
                      onReject={openRejectModal}
                      processingId={processingId}
                      isPending={isPending(request)}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-[#1e293b] mb-2">Reject Leave Request</h3>
              <p className="text-sm text-[#64748B] mb-4">
                Please provide a reason for rejecting {selectedRequest.student_name}&apos;s leave
                request.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-[#0f172a]"
                rows={4}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || processingId === selectedRequest.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {processingId === selectedRequest.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2" size={18} />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeaveRequestCard({
  request,
  formatDate,
  onApprove,
  onReject,
  processingId,
  isPending,
}: {
  request: StudentLeaveRequest;
  formatDate: (s: string) => string;
  onApprove: (r: StudentLeaveRequest) => void;
  onReject: (r: StudentLeaveRequest) => void;
  processingId: string | null;
  isPending: boolean;
}) {
  const approved = request.status === 'approved' || request.class_teacher_approved === true;
  const rejected = request.status === 'rejected' || request.class_teacher_approved === false;
  const rejectionText = request.rejected_reason || request.class_teacher_rejection_reason;

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        approved
          ? 'border-l-4 border-l-emerald-500'
          : rejected
            ? 'border-l-4 border-l-red-500'
            : 'border-l-4 border-l-amber-500'
      }`}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4">
          {/* Student + status */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#dbeafe] flex items-center justify-center flex-shrink-0">
                <User className="text-[#1e40af]" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-[#1e293b]">{request.student_name}</h3>
                <p className="text-sm text-[#64748B]">
                  {request.admission_no} • {request.class}-{request.section}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                approved
                  ? 'bg-emerald-100 text-emerald-800'
                  : rejected
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {approved && <CheckCircle2 size={14} />}
              {rejected && <XCircle size={14} />}
              {isPending && <Clock size={14} />}
              {approved ? 'Approved' : rejected ? 'Rejected' : 'Pending'}
            </span>
          </div>

          {/* Leave details */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">
              {request.leave_type}
            </span>
            <span className="font-medium text-[#1e293b]">{request.leave_type_name}</span>
            {request.leave_title && (
              <span className="text-sm text-[#64748B]">— {request.leave_title}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Applied</p>
              <p className="font-medium text-[#1e293b]">{formatDate(request.leave_applied_date)}</p>
            </div>
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Start</p>
              <p className="font-medium text-[#1e293b]">{formatDate(request.leave_start_date)}</p>
            </div>
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">End</p>
              <p className="font-medium text-[#1e293b]">{formatDate(request.leave_end_date)}</p>
            </div>
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide">Duration</p>
              <p className="font-medium text-[#2563eb]">
                {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          {request.reason && (
            <div className="pt-3 border-t border-[#e2e8f0]">
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wide mb-1">
                Reason
              </p>
              <p className="text-sm text-[#475569]">{request.reason}</p>
            </div>
          )}

          {rejected && rejectionText && (
            <div className="pt-3 border-t border-red-200">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-red-800">Rejection reason</p>
                  <p className="text-sm text-red-700 mt-0.5">{rejectionText}</p>
                </div>
              </div>
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-3 pt-4 border-t border-[#e2e8f0]">
              <Button
                variant="primary"
                onClick={() => onApprove(request)}
                disabled={processingId === request.id}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {processingId === request.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2" size={18} />
                    Approve
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onReject(request)}
                disabled={processingId === request.id}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="mr-2" size={18} />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
