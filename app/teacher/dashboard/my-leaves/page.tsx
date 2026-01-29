'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  CalendarX, 
  ArrowLeft, 
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  Loader2,
  Layers
} from 'lucide-react';

interface LeaveType {
  id: string;
  abbreviation: string;
  name: string;
  max_days: number | null;
}

interface LeaveBalance {
  abbreviation: string;
  name: string;
  max_days: number | null;
  used_days: number;
  remaining_days: number | null; // null = unlimited
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  leave_type_name: string;
  leave_applied_date: string;
  leave_start_date: string;
  leave_end_date: string;
  total_days: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
}

function computeLeaveBalances(leaveTypes: LeaveType[], leaves: LeaveRequest[]): LeaveBalance[] {
  const approvedByType = new Map<string, number>();
  for (const leave of leaves) {
    if (leave.status !== 'approved') continue;
    const key = leave.leave_type;
    approvedByType.set(key, (approvedByType.get(key) ?? 0) + (leave.total_days ?? 0));
  }
  // Dedupe leave types by abbreviation (same type may exist for different academic years)
  const typeByAbbr = new Map<string, LeaveType>();
  for (const lt of leaveTypes) {
    if (!typeByAbbr.has(lt.abbreviation)) typeByAbbr.set(lt.abbreviation, lt);
  }
  return Array.from(typeByAbbr.entries()).map(([abbr, lt]) => {
    const used_days = approvedByType.get(abbr) ?? 0;
    const remaining_days = lt.max_days == null ? null : Math.max(0, lt.max_days - used_days);
    return {
      abbreviation: lt.abbreviation,
      name: lt.name,
      max_days: lt.max_days,
      used_days,
      remaining_days,
    };
  });
}

export default function MyLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const leaveBalances = computeLeaveBalances(leaveTypes, leaves);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData: { id: string; school_code: string } = JSON.parse(storedTeacher);
      fetchAll(teacherData);
    }
  }, []);

  const fetchAll = async (teacherData: { id: string; school_code: string }) => {
    try {
      setLoading(true);
      const [typesRes, requestsRes] = await Promise.all([
        fetch(`/api/leave/types?school_code=${teacherData.school_code}`),
        fetch(`/api/leave/requests?school_code=${teacherData.school_code}&staff_id=${teacherData.id}`),
      ]);
      const typesResult = await typesRes.json();
      const requestsResult = await requestsRes.json();

      if (typesRes.ok && typesResult.data) {
        setLeaveTypes(typesResult.data);
      }
      if (requestsRes.ok && requestsResult.data) {
        setLeaves(requestsResult.data);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleWithdraw = async (leaveId: string) => {
    if (!confirm('Are you sure you want to withdraw this leave request? This action cannot be undone.')) {
      return;
    }

    try {
      setWithdrawing(leaveId);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/leave/requests/${leaveId}/withdraw`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Leave request withdrawn successfully');
        const storedTeacher = sessionStorage.getItem('teacher');
        if (storedTeacher) {
          const teacherData: { id: string; school_code: string } = JSON.parse(storedTeacher);
          fetchAll(teacherData);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to withdraw leave request');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      console.error('Error withdrawing leave request:', err);
      setError('Failed to withdraw leave request. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setWithdrawing(null);
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    const query = searchQuery.toLowerCase();
    return (
      leave.leave_type.toLowerCase().includes(query) ||
      leave.leave_type_name.toLowerCase().includes(query) ||
      leave.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <CalendarX className="text-white" size={24} />
            </div>
            My Leave Requests
          </h1>
          <p className="text-[#64748B]">View your leave request status and history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/teacher/dashboard/apply-leave')}
            className="bg-[#2F6FED] hover:bg-[#1e3a8a] text-white"
          >
            Apply for Leave
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/teacher/dashboard')}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <XCircle size={20} className="text-red-600" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Remaining Leaves (Balance) */}
      {leaveBalances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2">
              <Layers size={20} />
              Remaining Leaves
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {leaveBalances.map((bal) => (
                <div
                  key={bal.abbreviation}
                  className="p-4 bg-[#F8FAFC] border border-[#E1E1DB] rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#EAF1FF] text-[#2F6FED] border border-[#DBEAFE]">
                      {bal.abbreviation}
                    </span>
                    <span className="font-semibold text-[#0F172A] text-sm">{bal.name}</span>
                  </div>
                  <div className="text-sm text-[#64748B] mt-2">
                    {bal.max_days != null ? (
                      <>
                        <span className="font-medium text-[#2F6FED]">{bal.remaining_days ?? 0}</span>
                        <span> of {bal.max_days} days remaining</span>
                        {bal.used_days > 0 && (
                          <span className="block text-xs mt-1">Used: {bal.used_days} days</span>
                        )}
                      </>
                    ) : (
                      <span>Unlimited (used: {bal.used_days} days)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <Card className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
            <input
              type="text"
              placeholder="Search by leave type or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent"
            />
          </div>
        </div>

        {/* Leaves List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
            <p className="text-[#64748B]">Loading leave requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-12">
            <CalendarX size={48} className="mx-auto mb-4 text-[#64748B]" />
            <p className="text-[#64748B] font-medium">No leave requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeaves.map((leave, index) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF1FF] text-[#2F6FED] border border-[#DBEAFE]">
                        {leave.leave_type}
                      </span>
                      <span className="font-semibold text-[#0F172A]">{leave.leave_type_name}</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(leave.status)}`}>
                        {leave.status === 'approved' && <CheckCircle2 size={12} className="mr-1" />}
                        {leave.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                        {leave.status === 'pending' && <Clock size={12} className="mr-1" />}
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-[#64748B] mb-1">Applied Date</p>
                        <p className="font-medium text-[#0F172A]">{formatDate(leave.leave_applied_date)}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B] mb-1">Start Date</p>
                        <p className="font-medium text-[#0F172A]">{formatDate(leave.leave_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B] mb-1">End Date</p>
                        <p className="font-medium text-[#0F172A]">{formatDate(leave.leave_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B] mb-1">Total Days</p>
                        <p className="font-medium text-[#2F6FED]">{leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'}</p>
                      </div>
                    </div>
                    {leave.comment && (
                      <div className="mt-3 pt-3 border-t border-[#E1E1DB]">
                        <p className="text-sm text-[#64748B] mb-1">Reason/Comment:</p>
                        <p className="text-sm text-[#0F172A]">{leave.comment}</p>
                      </div>
                    )}
                    {leave.status === 'rejected' && leave.rejected_reason && (
                      <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 rounded p-2">
                        <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-700">{leave.rejected_reason}</p>
                      </div>
                    )}
                  </div>
                  {/* Withdraw Button - Only show for pending requests */}
                  {leave.status === 'pending' && (
                    <div className="ml-4">
                      <Button
                        onClick={() => handleWithdraw(leave.id)}
                        disabled={withdrawing === leave.id}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        {withdrawing === leave.id ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Withdrawing...
                          </>
                        ) : (
                          <>
                            <X size={16} className="mr-2" />
                            Withdraw
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

