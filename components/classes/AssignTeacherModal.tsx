'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <Card className="relative bg-[#FFFFFF] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1e3a8a]">Assign Class Teacher</h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#1e3a8a] transition-colors p-1 rounded-lg hover:bg-[#EAF1FF]"
            >
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
              <p className="text-[#64748B]">Loading teachers...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
                  <input
                    type="text"
                    placeholder="Search teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#64748B]">No teachers found</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-[#E1E1DB] rounded-lg mb-6 bg-[#F8FAFC]">
                  <div className="p-2">
                    <label className="flex items-center gap-3 p-3 hover:bg-[#EAF1FF] rounded-lg cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="teacher"
                        checked={selectedTeacherId === null}
                        onChange={() => setSelectedTeacherId(null)}
                        className="w-4 h-4 text-[#2F6FED] border-[#E1E1DB] focus:ring-[#60A5FA]"
                      />
                      <div>
                        <p className="font-medium text-[#0F172A]">No Teacher</p>
                        <p className="text-sm text-[#64748B]">Remove assigned teacher</p>
                      </div>
                    </label>
                    {filteredTeachers.map((teacher) => (
                      <label
                        key={teacher.id}
                        className={`flex items-center gap-3 p-3 hover:bg-[#EAF1FF] rounded-lg cursor-pointer transition-colors ${
                          selectedTeacherId === teacher.id ? 'bg-[#DBEAFE]' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="teacher"
                          checked={selectedTeacherId === teacher.id}
                          onChange={() => setSelectedTeacherId(teacher.id)}
                          className="w-4 h-4 text-[#2F6FED] border-[#E1E1DB] focus:ring-[#60A5FA]"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[#0F172A]">{teacher.full_name}</p>
                          <p className="text-sm text-[#64748B]">
                            {teacher.role}
                            {teacher.department && ` • ${teacher.department}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-[#DBEAFE] border border-[#60A5FA] rounded-lg flex items-center gap-2 text-[#1e3a8a]"
                  >
                    <CheckCircle2 size={20} className="text-[#2F6FED]" />
                    <span className="font-medium">Class teacher assigned successfully</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E1E1DB]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="border-[#E1E1DB] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1e3a8a]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={saving || showSuccess}
                  className="bg-[#2F6FED] hover:bg-[#1e3a8a] text-[#FFFFFF] disabled:opacity-50"
                >
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
