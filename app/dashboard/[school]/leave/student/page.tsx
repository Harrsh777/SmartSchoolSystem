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
  Calendar,
  FileText,
  Filter,
  Download,
  Settings,
  Paperclip
} from 'lucide-react';

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
  reason?: string;
  absent_form_submitted: boolean;
  attachment?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function StudentLeavePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [leaves, setLeaves] = useState<StudentLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, schoolCode]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (activeTab === 'requests') {
        params.append('status', 'pending');
      }

      const response = await fetch(`/api/leave/student-requests?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setLeaves(result.data);
      } else {
        console.error('Error fetching student leaves:', result.error);
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async (id: string) => {
    if (confirm('Are you sure you want to approve this leave request?')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/leave/student-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchLeaves();
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

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        setLoading(true);
        const response = await fetch(`/api/leave/student-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            rejected_reason: reason,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchLeaves();
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

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = 
      leave.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.admission_no.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'requests') {
      return matchesSearch && leave.status === 'pending';
    } else {
      return matchesSearch && leave.status !== 'pending';
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <CalendarX className="text-white" size={24} />
            </div>
            Student Leave
          </h1>
          <p className="text-gray-600">Manage and approve student leave requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#1e3a8a] text-[#1e3a8a]"
          >
            <Settings size={18} className="mr-2" />
            Logs
          </Button>
          <Button
            variant="outline"
            className="border-[#1e3a8a] text-[#1e3a8a]"
          >
            <Download size={18} className="mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
              activeTab === 'requests'
                ? 'bg-orange-500 text-white border-b-2 border-orange-500'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            LEAVE REQUESTS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white border-b-2 border-orange-500'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            LEAVE HISTORY
          </button>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name"
                className="pl-10"
              />
            </div>
          </div>

          {/* Leaves Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Leave Applied Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Leave Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Leave Request Dates</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Absent Form Submitted</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Attachment</th>
                  {activeTab === 'history' && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  )}
                  {activeTab === 'requests' && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeaves.map((leave, index) => (
                  <motion.tr
                    key={leave.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 font-mono">{String(index + 1).padStart(2, '0')}.</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold text-xs">
                          {leave.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{leave.student_name}</p>
                          <p className="text-xs text-gray-600 font-mono">{leave.admission_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{leave.class} {leave.section}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {leave.leave_applied_date.includes('T') 
                        ? formatDateTime(leave.leave_applied_date)
                        : formatDate(leave.leave_applied_date)
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{leave.leave_title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(leave.leave_start_date)} - {formatDate(leave.leave_end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {leave.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto ${
                        leave.absent_form_submitted 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-white border-orange-500'
                      }`}>
                        {leave.absent_form_submitted && (
                          <CheckCircle2 size={14} className="text-white" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {leave.attachment ? (
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Paperclip size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {activeTab === 'history' && (
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(leave.status)}`}>
                          {leave.status === 'approved' && <CheckCircle2 size={12} className="mr-1" />}
                          {leave.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                          {leave.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                    )}
                    {activeTab === 'requests' && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            onClick={() => handleApprove(leave.id)}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 w-full"
                          >
                            APPROVE
                          </Button>
                          <Button
                            onClick={() => handleReject(leave.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 w-full"
                          >
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

          {/* Empty State */}
          {filteredLeaves.length === 0 && (
            <div className="text-center py-12">
              <CalendarX size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {activeTab === 'requests' 
                  ? 'No pending leave requests'
                  : 'No leave history found'
                }
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}



