'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, CheckCircle, Filter, Search, ArrowLeft, Users, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  marked_by?: string | null;
  created_at: string;
  student?: {
    id: string;
    admission_no: string;
    student_name: string;
    first_name?: string;
    last_name?: string;
    class: string;
    section?: string;
  };
  class?: {
    id: string;
    class: string;
    section?: string;
    academic_year?: string;
  };
  marked_by_staff?: {
    id: string;
    full_name: string;
    staff_id: string;
  };
}

interface Class {
  id: string;
  class: string;
  section?: string;
}

export default function StudentAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedClass, viewMode, schoolCode]);

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
      const params = new URLSearchParams({
        school_code: schoolCode,
      });

      if (viewMode === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('date', today);
      } else {
        if (selectedDate) {
          params.append('date', selectedDate);
        }
      }

      if (selectedClass !== 'all') {
        params.append('class_id', selectedClass);
      }

      const response = await fetch(`/api/attendance/overview?${params}`);
      const result = await response.json();

      if (response.ok) {
        if (result.data && Array.isArray(result.data)) {
          console.log('Fetched attendance records:', result.data.length);
          // Normalize the data structure to handle both naming conventions
          const normalizedData = result.data.map((record: any) => ({
            ...record,
            student: record.student || record.students,
            class: record.class || record.classes,
            marked_by_staff: record.marked_by_staff || record.staff,
          }));
          setAttendance(normalizedData);
          setError(null);
        } else {
          console.warn('No attendance data received:', result);
          setAttendance([]);
          setError(null);
        }
      } else {
        const errorMsg = result.error || result.details || 'Failed to fetch attendance records';
        console.error('Error fetching attendance:', errorMsg, result);
        setError(errorMsg);
        setAttendance([]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch attendance records';
      console.error('Error fetching attendance:', err);
      setError(errorMsg);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      total: attendance.length,
    };

    attendance.forEach((record) => {
      if (record.status === 'present') counts.present++;
      else if (record.status === 'absent') counts.absent++;
      else if (record.status === 'late') counts.late++;
    });

    return counts;
  };

  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch =
      record.student?.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.student?.admission_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const counts = getStatusCounts();
  const attendancePercentage = counts.total > 0 
    ? Math.round((counts.present / counts.total) * 100) 
    : 0;

  if (loading && attendance.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Student Attendance
          </h1>
          <p className="text-gray-600">View and manage student attendance records</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters and View Mode */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" size={20} />
              <label className="text-sm font-medium text-gray-700">View:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewMode('today');
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'today'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    setViewMode('all');
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Records
                </button>
              </div>
            </div>

            {viewMode === 'all' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <label className="text-sm font-medium text-gray-700">Class:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class}{cls.section ? `-${cls.section}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              fetchAttendance();
            }}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <p className="text-2xl font-bold text-green-600">{counts.present}</p>
            <p className="text-sm text-gray-600 mt-1">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <p className="text-2xl font-bold text-red-600">{counts.absent}</p>
            <p className="text-sm text-gray-600 mt-1">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-600">{counts.late}</p>
            <p className="text-sm text-gray-600 mt-1">Late</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-center text-white">
            <p className="text-2xl font-bold">{attendancePercentage}%</p>
            <p className="text-sm text-orange-100 mt-1">Attendance</p>
          </div>
        </div>
      </Card>

      {/* Attendance Records Table */}
      <Card>
        <div className="overflow-x-auto">
          {filteredAttendance.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Admission No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Marked By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.map((record) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.attendance_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.student?.admission_no || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.student?.student_name || 
                       `${record.student?.first_name || ''} ${record.student?.last_name || ''}`.trim() || 
                       'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.student?.class || record.class?.class || 'N/A'}
                      {record.student?.section || record.class?.section ? `-${record.student?.section || record.class?.section}` : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}
                      >
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.marked_by_staff?.full_name || record.marked_by || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {record.remarks || '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900 mb-2">No attendance records found</p>
              <p className="text-sm text-gray-600">
                {viewMode === 'today'
                  ? 'No attendance has been marked for today yet.'
                  : `No attendance records found for the selected date and filters.`}
              </p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {filteredAttendance.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  <span className="font-semibold text-gray-900">Total Records:</span> {filteredAttendance.length}
                </span>
                <span>
                  <span className="font-semibold text-gray-900">Attendance Rate:</span>{' '}
                  <span className={`font-bold ${attendancePercentage >= 75 ? 'text-green-600' : attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {attendancePercentage}%
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {attendancePercentage >= 75 ? (
                  <TrendingUp className="text-green-600" size={18} />
                ) : (
                  <TrendingDown className="text-red-600" size={18} />
                )}
                <span className="text-xs text-gray-500">
                  {attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 50 ? 'Average' : 'Needs Attention'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
