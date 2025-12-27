'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Search, UserCheck } from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
}

interface TeacherSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacherIds: string[]) => void;
  schoolCode: string;
  subjectName: string;
  existingTeacherIds?: string[];
}

export default function TeacherSelectionModal({
  isOpen,
  onClose,
  onSave,
  schoolCode,
  subjectName,
  existingTeacherIds = [],
}: TeacherSelectionModalProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(
    new Set(existingTeacherIds || [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setSelectedTeacherIds(new Set(existingTeacherIds || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingTeacherIds]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredStaff(
        staff.filter(
          (s) =>
            s.full_name?.toLowerCase().includes(query) ||
            s.staff_id?.toLowerCase().includes(query) ||
            s.role?.toLowerCase().includes(query) ||
            s.department?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredStaff(staff);
    }
  }, [searchQuery, staff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Filter to show only teaching staff (or all staff if no specific filter)
        const teachingStaff = result.data.filter(
          (s: Staff) =>
            s.role?.toLowerCase().includes('teacher') ||
            s.role?.toLowerCase().includes('principal') ||
            s.role?.toLowerCase().includes('head') ||
            s.role?.toLowerCase().includes('vice') ||
            s.designation?.toLowerCase() === subjectName?.toLowerCase() ||
            s.department?.toLowerCase().includes('teaching')
        );
        // If no teaching staff found, show all staff
        const staffToShow = teachingStaff.length > 0 ? teachingStaff : result.data;
        setStaff(staffToShow);
        setFilteredStaff(staffToShow);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selectedTeacherIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <Card className="relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-black">Add Teachers</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select teachers for <span className="font-semibold">{subjectName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Search */}
            <div className="mb-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search teachers by name, ID, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Teacher List */}
            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No teachers found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStaff.map((teacher) => {
                    const isSelected = selectedTeacherIds.has(teacher.id);
                    return (
                      <div
                        key={teacher.id}
                        onClick={() => handleToggleTeacher(teacher.id)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {teacher.full_name}
                            </p>
                            {isSelected && (
                              <UserCheck size={16} className="text-orange-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                            <span>{teacher.staff_id}</span>
                            <span>•</span>
                            <span>{teacher.role}</span>
                            {teacher.department && (
                              <>
                                <span>•</span>
                                <span>{teacher.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 flex-shrink-0">
            <p className="text-sm text-gray-600">
              {selectedTeacherIds.size} teacher{selectedTeacherIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
                Save Teachers
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

