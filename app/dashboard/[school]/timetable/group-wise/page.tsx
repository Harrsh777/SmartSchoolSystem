'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Clock, Plus, Trash2, ArrowRight, ArrowLeft, Check, Edit, List } from 'lucide-react';

interface Period {
  id: string;
  periodName: string;
  duration: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakName?: string;
}

interface SelectedClass {
  classId: string;
  className: string;
  section: string;
}

export default function GroupWiseTimetablePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Step 1: Period Details
  const [groupName, setGroupName] = useState(new Date().getFullYear().toString());
  const [isActive, setIsActive] = useState(true);
  const [classStartTime, setClassStartTime] = useState('08:30');
  const [numberOfPeriods, setNumberOfPeriods] = useState(3);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [breakAfterPeriod, setBreakAfterPeriod] = useState<number | null>(null);
  const [breakDuration, setBreakDuration] = useState(10);
  const [breakName, setBreakName] = useState('Break');
  
  // Step 2: Class Selection
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string; academic_year: string }>>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  // Step 3: Upload/Review
  const [groupId, setGroupId] = useState<string | null>(null);

  // List vs form view: when opening page show all period groups; Add new / Edit open the form
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [periodGroupsList, setPeriodGroupsList] = useState<Array<{
    id: string;
    group_name: string;
    is_active?: boolean;
    class_start_time?: string;
    number_of_periods?: number;
    selected_days?: string[];
    periods?: unknown[];
  }>>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchPeriodGroupsList = async () => {
    try {
      setListLoading(true);
      const res = await fetch(`/api/timetable/period-groups?school_code=${schoolCode}`);
      const data = await res.json();
      if (res.ok && data.data) setPeriodGroupsList(data.data);
      else setPeriodGroupsList([]);
    } catch (err) {
      console.error('Error fetching period groups:', err);
      setPeriodGroupsList([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') fetchPeriodGroupsList();
  }, [schoolCode, viewMode]);

  // Load group data when opening form in edit mode
  useEffect(() => {
    if (viewMode !== 'form' || !editingGroupId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [groupRes, classesRes] = await Promise.all([
          fetch(`/api/timetable/period-groups/${editingGroupId}?school_code=${schoolCode}`),
          fetch(`/api/timetable/period-groups/classes?school_code=${schoolCode}&group_id=${editingGroupId}`),
        ]);
        const groupData = await groupRes.json();
        const classesData = await classesRes.json();
        if (cancelled) return;
        if (groupRes.ok && groupData.data) {
          const g = groupData.data;
          setGroupId(g.id);
          setGroupName(g.group_name || '');
          setIsActive(g.is_active !== false);
          setClassStartTime(g.class_start_time || '08:30');
          setNumberOfPeriods(g.number_of_periods || 3);
          setTimezone(g.timezone || 'Asia/Kolkata');
          setSelectedDays(Array.isArray(g.selected_days) ? g.selected_days : allDays);
          const rawPeriods = g.periods || [];
          let breakAfter: number | null = null;
          let breakDur = 10;
          let breakNm = 'Break';
          let periodCount = 0;
          const mappedPeriods: Period[] = rawPeriods.map((p: { period_name?: string; period_duration_minutes?: number; period_start_time?: string; period_end_time?: string; is_break?: boolean; break_name?: string }, i: number) => {
            if (p.is_break) {
              breakAfter = periodCount;
              breakDur = p.period_duration_minutes || 10;
              breakNm = p.break_name || 'Break';
            } else {
              periodCount += 1;
            }
            return {
              id: `period-${(p as { id?: string }).id || p.period_start_time || i}`,
              periodName: p.period_name || `Period ${i + 1}`,
              duration: p.period_duration_minutes || 45,
              startTime: p.period_start_time || '',
              endTime: p.period_end_time || '',
              isBreak: p.is_break || false,
              breakName: p.break_name,
            };
          });
          setBreakAfterPeriod(breakAfter);
          setBreakDuration(breakDur);
          setBreakName(breakNm);
          const finalPeriods = mappedPeriods.length ? mappedPeriods : [{ id: 'period-1', periodName: 'Period 1', duration: 45, startTime: '08:30 AM', endTime: '09:15 AM', isBreak: false }];
          setPeriods(finalPeriods);
          setNumberOfPeriods(finalPeriods.filter(p => !p.isBreak).length);
        }
        if (classesRes.ok && classesData.data && Array.isArray(classesData.data)) {
          const assigned: SelectedClass[] = classesData.data
            .map((a: { class?: { id: string; class: string; section: string } }) => a.class)
            .filter(Boolean)
            .map((c: { id: string; class: string; section: string }) => ({ classId: c.id, className: c.class, section: c.section }));
          setSelectedClasses(assigned);
        }
      } catch (err) {
        console.error('Error loading group for edit:', err);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, editingGroupId, schoolCode]);

  useEffect(() => {
    fetchClasses();
    if (currentStep === 1 && !editingGroupId) {
      calculatePeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, currentStep, classStartTime, numberOfPeriods, breakAfterPeriod, breakDuration]);

  useEffect(() => {
    if (currentStep === 1 && !editingGroupId) {
      calculatePeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStartTime, numberOfPeriods, breakAfterPeriod, breakDuration, breakName]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const calculatePeriods = () => {
    const newPeriods: Period[] = [];
    const [startHour, startMinute] = classStartTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    for (let i = 1; i <= numberOfPeriods; i++) {
      const periodStart = new Date(currentTime);
      const periodEnd = new Date(currentTime);
      
      // Default period duration (45 minutes)
      const periodDuration = 45;
      periodEnd.setMinutes(periodEnd.getMinutes() + periodDuration);

      const period: Period = {
        id: `period-${i}`,
        periodName: `Period ${i}`,
        duration: periodDuration,
        startTime: formatTime(periodStart),
        endTime: formatTime(periodEnd),
        isBreak: false,
      };

      newPeriods.push(period);
      currentTime = new Date(periodEnd);

      // Add break after specified period
      if (breakAfterPeriod === i) {
        const breakStart = new Date(currentTime);
        const breakEnd = new Date(currentTime);
        breakEnd.setMinutes(breakEnd.getMinutes() + breakDuration);

        const breakPeriod: Period = {
          id: `break-${i}`,
          periodName: breakName,
          duration: breakDuration,
          startTime: formatTime(breakStart),
          endTime: formatTime(breakEnd),
          isBreak: true,
          breakName: breakName,
        };

        newPeriods.push(breakPeriod);
        currentTime = new Date(breakEnd);
      }
    }

    setPeriods(newPeriods);
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const [time, ampm] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (ampm === 'PM' && hours !== 12) hour24 += 12;
    if (ampm === 'AM' && hours === 12) hour24 = 0;
    
    const date = new Date();
    date.setHours(hour24, minutes, 0, 0);
    return date;
  };

  const updatePeriodDuration = (periodId: string, duration: number) => {
    setPeriods(prev => {
      const updated = prev.map(p => {
        if (p.id === periodId) {
          const startDate = parseTimeToDate(p.startTime);
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + duration);
          
          return {
            ...p,
            duration,
            endTime: formatTime(endDate),
          };
        }
        // Update subsequent periods
        if (prev.findIndex(per => per.id === periodId) < prev.findIndex(per => per.id === p.id)) {
          const prevPeriod = prev[prev.findIndex(per => per.id === periodId)];
          if (prevPeriod) {
            const newStart = parseTimeToDate(prevPeriod.startTime);
            newStart.setMinutes(newStart.getMinutes() + duration);
            const newEnd = new Date(newStart);
            newEnd.setMinutes(newEnd.getMinutes() + (p.isBreak ? breakDuration : 45));
            return {
              ...p,
              startTime: formatTime(newStart),
              endTime: formatTime(newEnd),
            };
          }
        }
        return p;
      });
      
      // Recalculate all periods sequentially
      return recalculatePeriods(updated);
    });
  };

  const recalculatePeriods = (periods: Period[]): Period[] => {
    const [startHour, startMinute] = classStartTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    return periods.map(period => {
      const start = new Date(currentTime);
      const end = new Date(currentTime);
      end.setMinutes(end.getMinutes() + period.duration);

      currentTime = new Date(end);

      return {
        ...period,
        startTime: formatTime(start),
        endTime: formatTime(end),
      };
    });
  };

  const updatePeriodName = (periodId: string, name: string) => {
    setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, periodName: name } : p));
  };

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const lastEnd = parseTimeToDate(lastPeriod.endTime);
    const newStart = new Date(lastEnd);
    const newEnd = new Date(newStart);
    newEnd.setMinutes(newEnd.getMinutes() + 45);

    const newPeriod: Period = {
      id: `period-${Date.now()}`,
      periodName: `Period ${periods.filter(p => !p.isBreak).length + 1}`,
      duration: 45,
      startTime: formatTime(newStart),
      endTime: formatTime(newEnd),
      isBreak: false,
    };

    setPeriods([...periods, newPeriod]);
    setNumberOfPeriods(prev => prev + 1);
  };

  const removePeriod = (periodId: string) => {
    setPeriods(prev => {
      const filtered = prev.filter(p => p.id !== periodId);
      const nonBreakCount = filtered.filter(p => !p.isBreak).length;
      setNumberOfPeriods(nonBreakCount);
      return recalculatePeriods(filtered);
    });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddClass = () => {
    if (!selectedClassId) return;
    
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;
    if (selectedClasses.some(sc => sc.className === selectedClass.class && sc.section === selectedClass.section)) {
      alert('This class is already added');
      return;
    }

    setSelectedClasses(prev => [...prev, {
      classId: selectedClass.id,
      className: selectedClass.class,
      section: selectedClass.section,
    }]);

    setSelectedClassId('');
    setSelectedSection('');
  };

  const handleToggleClass = (cls: { id: string; class: string; section: string }) => {
    const isSelected = selectedClasses.some(sc => sc.classId === cls.id);
    if (isSelected) {
      setSelectedClasses(prev => prev.filter(sc => sc.classId !== cls.id));
    } else {
      setSelectedClasses(prev => [...prev, {
        classId: cls.id,
        className: cls.class,
        section: cls.section,
      }]);
    }
  };

  const handleRemoveClass = (classId: string) => {
    setSelectedClasses(prev => prev.filter(sc => sc.classId !== classId));
  };

  const handleStep1Next = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    if (periods.length === 0) {
      alert('Please add at least one period');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    setLoading(true);
    try {
      if (editingGroupId) {
        const response = await fetch(`/api/timetable/period-groups/${editingGroupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            group_name: groupName,
            is_active: isActive,
            class_start_time: classStartTime,
            number_of_periods: periods.filter(p => !p.isBreak).length,
            timezone: timezone,
            selected_days: selectedDays,
            periods: periods,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          setCurrentStep(2);
        } else {
          alert(result.error || 'Failed to update period details');
        }
      } else {
        const response = await fetch('/api/timetable/period-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            group_name: groupName,
            is_active: isActive,
            class_start_time: classStartTime,
            number_of_periods: periods.filter(p => !p.isBreak).length,
            timezone: timezone,
            selected_days: selectedDays,
            periods: periods,
          }),
        });
        const result = await response.json();
        if (response.ok && result.data) {
          setGroupId(result.data.group_id);
          setCurrentStep(2);
        } else {
          alert(result.error || 'Failed to save period details');
        }
      }
    } catch (error) {
      console.error('Error saving period details:', error);
      alert('Failed to save period details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = async () => {
    if (selectedClasses.length === 0) {
      alert('Please select at least one class');
      return;
    }
    if (!groupId) {
      alert('Group ID not found. Please go back and complete step 1.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/timetable/period-groups/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          group_id: groupId,
          class_ids: selectedClasses.map(sc => sc.classId),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setCurrentStep(3);
      } else {
        alert(result.error || 'Failed to assign classes');
      }
    } catch (error) {
      console.error('Error assigning classes:', error);
      alert('Failed to assign classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!groupId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/timetable/period-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(editingGroupId ? 'Period group updated successfully!' : 'Group-wise timetable created successfully!');
        setViewMode('list');
        setEditingGroupId(null);
        setGroupId(null);
        setCurrentStep(1);
        resetFormState();
      } else {
        alert(result.error || 'Failed to complete timetable');
      }
    } catch (error) {
      console.error('Error completing timetable:', error);
      alert('Failed to complete timetable. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetFormState = () => {
    setGroupName(new Date().getFullYear().toString());
    setIsActive(true);
    setClassStartTime('08:30');
    setNumberOfPeriods(3);
    setTimezone('Asia/Kolkata');
    setSelectedDays([...allDays]);
    setPeriods([]);
    setBreakAfterPeriod(null);
    setBreakDuration(10);
    setBreakName('Break');
    setSelectedClasses([]);
    setSelectedClassId('');
    setSelectedSection('');
    setGroupId(null);
    setCurrentStep(1);
  };

  const handleAddNew = () => {
    setEditingGroupId(null);
    resetFormState();
    setGroupId(null);
    setViewMode('form');
  };

  const handleEdit = (id: string) => {
    setEditingGroupId(id);
    setCurrentStep(1);
    setViewMode('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this period group? This will remove all periods and class assignments for this group.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/timetable/period-groups/${id}?school_code=${schoolCode}`, { method: 'DELETE' });
      if (res.ok) {
        setPeriodGroupsList(prev => prev.filter(g => g.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete period group');
      }
    } catch (err) {
      console.error('Error deleting period group:', err);
      alert('Failed to delete period group.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setViewMode('list');
    setEditingGroupId(null);
    setCurrentStep(1);
    resetFormState();
  };

  const uniqueSections = selectedClassId
    ? Array.from(new Set(classes.filter(c => c.id === selectedClassId).map(c => c.section)))
    : [];

  // List view: all period groups with Edit / Delete
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Group Wise Timetable</h1>
            <p className="text-gray-600">Set up period durations and assign to classes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddNew}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add new
            </Button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/timetable/class`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Back"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <List size={20} />
            Period groups
          </h2>
          {listLoading ? (
            <div className="py-12 text-center text-gray-500">Loading period groups...</div>
          ) : periodGroupsList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600 mb-4">No period groups yet.</p>
              <Button onClick={handleAddNew} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus size={18} className="mr-2" />
                Add new period group
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Group name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Start time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Periods</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periodGroupsList.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{g.group_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${g.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {g.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{g.class_start_time || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{g.number_of_periods ?? (g.periods?.length ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{Array.isArray(g.selected_days) ? g.selected_days.join(', ') : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(g.id)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(g.id)}
                            disabled={deletingId === g.id}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {deletingId === g.id ? 'Deleting...' : <><Trash2 size={16} className="mr-1" /> Delete</>}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Form view: Create or Edit (same 3-step structure)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">
            {editingGroupId ? 'Edit' : 'Create'} Group Wise Timetable
          </h1>
          <p className="text-gray-600">Set up period durations and assign to classes</p>
        </div>
        <button
          onClick={handleCancelForm}
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="Cancel"
        >
          <X size={24} />
        </button>
      </div>

      {/* Progress Steps */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`font-medium ${currentStep >= 1 ? 'text-orange-600' : 'text-gray-500'}`}>
                Select Period Details
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full ${currentStep >= 2 ? 'bg-orange-500' : ''}`} style={{ width: currentStep >= 2 ? '100%' : '0%' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`font-medium ${currentStep >= 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                Select Class & Section
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full ${currentStep >= 3 ? 'bg-orange-500' : ''}`} style={{ width: currentStep >= 3 ? '100%' : '0%' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className={`font-medium ${currentStep >= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
                Upload Timetable
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 1: Period Details */}
      {currentStep === 1 && (
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Please enter the details below</h2>
          
          <div className="space-y-6">
            {/* General Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    placeholder="e.g., 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isActive}
                        onChange={() => setIsActive(true)}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isActive}
                        onChange={() => setIsActive(false)}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class start time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="time"
                      value={classStartTime}
                      onChange={(e) => setClassStartTime(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of periods <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={numberOfPeriods}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      setNumberOfPeriods(Math.max(1, Math.min(20, num)));
                    }}
                    required
                    min="1"
                    max="20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    India timezone <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select days <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] max-h-[150px] overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {allDays.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                          {selectedDays.includes(day) && (
                            <X size={14} className="inline-block ml-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Break Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Break Configuration</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Break after period
                  </label>
                  <select
                    value={breakAfterPeriod || ''}
                    onChange={(e) => setBreakAfterPeriod(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">No break</option>
                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>After Period {num}</option>
                    ))}
                  </select>
                </div>

                {breakAfterPeriod && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Break Duration (minutes)
                      </label>
                      <Input
                        type="number"
                        value={breakDuration}
                        onChange={(e) => setBreakDuration(parseInt(e.target.value) || 10)}
                        min="5"
                        max="60"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Break Name
                      </label>
                      <Input
                        type="text"
                        value={breakName}
                        onChange={(e) => setBreakName(e.target.value)}
                        placeholder="e.g., Break, Lunch"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Period Duration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Period Duration (* in minutes)
              </h3>
              <div className="space-y-4">
                {periods.map((period) => (
                  <div key={period.id} className="grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg">
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Enter Period Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={period.periodName}
                        onChange={(e) => updatePeriodName(period.id, e.target.value)}
                        required
                        disabled={period.isBreak}
                        className={period.isBreak ? 'bg-gray-100' : ''}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Period Duration <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <Input
                          type="number"
                          value={period.duration}
                          onChange={(e) => updatePeriodDuration(period.id, parseInt(e.target.value) || 45)}
                          required
                          min="5"
                          max="120"
                          className="pl-10"
                          disabled={period.isBreak}
                        />
                      </div>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Period Timings
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <Input
                          type="text"
                          value={`${period.startTime} - ${period.endTime}`}
                          disabled
                          className="pl-10 bg-gray-50"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {!period.isBreak && (
                        <button
                          onClick={() => removePeriod(period.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove period"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addPeriod}
                className="mt-4"
              >
                <Plus size={18} className="mr-2" />
                ADD MORE
              </Button>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <Button
              onClick={handleStep1Next}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Saving...' : (
                <>
                  NEXT <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Select Class & Section */}
      {currentStep === 2 && (
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Please enter the details below</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSection('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select Class</option>
                  {Array.from(new Set(classes.map(c => c.class))).map(cls => (
                    <option key={cls} value={classes.find(c => c.class === cls)?.id || ''}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  disabled={!selectedClassId}
                >
                  <option value="">Select Section</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleAddClass}
                disabled={!selectedClassId || !selectedSection}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus size={18} className="mr-2" />
                ADD
              </Button>
            </div>

            {/* All Classes & Sections - click to add/remove */}
            {classes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">All Classes & Sections — click to add or remove</h3>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-[280px] overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls) => {
                      const isSelected = selectedClasses.some(sc => sc.classId === cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                          }`}
                        >
                          Class {cls.class} - Section {cls.section}
                          {isSelected && ' ✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Classes */}
            {selectedClasses.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Classes:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedClasses.map(sc => (
                    <div
                      key={sc.classId}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        Class {sc.className} - Section {sc.section}
                      </span>
                      <button
                        onClick={() => handleRemoveClass(sc.classId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
            >
              <ArrowLeft size={18} className="mr-2" />
              GO BACK
            </Button>
            <Button
              onClick={handleStep2Next}
              disabled={loading || selectedClasses.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Saving...' : (
                <>
                  SAVE AND NEXT <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Upload/Review */}
      {currentStep === 3 && (
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Review and Complete</h2>
          
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Check size={20} />
                <span className="font-semibold">Period details saved successfully!</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Group Name:</span>
                  <p className="font-medium">{groupName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <p className="font-medium">{isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Start Time:</span>
                  <p className="font-medium">{classStartTime}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Number of Periods:</span>
                  <p className="font-medium">{periods.filter(p => !p.isBreak).length}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Selected Days:</span>
                  <p className="font-medium">{selectedDays.join(', ')}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Assigned Classes:</span>
                  <p className="font-medium">{selectedClasses.length} class(es)</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Classes</h3>
              <div className="space-y-2">
                {selectedClasses.map(sc => (
                  <div key={sc.classId} className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Class {sc.className} - Section {sc.section}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
            >
              <ArrowLeft size={18} className="mr-2" />
              GO BACK
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? 'Saving...' : 'Complete Timetable'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

