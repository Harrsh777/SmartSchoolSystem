'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { X, FileText } from 'lucide-react';
import ExamScheduleModal from './ExamScheduleModal';

interface CreateExaminationModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateExaminationModal({
  schoolCode,
  onClose,
  onSuccess,
}: CreateExaminationModalProps) {
  const [formData, setFormData] = useState({
    exam_name: '',
    academic_year: new Date().getFullYear().toString(),
    start_date: '',
    end_date: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
    description: '',
    from_class: '',
    to_class: '',
  });
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.exam_name.trim()) {
      newErrors.exam_name = 'Examination name is required';
    }
    if (!formData.academic_year.trim()) {
      newErrors.academic_year = 'Academic year is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (!formData.from_class.trim()) {
      newErrors.from_class = 'From class is required';
    }
    if (!formData.to_class.trim()) {
      newErrors.to_class = 'To class is required';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Validate class range
    if (formData.from_class && formData.to_class) {
      const fromClass = parseInt(formData.from_class);
      const toClass = parseInt(formData.to_class);
      if (isNaN(fromClass) || isNaN(toClass)) {
        newErrors.to_class = 'Class must be a valid number';
      } else if (fromClass > toClass) {
        newErrors.to_class = 'To class must be greater than or equal to from class';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setCreatedExamId(result.data.id);
        setShowScheduleModal(true);
        // Don't call onSuccess yet - wait for schedule to be added
      } else {
        setErrors({ submit: result.error || 'Failed to create examination' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="text-indigo-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Examination</h2>
                <p className="text-sm text-gray-600">Schedule a new examination</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Exam Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Examination Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.exam_name}
                onChange={(e) => handleChange('exam_name', e.target.value)}
                placeholder="e.g., Mid Term Exam, Final Exam"
                className={errors.exam_name ? 'border-red-500' : ''}
              />
              {errors.exam_name && (
                <p className="mt-1 text-sm text-red-600">{errors.exam_name}</p>
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.academic_year}
                onChange={(e) => handleChange('academic_year', e.target.value)}
                placeholder="e.g., 2024-2025"
                className={errors.academic_year ? 'border-red-500' : ''}
              />
              {errors.academic_year && (
                <p className="mt-1 text-sm text-red-600">{errors.academic_year}</p>
              )}
            </div>

            {/* Class Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Class <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.from_class}
                  onChange={(e) => handleChange('from_class', e.target.value)}
                  placeholder="e.g., 5"
                  className={errors.from_class ? 'border-red-500' : ''}
                />
                {errors.from_class && (
                  <p className="mt-1 text-sm text-red-600">{errors.from_class}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Class <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.to_class}
                  onChange={(e) => handleChange('to_class', e.target.value)}
                  placeholder="e.g., 8"
                  className={errors.to_class ? 'border-red-500' : ''}
                />
                {errors.to_class && (
                  <p className="mt-1 text-sm text-red-600">{errors.to_class}</p>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  min={formData.start_date}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional details about the examination..."
                rows={4}
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Examination'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && createdExamId && (
        <ExamScheduleModal
          schoolCode={schoolCode}
          examId={createdExamId}
          onClose={() => {
            setShowScheduleModal(false);
            onSuccess();
          }}
          onSuccess={() => {
            setShowScheduleModal(false);
            onSuccess();
          }}
        />
      )}
    </AnimatePresence>
  );
}

