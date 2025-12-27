'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Calendar, Plus, Trash2, CheckCircle } from 'lucide-react';

interface ScheduleItem {
  id?: string;
  exam_date: string;
  exam_name: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  max_marks?: number;
  instructions?: string;
}

interface ExamScheduleModalProps {
  schoolCode: string;
  examId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExamScheduleModal({
  schoolCode,
  examId,
  onClose,
  onSuccess,
}: ExamScheduleModalProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/examinations/${examId}/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setSchedules(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const addScheduleItem = () => {
    setSchedules([...schedules, {
      exam_date: '',
      exam_name: '',
    }]);
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string | number) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeScheduleItem = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validation
    const invalidItems = schedules.filter(s => !s.exam_date || !s.exam_name.trim());
    if (invalidItems.length > 0) {
      setError('Please fill in all required fields (date and exam name) for all schedule items');
      return;
    }

    setSaving(true);
    try {
      // Delete existing schedules first
      await fetch(`/api/examinations/${examId}/schedules?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      // Insert new schedules
      const insertResponse = await fetch(`/api/examinations/${examId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          schedules: schedules.map(s => ({
            exam_date: s.exam_date,
            exam_name: s.exam_name.trim(),
            start_time: s.start_time || null,
            end_time: s.end_time || null,
            duration_minutes: s.duration_minutes || null,
            max_marks: s.max_marks || null,
            instructions: s.instructions || null,
          })),
        }),
      });

      const result = await insertResponse.json();

      if (insertResponse.ok) {
        setSuccess('Exam schedule saved successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(result.error || 'Failed to save schedule');
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (schedules.length === 0) {
      setError('Please add at least one schedule item before publishing');
      return;
    }

    // Save first
    await handleSave();
    
    if (error) return; // Don't publish if save failed

    setPublishing(true);
    setError('');
    try {
      const response = await fetch(`/api/examinations/${examId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: schoolCode }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Exam published successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(result.error || 'Failed to publish exam');
      }
    } catch (err) {
      console.error('Error publishing exam:', err);
      setError('Failed to publish exam. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="text-indigo-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Update Exam Schedule</h2>
                <p className="text-sm text-gray-600">Create the datesheet for this examination</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading schedule...</p>
              </div>
            ) : (
              <>
                {/* Add Schedule Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={addScheduleItem}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus size={18} className="mr-2" />
                    Add Schedule Item
                  </Button>
                </div>

                {/* Schedule Items */}
                {schedules.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 mb-4">No schedule items added yet</p>
                    <Button
                      onClick={addScheduleItem}
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Plus size={18} className="mr-2" />
                      Add First Schedule Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map((schedule, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900">Schedule Item {index + 1}</h3>
                          <button
                            onClick={() => removeScheduleItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Exam Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="date"
                              value={schedule.exam_date}
                              onChange={(e) => updateScheduleItem(index, 'exam_date', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Exam Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="text"
                              value={schedule.exam_name}
                              onChange={(e) => updateScheduleItem(index, 'exam_name', e.target.value)}
                              placeholder="e.g., Mathematics, English Paper 1"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Start Time (Optional)
                            </label>
                            <Input
                              type="time"
                              value={schedule.start_time || ''}
                              onChange={(e) => updateScheduleItem(index, 'start_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              End Time (Optional)
                            </label>
                            <Input
                              type="time"
                              value={schedule.end_time || ''}
                              onChange={(e) => updateScheduleItem(index, 'end_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Max Marks (Optional)
                            </label>
                            <Input
                              type="number"
                              value={schedule.max_marks || ''}
                              onChange={(e) => updateScheduleItem(index, 'max_marks', parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    disabled={saving || publishing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    disabled={saving || publishing}
                  >
                    {saving ? 'Saving...' : 'Save Schedule'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePublish}
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={saving || publishing || schedules.length === 0}
                  >
                    {publishing ? 'Publishing...' : 'Publish Exam'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

