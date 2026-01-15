'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Search, BookOpen, AlertTriangle } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  color?: string;
}

interface AssignSubjectsModalProps {
  schoolCode: string;
  classId: string;
  className: string;
  section: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignSubjectsModal({
  schoolCode,
  classId,
  className,
  section,
  onClose,
  onSuccess,
}: AssignSubjectsModalProps) {
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [usedSubjects, setUsedSubjects] = useState<Set<string>>(new Set());

  // Fetch all subjects and assigned subjects on mount
  useEffect(() => {
    fetchSubjects();
    fetchAssignedSubjects();
    checkUsedSubjects();
  }, [classId, schoolCode]);

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

  const fetchAssignedSubjects = async () => {
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

  const checkUsedSubjects = async () => {
    try {
      // Check which subjects are used in timetable slots
      const response = await fetch(`/api/timetable/slots?school_code=${schoolCode}&class_id=${classId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const used = new Set<string>();
        result.data.forEach((slot: { subject_id?: string }) => {
          if (slot.subject_id) {
            used.add(slot.subject_id);
          }
        });
        setUsedSubjects(used);
      }
    } catch (error) {
      console.error('Error checking used subjects:', error);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        // Removing a subject
        if (usedSubjects.has(subjectId)) {
          setWarning(
            `Warning: This subject is currently used in the timetable. Removing it may cause timetable slots to show unassigned subjects.`
          );
        } else {
          setWarning(null);
        }
        newSet.delete(subjectId);
      } else {
        // Adding a subject
        setWarning(null);
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          subject_ids: Array.from(selectedSubjectIds),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to assign subjects');
      }
    } catch (error) {
      console.error('Error assigning subjects:', error);
      alert('Failed to assign subjects. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">
                Assign Subjects
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Class {className} - Section {section}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warning */}
            {warning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            )}

            {/* Subjects Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Subjects
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
                    {filteredSubjects.map((subject) => {
                      const isUsed = usedSubjects.has(subject.id);
                      const isSelected = selectedSubjectIds.has(subject.id);
                      
                      return (
                        <label
                          key={subject.id}
                          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors ${
                            isUsed && !isSelected ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
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
                          {isUsed && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                              Used in timetable
                            </span>
                          )}
                        </label>
                      );
                    })}
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
                {saving ? 'Saving...' : 'Save Subjects'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
