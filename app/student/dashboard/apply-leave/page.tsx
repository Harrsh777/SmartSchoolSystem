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
  X,
} from 'lucide-react';

export default function ApplyLeavePage() {
  const router = useRouter();
  const [student, setStudent] = useState<{ id: string; school_code: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    leave_start_date: '',
    leave_end_date: '',
    reason: '',
  });

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_start_date || !formData.leave_end_date) {
      alert('Please fill in all required fields');
      return;
    }

    if (!student) {
      alert('Student information not found');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/leave/student-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: student.school_code,
          student_id: student.id,
          leave_start_date: formData.leave_start_date,
          leave_end_date: formData.leave_end_date,
          reason: formData.reason,
          absent_form_submitted: false,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          leave_start_date: '',
          leave_end_date: '',
          reason: '',
        });
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        const hint =
          result.code === 'NOT_NULL_VIOLATION' || String(result.details || '').includes('leave_type_id')
            ? ' Ask your school to run the database migration migrations/20250405_student_leave_type_nullable.sql if this persists.'
            : '';
        alert((result.error || 'Failed to submit leave request') + hint);
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

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
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
              type="button"
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

          {formData.leave_start_date && formData.leave_end_date && (
            <div className="bg-[#EAF1FF] border border-[#DBEAFE] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1e3a8a]">Total Days:</span>
                <span className="text-lg font-bold text-[#2F6FED]">
                  {calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
          )}

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
              disabled={submitting || !formData.leave_start_date || !formData.leave_end_date || !formData.reason}
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
