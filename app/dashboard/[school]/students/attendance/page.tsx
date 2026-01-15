'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, CheckCircle, X, Minus, Power, Filter, ArrowLeft, Users, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Class {
  id: string;
  class: string;
  section?: string;
}

interface StudentAttendanceData {
  student_id: string;
  roll_number: string;
  student_name: string;
  admission_no: string;
  attendance: Record<string, string>; // date -> status
}

interface ClassAttendanceData {
  class: {
    id: string;
    class: string;
    section: string;
    academic_year: string;
  };
  student_attendance: StudentAttendanceData[];
}

interface AttendanceResponse {
  month: string;
  dates: string[];
  classes?: ClassAttendanceData[];
  class?: {
    id: string;
    class: string;
    section: string;
    academic_year: string;
  };
  student_attendance?: StudentAttendanceData[];
}

export default function StudentAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedMonth) {
      fetchAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedClass, schoolCode]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const sortedClasses = result.data.sort((a: Class, b: Class) => {
          if (a.class !== b.class) {
            // Sort classes numerically if possible, otherwise alphabetically
            const aNum = parseInt(a.class);
            const bNum = parseInt(b.class);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.class.localeCompare(b.class);
          }
          return (a.section || '').localeCompare(b.section || '');
        });
        setClasses(sortedClasses);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        school_code: schoolCode,
        month: selectedMonth,
        class_id: selectedClass,
      });

      const response = await fetch(`/api/attendance/student-monthly?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setAttendanceData(result.data);
      } else {
        setError(result.error || 'Failed to fetch attendance');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'absent':
        return <X className="text-red-600" size={16} />;
      case 'not_marked':
        return <Minus className="text-gray-400" size={16} />;
      case 'late':
        return <Minus className="text-yellow-600" size={16} />;
      default:
        return <Minus className="text-gray-400" size={16} />;
    }
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthForInput = (monthStr: string) => {
    return monthStr;
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  if (loading && !attendanceData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  const renderAttendanceTable = (classData: ClassAttendanceData | null, dates: string[]) => {
    if (!classData && !attendanceData) return null;

    const students = classData?.student_attendance || attendanceData?.student_attendance || [];
    const classInfo = classData?.class || attendanceData?.class;

    if (students.length === 0) {
      return (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No students found for this class</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto w-full">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-200">
                Roll No.
              </th>
              <th className="sticky left-[80px] z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 min-w-[200px]">
                Student Name
              </th>
              {dates.map((date) => {
                const day = parseInt(date.split('-')[2]);
                return (
                  <th
                    key={date}
                    className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 min-w-[40px]"
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.student_id} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                  {student.roll_number || '-'}
                </td>
                <td className="sticky left-[80px] z-10 bg-white px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                  {student.student_name || student.admission_no || '-'}
                </td>
                {dates.map((date) => {
                  const status = student.attendance[date] || 'not_marked';
                  return (
                    <td
                      key={date}
                      className="px-2 py-3 text-center border-r border-gray-200"
                    >
                      <div className="flex items-center justify-center">
                        {getStatusIcon(status)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
            View Attendance
          </h1>
          <p className="text-gray-600">View student attendance for the past month</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <label className="text-sm font-medium text-gray-700">Class Section:</label>
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

          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-gray-100 rounded"
                title="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <Input
                type="month"
                value={formatMonthForInput(selectedMonth)}
                onChange={handleMonthChange}
                className="w-auto"
              />
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-gray-100 rounded"
                title="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={fetchAttendance}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {/* Attendance Table */}
      {attendanceData && (
        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.class + (classes.find(c => c.id === selectedClass)?.section ? `-${classes.find(c => c.id === selectedClass)?.section}` : '')}
            </h2>
            <span className="text-sm text-gray-600">{getMonthName(selectedMonth)}</span>
          </div>

          {selectedClass === 'all' && attendanceData.classes ? (
            <div className="space-y-8">
              {attendanceData.classes.map((classData) => (
                <div key={classData.class.id}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {classData.class.class}{classData.class.section ? `-${classData.class.section}` : ''}
                  </h3>
                  {renderAttendanceTable(classData, attendanceData.dates)}
                </div>
              ))}
            </div>
          ) : (
            renderAttendanceTable(
              attendanceData.classes?.[0] || null,
              attendanceData.dates || []
            )
          )}
        </Card>
      )}

      {!attendanceData && !loading && (
        <Card>
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-2">No attendance data found</p>
            <p className="text-gray-500 text-sm">Select a month and class to view attendance</p>
          </div>
        </Card>
      )}
    </div>
  );
}
