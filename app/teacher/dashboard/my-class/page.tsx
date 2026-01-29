'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Users, GraduationCap, CalendarDays, UserCheck, ChevronDown, Calendar } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';
import TimetableView from '@/components/timetable/TimetableView';

interface TeacherClass {
  id: string;
  class: string;
  section?: string;
  academic_year?: string;
}

interface Student {
  id: string;
  admission_no?: string;
  student_name?: string;
  class?: string;
  section?: string;
  parent_name?: string;
  roll_no?: string;
  status?: string;
}

function classLabel(cls: TeacherClass): string {
  const c = cls.class + (cls.section ? ` - ${cls.section}` : '');
  return cls.academic_year ? `${c} (${cls.academic_year})` : c;
}

export default function MyClassPage() {
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [classInfo, setClassInfo] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notClassTeacher, setNotClassTeacher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (!storedTeacher) {
      setError('Please log in as a teacher to view your class.');
      setLoading(false);
      return;
    }

    try {
      const teacherData = JSON.parse(storedTeacher) as Staff;
      setTeacher(teacherData);
      const teacherWithSchool = teacherData as Staff & { school_code?: string };
      setSchoolCode(teacherWithSchool.school_code || null);
      if (teacherData && teacherWithSchool.school_code) {
        fetchTeacherClass({ ...teacherWithSchool, school_code: teacherWithSchool.school_code });
      } else {
        setError('Missing school information for teacher.');
        setLoading(false);
      }
    } catch {
      setError('Invalid teacher session data. Please login again.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const fetchTeacherClass = async (teacherData: Staff & { school_code: string }) => {
    try {
      const params = new URLSearchParams({
        school_code: teacherData.school_code,
      });

      if (teacherData.id) {
        params.append('teacher_id', teacherData.id);
      }
      if (teacherData.staff_id) {
        params.append('staff_id', teacherData.staff_id);
      }

      const response = await fetch(`/api/classes/teacher?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const classesData = Array.isArray(result.data) ? result.data : [result.data];
        const classes = (classesData as TeacherClass[]).map((c: TeacherClass) => ({
          id: c.id,
          class: c.class,
          section: c.section,
          academic_year: c.academic_year,
        }));
        if (classes.length > 0) {
          setTeacherClasses(classes);
          const first = classes[0];
          setClassInfo(first);
          await fetchStudents(teacherData.school_code, first);
          setLoading(false);
          return;
        }
      }

      setNotClassTeacher(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching teacher class:', err);
      setError('Failed to load your class. Please try again.');
      setLoading(false);
    }
  };

  const switchClass = useCallback(
    async (cls: TeacherClass) => {
      if (!schoolCode || classInfo?.id === cls.id) return;
      setClassInfo(cls);
      setClassDropdownOpen(false);
      setStudents([]);
      await fetchStudents(schoolCode, cls);
    },
    [schoolCode, classInfo?.id]
  );

  const fetchStudents = async (schoolCodeValue: string, cls: TeacherClass) => {
    try {
      const params = new URLSearchParams({
        school_code: schoolCodeValue,
        class: cls.class,
      });
      if (cls.section) {
        params.append('section', cls.section);
      }
      params.append('status', 'active');

      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStudents(result.data);
      } else {
        setError(result.error || 'Failed to load students for your class.');
      }
    } catch (err) {
      console.error('Error fetching students for class:', err);
      setError('Failed to load students. Please try again.');
    }
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = getString(student.student_name)?.toLowerCase() || '';
    const adm = getString(student.admission_no)?.toLowerCase() || '';
    const roll = getString((student as Student & { roll_no?: string }).roll_no)?.toLowerCase() || '';
    return name.includes(q) || adm.includes(q) || roll.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-emerald-700 font-medium">Loading your class...</p>
        </div>
      </div>
    );
  }

  if (notClassTeacher) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <UserCheck className="text-emerald-700" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">My Class</h1>
            <p className="text-sm text-gray-600">
              You are currently not assigned as a class teacher to any class. Once a class is mapped to you,
              you will see all students and their details here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <UserCheck className="text-red-600" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">My Class</h1>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Class selector (top left) + Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {teacherClasses.length > 0 && (
          <div className="relative inline-flex w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setClassDropdownOpen((o) => !o)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-medium text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-expanded={classDropdownOpen}
              aria-haspopup="listbox"
              aria-label="Change class"
            >
              <span>Change class</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {classDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => setClassDropdownOpen(false)}
                />
                <ul
                  role="listbox"
                  className="absolute left-0 top-full mt-1 z-20 min-w-[220px] py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
                >
                  {teacherClasses.map((cls) => (
                    <li key={cls.id} role="option" aria-selected={classInfo?.id === cls.id}>
                      <button
                        type="button"
                        onClick={() => switchClass(cls)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                          classInfo?.id === cls.id
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {classLabel(cls)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Class</h1>
              {classInfo && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Class{' '}
                  <span className="font-semibold">
                    {classInfo.class}
                    {classInfo.section ? ` - ${classInfo.section}` : ''}
                  </span>{' '}
                  · Academic Year:{' '}
                  <span className="font-semibold">
                    {classInfo.academic_year || 'N/A'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <GraduationCap className="text-emerald-700" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Students</p>
            <p className="text-xl font-bold text-gray-900">{students.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CalendarDays className="text-emerald-700" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Class</p>
            <p className="text-sm font-semibold text-gray-900">
              {classInfo?.class || 'N/A'} {classInfo?.section ? `- ${classInfo.section}` : ''}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <UserCheck className="text-emerald-700" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Class Teacher</p>
            <p className="text-sm font-semibold text-gray-900">
              {teacher ? getString((teacher as Staff & { staff_name?: string; name?: string }).staff_name) || getString((teacher as Staff & { staff_name?: string; name?: string }).name) || 'You' : 'You'}
            </p>
          </div>
        </Card>
      </div>

      {/* Class Timetable */}
      {classInfo?.id && schoolCode && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Calendar className="text-emerald-600" size={20} />
            Class Timetable
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Weekly schedule for {classInfo.class}{classInfo.section ? ` - ${classInfo.section}` : ''}
          </p>
          <TimetableView
            schoolCode={schoolCode}
            classId={classInfo.id}
            className="border-0 p-0"
          />
        </Card>
      )}

      {/* Students Table */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Students in Your Class</h2>
            <p className="text-sm text-gray-500">
              View all students assigned to your class. Use the search to quickly find a student.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search by name, admission, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No students found in your class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-emerald-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Admission No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Roll No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Parent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => {
                  const admissionNo = getString(student.admission_no) || 'N/A';
                  const studentName = getString(student.student_name) || 'N/A';
                  const rollNo = getString((student as Student & { roll_no?: string }).roll_no) || '-';
                  const parentName = getString(student.parent_name) || 'N/A';
                  return (
                    <tr key={student.id} className="hover:bg-emerald-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{admissionNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{studentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rollNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{parentName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info note */}
      <p className="text-xs text-gray-500">
        Attendance, marks, fees, and transport details for these students are available in their respective
        modules and reports. This view is restricted to your own class as class teacher.
      </p>
    </div>
  );
}

