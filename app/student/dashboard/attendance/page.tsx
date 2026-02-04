'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Student } from '@/lib/supabase';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  staff?: {
    full_name: string;
    staff_id: string;
  };
  marked_by_staff?: {
    full_name: string;
    staff_id: string;
  };
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  not_marked?: number;
}

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
    not_marked: 0,
  });
  const [loading, setLoading] = useState(true);
  // Window navigation (each step = 30 days). 0 = last 30 days (including today).
  const [windowOffset, setWindowOffset] = useState(0);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  // Format date as YYYY-MM-DD in local time (not UTC) so API range matches teacher-marked dates
  const toLocalDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchAttendance = useCallback(async (studentData: Student) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const studentId = getString(studentData.id);
      const schoolCode = getString(studentData.school_code);
      if (!studentId || !schoolCode) {
        setLoading(false);
        return;
      }
      params.append('student_id', studentId);
      params.append('school_code', schoolCode);
      // Compute 30-day window in local time
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - windowOffset * 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);

      params.append('start_date', toLocalDateString(start));
      params.append('end_date', toLocalDateString(end));

      const response = await fetch(`/api/attendance/student?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const records: AttendanceRecord[] = result.data;
        setAttendance(records);

        // Normalize API date to YYYY-MM-DD for map key (DB returns date string)
        const byDate = new Map<string, AttendanceRecord>();
        records.forEach((r) => {
          const key = String(r.attendance_date).slice(0, 10);
          byDate.set(key, r);
        });

        let present = 0;
        let absent = 0;
        let late = 0;
        let marked = 0;

        const cursor = new Date(start);
        while (cursor <= end) {
          const key = toLocalDateString(cursor);
          const rec = byDate.get(key);
          if (rec) {
            marked += 1;
            if (rec.status === 'present') present += 1;
            else if (rec.status === 'absent') absent += 1;
            else if (rec.status === 'late') late += 1;
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        const total = 30;
        const not_marked = total - marked;
        const percentageDen = present + absent + late;
        const percentage = percentageDen > 0 ? Math.round((present / percentageDen) * 100) : 0;

        setStats({
          total,
          present,
          absent,
          late,
          not_marked,
          percentage,
        });
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [windowOffset]);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
    }
  }, []);

  useEffect(() => {
    if (student) {
      fetchAttendance(student);
    }
  }, [student, fetchAttendance]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'absent':
        return <XCircle className="text-red-500" size={20} />;
      case 'late':
        return <AlertCircle className="text-yellow-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      not_marked: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getWindowLabel = () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - windowOffset * 30);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const getWindowDays = () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - windowOffset * 30);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);

    const byDate = new Map<string, AttendanceRecord>();
    attendance.forEach((r) => {
      const key = String(r.attendance_date).slice(0, 10);
      byDate.set(key, r);
    });

    const days: Array<{
      key: string;
      date: Date;
      status: 'present' | 'absent' | 'late' | 'not_marked';
      record?: AttendanceRecord;
    }> = [];

    const toLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toLocalDateString(cursor);
      const rec = byDate.get(key);
      days.push({
        key,
        date: new Date(cursor),
        status: rec?.status ?? 'not_marked',
        record: rec,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // show latest first
    return days.reverse();
  };

  const handleExport = () => {
    const days = getWindowDays();
    if (days.length === 0) return;
    const headers = ['Date', 'Day', 'Status', 'Marked By'];
    const escapeCsv = (v: string) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = days.map((d) => [
      d.date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      d.date.toLocaleDateString('en-US', { weekday: 'long' }),
      d.status === 'not_marked' ? 'Not Marked' : d.status.charAt(0).toUpperCase() + d.status.slice(1),
      d.record?.marked_by_staff?.full_name ?? d.record?.marked_by ?? '',
    ].map(escapeCsv).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${getWindowLabel().replace(/\s*–\s*/g, '_').replace(/,?\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Attendance</h1>
          <p className="text-gray-600">View your attendance records</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Days</p>
                <p className="text-2xl font-bold text-black">{stats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-black">{stats.present}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-black">{stats.absent}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Not Marked</p>
                <p className="text-2xl font-bold text-black">{stats.not_marked ?? 0}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Attendance %</p>
                <p className="text-2xl font-bold text-black">{stats.percentage}%</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 30-day Window Navigation */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600">Showing</p>
            <p className="text-lg font-semibold text-black">{getWindowLabel()}</p>
            <p className="text-xs text-gray-500 mt-1">Use the arrows to jump by 30 days.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWindowOffset((v) => v + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              title="Previous 30 days"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Back 30 days</span>
            </button>
            <button
              onClick={() => setWindowOffset((v) => Math.max(0, v - 1))}
              disabled={windowOffset === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next 30 days"
            >
              <span className="text-sm font-medium">Next 30 days</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Attendance (30-day view) */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-black">Attendance (Last 30 Days)</h2>
          {getWindowDays().length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          )}
        </div>

        {getWindowDays().length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No attendance records found</p>
            <p className="text-sm text-gray-500 mt-2">
              Attendance data will appear here once your class teacher marks it.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {getWindowDays().map((day) => (
              <div key={day.key} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">
                    {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {day.date.toLocaleDateString('en-US', { year: 'numeric' })}
                    {day.record?.marked_by_staff?.full_name ? ` • Marked by ${day.record.marked_by_staff.full_name}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {day.status !== 'not_marked' ? getStatusIcon(day.status) : <AlertCircle className="text-gray-400" size={20} />}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(day.status)}`}>
                    {day.status === 'not_marked'
                      ? 'Not marked'
                      : day.status.charAt(0).toUpperCase() + day.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

