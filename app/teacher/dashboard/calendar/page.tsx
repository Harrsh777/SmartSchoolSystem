'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { CalendarDays } from 'lucide-react';
import { getString } from '@/lib/type-utils';

interface CalendarEntry {
  date?: string;
  title?: string;
  event_type?: string;
  [key: string]: unknown;
}

export default function CalendarPage() {
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  // schoolCode kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setSchoolCode(teacherData.school_code);
      fetchCalendar(teacherData.school_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const fetchCalendar = async (code: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/academic?school_code=${code}&academic_year=${selectedYear}`);
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

  const formatDate = (dateStr: unknown) => {
    const dateString = getString(dateStr);
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Academic Calendar</h1>
            <p className="text-gray-600">View important dates and events</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        ) : calendarEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calendarEntries.map((entry, index) => {
                  const entryId = getString(entry.id);
                  const key = entryId || `entry-${index}`;
                  const eventDate = entry.event_date;
                  const title = getString(entry.title);
                  const eventType = getString(entry.event_type);
                  const description = getString(entry.description);
                  
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(eventDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{title || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{eventType || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{description.length > 0 ? description : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarDays className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No calendar entries found for {selectedYear}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

