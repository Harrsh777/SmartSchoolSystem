'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Search, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  color?: string;
}

interface AddClassModalProps {
  schoolCode: string;
  existingClass?: { id: string; class: string; section: string; academic_year: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClassModal({
  schoolCode,
  existingClass,
  onClose,
  onSuccess,
}: AddClassModalProps) {
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    class: existingClass?.class || '',
    section: existingClass?.section || '',
    academic_year: existingClass?.academic_year || new Date().getFullYear().toString(),
  });

  // Fetch all subjects on mount
  useEffect(() => {
    fetchSubjects();
    // If editing, fetch assigned subjects
    if (existingClass?.id) {
      fetchAssignedSubjects(existingClass.id);
    }
  }, [existingClass?.id, schoolCode]);

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await fetch(`/api/subjects?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSubjects(result.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchAssignedSubjects = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSelectedSubjectIds(new Set(result.data.map((s: Subject) => s.id)));
      }
    } catch (error) {
      console.error('Error fetching assigned subjects:', error);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  );

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
      // If editing, use PATCH; otherwise use POST
      const url = existingClass 
        ? `/api/classes/${existingClass.id}`
        : '/api/classes';
      const method = existingClass ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const classId = existingClass?.id || result.data?.id;
        
        // Assign subjects to the class (if class ID exists)
        if (classId && selectedSubjectIds.size > 0) {
          try {
            const subjectsResponse = await fetch(`/api/classes/${classId}/subjects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                school_code: schoolCode,
                subject_ids: Array.from(selectedSubjectIds),
              }),
            });

            if (!subjectsResponse.ok) {
              console.error('Failed to assign subjects, but class was created/updated');
              // Don't fail the whole operation if subject assignment fails
            }
          } catch (subjectError) {
            console.error('Error assigning subjects:', subjectError);
            // Don't fail the whole operation
          }
        }
        
        onSuccess();
      } else {
        alert(result.error || `Failed to ${existingClass ? 'update' : 'create'} class`);
      }
    } catch (error) {
      console.error(`Error ${existingClass ? 'updating' : 'creating'} class:`, error);
      alert(`Failed to ${existingClass ? 'update' : 'create'} class. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {existingClass ? 'Modify Class' : 'Add Class'}
            </h2>
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

            {/* Subjects Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign Subjects <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select subjects to be taught in this class. Only assigned subjects will appear in the timetable.
              </p>
              
              {/* Search Subjects */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="text"
                  placeholder="Search subjects..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Subjects Checkbox List */}
              <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                {loadingSubjects ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2F6FED] mx-auto mb-2"></div>
                    Loading subjects...
                  </div>
                ) : filteredSubjects.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSubjects.map((subject) => (
                      <label
                        key={subject.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.has(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED] focus:ring-2"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: subject.color || '#6366f1' }}
                        />
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {subject.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {subjectSearchQuery ? (
                      <>No subjects found matching &quot;{subjectSearchQuery}&quot;</>
                    ) : (
                      <>
                        <BookOpen className="mx-auto mb-2 text-gray-400" size={24} />
                        <p>No subjects available.</p>
                        <p className="text-xs mt-1">Create subjects in the Subjects page first.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {selectedSubjectIds.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedSubjectIds.size} subject{selectedSubjectIds.size !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (existingClass ? 'Updating...' : 'Creating...') : (existingClass ? 'Update Class' : 'Create Class')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

