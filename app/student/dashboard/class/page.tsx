'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import { GraduationCap, User, Mail, Phone, BookOpen, Users, Search, Calendar } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import TimetableView from '@/components/timetable/TimetableView';

interface ClassTeacher {
  id: string;
  full_name: string;
  staff_id: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

interface ClassInfo {
  class_id: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher: ClassTeacher | null;
}

interface Classmate {
  id: string;
  student_name: string;
  admission_no: string | null;
  class: string | null;
  section: string | null;
  academic_year: string | null;
  photo_url: string | null;
}

export default function MyClassPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [classmatesLoading, setClassmatesLoading] = useState(false);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [classmateSearch, setClassmateSearch] = useState('');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchClassInfo(studentData);
      fetchClassmates(studentData);
    }
  }, []);

  const fetchClassInfo = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/student/class-teacher?school_code=${studentData.school_code}&class=${studentData.class}&section=${studentData.section}&academic_year=${studentData.academic_year}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setClassInfo({
          class_id: result.data.class.id,
          class: result.data.class.class,
          section: result.data.class.section,
          academic_year: result.data.class.academic_year,
          class_teacher: result.data.class_teacher,
        });
      }
    } catch (err) {
      console.error('Error fetching class info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassmates = async (studentData: Student) => {
    try {
      setClassmatesLoading(true);
      const response = await fetch(
        `/api/student/classmates?school_code=${studentData.school_code}&class=${studentData.class}&section=${studentData.section}&academic_year=${studentData.academic_year}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setClassmates(result.data);
      } else {
        setClassmates([]);
      }
    } catch (err) {
      console.error('Error fetching classmates:', err);
      setClassmates([]);
    } finally {
      setClassmatesLoading(false);
    }
  };

  const filteredClassmates = useMemo(() => {
    const q = classmateSearch.trim().toLowerCase();
    if (!q) return classmates;
    return classmates.filter((c) => {
      const name = (c.student_name || '').toLowerCase();
      const adm = (c.admission_no || '').toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [classmates, classmateSearch]);

  if (loading || !student) {
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
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">My Class</h1>
          <p className="text-gray-600">Class information and class teacher details</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Information */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
            <BookOpen size={20} />
            Class Details
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Class</p>
              <p className="text-2xl font-bold text-black">{classInfo?.class || student.class}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Section</p>
              <p className="text-2xl font-bold text-black">{classInfo?.section || student.section}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Academic Year</p>
              <p className="text-xl font-semibold text-black">{classInfo?.academic_year || student.academic_year}</p>
            </div>
          </div>
        </Card>

        {/* Class Teacher */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
            <GraduationCap size={20} />
            Class Teacher
          </h2>
          {classInfo?.class_teacher ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="text-xl font-semibold text-black">{classInfo.class_teacher.full_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {classInfo.class_teacher.staff_id && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Staff ID</p>
                    <p className="font-medium text-black font-mono">{classInfo.class_teacher.staff_id}</p>
                  </div>
                )}
                {classInfo.class_teacher.department && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Department</p>
                    <p className="font-medium text-black">{classInfo.class_teacher.department}</p>
                  </div>
                )}
                {classInfo.class_teacher.designation && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Designation</p>
                    <p className="font-medium text-black">{classInfo.class_teacher.designation}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-4 border-t border-gray-200">
                {classInfo.class_teacher.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-700">{classInfo.class_teacher.email}</span>
                  </div>
                )}
                {classInfo.class_teacher.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-gray-700">{classInfo.class_teacher.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600">No class teacher assigned yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Class Timetable */}
      {classInfo?.class_id && student?.school_code && (
        <Card>
          <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Class Timetable
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Weekly schedule for {classInfo.class}-{classInfo.section}
          </p>
          <TimetableView
            schoolCode={String(student.school_code)}
            classId={classInfo.class_id}
            className="border-0 p-0"
          />
        </Card>
      )}

      {/* Classmates */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <Users size={20} />
            Classmates
            <span className="text-sm font-medium text-gray-600">({classmates.length})</span>
          </h2>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={classmateSearch}
              onChange={(e) => setClassmateSearch(e.target.value)}
              placeholder="Search by name or admission no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
        </div>

        {classmatesLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-3"></div>
            <p className="text-gray-600">Loading classmates...</p>
          </div>
        ) : filteredClassmates.length === 0 ? (
          <div className="text-center py-10">
            <Users className="mx-auto mb-3 text-gray-400" size={44} />
            <p className="text-gray-700 font-medium">No classmates found</p>
            <p className="text-gray-600 text-sm mt-1">
              {classmates.length === 0 ? 'No students are mapped to your class yet.' : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassmates.map((cm) => (
              <div
                key={cm.id}
                className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {cm.photo_url ? (
                      <Image
                        src={cm.photo_url}
                        alt={cm.student_name || 'Student'}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">
                        {(cm.student_name || 'S').trim().substring(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-black truncate">{cm.student_name || 'Student'}</p>
                    <p className="text-xs text-gray-600">
                      {cm.admission_no ? `Adm: ${cm.admission_no}` : 'Admission: N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

