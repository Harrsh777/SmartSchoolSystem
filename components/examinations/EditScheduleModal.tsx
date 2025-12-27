'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, AlertCircle } from 'lucide-react';
import type { Exam, ExamSchedule } from '@/lib/supabase';

interface ClassData {
  class: string;
  sections: string[];
}

interface EditScheduleModalProps {
  schoolCode: string;
  examId: string;
  exam: Exam;
  schedule: ExamSchedule;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditScheduleModal({
  schoolCode,
  examId,
  exam,
  schedule,
  onClose,
  onSuccess,
}: EditScheduleModalProps) {
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects] = useState([
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
    'Computer Science', 'Physical Education', 'Art', 'Music', 'Other'
  ]);
  const [formData, setFormData] = useState({
    class: schedule.class,
    section: schedule.section,
    subject: schedule.subject,
    customSubject: '',
    exam_date: schedule.exam_date,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    room: schedule.room || '',
    notes: schedule.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/examinations/classes?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.section) newErrors.section = 'Section is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.exam_date) newErrors.exam_date = 'Exam date is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';

    if (formData.exam_date) {
      const examDate = new Date(formData.exam_date);
      const examStart = new Date(exam.start_date);
      const examEnd = new Date(exam.end_date);
      
      if (examDate < examStart || examDate > examEnd) {
        newErrors.exam_date = `Date must be between ${exam.start_date} and ${exam.end_date}`;
      }
    }

    if (formData.start_time && formData.end_time) {
      if (formData.end_time <= formData.start_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/examinations/${examId}/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class: formData.class,
          section: formData.section,
          subject: formData.subject === 'Other' ? formData.customSubject : formData.subject,
          exam_date: formData.exam_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          room: formData.room || null,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        if (result.conflict) {
          setErrors({ submit: result.error });
        } else {
          alert(result.error || 'Failed to update schedule');
        }
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassData = classes.find(c => c.class === formData.class);
  const availableSections = selectedClassData?.sections || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Edit Schedule</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.class}
                  onChange={(e) => handleChange('class', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.class} value={cls.class}>{cls.class}</option>
                  ))}
                </select>
                {errors.class && (
                  <p className="text-red-600 text-sm mt-1">{errors.class}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => handleChange('section', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">Select Section</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
                {errors.section && (
                  <p className="text-red-600 text-sm mt-1">{errors.section}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
              {errors.subject && (
                <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.exam_date}
                onChange={(e) => handleChange('exam_date', e.target.value)}
                min={exam.start_date}
                max={exam.end_date}
                required
              />
              {errors.exam_date && (
                <p className="text-red-600 text-sm mt-1">{errors.exam_date}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                />
                {errors.start_time && (
                  <p className="text-red-600 text-sm mt-1">{errors.start_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                />
                {errors.end_time && (
                  <p className="text-red-600 text-sm mt-1">{errors.end_time}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Room / Hall
              </label>
              <Input
                type="text"
                value={formData.room}
                onChange={(e) => handleChange('room', e.target.value)}
                placeholder="e.g., Hall-1, Room 101"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Additional notes..."
              />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 mt-0.5" size={20} />
                  <p className="text-red-800 text-sm">{errors.submit}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

