'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, CalendarDays } from 'lucide-react';

export default function AcademicCalendarPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  interface CalendarEntry {
    id?: string;
    date?: string;
    event?: string;
    type?: string;
    [key: string]: unknown;
  }
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <CalendarDays size={32} />
            Academic Calendar
          </h1>
          <p className="text-gray-600">View academic calendar for the year</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/calendar/events`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      <Card>
        {calendarEntries.length > 0 ? (
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
                {calendarEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(entry.event_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{entry.event_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No academic calendar entries found for {selectedYear}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

