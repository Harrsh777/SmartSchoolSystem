'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, GraduationCap, Users, UserCheck, Gift } from 'lucide-react';
import Card from '@/components/ui/Card';

type ViewMode = 'student' | 'teacher';

interface SchoolClass {
  id: string;
  class: string;
  section: string | null;
  academic_year?: string | null;
}

interface Student {
  id: string;
  student_name?: string | null;
  roll_number?: string | null;
  date_of_birth?: string | null;
}

interface Teacher {
  id: string;
  full_name?: string | null;
  dob?: string | null;
}

interface BirthdayMeta {
  daysRemaining: number;
}

const toDateLabel = (date?: string | null) => {
  if (!date) return '—';
  const raw = String(date).split('T')[0];
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const rollSort = (a: Student, b: Student) => {
  const rollA = String(a.roll_number ?? '').trim();
  const rollB = String(b.roll_number ?? '').trim();
  const byRoll = rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
  if (byRoll !== 0) return byRoll;
  return String(a.student_name ?? '').localeCompare(String(b.student_name ?? ''), undefined, {
    sensitivity: 'base',
  });
};

const getBirthdayMeta = (date?: string | null): BirthdayMeta | null => {
  if (!date) return null;
  const raw = String(date).split('T')[0];
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextBirthday = new Date(today.getFullYear(), m - 1, d);
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, m - 1, d);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((nextBirthday.getTime() - today.getTime()) / msPerDay);
  return { daysRemaining };
};

export default function BirthdaysPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);

  const [mode, setMode] = useState<ViewMode>('student');
  const [pageLoading, setPageLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [academicYear, setAcademicYear] = useState('');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const uniqueClasses = useMemo(
    () => Array.from(new Set(classes.map((c) => c.class).filter(Boolean))).sort(),
    [classes]
  );

  const sectionsForClass = useMemo(
    () =>
      classes
        .filter((c) => c.class === selectedClass)
        .map((c) => c.section || '')
        .filter((s, idx, arr) => arr.indexOf(s) === idx)
        .sort(),
    [classes, selectedClass]
  );

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setPageLoading(true);

        const yearRes = await fetch(`/api/schools/current-academic-year?school_code=${schoolCode}`);
        const yearJson = await yearRes.json();
        const year = yearRes.ok
          ? String(yearJson.current_academic_year || yearJson.data || '').trim()
          : '';
        setAcademicYear(year);

        const classRes = await fetch(`/api/classes?school_code=${schoolCode}`);
        const classJson = await classRes.json();
        if (classRes.ok && Array.isArray(classJson.data)) {
          const filtered = year
            ? classJson.data.filter((c: SchoolClass) => (c.academic_year ?? '').toString() === year)
            : classJson.data;
          setClasses(filtered);
          setSelectedClass('');
          setSelectedSection('');
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error('Failed to load birthdays filters:', error);
      } finally {
        setPageLoading(false);
      }
    };

    loadInitial();
  }, [schoolCode]);

  useEffect(() => {
    const loadStudents = async () => {
      if (mode !== 'student' || !selectedClass || !selectedSection) {
        setStudents([]);
        return;
      }
      try {
        setListLoading(true);
        const params = new URLSearchParams({
          school_code: schoolCode,
          class: selectedClass,
          section: selectedSection,
          status: 'active',
          sort_by: 'roll_number',
          sort_order: 'asc',
        });
        if (academicYear) params.set('academic_year', academicYear);
        const res = await fetch(`/api/students?${params.toString()}`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          const withDob = json.data.filter((s: Student) => Boolean(s.date_of_birth));
          setStudents(withDob);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Failed to load student birthdays:', error);
        setStudents([]);
      } finally {
        setListLoading(false);
      }
    };

    loadStudents();
  }, [mode, schoolCode, selectedClass, selectedSection, academicYear]);

  useEffect(() => {
    const loadTeachers = async () => {
      if (mode !== 'teacher') {
        setTeachers([]);
        return;
      }
      try {
        setListLoading(true);
        const res = await fetch(`/api/staff?school_code=${schoolCode}&status=active`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          const withDob = json.data.filter((t: Teacher) => Boolean(t.dob));
          setTeachers(withDob);
        } else {
          setTeachers([]);
        }
      } catch (error) {
        console.error('Failed to load teacher birthdays:', error);
        setTeachers([]);
      } finally {
        setListLoading(false);
      }
    };

    loadTeachers();
  }, [mode, schoolCode]);

  useEffect(() => {
    if (!selectedClass) setSelectedSection('');
  }, [selectedClass]);

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const aMeta = getBirthdayMeta(a.date_of_birth);
        const bMeta = getBirthdayMeta(b.date_of_birth);
        if (!aMeta && !bMeta) return rollSort(a, b);
        if (!aMeta) return 1;
        if (!bMeta) return -1;
        if (aMeta.daysRemaining !== bMeta.daysRemaining) {
          return aMeta.daysRemaining - bMeta.daysRemaining;
        }
        return rollSort(a, b);
      }),
    [students]
  );

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) => {
        const aMeta = getBirthdayMeta(a.dob);
        const bMeta = getBirthdayMeta(b.dob);
        if (!aMeta && !bMeta) {
          return String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), undefined, {
            sensitivity: 'base',
          });
        }
        if (!aMeta) return 1;
        if (!bMeta) return -1;
        if (aMeta.daysRemaining !== bMeta.daysRemaining) {
          return aMeta.daysRemaining - bMeta.daysRemaining;
        }
        return String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), undefined, {
          sensitivity: 'base',
        });
      }),
    [teachers]
  );

  const showStudentTable = mode === 'student' && !listLoading && selectedClass && selectedSection;
  const showTeacherTable = mode === 'teacher' && !listLoading;

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-gray-200" />
        <Card>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-11 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-11 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-11 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </Card>
        <Card>
          <div className="space-y-3">
            {[...Array.from({ length: 6 })].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-black">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white shadow-md">
              <Gift size={22} />
            </div>
            Birthdays
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === 'student'
              ? `Student birthdays${academicYear ? ` in ${academicYear}` : ''} (upcoming first)`
              : 'Teacher birthdays (upcoming first)'}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
          {([
            { key: 'student', label: 'Student', icon: GraduationCap },
            { key: 'teacher', label: 'Teacher', icon: UserCheck },
          ] as const).map((option) => {
            const ActiveIcon = option.icon;
            const isActive = mode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1e3a8a] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <ActiveIcon size={16} />
                {option.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {mode === 'student' && (
        <Card className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
            <span className="font-semibold">Academic Year: </span>
            {academicYear || 'Not available'}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Class</span>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select class</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Section</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition enabled:focus:border-[#1e3a8a] enabled:focus:ring-2 enabled:focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select section</option>
                {sectionsForClass.map((sec) => (
                  <option key={sec || 'none'} value={sec}>
                    {sec || 'No Section'}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            {mode === 'student' ? <Users size={18} /> : <CalendarDays size={18} />}
            {mode === 'student' ? 'Student Birthday List' : 'Teacher Birthday List'}
          </h2>
          <span className="text-sm text-gray-500">
            {mode === 'student' ? `${sortedStudents.length} students` : `${sortedTeachers.length} teachers`}
          </span>
        </div>

        {listLoading && (
          <div className="space-y-3 px-5 py-5">
            {[...Array.from({ length: 8 })].map((_, idx) => (
              <div key={idx} className="h-11 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {mode === 'student' && !selectedClass && !listLoading && (
          <div className="py-14 text-center text-gray-500">
            Select class and section to view student birthdays.
          </div>
        )}

        {mode === 'student' && selectedClass && !selectedSection && !listLoading && (
          <div className="py-14 text-center text-gray-500">Select a section to continue.</div>
        )}

        {showStudentTable && (
          sortedStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Roll Number</th>
                    <th className="px-5 py-3">DOB</th>
                    <th className="px-5 py-3">Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student) => {
                    const meta = getBirthdayMeta(student.date_of_birth);
                    return (
                      <tr key={student.id} className="border-b border-gray-100 transition hover:bg-blue-50/40">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                          {student.student_name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">{student.roll_number || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {toDateLabel(student.date_of_birth)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {meta ? (meta.daysRemaining === 0 ? 'Today' : `${meta.daysRemaining} days`) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center text-gray-500">No student birthdays found for this selection.</div>
          )
        )}

        {showTeacherTable && (
          sortedTeachers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">DOB</th>
                    <th className="px-5 py-3">Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeachers.map((teacher) => {
                    const meta = getBirthdayMeta(teacher.dob);
                    return (
                      <tr key={teacher.id} className="border-b border-gray-100 transition hover:bg-blue-50/40">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                          {teacher.full_name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">{toDateLabel(teacher.dob)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {meta ? (meta.daysRemaining === 0 ? 'Today' : `${meta.daysRemaining} days`) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center text-gray-500">No teacher birthdays found.</div>
          )
        )}
      </Card>
    </div>
  );
}
