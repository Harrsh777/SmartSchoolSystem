'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ArrowLeft, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  Sparkles,
  Loader2
} from 'lucide-react';

interface CalendarEntry {
  id?: string;
  event_date?: string;
  title?: string;
  event_type?: string;
  description?: string;
  academic_year?: string;
  [key: string]: unknown;
}

export default function AcademicCalendarPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedYear]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/academic?school_code=${schoolCode}&academic_year=${selectedYear}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setCalendarEntries(result.data);
      }
    } catch (err) {
      console.error('Error fetching academic calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date): CalendarEntry[] => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarEntries.filter(entry => {
      if (!entry.event_date) return false;
      const eventDate = new Date(entry.event_date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getEventsForMonth = (month: number, year: number): CalendarEntry[] => {
    return calendarEntries.filter(entry => {
      if (!entry.event_date) return false;
      const eventDate = new Date(entry.event_date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  };

  const getDaysInMonth = (month: number, year: number): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill the first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }
    
    // Add all days of the current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  const getEventTypeColor = (type?: string): string => {
    switch (type?.toLowerCase()) {
      case 'holiday':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'exam':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'event':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'meeting':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'activity':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
  const currentMonthEvents = getEventsForMonth(selectedMonth, selectedYear);
  const isCurrentMonth = (date: Date) => date.getMonth() === selectedMonth;
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
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
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/calendar/events`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Calendar Navigation */}
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
          
          {/* Month Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>{currentMonthEvents.length} event{currentMonthEvents.length !== 1 ? 's' : ''} this month</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} />
              <span>{calendarEntries.length} total events in {selectedYear}</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#1e3a8a]" size={32} />
          </div>
        ) : (
          <div className="p-6">
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-bold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => {
                const events = getEventsForDate(date);
                const isCurrent = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                const isSelected = selectedDate && 
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
                      if (isCurrent) {
                        setSelectedDate(date);
                      }
                    }}
                    className={`
                      min-h-[100px] p-2 rounded-lg border-2 transition-all cursor-pointer
                      ${isCurrent 
                        ? 'bg-white border-gray-200 hover:border-[#1e3a8a] hover:shadow-md' 
                        : 'bg-gray-50 border-gray-100 opacity-50'
                      }
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
                      {events.slice(0, 2).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`
                            text-xs px-1.5 py-0.5 rounded border truncate
                            ${getEventTypeColor(event.event_type)}
                          `}
                          title={event.title || 'Event'}
                        >
                          {event.title || 'Event'}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{events.length - 2} more
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

      {/* Events List */}
      {currentMonthEvents.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-[#1e3a8a]" />
            Events in {months[selectedMonth]} {selectedYear}
          </h3>
          <div className="space-y-3">
            {currentMonthEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-[#1e3a8a] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-16 h-16 rounded-lg flex flex-col items-center justify-center font-bold text-white
                    ${event.event_type?.toLowerCase() === 'holiday' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      event.event_type?.toLowerCase() === 'exam' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                      event.event_type?.toLowerCase() === 'event' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                      event.event_type?.toLowerCase() === 'meeting' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      'bg-gradient-to-br from-green-500 to-green-600'
                    }
                  `}>
                    <div className="text-xs">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' }) : ''}
                    </div>
                    <div className="text-xl">
                      {event.event_date ? new Date(event.event_date).getDate() : ''}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{event.title || 'Untitled Event'}</h4>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-semibold border
                        ${getEventTypeColor(event.event_type)}
                      `}>
                        {event.event_type || 'Event'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={14} />
                        <span>{formatDate(event.event_date || '')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

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
                    <h3 className="text-2xl font-bold">Events on {formatDate(selectedDate.toISOString())}</h3>
                    <p className="text-blue-100 mt-1">
                      {getEventsForDate(selectedDate).length} event{getEventsForDate(selectedDate).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-4">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div
                        key={event.id}
                        className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200 hover:border-[#1e3a8a] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold
                            ${event.event_type?.toLowerCase() === 'holiday' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              event.event_type?.toLowerCase() === 'exam' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              event.event_type?.toLowerCase() === 'event' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                              event.event_type?.toLowerCase() === 'meeting' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                              'bg-gradient-to-br from-green-500 to-green-600'
                            }
                          `}>
                            <CalendarDays size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-bold text-gray-900">{event.title || 'Untitled Event'}</h4>
                              <span className={`
                                px-2 py-1 rounded-full text-xs font-semibold border
                                ${getEventTypeColor(event.event_type)}
                              `}>
                                {event.event_type || 'Event'}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{formatDate(event.event_date || '')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No events on this date</p>
                    <p className="text-sm text-gray-400 mt-1">Select another date to view events</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && calendarEntries.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <CalendarDays size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Academic Calendar Entries</h3>
            <p className="text-gray-600 mb-4">
              No academic calendar entries found for {selectedYear}
            </p>
            <Button
              onClick={() => router.push(`/dashboard/${schoolCode}/calendar/events`)}
              className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Sparkles size={18} className="mr-2" />
              Create Calendar Event
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
