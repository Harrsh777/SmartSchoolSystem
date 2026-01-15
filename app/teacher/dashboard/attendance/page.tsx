'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, CheckCircle2, XCircle, Clock, Users, Save, Loader2 } from 'lucide-react';
import type { Staff, Student, Class } from '@/lib/supabase';

type AttendanceStatus = 'present' | 'absent' | 'late';

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isMarked, setIsMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  useEffect(() => {
    // Check if teacher is logged in
    const storedTeacher = sessionStorage.getItem('teacher');
    const role = sessionStorage.getItem('role');

    if (!storedTeacher || role !== 'teacher') {
      router.push('/login');
      return;
    }

    try {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchClassAndStudents(teacherData);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    }
  }, [router]);

  const fetchExistingAttendance = useCallback(async () => {
    if (!assignedClass || !teacher || students.length === 0 || !selectedDate) {
      return;
    }

    try {
      setLoadingAttendance(true);
      const response = await fetch(
        `/api/attendance/class?class_id=${assignedClass.id}&date=${selectedDate}&school_code=${teacher.school_code}`
      );
      const result = await response.json();

      if (response.ok && result.data && result.data.length > 0) {
        interface AttendanceRecordData {
          student_id: string;
          status: AttendanceStatus;
          [key: string]: unknown;
        }
        const existing: Record<string, AttendanceStatus> = {};
        result.data.forEach((record: AttendanceRecordData) => {
          existing[record.student_id] = record.status;
        });
        setExistingAttendance(existing);
        
        // Merge with all students - set saved attendance for those who have it, default 'present' for others
        const mergedAttendance: Record<string, AttendanceStatus> = {};
        students.forEach((student) => {
          if (student.id) {
            mergedAttendance[student.id] = existing[student.id] || 'present';
          }
        });
        setAttendance(mergedAttendance);
        setIsMarked(true);
      } else {
        // No attendance marked yet - initialize all as 'present'
        const initialAttendance: Record<string, AttendanceStatus> = {};
        students.forEach((student) => {
          if (student.id) {
            initialAttendance[student.id] = 'present';
          }
        });
        setAttendance(initialAttendance);
        setExistingAttendance({});
        setIsMarked(false);
      }
    } catch (err) {
      console.error('Error fetching existing attendance:', err);
      // Initialize with default values on error
      const initialAttendance: Record<string, AttendanceStatus> = {};
      students.forEach((student) => {
        if (student.id) {
          initialAttendance[student.id] = 'present';
        }
      });
      setAttendance(initialAttendance);
      setExistingAttendance({});
      setIsMarked(false);
    } finally {
      setLoadingAttendance(false);
    }
  }, [assignedClass, teacher, students, selectedDate]);

  useEffect(() => {
    if (assignedClass && selectedDate && students.length > 0 && teacher) {
      fetchExistingAttendance();
    }
  }, [assignedClass, selectedDate, students.length, teacher, fetchExistingAttendance]);

  const fetchClassAndStudents = async (teacherData: Staff) => {
    try {
      setLoading(true);
      
      if (!teacherData.id || !teacherData.school_code) {
        console.error('Missing required teacher data');
        setIsClassTeacher(false);
        setStudents([]);
        return;
      }
      
      // Fetch class assigned to this teacher - pass both teacher_id and staff_id
      const queryParams = new URLSearchParams({
        school_code: teacherData.school_code,
        teacher_id: teacherData.id,
      });
      if (teacherData.staff_id) {
        queryParams.append('staff_id', teacherData.staff_id);
      }
      
      const classResponse = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const classResult = await classResponse.json();
      
      if (classResponse.ok && classResult.data) {
        const classData = classResult.data;
        if (!classData.class || !classData.section) {
          console.error('Invalid class data received');
          setIsClassTeacher(false);
          setStudents([]);
          return;
        }
        
        setAssignedClass(classData);
        setIsClassTeacher(true);
        
        // Fetch students for this class
        const studentsResponse = await fetch(
          `/api/students?school_code=${teacherData.school_code}&class=${classData.class}&section=${classData.section}`
        );
        const studentsResult = await studentsResponse.json();
        
        if (studentsResponse.ok && studentsResult.data) {
          setStudents(studentsResult.data || []);
        } else {
          setStudents([]);
        }
      } else {
        // Teacher is not assigned to any class
        setIsClassTeacher(false);
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching class and students:', err);
      alert('Failed to load class information');
      setIsClassTeacher(false);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleBulkAction = (status: AttendanceStatus) => {
    if (students.length === 0) return;
    const bulkAttendance: Record<string, AttendanceStatus> = {};
    students.forEach((student) => {
      if (student.id) {
        bulkAttendance[student.id] = status;
      }
    });
    setAttendance(bulkAttendance);
  };

  const handleSave = async () => {
    if (!assignedClass || !teacher || !assignedClass.id || !teacher.school_code || !teacher.id) {
      alert('Missing required information to save attendance');
      return;
    }

    if (students.length === 0) {
      alert('No students to save attendance for');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const attendanceRecords = Object.entries(attendance)
        .filter(([studentId]) => students.some(s => s.id === studentId))
        .map(([studentId, status]) => ({
          student_id: studentId,
          status,
        }));

      if (attendanceRecords.length === 0) {
        alert('No attendance records to save');
        setSaving(false);
        return;
      }

      // Use update endpoint if already marked, otherwise use mark endpoint
      const endpoint = isMarked ? '/api/attendance/update' : '/api/attendance/mark';
      
      const response = await fetch(endpoint, {
        method: isMarked ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: teacher.school_code,
          class_id: assignedClass.id,
          attendance_date: selectedDate,
          attendance_records: attendanceRecords,
          marked_by: teacher.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsMarked(true);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh attendance data after successful save
        await fetchExistingAttendance();
      } else {
        const errorMessage = result.error || 'Failed to save attendance';
        const errorDetails = result.details ? `: ${result.details}` : '';
        alert(`${errorMessage}${errorDetails}`);
        console.error('Attendance error:', result);
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };


  const getStatusCounts = () => {
    const counts = { present: 0, absent: 0, late: 0 };
    Object.values(attendance).forEach((status) => {
      counts[status]++;
    });
    return counts;
  };

  if (loading || !teacher) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  // If teacher is not a class teacher, show message
  if (!isClassTeacher || !assignedClass) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="text-orange-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
              <p className="text-gray-600">Mark attendance for your class students</p>
            </div>
          </div>
        </motion.div>

        <Card>
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Not Assigned as Class Teacher</h3>
            <p className="text-gray-600 mb-4">
              You are not assigned as a class teacher. Please contact the principal to be assigned to a class.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const counts = getStatusCounts();
  const today = new Date().toISOString().split('T')[0];
  const maxDate = today;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Attendance</h1>
          <p className="text-gray-600">
            {assignedClass.class}-{assignedClass.section} • Academic Year {assignedClass.academic_year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMarked ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle2 size={16} />
              Marked
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              <XCircle size={16} />
              Not Marked
            </span>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <label className="text-sm font-medium text-gray-700">Select Date:</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const newDate = e.target.value;
              const today = new Date().toISOString().split('T')[0];
              // Only allow dates up to today (no future dates)
              if (newDate <= today) {
                // Reset attendance state when date changes
                setAttendance({});
                setIsMarked(false);
                setSelectedDate(newDate);
              }
            }}
            max={maxDate}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {selectedDate === today && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Today
            </span>
          )}
        </div>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('present')}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('absent')}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Mark All Absent
            </Button>
          </div>
        </div>
      </Card>

      {/* Student Attendance Grid */}
      <Card>
        {loadingAttendance ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading attendance...</p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-semibold mb-2">No students found</p>
            <p className="text-gray-500 text-sm">
              There are no students in this class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Admission No</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Present</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Absent</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => {
                  if (!student.id) return null;
                  const currentStatus = attendance[student.id] || 'present';
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{student.student_name || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-600">{student.admission_no || 'N/A'}</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(student.id!, 'present')}
                          disabled={loadingAttendance}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            currentStatus === 'present'
                              ? 'bg-green-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } ${loadingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Present
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(student.id!, 'absent')}
                          disabled={loadingAttendance}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            currentStatus === 'absent'
                              ? 'bg-red-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } ${loadingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Absent
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(student.id!, 'late')}
                          disabled={loadingAttendance}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            currentStatus === 'late'
                              ? 'bg-yellow-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } ${loadingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Late
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 lg:left-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" size={20} />
                <span className="text-sm text-gray-600">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="text-gray-400" size={18} />
                  <span className="text-sm font-medium text-gray-700">
                    Total: {students.length}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={16} />
                    {counts.present}
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle size={16} />
                    {counts.absent}
                  </span>
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Clock size={16} />
                    {counts.late}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {saveSuccess && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Saved successfully!
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || loadingAttendance || students.length === 0}
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-24" />
    </div>
  );
}

