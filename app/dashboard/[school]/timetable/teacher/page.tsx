'use client';

import { use, useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  UserCheck,
  Search,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  GraduationCap,
  Users,
} from 'lucide-react';

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

function isTeachingRole(role: string | undefined | null): boolean {
  const r = (role || '').toLowerCase();
  return (
    /\bteacher\b/.test(r) ||
    r.includes('lecturer') ||
    r.includes('tutor') ||
    r.includes('faculty') ||
    r.includes('professor') ||
    r.includes('instructor')
  );
}

function formatTimeShort(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return t;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
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
  const [staffLoading, setStaffLoading] = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffScope, setStaffScope] = useState<'teaching' | 'all'>('teaching');
  const listRef = useRef<HTMLDivElement>(null);

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
      setStaffLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTeachers(result.data);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setStaffLoading(false);
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
      setTimetableLoading(true);

      const classResponse = await fetch(`/api/timetable/slots?school_code=${schoolCode}`);
      const classResult = await classResponse.json();

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

      if (classResponse.ok && classResult.data) {
        const classSlots = classResult.data.filter((slot: TimetableSlotData) => {
          const hasTeacher =
            slot.teacher_ids?.includes(selectedTeacher.id) || slot.teacher_id === selectedTeacher.id;
          return hasTeacher && slot.class_id && slot.subject_id;
        });

        classSlots.forEach((slot: TimetableSlotData) => {
          const periodOrder = slot.period_order || (slot.period ? parseInt(String(slot.period), 10) : undefined);
          if (periodOrder !== undefined) {
            allSlots.push({
              ...slot,
              period_order: periodOrder,
              class:
                slot.class ||
                (slot.class_reference
                  ? {
                      id: slot.class_reference.class_id,
                      class: slot.class_reference.class,
                      section: slot.class_reference.section,
                    }
                  : undefined),
            });
          }
        });
      }

      if (teacherResponse.ok && teacherResult.data) {
        const teacherSlots = teacherResult.data.filter(
          (slot: TimetableSlotData) => slot.teacher_id === selectedTeacher.id && !slot.class_id
        );

        teacherSlots.forEach((slot: TimetableSlotData) => {
          const periodOrder = slot.period_order || (slot.period ? parseInt(String(slot.period), 10) : undefined);
          if (periodOrder !== undefined) {
            const classInfo =
              slot.class ||
              (slot.class_reference
                ? {
                    id: slot.class_reference.class_id,
                    class: slot.class_reference.class,
                    section: slot.class_reference.section,
                  }
                : undefined);

            allSlots.push({
              ...slot,
              period_order: periodOrder,
              class: classInfo,
            });
          }
        });
      }

      const uniqueSlots = allSlots.reduce((acc: TimetableSlotData[], slot: TimetableSlotData) => {
        const exists = acc.find((s) => s.day === slot.day && s.period_order === slot.period_order);
        if (!exists) acc.push(slot);
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
      setTimetableLoading(false);
    }
  };

  const getSlot = useCallback(
    (day: string, periodOrder: number): TimetableSlot | undefined =>
      timetableSlots.find((s) => s.day === day && s.period_order === periodOrder),
    [timetableSlots]
  );

  const scopedTeachers = useMemo(() => {
    if (staffScope === 'all') return teachers;
    return teachers.filter((t) => isTeachingRole(t.role));
  }, [teachers, staffScope]);

  const filteredTeachers = useMemo(
    () =>
      scopedTeachers.filter(
        (teacher) =>
          teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.staff_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.role?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [scopedTeachers, searchQuery]
  );

  const teachingCount = useMemo(() => teachers.filter((t) => isTeachingRole(t.role)).length, [teachers]);

  const days = periodGroup?.selected_days || [];
  const allPeriods = useMemo(
    () => (periodGroup?.periods ? [...periodGroup.periods].sort((a, b) => a.period_order - b.period_order) : []),
    [periodGroup]
  );

  const cellLabel = useCallback(
    (day: string, period: Period): string => {
      if (period.is_break) return period.period_name || 'Break';
      const slot = getSlot(day, period.period_order);
      if (!slot?.subject) return 'Free';
      const cls = slot.class ? `${slot.class.class}-${slot.class.section}` : '';
      return cls ? `${slot.subject.name} (${cls})` : slot.subject.name;
    },
    [getSlot]
  );

  const downloadCsv = useCallback(() => {
    if (!selectedTeacher || !periodGroup || days.length === 0) return;

    const header = ['Time', 'Period', ...days.map((d) => d)].map(escapeCsvCell).join(',');
    const rows = allPeriods.map((period) => {
      const time = `${formatTimeShort(period.period_start_time)}-${formatTimeShort(period.period_end_time)}`;
      const periodLabel = period.period_name || `P${period.period_order}`;
      const cells = days.map((day) => cellLabel(day, period));
      return [time, periodLabel, ...cells].map(escapeCsvCell).join(',');
    });

    const meta = [
      `School,${escapeCsvCell(schoolCode)}`,
      `Teacher,${escapeCsvCell(selectedTeacher.full_name)}`,
      `Staff ID,${escapeCsvCell(selectedTeacher.staff_id)}`,
      `Role,${escapeCsvCell(selectedTeacher.role || '')}`,
      '',
    ].join('\n');

    const bom = '\uFEFF';
    const csv = bom + meta + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (selectedTeacher.staff_id || 'teacher').replace(/[^\w-]+/g, '_');
    a.download = `timetable_${safeName}_${schoolCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedTeacher, periodGroup, days, allPeriods, cellLabel, schoolCode]);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredTeachers.length > 0) {
      setSelectedTeacher(filteredTeachers[0]);
      listRef.current?.querySelector<HTMLElement>('[data-teacher-row]')?.focus();
    }
  };

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

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Header — hidden when printing */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2.5">
            <UserCheck size={28} className="text-[#2F6FED] shrink-0" />
            Teacher timetable
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Pick a staff member, then view or download their weekly grid.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/${schoolCode}/timetable/class`)}
          className="shrink-0 self-start"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          Back to class timetable
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-start">
        {/* Teacher picker sidebar */}
        <aside className="w-full lg:w-[min(100%,320px)] shrink-0 print:hidden">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Staff list</p>
              <div className="flex rounded-lg bg-white p-0.5 border border-slate-200 mb-3">
                <button
                  type="button"
                  onClick={() => setStaffScope('teaching')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    staffScope === 'teaching'
                      ? 'bg-[#2F6FED] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap size={14} />
                  Teaching ({teachingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffScope('all')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    staffScope === 'all'
                      ? 'bg-[#2F6FED] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users size={14} />
                  All ({teachers.length})
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search by name, ID, role…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  className="pl-10 h-10 text-sm"
                  aria-label="Search staff"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {filteredTeachers.length} match{filteredTeachers.length !== 1 ? 'es' : ''}
                {staffScope === 'teaching' && teachingCount === 0 ? ' · No roles matched “teaching” — try All.' : ''}
              </p>
            </div>
            <div
              ref={listRef}
              className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain"
              role="listbox"
              aria-label="Staff members"
            >
              {staffLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 border-2 border-slate-200 border-t-[#2F6FED] rounded-full animate-spin" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-10 px-4">No staff match this filter.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredTeachers.map((teacher) => {
                    const active = selectedTeacher?.id === teacher.id;
                    return (
                      <li key={teacher.id}>
                        <button
                          type="button"
                          data-teacher-row
                          onClick={() => setSelectedTeacher(teacher)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            active
                              ? 'bg-orange-50 border-l-[3px] border-l-orange-500'
                              : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 text-sm truncate">{teacher.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {teacher.staff_id}
                              {teacher.role ? ` · ${teacher.role}` : ''}
                            </p>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`shrink-0 ${active ? 'text-orange-500' : 'text-slate-300'}`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </aside>

        {/* Main timetable */}
        <div className="flex-1 min-w-0">
          {!selectedTeacher ? (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 print:hidden">
              <div className="text-center py-14 px-4">
                <Calendar className="mx-auto mb-3 text-slate-300" size={44} />
                <p className="text-slate-700 font-medium mb-1">Select someone from the list</p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Teaching staff are shown first. Use <strong>All</strong> for guards, drivers, and others. Timetables
                  come from class subject assignments.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden border-slate-200 shadow-sm print:shadow-none print:border print:border-slate-300">
              {/* Print title — only visible in print */}
              <div className="hidden print:block print:mb-3 print:border-b print:pb-2">
                <p className="text-lg font-bold text-black">Teacher timetable</p>
                <p className="text-sm text-slate-700">
                  {selectedTeacher.full_name} · {selectedTeacher.staff_id} · {selectedTeacher.role || 'Staff'}
                </p>
                <p className="text-xs text-slate-500">School: {schoolCode}</p>
              </div>

              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {selectedTeacher.full_name}
                  </h2>
                  <p className="text-sm text-slate-600 truncate">
                    {selectedTeacher.staff_id}
                    {selectedTeacher.role ? ` · ${selectedTeacher.role}` : ''}
                    {selectedTeacher.department ? ` · ${selectedTeacher.department}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCsv}
                    disabled={timetableLoading || days.length === 0}
                    className="border-slate-300 text-slate-700"
                  >
                    <Download size={15} className="mr-1.5" />
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    disabled={timetableLoading || days.length === 0}
                    className="border-slate-300 text-slate-700"
                  >
                    <Printer size={15} className="mr-1.5" />
                    Print / PDF
                  </Button>
                </div>
              </div>

              <div className="p-2 sm:p-4">
                {timetableLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-10 w-10 border-2 border-slate-200 border-t-[#2F6FED] rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 -mx-1 sm:mx-0 print:overflow-visible print:border-0">
                    <table className="w-full border-collapse text-sm min-w-[640px]">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-20 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border border-slate-200 print:static print:bg-white">
                            Time
                          </th>
                          {days.map((day) => (
                            <th
                              key={day}
                              className="px-2 py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 min-w-[120px]"
                            >
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allPeriods.map((period) => (
                          <tr key={period.id}>
                            <td className="sticky left-0 z-10 px-3 py-2 text-left bg-slate-50/95 border border-slate-200 align-top print:static print:bg-white">
                              <span className="font-medium text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                                {formatTimeShort(period.period_start_time)}–{formatTimeShort(period.period_end_time)}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-0.5">{period.period_name}</div>
                            </td>
                            {days.map((day) => {
                              const slot = getSlot(day, period.period_order);
                              return (
                                <td
                                  key={`${day}-${period.period_order}`}
                                  className="px-2 py-2 border border-slate-200 align-middle text-center"
                                >
                                  {period.is_break ? (
                                    <span className="text-xs font-medium text-slate-500">{period.period_name}</span>
                                  ) : slot?.subject ? (
                                    <div className="space-y-1">
                                      <div
                                        className="px-2 py-1.5 rounded-md text-xs font-semibold text-white leading-tight"
                                        style={{ backgroundColor: slot.subject.color || '#64748b' }}
                                      >
                                        {slot.subject.name}
                                      </div>
                                      {slot.class && (
                                        <div className="text-[11px] text-slate-600 font-medium">
                                          {slot.class.class}-{slot.class.section}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Free</span>
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
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
