'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { 
  CalendarX, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar,
  Send,
  XCircle
} from 'lucide-react';

interface LeaveType {
  id: string;
  abbreviation: string;
  name: string;
  is_active?: boolean;
  max_days?: number;
  max_days_per_month?: number;
  staff_type?: string;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<{ id: string; school_code: string } | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    leave_type_id: '',
    leave_start_date: '',
    leave_end_date: '',
    reason: '',
    comment: '',
  });

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      // Normalize school_code to uppercase to match DB (leave types are stored with uppercase)
      const code = String(teacherData.school_code || '').trim().toUpperCase();
      if (code) fetchLeaveTypes(code);
    }
  }, []);

  const fetchLeaveTypes = async (schoolCode: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      // Don't filter by staff_type so staff see all types for their school (admin can restrict via staff_type in Leave Basics if needed)
      const response = await fetch(`/api/leave/types?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Show all types except those explicitly inactive (treat missing is_active as active)
        const activeTypes = result.data.filter((type: LeaveType) => type.is_active !== false);
        setLeaveTypes(activeTypes);
      }
    } catch (err) {
      console.error('Error fetching leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_type_id || !formData.leave_start_date || !formData.leave_end_date) {
      setErrorMessage('Please fill in all required fields');
      setShowError(true);
      return;
    }

    if (!formData.reason || formData.reason.trim() === '') {
      setErrorMessage('Please provide a reason for your leave request');
      setShowError(true);
      return;
    }

    if (!teacher) {
      setErrorMessage('Teacher information not found. Please log in again.');
      setShowError(true);
      return;
    }

    // Validate date range
    const startDate = new Date(formData.leave_start_date);
    const endDate = new Date(formData.leave_end_date);
    if (endDate < startDate) {
      setErrorMessage('End date must be after start date');
      setShowError(true);
      return;
    }

    // Validate max days if leave type has a limit (per month)
    const maxDays = selectedLeaveType?.max_days ?? selectedLeaveType?.max_days_per_month;
    if (maxDays != null && maxDays > 0) {
      const totalDays = calculateDays();
      if (totalDays > maxDays) {
        setErrorMessage(`Leave duration (${totalDays} days) exceeds maximum allowed (${maxDays} days) for this leave type`);
        setShowError(true);
        return;
      }
    }

    try {
      setSubmitting(true);
      setShowError(false);
      const response = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: teacher.school_code,
          staff_id: teacher.id,
          leave_type_id: formData.leave_type_id,
          leave_start_date: formData.leave_start_date,
          leave_end_date: formData.leave_end_date,
          reason: formData.reason,
          comment: formData.comment,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        // Reset form
        setFormData({
          leave_type_id: '',
          leave_start_date: '',
          leave_end_date: '',
          reason: '',
          comment: '',
        });
      } else {
        setErrorMessage(result.details || result.error || 'Failed to submit leave request. Please try again.');
        setShowError(true);
      }
    } catch (err) {
      console.error('Error submitting leave request:', err);
      setErrorMessage('Network error. Please check your connection and try again.');
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = () => {
    if (formData.leave_start_date && formData.leave_end_date) {
      const startDate = new Date(formData.leave_start_date);
      const endDate = new Date(formData.leave_end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id);

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
            Apply for Leave
          </h1>
          <p className="text-[#64748B]">Submit your leave request to the office</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/teacher/dashboard')}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSuccess(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 size={48} className="text-green-600" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Leave Request Submitted!
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Your leave request has been successfully sent to the office. You will be notified once your request is reviewed.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSuccess(false)}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSuccess(false);
                      router.push('/teacher/dashboard/my-leaves');
                    }}
                    className="flex-1 bg-[#2F6FED] hover:bg-[#1e3a8a] text-white"
                  >
                    View My Leaves
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Modal Overlay */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowError(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <XCircle size={48} className="text-red-600" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Error
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {errorMessage}
                </p>
                
                <Button
                  onClick={() => setShowError(false)}
                  className="w-full bg-[#2F6FED] hover:bg-[#1e3a8a] text-white"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading ? (
                <div className="col-span-2 text-center py-4 text-[#64748B]">Loading leave types...</div>
              ) : leaveTypes.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-[#64748B]">No active leave types available</div>
              ) : (
                leaveTypes.map((leaveType) => (
                  <label
                    key={leaveType.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.leave_type_id === leaveType.id
                        ? 'border-[#2F6FED] bg-[#EAF1FF]'
                        : 'border-[#E1E1DB] hover:border-[#2F6FED] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="leave_type"
                      value={leaveType.id}
                      checked={formData.leave_type_id === leaveType.id}
                      onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                      className="w-4 h-4 text-[#2F6FED] border-[#E1E1DB] focus:ring-[#60A5FA]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1e3a8a]">{leaveType.abbreviation}</span>
                        <span className="font-semibold text-[#0F172A]">{leaveType.name}</span>
                      </div>
                      {(leaveType.max_days != null || leaveType.max_days_per_month != null) && (
                        <p className="text-xs text-[#64748B] mt-1">
                          Max: {leaveType.max_days ?? leaveType.max_days_per_month} days per month
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
                <Input
                  type="date"
                  value={formData.leave_start_date}
                  onChange={(e) => setFormData({ ...formData, leave_start_date: e.target.value })}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
                <Input
                  type="date"
                  value={formData.leave_end_date}
                  onChange={(e) => setFormData({ ...formData, leave_end_date: e.target.value })}
                  className="pl-10"
                  min={formData.leave_start_date || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Total Days Display */}
          {formData.leave_start_date && formData.leave_end_date && (
            <div className="bg-[#EAF1FF] border border-[#DBEAFE] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1e3a8a]">Total Days:</span>
                <span className="text-lg font-bold text-[#2F6FED]">
                  {calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              {(() => {
                const maxD = selectedLeaveType?.max_days ?? selectedLeaveType?.max_days_per_month;
                return maxD != null && maxD > 0 && calculateDays() > maxD ? (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ This exceeds the maximum allowed days ({maxD} days) for this leave type.
                  </p>
                ) : null;
              })()}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a reason for your leave request..."
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* Comment (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">
              Additional Comments (Optional)
            </label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E1E1DB]">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/teacher/dashboard')}
              className="border-[#E1E1DB] text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.leave_type_id || !formData.leave_start_date || !formData.leave_end_date || !formData.reason}
              className="bg-[#2F6FED] hover:bg-[#1e3a8a] text-[#FFFFFF] disabled:opacity-50"
            >
              <Send size={18} className="mr-2" />
              {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

