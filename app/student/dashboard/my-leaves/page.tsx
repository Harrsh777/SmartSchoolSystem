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
  Search
} from 'lucide-react';

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
  const [student, setStudent] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchLeaves(studentData);
    }
  }, []);

  const fetchLeaves = async (studentData: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leave/student-requests?school_code=${studentData.school_code}&student_id=${studentData.id}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setLeaves(result.data);
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

  const filteredLeaves = leaves.filter(leave => {
    const query = searchQuery.toLowerCase();
    return (
      leave.leave_type.toLowerCase().includes(query) ||
      leave.leave_type_name.toLowerCase().includes(query) ||
      leave.leave_title.toLowerCase().includes(query) ||
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
            onClick={() => router.push('/student/dashboard/apply-leave')}
            className="bg-[#2F6FED] hover:bg-[#1e3a8a] text-white"
          >
            Apply for Leave
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/student/dashboard')}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF1FF] text-[#2F6FED] border border-[#DBEAFE]">
                        {leave.leave_type}
                      </span>
                      <span className="font-semibold text-[#0F172A]">{leave.leave_type_name}</span>
                      {leave.leave_title && (
                        <span className="text-sm text-[#64748B]">- {leave.leave_title}</span>
                      )}
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
                        <p className="font-medium text-[#2F6FED]">
                          {(() => {
                            const days = leave.total_days || (() => {
                              const start = new Date(leave.leave_start_date);
                              const end = new Date(leave.leave_end_date);
                              return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            })();
                            return `${days} ${days === 1 ? 'Day' : 'Days'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    {leave.reason && (
                      <div className="mt-3 pt-3 border-t border-[#E1E1DB]">
                        <p className="text-sm text-[#64748B] mb-1">Reason:</p>
                        <p className="text-sm text-[#0F172A]">{leave.reason}</p>
                      </div>
                    )}
                    {leave.status === 'rejected' && leave.rejected_reason && (
                      <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 rounded p-2">
                        <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-700">{leave.rejected_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

