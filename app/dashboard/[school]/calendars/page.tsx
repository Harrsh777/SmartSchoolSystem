'use client';

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { mockCalendarEvents, eventLabels } from '@/lib/demoData';
import { Calendar, ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react';

export default function CalendarsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const [currentDate, setCurrentDate] = useState(new Date(2024, 1, 1)); // February 2024
  const [selectedCalendar, setSelectedCalendar] = useState<string>('Senior Wing Calendar');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set(Object.keys(eventLabels)));

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get first day of month and days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Filter events for selected calendar and visible labels
  const filteredEvents = mockCalendarEvents.filter(event => {
    const eventCalendar = `${event.calendar} Calendar`;
    const isLabelVisible = selectedLabels.has(event.label);
    return eventCalendar === selectedCalendar && isLabelVisible;
  });

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(event => event.date === dateStr);
  };

  // Get current week events
  const currentWeekEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return eventDate >= weekStart && eventDate <= weekEnd;
  }).slice(0, 3);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleLabel = (label: string) => {
    const newSet = new Set(selectedLabels);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setSelectedLabels(newSet);
  };

  const calendars = ['Senior Wing Calendar', 'Primary Wing Calendar', 'Junior Wing Calendar'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const calendarDays = [];
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, daysInPrevMonth - i);
    calendarDays.push({ date, isCurrentMonth: false });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    calendarDays.push({ date, isCurrentMonth: true });
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    calendarDays.push({ date, isCurrentMonth: false });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Calendars</h1>
          <p className="text-gray-600">Manage events, holidays, and school activities</p>
        </div>
        <Button variant="primary">
          <Plus size={20} className="mr-2" />
          Add Event
        </Button>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Event Calendars */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-gray-600" />
              <h3 className="font-semibold text-black">Event Calendars</h3>
            </div>
            <div className="space-y-2">
              {calendars.map((cal) => (
                <button
                  key={cal}
                  onClick={() => setSelectedCalendar(cal)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCalendar === cal
                      ? 'bg-yellow-100 text-black font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {cal}
                </button>
              ))}
            </div>
          </Card>

          {/* Event Labels */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Star size={20} className="text-gray-600" />
              <h3 className="font-semibold text-black">Event Labels</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(eventLabels).map(([label, style]) => (
                <label
                  key={label}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLabels.has(label)}
                    onChange={() => toggleLabel(label)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className={`w-4 h-4 rounded ${style.color}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Current Week Events */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-gray-600" />
              <h3 className="font-semibold text-black">Current Week Events</h3>
            </div>
            <div className="space-y-4">
              {currentWeekEvents.map((event) => {
                const labelStyle = eventLabels[event.label];
                return (
                  <div key={event.id} className="border-l-4 pl-3" style={{ borderColor: labelStyle.color.replace('bg-', '') }}>
                    <h4 className="font-semibold text-black text-sm mb-1">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                    )}
                    {event.time && (
                      <p className="text-xs text-gray-500 mb-1">{event.time}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1">{event.location}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <Card>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-black">{monthName}</h2>
              <div className="flex items-center gap-2">
                {(['month', 'week', 'day', 'list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-gray-200 text-black'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Grid */}
            {viewMode === 'month' && (
              <div>
                {/* Week Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dayData, index) => {
                    const events = getEventsForDate(dayData.date);
                    const isToday = dayData.date.toDateString() === new Date().toDateString();
                    const isWeekend = dayData.date.getDay() === 0 || dayData.date.getDay() === 6;

                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] p-2 border rounded-lg ${
                          !dayData.isCurrentMonth
                            ? 'bg-gray-50 text-gray-400'
                            : isToday
                            ? 'bg-blue-50 border-blue-200'
                            : isWeekend
                            ? 'bg-pink-50'
                            : 'bg-white'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          !dayData.isCurrentMonth ? 'text-gray-400' : 'text-black'
                        }`}>
                          {dayData.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {events.slice(0, 2).map((event) => {
                            const labelStyle = eventLabels[event.label];
                            return (
                              <div
                                key={event.id}
                                className={`text-xs px-2 py-1 rounded ${labelStyle.color} ${labelStyle.text} truncate`}
                                title={event.title}
                              >
                                {event.time ? `${event.time.split('-')[0]} ${event.title}` : event.title}
                              </div>
                            );
                          })}
                          {events.length > 2 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{events.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {filteredEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event) => {
                    const labelStyle = eventLabels[event.label];
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className={`w-3 h-12 rounded ${labelStyle.color}`} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-black">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            {event.time && <span>{event.time}</span>}
                            <span>
                              {new Date(event.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {event.location && <span>{event.location}</span>}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${labelStyle.color} ${labelStyle.text}`}>
                          {event.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

