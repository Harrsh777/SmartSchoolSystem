'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  CalendarX,
  Save,
  Calendar,
  FileText,
  X
} from 'lucide-react';

interface LeaveType {
  id: string;
  abbreviation: string;
  name: string;
  max_days?: number;
}

export default function AddLeavePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    leave_start_date: '',
    leave_end_date: '',
    comment: '',
    attachment: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [totalDays, setTotalDays] = useState(0);

  // Mock leave types
  const mockLeaveTypes: LeaveType[] = [
    { id: '1', abbreviation: 'CL', name: 'Casual Leaves', max_days: 12 },
    { id: '2', abbreviation: 'EL', name: 'Earned Leaves', max_days: 15 },
    { id: '3', abbreviation: 'SL', name: 'Sick Leaves', max_days: 10 },
    { id: '4', abbreviation: 'LWP', name: 'Leave Without Pay' },
  ];

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
    }
    setLeaveTypes(mockLeaveTypes);
  }, []);

  useEffect(() => {
    if (formData.leave_start_date && formData.leave_end_date) {
      const start = new Date(formData.leave_start_date);
      const end = new Date(formData.leave_end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setTotalDays(diffDays);
    } else {
      setTotalDays(0);
    }
  }, [formData.leave_start_date, formData.leave_end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // TODO: Implement API call
    console.log('Submitting leave request:', formData);
    
    setTimeout(() => {
      setSubmitting(false);
      alert('Leave request submitted successfully!');
      router.push('/teacher/dashboard');
    }, 1000);
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
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <CalendarX className="text-white" size={24} />
            </div>
            Add Leave Request
          </h1>
          <p className="text-gray-600">Submit a new leave request</p>
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

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* Leave Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.leave_type_id}
                onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map(lt => (
                  <option key={lt.id} value={lt.id}>
                    {lt.abbreviation} - {lt.name}
                    {lt.max_days && ` (Max: ${lt.max_days} days)`}
                  </option>
                ))}
              </select>
              {selectedLeaveType && selectedLeaveType.max_days && totalDays > selectedLeaveType.max_days && (
                <p className="text-sm text-red-600 mt-1">
                  Warning: Requested days ({totalDays}) exceed maximum allowed ({selectedLeaveType.max_days} days)
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.leave_start_date}
                  onChange={(e) => setFormData({ ...formData, leave_start_date: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.leave_end_date}
                  onChange={(e) => setFormData({ ...formData, leave_end_date: e.target.value })}
                  required
                  min={formData.leave_start_date || new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
            </div>

            {/* Total Days Display */}
            {totalDays > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">
                  Total Days: <span className="text-lg">{totalDays} {totalDays === 1 ? 'Day' : 'Days'}</span>
                </p>
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText size={14} className="inline mr-1" />
                Comment / Reason
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Please provide a reason for your leave request..."
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachment (Optional)
              </label>
              <input
                type="file"
                onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
                accept=".pdf,.jpg,.jpeg,.png"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
              {formData.attachment && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {formData.attachment.name}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/teacher/dashboard')}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.leave_type_id || !formData.leave_start_date || !formData.leave_end_date}
                className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Submit Leave Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}



