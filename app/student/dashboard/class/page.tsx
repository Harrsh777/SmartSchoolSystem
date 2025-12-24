'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { GraduationCap, User, Mail, Phone, BookOpen } from 'lucide-react';
import type { Student } from '@/lib/supabase';

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
  class: string;
  section: string;
  academic_year: string;
  class_teacher: ClassTeacher | null;
}

export default function MyClassPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchClassInfo(studentData);
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
    </div>
  );
}

