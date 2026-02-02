'use client';

import { use } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, Download } from 'lucide-react';

export default function StudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!schoolCode) return;
    if (!fromDate || !toDate) {
      setError('Please select both From and To dates.');
      return;
    }
    setError(null);

    try {
      setDownloading(true);
      const response = await fetch(
        `/api/students/attendance-report?school_code=${encodeURIComponent(
          schoolCode,
        )}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`,
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to generate attendance report');
      }

      const result = await response.json();
      const data = (result.data || []) as Array<{
        attendance_date?: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
        status?: string;
        marked_by_name?: string;
      }>;

      const headers = [
        'Date',
        'Student Name',
        'Admission No',
        'Class',
        'Section',
        'Status',
        'Marked By',
      ];

      const escapeCsv = (val: unknown) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const lines: string[] = [headers.join(',')];
      data.forEach((row) => {
        lines.push(
          [
            row.attendance_date,
            row.student_name,
            row.admission_no,
            row.class,
            row.section,
            row.status,
            row.marked_by_name || 'N/A',
          ]
            .map(escapeCsv)
            .join(','),
        );
      });

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_attendance_report_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attendance report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download attendance report');
    } finally {
      setDownloading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Calendar className="text-indigo-600" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Student Attendance Report
              </h1>
              <p className="text-sm text-slate-500">
                Select the date range for which you want to download the attendance report.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || todayStr}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                max={todayStr}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleDownload}
              disabled={downloading || !fromDate || !toDate}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              {downloading ? 'Downloading...' : 'Download Attendance Report'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

