'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X } from 'lucide-react';

interface AddClassModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClassModal({
  schoolCode,
  onClose,
  onSuccess,
}: AddClassModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    class: '',
    section: '',
    academic_year: new Date().getFullYear().toString(),
  });

  const handleChange = (field: string, value: string) => {
    let processedValue = value;
    
    // Auto-uppercase for class and section
    if (field === 'class' || field === 'section') {
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class.trim() || !formData.section.trim() || !formData.academic_year.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Add Class</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.class}
                onChange={(e) => handleChange('class', e.target.value)}
                required
                placeholder="e.g., 10"
                className="uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.section}
                onChange={(e) => handleChange('section', e.target.value)}
                required
                placeholder="e.g., A"
                className="uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.academic_year}
                onChange={(e) => handleChange('academic_year', e.target.value)}
                required
                placeholder="e.g., 2025"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

