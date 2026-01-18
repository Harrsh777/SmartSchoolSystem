'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, CheckCircle2, XCircle, Clock, Users, Save, Loader2 } from 'lucide-react';
import type { Staff, Student, Class } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

type AttendanceStatus = 'present' | 'absent' | 'late';

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [isMarked, setIsMarked] = useState(false);

  const fetchExistingAttendance = useCallback(async () => {
    if (!selectedClass || !teacher || students.length === 0 || !selectedDate) {
      return;
    }

    try {
      setLoadingAttendance(true);
      const classId = getString(selectedClass.id);
      const schoolCode = getString(teacher.school_code);
      
      if (!classId || !schoolCode) {
        console.error('Missing required IDs');
        setLoadingAttendance(false);
        return;
      }
      
      const response = await fetch(
        `/api/attendance/class?class_id=${classId}&date=${selectedDate}&school_code=${schoolCode}`
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
      setIsMarked(false);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedClass, teacher, students, selectedDate]);

  const fetchStudentsForClass = useCallback(async (classData: Class) => {
    if (!teacher || !classData.class || !classData.section) {
      return;
    }
    
    try {
      const schoolCode = getString(teacher.school_code);
      const className = getString(classData.class);
      const section = getString(classData.section);
      
      if (!schoolCode || !className || !section) {
        console.error('Missing required class information');
        setStudents([]);
        return;
      }
      
      const studentsResponse = await fetch(
        `/api/students?school_code=${schoolCode}&class=${className}&section=${section}`
      );
      const studentsResult = await studentsResponse.json();
      
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data || []);
        // Reset attendance when class changes
        setAttendance({});
        setIsMarked(false);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    }
  }, [teacher]);

  useEffect(() => {
    if (selectedClass && selectedDate && students.length > 0 && teacher) {
      fetchExistingAttendance();
    }
  }, [selectedClass, selectedDate, students.length, teacher, fetchExistingAttendance]);
  
  useEffect(() => {
    // When selected class changes, fetch students for that class
    if (selectedClass && teacher) {
      fetchStudentsForClass(selectedClass);
    }
  }, [selectedClass, teacher, fetchStudentsForClass]);

  const fetchClassAndStudents = useCallback(async (teacherData: Staff) => {
    try {
      setLoading(true);
      
      // Validate teacher data
      const schoolCode = getString(teacherData.school_code);
      const teacherId = getString(teacherData.id);
      const staffId = teacherData.staff_id ? getString(teacherData.staff_id) : null;
      
      if (!schoolCode || (!teacherId && !staffId)) {
        console.error('Missing required teacher data:', { 
          school_code: schoolCode, 
          teacher_id: teacherId, 
          staff_id: staffId 
        });
        setIsClassTeacher(false);
        setStudents([]);
        return;
      }
      
      // Fetch all classes assigned to this teacher - pass both teacher_id and staff_id, request array
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
        array: 'true', // Request array of classes
      });
      
      if (teacherId) {
        queryParams.append('teacher_id', teacherId);
      }
      if (staffId) {
        queryParams.append('staff_id', staffId);
      }
      
      const classResponse = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const classResult = await classResponse.json();
      
      // Check if there's an error in the response
      if (classResult.error && !classResult.data) {
        // If there's an error and no data, it's a real error (not just "no classes assigned")
        if (classResult.error !== 'No classes assigned') {
          console.error('API error:', classResult.error, classResult.details);
          throw new Error(classResult.error || 'Failed to fetch class information');
        }
        // "No classes assigned" is not an error, just means teacher has no classes
        setIsClassTeacher(false);
        setStudents([]);
        return;
      }
      
      if (classResponse.ok && classResult.data) {
        // Handle both array and single class responses
        const classesData = Array.isArray(classResult.data) ? classResult.data : [classResult.data];
        
        // Filter out null/undefined classes and ensure data is valid
        const validClasses = classesData.filter((cls: Class | null) => cls && cls.class && cls.section);
        
        if (validClasses.length > 0) {
          setAssignedClasses(validClasses);
          setIsClassTeacher(true);
          
          // Set first class as selected by default
          setSelectedClass(validClasses[0]);
          
          // Fetch students for the first class
          fetchStudentsForClass(validClasses[0]);
        } else {
          // No valid classes found
          setIsClassTeacher(false);
          setStudents([]);
        }
      } else if (classResponse.ok) {
        // Response is OK but no data (empty array case)
        setIsClassTeacher(false);
        setStudents([]);
      } else {
        // Response is not OK - treat as error
        const errorMsg = classResult.error || `HTTP ${classResponse.status}: Failed to fetch class information`;
        console.error('API request failed:', errorMsg, classResult.details);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error fetching classes and students:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load class information';
      // Only show alert for actual errors, not for "no classes assigned"
      if (!errorMessage.includes('No classes assigned')) {
        alert(errorMessage);
      }
      setIsClassTeacher(false);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentsForClass]);

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
      // Call fetchClassAndStudents directly with teacherData - don't include it in deps to avoid infinite loop
      fetchClassAndStudents(teacherData);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Only depend on router, not fetchClassAndStudents to avoid infinite loop

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
    if (!selectedClass || !teacher || !selectedClass.id || !teacher.school_code || !teacher.id) {
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
      const schoolCode = getString(teacher.school_code);
      const classId = getString(selectedClass.id);
      const teacherId = getString(teacher.id);
      
      if (!schoolCode || !classId || !teacherId) {
        alert('Missing required information to save attendance');
        setSaving(false);
        return;
      }
      
      const attendanceRecords = Object.entries(attendance)
        .filter(([studentId]) => {
          // Verify student exists in the current students list
          return students.some(s => {
            const sId = getString(s.id);
            return sId === studentId && sId;
          });
        })
        .map(([studentId, status]) => ({
          student_id: studentId,
          status: status as AttendanceStatus,
        }))
        .filter(record => record.student_id); // Remove any invalid records

      if (attendanceRecords.length === 0) {
        alert('No valid attendance records to save');
        setSaving(false);
        return;
      }

      // Use update endpoint if already marked, otherwise use mark endpoint
      const endpoint = isMarked ? '/api/attendance/update' : '/api/attendance/mark';
      
      const response = await fetch(endpoint, {
        method: isMarked ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: classId,
          attendance_date: selectedDate,
          attendance_records: attendanceRecords,
          marked_by: teacherId,
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  // If teacher is not a class teacher, show message
  if (!isClassTeacher || assignedClasses.length === 0) {
    return (
      <div className="min-h-screen bg-background space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-accent/10 rounded-lg">
              <Calendar className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">Mark Attendance</h1>
              <p className="text-muted-foreground">Mark attendance for your class students</p>
            </div>
          </div>
        </motion.div>

        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <Users className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">Not Assigned as Class Teacher</h3>
            <p className="text-muted-foreground mb-4">
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

  if (!selectedClass) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Class Attendance</h1>
          {assignedClasses.length > 1 ? (
            <div className="flex items-center gap-3">
              <select
                value={getString(selectedClass.id)}
                onChange={(e) => {
                  const selected = assignedClasses.find(c => getString(c.id) === e.target.value);
                  if (selected) {
                    setSelectedClass(selected);
                  }
                }}
                className="px-4 py-2 bg-card border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/30"
              >
                {assignedClasses.map((cls) => {
                  const clsId = getString(cls.id);
                  const clsClass = getString(cls.class);
                  const clsSection = getString(cls.section);
                  const clsYear = getString(cls.academic_year);
                  if (!clsId) return null;
                  return (
                    <option key={clsId} value={clsId}>
                      {clsClass}-{clsSection} ({clsYear})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {getString(selectedClass.class)}-{getString(selectedClass.section)} • Academic Year {getString(selectedClass.academic_year)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMarked ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-full text-sm font-medium">
              <CheckCircle2 size={16} />
              Marked
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-sm font-medium">
              <XCircle size={16} />
              Not Marked
            </span>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <Card className="glass-card soft-shadow">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground" size={20} />
            <label className="text-sm font-medium text-foreground">Select Date:</label>
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
            className="px-4 py-2 bg-card border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/30"
          />
          {selectedDate === today && (
            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
              Today
            </span>
          )}
        </div>
      </Card>

      {/* Bulk Actions */}
      <Card className="glass-card soft-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('present')}
              className="border-accent text-accent hover:bg-accent/10"
            >
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('absent')}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Mark All Absent
            </Button>
          </div>
        </div>
      </Card>

      {/* Student Attendance Grid */}
      <Card className="glass-card soft-shadow">
        {loadingAttendance ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading attendance...</p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-foreground text-lg font-semibold mb-2">No students found</p>
            <p className="text-muted-foreground text-sm">
              There are no students in this class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-input">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-input">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Student</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Admission No</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Present</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Absent</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {students.map((student) => {
                  if (!student.id) return null;
                  const studentId = getString(student.id);
                  if (!studentId) return null;
                  const currentStatus = attendance[studentId] || 'present';
                  const studentName = getString(student.student_name) || getString(student.first_name) + ' ' + getString(student.last_name) || 'N/A';
                  const admissionNo = getString(student.admission_no) || 'N/A';
                  return (
                    <tr key={studentId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 font-medium text-foreground">{studentName.trim() || 'N/A'}</td>
                      <td className="py-4 px-4 text-muted-foreground">{admissionNo}</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(studentId, 'present')}
                          disabled={loadingAttendance || saving}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors soft-shadow ${
                            currentStatus === 'present'
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${(loadingAttendance || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Present
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(studentId, 'absent')}
                          disabled={loadingAttendance || saving}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors soft-shadow ${
                            currentStatus === 'absent'
                              ? 'bg-destructive text-destructive-foreground shadow-md'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${(loadingAttendance || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Absent
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleStatusChange(studentId, 'late')}
                          disabled={loadingAttendance || saving}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors soft-shadow ${
                            currentStatus === 'late'
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${(loadingAttendance || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      <div className="fixed bottom-0 left-0 right-0 glass-card border-t border-input shadow-lg z-50 lg:left-64 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground" size={20} />
                <span className="text-sm text-muted-foreground">
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
                  <Users className="text-muted-foreground" size={18} />
                  <span className="text-sm font-medium text-foreground">
                    Total: {students.length}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-accent">
                    <CheckCircle2 size={16} />
                    {counts.present}
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle size={16} />
                    {counts.absent}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Clock size={16} />
                    {counts.late}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {saveSuccess && (
                <span className="text-sm text-accent font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Saved successfully!
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || loadingAttendance || students.length === 0}
                className="min-w-[140px]"
                variant="primary"
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

