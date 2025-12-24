'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X } from 'lucide-react';

interface CreateNoticeModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateNoticeModal({
  schoolCode,
  onClose,
  onSuccess,
}: CreateNoticeModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General' as 'Examination' | 'General' | 'Holiday' | 'Event' | 'Urgent',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    status: 'Draft' as 'Active' | 'Draft' | 'Archived',
    publish_at: '',
    scheduleForLater: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (formData.content.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }

    if (formData.scheduleForLater && !formData.publish_at) {
      newErrors.publish_at = 'Please select a publish date and time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/communication/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          priority: formData.priority,
          status: 'Draft',
          publish_at: null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to save notice');
      }
    } catch (error) {
      console.error('Error saving notice:', error);
      alert('Failed to save notice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const publishDate = formData.scheduleForLater && formData.publish_at
        ? new Date(formData.publish_at).toISOString()
        : new Date().toISOString();

      const response = await fetch('/api/communication/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          priority: formData.priority,
          status: 'Active',
          publish_at: publishDate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to publish notice');
      }
    } catch (error) {
      console.error('Error publishing notice:', error);
      alert('Failed to publish notice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Create New Notice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter notice title"
                    required
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="General">General</option>
                      <option value="Examination">Examination</option>
                      <option value="Holiday">Holiday</option>
                      <option value="Event">Event</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Content */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Content</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Write the notice exactly as you want parents and students to read it."
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  {errors.content && (
                    <p className="text-red-600 text-sm">{errors.content}</p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {formData.content.length} characters
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Publishing */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Publishing</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scheduleForLater"
                    checked={formData.scheduleForLater}
                    onChange={(e) => handleChange('scheduleForLater', e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <label htmlFor="scheduleForLater" className="text-sm font-medium text-gray-700">
                    Schedule for later
                  </label>
                </div>

                {formData.scheduleForLater && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Publish Date & Time <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.publish_at}
                      onChange={(e) => handleChange('publish_at', e.target.value)}
                      required={formData.scheduleForLater}
                    />
                    {errors.publish_at && (
                      <p className="text-red-600 text-sm mt-1">{errors.publish_at}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button onClick={handlePublish} disabled={saving}>
                {saving ? 'Publishing...' : 'Publish Notice'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

