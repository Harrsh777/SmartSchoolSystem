'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getString } from '@/lib/type-utils';

interface CalendarEntry {
  id?: string;
  date?: string;
  title?: string;
  event_type?: string;
  event_date?: string;
  description?: string;
  academic_year?: string;
  source?: string;
  [key: string]: unknown;
}

export default function AcademicCalendarPage() {
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [includeEvents, setIncludeEvents] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    let code = '';
    const storedStudent = sessionStorage.getItem('student');
    const storedSchool = sessionStorage.getItem('school');
    if (storedStudent) {
      try {
        const studentData = JSON.parse(storedStudent);
        code = getString(studentData?.school_code) || '';
      } catch {
        // ignore
      }
    }
    if (!code && storedSchool) {
      try {
        const schoolData = JSON.parse(storedSchool);
        code = getString(schoolData?.school_code) || '';
      } catch {
        // ignore
      }
    }
    if (code) {
      setSchoolCode(code);
    } else {
      // Fallback: fetch first accepted school (for staff without school in session)
      fetch('/api/schools/accepted')
        .then((res) => res.json())
        .then((result) => {
          const first = result?.data?.[0];
          if (first?.school_code) {
            setSchoolCode(first.school_code);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (schoolCode) {
      fetchCalendar();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedYear, selectedMonth]);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/calendar/academic?school_code=${schoolCode}&academic_year=${selectedYear}&include_events=${includeEvents ? 'true' : 'false'}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        // Normalize date to YYYY-MM-DD
        const formatted = (result.data as CalendarEntry[]).map((entry) => {
          const raw = getString(entry.event_date ?? entry.date);
          if (!raw) return entry;
          const d = new Date(raw);
          if (isNaN(d.getTime())) return entry;
          return { ...entry, event_date: d.toISOString().split('T')[0] };
        });
        setCalendarEntries(formatted);
      } else {
        setCalendarEntries([]);
      }
    } catch (err) {
      console.error('Error fetching academic calendar:', err);
      setCalendarEntries([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, selectedYear, includeEvents]);

  const getEntriesForDate = (date: Date): CalendarEntry[] => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarEntries.filter((entry) => {
      const ed = getString(entry.event_date ?? entry.date);
      if (!ed) return false;
      return ed.split('T')[0] === dateStr;
    });
  };

  const getEntriesForMonth = (month: number, year: number): CalendarEntry[] => {
    return calendarEntries.filter((entry) => {
      const ed = getString(entry.event_date ?? entry.date);
      if (!ed) return false;
      const d = new Date(ed);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getDaysInMonth = (month: number, year: number): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  };

  const getTypeColor = (type?: string): string => {
    switch ((type || '').toLowerCase()) {
      case 'holiday':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'exam':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'meeting':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'activity':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateStr: unknown) => {
    const dateString = getString(dateStr);
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const days = getDaysInMonth(selectedMonth, selectedYear);
  const currentMonthEntries = getEntriesForMonth(selectedMonth, selectedYear);
  const isCurrentMonth = (d: Date) => d.getMonth() === selectedMonth;
  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
                <CalendarDays className="text-white" size={24} />
              </div>
              Academic Calendar
            </h1>
            <p className="text-gray-600">View academic calendar for the year</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonth(0);
              }}
              className="px-4 py-2 border-2 border-[#1e3a8a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white font-semibold"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-[#1e3a8a] bg-white text-sm font-semibold text-[#1e3a8a]">
              <input
                type="checkbox"
                checked={includeEvents}
                onChange={(e) => setIncludeEvents(e.target.checked)}
                className="accent-[#1e3a8a]"
              />
              Show events
            </label>
            <Button
              variant="outline"
              onClick={fetchCalendar}
              className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
              disabled={loading}
            >
              <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Calendar Navigation + Grid */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold">
                {months[selectedMonth]} {selectedYear}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <Button
              onClick={handleToday}
              className="bg-white text-[#1e3a8a] hover:bg-gray-100 font-semibold"
            >
              Today
            </Button>
          </div>
          <div className="text-sm flex items-center gap-3">
            <span className="font-medium">{currentMonthEntries.length} item{currentMonthEntries.length !== 1 ? 's' : ''} this month</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]" />
          </div>
        ) : !schoolCode ? (
          <div className="text-center py-12">
            <CalendarDays className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">Select a school or log in to view the academic calendar.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => {
                const entries = getEntriesForDate(date);
                const isCurrent = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                    onClick={() => {
                      if (isCurrent) setSelectedDate(date);
                    }}
                    className={`
                      min-h-[100px] p-2 rounded-lg border-2 transition-all cursor-pointer
                      ${isCurrent ? 'bg-white border-gray-200 hover:border-[#1e3a8a] hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-50'}
                      ${isTodayDate ? 'ring-2 ring-[#1e3a8a] ring-offset-2' : ''}
                      ${isSelected ? 'border-[#1e3a8a] bg-blue-50' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-semibold mb-1
                      ${isCurrent ? 'text-gray-900' : 'text-gray-400'}
                      ${isTodayDate ? 'text-[#1e3a8a]' : ''}
                    `}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {entries.slice(0, 2).map((entry, entryIndex) => (
                        <div
                          key={entryIndex}
                          className={`
                            text-xs px-1.5 py-0.5 rounded border truncate
                            ${getTypeColor(getString(entry.event_type))}
                          `}
                          title={getString(entry.title) || 'Item'}
                        >
                          {getString(entry.title) || 'Item'}
                        </div>
                      ))}
                      {entries.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{entries.length - 2} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Selected Date Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Items on {formatDate(selectedDate.toISOString())}</h3>
                    <p className="text-blue-100 mt-1">
                      {getEntriesForDate(selectedDate).length} item{getEntriesForDate(selectedDate).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <span className="font-semibold">Close</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {getEntriesForDate(selectedDate).length > 0 ? (
                  <div className="space-y-4">
                    {getEntriesForDate(selectedDate).map((entry, i) => (
                      <div
                        key={getString(entry.id) || `${i}`}
                        className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold
                            ${getString(entry.event_type)?.toLowerCase() === 'holiday' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              getString(entry.event_type)?.toLowerCase() === 'exam' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              getString(entry.event_type)?.toLowerCase() === 'meeting' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                              getString(entry.event_type)?.toLowerCase() === 'activity' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                              'bg-gradient-to-br from-blue-500 to-blue-600'
                            }
                          `}>
                            <CalendarDays size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-bold text-gray-900">{getString(entry.title) || 'Untitled'}</h4>
                              <span className={`
                                px-2 py-1 rounded-full text-xs font-semibold border
                                ${getTypeColor(getString(entry.event_type))}
                              `}>
                                {getString(entry.event_type) || 'Item'}
                              </span>
                            </div>
                            {getString(entry.description) && (
                              <p className="text-sm text-gray-600 mb-2">{getString(entry.description)}</p>
                            )}
                            <div className="text-xs text-gray-500">
                              <span>{formatDate(getString(entry.event_date) || '')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No items on this date</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && schoolCode && calendarEntries.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <CalendarDays size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Academic Calendar Entries</h3>
            <p className="text-gray-600 mb-4">
              No academic calendar entries found for {selectedYear}
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Button
                onClick={fetchCalendar}
                variant="outline"
                className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                disabled={loading}
              >
                <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
