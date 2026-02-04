'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Search, UserCheck, AlertCircle } from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
  isBusy?: boolean;
  busyClass?: string;
}

interface TeacherSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacherIds: string[]) => void;
  schoolCode: string;
  subjectName: string;
  subjectId?: string | null;
  existingTeacherIds?: string[];
  day?: string;
  periodOrder?: number;
  currentClassId?: string | null;
}

export default function TeacherSelectionModal({
  isOpen,
  onClose,
  onSave,
  schoolCode,
  subjectName,
  subjectId,
  existingTeacherIds = [],
  day,
  periodOrder,
  currentClassId,
}: TeacherSelectionModalProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(
    new Set(existingTeacherIds || [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear previous errors
      fetchStaff();
      setSelectedTeacherIds(new Set(existingTeacherIds || []));
      // Availability check runs after staff is loaded (inside fetchStaff)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingTeacherIds, day, periodOrder]);

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
        ).map(teacher => ({
          ...teacher,
          isBusy: staff.find(s => s.id === teacher.id)?.isBusy || false,
          busyClass: staff.find(s => s.id === teacher.id)?.busyClass,
        }))
      );
    } else {
      setFilteredStaff(staff);
    }
  }, [searchQuery, staff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      
      // If subjectId is provided, fetch only staff who teach that subject
      // Otherwise, fetch all teaching staff
      let response;
      if (subjectId) {
        response = await fetch(`/api/staff-subjects/by-subject?school_code=${schoolCode}&subject_id=${subjectId}`);
      } else {
        response = await fetch(`/api/staff?school_code=${schoolCode}`);
      }
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to fetch staff';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Failed to fetch staff: ${response.statusText || 'Unknown error'}`;
        }
        console.error(errorMessage);
        setError(errorMessage);
        setStaff([]);
        setFilteredStaff([]);
        return;
      }
      
      // Clear any previous errors on successful fetch
      setError(null);
      
      const result = await response.json();

      if (result.data) {
        let staffToShow: Staff[] = [];
        
        if (subjectId) {
          // Result from staff-subjects/by-subject already returns only staff who teach this subject
          staffToShow = result.data.map((s: {
            id: string;
            full_name?: string;
            staff_id?: string;
            email?: string;
            role?: string;
            department?: string;
          }) => ({
            id: s.id,
            staff_id: s.staff_id || '',
            full_name: s.full_name || '',
            role: s.role || '',
            department: s.department || '',
          }));
        } else {
          // Filter to show only teaching staff (or all staff if no specific filter)
          interface StaffWithDesignation extends Staff {
            designation?: string;
          }
          const teachingStaff = result.data.filter(
            (s: StaffWithDesignation) =>
              s.role?.toLowerCase().includes('teacher') ||
              s.role?.toLowerCase().includes('principal') ||
              s.role?.toLowerCase().includes('head') ||
              s.role?.toLowerCase().includes('vice') ||
              (s.designation && s.designation.toLowerCase() === subjectName?.toLowerCase()) ||
              s.department?.toLowerCase().includes('teaching')
          );
          // If no teaching staff found, show all staff
          staffToShow = teachingStaff.length > 0 ? teachingStaff : result.data;
        }
        
        setStaff(staffToShow);
        setFilteredStaff(staffToShow);
        if (day != null && periodOrder !== undefined && currentClassId) {
          checkTeacherAvailability();
        }
      } else {
        const errorMsg = result.error || 'No data in response';
        console.error('Failed to fetch staff:', errorMsg, result);
        setError(errorMsg);
        setStaff([]);
        setFilteredStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      setError(`Network error: ${errorMessage}`);
      setStaff([]);
      setFilteredStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeacher = (teacherId: string) => {
    const teacher = staff.find(t => t.id === teacherId);
    const isBusy = teacher?.isBusy && !existingTeacherIds.includes(teacherId);
    if (isBusy && teacher?.busyClass) {
      alert(
        `This teacher is not available at this slot as they have another class (${teacher.busyClass}) at that time.`
      );
      return;
    }
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

  const checkTeacherAvailability = async () => {
    if (!day || periodOrder === undefined || !currentClassId) return;

    try {
      setCheckingAvailability(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        day,
        period_order: String(periodOrder),
        exclude_class_id: currentClassId,
      });
      const response = await fetch(
        `/api/timetable/teacher-availability?${params.toString()}`
      );

      if (response.ok) {
        const result = await response.json();
        const busyTeachers = new Map<string, string>(); // teacherId -> className
        (result.data || []).forEach((item: { teacher_id: string; class_name: string }) => {
          busyTeachers.set(item.teacher_id, item.class_name);
        });

        setStaff(prev => prev.map(teacher => ({
          ...teacher,
          isBusy: busyTeachers.has(teacher.id),
          busyClass: busyTeachers.get(teacher.id) || undefined,
        })));
        setFilteredStaff(prev => prev.map(teacher => ({
          ...teacher,
          isBusy: busyTeachers.has(teacher.id),
          busyClass: busyTeachers.get(teacher.id) || undefined,
        })));
      }
    } catch (error) {
      console.error('Error checking teacher availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSave = () => {
    // Check if any selected teachers are busy
    const busySelectedTeachers = Array.from(selectedTeacherIds).filter(id => {
      const teacher = staff.find(t => t.id === id);
      return teacher?.isBusy && !existingTeacherIds.includes(id); // Allow keeping existing busy teachers
    });

    if (busySelectedTeachers.length > 0) {
      const busyNames = busySelectedTeachers.map(id => {
        const teacher = staff.find(t => t.id === id);
        return teacher ? `${teacher.full_name} (already in ${teacher.busyClass})` : 'Unknown';
      }).join('\n');
      
      const conflictMessage = `⚠️ TEACHER CONFLICT DETECTED!\n\nThe following teachers are already assigned to other classes at this time slot:\n\n${busyNames}\n\n⚠️ WARNING: Proceeding will create a scheduling conflict.\n\nDo you want to proceed anyway?`;
      
      if (!confirm(conflictMessage)) {
        return; // User cancelled, don't save
      }
    }

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
              {day != null && periodOrder !== undefined && currentClassId && (
                <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                  Teachers already taking another class at this slot are marked and cannot be selected.
                </p>
              )}
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
              ) : error ? (
                <div className="text-center py-12">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <p className="font-semibold mb-1">Error Loading Staff</p>
                    <p className="text-sm">{error}</p>
                    <button
                      onClick={fetchStaff}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No teachers found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStaff.map((teacher) => {
                    const isSelected = selectedTeacherIds.has(teacher.id);
                    const isBusy = teacher.isBusy && !existingTeacherIds.includes(teacher.id);
                    return (
                      <div
                        key={teacher.id}
                        onClick={() => handleToggleTeacher(teacher.id)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : isBusy
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500'
                              : isBusy
                              ? 'border-red-400'
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
                            {isBusy && (
                              <div className="flex items-center gap-1 text-red-600 text-xs">
                                <AlertCircle size={14} />
                                <span className="font-medium">Busy</span>
                              </div>
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
                            {isBusy && teacher.busyClass && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-medium">
                                  Not available — has another class ({teacher.busyClass}) at this slot
                                </span>
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

