'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { 
  ArrowLeft, 
  CalendarX,
  Calendar,
  Send,
  CheckCircle2,
  X
} from 'lucide-react';

interface LeaveType {
  id: string;
  abbreviation: string;
  name: string;
  is_active: boolean;
  max_days?: number;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    leave_start_date: '',
    leave_end_date: '',
    reason: '',
  });

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchLeaveTypes(studentData.school_code);
    }
  }, []);

  const fetchLeaveTypes = async (schoolCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leave/types?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Filter only active leave types
        const activeTypes = result.data.filter((type: LeaveType) => type.is_active);
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
      alert('Please fill in all required fields');
      return;
    }

    if (!student) {
      alert('Student information not found');
      return;
    }

    try {
      setSubmitting(true);
      const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id);
      
      const response = await fetch('/api/leave/student-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: student.school_code,
          student_id: student.id,
          leave_type_id: formData.leave_type_id,
          leave_title: selectedLeaveType?.name || '',
          leave_start_date: formData.leave_start_date,
          leave_end_date: formData.leave_end_date,
          reason: formData.reason,
          absent_form_submitted: false,
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
        });
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        alert(result.error || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Error submitting leave request:', err);
      alert('Failed to submit leave request. Please try again.');
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
          onClick={() => router.push('/student/dashboard')}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#DBEAFE] border border-[#60A5FA] rounded-lg p-4 flex items-center gap-3 text-[#1e3a8a]"
          >
            <CheckCircle2 size={24} className="text-[#2F6FED]" />
            <div className="flex-1">
              <p className="font-semibold">Your request has been sent to the office</p>
              <p className="text-sm">You will be notified once your request is reviewed.</p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-[#64748B] hover:text-[#1e3a8a]"
            >
              <X size={20} />
            </button>
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
                      {leaveType.max_days && (
                        <p className="text-xs text-[#64748B] mt-1">Max: {leaveType.max_days} days</p>
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
              {selectedLeaveType?.max_days && calculateDays() > selectedLeaveType.max_days && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ This exceeds the maximum allowed days ({selectedLeaveType.max_days} days) for this leave type.
                </p>
              )}
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

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E1E1DB]">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/student/dashboard')}
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

