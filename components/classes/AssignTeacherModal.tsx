'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { X, Search, CheckCircle2 } from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
  role: string;
  department?: string;
}

interface AssignTeacherModalProps {
  schoolCode: string;
  classId: string;
  currentTeacher?: { id: string; full_name: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignTeacherModal({
  schoolCode,
  classId,
  currentTeacher,
  onClose,
  onSuccess,
}: AssignTeacherModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    currentTeacher?.id || null
  );
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [schoolCode]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes/teachers?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTeachers(result.data);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      alert('Failed to fetch teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_teacher_id: selectedTeacherId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onSuccess();
        }, 1500);
      } else {
        alert(result.error || 'Failed to assign teacher');
      }
    } catch (error) {
      console.error('Error assigning teacher:', error);
      alert('Failed to assign teacher. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (teacher.department && teacher.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Assign Class Teacher</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading teachers...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No teachers found</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-6">
                  <div className="p-2">
                    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="teacher"
                        checked={selectedTeacherId === null}
                        onChange={() => setSelectedTeacherId(null)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                      />
                      <div>
                        <p className="font-medium text-gray-900">No Teacher</p>
                        <p className="text-sm text-gray-500">Remove assigned teacher</p>
                      </div>
                    </label>
                    {filteredTeachers.map((teacher) => (
                      <label
                        key={teacher.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="teacher"
                          checked={selectedTeacherId === teacher.id}
                          onChange={() => setSelectedTeacherId(teacher.id)}
                          className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{teacher.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {teacher.role}
                            {teacher.department && ` • ${teacher.department}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {showSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                  <CheckCircle2 size={20} />
                  <span className="font-medium">Class teacher assigned successfully</span>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving || showSuccess}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

