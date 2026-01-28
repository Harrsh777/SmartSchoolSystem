'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, UserCheck, Search, Calendar } from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
}

interface Period {
  id: string;
  period_name: string;
  period_start_time: string;
  period_end_time: string;
  period_order: number;
  is_break: boolean;
}

interface PeriodGroup {
  id: string;
  group_name: string;
  selected_days: string[];
  periods: Period[];
}

interface TimetableSlot {
  id: string;
  day: string;
  period_order: number;
  subject_id: string | null;
  subject?: {
    id: string;
    name: string;
    color: string;
  };
  class_id?: string | null;
  class?: {
    id: string;
    class: string;
    section: string;
  };
}

export default function TeacherTimetablePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Staff | null>(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [periodGroup, setPeriodGroup] = useState<PeriodGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchPeriodGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherTimetable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacher, schoolCode, periodGroup]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        // Filter to show only teaching staff
        const teachingStaff = result.data.filter(
          (s: Staff) =>
            s.role?.toLowerCase().includes('teacher') ||
            s.role?.toLowerCase().includes('principal') ||
            s.role?.toLowerCase().includes('head') ||
            s.role?.toLowerCase().includes('vice')
        );
        setTeachers(teachingStaff);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodGroups = async () => {
    try {
      const response = await fetch(`/api/timetable/period-groups?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
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

  const fetchTeacherTimetable = async () => {
    if (!selectedTeacher || !periodGroup) return;

    try {
      setLoading(true);
      
      // Fetch all class timetable slots to find which classes this teacher teaches
      // This is the primary source - teachers are assigned in class timetables
      const classResponse = await fetch(
        `/api/timetable/slots?school_code=${schoolCode}`
      );
      const classResult = await classResponse.json();

      // Also fetch teacher-specific slots (where class_id is null) as backup
      const teacherResponse = await fetch(
        `/api/timetable/slots?school_code=${schoolCode}&teacher_id=${selectedTeacher.id}`
      );
      const teacherResult = await teacherResponse.json();

      interface TimetableSlotData {
        teacher_id?: string;
        class_id?: string | null;
        day?: string;
        period_order?: number;
        period?: number;
        subject_id?: string | null;
        subject?: { id: string; name: string; color: string };
        teacher_ids?: string[] | null;
        class?: { id: string; class: string; section: string };
        class_reference?: { class_id: string; class: string; section: string; academic_year?: string };
        [key: string]: unknown;
      }

      const allSlots: TimetableSlotData[] = [];

      // Primary: Get slots from class timetables where this teacher is assigned
      if (classResponse.ok && classResult.data) {
        const classSlots = classResult.data.filter((slot: TimetableSlotData) => {
          // Check if teacher is in teacher_ids array or matches teacher_id
          const hasTeacher = slot.teacher_ids?.includes(selectedTeacher.id) || 
                           slot.teacher_id === selectedTeacher.id;
          return hasTeacher && slot.class_id && slot.subject_id;
        });

        // Map class slots to teacher timetable format
        classSlots.forEach((slot: TimetableSlotData) => {
          const periodOrder = slot.period_order || (slot.period ? parseInt(String(slot.period), 10) : undefined);
          if (periodOrder !== undefined) {
            allSlots.push({
              ...slot,
              period_order: periodOrder,
              class: slot.class || (slot.class_reference ? {
                id: slot.class_reference.class_id,
                class: slot.class_reference.class,
                section: slot.class_reference.section,
              } : undefined),
            });
          }
        });
      }

      // Secondary: Get teacher-specific slots (where class_id is null)
      if (teacherResponse.ok && teacherResult.data) {
        const teacherSlots = teacherResult.data.filter((slot: TimetableSlotData) => 
          slot.teacher_id === selectedTeacher.id && !slot.class_id
        );

        teacherSlots.forEach((slot: TimetableSlotData) => {
          const periodOrder = slot.period_order || (slot.period ? parseInt(String(slot.period), 10) : undefined);
          if (periodOrder !== undefined) {
            // Use class_reference if available
            const classInfo = slot.class || (slot.class_reference ? {
              id: slot.class_reference.class_id,
              class: slot.class_reference.class,
              section: slot.class_reference.section,
            } : undefined);
            
            allSlots.push({
              ...slot,
              period_order: periodOrder,
              class: classInfo,
            });
          }
        });
      }

      // Remove duplicates (same day + period_order)
      const uniqueSlots = allSlots.reduce((acc: TimetableSlotData[], slot: TimetableSlotData) => {
        const exists = acc.find(s => 
          s.day === slot.day && 
          s.period_order === slot.period_order
        );
        if (!exists) {
          acc.push(slot);
        }
        return acc;
      }, []);

      const slotsAsTimetable: TimetableSlot[] = uniqueSlots.map((slot, index) => ({
        id: (slot as { id?: string }).id ?? `slot-${slot.day ?? ''}-${slot.period_order ?? ''}-${index}`,
        day: slot.day ?? '',
        period_order: slot.period_order ?? 0,
        subject_id: slot.subject_id ?? null,
        subject: slot.subject,
        class_id: slot.class_id ?? null,
        class: slot.class,
      }));

      setTimetableSlots(slotsAsTimetable);
    } catch (error) {
      console.error('Error fetching teacher timetable:', error);
      setTimetableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const getSlot = (day: string, periodOrder: number): TimetableSlot | undefined => {
    return timetableSlots.find(s => s.day === day && s.period_order === periodOrder);
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.staff_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!periodGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Teacher Time Table</h1>
            <p className="text-gray-600">View teacher timetables</p>
          </div>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No period group found. Please create one first.</p>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/timetable/group-wise`)}>
              Create Period Group
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const days = periodGroup.selected_days || [];
  const allPeriods = periodGroup.periods.sort((a, b) => a.period_order - b.period_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <UserCheck size={32} />
            Teacher Time Table
          </h1>
          <p className="text-gray-600">View timetables for individual teachers</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/timetable/class`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Teacher Selector */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {filteredTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacher(teacher)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedTeacher?.id === teacher.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{teacher.full_name}</p>
                  <p className="text-sm text-gray-600">{teacher.staff_id} • {teacher.role}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Teacher Timetable */}
      {selectedTeacher && (
        <Card>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">
              {selectedTeacher.full_name}&apos;s Timetable
            </h2>
            <p className="text-gray-600">
              {selectedTeacher.staff_id} • {selectedTeacher.role} • {selectedTeacher.department}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200">
                      Time
                    </th>
                    {days.map(day => (
                      <th
                        key={day}
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 min-w-[150px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPeriods.map(period => (
                    <tr key={period.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200">
                        {period.period_start_time} - {period.period_end_time}
                        <div className="text-xs text-gray-500 mt-1">
                          {period.period_name}
                        </div>
                      </td>
                      {days.map(day => {
                        const slot = getSlot(day, period.period_order);
                        return (
                          <td
                            key={`${day}-${period.period_order}`}
                            className="px-4 py-6 text-center border border-gray-200 min-w-[150px]"
                          >
                            {period.is_break ? (
                              <div className="text-sm font-medium text-gray-600">
                                {period.period_name}
                              </div>
                            ) : slot?.subject ? (
                              <div className="space-y-2">
                                <div
                                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
                                  style={{
                                    backgroundColor: slot.subject.color,
                                  }}
                                >
                                  {slot.subject.name}
                                </div>
                                {slot.class && (
                                  <div className="text-xs text-gray-600">
                                    {slot.class.class}-{slot.class.section}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">Free</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!selectedTeacher && (
        <Card>
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 mb-2">Select a teacher to view their timetable</p>
            <p className="text-sm text-gray-500">
              Teacher timetables are automatically generated when you assign teachers to subjects in class timetables.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
