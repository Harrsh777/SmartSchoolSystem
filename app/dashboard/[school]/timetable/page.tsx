'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, X, Check, Loader2, GripVertical, BookOpen, Download, UserCheck } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TimetableSlot {
  id: string;
  day: string;
  period: number;
  subject_id: string | null;
  subject?: Subject;
  teacher_id?: string | null;
  teacher_ids?: string[] | null;
  teachers?: Array<{ id: string; full_name: string }>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#14b8a6', '#f97316', '#84cc16',
  '#a855f7', '#e91e63', '#00bcd4', '#ff5722',
  '#4caf50', '#ff9800', '#9c27b0', '#2196f3',
];

function SubjectChip({ subject, isDragging }: { subject: Subject; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging || isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab active:cursor-grabbing"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md border-2 backdrop-blur-sm transition-all hover:shadow-lg hover:scale-105"
        style={{
          backgroundColor: `${subject.color}25`,
          borderColor: `${subject.color}80`,
          boxShadow: `0 4px 6px -1px ${subject.color}30, 0 2px 4px -1px ${subject.color}20`,
        }}
      >
        <GripVertical className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: subject.color }} />
        <span className="font-semibold text-sm" style={{ color: subject.color }}>
          {subject.name}
        </span>
      </div>
    </motion.div>
  );
}

function TimetableCell({
  day,
  period,
  subject,
  onClear,
  hasTeacher,
}: {
  day: string;
  period: number;
  subject?: Subject;
  onClear: () => void;
  hasTeacher?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `${day}-${period}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[90px] p-2 border-2 border-dashed rounded-lg transition-all group ${
        isOver
          ? 'border-blue-500 bg-blue-100 border-solid shadow-lg scale-105'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100/70'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {subject ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-full flex flex-col"
        >
          <div
            className={`flex-1 rounded-md p-3 shadow-md border-2 transition-all hover:shadow-lg ${
              !hasTeacher ? 'border-yellow-400 border-dashed animate-pulse' : ''
            }`}
            style={{
              backgroundColor: `${subject.color}30`,
              borderColor: hasTeacher ? `${subject.color}70` : '#fbbf24',
              boxShadow: `0 2px 4px ${subject.color}25`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span
                  className="font-bold text-sm leading-tight"
                  style={{ color: subject.color }}
                >
                  {subject.name}
                </span>
                {!hasTeacher && (
                  <p className="text-xs text-yellow-700 mt-1">No teacher assigned</p>
                )}
              </div>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="ml-1 p-1 rounded hover:bg-red-100 transition-colors"
                  title="Clear slot"
                >
                  <X className="w-3 h-3 text-red-600" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}

export default function TimetablePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(DEFAULT_COLORS[0]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; class: string; section: string; academic_year: string; class_teacher_id?: string } | null>(null);
  interface ClassData {
    id: string;
    class: string;
    section: string;
    academic_year: string;
    class_teacher_id?: string;
    [key: string]: unknown;
  }
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; period: number; subjectId: string } | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; full_name: string; staff_id: string }>>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isClassTeacherTimetable, setIsClassTeacherTimetable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  // Helper to safely get number value
  const getNumber = (value: unknown): number => {
    return typeof value === 'number' ? value : 0;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedClass) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchData = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const [subjectsRes, slotsRes] = await Promise.all([
        fetch(`/api/timetable/subjects?school_code=${schoolCode}&class_id=${selectedClass.id}`),
        fetch(`/api/timetable/slots?school_code=${schoolCode}&class_id=${selectedClass.id}`),
      ]);

      const subjectsData = await subjectsRes.json();
      const slotsData = await slotsRes.json();

      if (subjectsRes.ok && subjectsData.data) {
        setSubjects(subjectsData.data);
      }

      if (slotsRes.ok && slotsData.data) {
        // Map slots to include teacher information
        interface TimetableSlotData {
          teacher_ids?: string[] | null;
          teacher_id?: string | null;
          [key: string]: unknown;
        }
        const mappedSlots = slotsData.data.map((slot: TimetableSlotData) => ({
          ...slot,
          teacher_ids: slot.teacher_ids || (slot.teacher_id ? [slot.teacher_id] : null),
        }));
        setSlots(mappedSlots);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSlot = useCallback(
    (day: string, period: number): TimetableSlot | undefined => {
      return slots.find((s) => s.day === day && s.period === period);
    },
    [slots]
  );

  const getSubject = useCallback(
    (subjectId: string | null): Subject | undefined => {
      if (!subjectId) return undefined;
      return subjects.find((s) => s.id === subjectId);
    },
    [subjects]
  );

  const saveSlot = async (day: string, period: number, subjectId: string | null, teacherIds: string[] = []) => {
    if (!selectedClass) return;
    
    const slotKey = `${day}-${period}`;
    setSaving(slotKey);

    try {
      const response = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          day,
          period,
          subject_id: subjectId,
          class_id: isClassTeacherTimetable ? null : selectedClass.id,
          class_teacher_id: isClassTeacherTimetable ? selectedClass.class_teacher_id : null,
          teacher_ids: teacherIds.length > 0 ? teacherIds : null,
          teacher_id: teacherIds.length === 1 ? teacherIds[0] : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        const existingSlotIndex = slots.findIndex(
          (s) => s.day === day && s.period === period
        );

        if (subjectId) {
          const subject = subjects.find((s) => s.id === subjectId);
          const newSlot: TimetableSlot = {
            id: result.data.id,
            day,
            period,
            subject_id: subjectId,
            subject: subject,
            teacher_ids: teacherIds.length > 0 ? teacherIds : null,
            teacher_id: teacherIds.length === 1 ? teacherIds[0] : null,
          };

          if (existingSlotIndex >= 0) {
            setSlots((prev) => {
              const updated = [...prev];
              updated[existingSlotIndex] = newSlot;
              return updated;
            });
          } else {
            setSlots((prev) => [...prev, newSlot]);
          }
        } else {
          // Clearing slot
          if (existingSlotIndex >= 0) {
            setSlots((prev) => prev.filter((_, i) => i !== existingSlotIndex));
          }
        }

        // Show success feedback
        setSaveFeedback(slotKey);
        setTimeout(() => setSaveFeedback(null), 2000);
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving slot:', error);
      alert('Failed to save. Please try again.');
      // Revert by refetching
      fetchData();
    } finally {
      setSaving(null);
    }
  };

  const clearSlot = async (day: string, period: number) => {
    if (!selectedClass) return;
    
    const slotKey = `${day}-${period}`;
    setSaving(slotKey);

    try {
      const response = await fetch(
        `/api/timetable/slots?school_code=${schoolCode}&day=${day}&period=${period}&class_id=${selectedClass.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Update local state
        const existingSlotIndex = slots.findIndex(
          (s) => s.day === day && s.period === period
        );

        if (existingSlotIndex >= 0) {
          setSlots((prev) => prev.filter((_, i) => i !== existingSlotIndex));
        }

        // Show success feedback
        setSaveFeedback(slotKey);
        setTimeout(() => setSaveFeedback(null), 2000);
      } else {
        throw new Error(result.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error clearing slot:', error);
      alert('Failed to clear slot. Please try again.');
      // Revert by refetching
      fetchData();
    } finally {
      setSaving(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedClass) return;

    const subjectId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a timetable cell
    if (overId.includes('-')) {
      const [day, periodStr] = overId.split('-');
      const period = parseInt(periodStr);

      if (DAYS.includes(day) && PERIODS.includes(period)) {
        const subject = subjects.find(s => s.id === subjectId);
        
        // Fetch teachers for this subject using staff-subjects endpoint
        if (subject) {
          try {
            const response = await fetch(`/api/staff-subjects/by-subject?school_code=${schoolCode}&subject_id=${subject.id}`);
            const result = await response.json();
            if (response.ok && result.data && result.data.length > 0) {
              setAvailableTeachers(result.data);
              setSelectedSlot({ day, period, subjectId });
              setSelectedTeachers([]);
            } else {
              // No teachers found for this subject, show message but still allow saving
              alert(`No teachers assigned to ${subject.name}. Please assign teachers to this subject first in Subject Teachers section.`);
              await saveSlot(day, period, subjectId, []);
            }
          } catch (error) {
            console.error('Error fetching teachers:', error);
            // Save without teacher assignment
            await saveSlot(day, period, subjectId, []);
          }
        } else {
          await saveSlot(day, period, subjectId, []);
        }
      }
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      const response = await fetch('/api/timetable/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          name: newSubjectName.trim(),
          color: newSubjectColor,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setSubjects((prev) => [...prev, result.data]);
        setNewSubjectName('');
        setShowAddSubject(false);
      } else {
        alert(result.error || 'Failed to add subject');
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to add subject. Please try again.');
    }
  };

  const activeSubject = activeId ? subjects.find((s) => s.id === activeId) : null;

  const handleClassSelect = (cls: ClassData) => {
    setSelectedClass({
      id: cls.id,
      class: cls.class,
      section: cls.section,
      academic_year: cls.academic_year,
      class_teacher_id: cls.class_teacher_id,
    });
    setShowClassSelector(false);
    setIsClassTeacherTimetable(false);
  };

  const handleAssignTeachers = () => {
    if (selectedSlot) {
      saveSlot(selectedSlot.day, selectedSlot.period, selectedSlot.subjectId, selectedTeachers);
      setSelectedSlot(null);
      setSelectedTeachers([]);
      setAvailableTeachers([]);
    }
  };

  // Check if timetable is complete (all subjects have teachers assigned)
  const checkTimetableComplete = useCallback(() => {
    if (!selectedClass || slots.length === 0) return { complete: false, missing: 0, total: 0 };
    
    const slotsWithSubjects = slots.filter(s => s.subject_id);
    const slotsWithTeachers = slotsWithSubjects.filter(s => 
      (s.teacher_ids && s.teacher_ids.length > 0) || s.teacher_id
    );
    
    return {
      complete: slotsWithSubjects.length === slotsWithTeachers.length,
      missing: slotsWithSubjects.length - slotsWithTeachers.length,
      total: slotsWithSubjects.length,
    };
  }, [slots, selectedClass]);

  const handleSubmitTimetable = async () => {
    if (!selectedClass) return;
    
    const status = checkTimetableComplete();
    
    if (!status.complete) {
      setShowSubmitWarning(true);
      setTimeout(() => setShowSubmitWarning(false), 3000);
      return;
    }

    if (!confirm('Are you sure you want to submit this timetable? This will create timetables for all assigned teachers.')) {
      return;
    }

    setSubmitting(true);
    try {
      // Refresh slots to get latest data
      await fetchData();
      
      // Get all slots with teachers from the refreshed data
      const response = await fetch(`/api/timetable/slots?school_code=${schoolCode}&class_id=${selectedClass.id}`);
      const result = await response.json();
      
      if (!response.ok || !result.data) {
        throw new Error('Failed to fetch timetable slots');
      }

      const allSlots = result.data;
      interface SlotWithTeachers {
        subject_id?: string | null;
        teacher_ids?: string[] | null;
        teacher_id?: string | null;
        [key: string]: unknown;
      }
      const slotsWithTeachers = allSlots.filter((s: SlotWithTeachers) => 
        s.subject_id && ((s.teacher_ids && s.teacher_ids.length > 0) || s.teacher_id)
      );

      // Create personal timetables for all assigned teachers
      const teacherTimetablePromises: Promise<unknown>[] = [];
      
      slotsWithTeachers.forEach((slot: SlotWithTeachers) => {
        const teacherIds = slot.teacher_ids || (slot.teacher_id ? [slot.teacher_id] : []);
        
        // For each teacher assigned to this slot, create their personal timetable
        teacherIds.forEach((teacherId: string) => {
          teacherTimetablePromises.push(
            fetch('/api/timetable/slots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                school_code: schoolCode,
                day: slot.day,
                period: slot.period,
                subject_id: slot.subject_id,
                class_teacher_id: teacherId, // This creates the teacher's personal timetable
                teacher_ids: [teacherId],
                teacher_id: teacherId,
              }),
            }).then(res => res.json())
          );
        });
      });

      await Promise.all(teacherTimetablePromises);

      // Show success message
      alert('Timetable submitted successfully! Personal timetables have been created for all assigned teachers.');
      fetchData(); // Refresh to show updated data
    } catch (error) {
      console.error('Error submitting timetable:', error);
      alert('Failed to submit timetable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTimetable = () => {
    // Create a simple HTML table for download
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    
    // Header row
    const headerRow = table.insertRow();
    const dayHeader = headerRow.insertCell();
    dayHeader.textContent = 'Day / Period';
    dayHeader.style.border = '1px solid #000';
    dayHeader.style.padding = '8px';
    dayHeader.style.fontWeight = 'bold';
    
    PERIODS.forEach(period => {
      const cell = headerRow.insertCell();
      cell.textContent = `Period ${period}`;
      cell.style.border = '1px solid #000';
      cell.style.padding = '8px';
      cell.style.fontWeight = 'bold';
    });

    // Data rows
    DAYS.forEach(day => {
      const row = table.insertRow();
      const dayCell = row.insertCell();
      dayCell.textContent = day;
      dayCell.style.border = '1px solid #000';
      dayCell.style.padding = '8px';
      dayCell.style.fontWeight = 'bold';
      
      PERIODS.forEach(period => {
        const slot = getSlot(day, period);
        const subject = slot?.subject_id ? getSubject(slot.subject_id) : undefined;
        const cell = row.insertCell();
        cell.textContent = subject ? subject.name : '';
        cell.style.border = '1px solid #000';
        cell.style.padding = '8px';
      });
    });

    // Convert to HTML and download
    const html = `
      <html>
        <head>
          <title>Timetable - ${selectedClass?.class}-${selectedClass?.section}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Timetable - ${selectedClass?.class}-${selectedClass?.section}</h1>
          <p>Academic Year: ${selectedClass?.academic_year}</p>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Timetable-${selectedClass?.class}-${selectedClass?.section}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (showClassSelector) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}`)}
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">Timetable Builder</h1>
              <p className="text-gray-600">Select a class to create or edit its timetable</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
              <BookOpen size={24} />
              Select Class
            </h2>
            <p className="text-gray-600">Choose which class timetable you want to create or edit</p>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No classes found. Please create a class first.</p>
              <Button onClick={() => router.push(`/dashboard/${schoolCode}/classes`)}>
                Create Class
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <motion.button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-black">
                      {getString(cls.class)}-{getString(cls.section)}
                    </h3>
                    <BookOpen className="text-gray-400" size={20} />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Academic Year: {getString(cls.academic_year)}</p>
                  <p className="text-sm text-gray-600">Students: {getNumber(cls.student_count)}</p>
                  {(() => {
                    const classTeacher = cls.class_teacher;
                    if (classTeacher && typeof classTeacher === 'object' && 'full_name' in classTeacher) {
                      const teacherName = getString(classTeacher.full_name);
                      if (teacherName) {
                        return (
                          <p className="text-sm text-gray-600 mt-2">
                            Class Teacher: {teacherName}
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </motion.button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-black mx-auto mb-4" />
          <p className="text-gray-600">Loading timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              Timetable Builder - {selectedClass?.class}-{selectedClass?.section}
            </h1>
            <p className="text-gray-600">Drag and drop subjects to build your class timetable</p>
            <p className="text-sm text-gray-500 mt-1">Academic Year: {selectedClass?.academic_year}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClassSelector(true)}
            >
              Change Class
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadTimetable}
              disabled={!selectedClass}
            >
              <Download size={18} className="mr-2" />
              Download
            </Button>
            <Button
              onClick={handleSubmitTimetable}
              disabled={!selectedClass || submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={18} className="mr-2" />
                  Submit Timetable
                </>
              )}
            </Button>
            {selectedClass?.class_teacher_id && (
              <Button
                variant={isClassTeacherTimetable ? "primary" : "outline"}
                onClick={() => setIsClassTeacherTimetable(!isClassTeacherTimetable)}
              >
                <UserCheck size={18} className="mr-2" />
                {isClassTeacherTimetable ? 'Class Timetable' : 'Class Teacher Timetable'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Warning */}
      {showSubmitWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center gap-3">
            <X className="text-yellow-600" size={20} />
            <div>
              <p className="font-semibold text-yellow-900">Finish the timetable</p>
              <p className="text-sm text-yellow-700">
                {checkTimetableComplete().missing} slot(s) still need teacher assignment. Please assign teachers to all subjects before submitting.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Timetable Status */}
      {selectedClass && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">Timetable Status</p>
              <p className="text-sm text-blue-700">
                {checkTimetableComplete().total - checkTimetableComplete().missing} of {checkTimetableComplete().total} subjects have teachers assigned
              </p>
            </div>
            {checkTimetableComplete().complete && (
              <div className="flex items-center gap-2 text-green-700">
                <Check size={20} />
                <span className="font-medium">Ready to Submit</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Subjects Bar */}
        <Card className="sticky top-4 z-10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-black">Subjects</h2>
            <Button
              size="sm"
              onClick={() => setShowAddSubject(!showAddSubject)}
              variant="outline"
            >
              <Plus size={16} className="mr-2" />
              Add Subject
            </Button>
          </div>

          {showAddSubject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name
                  </label>
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g., Mathematics"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <Button onClick={handleAddSubject} size="sm">
                  Add
                </Button>
              </div>
            </motion.div>
          )}

          {subjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No subjects yet. Add your first subject to get started!</p>
            </div>
          ) : (
            <SortableContext items={subjects.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-3">
                {subjects.map((subject) => (
                  <SubjectChip
                    key={subject.id}
                    subject={subject}
                    isDragging={activeId === subject.id}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </Card>

        {/* Timetable Grid */}
        <Card>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-gradient-to-br from-indigo-50 to-purple-50 border-r-2 border-b-2 border-indigo-300 p-3 text-left font-bold text-indigo-900 min-w-[120px] shadow-sm">
                      Day / Period
                    </th>
                    {PERIODS.map((period) => (
                      <th
                        key={period}
                        className="sticky z-10 bg-gradient-to-br from-blue-50 to-cyan-50 border-b-2 border-r border-blue-300 p-3 text-center font-bold text-blue-900 min-w-[140px] shadow-sm"
                      >
                        Period {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td className="sticky left-0 z-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-r-2 border-b border-indigo-200 p-3 font-bold text-indigo-900 shadow-sm">
                        {day}
                      </td>
                      {PERIODS.map((period) => {
                        const slot = getSlot(day, period);
                        const subject = slot?.subject_id ? getSubject(slot.subject_id) : undefined;
                        const slotKey = `${day}-${period}`;
                        const isSaving = saving === slotKey;
                        const showFeedback = saveFeedback === slotKey;
                        const hasTeacher: boolean = slot?.subject_id ? 
                          (!!(slot.teacher_ids && slot.teacher_ids.length > 0) || !!(slot.teacher_id)) : 
                          true;

                        return (
                          <td
                            key={period}
                            className="border-r border-b border-gray-200 p-2 bg-white"
                          >
                            <div className="relative">
                              <TimetableCell
                                day={day}
                                period={period}
                                subject={subject}
                                onClear={() => clearSlot(day, period)}
                                hasTeacher={hasTeacher}
                              />
                              {isSaving && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-20">
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                                </div>
                              )}
                              {showFeedback && !isSaving && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg z-30"
                                >
                                  <Check className="w-3 h-3 text-white" />
                                </motion.div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <DragOverlay>
          {activeSubject ? (
            <div className="opacity-90">
              <SubjectChip subject={activeSubject} isDragging={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Teacher Selection Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Teacher(s)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select teacher(s) for {subjects.find(s => s.id === selectedSlot.subjectId)?.name} on {selectedSlot.day}, Period {selectedSlot.period}
            </p>
            
            {availableTeachers.length === 0 ? (
              <p className="text-gray-500 mb-4">No teachers found for this subject.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {availableTeachers.map((teacher) => (
                  <label
                    key={teacher.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers([...selectedTeachers, teacher.id]);
                        } else {
                          setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                        }
                      }}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{teacher.full_name}</p>
                      <p className="text-sm text-gray-500">{teacher.staff_id}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedTeachers([]);
                  setAvailableTeachers([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTeachers}
                className="flex-1"
                disabled={availableTeachers.length > 0 && selectedTeachers.length === 0}
              >
                Assign
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

