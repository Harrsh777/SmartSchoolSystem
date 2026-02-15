'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, CheckCircle, AlertCircle, Save, ArrowLeft, Users, Filter, CalendarOff } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'holiday';

interface Student {
  id: string;
  roll_number: string | null;
  student_name: string;
  admission_no: string;
  academic_year?: string | null;
}

interface Class {
  id: string;
  class: string;
  section: string;
  academic_year?: string;
  class_teacher_id: string | null;
  class_teacher_staff_id: string | null;
}

export default function MarkAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [currentStaffStaffId, setCurrentStaffStaffId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');

  useEffect(() => {
    const loadAcademicYear = async () => {
      try {
        const res = await fetch(`/api/classes/academic-years?school_code=${schoolCode}`);
        const data = await res.json();
        const years = (data.data || []) as string[];
        if (years.length > 0) {
          const currentCalYear = new Date().getFullYear();
          const match = years.find((y: string) => String(y).includes(String(currentCalYear)));
          setCurrentAcademicYear(match || years[0]);
        }
      } catch {
        setCurrentAcademicYear('');
      }
    };
    loadAcademicYear();
  }, [schoolCode]);

  useEffect(() => {
    checkPermissions();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      fetchStudents();
      fetchExistingAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection, selectedDate, schoolCode, currentAcademicYear]);

  const checkPermissions = () => {
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staff = JSON.parse(storedStaff);
        const role = (staff.role || '').toLowerCase();
        const designation = (staff.designation || '').toLowerCase();
        setIsAdmin(
          role.includes('admin') ||
          role.includes('principal') ||
          designation.includes('admin') ||
          designation.includes('principal')
        );
        setCurrentStaffId(staff.id || null);
        setCurrentStaffStaffId(staff.staff_id || null);
      } catch {
        setIsAdmin(true);
      }
    } else {
      setIsAdmin(true);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      // Check permissions inline
      const storedStaff = sessionStorage.getItem('staff');
      let checkIsAdmin = false;
      let checkStaffId: string | null = null;
      let checkStaffStaffId: string | null = null;
      
      if (storedStaff) {
        try {
          const staff = JSON.parse(storedStaff);
          const role = (staff.role || '').toLowerCase();
          const designation = (staff.designation || '').toLowerCase();
          checkIsAdmin = role.includes('admin') || role.includes('principal') ||
                        designation.includes('admin') || designation.includes('principal');
          checkStaffId = staff.id || null;
          checkStaffStaffId = staff.staff_id || null;
        } catch {
          checkIsAdmin = true;
        }
      } else {
        checkIsAdmin = true;
      }
      
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        let availableClasses = result.data;
        
        // If not admin, filter classes to only those where user is class teacher
        if (!checkIsAdmin && checkStaffId && checkStaffStaffId) {
          availableClasses = result.data.filter((cls: Class) => 
            cls.class_teacher_id === checkStaffId ||
            cls.class_teacher_staff_id === checkStaffStaffId
          );
        }
        setClasses(availableClasses);
        if (availableClasses.length > 0 && !selectedClass) {
          setSelectedClass(availableClasses[0].class);
          setSelectedSection(availableClasses[0].section || '');
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    
    try {
      setLoading(true);

      const params = new URLSearchParams({ 
        school_code: schoolCode, 
        class: selectedClass, 
        section: selectedSection 
      });
      if (currentAcademicYear) {
        params.set('academic_year', currentAcademicYear);
      }
      
      const response = await fetch(`/api/students?${params}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        let list = result.data as Student[];
        if (currentAcademicYear) {
          list = list.filter((s: Student) => {
            const sy = (s.academic_year ?? '').toString().trim();
            return sy === currentAcademicYear || sy === '';
          });
        }
        const sortedStudents = list.sort((a: Student, b: Student) => {
          const aRoll = parseInt(a.roll_number || '999');
          const bRoll = parseInt(b.roll_number || '999');
          return aRoll - bRoll;
        });
        setStudents(sortedStudents);
        // Initialize attendance state
        const initialAttendance: Record<string, AttendanceStatus> = {};
        sortedStudents.forEach((student: Student) => {
          initialAttendance[student.id] = 'present'; // Default to present
        });
        setAttendance(initialAttendance);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const classesForCurrentYear = currentAcademicYear
    ? classes.filter((c) => (c.academic_year ?? '') === currentAcademicYear)
    : classes;

  useEffect(() => {
    if (classesForCurrentYear.length === 0) return;
    const pairExists = selectedClass && selectedSection && classesForCurrentYear.some(
      (c) => c.class === selectedClass && (c.section ?? '') === selectedSection
    );
    const classExists = selectedClass && classesForCurrentYear.some((c) => c.class === selectedClass);
    if (selectedClass && !classExists) {
      setSelectedClass(classesForCurrentYear[0].class);
      setSelectedSection(classesForCurrentYear[0].section || '');
    } else if (selectedClass && selectedSection && !pairExists) {
      setSelectedClass(classesForCurrentYear[0].class);
      setSelectedSection(classesForCurrentYear[0].section || '');
    }
  }, [currentAcademicYear, classesForCurrentYear, selectedClass, selectedSection]);

  const fetchExistingAttendance = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) return;

    try {
      // Find the class ID based on class and section
      const classData = classes.find(c => c.class === selectedClass && c.section === selectedSection);
      if (!classData) return;

      const response = await fetch(
        `/api/attendance/class?school_code=${schoolCode}&class_id=${classData.id}&date=${selectedDate}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        const existingAttendance: Record<string, AttendanceStatus> = {};
        result.data.forEach((record: { student_id: string; status: string }) => {
          // Map 'late' to 'present' since Late option has been removed
          existingAttendance[record.student_id] =
            record.status === 'late' ? 'present' : (record.status as AttendanceStatus);
        });
        setAttendance(prev => ({ ...prev, ...existingAttendance }));
      }
    } catch (err) {
      console.error('Error fetching existing attendance:', err);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleBulkAction = (status: AttendanceStatus) => {
    const bulkAttendance: Record<string, AttendanceStatus> = {};
    students.forEach((student) => {
      bulkAttendance[student.id] = status;
    });
    setAttendance(prev => ({ ...prev, ...bulkAttendance }));
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) {
      setError('Please select a class, section, and date');
      return;
    }

    // Find the class ID based on class and section
    const classData = classes.find(c => c.class === selectedClass && c.section === selectedSection);
    if (!classData) {
      setError('Invalid class or section selected');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      // Get staff ID from session or fetch default admin/principal
      let staffIdToUse = currentStaffId;
      
      if (!staffIdToUse) {
        try {
          const response = await fetch(`/api/staff?school_code=${schoolCode}`);
          const result = await response.json();
          if (response.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
            // Try to find principal or admin first
            const principal = result.data.find((s: { role?: string; id: string }) => 
              s.role && (
                s.role.toLowerCase().includes('principal') || 
                s.role.toLowerCase().includes('admin')
              )
            );
            // If no principal/admin, use the first staff member
            const defaultStaff = principal || result.data[0];
            if (defaultStaff && defaultStaff.id) {
              staffIdToUse = defaultStaff.id;
            }
          }
        } catch (err) {
          console.error('Error fetching default staff:', err);
        }
      }

      if (!staffIdToUse) {
        setError('Unable to save attendance. No valid staff found for this school.');
        setSaving(false);
        return;
      }

      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        status: attendance[student.id] || 'present',
      }));

      const endpoint = isAdmin ? '/api/attendance/admin-mark' : '/api/attendance/mark';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: classData.id,
          attendance_date: selectedDate,
          attendance_records: attendanceRecords,
          marked_by: staffIdToUse,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save attendance');
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canMarkForClass = (classId: string): boolean => {
    if (isAdmin) return true;
    const classData = classes.find(c => c.id === classId);
    if (!classData || !currentStaffId || !currentStaffStaffId) return false;
    return classData.class_teacher_id === currentStaffId || 
           classData.class_teacher_staff_id === currentStaffStaffId;
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            Mark Student Attendance
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Mark attendance for any class' : 'Mark attendance for your assigned classes'}
          </p>
        </div>
      
      </motion.div>

      {/* Filters */}
      <Card>
        {currentAcademicYear && (
          <p className="text-sm text-gray-600 mb-3">
            Academic year: <span className="font-semibold">{currentAcademicYear}</span> — only classes and students of this year are shown.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <label className="text-sm font-medium text-gray-700">Class:</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Class</option>
              {Array.from(new Set(classesForCurrentYear.map(c => c.class))).sort().map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={!selectedClass}
            >
              <option value="">Select Section</option>
              {classesForCurrentYear
                .filter(c => c.class === selectedClass)
                .map((cls) => (
                  <option key={cls.id} value={cls.section}>
                    {cls.section || 'No Section'}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Attendance Summary Stats */}
        {selectedClass && selectedSection && students.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(attendance).filter(s => s === 'present').length}
              </div>
              <div className="text-xs text-gray-500">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(attendance).filter(s => s === 'absent').length}
              </div>
              <div className="text-xs text-gray-500">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {students.length - Object.keys(attendance).length}
              </div>
              <div className="text-xs text-gray-500">Not Marked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(attendance).filter(s => s === 'holiday').length}
              </div>
              <div className="text-xs text-gray-500">Holiday</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <CheckCircle size={20} />
            <span>Attendance saved successfully!</span>
          </div>
        )}

        {!isAdmin && classes.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <AlertCircle size={20} className="inline mr-2" />
            You are not assigned as a class teacher for any class.
          </div>
        )}
      </Card>

      {/* Attendance Marking */}
      {selectedClass && selectedSection && students.length > 0 && (
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedClass}{selectedSection ? `-${selectedSection}` : ''}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDate} • {students.length} students
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('present')}
                className="border-green-300 text-green-600 hover:bg-green-50"
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('absent')}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Mark All Absent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('holiday')}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <CalendarOff size={16} className="mr-2" />
                Mark Holiday
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Admission No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.admission_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            attendance[student.id] === 'present'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            attendance[student.id] === 'absent'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, 'holiday')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            attendance[student.id] === 'holiday'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                          }`}
                        >
                          Holiday
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </Card>
      )}

      {selectedClass && selectedSection && students.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <Users size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No students found for this class</p>
          </div>
        </Card>
      )}

      {(!selectedClass || !selectedSection) && (
        <Card>
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Please select a class and section to mark attendance</p>
          </div>
        </Card>
      )}
    </div>
  );
}
