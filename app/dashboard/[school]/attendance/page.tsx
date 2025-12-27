'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Calendar, CheckCircle, XCircle, TrendingUp, Clock, Filter } from 'lucide-react';

export default function AttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  interface AttendanceRecord {
    id: string;
    student?: { admission_no?: string; student_name?: string; [key: string]: unknown };
    attendance_date?: string;
    status?: string;
    [key: string]: unknown;
  }
  interface SummaryRecord {
    total: number;
    present: number;
    absent: number;
    late: number;
    class?: { class: string; section: string; [key: string]: unknown };
    [key: string]: unknown;
  }
  interface ClassData {
    id: string;
    class: string;
    section: string;
    [key: string]: unknown;
  }
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<SummaryRecord[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchClasses();
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedClass, selectedDate, dateRange]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      
      if (selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }
      
      if (dateRange.start && dateRange.end) {
        params.append('start_date', dateRange.start);
        params.append('end_date', dateRange.end);
      } else if (selectedDate) {
        params.append('date', selectedDate);
      }

      const response = await fetch(`/api/attendance/overview?${params.toString()}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setAttendanceData(result.data);
        setSummary(result.summary || []);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall stats
  const overallStats = {
    totalPresent: attendanceData.filter(a => a.status === 'present').length,
    totalAbsent: attendanceData.filter(a => a.status === 'absent').length,
    totalLate: attendanceData.filter(a => a.status === 'late').length,
    totalRecords: attendanceData.length,
    averagePercentage: summary.length > 0
      ? Math.round(summary.reduce((sum: number, s: SummaryRecord) => {
          const total = s.total || 0;
          const present = s.present || 0;
          return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / summary.length)
      : 0,
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Attendance Overview</h1>
            <p className="text-gray-600">Track and manage student attendance records</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <label className="text-sm font-medium text-gray-700">Class:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class}-{cls.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" size={20} />
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateRange({ start: '', end: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Range:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setSelectedDate('');
                }}
                placeholder="Start Date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setSelectedDate('');
                }}
                placeholder="End Date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Present</p>
                <p className="text-2xl font-bold text-black">{overallStats.totalPresent}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Absent</p>
                <p className="text-2xl font-bold text-black">{overallStats.totalAbsent}</p>
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
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Clock className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Late</p>
                <p className="text-2xl font-bold text-black">{overallStats.totalLate}</p>
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
              <div className="bg-blue-500 p-3 rounded-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Attendance</p>
                <p className="text-2xl font-bold text-black">{overallStats.averagePercentage}%</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Summary by Class and Date */}
      {summary.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-6">Attendance Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Present</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Absent</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Late</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Percentage</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((record: SummaryRecord, index: number) => {
                    const percentage = record.total > 0 
                      ? Math.round((record.present / record.total) * 100) 
                      : 0;
                    return (
                      <motion.tr
                        key={`${record.class}-${record.section}-${record.date}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-black">
                          {String(record.class || '')}-{String(record.section || '')}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {new Date(String(record.date || '')).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">{record.total}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {record.present}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            {record.absent}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            {record.late}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            percentage >= 90 ? 'bg-green-100 text-green-800' :
                            percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {String(record.marked_by || 'Unknown')}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Detailed Attendance Records */}
      {attendanceData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-black mb-6">Detailed Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.slice(0, 50).map((record: AttendanceRecord, index: number) => (
                    <motion.tr
                      key={record.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.02 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 text-gray-600">
                        {new Date(String(record.attendance_date || '')).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 font-medium text-black">
                        {String((record.student as { student_name?: string; first_name?: string } | undefined)?.student_name || (record.student as { student_name?: string; first_name?: string } | undefined)?.first_name || 'Unknown')}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {String((record.class as { class?: string; section?: string } | undefined)?.class || '')}-{String((record.class as { class?: string; section?: string } | undefined)?.section || '')}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {String(record.status || '').charAt(0).toUpperCase() + String(record.status || '').slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {String((record.marked_by_staff as { full_name?: string } | undefined)?.full_name || 'Unknown')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {attendanceData.length > 50 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing first 50 records. Use filters to narrow down results.
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {attendanceData.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">No attendance records found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters or check back later</p>
          </div>
        </Card>
      )}
    </div>
  );
}
