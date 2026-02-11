'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, GripVertical, Loader2, UserPlus, Save, CheckCircle, Download } from 'lucide-react';
import TeacherSelectionModal from '@/components/timetable/TeacherSelectionModal';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Period {
  id: string;
  period_name: string;
  period_duration_minutes: number;
  period_start_time: string;
  period_end_time: string;
  period_order: number;
  is_break: boolean;
}

interface PeriodGroup {
  id: string;
  group_name: string;
  class_start_time: string;
  selected_days: string[];
  periods: Period[];
  is_active?: boolean;
}

interface TimetableSlot {
  id: string;
  day: string;
  period_order: number;
  subject_id: string | null;
  subject?: Subject;
  teacher_id?: string | null;
  teacher_ids?: string[] | null;
  teachers?: Array<{ id: string; full_name: string; staff_id: string }>;
}

// DEFAULT_COLORS kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md border-2 backdrop-blur-sm transition-all hover:shadow-lg"
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

export default function ClassTimetablePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periodGroup, setPeriodGroup] = useState<PeriodGroup | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  // loading kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; class: string; section: string } | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  interface ClassData {
    id: string;
    class: string;
    section: string;
    [key: string]: unknown;
  }
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [periodGroups, setPeriodGroups] = useState<PeriodGroup[]>([]);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; periodOrder: number } | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const appliedInitialClassRef = useRef(false);
  const searchParams = useSearchParams();

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
    fetchPeriodGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, periodGroup]);

  useEffect(() => {
    // Update selectedClass when class name or section changes
    if (selectedClassName && selectedSection) {
      const cls = classes.find(c => c.class === selectedClassName && c.section === selectedSection);
      if (cls) {
        setSelectedClass({ id: cls.id, class: cls.class, section: cls.section });
      } else {
        setSelectedClass(null);
      }
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassName, selectedSection, classes]);

  // Auto-select class/section from URL when coming from Class Overview (View timetable)
  useEffect(() => {
    if (appliedInitialClassRef.current) return;
    const classId = searchParams.get('class_id');
    const urlClass = searchParams.get('class');
    const urlSection = searchParams.get('section');
    if (!classId && !(urlClass && urlSection)) return;

    const trySelect = (classList: ClassData[]) => {
      let cls: ClassData | undefined;
      if (classId) cls = classList.find(c => c.id === classId);
      if (!cls && urlClass && urlSection) cls = classList.find(c => c.class === urlClass && c.section === urlSection);
      if (cls) {
        appliedInitialClassRef.current = true;
        setSelectedClassName(cls.class);
        setSelectedSection(cls.section);
        return true;
      }
      return false;
    };

    if (classes.length > 0) {
      if (trySelect(classes)) return;
      // Class not in current list (e.g. different period group) - fetch all classes so we can show the requested one
      fetch(`/api/classes?school_code=${schoolCode}`)
        .then(res => res.json())
        .then(result => {
          if (result.data && result.data.length > 0 && !appliedInitialClassRef.current) {
            const allClasses = result.data as ClassData[];
            if (trySelect(allClasses)) setClasses(allClasses);
          }
        })
        .catch(() => {});
    }
  }, [classes, schoolCode, searchParams]);

  // Fetch subjects when period group is selected (even without class)
  useEffect(() => {
    if (periodGroup) {
      fetchSubjects(selectedClass?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodGroup]);

  // Fetch subjects and slots when class is selected
  useEffect(() => {
    if (selectedClass && periodGroup) {
      fetchSubjects(selectedClass.id);
      fetchTimetableSlots();
    } else if (periodGroup && !selectedClass) {
      // Just fetch all subjects if period group is selected but no class
      fetchSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, periodGroup]);

  const fetchClasses = async () => {
    try {
      // If a period group is selected, only fetch classes assigned to that group
      if (periodGroup) {
        const response = await fetch(`/api/timetable/period-groups/classes?school_code=${schoolCode}&group_id=${periodGroup.id}`);
        const result = await response.json();
        if (response.ok && result.data) {
          // Extract class data from assignments
          interface AssignmentData {
            class?: {
              id: string;
              class: string;
              section: string;
              academic_year?: string;
            };
            [key: string]: unknown;
          }
          const assignedClasses = result.data
            .map((assignment: AssignmentData) => assignment.class)
            .filter((cls: ClassData | undefined) => cls !== null && cls !== undefined);
          setClasses(assignedClasses);
        } else {
          console.error('Failed to fetch classes for period group:', result.error);
          setClasses([]);
        }
      } else {
        // If no period group selected, fetch all classes
        const response = await fetch(`/api/classes?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setClasses(result.data);
        } else {
          console.error('Failed to fetch classes:', result.error);
          setClasses([]);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  const fetchPeriodGroups = async () => {
    try {
      const response = await fetch(`/api/timetable/period-groups?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setPeriodGroups(result.data);
        // Auto-select active group or first group
        interface PeriodGroupData {
          is_active?: boolean;
          [key: string]: unknown;
        }
        const activeGroup = result.data.find((g: PeriodGroupData) => g.is_active) || result.data[0];
        if (activeGroup) {
          setPeriodGroup(activeGroup);
        }
      }
    } catch (error) {
      console.error('Error fetching period groups:', error);
    }
  };

  // Fetch subjects (can be called with or without class)
  const fetchSubjects = async (classId?: string) => {
    try {
      const url = classId 
        ? `/api/timetable/subjects?school_code=${schoolCode}&class_id=${classId}`
        : `/api/timetable/subjects?school_code=${schoolCode}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.data) {
        setSubjects(result.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Fetch timetable slots for selected class
  const fetchTimetableSlots = async () => {
    if (!selectedClass) {
      setSlots([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/timetable/slots?school_code=${schoolCode}&class_id=${selectedClass.id}`);
      
      let result;
      try {
        result = await response.json();
      } catch {
        // If response is not JSON, try to get text
        const text = await response.text();
        console.error('Failed to parse response as JSON:', {
          status: response.status,
          statusText: response.statusText,
          text: text.substring(0, 500), // First 500 chars
        });
        setSlots([]);
        return;
      }
      
      if (!response.ok) {
        console.error('HTTP error fetching timetable slots:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details,
          code: result.code,
          hint: result.hint,
          fullResult: result,
        });
        setSlots([]);
        return;
      }

      if (result.error) {
        console.error('API error fetching timetable slots:', {
          error: result.error,
          details: result.details,
          code: result.code,
          hint: result.hint,
        });
        setSlots([]);
        return;
      }

      if (result.data) {
        // Map slots to include subject and teacher information
        // Keep all slots (including those with null subject_id for empty slots)
        const mappedSlots = result.data.map((slot: TimetableSlot) => {
          // Ensure period_order is set correctly
          if (!slot.period_order && (slot as { period?: number }).period) {
            const periodNum = parseInt(String((slot as { period?: number }).period), 10);
            if (!isNaN(periodNum)) {
              slot.period_order = periodNum;
            }
          }
          return slot;
        });
        console.log('Successfully loaded timetable slots:', mappedSlots.length);
        setSlots(mappedSlots);
      } else {
        console.warn('No data in response, but request was successful:', result);
        setSlots([]);
      }
    } catch (error) {
      console.error('Exception fetching timetable slots:', error);
      setSlots([]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchData = async () => {
    if (!periodGroup) return;
    
    // Always fetch subjects (with or without class)
    await fetchSubjects(selectedClass?.id);
    
    // Only fetch slots if class is selected
    if (selectedClass) {
      await fetchTimetableSlots();
    }
  };

  const getSlot = useCallback(
    (day: string, periodOrder: number): TimetableSlot | undefined => {
      return slots.find(s => s.day === day && s.period_order === periodOrder);
    },
    [slots]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedClass || !periodGroup) return;

    const subjectId = active.id as string;
    const overId = over.id as string;

    // Parse day and period from overId (format: "day-periodOrder")
    const [day, periodOrderStr] = overId.toString().split('-');
    const periodOrder = parseInt(periodOrderStr);

    if (!day || isNaN(periodOrder)) return;

    // Check if this is a valid period (not a break)
    const period = periodGroup.periods.find(p => p.period_order === periodOrder && !p.is_break);
    if (!period) return; // Can't drop on breaks

    setSaving(`${day}-${periodOrder}`);

    try {
      const periodGroupId = periodGroup?.id || null;
      const response = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: selectedClass.id,
          day: day,
          period_order: periodOrder, // Use period_order instead of period
          subject_id: subjectId,
          period_group_id: periodGroupId, // Sync with period group
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh slots from server to ensure we have the latest data
        // This ensures that when updating a subject, the old one is properly replaced
        await fetchTimetableSlots();
      } else {
        console.error('Failed to save slot:', result);
        const errorDetails = result.details ? `\nDetails: ${result.details}` : '';
        const errorCode = result.code ? `\nCode: ${result.code}` : '';
        const errorHint = result.hint ? `\nHint: ${result.hint}` : '';
        alert(`Failed to save timetable slot: ${result.error}${errorDetails}${errorCode}${errorHint}`);
      }
    } catch (error) {
      console.error('Error saving slot:', error);
      alert('Failed to save timetable slot. Please check your connection and try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleClearSlot = async (day: string, periodOrder: number) => {
    if (!selectedClass || !periodGroup) return;

    if (!confirm('Are you sure you want to remove this subject from the timetable?')) {
      return;
    }

    setSaving(`${day}-${periodOrder}`);

    try {
      const response = await fetch('/api/timetable/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: selectedClass.id,
          day: day,
          period_order: periodOrder, // Use period_order instead of period
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Remove from local state immediately for better UX
        setSlots(prev => prev.filter(s => !(s.day === day && s.period_order === periodOrder)));
        // Refresh slots from server to ensure consistency
        await fetchTimetableSlots();
      } else {
        console.error('Failed to clear slot:', result);
        alert(result.error || 'Failed to clear slot. Please try again.');
        // Refresh to get current state
        await fetchTimetableSlots();
      }
    } catch (error) {
      console.error('Error clearing slot:', error);
      alert('Failed to clear slot. Please try again.');
      // Refresh to get current state
      await fetchTimetableSlots();
    } finally {
      setSaving(null);
    }
  };

  const handleAddTeachers = (day: string, periodOrder: number) => {
    setSelectedSlot({ day, periodOrder });
    setTeacherModalOpen(true);
  };

  const handleDownloadTimetable = async () => {
    if (!selectedClass || !periodGroup) {
      alert('Please select a class first');
      return;
    }

    try {
      const className = selectedClass.class + (selectedClass.section ? `-${selectedClass.section}` : '');
      const url = `/api/timetable/download?school_code=${schoolCode}&class_id=${selectedClass.id}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable_${className}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading timetable:', error);
      alert('Failed to download timetable. Please try again.');
    }
  };

  const handleSaveTeachers = async (teacherIds: string[]) => {
    if (!selectedSlot || !selectedClass || !periodGroup) return;

    const slot = getSlot(selectedSlot.day, selectedSlot.periodOrder);
    if (!slot || !slot.subject_id) return;

    setSaving(`${selectedSlot.day}-${selectedSlot.periodOrder}`);

    try {
      const periodGroupId = periodGroup?.id || null;
      const response = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: selectedClass.id,
          day: selectedSlot.day,
          period_order: selectedSlot.periodOrder,
          subject_id: slot.subject_id,
          teacher_ids: teacherIds,
          period_group_id: periodGroupId, // Sync with period group
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setSlots(prev => prev.map(s =>
          s.day === selectedSlot.day && s.period_order === selectedSlot.periodOrder
            ? { 
                ...s, 
                teacher_ids: teacherIds,
                teacher_id: teacherIds.length > 0 ? teacherIds[0] : null,
                teachers: result.data?.teachers || [],
              }
            : s
        ));
        setTeacherModalOpen(false);
        setSelectedSlot(null);
      } else if (response.status === 409 && result.code === 'TEACHER_CONFLICT') {
        // Handle teacher conflict - prevent saving and show detailed error
        const conflictMessages = result.conflicts?.map((c: { teacherName: string; className: string }) => 
          `• ${c.teacherName} is already assigned to ${c.className}`
        ).join('\n') || 'One or more teachers have conflicts';
        
        const conflictMessage = `⚠️ TEACHER CONFLICT DETECTED!\n\n${conflictMessages}\n\n⚠️ WARNING: Cannot save. This would create a scheduling conflict.\n\nPlease resolve the conflict first:\n1. Remove the teacher from the conflicting class\n2. Choose a different teacher\n3. Change the time slot`;
        
        alert(conflictMessage);
        // Don't close modal on error so user can fix the selection
      } else {
        console.error('Failed to save teachers:', result);
        alert(result.error || 'Failed to save teachers. Please try again.');
        // Don't close modal on error so user can fix the selection
      }
    } catch (error) {
      console.error('Error saving teachers:', error);
      alert('Failed to save teachers. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedClass || !periodGroup) {
      alert('Please select a class first');
      return;
    }

    setSavingAll(true);
    setSaveSuccess(false);

    try {
      // Save all slots that have subjects assigned (allow partial saves)
      const slotsToSave = slots.filter(slot => slot.subject_id);
      
      if (slotsToSave.length === 0) {
        alert('No subjects assigned to save. Please add subjects to the timetable first.');
        setSavingAll(false);
        return;
      }

      // Get period group ID if available
      const periodGroupId = periodGroup?.id || null;

      // Calculate total possible slots (all days × all periods excluding breaks)
      const allDays = periodGroup.selected_days || [];
      const allPeriods = periodGroup.periods.filter(p => !p.is_break);
      const totalPossibleSlots = allDays.length * allPeriods.length;
      const missingSlots = totalPossibleSlots - slotsToSave.length;

      // Save each slot with period_group_id and auto-generate teacher timetables
      const savePromises = slotsToSave.map(slot =>
        fetch('/api/timetable/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            class_id: selectedClass.id,
            day: slot.day,
            period_order: slot.period_order,
            subject_id: slot.subject_id,
            teacher_ids: slot.teacher_ids || [],
            period_group_id: periodGroupId, // Sync with period group
          }),
        })
      );

      const results = await Promise.all(savePromises);
      
      // Check each result for errors and conflicts
      const errors: string[] = [];
      const conflicts: Array<{ teacher: string; class: string }> = [];
      await Promise.all(
        results.map(async (r, index) => {
          if (!r.ok) {
            const errorData = await r.json().catch(() => ({ error: 'Unknown error' }));
            const errorMsg = errorData.error || 'Failed to save';
            if (errorMsg.includes('conflict') || errorMsg.includes('already assigned')) {
              const slot = slotsToSave[index];
              conflicts.push({ 
                teacher: 'Unknown', 
                class: slot ? `${slot.day}, Period ${slot.period_order}` : `Slot ${index + 1}` 
              });
            } else {
              errors.push(`Slot ${index + 1}: ${errorMsg}`);
            }
          } else {
            // Check response for conflict warnings
            const resultData = await r.json().catch(() => ({}));
            if (resultData.conflicts && resultData.conflicts.length > 0) {
              resultData.conflicts.forEach((conflict: { teacher_name?: string; class_name: string }) => {
                conflicts.push({
                  teacher: conflict.teacher_name || 'Teacher',
                  class: conflict.class_name,
                });
              });
            }
          }
        })
      );

      // Build success message
      const className = selectedClass.class + (selectedClass.section ? `-${selectedClass.section}` : '');
      let message = `Timetable for class ${className} is saved`;
      
      if (missingSlots > 0) {
        message += `\n\nNote: ${missingSlots} period(s) are not yet assigned.`;
      }
      
      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(c => 
          `${c.teacher} is already assigned to ${c.class} at the same time`
        );
        message += `\n\n⚠️ Conflicts detected:\n${conflictMessages.join('\n')}`;
      }

      if (errors.length === 0) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 5000);
        alert(message);
        // Refresh slots to get latest data
        await fetchTimetableSlots();
      } else {
        console.error('Some slots failed to save:', errors);
        let errorMessage = `Some slots failed to save:\n${errors.join('\n')}`;
        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map(c => 
            `${c.teacher} is already assigned to ${c.class} at the same time`
          );
          errorMessage += `\n\n⚠️ Conflicts detected:\n${conflictMessages.join('\n')}`;
        }
        if (missingSlots > 0) {
          errorMessage += `\n\nNote: ${missingSlots} period(s) are not yet assigned.`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error saving timetable:', error);
      alert('Failed to save timetable. Please check your connection and try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const TimetableCell = ({ day, period }: { day: string; period: Period }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `${day}-${period.period_order}`,
    }) as { setNodeRef: (node: HTMLElement | null) => void; isOver: boolean };

    const slot = getSlot(day, period.period_order);
    const isSaving = saving === `${day}-${period.period_order}`;

    if (period.is_break) {
      return (
        <td
          ref={setNodeRef}
          className="px-4 py-6 text-center bg-[#F1F5F9] border border-[#E5E7EB]"
        >
          <div className="text-sm font-medium text-[#64748B]">
            {period.period_name}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            {period.period_start_time} - {period.period_end_time}
          </div>
        </td>
      );
    }

    return (
      <td
        ref={setNodeRef}
        className={`px-4 py-6 text-center border border-[#E5E7EB] min-w-[120px] ${
          isOver ? 'bg-[#EAF1FF] border-[#2F6FED]' : 'bg-white hover:bg-[#F1F5F9]'
        } ${isSaving ? 'opacity-50' : ''}`}
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#64748B]" />
        ) : slot?.subject ? (
          <div className="relative group">
            <div
              className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
              style={{
                backgroundColor: slot.subject.color,
              }}
            >
              {slot.subject.name}
            </div>
            {slot.teachers && slot.teachers.length > 0 && (
              <div className="mt-1 text-xs text-[#64748B]">
                {slot.teachers.length} teacher{slot.teachers.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="mt-2 flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTeachers(day, period.period_order);
                }}
                className="text-xs px-2 py-1 bg-[#2F6FED] hover:bg-[#1E3A8A] rounded text-white flex items-center justify-center gap-1 transition-colors shadow-sm"
                title="Add/Edit Teachers"
              >
                <UserPlus size={12} />
                {slot.teachers && slot.teachers.length > 0 ? 'Edit' : 'Add'} Teacher
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSlot(day, period.period_order);
                }}
                className="text-xs px-2 py-1 bg-red-500/80 hover:bg-red-600/80 rounded text-white transition-colors"
                title="Remove Subject"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#64748B]">Drop subject</div>
        )}
      </td>
    );
  };

  if (!periodGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Class Time Table</h1>
            <p className="text-[#64748B]">Create timetables for classes using period groups</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/timetable/group-wise`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Create Period Group
          </Button>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-[#64748B] mb-4">No period group found. Please create one first.</p>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/timetable/group-wise`)}>
              Create Period Group
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const days = periodGroup.selected_days || [];
  // periods kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const periods = periodGroup.periods.filter(p => !p.is_break).sort((a, b) => a.period_order - b.period_order);
  const allPeriods = periodGroup.periods.sort((a, b) => a.period_order - b.period_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Class Time Table</h1>
          <p className="text-[#64748B]">Drag and drop subjects to create class timetables</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedClass && (
            <Button
              onClick={handleDownloadTimetable}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Download Timetable
            </Button>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#0F172A] whitespace-nowrap">Period Group:</label>
            <select
              value={periodGroup?.id || ''}
              onChange={(e) => {
                const group = periodGroups.find(g => g.id === e.target.value);
                if (group) {
                  setPeriodGroup(group);
                  setSelectedClass(null); // Reset selected class when group changes
                  setSelectedClassName(''); // Reset class selection
                  setSelectedSection(''); // Reset section selection
                  setSlots([]); // Clear slots when group changes
                }
              }}
              className="px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent transition-all bg-white min-w-[200px] font-medium"
            >
              <option value="">
                {periodGroups.length === 0 ? 'No period groups' : 'Select Period Group'}
              </option>
              {periodGroups.map(g => (
                <option key={g.id} value={g.id}>{g.group_name} {g.is_active ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/timetable/group-wise`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Class and Section Selectors and Save Button */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#0F172A] whitespace-nowrap">Class:</label>
            <select
              value={selectedClassName}
              onChange={(e) => {
                setSelectedClassName(e.target.value);
                setSelectedSection(''); // Reset section when class changes
              }}
              className="px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent transition-all bg-white min-w-[150px]"
              disabled={!periodGroup || classes.length === 0}
            >
              <option value="">
                {!periodGroup 
                  ? 'Select period group first' 
                  : classes.length === 0 
                  ? 'No classes available' 
                  : 'Select Class'}
              </option>
              {Array.from(new Set(classes.map(c => c.class))).sort().map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#0F172A] whitespace-nowrap">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent transition-all bg-white min-w-[150px]"
              disabled={!periodGroup || classes.length === 0 || !selectedClassName}
            >
              <option value="">
                {!selectedClassName 
                  ? 'Select class first' 
                  : classes.filter(c => c.class === selectedClassName).length === 0
                  ? 'No sections available'
                  : 'Select Section'}
              </option>
              {Array.from(new Set(
                classes
                  .filter(c => c.class === selectedClassName)
                  .map(c => c.section)
              )).sort().map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" /> {/* Spacer */}
          
          <Button
            onClick={handleSaveTimetable}
            disabled={savingAll || !selectedClass || !periodGroup}
            className="min-w-[140px] bg-[#2F6FED] hover:bg-[#1E3A8A] text-white disabled:bg-[#E5E7EB] disabled:text-[#64748B]"
          >
            {savingAll ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={18} className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </Card>

      {periodGroup && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Subjects */}
            <Card>
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Subjects</h2>
              {subjects.length > 0 ? (
                <SortableContext items={subjects.map(s => s.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-2">
                    {subjects.map(subject => (
                      <SubjectChip
                        key={subject.id}
                        subject={subject}
                        isDragging={activeId === subject.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">
                    {selectedClass 
                      ? 'No subjects available for this class. Please create subjects first.' 
                      : 'Select a class to view subjects'}
                  </p>
                </div>
              )}
            </Card>

            {/* Timetable Grid */}
            <div className="lg:col-span-3">
              <Card>
                {selectedClass ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E5E7EB]">
                            Time
                          </th>
                          {days.map(day => (
                            <th
                              key={day}
                              className="px-4 py-3 text-center text-sm font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E5E7EB] min-w-[120px]"
                            >
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allPeriods.map(period => (
                          <tr key={period.id}>
                            <td className="px-4 py-3 text-sm font-medium text-[#0F172A] bg-[#F1F5F9] border border-[#E5E7EB]">
                              {period.period_start_time} - {period.period_end_time}
                              <div className="text-xs text-[#64748B] mt-1">
                                {period.period_name}
                              </div>
                            </td>
                            {days.map(day => (
                              <TimetableCell key={`${day}-${period.period_order}`} day={day} period={period} />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Select a class to create timetable</p>
                    <p className="text-gray-400 text-sm mt-2">Choose a class and section above to start</p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {subjects.find(s => s.id === activeId) && (
                  <SubjectChip subject={subjects.find(s => s.id === activeId)!} isDragging />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Teacher Selection Modal */}
      {teacherModalOpen && selectedSlot && (
        <TeacherSelectionModal
          isOpen={teacherModalOpen}
          onClose={() => {
            setTeacherModalOpen(false);
            setSelectedSlot(null);
          }}
          onSave={handleSaveTeachers}
          schoolCode={schoolCode}
          subjectName={getSlot(selectedSlot.day, selectedSlot.periodOrder)?.subject?.name || ''}
          subjectId={getSlot(selectedSlot.day, selectedSlot.periodOrder)?.subject_id || null}
          existingTeacherIds={getSlot(selectedSlot.day, selectedSlot.periodOrder)?.teacher_ids || []}
          day={selectedSlot.day}
          periodOrder={selectedSlot.periodOrder}
          currentClassId={selectedClass?.id || null}
        />
      )}
    </div>
  );
}

