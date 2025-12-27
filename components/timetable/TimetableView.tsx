'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Loader2, Calendar } from 'lucide-react';

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
  selected_days: string[];
  periods: Period[];
}

interface TimetableSlot {
  id: string;
  day: string;
  period_order?: number;
  period?: number;
  subject_id: string | null;
  subject?: Subject;
  teacher_id?: string | null;
  teacher_ids?: string[] | null;
  teacher?: { id: string; full_name: string; staff_id: string };
  teachers?: Array<{ id: string; full_name: string; staff_id: string }>;
}

interface TimetableViewProps {
  schoolCode: string;
  classId: string;
  className?: string;
}

export default function TimetableView({ schoolCode, classId, className }: TimetableViewProps) {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [periodGroup, setPeriodGroup] = useState<PeriodGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeriodGroup();
    fetchTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, classId]);

  const fetchPeriodGroup = async () => {
    try {
      // Find period group that has this class assigned
      const assignmentsRes = await fetch(`/api/timetable/period-groups/classes?school_code=${schoolCode}`);
      const assignmentsData = await assignmentsRes.json();
      
      if (assignmentsRes.ok && assignmentsData.data) {
        // Find assignment for this class
        interface AssignmentData {
          group_id: string;
          class?: {
            id: string;
          };
          [key: string]: unknown;
        }
        const classAssignment = assignmentsData.data.find((a: AssignmentData) => a.class?.id === classId);
        
        if (classAssignment) {
          // Fetch the period group details
          const groupRes = await fetch(`/api/timetable/period-groups/${classAssignment.group_id}?school_code=${schoolCode}`);
          const groupData = await groupRes.json();
          
          if (groupRes.ok && groupData.data) {
            setPeriodGroup(groupData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching period group:', error);
    }
  };

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/timetable/slots?school_code=${schoolCode}&class_id=${classId}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setSlots(result.data);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSlot = (day: string, periodOrder: number): TimetableSlot | undefined => {
    return slots.find((s) => s.day === day && (s.period_order === periodOrder || s.period === periodOrder));
  };

  if (loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-black mx-auto mb-4" />
            <p className="text-gray-600">Loading timetable...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!periodGroup) {
    return (
      <Card className={className}>
        <div className="text-center py-12">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">No period group assigned to this class</p>
          <p className="text-gray-500 text-sm mt-2">Please assign a period group to this class first</p>
        </div>
      </Card>
    );
  }

  if (slots.length === 0 && !loading) {
    return (
      <Card className={className}>
        <div className="text-center py-12">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">No timetable available for this class</p>
          <p className="text-gray-500 text-sm mt-2">Please contact your school administrator</p>
        </div>
      </Card>
    );
  }

  const days = periodGroup.selected_days || [];
  const allPeriods = periodGroup.periods.sort((a, b) => a.period_order - b.period_order);

  return (
    <Card className={className}>
      <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
        <Calendar size={24} />
        Class Timetable
      </h2>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gradient-to-br from-indigo-50 to-purple-50 border-r-2 border-b-2 border-indigo-300 p-3 text-left font-bold text-indigo-900 min-w-[120px] shadow-sm">
                  Time / Day
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="sticky z-10 bg-gradient-to-br from-blue-50 to-cyan-50 border-b-2 border-r border-blue-300 p-3 text-center font-bold text-blue-900 min-w-[140px] shadow-sm"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeriods.map((period) => {
                if (period.is_break) {
                  return (
                    <tr key={period.id}>
                      <td className="sticky left-0 z-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-r-2 border-b border-indigo-200 p-3 font-medium text-indigo-900 shadow-sm">
                        <div className="text-sm">{period.period_start_time} - {period.period_end_time}</div>
                        <div className="text-xs text-indigo-600 mt-1">{period.period_name}</div>
                      </td>
                      {days.map((day) => (
                        <td
                          key={`${day}-${period.period_order}`}
                          className="border-r border-b border-gray-200 p-2 bg-gray-100 text-center"
                        >
                          <span className="text-xs text-gray-600 font-medium">{period.period_name}</span>
                        </td>
                      ))}
                    </tr>
                  );
                }

                return (
                  <tr key={period.id}>
                    <td className="sticky left-0 z-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-r-2 border-b border-indigo-200 p-3 font-medium text-indigo-900 shadow-sm">
                      <div className="text-sm">{period.period_start_time} - {period.period_end_time}</div>
                      <div className="text-xs text-indigo-600 mt-1">{period.period_name}</div>
                    </td>
                    {days.map((day) => {
                      const slot = getSlot(day, period.period_order);
                      const subject = slot?.subject;

                      return (
                        <td
                          key={`${day}-${period.period_order}`}
                          className="border-r border-b border-gray-200 p-2 bg-white min-h-[90px]"
                        >
                          {subject ? (
                            <div
                              className="rounded-md p-3 shadow-md border-2 h-full flex flex-col items-center justify-center"
                              style={{
                                backgroundColor: `${subject.color}30`,
                                borderColor: `${subject.color}70`,
                                boxShadow: `0 2px 4px ${subject.color}25`,
                              }}
                            >
                              <span
                                className="font-bold text-sm leading-tight text-center"
                                style={{ color: subject.color }}
                              >
                                {subject.name}
                              </span>
                              {slot?.teacher && (
                                <span className="text-xs text-gray-600 mt-1 text-center">
                                  {slot.teacher.full_name}
                                </span>
                              )}
                              {slot?.teachers && slot.teachers.length > 0 && (
                                <span className="text-xs text-gray-600 mt-1 text-center">
                                  {slot.teachers.map((t: { full_name?: string }) => t.full_name).join(', ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-xs text-gray-400">-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

